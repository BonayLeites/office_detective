"""Graph service for Neo4j knowledge graph operations."""

from dataclasses import dataclass
from uuid import UUID

from neo4j import AsyncSession as Neo4jAsyncSession
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import Document, Entity
from src.schemas.graph import (
    GraphEdge,
    GraphNode,
    GraphStatsResponse,
    HubResponse,
    PathResponse,
)


@dataclass
class SyncResult:
    """Result of syncing case to Neo4j."""

    case_id: UUID
    nodes_created: int
    relationships_created: int


class GraphService:
    """Service for Neo4j knowledge graph operations."""

    def __init__(self, neo4j: Neo4jAsyncSession, db: AsyncSession) -> None:
        """Initialize graph service.

        Args:
            neo4j: Neo4j async session
            db: PostgreSQL async session
        """
        self.neo4j = neo4j
        self.db = db

    async def sync_case(self, case_id: UUID) -> SyncResult:
        """Sync all entities and documents from a case to Neo4j.

        Args:
            case_id: Case ID to sync

        Returns:
            SyncResult with counts
        """
        # Clear existing case data
        await self._clear_case_graph(case_id)

        # Sync entities
        nodes_created = await self._sync_entities(case_id)

        # Sync documents and relationships
        relationships_created = await self._sync_documents(case_id)

        return SyncResult(
            case_id=case_id,
            nodes_created=nodes_created,
            relationships_created=relationships_created,
        )

    async def _clear_case_graph(self, case_id: UUID) -> None:
        """Clear all nodes and relationships for a case."""
        query = """
        MATCH (n {case_id: $case_id})
        DETACH DELETE n
        """
        await self.neo4j.run(query, case_id=str(case_id))

    async def _sync_entities(self, case_id: UUID) -> int:
        """Sync entities from PostgreSQL to Neo4j.

        Returns:
            Number of nodes created
        """
        result = await self.db.execute(select(Entity).where(Entity.case_id == case_id))
        entities = list(result.scalars().all())

        nodes_created = 0
        for entity in entities:
            # Create node with appropriate label based on entity type
            label = entity.entity_type.value.capitalize()
            query = f"""
            MERGE (e:{label} {{entity_id: $entity_id, case_id: $case_id}})
            SET e.name = $name, e.entity_type = $entity_type
            SET e += $attrs
            RETURN e
            """
            await self.neo4j.run(
                query,
                entity_id=str(entity.entity_id),
                case_id=str(case_id),
                name=entity.name,
                entity_type=entity.entity_type.value,
                attrs=entity.attrs_json or {},
            )
            nodes_created += 1

        return nodes_created

    async def _sync_documents(self, case_id: UUID) -> int:
        """Sync documents and SENT relationships to Neo4j.

        Returns:
            Number of relationships created
        """
        result = await self.db.execute(select(Document).where(Document.case_id == case_id))
        documents = list(result.scalars().all())

        relationships_created = 0
        for doc in documents:
            # Create Document node
            query = """
            MERGE (d:Document {doc_id: $doc_id, case_id: $case_id})
            SET d.doc_type = $doc_type, d.subject = $subject, d.ts = $ts
            RETURN d
            """
            await self.neo4j.run(
                query,
                doc_id=str(doc.doc_id),
                case_id=str(case_id),
                doc_type=doc.doc_type.value,
                subject=doc.subject or "",
                ts=doc.ts.isoformat() if doc.ts else "",
            )

            # Create SENT relationship if author exists
            if doc.author_entity_id:
                rel_query = """
                MATCH (p {entity_id: $author_id, case_id: $case_id})
                MATCH (d:Document {doc_id: $doc_id, case_id: $case_id})
                MERGE (p)-[r:SENT]->(d)
                SET r.ts = $ts
                RETURN r
                """
                await self.neo4j.run(
                    rel_query,
                    author_id=str(doc.author_entity_id),
                    doc_id=str(doc.doc_id),
                    case_id=str(case_id),
                    ts=doc.ts.isoformat() if doc.ts else "",
                )
                relationships_created += 1

        return relationships_created

    async def query_path(
        self, case_id: UUID, from_id: UUID, to_id: UUID, max_depth: int = 6
    ) -> PathResponse:
        """Find shortest path between two entities.

        Args:
            case_id: Case ID
            from_id: Starting entity ID
            to_id: Target entity ID
            max_depth: Maximum path length

        Returns:
            PathResponse with nodes and edges
        """
        query = f"""
        MATCH (a {{entity_id: $from_id, case_id: $case_id}})
        MATCH (b {{entity_id: $to_id, case_id: $case_id}})
        MATCH path = shortestPath((a)-[*..{max_depth}]-(b))
        RETURN path
        """
        result = await self.neo4j.run(
            query,
            from_id=str(from_id),
            to_id=str(to_id),
            case_id=str(case_id),
        )
        record = await result.single()

        if not record:
            return PathResponse(nodes=[], edges=[], length=0, found=False)

        path = record["path"]
        nodes = []
        edges = []

        for node in path.nodes:
            nodes.append(
                GraphNode(
                    entity_id=UUID(node["entity_id"]),
                    name=node.get("name", ""),
                    entity_type=node.get("entity_type", "unknown"),
                    properties=dict(node),
                )
            )

        for rel in path.relationships:
            edges.append(
                GraphEdge(
                    source_id=UUID(rel.start_node["entity_id"]),
                    target_id=UUID(rel.end_node["entity_id"]),
                    relationship_type=rel.type,
                    properties=dict(rel),
                )
            )

        return PathResponse(nodes=nodes, edges=edges, length=len(edges), found=True)

    async def query_neighbors(
        self, case_id: UUID, entity_id: UUID, depth: int = 1
    ) -> tuple[list[GraphNode], list[GraphEdge]]:
        """Find neighbors of an entity.

        Args:
            case_id: Case ID
            entity_id: Entity ID
            depth: How many hops to traverse

        Returns:
            Tuple of (nodes, edges)
        """
        query = f"""
        MATCH (e {{entity_id: $entity_id, case_id: $case_id}})
        MATCH (e)-[r*1..{depth}]-(neighbor)
        WHERE neighbor.case_id = $case_id
        RETURN DISTINCT neighbor, r
        """
        result = await self.neo4j.run(
            query,
            entity_id=str(entity_id),
            case_id=str(case_id),
        )
        records = [record async for record in result]

        nodes = []
        edges = []
        seen_nodes: set[str] = set()

        for record in records:
            neighbor = record["neighbor"]
            neighbor_id = neighbor["entity_id"]

            if neighbor_id not in seen_nodes:
                seen_nodes.add(neighbor_id)
                nodes.append(
                    GraphNode(
                        entity_id=UUID(neighbor_id),
                        name=neighbor.get("name", ""),
                        entity_type=neighbor.get("entity_type", "unknown"),
                        properties=dict(neighbor),
                    )
                )

            # Process relationships
            rels = record["r"]
            if rels:
                for rel in rels if isinstance(rels, list) else [rels]:
                    edges.append(
                        GraphEdge(
                            source_id=UUID(rel.start_node["entity_id"]),
                            target_id=UUID(rel.end_node["entity_id"]),
                            relationship_type=rel.type,
                            properties=dict(rel),
                        )
                    )

        return nodes, edges

    async def query_hubs(self, case_id: UUID, limit: int = 10) -> list[HubResponse]:
        """Find high-connectivity entities (communication hubs).

        Args:
            case_id: Case ID
            limit: Maximum number of hubs to return

        Returns:
            List of HubResponse ordered by degree
        """
        query = """
        MATCH (e {case_id: $case_id})-[r]-()
        WHERE e.entity_type IS NOT NULL
        WITH e, count(r) as degree
        ORDER BY degree DESC
        LIMIT $limit
        RETURN e.entity_id as entity_id, e.name as name,
               e.entity_type as entity_type, degree
        """
        result = await self.neo4j.run(
            query,
            case_id=str(case_id),
            limit=limit,
        )
        records = [record async for record in result]

        return [
            HubResponse(
                entity_id=UUID(record["entity_id"]),
                name=record["name"] or "",
                entity_type=record["entity_type"] or "unknown",
                degree=record["degree"],
            )
            for record in records
        ]

    async def get_graph_stats(self, case_id: UUID) -> GraphStatsResponse:
        """Get statistics about the graph for a case.

        Args:
            case_id: Case ID

        Returns:
            GraphStatsResponse with stats
        """
        # Count nodes by type
        node_query = """
        MATCH (n {case_id: $case_id})
        RETURN labels(n)[0] as label, count(n) as count
        """
        node_result = await self.neo4j.run(node_query, case_id=str(case_id))
        node_records = [record async for record in node_result]

        node_types: dict[str, int] = {r["label"]: r["count"] for r in node_records if r["label"]}
        total_nodes = sum(node_types.values())

        # Count relationships by type
        rel_query = """
        MATCH (a {case_id: $case_id})-[r]->(b {case_id: $case_id})
        RETURN type(r) as type, count(r) as count
        """
        rel_result = await self.neo4j.run(rel_query, case_id=str(case_id))
        rel_records = [record async for record in rel_result]

        rel_types: dict[str, int] = {r["type"]: r["count"] for r in rel_records if r["type"]}
        total_edges = sum(rel_types.values())

        return GraphStatsResponse(
            case_id=case_id,
            total_nodes=total_nodes,
            total_edges=total_edges,
            node_types=node_types,
            relationship_types=rel_types,
        )
