"""Document and related models."""

from datetime import datetime
from enum import Enum as PyEnum
from typing import TYPE_CHECKING, Any
from uuid import UUID

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from src.models.case import Case


class EntityType(PyEnum):
    """Valid entity types."""

    person = "person"
    org = "org"
    account = "account"
    sku = "sku"
    ip = "ip"
    location = "location"
    order = "order"
    ticket = "ticket"


class DocType(PyEnum):
    """Valid document types."""

    email = "email"
    chat = "chat"
    ticket = "ticket"
    invoice = "invoice"
    csv = "csv"
    note = "note"
    report = "report"


class Entity(Base, TimestampMixin):
    """Entity model (person, org, account, etc.)."""

    __tablename__ = "entities"

    entity_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default="uuid_generate_v4()",
    )
    case_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("cases.case_id", ondelete="CASCADE"),
        nullable=False,
    )
    entity_type: Mapped[EntityType] = mapped_column(
        Enum(EntityType, name="entity_type", create_type=False),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    attrs_json: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)

    # Relationships
    case: Mapped["Case"] = relationship("Case", back_populates="entities")
    documents_authored: Mapped[list["Document"]] = relationship(
        "Document",
        back_populates="author",
        foreign_keys="Document.author_entity_id",
    )

    def __repr__(self) -> str:
        """String representation."""
        return f"<Entity {self.name} ({self.entity_type})>"


class Document(Base, TimestampMixin):
    """Document model (email, chat, invoice, etc.)."""

    __tablename__ = "documents"

    doc_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default="uuid_generate_v4()",
    )
    case_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("cases.case_id", ondelete="CASCADE"),
        nullable=False,
    )
    doc_type: Mapped[DocType] = mapped_column(
        Enum(DocType, name="doc_type", create_type=False),
        nullable=False,
    )
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    author_entity_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("entities.entity_id", ondelete="SET NULL"),
        nullable=True,
    )
    subject: Mapped[str | None] = mapped_column(Text, nullable=True)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)

    # Relationships
    case: Mapped["Case"] = relationship("Case", back_populates="documents")
    author: Mapped[Entity | None] = relationship(
        "Entity",
        back_populates="documents_authored",
        foreign_keys=[author_entity_id],
    )
    chunks: Mapped[list["DocChunk"]] = relationship(
        "DocChunk",
        back_populates="document",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        """String representation."""
        return f"<Document {self.doc_type}: {self.subject or 'No subject'}>"


class DocChunk(Base):
    """Document chunk for RAG."""

    __tablename__ = "doc_chunks"

    chunk_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default="uuid_generate_v4()",
    )
    doc_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("documents.doc_id", ondelete="CASCADE"),
        nullable=False,
    )
    case_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("cases.case_id", ondelete="CASCADE"),
        nullable=False,
    )
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(1536), nullable=True)
    meta_json: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)

    # Relationships
    document: Mapped[Document] = relationship("Document", back_populates="chunks")

    def __repr__(self) -> str:
        """String representation."""
        return f"<DocChunk {self.doc_id}[{self.chunk_index}]>"
