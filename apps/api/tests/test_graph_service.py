"""Tests for graph service."""

import uuid
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import Case, DocType, Document, Entity, EntityType, ScenarioType
from src.services.graph_service import GraphService


@pytest.fixture
async def graph_case(db_session: AsyncSession) -> Case:
    """Create a test case for graph service tests."""
    case = Case(
        case_id=uuid.uuid4(),
        title="Graph Test Case",
        scenario_type=ScenarioType.vendor_fraud,
        difficulty=2,
        seed=99999,
        briefing="Test briefing for graph tests",
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
async def graph_entities(
    db_session: AsyncSession, graph_case: Case
) -> list[Entity]:
    """Create test entities for graph service tests."""
    entities = []
    for i, etype in enumerate([EntityType.person, EntityType.org, EntityType.person]):
        entity = Entity(
            entity_id=uuid.uuid4(),
            case_id=graph_case.case_id,
            entity_type=etype,
            name=f"Test {etype.value} {i}",
            attrs_json={"role": "test"},
        )
        entities.append(entity)
        db_session.add(entity)
    await db_session.commit()
    return entities


@pytest.fixture
async def graph_documents(
    db_session: AsyncSession, graph_case: Case, graph_entities: list[Entity]
) -> list[Document]:
    """Create test documents with authors for graph service tests."""
    docs = []
    for i in range(2):
        doc = Document(
            doc_id=uuid.uuid4(),
            case_id=graph_case.case_id,
            doc_type=DocType.email,
            ts=datetime.now(UTC),
            subject=f"Test Email {i}",
            body=f"Test body {i}",
            author_entity_id=graph_entities[i].entity_id,
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
async def test_sync_case(
    db_session: AsyncSession,
    mock_neo4j_session: AsyncMock,
    graph_case: Case,
    graph_entities: list[Entity],
    graph_documents: list[Document],
) -> None:
    """Sync case creates nodes and relationships in Neo4j."""
    service = GraphService(mock_neo4j_session, db_session)
    result = await service.sync_case(graph_case.case_id)

    assert result.case_id == graph_case.case_id
    assert result.nodes_created == len(graph_entities)
    # 2 documents have authors
    assert result.relationships_created == 2

    # Verify Neo4j queries were called
    assert mock_neo4j_session.run.call_count > 0


@pytest.mark.asyncio
async def test_sync_case_clears_existing(
    db_session: AsyncSession,
    mock_neo4j_session: AsyncMock,
    graph_case: Case,
) -> None:
    """Sync case clears existing graph data first."""
    service = GraphService(mock_neo4j_session, db_session)
    await service.sync_case(graph_case.case_id)

    # First call should be the DETACH DELETE query
    first_call = mock_neo4j_session.run.call_args_list[0]
    assert "DETACH DELETE" in first_call[0][0]


@pytest.mark.asyncio
async def test_query_path_found(
    db_session: AsyncSession,
    graph_case: Case,
    graph_entities: list[Entity],
) -> None:
    """Query path returns path when found."""
    mock_neo4j = AsyncMock()

    # Mock path result
    mock_node1 = MagicMock()
    mock_node1.__getitem__ = MagicMock(
        side_effect=lambda k: {
            "entity_id": str(graph_entities[0].entity_id),
            "name": graph_entities[0].name,
            "entity_type": graph_entities[0].entity_type.value,
        }[k]
    )
    mock_node1.get = MagicMock(
        side_effect=lambda k, d=None: {
            "entity_id": str(graph_entities[0].entity_id),
            "name": graph_entities[0].name,
            "entity_type": graph_entities[0].entity_type.value,
        }.get(k, d)
    )
    mock_node1.items = MagicMock(return_value=[])

    mock_node2 = MagicMock()
    mock_node2.__getitem__ = MagicMock(
        side_effect=lambda k: {
            "entity_id": str(graph_entities[1].entity_id),
            "name": graph_entities[1].name,
            "entity_type": graph_entities[1].entity_type.value,
        }[k]
    )
    mock_node2.get = MagicMock(
        side_effect=lambda k, d=None: {
            "entity_id": str(graph_entities[1].entity_id),
            "name": graph_entities[1].name,
            "entity_type": graph_entities[1].entity_type.value,
        }.get(k, d)
    )
    mock_node2.items = MagicMock(return_value=[])

    mock_rel = MagicMock()
    mock_rel.type = "SENT"
    mock_rel.start_node = mock_node1
    mock_rel.end_node = mock_node2
    mock_rel.items = MagicMock(return_value=[])

    mock_path = MagicMock()
    mock_path.nodes = [mock_node1, mock_node2]
    mock_path.relationships = [mock_rel]

    mock_record = MagicMock()
    mock_record.__getitem__ = MagicMock(return_value=mock_path)

    mock_result = AsyncMock()
    mock_result.single = AsyncMock(return_value=mock_record)
    mock_neo4j.run = AsyncMock(return_value=mock_result)

    service = GraphService(mock_neo4j, db_session)
    result = await service.query_path(
        graph_case.case_id,
        graph_entities[0].entity_id,
        graph_entities[1].entity_id,
    )

    assert result.found is True
    assert len(result.nodes) == 2
    assert len(result.edges) == 1
    assert result.length == 1


@pytest.mark.asyncio
async def test_query_path_not_found(
    db_session: AsyncSession,
    graph_case: Case,
    graph_entities: list[Entity],
) -> None:
    """Query path returns empty when no path exists."""
    mock_neo4j = AsyncMock()
    mock_result = AsyncMock()
    mock_result.single = AsyncMock(return_value=None)
    mock_neo4j.run = AsyncMock(return_value=mock_result)

    service = GraphService(mock_neo4j, db_session)
    result = await service.query_path(
        graph_case.case_id,
        graph_entities[0].entity_id,
        graph_entities[1].entity_id,
    )

    assert result.found is False
    assert result.nodes == []
    assert result.edges == []
    assert result.length == 0


@pytest.mark.asyncio
async def test_query_hubs(
    db_session: AsyncSession,
    graph_case: Case,
    graph_entities: list[Entity],
) -> None:
    """Query hubs returns entities ordered by degree."""
    mock_neo4j = AsyncMock()

    # Create async iterable for records
    async def mock_async_iter(self: object) -> AsyncIterator[dict[str, Any]]:
        for entity in graph_entities[:2]:
            record = {
                "entity_id": str(entity.entity_id),
                "name": entity.name,
                "entity_type": entity.entity_type.value,
                "degree": 5,
            }
            yield record

    mock_result = AsyncMock()
    mock_result.__aiter__ = mock_async_iter
    mock_neo4j.run = AsyncMock(return_value=mock_result)

    service = GraphService(mock_neo4j, db_session)
    hubs = await service.query_hubs(graph_case.case_id, limit=10)

    assert len(hubs) == 2
    assert hubs[0].degree == 5


@pytest.mark.asyncio
async def test_query_neighbors(
    db_session: AsyncSession,
    graph_case: Case,
    graph_entities: list[Entity],
) -> None:
    """Query neighbors returns connected entities."""
    mock_neo4j = AsyncMock()

    # Create mock neighbor node
    mock_neighbor = MagicMock()
    mock_neighbor.__getitem__ = MagicMock(
        side_effect=lambda k: {
            "entity_id": str(graph_entities[1].entity_id),
            "name": graph_entities[1].name,
            "entity_type": graph_entities[1].entity_type.value,
        }[k]
    )
    mock_neighbor.get = MagicMock(
        side_effect=lambda k, d=None: {
            "entity_id": str(graph_entities[1].entity_id),
            "name": graph_entities[1].name,
            "entity_type": graph_entities[1].entity_type.value,
        }.get(k, d)
    )
    mock_neighbor.items = MagicMock(return_value=[])

    async def mock_async_iter(self: object) -> AsyncIterator[MagicMock]:
        record = MagicMock()
        record.__getitem__ = MagicMock(
            side_effect=lambda k: {"neighbor": mock_neighbor, "r": None}[k]
        )
        yield record

    mock_result = AsyncMock()
    mock_result.__aiter__ = mock_async_iter
    mock_neo4j.run = AsyncMock(return_value=mock_result)

    service = GraphService(mock_neo4j, db_session)
    nodes, _edges = await service.query_neighbors(
        graph_case.case_id, graph_entities[0].entity_id, depth=1
    )

    assert len(nodes) == 1
    assert nodes[0].entity_id == graph_entities[1].entity_id


@pytest.mark.asyncio
async def test_get_graph_stats(
    db_session: AsyncSession,
    graph_case: Case,
) -> None:
    """Get graph stats returns node and edge counts."""
    mock_neo4j = AsyncMock()

    # Mock node query
    async def mock_node_iter(self: object) -> AsyncIterator[dict[str, Any]]:
        yield {"label": "Person", "count": 5}
        yield {"label": "Org", "count": 3}

    # Mock rel query
    async def mock_rel_iter(self: object) -> AsyncIterator[dict[str, Any]]:
        yield {"type": "SENT", "count": 10}

    call_count = 0

    async def mock_run(query: str, **kwargs: object) -> AsyncMock:
        nonlocal call_count
        result = AsyncMock()
        if call_count == 0:
            result.__aiter__ = mock_node_iter
        else:
            result.__aiter__ = mock_rel_iter
        call_count += 1
        return result

    mock_neo4j.run = mock_run

    service = GraphService(mock_neo4j, db_session)
    stats = await service.get_graph_stats(graph_case.case_id)

    assert stats.total_nodes == 8
    assert stats.total_edges == 10
    assert stats.node_types["Person"] == 5
    assert stats.node_types["Org"] == 3
    assert stats.relationship_types["SENT"] == 10
