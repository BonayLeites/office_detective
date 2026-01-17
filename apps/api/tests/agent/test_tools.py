"""Tests for ARIA agent tools."""

import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.agent.tools import (
    create_get_document_tool,
    create_get_entity_tool,
    create_graph_query_tool,
    create_search_docs_tool,
)
from src.models import DocType, Document, Entity, EntityType
from src.services.document_service import DocumentService
from src.services.entity_service import EntityService
from src.services.graph_service import GraphService
from src.services.search_service import SearchResult, SearchService


@pytest.fixture
def case_id() -> uuid.UUID:
    """Generate a test case ID."""
    return uuid.uuid4()


@pytest.fixture
def mock_search_service() -> MagicMock:
    """Create a mock search service."""
    return MagicMock(spec=SearchService)


@pytest.fixture
def mock_document_service() -> MagicMock:
    """Create a mock document service."""
    return MagicMock(spec=DocumentService)


@pytest.fixture
def mock_entity_service() -> MagicMock:
    """Create a mock entity service."""
    return MagicMock(spec=EntityService)


@pytest.fixture
def mock_graph_service() -> MagicMock:
    """Create a mock graph service."""
    return MagicMock(spec=GraphService)


@pytest.mark.asyncio
async def test_search_docs_tool_returns_results(
    case_id: uuid.UUID,
    mock_search_service: MagicMock,
) -> None:
    """search_docs tool returns formatted results."""
    # Setup mock
    mock_results = [
        SearchResult(
            chunk_id=uuid.uuid4(),
            doc_id=uuid.uuid4(),
            text="This is a test document about fraud.",
            score=0.95,
            chunk_index=0,
            meta_json={},
            doc_type=DocType.email,
            subject="Suspicious Activity",
            ts=datetime.now(UTC),
        ),
        SearchResult(
            chunk_id=uuid.uuid4(),
            doc_id=uuid.uuid4(),
            text="Invoice for consulting services.",
            score=0.85,
            chunk_index=1,
            meta_json={},
            doc_type=DocType.invoice,
            subject="INV-001",
            ts=datetime.now(UTC),
        ),
    ]
    mock_search_service.search = AsyncMock(return_value=mock_results)

    # Create tool
    tool = create_search_docs_tool(mock_search_service, case_id)

    # Execute
    result = await tool.ainvoke({"query": "fraud", "k": 6})

    # Assert
    assert len(result) == 2
    assert result[0]["score"] == 0.95
    assert "fraud" in result[0]["text"]
    mock_search_service.search.assert_called_once_with(case_id, "fraud", k=6, language="en")


@pytest.mark.asyncio
async def test_search_docs_tool_empty_results(
    case_id: uuid.UUID,
    mock_search_service: MagicMock,
) -> None:
    """search_docs tool handles empty results."""
    mock_search_service.search = AsyncMock(return_value=[])

    tool = create_search_docs_tool(mock_search_service, case_id)
    result = await tool.ainvoke({"query": "nonexistent"})

    assert result == []


@pytest.mark.asyncio
async def test_get_document_tool_returns_document(
    case_id: uuid.UUID,
    mock_document_service: MagicMock,
) -> None:
    """get_document tool returns document content."""
    doc_id = uuid.uuid4()
    author_id = uuid.uuid4()
    mock_doc = MagicMock(spec=Document)
    mock_doc.doc_id = doc_id
    mock_doc.case_id = case_id
    mock_doc.doc_type = DocType.email
    mock_doc.subject = "Test Email"
    mock_doc.body = "This is the body content."
    mock_doc.ts = datetime.now(UTC)
    mock_doc.author_entity_id = author_id

    mock_document_service.get_by_id = AsyncMock(return_value=mock_doc)

    tool = create_get_document_tool(mock_document_service, case_id)
    result = await tool.ainvoke({"doc_id": str(doc_id)})

    assert result["doc_id"] == str(doc_id)
    assert result["doc_type"] == "email"
    assert result["subject"] == "Test Email"
    assert "body content" in result["body"]


@pytest.mark.asyncio
async def test_get_document_tool_not_found(
    case_id: uuid.UUID,
    mock_document_service: MagicMock,
) -> None:
    """get_document tool handles document not found."""
    mock_document_service.get_by_id = AsyncMock(return_value=None)

    tool = create_get_document_tool(mock_document_service, case_id)
    result = await tool.ainvoke({"doc_id": str(uuid.uuid4())})

    assert "error" in result
    assert "not found" in result["error"]


@pytest.mark.asyncio
async def test_get_document_tool_wrong_case(
    case_id: uuid.UUID,
    mock_document_service: MagicMock,
) -> None:
    """get_document tool rejects documents from other cases."""
    mock_doc = MagicMock(spec=Document)
    mock_doc.case_id = uuid.uuid4()  # Different case

    mock_document_service.get_by_id = AsyncMock(return_value=mock_doc)

    tool = create_get_document_tool(mock_document_service, case_id)
    result = await tool.ainvoke({"doc_id": str(uuid.uuid4())})

    assert "error" in result
    assert "does not belong" in result["error"]


