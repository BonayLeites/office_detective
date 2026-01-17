"""Tests for AgentService internal methods."""

import json
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage

from src.schemas.chat import Citation  # noqa: TC001
from src.services.agent_service import AgentService


@pytest.fixture
def mock_db() -> MagicMock:
    """Create a mock database session."""
    return MagicMock()


@pytest.fixture
def mock_neo4j() -> MagicMock:
    """Create a mock Neo4j session."""
    return MagicMock()


@pytest.fixture
def mock_embedding_service() -> MagicMock:
    """Create a mock embedding service."""
    service = MagicMock()
    service.embed_query = AsyncMock(return_value=[0.1] * 1536)
    return service


@pytest.fixture
def agent_service(
    mock_db: MagicMock,
    mock_neo4j: MagicMock,
    mock_embedding_service: MagicMock,
) -> AgentService:
    """Create an AgentService instance with mocks."""
    return AgentService(
        db=mock_db,
        neo4j=mock_neo4j,
        embedding_service=mock_embedding_service,
    )


@pytest.fixture
def agent_service_no_neo4j(
    mock_db: MagicMock,
    mock_embedding_service: MagicMock,
) -> AgentService:
    """Create an AgentService without Neo4j."""
    return AgentService(
        db=mock_db,
        neo4j=None,
        embedding_service=mock_embedding_service,
    )


def test_get_last_ai_message_found(agent_service: AgentService) -> None:
    """_get_last_ai_message returns the last AI message."""
    messages = [
        SystemMessage(content="System"),
        HumanMessage(content="Human"),
        AIMessage(content="First AI"),
        HumanMessage(content="Another human"),
        AIMessage(content="Last AI"),
    ]

    result = agent_service._get_last_ai_message(messages)

    assert result is not None
    assert result.content == "Last AI"


def test_get_last_ai_message_not_found(agent_service: AgentService) -> None:
    """_get_last_ai_message returns None when no AI message."""
    messages = [
        SystemMessage(content="System"),
        HumanMessage(content="Human"),
    ]

    result = agent_service._get_last_ai_message(messages)

    assert result is None


def test_extract_citations_from_tool_messages(agent_service: AgentService) -> None:
    """_extract_citations extracts citations from tool results."""
    doc_id = uuid.uuid4()
    chunk_id = uuid.uuid4()
    tool_result = json.dumps([
        {
            "doc_id": str(doc_id),
            "chunk_id": str(chunk_id),
            "text": "This is evidence text",
            "doc_type": "email",
            "score": 0.95,
        }
    ])
    messages = [
        ToolMessage(content=tool_result, tool_call_id="call_123", name="search_docs"),
    ]

    result = agent_service._extract_citations(messages)

    assert len(result) == 1
    assert result[0].doc_id == doc_id
    assert result[0].chunk_id == chunk_id
    assert "evidence text" in result[0].quote


def test_extract_citations_dict_result(agent_service: AgentService) -> None:
    """_extract_citations handles dict tool results."""
    doc_id = uuid.uuid4()
    tool_result = json.dumps({
        "doc_id": str(doc_id),
        "subject": "Important Email",
        "doc_type": "email",
    })
    messages = [
        ToolMessage(content=tool_result, tool_call_id="call_123", name="get_document"),
    ]

    result = agent_service._extract_citations(messages)

    assert len(result) == 1
    assert result[0].doc_id == doc_id


def test_extract_citations_deduplicates(agent_service: AgentService) -> None:
    """_extract_citations deduplicates by doc_id."""
    doc_id = uuid.uuid4()
    tool_result1 = json.dumps([{"doc_id": str(doc_id), "text": "First"}])
    tool_result2 = json.dumps([{"doc_id": str(doc_id), "text": "Second"}])

    messages = [
        ToolMessage(content=tool_result1, tool_call_id="call_1", name="search_docs"),
        ToolMessage(content=tool_result2, tool_call_id="call_2", name="search_docs"),
    ]

    result = agent_service._extract_citations(messages)

    assert len(result) == 1


def test_extract_citations_invalid_json(agent_service: AgentService) -> None:
    """_extract_citations handles invalid JSON gracefully."""
    messages = [
        ToolMessage(content="not valid json", tool_call_id="call_123", name="search"),
    ]

    result = agent_service._extract_citations(messages)

    assert len(result) == 0


def test_extract_citations_non_string_content(agent_service: AgentService) -> None:
    """_extract_citations handles non-string content."""
    messages = [
        HumanMessage(content="Human message"),
        SystemMessage(content="System message"),
    ]

    result = agent_service._extract_citations(messages)

    assert len(result) == 0


