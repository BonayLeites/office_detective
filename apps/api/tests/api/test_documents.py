"""Tests for documents API endpoints."""

import uuid
from datetime import UTC, datetime

import pytest
from httpx import AsyncClient
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import Case, DocChunk, DocType, Document, Entity, EntityType, ScenarioType


@pytest.fixture
async def test_case(db_session: AsyncSession) -> Case:
    """Create a test case for API tests."""
    case = Case(
        case_id=uuid.uuid4(),
        title="Document Test Case",
        scenario_type=ScenarioType.vendor_fraud,
        difficulty=2,
        seed=11111,
        briefing="Test briefing for document tests",
        ground_truth_json={
            "culprits": [{"entity_id": str(uuid.uuid4())}],
            "mechanism": "Test mechanism",
        },
    )
    db_session.add(case)
    await db_session.commit()
    await db_session.refresh(case)
    return case


@pytest.fixture
async def test_entity(db_session: AsyncSession, test_case: Case) -> Entity:
    """Create a test entity for document tests."""
    entity = Entity(
        entity_id=uuid.uuid4(),
        case_id=test_case.case_id,
        entity_type=EntityType.person,
        name="Test Author",
        attrs_json={"email": "author@test.com"},
    )
    db_session.add(entity)
    await db_session.commit()
    await db_session.refresh(entity)
    return entity


@pytest.fixture
async def test_document(
    db_session: AsyncSession, test_case: Case, test_entity: Entity
) -> Document:
    """Create a test document for API tests."""
    doc = Document(
        doc_id=uuid.uuid4(),
        case_id=test_case.case_id,
        doc_type=DocType.email,
        ts=datetime.now(UTC),
        author_entity_id=test_entity.entity_id,
        subject="Test Email Subject",
        body="This is the body of the test email.",
        metadata_json={"priority": "high"},
    )
    db_session.add(doc)
    await db_session.commit()
    await db_session.refresh(doc)
    return doc


@pytest.fixture
async def test_document_with_chunks(
    db_session: AsyncSession, test_document: Document
) -> tuple[Document, list[DocChunk]]:
    """Create a document with chunks for testing."""
    chunks = []
    for i in range(3):
        chunk = DocChunk(
            chunk_id=uuid.uuid4(),
            doc_id=test_document.doc_id,
            case_id=test_document.case_id,
            chunk_index=i,
            text=f"Chunk {i} content",
            embedding=None,
            meta_json={"index": i},
        )
        chunks.append(chunk)
        db_session.add(chunk)
    await db_session.commit()
    return test_document, chunks


@pytest.fixture
async def clean_documents(db_session: AsyncSession, test_case: Case) -> None:
    """Clean all documents for the test case."""
    await db_session.execute(delete(Document).where(Document.case_id == test_case.case_id))
    await db_session.commit()


@pytest.mark.asyncio
async def test_list_documents_empty(
    client: AsyncClient, test_case: Case, clean_documents: None
) -> None:
    """GET /api/cases/{case_id}/documents returns empty list when no documents."""
    response = await client.get(f"/api/cases/{test_case.case_id}/documents")
    assert response.status_code == 200
    data = response.json()
    assert data["documents"] == []
    assert data["total"] == 0


@pytest.mark.asyncio
async def test_list_documents_with_data(
    client: AsyncClient, test_case: Case, test_document: Document
) -> None:
    """GET /api/cases/{case_id}/documents returns documents."""
    response = await client.get(f"/api/cases/{test_case.case_id}/documents")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1

    # Find our test document
    doc_data = next(
        (d for d in data["documents"] if d["doc_id"] == str(test_document.doc_id)), None
    )
    assert doc_data is not None
    assert doc_data["doc_type"] == "email"
    assert doc_data["subject"] == "Test Email Subject"
    assert doc_data["body"] == "This is the body of the test email."
    assert doc_data["chunk_count"] == 0


@pytest.mark.asyncio
async def test_list_documents_filter_by_type(
    client: AsyncClient, test_case: Case, test_document: Document, db_session: AsyncSession
) -> None:
    """GET /api/cases/{case_id}/documents filters by doc_type."""
    # Create a chat document
    chat_doc = Document(
        doc_id=uuid.uuid4(),
        case_id=test_case.case_id,
        doc_type=DocType.chat,
        ts=datetime.now(UTC),
        body="Chat message content",
    )
    db_session.add(chat_doc)
    await db_session.commit()

    # Filter for emails only
    response = await client.get(
        f"/api/cases/{test_case.case_id}/documents", params={"doc_type": "email"}
    )
    assert response.status_code == 200
    data = response.json()

    for doc in data["documents"]:
        assert doc["doc_type"] == "email"


@pytest.mark.asyncio
async def test_list_documents_pagination(
    client: AsyncClient, test_case: Case, db_session: AsyncSession, clean_documents: None
) -> None:
    """GET /api/cases/{case_id}/documents respects skip and limit."""
    # Create 5 documents
    for i in range(5):
        doc = Document(
            doc_id=uuid.uuid4(),
            case_id=test_case.case_id,
            doc_type=DocType.note,
            ts=datetime.now(UTC),
            body=f"Document {i}",
        )
        db_session.add(doc)
    await db_session.commit()

    # Get first 2
    response = await client.get(
        f"/api/cases/{test_case.case_id}/documents", params={"limit": 2}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["documents"]) == 2
    assert data["total"] == 5

    # Skip 2, get next 2
    response = await client.get(
        f"/api/cases/{test_case.case_id}/documents", params={"skip": 2, "limit": 2}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["documents"]) == 2


