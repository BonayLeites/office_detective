'use client';

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { BoardToolbar } from './board-toolbar';
import { DocumentNode, type DocumentNodeData } from './document-node';
import { EntityNode, type EntityNodeData } from './entity-node';
import { NodeDetailsPanel } from './node-details-panel';

import type { Document, Entity, GraphEdge } from '@/types';

import { useEntities } from '@/hooks/use-entities';
import { useGraph } from '@/hooks/use-graph';
import { useGameStore } from '@/stores/game-store';

// Color palette for relationship types
function getEdgeColor(type: string): string {
  const colors: Record<string, string> = {
    SENT: '#3b82f6', // blue - emails
    MENTIONS: '#8b5cf6', // purple - references
    APPROVED: '#22c55e', // green - approvals
    PAID_TO: '#f59e0b', // amber - payments
    WORKS_AT: '#6b7280', // gray - employment
    RECEIVED: '#06b6d4', // cyan - received
    BELONGS_TO: '#ec4899', // pink - membership
  };
  return colors[type] ?? '#94a3b8';
}

// Convert API GraphEdge to React Flow Edge
function graphEdgeToReactFlowEdge(edge: GraphEdge): Edge {
  return {
    id: `edge-${edge.source_id}-${edge.target_id}-${edge.relationship_type}`,
    source: `entity-${edge.source_id}`,
    target: `entity-${edge.target_id}`,
    label: edge.relationship_type,
    type: 'smoothstep',
    animated: false,
    style: { stroke: getEdgeColor(edge.relationship_type), strokeWidth: 2 },
    labelStyle: { fontSize: 10, fill: '#64748b' },
    labelBgStyle: { fill: 'white', fillOpacity: 0.8 },
    labelBgPadding: [4, 2] as [number, number],
  };
}

const nodeTypes = {
  entity: EntityNode,
  document: DocumentNode,
};

interface EvidenceBoardProps {
  caseId: string;
}

type BoardNode = Node<EntityNodeData | DocumentNodeData>;
type BoardEdge = Edge;

