"""Tests for submission and progress endpoints."""

import uuid
from datetime import UTC, datetime

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.routes.cases import (
    _build_feedback,
    _calculate_explanation_score,
    _extract_ground_truth_culprits,
    _parse_uuid,
)
from src.models import (
    Case,
    DocType,
    Document,
    Entity,
    EntityType,
    PlayerState,
    ScenarioType,
    Submission,
    User,
)


@pytest.fixture
async def submission_case(db_session: AsyncSession) -> tuple[Case, Entity, Document]:
    """Create a case with one culprit and one evidence document."""
    culprit = Entity(
        entity_id=uuid.uuid4(),
        case_id=uuid.uuid4(),
        entity_type=EntityType.person,
        name="Marcus Chen",
        attrs_json={"role": "Procurement Manager"},
    )
    case = Case(
        case_id=culprit.case_id,
        title="Submission Test Case",
        scenario_type=ScenarioType.vendor_fraud,
        difficulty=2,
        seed=777,
        briefing="Test briefing",
        ground_truth_json={
            "culprits": [{"entity_id": str(culprit.entity_id)}],
            "mechanism": "Shell company with fake invoices and self approval",
            "hints": {
                "tier_0": [
                    {"text": "Look at who approved the invoices."},
                    {"text": "Compare vendor registration details."},
                ]
            },
        },
    )
    doc = Document(
        doc_id=uuid.uuid4(),
        case_id=case.case_id,
        doc_type=DocType.invoice,
        ts=datetime.now(UTC),
        subject="Suspicious Invoice",
        body="Invoice details for non-existent services.",
        metadata_json={},
    )

    db_session.add(case)
    db_session.add(culprit)
    db_session.add(doc)
    await db_session.commit()
    await db_session.refresh(case)
    await db_session.refresh(culprit)
    await db_session.refresh(doc)
    return case, culprit, doc


