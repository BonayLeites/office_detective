"""Chat schemas for ARIA agent."""

from datetime import UTC, datetime
from uuid import UUID

from pydantic import BaseModel, Field


class Citation(BaseModel):
    """Citation linking response to evidence."""

    doc_id: UUID
    chunk_id: UUID | None = None
    quote: str = Field(..., min_length=1)
    relevance: str = Field(..., min_length=1)


class ChatMessage(BaseModel):
    """Single chat message."""

    role: str  # user, assistant, tool
    content: str
    citations: list[Citation] = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ChatRequest(BaseModel):
    """Request to chat with ARIA."""

    message: str = Field(..., min_length=1, max_length=2000)
    conversation_id: UUID | None = None


class ChatResponse(BaseModel):
    """Response from ARIA agent."""

    message: str
    citations: list[Citation] = Field(default_factory=list)
    conversation_id: UUID
    suggested_actions: list[str] = Field(default_factory=list)


class HintRequest(BaseModel):
    """Request for a hint."""

    context: str | None = None


class HintResponse(BaseModel):
    """Hint response."""

    hint: str
    hints_remaining: int
    related_docs: list[UUID] = Field(default_factory=list)