@pytest.mark.asyncio
async def test_get_document_tool_invalid_uuid(
    case_id: uuid.UUID,
    mock_document_service: MagicMock,
) -> None:
    """get_document tool handles invalid UUID."""
    tool = create_get_document_tool(mock_document_service, case_id)
    result = await tool.ainvoke({"doc_id": "not-a-uuid"})

    assert "error" in result
    assert "Invalid document ID" in result["error"]


@pytest.mark.asyncio
async def test_get_entity_tool_returns_entity(
    case_id: uuid.UUID,
    mock_entity_service: MagicMock,
) -> None:
    """get_entity tool returns entity details."""
    entity_id = uuid.uuid4()
    mock_entity = MagicMock(spec=Entity)
    mock_entity.entity_id = entity_id
    mock_entity.case_id = case_id
    mock_entity.name = "John Doe"
    mock_entity.entity_type = EntityType.person
    mock_entity.attrs_json = {"email": "john@example.com", "role": "Manager"}

    mock_entity_service.get_by_id = AsyncMock(return_value=mock_entity)

    tool = create_get_entity_tool(mock_entity_service, case_id)
    result = await tool.ainvoke({"entity_id": str(entity_id)})

    assert result["name"] == "John Doe"
    assert result["entity_type"] == "person"
    assert result["attributes"]["email"] == "john@example.com"


@pytest.mark.asyncio
async def test_get_entity_tool_not_found(
    case_id: uuid.UUID,
    mock_entity_service: MagicMock,
) -> None:
    """get_entity tool handles entity not found."""
    mock_entity_service.get_by_id = AsyncMock(return_value=None)

    tool = create_get_entity_tool(mock_entity_service, case_id)
    result = await tool.ainvoke({"entity_id": str(uuid.uuid4())})

    assert "error" in result
    assert "not found" in result["error"]


@pytest.mark.asyncio
async def test_get_entity_tool_invalid_uuid(
    case_id: uuid.UUID,
    mock_entity_service: MagicMock,
) -> None:
    """get_entity tool handles invalid UUID."""
    tool = create_get_entity_tool(mock_entity_service, case_id)
    result = await tool.ainvoke({"entity_id": "not-a-valid-uuid"})

    assert "error" in result
    assert "Invalid entity ID" in result["error"]


@pytest.mark.asyncio
async def test_get_entity_tool_wrong_case(
    case_id: uuid.UUID,
    mock_entity_service: MagicMock,
) -> None:
    """get_entity tool rejects entities from other cases."""
    entity_id = uuid.uuid4()
    mock_entity = MagicMock(spec=Entity)
    mock_entity.entity_id = entity_id
    mock_entity.case_id = uuid.uuid4()  # Different case

    mock_entity_service.get_by_id = AsyncMock(return_value=mock_entity)

    tool = create_get_entity_tool(mock_entity_service, case_id)
    result = await tool.ainvoke({"entity_id": str(entity_id)})

    assert "error" in result
    assert "does not belong" in result["error"]


@pytest.mark.asyncio
async def test_graph_query_tool_hubs(
    case_id: uuid.UUID,
    mock_graph_service: MagicMock,
) -> None:
    """graph_query tool returns hubs."""
    from src.schemas.graph import HubResponse

    mock_hubs = [
        HubResponse(
            entity_id=uuid.uuid4(),
            name="Central Person",
            entity_type="person",
            degree=15,
        ),
    ]
    mock_graph_service.query_hubs = AsyncMock(return_value=mock_hubs)

    tool = create_graph_query_tool(mock_graph_service, case_id)
    result = await tool.ainvoke({"query_type": "hubs"})

    assert result["query_type"] == "hubs"
    assert len(result["hubs"]) == 1
    assert result["hubs"][0]["degree"] == 15


@pytest.mark.asyncio
async def test_graph_query_tool_neighbors(
    case_id: uuid.UUID,
    mock_graph_service: MagicMock,
) -> None:
    """graph_query tool returns neighbors."""
    from src.schemas.graph import GraphEdge, GraphNode

    entity_id = uuid.uuid4()
    neighbor_id = uuid.uuid4()

    mock_nodes = [
        GraphNode(
            entity_id=neighbor_id,
            name="Neighbor",
            entity_type="person",
            properties={},
        ),
    ]
    mock_edges = [
        GraphEdge(
            source_id=entity_id,
            target_id=neighbor_id,
            relationship_type="SENT",
            properties={},
        ),
    ]
    mock_graph_service.query_neighbors = AsyncMock(return_value=(mock_nodes, mock_edges))

    tool = create_graph_query_tool(mock_graph_service, case_id)
    result = await tool.ainvoke(
        {
            "query_type": "neighbors",
            "entity_id": str(entity_id),
        }
    )

    assert result["query_type"] == "neighbors"
    assert len(result["nodes"]) == 1
    assert result["nodes"][0]["name"] == "Neighbor"


