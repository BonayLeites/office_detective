"""Search service for semantic similarity search over documents."""

from dataclasses import dataclass
from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.document import DocChunk, DocType, Document
from src.services.embedding_service import EmbeddingService


@dataclass
class SearchResult:
    """Single search result from semantic search."""

    chunk_id: UUID
    doc_id: UUID
    text: str
    score: float
    chunk_index: int
    meta_json: dict[str, Any]
    # Document context
    doc_type: DocType
    subject: str | None
    ts: datetime


class SearchService:
    """Service for semantic search over document chunks using pgvector."""

    def __init__(
        self,
        db: AsyncSession,
        embedding: EmbeddingService | None = None,
    ) -> None:
        """Initialize search service.

        Args:
            db: Database session
            embedding: Optional embedding service (creates default if None)
        """
        self.db = db
        self.embedding = embedding or EmbeddingService()

    async def search(
        self,
        case_id: UUID,
        query: str,
        *,
        k: int = 6,
        doc_types: list[DocType] | None = None,
        min_score: float = 0.0,
    ) -> list[SearchResult]:
        """Perform semantic search within a case.

        Args:
            case_id: Case ID to search within
            query: Natural language search query
            k: Number of results to return (default 6)
            doc_types: Optional filter by document types
            min_score: Minimum similarity score (0-1, default 0)

        Returns:
            List of SearchResult objects sorted by similarity
        """
        # Generate query embedding
        query_embedding = await self.embedding.embed_query(query)

        # Build query using pgvector cosine distance
        # Score is 1 - distance (higher is better)
        stmt = (
            select(
                DocChunk.chunk_id,
                DocChunk.doc_id,
                DocChunk.text,
                DocChunk.chunk_index,
                DocChunk.meta_json,
                Document.doc_type,
                Document.subject,
                Document.ts,
                (1 - DocChunk.embedding.cosine_distance(query_embedding)).label("score"),
            )
            .join(Document, DocChunk.doc_id == Document.doc_id)
            .where(DocChunk.case_id == case_id)
            .where(DocChunk.embedding.isnot(None))
        )

        # Apply doc_type filter if provided
        if doc_types:
            stmt = stmt.where(Document.doc_type.in_(doc_types))

        # Order by similarity (ascending distance = descending similarity)
        stmt = stmt.order_by(DocChunk.embedding.cosine_distance(query_embedding)).limit(k)

        result = await self.db.execute(stmt)
        rows = result.all()

        # Convert to SearchResult objects, filtering by min_score
        results = []
        for row in rows:
            score = float(row.score)
            if score >= min_score:
                results.append(
                    SearchResult(
                        chunk_id=row.chunk_id,
                        doc_id=row.doc_id,
                        text=row.text,
                        score=score,
                        chunk_index=row.chunk_index,
                        meta_json=row.meta_json,
                        doc_type=row.doc_type,
                        subject=row.subject,
                        ts=row.ts,
                    )
                )

        return results

    async def get_similar_chunks(
        self,
        chunk_id: UUID,
        *,
        k: int = 5,
        same_document: bool = False,
    ) -> list[SearchResult]:
        """Find chunks similar to a given chunk.

        Args:
            chunk_id: ID of the reference chunk
            k: Number of results to return
            same_document: If True, only search within the same document

        Returns:
            List of similar SearchResult objects
        """
        # Get the reference chunk
        result = await self.db.execute(select(DocChunk).where(DocChunk.chunk_id == chunk_id))
        ref_chunk = result.scalar_one_or_none()

        if not ref_chunk or ref_chunk.embedding is None:
            return []

        # Build similarity query
        stmt = (
            select(
                DocChunk.chunk_id,
                DocChunk.doc_id,
                DocChunk.text,
                DocChunk.chunk_index,
                DocChunk.meta_json,
                Document.doc_type,
                Document.subject,
                Document.ts,
                (1 - DocChunk.embedding.cosine_distance(ref_chunk.embedding)).label("score"),
            )
            .join(Document, DocChunk.doc_id == Document.doc_id)
            .where(DocChunk.case_id == ref_chunk.case_id)
            .where(DocChunk.chunk_id != chunk_id)  # Exclude the reference chunk
            .where(DocChunk.embedding.isnot(None))
        )

        if same_document:
            stmt = stmt.where(DocChunk.doc_id == ref_chunk.doc_id)

        stmt = stmt.order_by(DocChunk.embedding.cosine_distance(ref_chunk.embedding)).limit(k)

        result = await self.db.execute(stmt)
        rows = result.all()

        return [
            SearchResult(
                chunk_id=row.chunk_id,
                doc_id=row.doc_id,
                text=row.text,
                score=float(row.score),
                chunk_index=row.chunk_index,
                meta_json=row.meta_json,
                doc_type=row.doc_type,
                subject=row.subject,
                ts=row.ts,
            )
            for row in rows
        ]
