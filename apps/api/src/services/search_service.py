"""Search service for semantic similarity search over documents."""

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import case, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.document import DocChunk, DocType, Document
from src.services.embedding_service import EmbeddingService

logger = logging.getLogger(__name__)


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
        language: str = "en",
    ) -> list[SearchResult]:
        """Perform semantic search within a case.

        Args:
            case_id: Case ID to search within
            query: Natural language search query
            k: Number of results to return (default 6)
            doc_types: Optional filter by document types
            min_score: Minimum similarity score (0-1, default 0)
            language: Language to filter results by (default "en")

        Returns:
            List of SearchResult objects sorted by similarity
        """
        try:
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
                .where(DocChunk.language == language)
                .where(DocChunk.embedding.isnot(None))
            )

            # Apply doc_type filter if provided
            if doc_types:
                stmt = stmt.where(Document.doc_type.in_(doc_types))

            # Order by similarity (ascending distance = descending similarity)
            stmt = stmt.order_by(DocChunk.embedding.cosine_distance(query_embedding)).limit(k)

            result = await self.db.execute(stmt)
            rows = result.all()
            return self._rows_to_search_results(rows, min_score)
        except Exception as exc:
            logger.warning("Semantic search failed, falling back to keyword search: %s", exc)
            return await self._keyword_search(
                case_id=case_id,
                query=query,
                k=k,
                doc_types=doc_types,
                min_score=min_score,
                language=language,
            )

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

    async def _keyword_search(
        self,
        case_id: UUID,
        query: str,
        *,
        k: int,
        doc_types: list[DocType] | None,
        min_score: float,
        language: str,
    ) -> list[SearchResult]:
        """Fallback keyword search when vector embeddings are unavailable."""
        query_terms = [term.strip() for term in query.split() if len(term.strip()) > 1]
        query_terms = query_terms[:8] if query_terms else [query.strip()]

        patterns = [f"%{term}%" for term in query_terms if term]
        if not patterns:
            return []

        match_expr: Any = case((DocChunk.text.ilike(patterns[0]), 1), else_=0)
        for pattern in patterns[1:]:
            match_expr = match_expr + case((DocChunk.text.ilike(pattern), 1), else_=0)
        match_expr = match_expr.label("match_score")

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
                match_expr,
            )
            .join(Document, DocChunk.doc_id == Document.doc_id)
            .where(DocChunk.case_id == case_id)
            .where(DocChunk.language == language)
            .where(or_(*[DocChunk.text.ilike(pattern) for pattern in patterns]))
        )

        if doc_types:
            stmt = stmt.where(Document.doc_type.in_(doc_types))

        stmt = stmt.order_by(match_expr.desc(), Document.ts.desc()).limit(k)
        result = await self.db.execute(stmt)
        rows = result.all()

        max_score = float(len(patterns))
        normalized_rows: list[Any] = []
        for row in rows:
            normalized_score = float(row.match_score) / max_score if max_score > 0 else 0.0
            normalized_rows.append(
                {
                    "chunk_id": row.chunk_id,
                    "doc_id": row.doc_id,
                    "text": row.text,
                    "chunk_index": row.chunk_index,
                    "meta_json": row.meta_json,
                    "doc_type": row.doc_type,
                    "subject": row.subject,
                    "ts": row.ts,
                    "score": normalized_score,
                }
            )

        return self._rows_to_search_results(normalized_rows, min_score)

    def _rows_to_search_results(self, rows: Any, min_score: float) -> list[SearchResult]:
        """Convert SQL rows into SearchResult objects."""
        results: list[SearchResult] = []
        for row in rows:
            score = float(row["score"] if isinstance(row, dict) else row.score)
            if score < min_score:
                continue

            results.append(
                SearchResult(
                    chunk_id=row["chunk_id"] if isinstance(row, dict) else row.chunk_id,
                    doc_id=row["doc_id"] if isinstance(row, dict) else row.doc_id,
                    text=row["text"] if isinstance(row, dict) else row.text,
                    score=score,
                    chunk_index=row["chunk_index"] if isinstance(row, dict) else row.chunk_index,
                    meta_json=row["meta_json"] if isinstance(row, dict) else row.meta_json,
                    doc_type=row["doc_type"] if isinstance(row, dict) else row.doc_type,
                    subject=row["subject"] if isinstance(row, dict) else row.subject,
                    ts=row["ts"] if isinstance(row, dict) else row.ts,
                )
            )
        return results
