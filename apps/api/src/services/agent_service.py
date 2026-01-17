"""Agent service for orchestrating ARIA agent."""

from typing import TYPE_CHECKING, Any, cast
from uuid import UUID, uuid4

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from neo4j import AsyncSession as Neo4jAsyncSession
from sqlalchemy.ext.asyncio import AsyncSession

from src.agent.graph import create_aria_graph, get_system_message
from src.agent.tools import (
    create_get_document_tool,
    create_get_entity_tool,
    create_graph_query_tool,
    create_search_docs_tool,
)
from src.schemas.chat import ChatRequest, ChatResponse, Citation
from src.services.document_service import DocumentService
from src.services.embedding_service import EmbeddingService
from src.services.entity_service import EntityService
from src.services.graph_service import GraphService
from src.services.search_service import SearchService

if TYPE_CHECKING:
    from src.agent.state import ARIAState


class AgentService:
    """Service for orchestrating ARIA agent conversations."""

    def __init__(
        self,
        db: AsyncSession,
        neo4j: Neo4jAsyncSession | None = None,
        embedding_service: EmbeddingService | None = None,
    ) -> None:
        """Initialize agent service.

        Args:
            db: PostgreSQL database session
            neo4j: Optional Neo4j session for graph queries
            embedding_service: Optional embedding service (creates default if None)
        """
        self.db = db
        self.neo4j = neo4j
        self.embedding_service = embedding_service or EmbeddingService()

        # Initialize services
        self.search_service = SearchService(db, self.embedding_service)
        self.document_service = DocumentService(db)
        self.entity_service = EntityService(db)
        self.graph_service = GraphService(neo4j, db) if neo4j else None

    async def chat(
        self,
        case_id: UUID,
        request: ChatRequest,
        hint_budget: int = 3,
    ) -> ChatResponse:
        """Process a chat message and return ARIA's response.

        Args:
            case_id: Case ID being investigated
            request: Chat request with user message
            hint_budget: Remaining hints for this session

        Returns:
            ChatResponse with agent message and citations
        """
        # Create tools bound to this case
        tools = [
            create_search_docs_tool(self.search_service, case_id),
            create_get_document_tool(self.document_service, case_id),
            create_get_entity_tool(self.entity_service, case_id),
        ]

        # Add graph tool if Neo4j is available
        if self.graph_service:
            tools.append(create_graph_query_tool(self.graph_service, case_id))

        # Create agent graph
        agent = create_aria_graph(tools)

        # Build initial state
        initial_state: ARIAState = cast(
            "ARIAState",
            {
                "case_id": case_id,
                "messages": [
                    SystemMessage(content=get_system_message()),
                    HumanMessage(content=request.message),
                ],
                "retrieved_chunks": [],
                "citations": [],
                "hint_budget": hint_budget,
            },
        )

        # Run agent
        result = await agent.ainvoke(initial_state)

        # Extract response and citations
        last_message = self._get_last_ai_message(result["messages"])
        citations = self._extract_citations(result["messages"])

        # Get content as string
        content = "I could not process your request."
        if last_message:
            msg_content = last_message.content
            content = msg_content if isinstance(msg_content, str) else str(msg_content)

        return ChatResponse(
            message=content,
            citations=citations,
            conversation_id=request.conversation_id or uuid4(),
            suggested_actions=self._suggest_next_actions(result["messages"]),
        )

    def _get_last_ai_message(self, messages: list[Any]) -> AIMessage | None:
        """Get the last AI message from the conversation.

        Args:
            messages: List of conversation messages

        Returns:
            Last AIMessage or None
        """
        for msg in reversed(messages):
            if isinstance(msg, AIMessage):
                return msg
        return None

    def _extract_citations(self, messages: list[Any]) -> list[Citation]:
        """Extract citations from tool call results.

        Args:
            messages: List of conversation messages

        Returns:
            List of Citation objects
        """
        citations: list[Citation] = []
        seen_doc_ids: set[str] = set()

        for msg in messages:
            if isinstance(msg, ToolMessage):
                # Parse tool result for document references
                content = msg.content
                if isinstance(content, str):
                    try:
                        import json

                        data = json.loads(content)
                        if isinstance(data, list):
                            for item in data:
                                self._add_citation_from_result(item, citations, seen_doc_ids)
                        elif isinstance(data, dict):
                            self._add_citation_from_result(data, citations, seen_doc_ids)
                    except (json.JSONDecodeError, TypeError):
                        pass

        return citations

    def _add_citation_from_result(
        self,
        item: dict[str, Any],
        citations: list[Citation],
        seen_doc_ids: set[str],
    ) -> None:
        """Add a citation from a tool result if valid.

        Args:
            item: Tool result item
            citations: List to append citation to
            seen_doc_ids: Set of already cited doc IDs
        """
        doc_id = item.get("doc_id")
        if doc_id and doc_id not in seen_doc_ids:
            seen_doc_ids.add(doc_id)
            doc_type = item.get("doc_type", "search")
            score = item.get("score", "N/A")
            citations.append(
                Citation(
                    doc_id=UUID(doc_id),
                    chunk_id=UUID(item["chunk_id"]) if item.get("chunk_id") else None,
                    quote=item.get("text", item.get("subject", ""))[:200],
                    relevance=f"Found via {doc_type} with score {score}",
                )
            )

    def _suggest_next_actions(self, messages: list[Any]) -> list[str]:
        """Suggest next investigative actions based on context.

        Args:
            messages: List of conversation messages

        Returns:
            List of suggested action strings
        """
        suggestions = []

        # Check what tools have been used
        tools_used = set()
        for msg in messages:
            if isinstance(msg, ToolMessage):
                tools_used.add(msg.name)

        # Suggest based on what hasn't been tried
        if "search_docs" not in tools_used:
            suggestions.append("Try searching for specific keywords or topics")

        if "graph_query" not in tools_used and self.graph_service:
            suggestions.append("Explore entity relationships in the knowledge graph")

        if "get_entity" not in tools_used:
            suggestions.append("Look up details about specific people or organizations")

        # Always suggest some general actions
        if len(suggestions) < 2:
            suggestions.extend(
                [
                    "Search for financial or transaction-related documents",
                    "Look for communication patterns between key people",
                ]
            )

        return suggestions[:3]  # Limit to 3 suggestions
