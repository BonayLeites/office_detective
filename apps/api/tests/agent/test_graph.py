"""Tests for ARIA agent graph."""

import uuid
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field

from src.agent.graph import create_aria_graph, get_system_message
from src.agent.prompts import ARIA_SYSTEM_PROMPT


class SearchInput(BaseModel):
    """Input for search tool."""

    query: str = Field(description="Search query")


def create_test_tools() -> list[StructuredTool]:
    """Create real test tools for graph tests."""

    async def search_docs(query: str) -> list[dict[str, Any]]:
        """Search documents."""
        return [{"doc_id": str(uuid.uuid4()), "text": f"Result for: {query}"}]

    async def get_document(doc_id: str) -> dict[str, Any]:
        """Get document."""
        return {"doc_id": doc_id, "body": "Document content"}

    tool1 = StructuredTool.from_function(
        func=search_docs,
        coroutine=search_docs,
        name="search_docs",
        description="Search documents",
        args_schema=SearchInput,
    )

    tool2 = StructuredTool.from_function(
        func=get_document,
        coroutine=get_document,
        name="get_document",
        description="Get document by ID",
    )

    return [tool1, tool2]


def test_get_system_message_returns_prompt() -> None:
    """get_system_message returns the ARIA system prompt."""
    message = get_system_message()
    assert message == ARIA_SYSTEM_PROMPT
    assert "ARIA" in message
    assert "citation" in message.lower()


def test_create_aria_graph_creates_graph() -> None:
    """create_aria_graph creates a compiled graph."""
    tools = create_test_tools()

    with patch("src.agent.graph.ChatOpenAI") as mock_llm_class:
        mock_instance = MagicMock()
        mock_with_tools = MagicMock()
        mock_instance.bind_tools = MagicMock(return_value=mock_with_tools)
        mock_llm_class.return_value = mock_instance

        graph = create_aria_graph(tools)

        # Verify graph was created
        assert graph is not None
        # Verify LLM was initialized with correct parameters
        mock_llm_class.assert_called_once()


def test_create_aria_graph_with_custom_model() -> None:
    """create_aria_graph accepts custom model name."""
    tools = create_test_tools()

    with patch("src.agent.graph.ChatOpenAI") as mock_llm_class:
        mock_instance = MagicMock()
        mock_with_tools = MagicMock()
        mock_instance.bind_tools = MagicMock(return_value=mock_with_tools)
        mock_llm_class.return_value = mock_instance

        create_aria_graph(tools, model_name="gpt-4")

        mock_llm_class.assert_called_once()
        call_kwargs = mock_llm_class.call_args.kwargs
        assert call_kwargs["model_name"] == "gpt-4"


def test_create_aria_graph_with_custom_temperature() -> None:
    """create_aria_graph accepts custom temperature."""
    tools = create_test_tools()

    with patch("src.agent.graph.ChatOpenAI") as mock_llm_class:
        mock_instance = MagicMock()
        mock_with_tools = MagicMock()
        mock_instance.bind_tools = MagicMock(return_value=mock_with_tools)
        mock_llm_class.return_value = mock_instance

        create_aria_graph(tools, temperature=0.7)

        mock_llm_class.assert_called_once()
        call_kwargs = mock_llm_class.call_args.kwargs
        assert call_kwargs["temperature"] == 0.7


@pytest.mark.asyncio
async def test_graph_invocation_with_no_tool_calls() -> None:
    """Graph ends when LLM returns no tool calls."""
    tools = create_test_tools()

    with patch("src.agent.graph.ChatOpenAI") as mock_llm_class:
        mock_instance = MagicMock()
        mock_with_tools = MagicMock()
        # Return response without tool calls
        mock_with_tools.ainvoke = AsyncMock(
            return_value=AIMessage(content="Final answer", tool_calls=[])
        )
        mock_instance.bind_tools = MagicMock(return_value=mock_with_tools)
        mock_llm_class.return_value = mock_instance

        graph = create_aria_graph(tools)

        initial_state: dict[str, Any] = {
            "case_id": uuid.uuid4(),
            "messages": [
                SystemMessage(content="System prompt"),
                HumanMessage(content="User question"),
            ],
            "retrieved_chunks": [],
            "citations": [],
            "hint_budget": 3,
        }

        result = await graph.ainvoke(initial_state)

        # Should have added the AI response to messages
        assert len(result["messages"]) == 3
        assert isinstance(result["messages"][-1], AIMessage)
        assert result["messages"][-1].content == "Final answer"


@pytest.mark.asyncio
async def test_graph_invocation_with_tool_calls() -> None:
    """Graph processes tool calls and continues."""
    tools = create_test_tools()

    with patch("src.agent.graph.ChatOpenAI") as mock_llm_class:
        mock_instance = MagicMock()
        mock_with_tools = MagicMock()

        # First call returns tool call, second call returns final answer
        call_count = 0

        async def mock_ainvoke(messages: list[Any]) -> AIMessage:
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                # First call - return with tool call
                return AIMessage(
                    content="",
                    tool_calls=[
                        {
                            "name": "search_docs",
                            "args": {"query": "test"},
                            "id": "call_123",
                        }
                    ],
                )
            # Second call - return final answer
            return AIMessage(content="Based on search results...", tool_calls=[])

        mock_with_tools.ainvoke = mock_ainvoke
        mock_instance.bind_tools = MagicMock(return_value=mock_with_tools)
        mock_llm_class.return_value = mock_instance

        graph = create_aria_graph(tools)

        initial_state: dict[str, Any] = {
            "case_id": uuid.uuid4(),
            "messages": [
                SystemMessage(content="System prompt"),
                HumanMessage(content="Search for fraud"),
            ],
            "retrieved_chunks": [],
            "citations": [],
            "hint_budget": 3,
        }

        result = await graph.ainvoke(initial_state)

        # Should have completed with AI response
        assert call_count >= 1
        # Last message should be from AI
        last_msg = result["messages"][-1]
        assert isinstance(last_msg, AIMessage)
