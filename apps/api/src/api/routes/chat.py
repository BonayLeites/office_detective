"""Chat API routes for ARIA agent."""

import logging
from asyncio import TimeoutError as AsyncTimeoutError
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Request, Response, status
from openai import APIError as OpenAIAPIError
from openai import AuthenticationError as OpenAIAuthenticationError
from openai import RateLimitError as OpenAIRateLimitError
from sqlalchemy import select

from src.config import settings
from src.dependencies import DbSession, OptionalUser
from src.models.player import PlayerState
from src.models.user import User
from src.schemas.chat import ChatRequest, ChatResponse, HintRequest, HintResponse
from src.services.agent_service import AgentService
from src.services.case_service import CaseService
from src.services.rate_limiter import SlidingWindowRateLimiter

router = APIRouter(tags=["chat"])
MAX_HINTS = 4
logger = logging.getLogger(__name__)
rate_limiter = SlidingWindowRateLimiter()


def _rate_limit_key(
    scope: str, request: Request, current_user: User | None, case_id: UUID | None = None
) -> str:
    """Build a deterministic per-scope key for throttling."""
    forwarded_for = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    client_host = forwarded_for or (request.client.host if request.client else "unknown")
    subject = f"user:{current_user.user_id}" if current_user else f"ip:{client_host}"
    case_segment = f":case:{case_id}" if case_id else ""
    return f"{scope}:{subject}{case_segment}"


def _enforce_rate_limit(
    *,
    key: str,
    limit: int,
    window_seconds: int,
    response: Response,
    detail: str,
) -> None:
    """Enforce configured rate limits and attach standard limit headers."""
    if limit <= 0 or window_seconds <= 0:
        return

    if not rate_limiter.allow(key, limit, window_seconds):
        retry_after = rate_limiter.retry_after_seconds(key, window_seconds)
        response.headers["Retry-After"] = str(retry_after)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=detail,
            headers={"Retry-After": str(retry_after)},
        )

    response.headers["X-RateLimit-Limit"] = str(limit)
    response.headers["X-RateLimit-Remaining"] = str(
        rate_limiter.remaining(key, limit, window_seconds)
    )
    response.headers["X-RateLimit-Window"] = str(window_seconds)


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
    request_context: Request,
    response: Response,
    current_user: OptionalUser,
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

    chat_rate_key = _rate_limit_key("chat", request_context, current_user, case_id)
    _enforce_rate_limit(
        key=chat_rate_key,
        limit=settings.chat_rate_limit_requests,
        window_seconds=settings.chat_rate_limit_window_seconds,
        response=response,
        detail="Too many chat requests. Please wait a moment and try again.",
    )

    # Initialize agent service (without Neo4j for now - optional)
    agent_service = AgentService(db=db, neo4j=None)

    try:
        # Process chat message with language
        return await agent_service.chat(case_id, request, language=language)
    except OpenAIAuthenticationError as exc:
        logger.warning("AI provider authentication failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "AI provider authentication failed. "
                "Check provider API key settings in apps/api/.env and restart the backend."
            ),
        ) from exc
    except OpenAIRateLimitError as exc:
        logger.warning("AI provider rate-limited chat request: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI provider is temporarily rate-limited. Please retry in a moment.",
        ) from exc
    except AsyncTimeoutError as exc:
        logger.warning("AI provider request timed out")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="AI provider timed out. Please retry in a moment.",
        ) from exc
    except OpenAIAPIError as exc:
        logger.exception("AI provider request failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI provider request failed. Please retry in a moment.",
        ) from exc


@router.post(
    "/cases/{case_id}/chat/hint",
    response_model=HintResponse,
    status_code=status.HTTP_200_OK,
)
async def request_hint(
    case_id: UUID,
    request: HintRequest,
    db: DbSession,
    request_context: Request,
    response: Response,
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

    hint_rate_key = _rate_limit_key("hint", request_context, current_user, case_id)
    _enforce_rate_limit(
        key=hint_rate_key,
        limit=settings.hint_rate_limit_requests,
        window_seconds=settings.hint_rate_limit_window_seconds,
        response=response,
        detail="Too many hint requests. Please wait before requesting another hint.",
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
