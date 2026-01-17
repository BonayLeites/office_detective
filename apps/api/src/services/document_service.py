"""Document service for business logic."""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.document import DocChunk, DocType, Document
from src.schemas.document import DocumentCreate


class DocumentService:
    """Service for document-related operations."""

    def __init__(self, db: AsyncSession) -> None:
        """Initialize service with database session."""
        self.db = db

    async def get_by_id(self, doc_id: UUID) -> Document | None:
        """Get document by ID."""
        result = await self.db.execute(select(Document).where(Document.doc_id == doc_id))
        return result.scalar_one_or_none()

    async def get_with_chunks(self, doc_id: UUID) -> Document | None:
        """Get document with its chunks loaded."""
        result = await self.db.execute(
            select(Document).where(Document.doc_id == doc_id).options(selectinload(Document.chunks))
        )
        return result.scalar_one_or_none()

    async def list_by_case(
        self,
        case_id: UUID,
        skip: int = 0,
        limit: int = 50,
        doc_type: DocType | None = None,
    ) -> list[Document]:
        """List documents for a case with pagination."""
        stmt = select(Document).where(Document.case_id == case_id)

        if doc_type is not None:
            stmt = stmt.where(Document.doc_type == doc_type)

        stmt = stmt.order_by(Document.ts.desc()).offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count_by_case(
        self,
        case_id: UUID,
        doc_type: DocType | None = None,
    ) -> int:
        """Count documents for a case."""
        stmt = select(func.count(Document.doc_id)).where(Document.case_id == case_id)

        if doc_type is not None:
            stmt = stmt.where(Document.doc_type == doc_type)

        result = await self.db.execute(stmt)
        return result.scalar() or 0

    async def get_chunk_count(self, doc_id: UUID) -> int:
        """Get number of chunks for a document."""
        result = await self.db.execute(
            select(func.count(DocChunk.chunk_id)).where(DocChunk.doc_id == doc_id)
        )
        return result.scalar() or 0

    async def create(self, case_id: UUID, data: DocumentCreate) -> Document:
        """Create a new document."""
        document = Document(
            case_id=case_id,
            doc_type=data.doc_type,
            ts=data.ts,
            author_entity_id=data.author_entity_id,
            subject=data.subject,
            body=data.body,
            metadata_json=data.metadata_json,
        )
        self.db.add(document)
        await self.db.flush()
        await self.db.refresh(document)
        return document

    async def delete(self, document: Document) -> None:
        """Delete a document."""
        await self.db.delete(document)