@pytest.mark.asyncio
async def test_submit_case_report_success(
    client: AsyncClient,
    db_session: AsyncSession,
    submission_case: tuple[Case, Entity, Document],
    auth_headers: dict[str, str],
) -> None:
    """POST /api/cases/{id}/submit evaluates and persists submission."""
    case, culprit, document = submission_case

    response = await client.post(
        f"/api/cases/{case.case_id}/submit",
        headers=auth_headers,
        json={
            "culprit_ids": [str(culprit.entity_id)],
            "evidence_ids": [str(document.doc_id)],
            "explanation": (
                "The shell company submitted fake invoices and the same person "
                "self approved those payments."
            ),
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["score"] > 0
    assert data["max_score"] == 100
    assert str(culprit.entity_id) in data["correct_culprits"]
    assert "submission_id" in data
    assert data["breakdown"]["culprit_score"] > 0

    submission_result = await db_session.execute(
        select(Submission).where(Submission.case_id == case.case_id)
    )
    submission = submission_result.scalar_one_or_none()
    assert submission is not None

    state_result = await db_session.execute(
        select(PlayerState).where(PlayerState.case_id == case.case_id)
    )
    player_state = state_result.scalar_one_or_none()
    assert player_state is not None
    assert isinstance(player_state.hypotheses_json, dict)
    assert player_state.hypotheses_json.get("score") == data["score"]


@pytest.mark.asyncio
async def test_board_state_roundtrip(
    client: AsyncClient,
    submission_case: tuple[Case, Entity, Document],
    auth_headers: dict[str, str],
) -> None:
    """Board state can be saved and fetched for an authenticated player."""
    case, culprit, document = submission_case
    board_payload = {
        "board_items": [
            {
                "id": f"entity-{culprit.entity_id}",
                "type": "entity",
                "caseId": str(case.case_id),
                "label": culprit.name,
                "position": {"x": 120, "y": 160},
                "data": {"entity_id": str(culprit.entity_id)},
            },
            {
                "id": f"document-{document.doc_id}",
                "type": "document",
                "caseId": str(case.case_id),
                "label": document.subject,
                "position": {"x": 420, "y": 180},
                "data": {"doc_id": str(document.doc_id)},
            },
        ],
        "board_edges": [
            {
                "id": f"manual-entity-{culprit.entity_id}-document-{document.doc_id}-LINKED",
                "source": f"entity-{culprit.entity_id}",
                "target": f"document-{document.doc_id}",
                "label": "LINKED",
                "relationship_type": "LINKED",
            }
        ],
    }

    put_response = await client.put(
        f"/api/cases/{case.case_id}/board-state",
        headers=auth_headers,
        json=board_payload,
    )
    assert put_response.status_code == 200
    put_data = put_response.json()
    assert len(put_data["board_items"]) == 2
    assert len(put_data["board_edges"]) == 1

    get_response = await client.get(
        f"/api/cases/{case.case_id}/board-state",
        headers=auth_headers,
    )
    assert get_response.status_code == 200
    get_data = get_response.json()
    assert len(get_data["board_items"]) == 2
    assert len(get_data["board_edges"]) == 1
    assert get_data["board_edges"][0]["id"].startswith("manual-")


@pytest.mark.asyncio
async def test_submit_uses_board_reasoning_score_and_preserves_board_state(
    client: AsyncClient,
    db_session: AsyncSession,
    submission_case: tuple[Case, Entity, Document],
    auth_headers: dict[str, str],
) -> None:
    """Submit response includes board score and keeps board state in player hypotheses."""
    case, culprit, document = submission_case
    board_state_response = await client.put(
        f"/api/cases/{case.case_id}/board-state",
        headers=auth_headers,
        json={
            "board_items": [
                {
                    "id": f"entity-{culprit.entity_id}",
                    "type": "entity",
                    "caseId": str(case.case_id),
                    "label": culprit.name,
                    "position": {"x": 100, "y": 120},
                    "data": {},
                },
                {
                    "id": f"document-{document.doc_id}",
                    "type": "document",
                    "caseId": str(case.case_id),
                    "label": document.subject,
                    "position": {"x": 340, "y": 180},
                    "data": {},
                },
            ],
            "board_edges": [
                {
                    "source": f"entity-{culprit.entity_id}",
                    "target": f"document-{document.doc_id}",
                    "label": "LINKED",
                    "relationship_type": "LINKED",
                }
            ],
        },
    )
    assert board_state_response.status_code == 200

    submit_response = await client.post(
        f"/api/cases/{case.case_id}/submit",
        headers=auth_headers,
        json={
            "culprit_ids": [str(culprit.entity_id)],
            "evidence_ids": [str(document.doc_id)],
            "explanation": (
                "The shell company submitted fake invoices and the same person "
                "self approved those payments."
            ),
        },
    )
    assert submit_response.status_code == 200
    submit_data = submit_response.json()
    assert submit_data["breakdown"]["board_reasoning_score"] > 0

    state_result = await db_session.execute(
        select(PlayerState).where(PlayerState.case_id == case.case_id)
    )
    player_state = state_result.scalar_one()
    assert isinstance(player_state.hypotheses_json, dict)
    board_state = player_state.hypotheses_json.get("board_state")
    assert isinstance(board_state, dict)
    assert len(board_state.get("board_items", [])) == 2


@pytest.mark.asyncio
async def test_progress_and_hints_persist(
    client: AsyncClient,
    submission_case: tuple[Case, Entity, Document],
    auth_headers: dict[str, str],
) -> None:
    """Progress endpoint reflects persisted hint usage."""
    case, _culprit, _document = submission_case

    first_progress = await client.get(
        f"/api/cases/{case.case_id}/progress",
        headers=auth_headers,
    )
    assert first_progress.status_code == 200
    first_data = first_progress.json()
    assert first_data["hints_used"] == 0
    assert first_data["hints_remaining"] == 4
    assert first_data["has_submission"] is False

    hint_one = await client.post(
        f"/api/cases/{case.case_id}/chat/hint",
        headers=auth_headers,
        json={"context": "invoice"},
    )
    assert hint_one.status_code == 200
    assert "invoice" in hint_one.json()["hint"].lower()

    hint_two = await client.post(
        f"/api/cases/{case.case_id}/chat/hint",
        headers=auth_headers,
        json={},
    )
    assert hint_two.status_code == 200

    second_progress = await client.get(
        f"/api/cases/{case.case_id}/progress",
        headers=auth_headers,
    )
    assert second_progress.status_code == 200
    second_data = second_progress.json()
    assert second_data["hints_used"] == 2
    assert second_data["hints_remaining"] == 2


@pytest.mark.asyncio
async def test_hint_budget_exhausted(
    client: AsyncClient,
    submission_case: tuple[Case, Entity, Document],
    auth_headers: dict[str, str],
) -> None:
    """Hint endpoint returns 400 when budget is exhausted."""
    case, _culprit, _document = submission_case

    for _ in range(4):
        response = await client.post(
            f"/api/cases/{case.case_id}/chat/hint",
            headers=auth_headers,
            json={},
        )
        assert response.status_code == 200

    exhausted = await client.post(
        f"/api/cases/{case.case_id}/chat/hint",
        headers=auth_headers,
        json={},
    )
    assert exhausted.status_code == 400
    assert "No hints remaining" in exhausted.json()["detail"]


@pytest.mark.asyncio
async def test_submit_requires_auth(
    client: AsyncClient,
    submission_case: tuple[Case, Entity, Document],
) -> None:
    """Submission endpoint requires authentication."""
    case, culprit, document = submission_case
    response = await client.post(
        f"/api/cases/{case.case_id}/submit",
        json={
            "culprit_ids": [str(culprit.entity_id)],
            "evidence_ids": [str(document.doc_id)],
            "explanation": "A sufficiently long explanation for validation checks.",
        },
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_progress_case_not_found(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    """Progress endpoint returns 404 when case does not exist."""
    response = await client.get(f"/api/cases/{uuid.uuid4()}/progress", headers=auth_headers)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_submit_case_not_found(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    """Submit endpoint returns 404 when case does not exist."""
    response = await client.post(
        f"/api/cases/{uuid.uuid4()}/submit",
        headers=auth_headers,
        json={
            "culprit_ids": [str(uuid.uuid4())],
            "evidence_ids": [],
            "explanation": "This explanation is intentionally long enough for validation.",
        },
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_progress_last_score_ignores_non_int(
    client: AsyncClient,
    db_session: AsyncSession,
    submission_case: tuple[Case, Entity, Document],
    sample_user: User,
    auth_headers: dict[str, str],
) -> None:
    """Progress endpoint ignores malformed score payloads."""
    case, culprit, _document = submission_case
    db_session.add(
        Submission(
            user_id=sample_user.user_id,
            case_id=case.case_id,
            answer_json={
                "culprit_ids": [str(culprit.entity_id)],
                "explanation": "Valid answer text",
            },
            evidence_refs=[],
            score_json={"score": "95"},
        )
    )
    await db_session.commit()

    response = await client.get(f"/api/cases/{case.case_id}/progress", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["last_score"] is None


@pytest.mark.asyncio
async def test_submit_with_empty_truth_culprits(
    client: AsyncClient,
    db_session: AsyncSession,
    sample_user: User,
    auth_headers: dict[str, str],
) -> None:
    """Submit scoring handles cases with empty culprit ground truth."""
    case = Case(
        case_id=uuid.uuid4(),
        title="Empty Truth",
        scenario_type=ScenarioType.vendor_fraud,
        difficulty=1,
        seed=555,
        briefing="No culprit case",
        ground_truth_json={"culprits": [], "mechanism": "No confirmed mechanism yet"},
    )
    db_session.add(case)
    await db_session.commit()

    response = await client.post(
        f"/api/cases/{case.case_id}/submit",
        headers=auth_headers,
        json={
            "culprit_ids": [str(uuid.uuid4())],
            "evidence_ids": [],
            "explanation": "This explanation is long enough but should score low on culprit match.",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["breakdown"]["culprit_score"] == 0
    assert data["score"] >= 0


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("hints_used", "expected_efficiency"),
    [(1, 8), (2, 6), (3, 4), (4, 2)],
)
async def test_submit_efficiency_by_hint_count(
    client: AsyncClient,
    db_session: AsyncSession,
    submission_case: tuple[Case, Entity, Document],
    sample_user: User,
    auth_headers: dict[str, str],
    hints_used: int,
    expected_efficiency: int,
) -> None:
    """Efficiency score decreases as hints are consumed."""
    case, culprit, document = submission_case
    db_session.add(
        PlayerState(
            user_id=sample_user.user_id,
            case_id=case.case_id,
            opened_docs=[],
            pinned_items=[],
            hypotheses_json={},
            hints_used=hints_used,
        )
    )
    await db_session.commit()

    response = await client.post(
        f"/api/cases/{case.case_id}/submit",
        headers=auth_headers,
        json={
            "culprit_ids": [str(culprit.entity_id)],
            "evidence_ids": [str(document.doc_id)],
            "explanation": (
                "The shell company and fake approvals reveal the fraud mechanism clearly."
            ),
        },
    )
    assert response.status_code == 200
    assert response.json()["breakdown"]["efficiency_score"] == expected_efficiency


def test_parse_uuid_invalid_inputs() -> None:
    """UUID parsing returns None for unsupported values."""
    assert _parse_uuid(123) is None
    assert _parse_uuid("not-a-uuid") is None


def test_extract_ground_truth_culprits_handles_invalid_and_symbolic_ids() -> None:
    """Ground truth parser supports legacy symbolic IDs and invalid shapes."""
    assert _extract_ground_truth_culprits({"culprits": "invalid"}) == set()

    culprits = _extract_ground_truth_culprits({"culprits": [{"entity_id": "P1"}]})
    expected = uuid.uuid5(uuid.uuid5(uuid.NAMESPACE_DNS, "mallory"), "P1")
    assert culprits == {expected}


def test_calculate_explanation_score_empty_tokens() -> None:
    """Explanation score is zero when either token set is empty."""
    assert _calculate_explanation_score("tiny", "also") == 0
    assert _calculate_explanation_score("useful explanation", "") == 0


def test_build_feedback_branches() -> None:
    """Feedback text changes across score tiers."""
    assert "Excellent investigation" in _build_feedback(90, missed=0, wrong=0)
    assert "Good investigation overall" in _build_feedback(75, missed=1, wrong=0)
    assert "needs more supporting evidence" in _build_feedback(45, missed=2, wrong=1)