export function EvidenceBoard({ caseId }: EvidenceBoardProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<BoardNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<BoardEdge>([]);
  const [selectedNode, setSelectedNode] = useState<
    { type: 'entity'; data: Entity } | { type: 'document'; data: Document } | null
  >(null);

  const { entities } = useEntities(caseId);
  const { isLoading, syncGraph, getHubs, getNeighbors } = useGraph(caseId);
  const setCurrentCase = useGameStore(state => state.setCurrentCase);

  // Track which entities have been expanded to avoid loops
  const [expandedEntities, setExpandedEntities] = useState<Set<string>>(new Set());

  // Set current case on mount
  useEffect(() => {
    setCurrentCase(caseId);
  }, [caseId, setCurrentCase]);

  const handleNodesChange = useCallback(
    (changes: NodeChange<BoardNode>[]) => {
      onNodesChange(changes);
    },
    [onNodesChange],
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange<BoardEdge>[]) => {
      onEdgesChange(changes);
    },
    [onEdgesChange],
  );

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node<EntityNodeData | DocumentNodeData>) => {
      if (node.type === 'entity') {
        const entityData = node.data as EntityNodeData;
        setSelectedNode({ type: 'entity', data: entityData.entity });
      } else if (node.type === 'document') {
        const docData = node.data as DocumentNodeData;
        setSelectedNode({ type: 'document', data: docData.document });
      }
    },
    [],
  );

  // Add entity node to board (without expanding)
  const addEntityNodeOnly = useCallback(
    (entity: Entity, position?: { x: number; y: number }): boolean => {
      const nodeId = `entity-${entity.entity_id}`;
      const exists = nodes.some(n => n.id === nodeId);
      if (exists) return false;

      const newNode: Node<EntityNodeData> = {
        id: nodeId,
        type: 'entity',
        position: position ?? {
          x: Math.random() * 400 + 100,
          y: Math.random() * 300 + 100,
        },
        data: {
          entity,
          label: entity.name,
          caseId,
        },
      };

      setNodes(nds => [...nds, newNode]);
      return true;
    },
    [nodes, setNodes, caseId],
  );

  // Expand connections for an entity (fetch neighbors and edges from Neo4j)
  const expandEntityConnections = useCallback(
    async (entityId: string, centerPosition: { x: number; y: number }) => {
      // Don't expand if already expanded
      if (expandedEntities.has(entityId)) return;

      const response = await getNeighbors(entityId, 1);
      if (!response || response.neighbors.length === 0) return;

      // Mark as expanded
      setExpandedEntities(prev => new Set(prev).add(entityId));

      // Limit to 10 neighbors to avoid visual clutter
      const limitedNeighbors = response.neighbors.slice(0, 10);

      // Add neighbor entities in a circle around the center
      const radius = 150;
      limitedNeighbors.forEach((neighbor, index) => {
        const angle = (2 * Math.PI * index) / limitedNeighbors.length;
        const x = centerPosition.x + radius * Math.cos(angle);
        const y = centerPosition.y + radius * Math.sin(angle);

        const entity = entities.find(e => e.entity_id === neighbor.entity_id);
        if (entity) {
          addEntityNodeOnly(entity, { x, y });
        }
      });

      // Add edges
      const newEdges = response.edges.map(graphEdgeToReactFlowEdge);
      setEdges(eds => {
        const existingIds = new Set(eds.map(e => e.id));
        return [...eds, ...newEdges.filter(e => !existingIds.has(e.id))];
      });
    },
    [expandedEntities, getNeighbors, entities, addEntityNodeOnly, setEdges],
  );

  // Add entity to board AND auto-expand its connections
  const addEntityToBoard = useCallback(
    async (entity: Entity, position?: { x: number; y: number }) => {
      const pos = position ?? {
        x: Math.random() * 400 + 100,
        y: Math.random() * 300 + 100,
      };

      const wasAdded = addEntityNodeOnly(entity, pos);

      // Auto-expand connections if this is a new node
      if (wasAdded) {
        await expandEntityConnections(entity.entity_id, pos);
      }
    },
    [addEntityNodeOnly, expandEntityConnections],
  );

  const handleLoadHubs = useCallback(async () => {
    const hubsResponse = await getHubs(10);
    if (!hubsResponse) return;

    // Add hub entities to the board in a circle layout
    const centerX = 400;
    const centerY = 300;
    const radius = 200;

    hubsResponse.hubs.forEach((hub, index) => {
      const entity = entities.find(e => e.entity_id === hub.entity_id);
      if (entity) {
        const angle = (2 * Math.PI * index) / hubsResponse.hubs.length;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        void addEntityToBoard(entity, { x, y });
      }
    });
  }, [getHubs, entities, addEntityToBoard]);

  const handleSyncGraph = useCallback(async () => {
    await syncGraph();
  }, [syncGraph]);

  const handleClearBoard = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
    setExpandedEntities(new Set());
  }, [setNodes, setEdges]);

  const handleAutoLayout = useCallback(() => {
    // Simple grid layout
    const cols = Math.ceil(Math.sqrt(nodes.length));
    const spacing = 180;

    setNodes(nds =>
      nds.map((node, index) => ({
        ...node,
        position: {
          x: (index % cols) * spacing + 100,
          y: Math.floor(index / cols) * spacing + 100,
        },
      })),
    );
  }, [nodes.length, setNodes]);

  const handleSearch = useCallback(
    (query: string) => {
      const lowerQuery = query.toLowerCase();
      const matchingEntities = entities.filter(
        e =>
          e.name.toLowerCase().includes(lowerQuery) ||
          e.entity_type.toLowerCase().includes(lowerQuery),
      );

      matchingEntities.slice(0, 5).forEach((entity, index) => {
        void addEntityToBoard(entity, {
          x: 100 + index * 150,
          y: 100,
        });
      });
    },
    [entities, addEntityToBoard],
  );

  const handleRemoveFromBoard = useCallback(
    (id: string) => {
      setNodes(nds => nds.filter(n => !n.id.endsWith(id)));
      setEdges(eds => eds.filter(e => !e.source.endsWith(id) && !e.target.endsWith(id)));
      setSelectedNode(null);
    },
    [setNodes, setEdges],
  );

  const handleClosePanel = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Memoize node types to prevent re-renders
  const memoizedNodeTypes = useMemo(() => nodeTypes, []);

  return (
    <div className="flex h-full w-full">
      <div className="flex min-h-0 flex-1 flex-col">
        <BoardToolbar
          caseId={caseId}
          onLoadHubs={handleLoadHubs}
          onSyncGraph={handleSyncGraph}
          onClearBoard={handleClearBoard}
          onAutoLayout={handleAutoLayout}
          onSearch={handleSearch}
          isLoading={isLoading}
          nodeCount={nodes.length}
        />

        <div className="relative min-h-0 flex-1">
          <ReactFlow
            style={{ width: '100%', height: '100%' }}
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onNodeClick={handleNodeClick}
            nodeTypes={memoizedNodeTypes}
            fitView
            className="bg-muted/30"
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
            <Controls />
            <MiniMap
              nodeColor={node => {
                if (node.type === 'entity') return '#3b82f6';
                return '#6b7280';
              }}
              maskColor="rgba(0, 0, 0, 0.1)"
            />
          </ReactFlow>
        </div>
      </div>

      <NodeDetailsPanel
        caseId={caseId}
        selectedNode={selectedNode}
        onClose={handleClosePanel}
        onRemoveFromBoard={handleRemoveFromBoard}
      />
    </div>
  );
}
