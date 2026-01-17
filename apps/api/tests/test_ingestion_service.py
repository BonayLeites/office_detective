"""Tests for ingestion service."""

import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import Case, DocChunk, DocType, Document, ScenarioType
from src.services.ingestion_service import IngestionService


@pytest.fixture
async def ingestion_case(db_session: AsyncSession) -> Case:
    """Create a test case for ingestion tests."""
    case = Case(
        case_id=uuid.uuid4(),
        title="Ingestion Test Case",
        scenario_type=ScenarioType.vendor_fraud,
        difficulty=2,
        seed=88888,
        briefing="Test briefing for ingestion tests",
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
async def ingestion_document(db_session: AsyncSession, ingestion_case: Case) -> Document:
    """Create a test document for ingestion tests."""
    doc = Document(
        doc_id=uuid.uuid4(),
        case_id=ingestion_case.case_id,
        doc_type=DocType.email,
        ts=datetime.now(UTC),
        subject="Test Email",
        body="This is a test email for ingestion.",
    )
    db_session.add(doc)
    await db_session.commit()
    await db_session.refresh(doc)
    return doc


@pytest.fixture
async def ingestion_document_with_chunks(
    db_session: AsyncSession, ingestion_case: Case, ingestion_document: Document
) -> tuple[Document, list[DocChunk]]:
    """Create a document with existing chunks."""
    chunks = []
    for i in range(3):
        chunk = DocChunk(
            chunk_id=uuid.uuid4(),
            doc_id=ingestion_document.doc_id,
            case_id=ingestion_case.case_id,
            chunk_index=i,
            text=f"Existing chunk {i}",
            embedding=[0.1] * 1536,
            meta_json={},
        )
        chunks.append(chunk)
        db_session.add(chunk)
    await db_session.commit()
    return ingestion_document, chunks


@pytest.mark.asyncio
async def test_ingest_document_empty_chunks(
    db_session: AsyncSession,
    ingestion_case: Case,
    ingestion_document: Document,
) -> None:
    """Ingest document with no chunks returns zero counts."""
    mock_chunking = MagicMock()
    mock_chunking.chunk_document = MagicMock(return_value=[])  # No chunks

    mock_embedding = AsyncMock()

    service = IngestionService(db=db_session, chunking=mock_chunking, embedding=mock_embedding)

    result = await service.ingest_document(ingestion_document.doc_id)

    assert result.doc_id == ingestion_document.doc_id
    assert result.chunks_created == 0
    assert result.embeddings_generated == 0


@pytest.mark.asyncio
async def test_ingest_document_not_found(db_session: AsyncSession) -> None:
    """Ingest non-existent document raises ValueError."""
    service = IngestionService(db=db_session)

    with pytest.raises(ValueError, match="not found"):
        await service.ingest_document(uuid.uuid4())


@pytest.mark.asyncio
async def test_delete_document_chunks(
    db_session: AsyncSession,
    ingestion_case: Case,
    ingestion_document_with_chunks: tuple[Document, list[DocChunk]],
) -> None:
    """Delete document chunks removes all chunks for document."""
    doc, _chunks = ingestion_document_with_chunks

    service = IngestionService(db=db_session)
    deleted_count = await service.delete_document_chunks(doc.doc_id)

    assert deleted_count == 3


@pytest.mark.asyncio
async def test_delete_document_chunks_none_exist(
    db_session: AsyncSession,
    ingestion_document: Document,
) -> None:
    """Delete document chunks with no chunks returns zero."""
    service = IngestionService(db=db_session)
    deleted_count = await service.delete_document_chunks(ingestion_document.doc_id)

    assert deleted_count == 0


@pytest.mark.asyncio
async def test_delete_case_chunks(
    db_session: AsyncSession,
    ingestion_case: Case,
    ingestion_document_with_chunks: tuple[Document, list[DocChunk]],
) -> None:
    """Delete case chunks removes all chunks for case."""
    service = IngestionService(db=db_session)
    deleted_count = await service.delete_case_chunks(ingestion_case.case_id)

    assert deleted_count == 3


@pytest.mark.asyncio
async def test_delete_case_chunks_none_exist(
    db_session: AsyncSession,
    ingestion_case: Case,
) -> None:
    """Delete case chunks with no chunks returns zero."""
    service = IngestionService(db=db_session)
    deleted_count = await service.delete_case_chunks(ingestion_case.case_id)

    assert deleted_count == 0


@pytest.mark.asyncio
async def test_ingest_document_with_embeddings(
    db_session: AsyncSession,
    ingestion_document: Document,
) -> None:
    """Ingest document generates embeddings when requested."""
    mock_chunk_result = MagicMock()
    mock_chunk_result.chunk_index = 0
    mock_chunk_result.text = "Test chunk text"
    mock_chunk_result.meta_json = {"doc_type": "email"}

    mock_chunking = MagicMock()
    mock_chunking.chunk_document = MagicMock(return_value=[mock_chunk_result])

    mock_embedding = AsyncMock()
    mock_embedding.embed_texts = AsyncMock(return_value=[[0.1] * 1536])

    service = IngestionService(db=db_session, chunking=mock_chunking, embedding=mock_embedding)

    result = await service.ingest_document(ingestion_document.doc_id, generate_embeddings=True)

    assert result.chunks_created == 1
    assert result.embeddings_generated == 1
    mock_embedding.embed_texts.assert_called_once()


@pytest.mark.asyncio
async def test_ingest_document_without_embeddings(
    db_session: AsyncSession,
    ingestion_document: Document,
) -> None:
    """Ingest document skips embeddings when not requested."""
    mock_chunk_result = MagicMock()
    mock_chunk_result.chunk_index = 0
    mock_chunk_result.text = "Test chunk text"
    mock_chunk_result.meta_json = {"doc_type": "email"}

    mock_chunking = MagicMock()
    mock_chunking.chunk_document = MagicMock(return_value=[mock_chunk_result])

    mock_embedding = AsyncMock()

    service = IngestionService(db=db_session, chunking=mock_chunking, embedding=mock_embedding)

    result = await service.ingest_document(ingestion_document.doc_id, generate_embeddings=False)

    assert result.chunks_created == 1
    assert result.embeddings_generated == 0
    mock_embedding.embed_texts.assert_not_called()


@pytest.mark.asyncio
async def test_ingest_case(
    db_session: AsyncSession,
    ingestion_case: Case,
    ingestion_document: Document,
) -> None:
    """Ingest case processes all documents."""
    mock_chunk_result = MagicMock()
    mock_chunk_result.chunk_index = 0
    mock_chunk_result.text = "Test chunk"
    mock_chunk_result.meta_json = {}

    mock_chunking = MagicMock()
    mock_chunking.chunk_document = MagicMock(return_value=[mock_chunk_result])

    mock_embedding = AsyncMock()
    mock_embedding.embed_texts = AsyncMock(return_value=[[0.1] * 1536])

    service = IngestionService(db=db_session, chunking=mock_chunking, embedding=mock_embedding)

    result = await service.ingest_case(ingestion_case.case_id)

    assert result.case_id == ingestion_case.case_id
    assert result.documents_processed == 1
    assert result.total_chunks == 1
    assert result.total_embeddings == 1


@pytest.mark.asyncio
async def test_ingest_case_empty(
    db_session: AsyncSession,
    ingestion_case: Case,
) -> None:
    """Ingest case with no documents returns zero counts."""
    # Delete the document first
    from sqlalchemy import delete

    from src.models import Document

    await db_session.execute(delete(Document).where(Document.case_id == ingestion_case.case_id))
    await db_session.commit()

    service = IngestionService(db=db_session)
    result = await service.ingest_case(ingestion_case.case_id)

    assert result.documents_processed == 0
    assert result.total_chunks == 0
    assert result.total_embeddings == 0