@pytest.mark.asyncio
async def test_graph_query_tool_path(
    case_id: uuid.UUID,
    mock_graph_service: MagicMock,
) -> None:
    """graph_query tool returns path."""
    from src.schemas.graph import GraphEdge, GraphNode, PathResponse

    entity_id = uuid.uuid4()
    target_id = uuid.uuid4()

    mock_path = PathResponse(
        nodes=[
            GraphNode(entity_id=entity_id, name="Start", entity_type="person", properties={}),
            GraphNode(entity_id=target_id, name="End", entity_type="person", properties={}),
        ],
        edges=[
            GraphEdge(
                source_id=entity_id,
                target_id=target_id,
                relationship_type="KNOWS",
                properties={},
            ),
        ],
        length=1,
        found=True,
    )
    mock_graph_service.query_path = AsyncMock(return_value=mock_path)

    tool = create_graph_query_tool(mock_graph_service, case_id)
    result = await tool.ainvoke(
        {
            "query_type": "path",
            "entity_id": str(entity_id),
            "target_id": str(target_id),
        }
    )

    assert result["query_type"] == "path"
    assert result["found"] is True
    assert result["length"] == 1


@pytest.mark.asyncio
async def test_graph_query_tool_invalid_query_type(
    case_id: uuid.UUID,
    mock_graph_service: MagicMock,
) -> None:
    """graph_query tool handles invalid query type."""
    tool = create_graph_query_tool(mock_graph_service, case_id)
    result = await tool.ainvoke(
        {
            "query_type": "invalid",
            "entity_id": str(uuid.uuid4()),
        }
    )

    assert "error" in result
    assert "Unknown query_type" in result["error"]


@pytest.mark.asyncio
async def test_graph_query_tool_missing_entity_id(
    case_id: uuid.UUID,
    mock_graph_service: MagicMock,
) -> None:
    """graph_query tool requires entity_id for neighbors."""
    tool = create_graph_query_tool(mock_graph_service, case_id)
    result = await tool.ainvoke({"query_type": "neighbors"})

    assert "error" in result
    assert "entity_id is required" in result["error"]


@pytest.mark.asyncio
async def test_graph_query_tool_path_missing_target(
    case_id: uuid.UUID,
    mock_graph_service: MagicMock,
) -> None:
    """graph_query tool requires target_id for path."""
    tool = create_graph_query_tool(mock_graph_service, case_id)
    result = await tool.ainvoke(
        {
            "query_type": "path",
            "entity_id": str(uuid.uuid4()),
        }
    )

    assert "error" in result
    assert "target_id is required" in result["error"]


@pytest.mark.asyncio
async def test_graph_query_tool_invalid_entity_id(
    case_id: uuid.UUID,
    mock_graph_service: MagicMock,
) -> None:
    """graph_query tool handles invalid entity_id UUID."""
    tool = create_graph_query_tool(mock_graph_service, case_id)
    result = await tool.ainvoke(
        {
            "query_type": "neighbors",
            "entity_id": "not-a-valid-uuid",
        }
    )

    assert "error" in result
    assert "Invalid entity ID" in result["error"]


@pytest.mark.asyncio
async def test_graph_query_tool_path_invalid_target_id(
    case_id: uuid.UUID,
    mock_graph_service: MagicMock,
) -> None:
    """graph_query tool handles invalid target_id UUID for path."""
    tool = create_graph_query_tool(mock_graph_service, case_id)
    result = await tool.ainvoke(
        {
            "query_type": "path",
            "entity_id": str(uuid.uuid4()),
            "target_id": "invalid-target-uuid",
        }
    )

    assert "error" in result
    assert "Invalid target ID" in result["error"]


# --- Language Parameter Tests ---


@pytest.mark.asyncio
async def test_search_docs_tool_with_spanish(
    case_id: uuid.UUID,
    mock_search_service: MagicMock,
) -> None:
    """search_docs tool passes Spanish language to search service."""
    mock_search_service.search = AsyncMock(return_value=[])

    tool = create_search_docs_tool(mock_search_service, case_id, language="es")
    await tool.ainvoke({"query": "fraude", "k": 6})

    mock_search_service.search.assert_called_once_with(
        case_id, "fraude", k=6, language="es"
    )


@pytest.mark.asyncio
async def test_search_docs_tool_defaults_to_english(
    case_id: uuid.UUID,
    mock_search_service: MagicMock,
) -> None:
    """search_docs tool defaults to English language."""
    mock_search_service.search = AsyncMock(return_value=[])

    # Create tool without specifying language (should default to "en")
    tool = create_search_docs_tool(mock_search_service, case_id)
    await tool.ainvoke({"query": "fraud", "k": 6})

    mock_search_service.search.assert_called_once_with(
        case_id, "fraud", k=6, language="en"
    )
