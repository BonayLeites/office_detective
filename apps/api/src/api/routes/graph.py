"""Graph API endpoints for Neo4j knowledge graph operations."""

from uuid import UUID

from fastapi import APIRouter, Query, status

from src.dependencies import DbSession, Neo4jSession
from src.schemas.graph import (
    GraphStatsResponse,
    HubsListResponse,
    NeighborsResponse,
    PathRequest,
    PathResponse,
    SyncResponse,
)
from src.services.graph_service import GraphService

router = APIRouter()


@router.post(
    "/graph/sync",
    response_model=SyncResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def sync_case_to_graph(
    case_id: UUID,
    db: DbSession,
    neo4j: Neo4jSession,
) -> SyncResponse:
    """Sync case entities and documents to Neo4j knowledge graph.

    This creates nodes for all entities and documents, and SENT relationships
    between authors and their documents.

    Args:
        case_id: Case ID to sync
        db: PostgreSQL session
        neo4j: Neo4j session

    Returns:
        SyncResponse with counts of created nodes and relationships
    """
    service = GraphService(neo4j, db)
    result = await service.sync_case(case_id)

    return SyncResponse(
        case_id=result.case_id,
        nodes_created=result.nodes_created,
        relationships_created=result.relationships_created,
    )


@router.post("/graph/path", response_model=PathResponse)
async def query_shortest_path(
    case_id: UUID,
    request: PathRequest,
    db: DbSession,
    neo4j: Neo4jSession,
) -> PathResponse:
    """Find shortest path between two entities.

    Args:
        case_id: Case ID
        request: PathRequest with from_entity_id and to_entity_id
        db: PostgreSQL session
        neo4j: Neo4j session

    Returns:
        PathResponse with nodes, edges, and path length
    """
    service = GraphService(neo4j, db)
    return await service.query_path(
        case_id=case_id,
        from_id=request.from_entity_id,
        to_id=request.to_entity_id,
        max_depth=request.max_depth,
    )


@router.get("/graph/neighbors/{entity_id}", response_model=NeighborsResponse)
async def get_entity_neighbors(
    case_id: UUID,
    entity_id: UUID,
    db: DbSession,
    neo4j: Neo4jSession,
    depth: int = Query(default=1, ge=1, le=3),
) -> NeighborsResponse:
    """Get neighbors of an entity in the knowledge graph.

    Args:
        case_id: Case ID
        entity_id: Entity ID to find neighbors for
        db: PostgreSQL session
        neo4j: Neo4j session
        depth: How many hops to traverse (1-3)

    Returns:
        NeighborsResponse with neighbor nodes and connecting edges
    """
    service = GraphService(neo4j, db)
    nodes, edges = await service.query_neighbors(
        case_id=case_id,
        entity_id=entity_id,
        depth=depth,
    )

    return NeighborsResponse(
        entity_id=entity_id,
        neighbors=nodes,
        edges=edges,
        total=len(nodes),
    )


@router.get("/graph/hubs", response_model=HubsListResponse)
async def get_communication_hubs(
    case_id: UUID,
    db: DbSession,
    neo4j: Neo4jSession,
    limit: int = Query(default=10, ge=1, le=50),
) -> HubsListResponse:
    """Get high-connectivity entities (communication hubs).

    These are entities with the most connections, useful for identifying
    key players in the investigation.

    Args:
        case_id: Case ID
        db: PostgreSQL session
        neo4j: Neo4j session
        limit: Maximum number of hubs to return

    Returns:
        HubsListResponse with entities ordered by connection count
    """
    service = GraphService(neo4j, db)
    hubs = await service.query_hubs(case_id=case_id, limit=limit)

    return HubsListResponse(hubs=hubs, total=len(hubs))


@router.get("/graph/stats", response_model=GraphStatsResponse)
async def get_graph_stats(
    case_id: UUID,
    db: DbSession,
    neo4j: Neo4jSession,
) -> GraphStatsResponse:
    """Get statistics about the knowledge graph for a case.

    Args:
        case_id: Case ID
        db: PostgreSQL session
        neo4j: Neo4j session

    Returns:
        GraphStatsResponse with node and edge counts by type
    """
    service = GraphService(neo4j, db)
    return await service.get_graph_stats(case_id)
