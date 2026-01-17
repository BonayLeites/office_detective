"""Tests for search service."""

import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import Case, DocChunk, DocType, Document, ScenarioType
from src.services.search_service import SearchService


@pytest.fixture
async def search_case(db_session: AsyncSession) -> Case:
    """Create a test case for search service tests."""
    case = Case(
        case_id=uuid.uuid4(),
        title="Search Service Test Case",
        scenario_type=ScenarioType.vendor_fraud,
        difficulty=2,
        seed=77777,
        briefing="Test briefing for search service tests",
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
async def search_documents(db_session: AsyncSession, search_case: Case) -> list[Document]:
    """Create test documents with different types."""
    docs = []
    for i, doc_type in enumerate([DocType.email, DocType.chat, DocType.ticket]):
        doc = Document(
            doc_id=uuid.uuid4(),
            case_id=search_case.case_id,
            doc_type=doc_type,
            ts=datetime.now(UTC),
            subject=f"Test {doc_type.value} {i}",
            body=f"This is a test {doc_type.value} about the project.",
        )
        docs.append(doc)
        db_session.add(doc)
    await db_session.commit()
    return docs


@pytest.fixture
async def search_chunks(
    db_session: AsyncSession, search_case: Case, search_documents: list[Document]
) -> list[DocChunk]:
    """Create test chunks with embeddings."""
    mock_embedding = [0.1] * 1536
    chunks = []

    for doc in search_documents:
        for i in range(2):
            chunk = DocChunk(
                chunk_id=uuid.uuid4(),
                doc_id=doc.doc_id,
                case_id=search_case.case_id,
                chunk_index=i,
                text=f"Chunk {i} from {doc.doc_type.value}",
                embedding=mock_embedding,
                meta_json={"doc_type": doc.doc_type.value},
            )
            chunks.append(chunk)
            db_session.add(chunk)

    await db_session.commit()
    return chunks


@pytest.mark.asyncio
async def test_search_with_doc_types_filter(
    db_session: AsyncSession,
    search_case: Case,
    search_documents: list[Document],
    search_chunks: list[DocChunk],
) -> None:
    """Search with doc_types filter returns only matching types."""
    mock_embedding_service = AsyncMock()
    mock_embedding_service.embed_query = AsyncMock(return_value=[0.1] * 1536)

    service = SearchService(db_session, embedding=mock_embedding_service)

    # Search only for emails
    results = await service.search(
        case_id=search_case.case_id,
        query="test query",
        k=10,
        doc_types=[DocType.email],
    )

    # Should only get email chunks
    assert len(results) == 2  # 2 chunks per email document
    for result in results:
        assert result.doc_type == DocType.email


@pytest.mark.asyncio
async def test_search_with_min_score_filter(
    db_session: AsyncSession,
    search_case: Case,
    search_documents: list[Document],
    search_chunks: list[DocChunk],
) -> None:
    """Search with min_score filter excludes low-scoring results."""
    mock_embedding_service = AsyncMock()
    # Return embedding that will result in perfect similarity score
    mock_embedding_service.embed_query = AsyncMock(return_value=[0.1] * 1536)

    service = SearchService(db_session, embedding=mock_embedding_service)

    # With perfect match embedding, scores should be ~1.0
    # Setting min_score very high should still return results
    results = await service.search(
        case_id=search_case.case_id,
        query="test query",
        k=10,
        min_score=0.99,
    )

    # All results should have score >= 0.99
    for result in results:
        assert result.score >= 0.99


@pytest.mark.asyncio
async def test_search_min_score_excludes_results(
    db_session: AsyncSession,
    search_case: Case,
    search_documents: list[Document],
) -> None:
    """Search with very high min_score excludes all results."""
    # Create chunks with different embeddings
    different_embedding = [0.5] * 1536
    chunk = DocChunk(
        chunk_id=uuid.uuid4(),
        doc_id=search_documents[0].doc_id,
        case_id=search_case.case_id,
        chunk_index=0,
        text="Test chunk",
        embedding=different_embedding,
        meta_json={},
    )
    db_session.add(chunk)
    await db_session.commit()

    mock_embedding_service = AsyncMock()
    # Return very different embedding to get low score
    mock_embedding_service.embed_query = AsyncMock(return_value=[-0.5] * 1536)

    service = SearchService(db_session, embedding=mock_embedding_service)

    # With very high min_score and different embeddings, should get no results
    results = await service.search(
        case_id=search_case.case_id,
        query="test query",
        k=10,
        min_score=0.99,
    )

    # Results with low scores should be filtered out
    assert all(r.score >= 0.99 for r in results)


@pytest.mark.asyncio
async def test_get_similar_chunks(
    db_session: AsyncSession,
    search_case: Case,
    search_documents: list[Document],
    search_chunks: list[DocChunk],
) -> None:
    """Get similar chunks returns similar chunks from case."""
    service = SearchService(db_session)

    reference_chunk = search_chunks[0]
    results = await service.get_similar_chunks(reference_chunk.chunk_id, k=5)

    # Should return similar chunks (not the reference itself)
    assert len(results) <= 5
    for result in results:
        assert result.chunk_id != reference_chunk.chunk_id


@pytest.mark.asyncio
async def test_get_similar_chunks_same_document(
    db_session: AsyncSession,
    search_case: Case,
    search_documents: list[Document],
    search_chunks: list[DocChunk],
) -> None:
    """Get similar chunks with same_document=True only returns from same doc."""
    service = SearchService(db_session)

    reference_chunk = search_chunks[0]
    reference_doc_id = reference_chunk.doc_id

    results = await service.get_similar_chunks(reference_chunk.chunk_id, k=5, same_document=True)

    # All results should be from the same document
    for result in results:
        assert result.doc_id == reference_doc_id
        assert result.chunk_id != reference_chunk.chunk_id


@pytest.mark.asyncio
async def test_get_similar_chunks_not_found(db_session: AsyncSession) -> None:
    """Get similar chunks with non-existent chunk returns empty list."""
    service = SearchService(db_session)

    fake_chunk_id = uuid.uuid4()
    results = await service.get_similar_chunks(fake_chunk_id, k=5)

    assert results == []


@pytest.mark.asyncio
async def test_get_similar_chunks_no_embedding(
    db_session: AsyncSession,
    search_case: Case,
    search_documents: list[Document],
) -> None:
    """Get similar chunks with chunk without embedding returns empty list."""
    # Create chunk without embedding
    chunk = DocChunk(
        chunk_id=uuid.uuid4(),
        doc_id=search_documents[0].doc_id,
        case_id=search_case.case_id,
        chunk_index=0,
        text="Chunk without embedding",
        embedding=None,  # No embedding
        meta_json={},
    )
    db_session.add(chunk)
    await db_session.commit()

    service = SearchService(db_session)
    results = await service.get_similar_chunks(chunk.chunk_id, k=5)

    assert results == []
