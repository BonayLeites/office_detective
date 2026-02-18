"""Graph service for Neo4j knowledge graph operations."""

from dataclasses import dataclass
from itertools import combinations
from typing import Any
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
        """Sync documents and infer relationship edges from content/metadata.

        Returns:
            Number of relationships created
        """
        result = await self.db.execute(select(Document).where(Document.case_id == case_id))
        documents = list(result.scalars().all())
        entity_result = await self.db.execute(select(Entity).where(Entity.case_id == case_id))
        entities = list(entity_result.scalars().all())

        entities_by_email: dict[str, UUID] = {}
        entities_by_name: dict[str, UUID] = {}
        for entity in entities:
            entities_by_name[entity.name.strip().lower()] = entity.entity_id
            email = entity.attrs_json.get("email") if isinstance(entity.attrs_json, dict) else None
            if isinstance(email, str) and email.strip():
                entities_by_email[email.strip().lower()] = entity.entity_id

        # Infer identifier mappings like P1/O2 from metadata that includes direct email/name hints.
        code_to_entity: dict[str, UUID] = {}
        for doc in documents:
            metadata = doc.metadata_json if isinstance(doc.metadata_json, dict) else {}
            self._learn_code_mapping(metadata, code_to_entity, entities_by_email, entities_by_name)

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

            metadata = doc.metadata_json if isinstance(doc.metadata_json, dict) else {}
            metadata_entities = self._extract_entities_from_metadata(
                metadata,
                code_to_entity,
                entities_by_email,
                entities_by_name,
            )
            text_entities = self._extract_entities_from_text(doc, entities)
            participants = set(metadata_entities).union(text_entities)
            if doc.author_entity_id:
                participants.add(doc.author_entity_id)

            inferred_relationships: set[tuple[UUID, UUID, str]] = set()

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

                for participant in participants:
                    if participant != doc.author_entity_id:
                        inferred_relationships.add((doc.author_entity_id, participant, "MENTIONS"))

            sender_id = doc.author_entity_id or self._resolve_code_or_reference(
                metadata.get("from_entity"),
                code_to_entity,
                entities_by_email,
                entities_by_name,
            )
            recipient_id = self._resolve_code_or_reference(
                metadata.get("to_entity") or metadata.get("to"),
                code_to_entity,
                entities_by_email,
                entities_by_name,
            )
            if sender_id and recipient_id and sender_id != recipient_id:
                inferred_relationships.add((sender_id, recipient_id, "SENT"))

            if len(participants) <= 8:
                sorted_participants = sorted(participants, key=str)
                for source_id, target_id in combinations(sorted_participants, 2):
                    inferred_relationships.add((source_id, target_id, "CO_OCCURS"))

            for source_id, target_id, relationship_type in inferred_relationships:
                await self._merge_entity_relationship(
                    case_id=case_id,
                    source_id=source_id,
                    target_id=target_id,
                    relationship_type=relationship_type,
                    doc=doc,
                )
                relationships_created += 1

        return relationships_created

    def _normalize_code(self, value: Any) -> str | None:
        """Normalize code-like IDs (e.g. P1, O2) from metadata."""
        if not isinstance(value, str):
            return None
        code = value.strip().upper()
        return code or None

    def _resolve_entity_reference(
        self,
        reference: Any,
        entities_by_email: dict[str, UUID],
        entities_by_name: dict[str, UUID],
    ) -> UUID | None:
        """Resolve an entity UUID from mixed metadata values (email/name/list/dict)."""
        if isinstance(reference, str):
            values = [part.strip().lower() for part in reference.replace(";", ",").split(",")]
            for value in values:
                if not value:
                    continue
                if value in entities_by_email:
                    return entities_by_email[value]
                if value in entities_by_name:
                    return entities_by_name[value]
                if "<" in value and ">" in value:
                    bracketed = value.split("<", 1)[1].split(">", 1)[0].strip()
                    if bracketed in entities_by_email:
                        return entities_by_email[bracketed]
                for email, entity_id in entities_by_email.items():
                    if email in value:
                        return entity_id
                for name, entity_id in entities_by_name.items():
                    if name in value:
                        return entity_id
            return None

        if isinstance(reference, list):
            for item in reference:
                resolved = self._resolve_entity_reference(item, entities_by_email, entities_by_name)
                if resolved is not None:
                    return resolved
            return None

        if isinstance(reference, dict):
            for item in reference.values():
                resolved = self._resolve_entity_reference(item, entities_by_email, entities_by_name)
                if resolved is not None:
                    return resolved

        return None

    def _resolve_code_or_reference(
        self,
        value: Any,
        code_to_entity: dict[str, UUID],
        entities_by_email: dict[str, UUID],
        entities_by_name: dict[str, UUID],
    ) -> UUID | None:
        """Resolve from metadata code mapping first, fallback to direct lookup."""
        code = self._normalize_code(value)
        if code and code in code_to_entity:
            return code_to_entity[code]
        return self._resolve_entity_reference(value, entities_by_email, entities_by_name)

    def _learn_code_mapping(
        self,
        metadata: dict[str, Any],
        code_to_entity: dict[str, UUID],
        entities_by_email: dict[str, UUID],
        entities_by_name: dict[str, UUID],
    ) -> None:
        """Learn mappings like P1->entity_id from metadata with direct hints."""
        mapping_pairs = (
            ("from_entity", "from"),
            ("to_entity", "to"),
            ("vendor_entity", "vendor"),
        )
        for code_key, reference_key in mapping_pairs:
            code = self._normalize_code(metadata.get(code_key))
            if not code or code in code_to_entity:
                continue
            resolved = self._resolve_entity_reference(
                metadata.get(reference_key),
                entities_by_email,
                entities_by_name,
            )
            if resolved is not None:
                code_to_entity[code] = resolved

    def _extract_entities_from_metadata(
        self,
        metadata: dict[str, Any],
        code_to_entity: dict[str, UUID],
        entities_by_email: dict[str, UUID],
        entities_by_name: dict[str, UUID],
    ) -> set[UUID]:
        """Extract participant entity IDs from document metadata."""
        participant_fields = (
            "from",
            "to",
            "vendor",
            "requester",
            "resolved_by",
            "employee",
            "submitted_by",
            "approved_by",
            "from_entity",
            "to_entity",
            "vendor_entity",
        )
        participants: set[UUID] = set()
        for field in participant_fields:
            resolved = self._resolve_code_or_reference(
                metadata.get(field),
                code_to_entity,
                entities_by_email,
                entities_by_name,
            )
            if resolved is not None:
                participants.add(resolved)
        return participants

    def _extract_entities_from_text(self, doc: Document, entities: list[Entity]) -> set[UUID]:
        """Extract entity references found in subject/body text."""
        searchable = " ".join(part for part in (doc.subject or "", doc.body) if part).lower()
        if not searchable:
            return set()

        participants: set[UUID] = set()
        for entity in entities:
            name = entity.name.strip().lower()
            if name and name in searchable:
                participants.add(entity.entity_id)
                continue

            email = entity.attrs_json.get("email") if isinstance(entity.attrs_json, dict) else None
            if isinstance(email, str) and email.strip().lower() in searchable:
                participants.add(entity.entity_id)

        return participants

    async def _merge_entity_relationship(
        self,
        case_id: UUID,
        source_id: UUID,
        target_id: UUID,
        relationship_type: str,
        doc: Document,
    ) -> None:
        """Create or update an entity-to-entity relationship edge."""
        if source_id == target_id:
            return

        allowed_types = {"SENT", "MENTIONS", "CO_OCCURS"}
        rel_type = relationship_type if relationship_type in allowed_types else "MENTIONS"

        query = f"""
        MATCH (a {{entity_id: $source_id, case_id: $case_id}})
        MATCH (b {{entity_id: $target_id, case_id: $case_id}})
        MERGE (a)-[r:{rel_type}]->(b)
        ON CREATE SET r.count = 1,
          r.last_doc_id = $doc_id,
          r.last_doc_type = $doc_type,
          r.last_ts = $ts
        ON MATCH SET r.count = coalesce(r.count, 0) + 1,
          r.last_doc_id = $doc_id,
          r.last_doc_type = $doc_type,
          r.last_ts = $ts
        RETURN r
        """
        await self.neo4j.run(
            query,
            source_id=str(source_id),
            target_id=str(target_id),
            case_id=str(case_id),
            doc_id=str(doc.doc_id),
            doc_type=doc.doc_type.value,
            ts=doc.ts.isoformat() if doc.ts else "",
        )

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
        WHERE ALL(n IN nodes(path) WHERE n.entity_id IS NOT NULL)
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
        RETURN DISTINCT neighbor, r,
          [rel IN r | {{
            source_id: startNode(rel).entity_id,
            target_id: endNode(rel).entity_id,
            relationship_type: type(rel),
            properties: properties(rel)
          }}] AS edge_maps
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
        seen_edges: set[tuple[str, str, str]] = set()

        for record in records:
            neighbor = record["neighbor"]
            neighbor_id_raw = neighbor.get("entity_id")
            if neighbor_id_raw is None:
                # Skip non-entity nodes (e.g. Document) that do not have entity_id.
                continue
            neighbor_id = str(neighbor_id_raw)

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

            processed_from_edge_map = False
            try:
                edge_maps = record["edge_maps"]
            except Exception:
                edge_maps = None

            if isinstance(edge_maps, list) and edge_maps:
                processed_from_edge_map = True
                for edge_map in edge_maps:
                    if not isinstance(edge_map, dict):
                        continue
                    source_id_raw = edge_map.get("source_id")
                    target_id_raw = edge_map.get("target_id")
                    if source_id_raw is None or target_id_raw is None:
                        continue

                    relationship_type = str(edge_map.get("relationship_type", "RELATED"))
                    edge_key = (str(source_id_raw), str(target_id_raw), relationship_type)
                    if edge_key in seen_edges:
                        continue
                    seen_edges.add(edge_key)

                    properties = edge_map.get("properties")
                    edges.append(
                        GraphEdge(
                            source_id=UUID(str(source_id_raw)),
                            target_id=UUID(str(target_id_raw)),
                            relationship_type=relationship_type,
                            properties=properties if isinstance(properties, dict) else {},
                        )
                    )

            # Compatibility path for tests/mocks that only provide "r".
            if not processed_from_edge_map:
                rels = record["r"]
                if rels:
                    for rel in rels if isinstance(rels, list) else [rels]:
                        source_id_raw = rel.start_node.get("entity_id")
                        target_id_raw = rel.end_node.get("entity_id")
                        if source_id_raw is None or target_id_raw is None:
                            # Skip relationships touching non-entity nodes.
                            continue

                        edge_key = (str(source_id_raw), str(target_id_raw), rel.type)
                        if edge_key in seen_edges:
                            continue
                        seen_edges.add(edge_key)

                        edges.append(
                            GraphEdge(
                                source_id=UUID(str(source_id_raw)),
                                target_id=UUID(str(target_id_raw)),
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
