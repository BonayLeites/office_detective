"""Chat API routes for ARIA agent."""

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from src.dependencies import DbSession, OptionalUser
from src.models.player import PlayerState
from src.schemas.chat import ChatRequest, ChatResponse, HintRequest, HintResponse
from src.services.agent_service import AgentService
from src.services.case_service import CaseService

router = APIRouter(tags=["chat"])
MAX_HINTS = 4


def _collect_case_hints(ground_truth: dict[str, Any]) -> list[str]:
    """Flatten case hints from ground truth into a simple ordered list."""
    hints_block = ground_truth.get("hints", {})
    if not isinstance(hints_block, dict):
        return []

    flattened: list[str] = []
    for tier_key in sorted(hints_block.keys()):
        tier_hints = hints_block.get(tier_key)
        if not isinstance(tier_hints, list):
            continue
        for hint in tier_hints:
            if isinstance(hint, dict):
                text = hint.get("text")
                if isinstance(text, str) and text.strip():
                    flattened.append(text.strip())
            elif isinstance(hint, str) and hint.strip():
                flattened.append(hint.strip())
    return flattened


def _pick_hint(hints: list[str], mechanism: str, context: str | None, hints_used: int) -> str:
    """Choose an appropriate hint for the user's current state."""
    if hints:
        if context:
            context_lower = context.lower()
            for hint in hints:
                if context_lower in hint.lower():
                    return f"Based on your focus on '{context}': {hint}"
        return hints[min(hints_used, len(hints) - 1)]

    context_prefix = f"Based on your focus on '{context}': " if context else ""
    base_hint = mechanism[:90] + "..." if len(mechanism) > 90 else mechanism
    return f"{context_prefix}Consider investigating: {base_hint}"


@router.post(
    "/cases/{case_id}/chat",
    response_model=ChatResponse,
    status_code=status.HTTP_200_OK,
)
async def chat_with_aria(
    case_id: UUID,
    request: ChatRequest,
    db: DbSession,
    language: str = Query(default="en", pattern=r"^[a-z]{2}$"),
) -> ChatResponse:
    """Send a message to ARIA agent.

    ARIA will analyze the case and respond with insights,
    always citing evidence from documents.

    Args:
        case_id: Case ID to investigate
        request: Chat request with user message
        db: Database session
        language: Response language (ISO 639-1 code, default "en")

    Returns:
        ChatResponse with agent message and citations
    """
    # Verify case exists
    case_service = CaseService(db)
    case = await case_service.get_by_id(case_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case not found: {case_id}",
        )

    # Initialize agent service (without Neo4j for now - optional)
    agent_service = AgentService(db=db, neo4j=None)

    # Process chat message with language
    return await agent_service.chat(case_id, request, language=language)


@router.post(
    "/cases/{case_id}/chat/hint",
    response_model=HintResponse,
    status_code=status.HTTP_200_OK,
)
async def request_hint(
    case_id: UUID,
    request: HintRequest,
    db: DbSession,
    current_user: OptionalUser,
) -> HintResponse:
    """Request a hint for the investigation.

    Hints cost from the hint budget and provide contextual guidance.

    Args:
        case_id: Case ID
        request: Optional context about what user is stuck on
        db: Database session

    Returns:
        HintResponse with hint text and remaining budget
    """
    # Verify case exists
    case_service = CaseService(db)
    case = await case_service.get_by_id(case_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case not found: {case_id}",
        )

    ground_truth = case.ground_truth_json if isinstance(case.ground_truth_json, dict) else {}
    mechanism = str(ground_truth.get("mechanism", "Look for patterns in the documents"))
    case_hints = _collect_case_hints(ground_truth)

    hints_used = 0
    hints_remaining = MAX_HINTS

    if current_user:
        player_state_result = await db.execute(
            select(PlayerState).where(
                PlayerState.user_id == current_user.user_id,
                PlayerState.case_id == case_id,
            )
        )
        player_state = player_state_result.scalar_one_or_none()
        if player_state is None:
            player_state = PlayerState(
                user_id=current_user.user_id,
                case_id=case_id,
                opened_docs=[],
                pinned_items=[],
                hypotheses_json={},
                hints_used=0,
            )
            db.add(player_state)
            await db.flush()
            await db.refresh(player_state)

        if player_state.hints_used >= MAX_HINTS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No hints remaining for this case",
            )

        hints_used = player_state.hints_used
        player_state.hints_used += 1
        player_state.updated_at = datetime.now(UTC)
        hints_remaining = max(0, MAX_HINTS - player_state.hints_used)

    hint = _pick_hint(case_hints, mechanism, request.context, hints_used)
    return HintResponse(hint=hint, hints_remaining=hints_remaining, related_docs=[])
