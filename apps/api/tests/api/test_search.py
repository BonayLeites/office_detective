"""Tests for search API endpoints."""

import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import Case, DocChunk, DocType, Document, ScenarioType


@pytest.fixture
async def test_case(db_session: AsyncSession) -> Case:
    """Create a test case for search tests."""
    case = Case(
        case_id=uuid.uuid4(),
        title="Search Test Case",
        scenario_type=ScenarioType.vendor_fraud,
        difficulty=2,
        seed=55555,
        briefing="Test briefing for search tests",
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
async def test_document(db_session: AsyncSession, test_case: Case) -> Document:
    """Create a test document for search tests."""
    doc = Document(
        doc_id=uuid.uuid4(),
        case_id=test_case.case_id,
        doc_type=DocType.email,
        ts=datetime.now(UTC),
        subject="Important Email",
        body="This is an important email about the project.",
    )
    db_session.add(doc)
    await db_session.commit()
    await db_session.refresh(doc)
    return doc


@pytest.fixture
async def test_document_with_chunks(
    db_session: AsyncSession, test_case: Case, test_document: Document
) -> tuple[Document, list[DocChunk]]:
    """Create a document with embedded chunks for search testing."""
    # Create mock embedding vector
    mock_embedding = [0.1] * 1536

    chunks = []
    for i in range(2):
        chunk = DocChunk(
            chunk_id=uuid.uuid4(),
            doc_id=test_document.doc_id,
            case_id=test_case.case_id,
            chunk_index=i,
            text=f"Chunk {i} about the project details.",
            embedding=mock_embedding,
            meta_json={"doc_type": "email"},
        )
        chunks.append(chunk)
        db_session.add(chunk)
    await db_session.commit()
    return test_document, chunks


@pytest.mark.asyncio
async def test_search_no_results(client: AsyncClient, test_case: Case) -> None:
    """POST /search returns empty results when no chunks exist."""
    with patch(
        "src.services.search_service.EmbeddingService"
    ) as mock_embedding_class:
        mock_embedding = AsyncMock()
        mock_embedding.embed_query = AsyncMock(return_value=[0.1] * 1536)
        mock_embedding_class.return_value = mock_embedding

        response = await client.post(
            f"/api/cases/{test_case.case_id}/search",
            json={"query": "test query", "k": 5},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["results"] == []
        assert data["total"] == 0
        assert data["query"] == "test query"


@pytest.mark.asyncio
async def test_search_with_results(
    client: AsyncClient,
    test_case: Case,
    test_document_with_chunks: tuple[Document, list[DocChunk]],
) -> None:
    """POST /search returns matching chunks."""
    with patch(
        "src.services.search_service.EmbeddingService"
    ) as mock_embedding_class:
        mock_embedding = AsyncMock()
        # Return an embedding similar to the chunk embeddings
        mock_embedding.embed_query = AsyncMock(return_value=[0.1] * 1536)
        mock_embedding_class.return_value = mock_embedding

        response = await client.post(
            f"/api/cases/{test_case.case_id}/search",
            json={"query": "project details", "k": 5},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        assert data["query"] == "project details"

        # Verify result structure
        for result in data["results"]:
            assert "chunk_id" in result
            assert "doc_id" in result
            assert "text" in result
            assert "score" in result
            assert "doc_type" in result


@pytest.mark.asyncio
async def test_search_validation_error(client: AsyncClient, test_case: Case) -> None:
    """POST /search returns 422 for invalid request."""
    # Empty query
    response = await client.post(
        f"/api/cases/{test_case.case_id}/search",
        json={"query": "", "k": 5},
    )
    assert response.status_code == 422

    # k too large
    response = await client.post(
        f"/api/cases/{test_case.case_id}/search",
        json={"query": "test", "k": 100},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_ingest_case(
    client: AsyncClient, test_case: Case, test_document: Document
) -> None:
    """POST /ingest creates chunks for case documents."""
    with (
        patch(
            "src.services.ingestion_service.EmbeddingService"
        ) as mock_embedding_class,
        patch(
            "src.services.ingestion_service.ChunkingService"
        ) as mock_chunking_class,
    ):
        # Mock chunking service
        mock_chunking = AsyncMock()
        mock_chunk_result = AsyncMock()
        mock_chunk_result.chunk_index = 0
        mock_chunk_result.text = "Test chunk"
        mock_chunk_result.meta_json = {"doc_type": "email"}
        mock_chunking.chunk_document = lambda _doc: [mock_chunk_result]
        mock_chunking_class.return_value = mock_chunking

        # Mock embedding service
        mock_embedding = AsyncMock()
        mock_embedding.embed_texts = AsyncMock(return_value=[[0.1] * 1536])
        mock_embedding_class.return_value = mock_embedding

        response = await client.post(
            f"/api/cases/{test_case.case_id}/ingest",
            json={"generate_embeddings": True},
        )
        assert response.status_code == 202
        data = response.json()
        assert data["case_id"] == str(test_case.case_id)
        assert "documents_processed" in data
        assert "total_chunks" in data
        assert "total_embeddings" in data


@pytest.mark.asyncio
async def test_ingest_case_no_embeddings(
    client: AsyncClient, test_case: Case, test_document: Document
) -> None:
    """POST /ingest with generate_embeddings=false skips embedding generation."""
    with patch(
        "src.services.ingestion_service.ChunkingService"
    ) as mock_chunking_class:
        # Mock chunking service
        mock_chunking = AsyncMock()
        mock_chunk_result = AsyncMock()
        mock_chunk_result.chunk_index = 0
        mock_chunk_result.text = "Test chunk"
        mock_chunk_result.meta_json = {"doc_type": "email"}
        mock_chunking.chunk_document = lambda _doc: [mock_chunk_result]
        mock_chunking_class.return_value = mock_chunking

        response = await client.post(
            f"/api/cases/{test_case.case_id}/ingest",
            json={"generate_embeddings": False},
        )
        assert response.status_code == 202
        data = response.json()
        assert data["total_embeddings"] == 0


@pytest.mark.asyncio
async def test_ingest_document(
    client: AsyncClient, test_case: Case, test_document: Document
) -> None:
    """POST /ingest/{doc_id} creates chunks for single document."""
    with (
        patch(
            "src.services.ingestion_service.EmbeddingService"
        ) as mock_embedding_class,
        patch(
            "src.services.ingestion_service.ChunkingService"
        ) as mock_chunking_class,
    ):
        # Mock chunking service
        mock_chunking = AsyncMock()
        mock_chunk_result = AsyncMock()
        mock_chunk_result.chunk_index = 0
        mock_chunk_result.text = "Test chunk"
        mock_chunk_result.meta_json = {"doc_type": "email"}
        mock_chunking.chunk_document = lambda _doc: [mock_chunk_result]
        mock_chunking_class.return_value = mock_chunking

        # Mock embedding service
        mock_embedding = AsyncMock()
        mock_embedding.embed_texts = AsyncMock(return_value=[[0.1] * 1536])
        mock_embedding_class.return_value = mock_embedding

        response = await client.post(
            f"/api/cases/{test_case.case_id}/ingest/{test_document.doc_id}",
        )
        assert response.status_code == 202
        data = response.json()
        assert data["doc_id"] == str(test_document.doc_id)
        assert "chunks_created" in data
        assert "embeddings_generated" in data


@pytest.mark.asyncio
async def test_ingest_document_not_found(client: AsyncClient, test_case: Case) -> None:
    """POST /ingest/{doc_id} returns 404 for non-existent document."""
    fake_id = uuid.uuid4()
    response = await client.post(
        f"/api/cases/{test_case.case_id}/ingest/{fake_id}",
    )
    assert response.status_code == 404
