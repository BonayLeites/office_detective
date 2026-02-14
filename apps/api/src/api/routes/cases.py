"""Case management endpoints."""

from datetime import UTC, datetime
from typing import Any
from uuid import NAMESPACE_DNS, UUID, uuid5

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select

from src.dependencies import CurrentUser, DbSession
from src.models.case import Case
from src.models.document import Document, Entity
from src.models.player import PlayerState, Submission
from src.schemas.case import CaseCreate, CaseListResponse, CaseResponse
from src.schemas.submission import (
    ProgressResponse,
    ScoreBreakdown,
    SubmissionRequest,
    SubmissionResponse,
)

router = APIRouter()
MAX_HINTS = 4


def _parse_uuid(raw: object) -> UUID | None:
    """Parse a UUID from an arbitrary value."""
    if not isinstance(raw, str):
        return None
    try:
        return UUID(raw)
    except ValueError:
        return None


def _extract_ground_truth_culprits(ground_truth: dict[str, Any]) -> set[UUID]:
    """Extract culprit UUIDs from ground truth payload."""
    culprits = ground_truth.get("culprits", [])
    if not isinstance(culprits, list):
        return set()

    resolved: set[UUID] = set()
    mallory_namespace = uuid5(NAMESPACE_DNS, "mallory")

    for culprit in culprits:
        raw_id: object = culprit.get("entity_id") if isinstance(culprit, dict) else culprit

        parsed = _parse_uuid(raw_id)
        if parsed is not None:
            resolved.add(parsed)
            continue

        # Backward compatibility for seeded symbolic IDs like "P1".
        if isinstance(raw_id, str) and raw_id:
            resolved.add(uuid5(mallory_namespace, raw_id))

    return resolved


def _calculate_explanation_score(explanation: str, mechanism: str) -> int:
    """Calculate explanation score using simple keyword overlap."""
    explanation_tokens = {token for token in explanation.lower().split() if len(token) >= 5}
    mechanism_tokens = {token for token in mechanism.lower().split() if len(token) >= 5}

    if not explanation_tokens or not mechanism_tokens:
        return 0

    overlap = explanation_tokens.intersection(mechanism_tokens)
    return min(30, 6 + (len(overlap) * 3))


def _build_feedback(score: int, missed: int, wrong: int) -> str:
    """Build user-facing feedback summary."""
    if score >= 85 and missed == 0 and wrong == 0:
        return (
            "Excellent investigation. You identified the culprit accurately and supported your "
            "conclusion with strong evidence."
        )
    if score >= 70:
        return (
            "Good investigation overall. Your conclusion is mostly correct, but you can improve "
            "by citing stronger supporting evidence."
        )
    return (
        "Your report needs more supporting evidence. Re-check relationships, approval patterns, "
        "and the strongest corroborating documents."
    )


async def _get_or_create_player_state(db: DbSession, user_id: UUID, case_id: UUID) -> PlayerState:
    """Get existing player state or create a new one."""
    result = await db.execute(
        select(PlayerState).where(PlayerState.user_id == user_id, PlayerState.case_id == case_id)
    )
    player_state = result.scalar_one_or_none()
    if player_state:
        return player_state

    player_state = PlayerState(
        user_id=user_id,
        case_id=case_id,
        opened_docs=[],
        pinned_items=[],
        hypotheses_json={},
        hints_used=0,
    )
    db.add(player_state)
    await db.flush()
    await db.refresh(player_state)
    return player_state


@router.get("", response_model=CaseListResponse)
async def list_cases(
    db: DbSession,
    skip: int = 0,
    limit: int = 20,
) -> CaseListResponse:
    """List all cases with pagination."""
    # Get total count
    count_result = await db.execute(select(func.count(Case.case_id)))
    total = count_result.scalar() or 0

    # Get cases with document and entity counts
    result = await db.execute(
        select(Case).order_by(Case.created_at.desc()).offset(skip).limit(limit)
    )
    cases = list(result.scalars().all())

    # Get counts for each case
    case_responses = []
    for case in cases:
        doc_count_result = await db.execute(
            select(func.count(Document.doc_id)).where(Document.case_id == case.case_id)
        )
        entity_count_result = await db.execute(
            select(func.count(Entity.entity_id)).where(Entity.case_id == case.case_id)
        )

        case_responses.append(
            CaseResponse(
                case_id=case.case_id,
                title=case.title,
                scenario_type=case.scenario_type,
                difficulty=case.difficulty,
                seed=case.seed,
                created_at=case.created_at,
                updated_at=case.updated_at,
                document_count=doc_count_result.scalar() or 0,
                entity_count=entity_count_result.scalar() or 0,
            )
        )

    return CaseListResponse(cases=case_responses, total=total)


@router.get("/{case_id}", response_model=CaseResponse)
async def get_case(
    case_id: UUID,
    db: DbSession,
) -> CaseResponse:
    """Get a specific case by ID."""
    result = await db.execute(select(Case).where(Case.case_id == case_id))
    case = result.scalar_one_or_none()

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case {case_id} not found",
        )

    # Get counts
    doc_count_result = await db.execute(
        select(func.count(Document.doc_id)).where(Document.case_id == case_id)
    )
    entity_count_result = await db.execute(
        select(func.count(Entity.entity_id)).where(Entity.case_id == case_id)
    )

    return CaseResponse(
        case_id=case.case_id,
        title=case.title,
        scenario_type=case.scenario_type,
        difficulty=case.difficulty,
        seed=case.seed,
        created_at=case.created_at,
        updated_at=case.updated_at,
        document_count=doc_count_result.scalar() or 0,
        entity_count=entity_count_result.scalar() or 0,
    )


