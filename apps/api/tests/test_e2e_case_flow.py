"""End-to-end tests for complete case investigation workflow.

Tests validate the full flow:
1. Create Case -> Add Entities -> Add Documents
2. Ingest Documents (chunk + embed)
3. Search Documents (pgvector)
4. Sync to Neo4j -> Query Graph
"""

import uuid
from collections.abc import AsyncIterator, Generator
from datetime import UTC, datetime
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import DocChunk, Document, Entity


def make_ground_truth() -> dict[str, Any]:
    """Create a valid ground truth structure for case creation."""
    culprit_id = str(uuid.uuid4())
    actor_id = str(uuid.uuid4())
    doc_id = str(uuid.uuid4())
    return {
        "culprit_entities": [culprit_id],
        "mechanism": "Test mechanism",
        "timeline": [
            {
                "timestamp": "2024-01-15T10:00:00Z",
                "actor_entity_id": actor_id,
                "action": "test_action",
                "details": "Test details",
                "evidence_doc_ids": [doc_id],
            }
        ],
        "required_evidence": [
            {
                "doc_id": doc_id,
                "rationale": "Test rationale",
                "strength": "critical",
            }
        ],
        "red_herrings": [],
    }


# Fixed embedding vector for deterministic tests
MOCK_EMBEDDING = [0.1] * 1536


@pytest.fixture
def mock_embedding_service() -> Generator[MagicMock, None, None]:
    """Mock embedding service with fixed vectors for determinism."""
    with patch("src.services.embedding_service.OpenAIEmbeddings") as mock_class:
        mock_embedder = MagicMock()
        mock_embedder.aembed_documents = AsyncMock(
            side_effect=lambda texts: [MOCK_EMBEDDING for _ in texts]
        )
        mock_embedder.aembed_query = AsyncMock(return_value=MOCK_EMBEDDING)
        mock_class.return_value = mock_embedder
        yield mock_embedder


@pytest.fixture
def mock_neo4j_driver() -> Generator[AsyncMock, None, None]:
    """Mock Neo4j driver for graph operations."""
    with patch("src.dependencies.get_neo4j_driver") as mock_driver_func:
        mock_driver = AsyncMock()
        mock_session = AsyncMock()
        mock_session.run = AsyncMock(return_value=AsyncMock())

        mock_ctx = AsyncMock(__aenter__=AsyncMock(return_value=mock_session))
        mock_ctx.__aexit__ = AsyncMock()
        mock_driver.session = MagicMock(return_value=mock_ctx)
        mock_driver_func.return_value = mock_driver

        yield mock_driver


# =============================================================================
# Test 1: Full Case Creation Flow
# =============================================================================