def test_suggest_next_actions_no_tools_used(agent_service: AgentService) -> None:
    """_suggest_next_actions suggests all tools when none used."""
    messages = [
        SystemMessage(content="System"),
        HumanMessage(content="Question"),
        AIMessage(content="Response without tool calls"),
    ]

    result = agent_service._suggest_next_actions(messages)

    assert len(result) <= 3
    assert any("search" in s.lower() for s in result)


def test_suggest_next_actions_search_used(agent_service: AgentService) -> None:
    """_suggest_next_actions doesn't suggest search if already used."""
    messages = [
        ToolMessage(content="[]", tool_call_id="call_1", name="search_docs"),
    ]

    result = agent_service._suggest_next_actions(messages)

    # Should not suggest search since it was used
    search_suggestions = [s for s in result if "search" in s.lower() and "keyword" in s.lower()]
    assert len(search_suggestions) == 0


def test_suggest_next_actions_graph_used(agent_service: AgentService) -> None:
    """_suggest_next_actions doesn't suggest graph if already used."""
    messages = [
        ToolMessage(content="{}", tool_call_id="call_1", name="graph_query"),
    ]

    result = agent_service._suggest_next_actions(messages)

    # Should not suggest graph since it was used
    graph_suggestions = [s for s in result if "graph" in s.lower()]
    assert len(graph_suggestions) == 0


def test_suggest_next_actions_entity_used(agent_service: AgentService) -> None:
    """_suggest_next_actions doesn't suggest entity if already used."""
    messages = [
        ToolMessage(content="{}", tool_call_id="call_1", name="get_entity"),
    ]

    result = agent_service._suggest_next_actions(messages)

    # Should not suggest entity lookup since it was used
    entity_suggestions = [s for s in result if "look up" in s.lower()]
    assert len(entity_suggestions) == 0


def test_suggest_next_actions_all_tools_used(agent_service: AgentService) -> None:
    """_suggest_next_actions provides generic suggestions when all used."""
    messages = [
        ToolMessage(content="[]", tool_call_id="call_1", name="search_docs"),
        ToolMessage(content="{}", tool_call_id="call_2", name="graph_query"),
        ToolMessage(content="{}", tool_call_id="call_3", name="get_entity"),
        ToolMessage(content="{}", tool_call_id="call_4", name="get_document"),
    ]

    result = agent_service._suggest_next_actions(messages)

    # Should provide generic suggestions
    assert len(result) >= 1


def test_suggest_next_actions_no_graph_service(
    agent_service_no_neo4j: AgentService,
) -> None:
    """_suggest_next_actions doesn't suggest graph without Neo4j."""
    messages = [
        ToolMessage(content="[]", tool_call_id="call_1", name="search_docs"),
    ]

    result = agent_service_no_neo4j._suggest_next_actions(messages)

    # Should not suggest graph operations since no Neo4j
    graph_suggestions = [s for s in result if "graph" in s.lower()]
    assert len(graph_suggestions) == 0


def test_agent_service_without_embedding_service(mock_db: MagicMock) -> None:
    """AgentService creates default embedding service if none provided."""
    with patch("src.services.agent_service.EmbeddingService") as mock_class:
        mock_instance = MagicMock()
        mock_class.return_value = mock_instance

        service = AgentService(db=mock_db)

        mock_class.assert_called_once()
        assert service.embedding_service == mock_instance


def test_add_citation_from_result_without_chunk_id(
    agent_service: AgentService,
) -> None:
    """_add_citation_from_result handles missing chunk_id."""
    doc_id = str(uuid.uuid4())
    item = {
        "doc_id": doc_id,
        "text": "Some text",
        "doc_type": "invoice",
    }
    citations: list[Citation] = []
    seen_ids: set[str] = set()

    agent_service._add_citation_from_result(item, citations, seen_ids)

    assert len(citations) == 1
    assert citations[0].chunk_id is None
    assert doc_id in seen_ids


def test_add_citation_from_result_skip_duplicate(
    agent_service: AgentService,
) -> None:
    """_add_citation_from_result skips duplicate doc_ids."""
    doc_id = str(uuid.uuid4())
    item = {"doc_id": doc_id, "text": "Text"}
    citations: list[Citation] = []
    seen_ids: set[str] = {doc_id}

    agent_service._add_citation_from_result(item, citations, seen_ids)

    assert len(citations) == 0


def test_add_citation_from_result_no_doc_id(
    agent_service: AgentService,
) -> None:
    """_add_citation_from_result skips items without doc_id."""
    item = {"text": "Some text without doc_id"}
    citations: list[Citation] = []
    seen_ids: set[str] = set()

    agent_service._add_citation_from_result(item, citations, seen_ids)

    assert len(citations) == 0