@router.post("", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
async def create_case(
    case_data: CaseCreate,
    db: DbSession,
) -> CaseResponse:
    """Create a new case."""
    case = Case(
        title=case_data.title,
        scenario_type=case_data.scenario_type,
        difficulty=case_data.difficulty,
        language=case_data.language,
        seed=case_data.seed,
        ground_truth_json=case_data.ground_truth.model_dump(mode="json"),
    )
    db.add(case)
    await db.flush()
    await db.refresh(case)

    return CaseResponse(
        case_id=case.case_id,
        title=case.title,
        scenario_type=case.scenario_type,
        difficulty=case.difficulty,
        seed=case.seed,
        created_at=case.created_at,
        updated_at=case.updated_at,
        document_count=0,
        entity_count=0,
    )


@router.delete("/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_case(
    case_id: UUID,
    db: DbSession,
) -> None:
    """Delete a case."""
    result = await db.execute(select(Case).where(Case.case_id == case_id))
    case = result.scalar_one_or_none()

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case {case_id} not found",
        )

    await db.delete(case)


@router.get("/{case_id}/progress", response_model=ProgressResponse)
async def get_case_progress(
    case_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> ProgressResponse:
    """Get the current player's progress for a case."""
    case_result = await db.execute(select(Case).where(Case.case_id == case_id))
    case = case_result.scalar_one_or_none()
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case {case_id} not found",
        )

    player_state = await _get_or_create_player_state(db, current_user.user_id, case_id)
    latest_submission_result = await db.execute(
        select(Submission)
        .where(Submission.user_id == current_user.user_id, Submission.case_id == case_id)
        .order_by(Submission.created_at.desc())
        .limit(1)
    )
    latest_submission = latest_submission_result.scalar_one_or_none()

    last_score: int | None = None
    if latest_submission and isinstance(latest_submission.score_json, dict):
        raw_score = latest_submission.score_json.get("score")
        if isinstance(raw_score, int):
            last_score = raw_score

    hints_remaining = max(0, MAX_HINTS - player_state.hints_used)
    return ProgressResponse(
        hints_used=player_state.hints_used,
        hints_remaining=hints_remaining,
        has_submission=latest_submission is not None,
        last_score=last_score,
    )


@router.post("/{case_id}/submit", response_model=SubmissionResponse)
async def submit_case_report(
    case_id: UUID,
    request: SubmissionRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> SubmissionResponse:
    """Submit final accusation and evidence for scoring."""
    case_result = await db.execute(select(Case).where(Case.case_id == case_id))
    case = case_result.scalar_one_or_none()
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case {case_id} not found",
        )

    ground_truth = case.ground_truth_json if isinstance(case.ground_truth_json, dict) else {}
    truth_culprits = _extract_ground_truth_culprits(ground_truth)
    selected_culprits = set(request.culprit_ids)

    correct = selected_culprits.intersection(truth_culprits)
    wrong = selected_culprits.difference(truth_culprits)
    missed = truth_culprits.difference(selected_culprits)

    if truth_culprits:
        recall = len(correct) / len(truth_culprits)
    else:
        recall = 1.0 if not selected_culprits else 0.0
    precision = len(correct) / len(selected_culprits) if selected_culprits else 0.0

    culprit_score = round((recall * 24) + (precision * 16))
    culprit_score = max(0, culprit_score - (len(wrong) * 4))
    culprit_score = min(40, culprit_score)

    evidence_score = min(20, len(request.evidence_ids) * 4)
    mechanism = ground_truth.get("mechanism", "")
    explanation_score = _calculate_explanation_score(request.explanation, str(mechanism))

    player_state = await _get_or_create_player_state(db, current_user.user_id, case_id)
    efficiency_score = 10
    if player_state.hints_used == 1:
        efficiency_score = 8
    elif player_state.hints_used == 2:
        efficiency_score = 6
    elif player_state.hints_used == 3:
        efficiency_score = 4
    elif player_state.hints_used >= 4:
        efficiency_score = 2

    total_score = min(100, culprit_score + evidence_score + explanation_score + efficiency_score)
    feedback = _build_feedback(total_score, len(missed), len(wrong))

    score_json: dict[str, Any] = {
        "score": total_score,
        "max_score": 100,
        "breakdown": {
            "culprit_score": culprit_score,
            "evidence_score": evidence_score,
            "explanation_score": explanation_score,
            "efficiency_score": efficiency_score,
        },
    }
    submission = Submission(
        user_id=current_user.user_id,
        case_id=case_id,
        answer_json={
            "culprit_ids": [str(c) for c in request.culprit_ids],
            "explanation": request.explanation,
        },
        evidence_refs=[str(e) for e in request.evidence_ids],
        score_json=score_json,
    )
    db.add(submission)

    player_state.hypotheses_json = {
        "culprit_ids": [str(c) for c in request.culprit_ids],
        "evidence_ids": [str(e) for e in request.evidence_ids],
        "explanation": request.explanation,
        "submitted_at": datetime.now(UTC).isoformat(),
        "score": total_score,
    }
    player_state.updated_at = datetime.now(UTC)

    await db.flush()
    await db.refresh(submission)

    return SubmissionResponse(
        submission_id=submission.submission_id,
        score=total_score,
        max_score=100,
        correct_culprits=sorted(truth_culprits, key=str),
        feedback=feedback,
        breakdown=ScoreBreakdown(
            culprit_score=culprit_score,
            evidence_score=evidence_score,
            explanation_score=explanation_score,
            efficiency_score=efficiency_score,
        ),
    )
