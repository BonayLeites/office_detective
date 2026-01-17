"""Chat API routes for ARIA agent."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from src.dependencies import DbSession
from src.schemas.chat import ChatRequest, ChatResponse, HintRequest, HintResponse
from src.services.agent_service import AgentService
from src.services.case_service import CaseService

router = APIRouter(tags=["chat"])


@router.post(
    "/cases/{case_id}/chat",
    response_model=ChatResponse,
    status_code=status.HTTP_200_OK,
)
async def chat_with_aria(
    case_id: UUID,
    request: ChatRequest,
    db: DbSession,
) -> ChatResponse:
    """Send a message to ARIA agent.

    ARIA will analyze the case and respond with insights,
    always citing evidence from documents.

    Args:
        case_id: Case ID to investigate
        request: Chat request with user message
        db: Database session

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

    # Process chat message
    return await agent_service.chat(case_id, request)


@router.post(
    "/cases/{case_id}/chat/hint",
    response_model=HintResponse,
    status_code=status.HTTP_200_OK,
)
async def request_hint(
    case_id: UUID,
    request: HintRequest,
    db: DbSession,
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

    # For now, return a placeholder hint
    # In a full implementation, this would use ground_truth to generate hints
    ground_truth = case.ground_truth_json or {}
    mechanism = ground_truth.get("mechanism", "Look for patterns in the documents")

    # Generate a vague hint based on the mechanism and user context
    context_prefix = f"Based on your focus on '{request.context}': " if request.context else ""
    base_hint = mechanism[:50] + "..." if len(mechanism) > 50 else mechanism
    hint = f"{context_prefix}Consider investigating: {base_hint}"

    return HintResponse(
        hint=hint,
        hints_remaining=2,  # Placeholder - would come from player state
        related_docs=[],
    )
