"""Tests for graph API endpoints."""

import uuid
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import Case, DocType, Document, Entity, EntityType, ScenarioType


@pytest.fixture
async def graph_test_case(db_session: AsyncSession) -> Case:
    """Create a test case for graph API tests."""
    case = Case(
        case_id=uuid.uuid4(),
        title="Graph API Test Case",
        scenario_type=ScenarioType.vendor_fraud,
        difficulty=2,
        seed=11111,
        briefing="Test briefing for graph API tests",
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
async def graph_test_entities(db_session: AsyncSession, graph_test_case: Case) -> list[Entity]:
    """Create test entities for graph API tests."""
    entities = []
    for i in range(3):
        entity = Entity(
            entity_id=uuid.uuid4(),
            case_id=graph_test_case.case_id,
            entity_type=EntityType.person if i < 2 else EntityType.org,
            name=f"Test Entity {i}",
            attrs_json={"role": "test"},
        )
        entities.append(entity)
        db_session.add(entity)
    await db_session.commit()
    return entities


@pytest.fixture
async def graph_test_documents(
    db_session: AsyncSession,
    graph_test_case: Case,
    graph_test_entities: list[Entity],
) -> list[Document]:
    """Create test documents for graph API tests."""
    docs = []
    for i in range(2):
        doc = Document(
            doc_id=uuid.uuid4(),
            case_id=graph_test_case.case_id,
            doc_type=DocType.email,
            ts=datetime.now(UTC),
            subject=f"Test Email {i}",
            body=f"Test body {i}",
            author_entity_id=graph_test_entities[i].entity_id,
        )
        docs.append(doc)
        db_session.add(doc)
    await db_session.commit()
    return docs


@pytest.fixture
def mock_neo4j_session() -> AsyncMock:
    """Create a mock Neo4j session."""
    session = AsyncMock()
    session.run = AsyncMock(return_value=AsyncMock())
    return session


@pytest.mark.asyncio
async def test_sync_case_to_graph(
    client: AsyncClient,
    graph_test_case: Case,
    graph_test_entities: list[Entity],
    graph_test_documents: list[Document],
) -> None:
    """POST /graph/sync syncs case to Neo4j."""
    with patch("src.dependencies.get_neo4j_driver") as mock_driver_func:
        mock_driver = AsyncMock()
        mock_session = AsyncMock()
        mock_session.run = AsyncMock(return_value=AsyncMock())
        mock_ctx = AsyncMock(__aenter__=AsyncMock(return_value=mock_session))
        mock_ctx.__aexit__ = AsyncMock()
        mock_driver.session = MagicMock(return_value=mock_ctx)
        mock_driver_func.return_value = mock_driver

        response = await client.post(
            f"/api/cases/{graph_test_case.case_id}/graph/sync",
        )

        assert response.status_code == 202
        data = response.json()
        assert data["case_id"] == str(graph_test_case.case_id)
        assert "nodes_created" in data
        assert "relationships_created" in data
        assert data["status"] == "completed"


@pytest.mark.asyncio
async def test_query_path(
    client: AsyncClient,
    graph_test_case: Case,
    graph_test_entities: list[Entity],
) -> None:
    """POST /graph/path returns shortest path."""
    with patch("src.dependencies.get_neo4j_driver") as mock_driver_func:
        mock_driver = AsyncMock()
        mock_session = AsyncMock()

        # Mock path not found
        mock_result = AsyncMock()
        mock_result.single = AsyncMock(return_value=None)
        mock_session.run = AsyncMock(return_value=mock_result)

        mock_ctx = AsyncMock(__aenter__=AsyncMock(return_value=mock_session))
        mock_ctx.__aexit__ = AsyncMock()
        mock_driver.session = MagicMock(return_value=mock_ctx)
        mock_driver_func.return_value = mock_driver

        response = await client.post(
            f"/api/cases/{graph_test_case.case_id}/graph/path",
            json={
                "from_entity_id": str(graph_test_entities[0].entity_id),
                "to_entity_id": str(graph_test_entities[1].entity_id),
                "max_depth": 6,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "nodes" in data
        assert "edges" in data
        assert "length" in data
        assert "found" in data


@pytest.mark.asyncio
async def test_get_neighbors(
    client: AsyncClient,
    graph_test_case: Case,
    graph_test_entities: list[Entity],
) -> None:
    """GET /graph/neighbors/{entity_id} returns entity neighbors."""
    with patch("src.dependencies.get_neo4j_driver") as mock_driver_func:
        mock_driver = AsyncMock()
        mock_session = AsyncMock()

        # Mock empty neighbors
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

        entity_id = graph_test_entities[0].entity_id
        url = f"/api/cases/{graph_test_case.case_id}/graph/neighbors/{entity_id}"
        response = await client.get(url)

        assert response.status_code == 200
        data = response.json()
        assert data["entity_id"] == str(entity_id)
        assert "neighbors" in data
        assert "edges" in data
        assert "total" in data


@pytest.mark.asyncio
async def test_get_neighbors_with_depth(
    client: AsyncClient,
    graph_test_case: Case,
    graph_test_entities: list[Entity],
) -> None:
    """GET /graph/neighbors with depth parameter."""
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

        entity_id = graph_test_entities[0].entity_id
        url = f"/api/cases/{graph_test_case.case_id}/graph/neighbors/{entity_id}?depth=2"
        response = await client.get(url)

        assert response.status_code == 200


@pytest.mark.asyncio
async def test_get_hubs(
    client: AsyncClient,
    graph_test_case: Case,
) -> None:
    """GET /graph/hubs returns communication hubs."""
    with patch("src.dependencies.get_neo4j_driver") as mock_driver_func:
        mock_driver = AsyncMock()
        mock_session = AsyncMock()

        # Mock empty hubs
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

        response = await client.get(
            f"/api/cases/{graph_test_case.case_id}/graph/hubs",
        )

        assert response.status_code == 200
        data = response.json()
        assert "hubs" in data
        assert "total" in data


@pytest.mark.asyncio
async def test_get_hubs_with_limit(
    client: AsyncClient,
    graph_test_case: Case,
) -> None:
    """GET /graph/hubs with limit parameter."""
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

        response = await client.get(
            f"/api/cases/{graph_test_case.case_id}/graph/hubs?limit=5",
        )

        assert response.status_code == 200


@pytest.mark.asyncio
async def test_get_graph_stats(
    client: AsyncClient,
    graph_test_case: Case,
) -> None:
    """GET /graph/stats returns graph statistics."""
    with patch("src.dependencies.get_neo4j_driver") as mock_driver_func:
        mock_driver = AsyncMock()
        mock_session = AsyncMock()

        # Mock stats queries
        call_count = 0

        async def mock_node_iter(self: object) -> AsyncIterator[dict[str, Any]]:
            yield {"label": "Person", "count": 5}

        async def mock_rel_iter(self: object) -> AsyncIterator[dict[str, Any]]:
            yield {"type": "SENT", "count": 3}

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

        response = await client.get(
            f"/api/cases/{graph_test_case.case_id}/graph/stats",
        )

        assert response.status_code == 200
        data = response.json()
        assert data["case_id"] == str(graph_test_case.case_id)
        assert "total_nodes" in data
        assert "total_edges" in data
        assert "node_types" in data
        assert "relationship_types" in data
