"""ARIA agent LangGraph definition."""

import json
from collections.abc import Sequence
from typing import Any, Literal, cast

from langchain_core.messages import AIMessage, BaseMessage
from langchain_core.tools import BaseTool
from langchain_openai import ChatOpenAI
from langgraph.graph import END, StateGraph
from langgraph.graph.state import CompiledStateGraph
from langgraph.prebuilt import ToolNode

from src.agent.prompts import get_system_message
from src.agent.state import ARIAState
from src.config import settings


def _normalize_messages_for_provider(messages: list[BaseMessage]) -> list[BaseMessage]:
    """Normalize message payloads for providers that require string content."""
    normalized: list[BaseMessage] = []
    for message in messages:
        if isinstance(message.content, str):
            normalized.append(message)
            continue

        try:
            content = json.dumps(message.content, ensure_ascii=False)
        except TypeError:
            content = str(message.content)

        normalized.append(message.model_copy(update={"content": content}))
    return normalized


def _create_chat_llm(provider: str, model_name: str | None, temperature: float) -> ChatOpenAI:
    """Create configured chat LLM client for a specific provider."""
    llm_model = model_name or settings.provider_model_name(provider)
    kwargs: dict[str, Any] = {
        "model_name": llm_model,
        "temperature": temperature,
        # Keep chat-completions mode for provider compatibility.
        "use_responses_api": False,
        "request_timeout": settings.llm_request_timeout_seconds,
        "max_retries": max(settings.llm_max_retries, 0),
    }

    api_key = settings.provider_api_key(provider)
    api_base = settings.provider_api_base(provider)
    if api_key:
        kwargs["openai_api_key"] = api_key
    if api_base:
        kwargs["openai_api_base"] = api_base

    return ChatOpenAI(**kwargs)


def create_aria_graph(
    tools: Sequence[BaseTool],
    model_name: str | None = None,
    temperature: float = 0.3,
    provider: str | None = None,
) -> CompiledStateGraph[Any]:
    """Create the ARIA agent graph.

    Args:
        tools: Sequence of tools available to the agent
        model_name: Model override (defaults to configured provider model)
        temperature: LLM temperature (default: 0.3)
        provider: Provider override ("openai" | "deepseek")

    Returns:
        Compiled StateGraph
    """
    # Initialize LLM with tools
    selected_provider = settings.normalized_provider(provider)
    llm = _create_chat_llm(selected_provider, model_name, temperature)
    llm_with_tools = llm.bind_tools(list(tools))

    async def call_model(state: ARIAState) -> dict[str, list[BaseMessage]]:
        """Call the LLM with current state messages."""
        messages = state["messages"]
        if selected_provider == "deepseek":
            messages = _normalize_messages_for_provider(messages)
        response = await llm_with_tools.ainvoke(messages)
        return {"messages": [response]}

    def should_continue(state: ARIAState) -> Literal["tools", "__end__"]:
        """Determine if agent should continue with tools or end."""
        messages = state["messages"]
        last_message = messages[-1]

        # Check if the LLM wants to call tools
        if isinstance(last_message, AIMessage) and last_message.tool_calls:
            return "tools"
        return "__end__"

    # Build graph
    graph: StateGraph[ARIAState] = StateGraph(ARIAState)

    # Add nodes
    graph.add_node("agent", call_model)
    graph.add_node("tools", ToolNode(list(tools)))

    # Set entry point
    graph.set_entry_point("agent")

    # Add edges
    graph.add_conditional_edges("agent", should_continue, {"tools": "tools", "__end__": END})
    graph.add_edge("tools", "agent")

    return cast("CompiledStateGraph[Any]", graph.compile())


# Re-export get_system_message from prompts for backward compatibility
__all__ = ["create_aria_graph", "get_system_message"]
