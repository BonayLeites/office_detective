"""Search schemas for RAG endpoints."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field

from src.models.document import DocType


class SearchRequest(BaseModel):
    """Request schema for semantic search."""

    query: str = Field(..., min_length=1, max_length=1000)
    k: int = Field(default=6, ge=1, le=20)
    doc_types: list[DocType] | None = None
    min_score: float = Field(default=0.0, ge=0.0, le=1.0)


class SearchResultItem(BaseModel):
    """Single search result item."""

    chunk_id: UUID
    doc_id: UUID
    text: str
    score: float
    chunk_index: int
    doc_type: DocType
    subject: str | None = None
    ts: datetime
    meta_json: dict[str, Any] = Field(default_factory=dict)

    model_config = {"from_attributes": True}


class SearchResponse(BaseModel):
    """Response schema for semantic search."""

    results: list[SearchResultItem]
    query: str
    total: int


class IngestionRequest(BaseModel):
    """Request schema for document ingestion."""

    generate_embeddings: bool = Field(default=True)


class DocumentIngestionResponse(BaseModel):
    """Response schema for single document ingestion."""

    doc_id: UUID
    chunks_created: int
    embeddings_generated: int


class CaseIngestionResponse(BaseModel):
    """Response schema for case-wide ingestion."""

    case_id: UUID
    documents_processed: int
    total_chunks: int
    total_embeddings: int
