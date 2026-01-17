"""Tests for SQLAlchemy models."""

import uuid
from datetime import UTC, datetime

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import (
    Case,
    DocChunk,
    DocType,
    Document,
    Entity,
    EntityType,
    ScenarioType,
)


@pytest.mark.asyncio
async def test_case_creation(db_session: AsyncSession) -> None:
    """Can create a case with valid ground_truth_json."""
    case_id = uuid.uuid4()
    case = Case(
        case_id=case_id,
        title="Test Fraud Case",
        scenario_type=ScenarioType.vendor_fraud,
        difficulty=3,
        seed=42,
        briefing="This is a test briefing.",
        ground_truth_json={
            "culprits": [{"entity_id": "P1"}],
            "mechanism": "Shell company scheme",
            "total_stolen": 50000,
        },
    )
    db_session.add(case)
    await db_session.commit()

    # Verify case was created
    result = await db_session.execute(select(Case).where(Case.case_id == case_id))
    created_case = result.scalar_one()

    assert created_case.title == "Test Fraud Case"
    assert created_case.scenario_type == ScenarioType.vendor_fraud
    assert created_case.difficulty == 3
    assert created_case.briefing == "This is a test briefing."
    assert created_case.ground_truth_json["total_stolen"] == 50000
    assert created_case.created_at is not None
    assert created_case.updated_at is not None

    # Cleanup
    await db_session.delete(created_case)
    await db_session.commit()


@pytest.mark.asyncio
async def test_case_difficulty_constraint(db_session: AsyncSession) -> None:
    """Case difficulty must be between 1 and 5."""
    case = Case(
        case_id=uuid.uuid4(),
        title="Invalid Case",
        scenario_type=ScenarioType.data_leak,
        difficulty=6,  # Invalid
        seed=1,
        briefing="Test",
        ground_truth_json={},
    )
    db_session.add(case)

    with pytest.raises(Exception):  # Constraint violation
        await db_session.commit()

    await db_session.rollback()


@pytest.mark.asyncio
async def test_entity_creation(db_session: AsyncSession, sample_case: Case) -> None:
    """Can create entities linked to a case."""
    entity = Entity(
        entity_id=uuid.uuid4(),
        case_id=sample_case.case_id,
        entity_type=EntityType.person,
        name="John Doe",
        attrs_json={
            "email": "john.doe@example.com",
            "role": "Procurement Manager",
            "department": "Procurement",
        },
    )
    db_session.add(entity)
    await db_session.commit()

    # Verify entity was created
    result = await db_session.execute(select(Entity).where(Entity.entity_id == entity.entity_id))
    created_entity = result.scalar_one()

    assert created_entity.name == "John Doe"
    assert created_entity.entity_type == EntityType.person
    assert created_entity.attrs_json["role"] == "Procurement Manager"


@pytest.mark.asyncio
async def test_entity_types(db_session: AsyncSession, sample_case: Case) -> None:
    """All entity types can be created."""
    entity_types = [
        EntityType.person,
        EntityType.org,
        EntityType.account,
    ]

    for i, entity_type in enumerate(entity_types):
        entity = Entity(
            entity_id=uuid.uuid4(),
            case_id=sample_case.case_id,
            entity_type=entity_type,
            name=f"Test Entity {i}",
            attrs_json={},
        )
        db_session.add(entity)

    await db_session.commit()

    # Verify all were created
    result = await db_session.execute(select(Entity).where(Entity.case_id == sample_case.case_id))
    entities = list(result.scalars().all())
    assert len(entities) >= len(entity_types)


@pytest.mark.asyncio
async def test_document_creation(db_session: AsyncSession, sample_case: Case) -> None:
    """Can create documents linked to a case."""
    doc = Document(
        doc_id=uuid.uuid4(),
        case_id=sample_case.case_id,
        doc_type=DocType.email,
        ts=datetime(2024, 3, 15, 10, 30, 0, tzinfo=UTC),
        subject="Important Meeting",
        body="Please attend the meeting at 3pm.",
        metadata_json={"relevance": "context"},
    )
    db_session.add(doc)
    await db_session.commit()

    # Verify document was created
    result = await db_session.execute(select(Document).where(Document.doc_id == doc.doc_id))
    created_doc = result.scalar_one()

    assert created_doc.doc_type == DocType.email
    assert created_doc.subject == "Important Meeting"
    assert created_doc.author_entity_id is None  # No author set


@pytest.mark.asyncio
async def test_document_with_author(
    db_session: AsyncSession,
    sample_case: Case,
    sample_entity: Entity,
) -> None:
    """Document correctly links to author entity."""
    doc = Document(
        doc_id=uuid.uuid4(),
        case_id=sample_case.case_id,
        doc_type=DocType.email,
        ts=datetime.now(UTC),
        author_entity_id=sample_entity.entity_id,
        subject="Email from Author",
        body="Content here.",
        metadata_json={},
    )
    db_session.add(doc)
    await db_session.commit()
    await db_session.refresh(doc)

    # Verify relationship
    assert doc.author_entity_id == sample_entity.entity_id

    # Load the author through relationship
    await db_session.refresh(doc, attribute_names=["author"])
    assert doc.author is not None
    assert doc.author.name == sample_entity.name