@pytest.mark.asyncio
async def test_get_document_found(
    client: AsyncClient, test_case: Case, test_document: Document
) -> None:
    """GET /api/cases/{case_id}/documents/{doc_id} returns document when found."""
    response = await client.get(
        f"/api/cases/{test_case.case_id}/documents/{test_document.doc_id}"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["doc_id"] == str(test_document.doc_id)
    assert data["doc_type"] == "email"
    assert data["subject"] == "Test Email Subject"


@pytest.mark.asyncio
async def test_get_document_not_found(client: AsyncClient, test_case: Case) -> None:
    """GET /api/cases/{case_id}/documents/{doc_id} returns 404 when not found."""
    fake_id = uuid.uuid4()
    response = await client.get(f"/api/cases/{test_case.case_id}/documents/{fake_id}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_document_wrong_case(
    client: AsyncClient, test_case: Case, test_document: Document, db_session: AsyncSession
) -> None:
    """GET /api/cases/{case_id}/documents/{doc_id} returns 404 when doc in different case."""
    # Create another case
    other_case = Case(
        case_id=uuid.uuid4(),
        title="Other Case",
        scenario_type=ScenarioType.data_leak,
        difficulty=1,
        seed=22222,
        ground_truth_json={"culprits": [], "mechanism": "Test"},
    )
    db_session.add(other_case)
    await db_session.commit()

    # Try to access document from wrong case
    response = await client.get(
        f"/api/cases/{other_case.case_id}/documents/{test_document.doc_id}"
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_document_full(
    client: AsyncClient, test_case: Case, test_document_with_chunks: tuple[Document, list[DocChunk]]
) -> None:
    """GET /api/cases/{case_id}/documents/{doc_id}/full returns document with chunks."""
    doc, _chunks = test_document_with_chunks
    response = await client.get(
        f"/api/cases/{test_case.case_id}/documents/{doc.doc_id}/full"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["doc_id"] == str(doc.doc_id)
    assert data["chunk_count"] == 3
    assert len(data["chunks"]) == 3

    # Verify chunks are sorted by index
    for i, chunk in enumerate(data["chunks"]):
        assert chunk["chunk_index"] == i


@pytest.mark.asyncio
async def test_create_document(client: AsyncClient, test_case: Case) -> None:
    """POST /api/cases/{case_id}/documents creates a new document."""
    doc_data = {
        "doc_type": "email",
        "ts": datetime.now(UTC).isoformat(),
        "subject": "New Email",
        "body": "This is a new email body.",
        "metadata_json": {"tag": "test"},
    }
    response = await client.post(
        f"/api/cases/{test_case.case_id}/documents", json=doc_data
    )
    assert response.status_code == 201
    data = response.json()
    assert data["doc_type"] == "email"
    assert data["subject"] == "New Email"
    assert data["body"] == "This is a new email body."
    assert data["case_id"] == str(test_case.case_id)
    assert data["chunk_count"] == 0


@pytest.mark.asyncio
async def test_create_document_with_author(
    client: AsyncClient, test_case: Case, test_entity: Entity
) -> None:
    """POST /api/cases/{case_id}/documents creates document with author."""
    doc_data = {
        "doc_type": "chat",
        "ts": datetime.now(UTC).isoformat(),
        "body": "Chat message",
        "author_entity_id": str(test_entity.entity_id),
    }
    response = await client.post(
        f"/api/cases/{test_case.case_id}/documents", json=doc_data
    )
    assert response.status_code == 201
    data = response.json()
    assert data["author_entity_id"] == str(test_entity.entity_id)


@pytest.mark.asyncio
async def test_create_document_validation_error(
    client: AsyncClient, test_case: Case
) -> None:
    """POST /api/cases/{case_id}/documents returns 422 for invalid data."""
    # Missing required field 'body'
    doc_data = {
        "doc_type": "email",
        "ts": datetime.now(UTC).isoformat(),
    }
    response = await client.post(
        f"/api/cases/{test_case.case_id}/documents", json=doc_data
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_delete_document(
    client: AsyncClient, test_case: Case, test_document: Document, db_session: AsyncSession
) -> None:
    """DELETE /api/cases/{case_id}/documents/{doc_id} removes document."""
    doc_id = test_document.doc_id

    response = await client.delete(
        f"/api/cases/{test_case.case_id}/documents/{doc_id}"
    )
    assert response.status_code == 204

    # Verify document is deleted
    await db_session.commit()
    db_session.expire_all()
    result = await db_session.execute(select(Document).where(Document.doc_id == doc_id))
    assert result.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_delete_document_not_found(client: AsyncClient, test_case: Case) -> None:
    """DELETE /api/cases/{case_id}/documents/{doc_id} returns 404 when not found."""
    fake_id = uuid.uuid4()
    response = await client.delete(
        f"/api/cases/{test_case.case_id}/documents/{fake_id}"
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_document_cascades_chunks(
    client: AsyncClient,
    test_case: Case,
    test_document_with_chunks: tuple[Document, list[DocChunk]],
    db_session: AsyncSession,
) -> None:
    """DELETE /api/cases/{case_id}/documents/{doc_id} also deletes chunks."""
    doc, chunks = test_document_with_chunks
    chunk_ids = [c.chunk_id for c in chunks]

    response = await client.delete(
        f"/api/cases/{test_case.case_id}/documents/{doc.doc_id}"
    )
    assert response.status_code == 204

    # Verify chunks are deleted
    await db_session.commit()
    db_session.expire_all()
    for chunk_id in chunk_ids:
        result = await db_session.execute(
            select(DocChunk).where(DocChunk.chunk_id == chunk_id)
        )
        assert result.scalar_one_or_none() is None
