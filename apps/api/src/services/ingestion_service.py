"""Ingestion service for processing and indexing documents."""

from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.document import DocChunk, Document
from src.services.chunking_service import ChunkingService
from src.services.embedding_service import EmbeddingService


@dataclass
class IngestionResult:
    """Result of document ingestion."""

    doc_id: UUID
    chunks_created: int
    embeddings_generated: int


@dataclass
class CaseIngestionResult:
    """Result of case-wide ingestion."""

    case_id: UUID
    documents_processed: int
    total_chunks: int
    total_embeddings: int


class IngestionService:
    """Service for ingesting documents into the RAG pipeline.

    Orchestrates:
    1. Document chunking
    2. Embedding generation
    3. Storage in database with pgvector
    """

    def __init__(
        self,
        db: AsyncSession,
        chunking: ChunkingService | None = None,
        embedding: EmbeddingService | None = None,
    ) -> None:
        """Initialize ingestion service.

        Args:
            db: Database session
            chunking: Optional chunking service (creates default if None)
            embedding: Optional embedding service (creates default if None)
        """
        self.db = db
        self.chunking = chunking or ChunkingService()
        self.embedding = embedding or EmbeddingService()

    async def ingest_document(
        self, doc_id: UUID, *, generate_embeddings: bool = True
    ) -> IngestionResult:
        """Ingest a single document: chunk, embed, and store.

        Args:
            doc_id: ID of the document to ingest
            generate_embeddings: Whether to generate embeddings (default True)

        Returns:
            IngestionResult with counts

        Raises:
            ValueError: If document not found
        """
        # Fetch document
        result = await self.db.execute(select(Document).where(Document.doc_id == doc_id))
        doc = result.scalar_one_or_none()

        if not doc:
            msg = f"Document {doc_id} not found"
            raise ValueError(msg)

        # Delete existing chunks for this document
        await self.db.execute(delete(DocChunk).where(DocChunk.doc_id == doc_id))

        # Generate chunks
        chunk_results = self.chunking.chunk_document(doc)

        if not chunk_results:
            return IngestionResult(
                doc_id=doc_id,
                chunks_created=0,
                embeddings_generated=0,
            )

        # Generate embeddings if requested
        embeddings: list[list[float]] = []
        if generate_embeddings:
            texts = [c.text for c in chunk_results]
            embeddings = await self.embedding.embed_texts(texts)

        # Create DocChunk records
        chunks = []
        for i, chunk_result in enumerate(chunk_results):
            embedding = embeddings[i] if embeddings else None
            chunk = DocChunk(
                doc_id=doc_id,
                case_id=doc.case_id,
                chunk_index=chunk_result.chunk_index,
                text=chunk_result.text,
                embedding=embedding,
                language=doc.language,  # Inherit language from document
                meta_json=chunk_result.meta_json,
            )
            chunks.append(chunk)

        self.db.add_all(chunks)
        await self.db.flush()

        return IngestionResult(
            doc_id=doc_id,
            chunks_created=len(chunks),
            embeddings_generated=len(embeddings),
        )

    async def ingest_case(
        self, case_id: UUID, *, generate_embeddings: bool = True
    ) -> CaseIngestionResult:
        """Ingest all documents in a case.

        Args:
            case_id: ID of the case to ingest
            generate_embeddings: Whether to generate embeddings (default True)

        Returns:
            CaseIngestionResult with aggregate counts
        """
        # Fetch all documents for the case
        result = await self.db.execute(
            select(Document).where(Document.case_id == case_id).order_by(Document.ts)
        )
        documents = list(result.scalars().all())

        total_chunks = 0
        total_embeddings = 0

        for doc in documents:
            ingestion_result = await self.ingest_document(
                doc.doc_id, generate_embeddings=generate_embeddings
            )
            total_chunks += ingestion_result.chunks_created
            total_embeddings += ingestion_result.embeddings_generated

        return CaseIngestionResult(
            case_id=case_id,
            documents_processed=len(documents),
            total_chunks=total_chunks,
            total_embeddings=total_embeddings,
        )

    async def delete_document_chunks(self, doc_id: UUID) -> int:
        """Delete all chunks for a document.

        Args:
            doc_id: Document ID

        Returns:
            Number of chunks deleted
        """
        result = await self.db.execute(delete(DocChunk).where(DocChunk.doc_id == doc_id))
        return result.rowcount or 0  # type: ignore[attr-defined]

    async def delete_case_chunks(self, case_id: UUID) -> int:
        """Delete all chunks for a case.

        Args:
            case_id: Case ID

        Returns:
            Number of chunks deleted
        """
        result = await self.db.execute(delete(DocChunk).where(DocChunk.case_id == case_id))
        return result.rowcount or 0  # type: ignore[attr-defined]