@pytest.mark.asyncio
async def test_document_types(db_session: AsyncSession, sample_case: Case) -> None:
    """All document types can be created."""
    doc_types = [
        DocType.email,
        DocType.chat,
        DocType.ticket,
        DocType.invoice,
        DocType.csv,
        DocType.note,
        DocType.report,
    ]

    for i, doc_type in enumerate(doc_types):
        doc = Document(
            doc_id=uuid.uuid4(),
            case_id=sample_case.case_id,
            doc_type=doc_type,
            ts=datetime.now(UTC),
            subject=f"Test {doc_type.value}",
            body=f"Content for {doc_type.value}",
            metadata_json={},
        )
        db_session.add(doc)

    await db_session.commit()

    # Verify all were created
    result = await db_session.execute(
        select(Document).where(Document.case_id == sample_case.case_id)
    )
    docs = list(result.scalars().all())
    assert len(docs) == len(doc_types)


@pytest.mark.asyncio
async def test_doc_chunk_creation(
    db_session: AsyncSession,
    sample_case: Case,
) -> None:
    """Can create document chunks for RAG."""
    doc = Document(
        doc_id=uuid.uuid4(),
        case_id=sample_case.case_id,
        doc_type=DocType.email,
        ts=datetime.now(UTC),
        subject="Long Email",
        body="This is a long email that will be chunked.",
        metadata_json={},
    )
    db_session.add(doc)
    await db_session.commit()

    # Create chunks
    chunks = []
    for i in range(3):
        chunk = DocChunk(
            chunk_id=uuid.uuid4(),
            doc_id=doc.doc_id,
            case_id=sample_case.case_id,
            chunk_index=i,
            text=f"Chunk {i} content",
            embedding=None,  # No embedding yet
            meta_json={"chunk_number": i},
        )
        chunks.append(chunk)
        db_session.add(chunk)

    await db_session.commit()

    # Verify chunks were created
    result = await db_session.execute(select(DocChunk).where(DocChunk.doc_id == doc.doc_id))
    created_chunks = list(result.scalars().all())
    assert len(created_chunks) == 3


@pytest.mark.asyncio
async def test_cascade_delete(db_session: AsyncSession) -> None:
    """Deleting a case cascades to entities and documents."""
    # Create case
    case_id = uuid.uuid4()
    case = Case(
        case_id=case_id,
        title="Cascade Test Case",
        scenario_type=ScenarioType.expense_fraud,
        difficulty=1,
        seed=1,
        briefing="Test",
        ground_truth_json={},
    )
    db_session.add(case)
    await db_session.commit()

    # Create entities
    entity_ids = []
    for i in range(3):
        entity = Entity(
            entity_id=uuid.uuid4(),
            case_id=case_id,
            entity_type=EntityType.person,
            name=f"Person {i}",
            attrs_json={},
        )
        entity_ids.append(entity.entity_id)
        db_session.add(entity)

    await db_session.commit()

    # Create documents
    doc_ids = []
    for i in range(2):
        doc = Document(
            doc_id=uuid.uuid4(),
            case_id=case_id,
            doc_type=DocType.email,
            ts=datetime.now(UTC),
            subject=f"Doc {i}",
            body="Content",
            metadata_json={},
        )
        doc_ids.append(doc.doc_id)
        db_session.add(doc)

    await db_session.commit()

    # Verify they exist
    result = await db_session.execute(select(Entity).where(Entity.case_id == case_id))
    assert len(list(result.scalars().all())) == 3

    result = await db_session.execute(select(Document).where(Document.case_id == case_id))
    assert len(list(result.scalars().all())) == 2

    # Delete case
    await db_session.delete(case)
    await db_session.commit()

    # Verify entities were deleted (cascade)
    result = await db_session.execute(select(Entity).where(Entity.case_id == case_id))
    assert len(list(result.scalars().all())) == 0

    # Verify documents were deleted (cascade)
    result = await db_session.execute(select(Document).where(Document.case_id == case_id))
    assert len(list(result.scalars().all())) == 0


@pytest.mark.asyncio
async def test_author_set_null_on_delete(db_session: AsyncSession, sample_case: Case) -> None:
    """Deleting author entity sets document author_entity_id to NULL."""
    # Create entity
    entity = Entity(
        entity_id=uuid.uuid4(),
        case_id=sample_case.case_id,
        entity_type=EntityType.person,
        name="Author to Delete",
        attrs_json={},
    )
    db_session.add(entity)
    await db_session.commit()

    # Create document with author
    doc = Document(
        doc_id=uuid.uuid4(),
        case_id=sample_case.case_id,
        doc_type=DocType.email,
        ts=datetime.now(UTC),
        author_entity_id=entity.entity_id,
        subject="Email",
        body="Content",
        metadata_json={},
    )
    db_session.add(doc)
    await db_session.commit()

    # Delete author entity
    await db_session.delete(entity)
    await db_session.commit()

    # Refresh document
    await db_session.refresh(doc)

    # Author should be NULL now
    assert doc.author_entity_id is None
