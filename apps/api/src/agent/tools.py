"""ARIA agent tools wrapping existing services."""

from typing import Any
from uuid import UUID

from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field

from src.services.document_service import DocumentService
from src.services.entity_service import EntityService
from src.services.graph_service import GraphService
from src.services.search_service import SearchService


class SearchDocsInput(BaseModel):
    """Input schema for search_docs tool."""

    query: str = Field(description="Natural language search query")
    k: int = Field(default=6, ge=1, le=20, description="Number of results to return")


class GetDocumentInput(BaseModel):
    """Input schema for get_document tool."""

    doc_id: str = Field(description="UUID of the document to retrieve")


class GetEntityInput(BaseModel):
    """Input schema for get_entity tool."""

    entity_id: str = Field(description="UUID of the entity to retrieve")


class GraphQueryInput(BaseModel):
    """Input schema for graph_query tool."""

    query_type: str = Field(description="Type of graph query: 'neighbors', 'path', or 'hubs'")
    entity_id: str | None = Field(
        default=None, description="Source entity ID for neighbors/path queries"
    )
    target_id: str | None = Field(default=None, description="Target entity ID for path queries")


def create_search_docs_tool(
    search_service: SearchService,
    case_id: UUID,
    language: str = "en",
) -> StructuredTool:
    """Create search_docs tool bound to a specific case and language.

    Args:
        search_service: SearchService instance
        case_id: Case ID to search within
        language: Language to filter results (default "en")

    Returns:
        StructuredTool for semantic search
    """

    async def search_docs(query: str, k: int = 6) -> list[dict[str, Any]]:
        """Search documents using semantic similarity.

        Args:
            query: Natural language search query
            k: Number of results (default 6, max 20)

        Returns:
            List of chunks with doc_id, chunk_id, text, score
        """
        results = await search_service.search(case_id, query, k=k, language=language)
        return [
            {
                "doc_id": str(r.doc_id),
                "chunk_id": str(r.chunk_id),
                "text": r.text[:500],  # Truncate for LLM context
                "score": round(r.score, 3),
                "doc_type": r.doc_type.value,
                "subject": r.subject,
            }
            for r in results
        ]

    return StructuredTool.from_function(
        func=search_docs,
        coroutine=search_docs,
        name="search_docs",
        description=(
            "Search documents using semantic similarity. "
            "Returns relevant text chunks with their doc_ids and scores."
        ),
        args_schema=SearchDocsInput,
    )


def create_get_document_tool(
    document_service: DocumentService,
    case_id: UUID,
) -> StructuredTool:
    """Create get_document tool bound to a specific case.

    Args:
        document_service: DocumentService instance
        case_id: Case ID for validation

    Returns:
        StructuredTool for document retrieval
    """

    async def get_document(doc_id: str) -> dict[str, Any]:
        """Get full document content by ID.

        Args:
            doc_id: UUID of the document

        Returns:
            Document with subject, body, type, timestamp, author
        """
        try:
            uuid_id = UUID(doc_id)
        except ValueError:
            return {"error": f"Invalid document ID: {doc_id}"}

        doc = await document_service.get_by_id(uuid_id)
        if not doc:
            return {"error": f"Document not found: {doc_id}"}

        # Verify case ownership
        if doc.case_id != case_id:
            return {"error": "Document does not belong to this case"}

        return {
            "doc_id": str(doc.doc_id),
            "doc_type": doc.doc_type.value,
            "subject": doc.subject,
            "body": doc.body,
            "timestamp": doc.ts.isoformat() if doc.ts else None,
            "author_id": str(doc.author_entity_id) if doc.author_entity_id else None,
        }

    return StructuredTool.from_function(
        func=get_document,
        coroutine=get_document,
        name="get_document",
        description=(
            "Retrieve full document content by ID. "
            "Use this to read the complete text of a document found via search."
        ),
        args_schema=GetDocumentInput,
    )


