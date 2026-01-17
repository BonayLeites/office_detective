"""Document schemas."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field

from src.models.document import DocType


class ChunkResponse(BaseModel):
    """Schema for chunk response."""

    chunk_id: UUID
    chunk_index: int
    text: str
    language: str = "en"
    has_embedding: bool = False
    meta_json: dict[str, Any] = Field(default_factory=dict)

    model_config = {"from_attributes": True}


class DocumentBase(BaseModel):
    """Base document schema."""

    doc_type: DocType
    ts: datetime
    subject: str | None = None
    body: str = Field(..., min_length=1)
    language: str = Field(default="en", pattern=r"^[a-z]{2}$")


class DocumentCreate(DocumentBase):
    """Schema for creating a document."""

    author_entity_id: UUID | None = None
    metadata_json: dict[str, Any] = Field(default_factory=dict)


class DocumentResponse(DocumentBase):
    """Schema for document response."""

    doc_id: UUID
    case_id: UUID
    author_entity_id: UUID | None = None
    metadata_json: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime
    chunk_count: int = 0

    model_config = {"from_attributes": True}


class DocumentWithChunks(DocumentResponse):
    """Document with its chunks (for detailed view)."""

    chunks: list[ChunkResponse] = Field(default_factory=list)


class DocumentListResponse(BaseModel):
    """Paginated document list."""

    documents: list[DocumentResponse]
    total: int
