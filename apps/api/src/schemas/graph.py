"""Graph-related Pydantic schemas for Neo4j integration."""

from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class GraphNode(BaseModel):
    """A node in the knowledge graph."""

    entity_id: UUID
    name: str
    entity_type: str
    properties: dict[str, Any] = Field(default_factory=dict)

    model_config = {"from_attributes": True}


class GraphEdge(BaseModel):
    """An edge/relationship in the knowledge graph."""

    source_id: UUID
    target_id: UUID
    relationship_type: str
    properties: dict[str, Any] = Field(default_factory=dict)


class PathRequest(BaseModel):
    """Request for shortest path query."""

    from_entity_id: UUID
    to_entity_id: UUID
    max_depth: int = Field(default=6, ge=1, le=10)


class PathResponse(BaseModel):
    """Response containing a path between entities."""

    nodes: list[GraphNode]
    edges: list[GraphEdge]
    length: int
    found: bool = True


class NeighborsResponse(BaseModel):
    """Response containing neighbors of an entity."""

    entity_id: UUID
    neighbors: list[GraphNode]
    edges: list[GraphEdge]
    total: int


class HubResponse(BaseModel):
    """A high-connectivity entity (communication hub)."""

    entity_id: UUID
    name: str
    entity_type: str
    degree: int


class HubsListResponse(BaseModel):
    """Response containing list of hubs."""

    hubs: list[HubResponse]
    total: int


class SyncResponse(BaseModel):
    """Response from syncing case to Neo4j."""

    case_id: UUID
    nodes_created: int
    relationships_created: int
    status: str = "completed"


class GraphStatsResponse(BaseModel):
    """Graph statistics for a case."""

    case_id: UUID
    total_nodes: int
    total_edges: int
    node_types: dict[str, int]
    relationship_types: dict[str, int]