def create_get_entity_tool(
    entity_service: EntityService,
    case_id: UUID,
) -> StructuredTool:
    """Create get_entity tool bound to a specific case.

    Args:
        entity_service: EntityService instance
        case_id: Case ID for validation

    Returns:
        StructuredTool for entity retrieval
    """

    async def get_entity(entity_id: str) -> dict[str, Any]:
        """Get entity details by ID.

        Args:
            entity_id: UUID of the entity

        Returns:
            Entity with name, type, attributes
        """
        try:
            uuid_id = UUID(entity_id)
        except ValueError:
            return {"error": f"Invalid entity ID: {entity_id}"}

        entity = await entity_service.get_by_id(uuid_id)
        if not entity:
            return {"error": f"Entity not found: {entity_id}"}

        # Verify case ownership
        if entity.case_id != case_id:
            return {"error": "Entity does not belong to this case"}

        return {
            "entity_id": str(entity.entity_id),
            "name": entity.name,
            "entity_type": entity.entity_type.value,
            "attributes": entity.attrs_json or {},
        }

    return StructuredTool.from_function(
        func=get_entity,
        coroutine=get_entity,
        name="get_entity",
        description=(
            "Get details about a person or organization by ID. Returns name, type, and attributes."
        ),
        args_schema=GetEntityInput,
    )


def create_graph_query_tool(
    graph_service: GraphService,
    case_id: UUID,
) -> StructuredTool:
    """Create graph_query tool bound to a specific case.

    Args:
        graph_service: GraphService instance
        case_id: Case ID

    Returns:
        StructuredTool for graph queries
    """

    async def graph_query(
        query_type: str,
        entity_id: str | None = None,
        target_id: str | None = None,
    ) -> dict[str, Any]:
        """Query the knowledge graph.

        Args:
            query_type: One of 'neighbors', 'path', 'hubs'
            entity_id: Source entity for neighbors/path
            target_id: Target entity for path query

        Returns:
            Graph data (nodes, edges, or hub list)
        """
        if query_type == "hubs":
            hubs = await graph_service.query_hubs(case_id, limit=10)
            return {
                "query_type": "hubs",
                "hubs": [
                    {
                        "entity_id": str(h.entity_id),
                        "name": h.name,
                        "entity_type": h.entity_type,
                        "degree": h.degree,
                    }
                    for h in hubs
                ],
            }

        if not entity_id:
            return {"error": "entity_id is required for neighbors and path queries"}

        try:
            entity_uuid = UUID(entity_id)
        except ValueError:
            return {"error": f"Invalid entity ID: {entity_id}"}

        if query_type == "neighbors":
            nodes, edges = await graph_service.query_neighbors(case_id, entity_uuid)
            return {
                "query_type": "neighbors",
                "nodes": [
                    {
                        "entity_id": str(n.entity_id),
                        "name": n.name,
                        "entity_type": n.entity_type,
                    }
                    for n in nodes
                ],
                "edges": [
                    {
                        "source": str(e.source_id),
                        "target": str(e.target_id),
                        "type": e.relationship_type,
                    }
                    for e in edges
                ],
            }

        if query_type == "path":
            if not target_id:
                return {"error": "target_id is required for path queries"}

            try:
                target_uuid = UUID(target_id)
            except ValueError:
                return {"error": f"Invalid target ID: {target_id}"}

            path = await graph_service.query_path(case_id, entity_uuid, target_uuid)
            return {
                "query_type": "path",
                "found": path.found,
                "length": path.length,
                "nodes": [
                    {
                        "entity_id": str(n.entity_id),
                        "name": n.name,
                        "entity_type": n.entity_type,
                    }
                    for n in path.nodes
                ],
                "edges": [
                    {
                        "source": str(e.source_id),
                        "target": str(e.target_id),
                        "type": e.relationship_type,
                    }
                    for e in path.edges
                ],
            }

        return {"error": f"Unknown query_type: {query_type}. Use 'neighbors', 'path', or 'hubs'."}

    return StructuredTool.from_function(
        func=graph_query,
        coroutine=graph_query,
        name="graph_query",
        description="Query the knowledge graph to explore relationships. "
        "Use 'hubs' to find important entities, 'neighbors' to see connections, "
        "or 'path' to find how two entities are connected.",
        args_schema=GraphQueryInput,
    )
