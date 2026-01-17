"""ARIA agent state definition."""

from typing import Annotated, Any, TypedDict
from uuid import UUID

from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


class ARIAState(TypedDict):
    """State for ARIA agent graph.

    Attributes:
        case_id: The case being investigated.
        language: Language for responses (ISO 639-1 code).
        messages: Conversation history with add_messages reducer.
        retrieved_chunks: Chunks retrieved from search tools.
        citations: Citations extracted from tool results.
        hint_budget: Remaining hints for this session.
    """

    case_id: UUID
    language: str
    messages: Annotated[list[BaseMessage], add_messages]
    retrieved_chunks: list[dict[str, Any]]
    citations: list[dict[str, Any]]
    hint_budget: int
