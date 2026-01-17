"""ARIA agent LangGraph definition."""

from collections.abc import Sequence
from typing import Any, Literal, cast

from langchain_core.messages import AIMessage, BaseMessage
from langchain_core.tools import BaseTool
from langchain_openai import ChatOpenAI
from langgraph.graph import END, StateGraph
from langgraph.graph.state import CompiledStateGraph
from langgraph.prebuilt import ToolNode

from src.agent.prompts import ARIA_SYSTEM_PROMPT
from src.agent.state import ARIAState
from src.config import settings


def create_aria_graph(
    tools: Sequence[BaseTool],
    model_name: str | None = None,
    temperature: float = 0.3,
) -> CompiledStateGraph[Any]:
    """Create the ARIA agent graph.

    Args:
        tools: Sequence of tools available to the agent
        model_name: OpenAI model to use (default: from settings or gpt-4o-mini)
        temperature: LLM temperature (default: 0.3)

    Returns:
        Compiled StateGraph
    """
    # Initialize LLM with tools
    default_model = "gpt-4o-mini"
    llm_model: str = model_name or str(getattr(settings, "openai_model", default_model))
    llm = ChatOpenAI(model_name=llm_model, temperature=temperature)
    llm_with_tools = llm.bind_tools(list(tools))

    async def call_model(state: ARIAState) -> dict[str, list[BaseMessage]]:
        """Call the LLM with current state messages."""
        messages = state["messages"]
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
    graph.add_conditional_edges(
        "agent", should_continue, {"tools": "tools", "__end__": END}
    )
    graph.add_edge("tools", "agent")

    return cast("CompiledStateGraph[Any]", graph.compile())


def get_system_message() -> str:
    """Get the ARIA system prompt."""
    return ARIA_SYSTEM_PROMPT