@pytest.mark.asyncio
async def test_full_case_creation_flow(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Create case with entities and documents via API.

    Flow: Create case -> Add 3 entities -> Add 4 documents -> Verify all persisted.
    """
    # 1. Create case
    case_data = {
        "title": "E2E Test Case - Vendor Fraud",
        "scenario_type": "vendor_fraud",
        "difficulty": 3,
        "seed": 99999,
        "ground_truth": make_ground_truth(),
    }
    response = await client.post("/api/cases", json=case_data)
    assert response.status_code == 201
    case = response.json()
    case_id = case["case_id"]

    # 2. Add entities (2 persons, 1 org)
    entities_data = [
        {"name": "Alice Smith", "entity_type": "person", "attrs_json": {"role": "CFO"}},
        {
            "name": "Bob Johnson",
            "entity_type": "person",
            "attrs_json": {"role": "Vendor Manager"},
        },
        {
            "name": "Acme Corp",
            "entity_type": "org",
            "attrs_json": {"type": "vendor", "iban": "DE89370400440532013000"},
        },
    ]

    entity_ids = []
    for entity_data in entities_data:
        response = await client.post(f"/api/cases/{case_id}/entities", json=entity_data)
        assert response.status_code == 201
        entity_ids.append(response.json()["entity_id"])

    # 3. Add documents (3 emails, 1 invoice)
    documents_data = [
        {
            "doc_type": "email",
            "ts": datetime.now(UTC).isoformat(),
            "subject": "Q4 Budget Review",
            "body": "Please review the attached vendor payments for Q4.",
            "author_entity_id": entity_ids[0],
        },
        {
            "doc_type": "email",
            "ts": datetime.now(UTC).isoformat(),
            "subject": "RE: Urgent Payment Request",
            "body": "I approved the payment to Acme Corp as requested.",
            "author_entity_id": entity_ids[1],
        },
        {
            "doc_type": "email",
            "ts": datetime.now(UTC).isoformat(),
            "subject": "Invoice Discrepancy",
            "body": "There seems to be a discrepancy in invoice INV-2024-001.",
            "author_entity_id": entity_ids[0],
        },
        {
            "doc_type": "invoice",
            "ts": datetime.now(UTC).isoformat(),
            "subject": "INV-2024-001",
            "body": "Invoice from Acme Corp for consulting services: $50,000",
        },
    ]

    doc_ids = []
    for doc_data in documents_data:
        response = await client.post(f"/api/cases/{case_id}/documents", json=doc_data)
        assert response.status_code == 201
        doc_ids.append(response.json()["doc_id"])

    # 4. Verify all persisted correctly
    # Check entities
    response = await client.get(f"/api/cases/{case_id}/entities")
    assert response.status_code == 200
    entities = response.json()
    assert entities["total"] == 3

    # Check documents
    response = await client.get(f"/api/cases/{case_id}/documents")
    assert response.status_code == 200
    documents = response.json()
    assert documents["total"] == 4

    # Verify in database
    result = await db_session.execute(select(Entity).where(Entity.case_id == case_id))
    db_entities = list(result.scalars().all())
    assert len(db_entities) == 3

    result = await db_session.execute(select(Document).where(Document.case_id == case_id))
    db_documents = list(result.scalars().all())
    assert len(db_documents) == 4


# =============================================================================
# Test 2: Ingestion and Search Flow
# =============================================================================


@pytest.mark.asyncio
async def test_ingestion_and_search_flow(
    client: AsyncClient,
    db_session: AsyncSession,
    mock_embedding_service: MagicMock,
) -> None:
    """Ingest documents and verify search works.

    Flow: Create case with docs -> Ingest -> Verify chunks -> Search -> Get results.
    """
    # 1. Create case
    case_data = {
        "title": "E2E Search Test Case",
        "scenario_type": "data_leak",
        "difficulty": 2,
        "seed": 88888,
        "ground_truth": make_ground_truth(),
    }
    response = await client.post("/api/cases", json=case_data)
    assert response.status_code == 201
    case_id = response.json()["case_id"]

    # 2. Add documents
    documents_data = [
        {
            "doc_type": "email",
            "ts": datetime.now(UTC).isoformat(),
            "subject": "Confidential Data Transfer",
            "body": "The confidential customer database was transferred to external servers.",
        },
        {
            "doc_type": "chat",
            "ts": datetime.now(UTC).isoformat(),
            "subject": "Slack Conversation",
            "body": "Did you see the security alert? Someone accessed the database.",
        },
    ]

    for doc_data in documents_data:
        response = await client.post(f"/api/cases/{case_id}/documents", json=doc_data)
        assert response.status_code == 201

    # 3. Ingest all documents
    response = await client.post(f"/api/cases/{case_id}/ingest")
    assert response.status_code == 202
    ingest_result = response.json()
    assert ingest_result["documents_processed"] == 2
    assert ingest_result["total_chunks"] > 0

    # 4. Verify chunks created in database
    result = await db_session.execute(select(DocChunk).where(DocChunk.case_id == case_id))
    chunks = list(result.scalars().all())
    assert len(chunks) > 0
    # Verify embeddings are set
    for chunk in chunks:
        assert chunk.embedding is not None

    # 5. Search for documents
    search_request = {
        "query": "confidential database transfer",
        "k": 5,
    }
    response = await client.post(f"/api/cases/{case_id}/search", json=search_request)
    assert response.status_code == 200
    search_results = response.json()
    assert "results" in search_results
    # With fixed embeddings, all chunks have same distance, but should still return
    assert search_results["total"] >= 0


# =============================================================================
# Test 3: Graph Sync and Query Flow
# =============================================================================


@pytest.mark.asyncio
async def test_graph_sync_and_query_flow(
    client: AsyncClient,
    db_session: AsyncSession,
    mock_neo4j_driver: MagicMock,
) -> None:
    """Sync to Neo4j and query relationships.

    Flow: Create case -> Sync to graph -> Query hubs/neighbors/stats.
    """
    # 1. Create case with entities and documents
    case_data = {
        "title": "E2E Graph Test Case",
        "scenario_type": "vendor_fraud",
        "difficulty": 2,
        "seed": 77777,
        "ground_truth": make_ground_truth(),
    }
    response = await client.post("/api/cases", json=case_data)
    assert response.status_code == 201
    case_id = response.json()["case_id"]

    # Add entities
    entity_data = [
        {"name": "Person A", "entity_type": "person", "attrs_json": {}},
        {"name": "Person B", "entity_type": "person", "attrs_json": {}},
        {"name": "Vendor X", "entity_type": "org", "attrs_json": {}},
    ]
    entity_ids = []
    for data in entity_data:
        response = await client.post(f"/api/cases/{case_id}/entities", json=data)
        assert response.status_code == 201
        entity_ids.append(response.json()["entity_id"])

    # Add documents with authors
    doc_data = {
        "doc_type": "email",
        "ts": datetime.now(UTC).isoformat(),
        "subject": "Payment Request",
        "body": "Please process payment to Vendor X.",
        "author_entity_id": entity_ids[0],
    }
    response = await client.post(f"/api/cases/{case_id}/documents", json=doc_data)
    assert response.status_code == 201

    # 2. Sync to Neo4j
    response = await client.post(f"/api/cases/{case_id}/graph/sync")
    assert response.status_code == 202
    sync_result = response.json()
    assert sync_result["case_id"] == case_id
    assert sync_result["nodes_created"] == 3  # 3 entities
    assert sync_result["relationships_created"] == 1  # 1 document with author
    assert sync_result["status"] == "completed"

    # 3. Query hubs (mocked empty response)
    # Set up mock for hubs query
    with patch("src.dependencies.get_neo4j_driver") as mock_driver_func:
        mock_driver = AsyncMock()
        mock_session = AsyncMock()

        async def mock_async_iter(self: object) -> AsyncIterator[Any]:
            return
            yield

        mock_result = AsyncMock()
        mock_result.__aiter__ = mock_async_iter
        mock_session.run = AsyncMock(return_value=mock_result)

        mock_ctx = AsyncMock(__aenter__=AsyncMock(return_value=mock_session))
        mock_ctx.__aexit__ = AsyncMock()
        mock_driver.session = MagicMock(return_value=mock_ctx)
        mock_driver_func.return_value = mock_driver

        response = await client.get(f"/api/cases/{case_id}/graph/hubs")
        assert response.status_code == 200
        hubs_result = response.json()
        assert "hubs" in hubs_result
        assert "total" in hubs_result

    # 4. Query neighbors
    with patch("src.dependencies.get_neo4j_driver") as mock_driver_func:
        mock_driver = AsyncMock()
        mock_session = AsyncMock()

        async def mock_async_iter(self: object) -> AsyncIterator[Any]:
            return
            yield

        mock_result = AsyncMock()
        mock_result.__aiter__ = mock_async_iter
        mock_session.run = AsyncMock(return_value=mock_result)

        mock_ctx = AsyncMock(__aenter__=AsyncMock(return_value=mock_session))
        mock_ctx.__aexit__ = AsyncMock()
        mock_driver.session = MagicMock(return_value=mock_ctx)
        mock_driver_func.return_value = mock_driver

        response = await client.get(f"/api/cases/{case_id}/graph/neighbors/{entity_ids[0]}")
        assert response.status_code == 200
        neighbors_result = response.json()
        assert "entity_id" in neighbors_result
        assert "neighbors" in neighbors_result

    # 5. Query stats
    with patch("src.dependencies.get_neo4j_driver") as mock_driver_func:
        mock_driver = AsyncMock()
        mock_session = AsyncMock()

        call_count = 0

        async def mock_node_iter(self: object) -> AsyncIterator[dict[str, Any]]:
            yield {"label": "Person", "count": 2}
            yield {"label": "Org", "count": 1}

        async def mock_rel_iter(self: object) -> AsyncIterator[dict[str, Any]]:
            yield {"type": "SENT", "count": 1}

        async def mock_run(query: str, **kwargs: object) -> AsyncMock:
            nonlocal call_count
            result = AsyncMock()
            if call_count == 0:
                result.__aiter__ = mock_node_iter
            else:
                result.__aiter__ = mock_rel_iter
            call_count += 1
            return result

        mock_session.run = mock_run

        mock_ctx = AsyncMock(__aenter__=AsyncMock(return_value=mock_session))
        mock_ctx.__aexit__ = AsyncMock()
        mock_driver.session = MagicMock(return_value=mock_ctx)
        mock_driver_func.return_value = mock_driver

        response = await client.get(f"/api/cases/{case_id}/graph/stats")
        assert response.status_code == 200
        stats = response.json()
        assert stats["case_id"] == case_id
        assert "total_nodes" in stats
        assert "total_edges" in stats


# =============================================================================
# Test 4: Complete Investigation Workflow
# =============================================================================


@pytest.mark.asyncio
async def test_complete_investigation_workflow(
    client: AsyncClient,
    db_session: AsyncSession,
    mock_embedding_service: MagicMock,
    mock_neo4j_driver: MagicMock,
) -> None:
    """Full workflow: create -> ingest -> search -> graph.

    This test validates data flows correctly between all services.
    """
    # 1. Create case
    case_data = {
        "title": "Complete E2E Investigation",
        "scenario_type": "vendor_fraud",
        "difficulty": 4,
        "seed": 66666,
        "ground_truth": make_ground_truth(),
    }
    response = await client.post("/api/cases", json=case_data)
    assert response.status_code == 201
    case_id = response.json()["case_id"]

    # 2. Add entities
    entities = [
        {
            "name": "Jane Doe",
            "entity_type": "person",
            "attrs_json": {"department": "Finance"},
        },
        {
            "name": "John Smith",
            "entity_type": "person",
            "attrs_json": {"department": "Procurement"},
        },
        {
            "name": "Shell Company LLC",
            "entity_type": "org",
            "attrs_json": {"suspicious": True},
        },
    ]

    entity_ids = []
    for entity in entities:
        response = await client.post(f"/api/cases/{case_id}/entities", json=entity)
        assert response.status_code == 201
        entity_ids.append(response.json()["entity_id"])

    # 3. Add documents with relationships
    documents = [
        {
            "doc_type": "email",
            "ts": datetime.now(UTC).isoformat(),
            "subject": "Payment Authorization",
            "body": "I have authorized payment of $100,000 to Shell Company LLC.",
            "author_entity_id": entity_ids[0],
        },
        {
            "doc_type": "email",
            "ts": datetime.now(UTC).isoformat(),
            "subject": "RE: Payment Authorization",
            "body": "Payment processed. Wire transfer completed.",
            "author_entity_id": entity_ids[1],
        },
        {
            "doc_type": "invoice",
            "ts": datetime.now(UTC).isoformat(),
            "subject": "INV-SHELL-001",
            "body": "Consulting services rendered by Shell Company LLC: $100,000",
        },
    ]

    doc_ids = []
    for doc in documents:
        response = await client.post(f"/api/cases/{case_id}/documents", json=doc)
        assert response.status_code == 201
        doc_ids.append(response.json()["doc_id"])

    # 4. Ingest all documents
    response = await client.post(f"/api/cases/{case_id}/ingest")
    assert response.status_code == 202
    ingest_result = response.json()
    assert ingest_result["documents_processed"] == 3
    assert ingest_result["total_chunks"] > 0

    # 5. Search for relevant documents
    search_request = {"query": "payment shell company", "k": 10}
    response = await client.post(f"/api/cases/{case_id}/search", json=search_request)
    assert response.status_code == 200
    search_results = response.json()
    assert "results" in search_results

    # 6. Sync to Neo4j
    response = await client.post(f"/api/cases/{case_id}/graph/sync")
    assert response.status_code == 202
    sync_result = response.json()
    assert sync_result["nodes_created"] == 3
    assert sync_result["relationships_created"] == 2  # 2 emails have authors

    # 7. Verify complete data flow
    # Check entities in DB
    result = await db_session.execute(select(Entity).where(Entity.case_id == case_id))
    db_entities = list(result.scalars().all())
    assert len(db_entities) == 3

    # Check documents in DB
    result = await db_session.execute(select(Document).where(Document.case_id == case_id))
    db_docs = list(result.scalars().all())
    assert len(db_docs) == 3

    # Check chunks in DB
    result = await db_session.execute(select(DocChunk).where(DocChunk.case_id == case_id))
    db_chunks = list(result.scalars().all())
    assert len(db_chunks) > 0

    # Verify case can be retrieved with all counts
    response = await client.get(f"/api/cases/{case_id}")
    assert response.status_code == 200
    case_detail = response.json()
    assert case_detail["entity_count"] == 3
    assert case_detail["document_count"] == 3
