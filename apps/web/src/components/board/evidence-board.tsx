'use client';

import {
  Background,
  BackgroundVariant,
  type Connection,
  Controls,
  MiniMap,
  ReactFlow,
  type ReactFlowInstance,
  useEdgesState,
  useNodesState,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  AlertCircle,
  CheckCircle2,
  CircleDashed,
  Files,
  Info,
  Map as MapIcon,
  MessageSquare,
  PanelRight,
  Pin,
  RefreshCcw,
  Sparkles,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { BoardToolbar } from './board-toolbar';
import { DocumentNode, type DocumentNodeData } from './document-node';
import { EmptyBoardState } from './empty-board-state';
import { EntityNode, type EntityNodeData } from './entity-node';
import { NodeDetailsPanel } from './node-details-panel';

import type { BoardStatePayload, Document, Entity, GraphEdge } from '@/types';

import { Button } from '@/components/ui/button';
import { useDocuments } from '@/hooks/use-documents';
import { useEntities } from '@/hooks/use-entities';
import { useGraph } from '@/hooks/use-graph';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useGameStore } from '@/stores/game-store';

// Color palette for relationship types
function getEdgeColor(type: string): string {
  const colors: Record<string, string> = {
    SENT: '#3b82f6', // blue - emails
    MENTIONS: '#0f766e', // teal - references
    APPROVED: '#22c55e', // green - approvals
    PAID_TO: '#f59e0b', // amber - payments
    WORKS_AT: '#6b7280', // gray - employment
    RECEIVED: '#06b6d4', // cyan - received
    BELONGS_TO: '#ec4899', // pink - membership
    CO_OCCURS: '#7c3aed', // violet - co-occurrence
    LINKED: '#475569', // slate - manual links
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

function boardStateEdgeToReactFlowEdge(edge: BoardStatePayload['board_edges'][number]): Edge {
  const relationshipType = edge.relationship_type || edge.label || 'LINKED';
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label || relationshipType,
    type: 'smoothstep',
    animated: false,
    style: {
      stroke: getEdgeColor(relationshipType),
      strokeWidth: 2,
      strokeDasharray: '6 4',
    },
    labelStyle: { fontSize: 10, fill: '#475569' },
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
type GraphAction = 'sync' | 'hubs' | 'trace';
type MobileLayer = 'map' | 'details' | 'evidence';
interface BoardFeedback {
  kind: 'info' | 'success' | 'error';
  message: string;
  retryAction?: GraphAction;
}

interface MobileEvidenceLayerProps {
  caseId: string;
  pinnedDocs: { id: string; label: string }[];
  pinnedEntities: { id: string; label: string }[];
  suspects: { id: string; name: string }[];
  suspectConfidence: Record<string, number>;
  onRemovePin: (id: string) => void;
  onToggleSuspect: (entityId: string) => void;
}

function isEntity(value: unknown): value is Entity {
  return (
    typeof value === 'object' &&
    value !== null &&
    'entity_id' in value &&
    'entity_type' in value &&
    'name' in value
  );
}

function isDocument(value: unknown): value is Document {
  return (
    typeof value === 'object' &&
    value !== null &&
    'doc_id' in value &&
    'doc_type' in value &&
    'body' in value
  );
}

function normalizeEntityType(type: string): Entity['entity_type'] {
  const normalized = type.toLowerCase();
  if (
    normalized === 'person' ||
    normalized === 'org' ||
    normalized === 'account' ||
    normalized === 'sku' ||
    normalized === 'ip' ||
    normalized === 'location' ||
    normalized === 'order' ||
    normalized === 'ticket'
  ) {
    return normalized;
  }
  return 'org';
}

export function EvidenceBoard({ caseId }: EvidenceBoardProps) {
  const t = useTranslations('board');
  const [nodes, setNodes, onNodesChange] = useNodesState<BoardNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<BoardEdge>([]);
  const [connectionType, setConnectionType] = useState('LINKED');
  const [selectedNode, setSelectedNode] = useState<
    { type: 'entity'; data: Entity } | { type: 'document'; data: Document } | null
  >(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileLayer, setMobileLayer] = useState<MobileLayer>('map');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasLoadedBoardState, setHasLoadedBoardState] = useState(false);
  const [lastGraphAction, setLastGraphAction] = useState<GraphAction | undefined>(undefined);
  const [feedback, setFeedback] = useState<BoardFeedback | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reactFlowRef = useRef<ReactFlowInstance<BoardNode, BoardEdge> | null>(null);

  const { entities } = useEntities(caseId);
  const { documents } = useDocuments(caseId, { limit: 200 });
  const {
    isLoading,
    error: graphError,
    syncGraph,
    getHubs,
    getNeighbors,
    getPath,
  } = useGraph(caseId);
  const setCurrentCase = useGameStore(state => state.setCurrentCase);
  const openedDocCount = useGameStore(state => state.getOpenedDocs(caseId).length);
  const ariaQuestions = useGameStore(state => state.getAriaQuestions(caseId));
  const caseBoardItems = useGameStore(state =>
    state.boardItems.filter(item => item.caseId === caseId),
  );
  const pinnedItems = useGameStore(state => state.pinnedItems);
  const suspectedEntities = useGameStore(state => state.getSuspectedEntities(caseId));
  const suspectConfidence = useGameStore(state => state.getSuspectConfidenceMap(caseId));
  const addToBoard = useGameStore(state => state.addToBoard);
  const unpinItem = useGameStore(state => state.unpinItem);
  const toggleSuspect = useGameStore(state => state.toggleSuspect);
  const removeFromBoard = useGameStore(state => state.removeFromBoard);
  const updateBoardPosition = useGameStore(state => state.updateBoardPosition);
  const clearBoard = useGameStore(state => state.clearBoard);
  const setBoardItems = useGameStore(state => state.setBoardItems);

  // Track which entities have been expanded to avoid loops
  const [expandedEntities, setExpandedEntities] = useState<Set<string>>(new Set());
  const casePins = useMemo(
    () => pinnedItems.filter(item => item.caseId === caseId),
    [caseId, pinnedItems],
  );
  const pinnedDocs = useMemo(
    () => casePins.filter(item => item.type === 'document' || item.type === 'chunk'),
    [casePins],
  );
  const pinnedEntities = useMemo(() => casePins.filter(item => item.type === 'entity'), [casePins]);
  const suspectEntities = useMemo(
    () => entities.filter(entity => suspectedEntities.includes(entity.entity_id)),
    [entities, suspectedEntities],
  );
  const dismissOnboarding = useCallback(() => {
    setShowOnboarding(false);
    try {
      window.localStorage.setItem(`office-detective-board-onboarding:${caseId}`, '1');
    } catch {
      // Ignore localStorage write errors in restrictive browsers.
    }
  }, [caseId]);

  const focusNodes = useCallback((nodeIds: string[]) => {
    if (!reactFlowRef.current || nodeIds.length === 0) return;

    const ids = new Set(nodeIds);
    const nodesToFocus = reactFlowRef.current.getNodes().filter(node => ids.has(node.id));
    if (nodesToFocus.length === 0) return;

    void reactFlowRef.current.fitView({
      nodes: nodesToFocus,
      padding: 0.28,
      duration: 420,
      maxZoom: 1.2,
    });
  }, []);

  const focusSingleNode = useCallback((nodeId: string) => {
    const instance = reactFlowRef.current;
    if (!instance) return;

    const node = instance.getNode(nodeId);
    if (!node) return;

    const width = node.width ?? 150;
    const height = node.height ?? 90;
    void instance.setCenter(node.position.x + width / 2, node.position.y + height / 2, {
      zoom: 1.08,
      duration: 300,
    });
  }, []);

  const scheduleFocus = useCallback(
    (nodeIds: string[]) => {
      if (nodeIds.length === 0) return;
      window.setTimeout(() => {
        focusNodes(nodeIds);
      }, 100);
    },
    [focusNodes],
  );

  useEffect(() => {
    if (!graphError) return;
    const errorMessageByAction: Record<GraphAction, string> = {
      sync: t('feedback.syncFailed'),
      hubs: t('feedback.hubsFailed'),
      trace: t('feedback.traceFailed'),
    };

    setFeedback({
      kind: 'error',
      message: lastGraphAction ? errorMessageByAction[lastGraphAction] : t('feedback.graphFailed'),
      ...(lastGraphAction ? { retryAction: lastGraphAction } : {}),
    });
  }, [graphError, lastGraphAction, t]);

  useEffect(() => {
    try {
      const dismissed = window.localStorage.getItem(`office-detective-board-onboarding:${caseId}`);
      setShowOnboarding(dismissed !== '1');
    } catch {
      setShowOnboarding(true);
    }
  }, [caseId]);

  // Set current case on mount
  useEffect(() => {
    setCurrentCase(caseId);
  }, [caseId, setCurrentCase]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const apply = () => {
      setIsMobile(mediaQuery.matches);
    };
    apply();
    mediaQuery.addEventListener('change', apply);
    return () => {
      mediaQuery.removeEventListener('change', apply);
    };
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setMobileLayer('map');
      return;
    }
    if (mobileLayer === 'details' && !selectedNode) {
      setMobileLayer('map');
    }
  }, [isMobile, mobileLayer, selectedNode]);

  useEffect(() => {
    let cancelled = false;

    const loadBoardState = async () => {
      try {
        const response = await api.get<BoardStatePayload>(`/api/cases/${caseId}/board-state`);
        if (cancelled) return;

        const items = response.board_items.filter(item => {
          return (
            typeof item.id === 'string' && typeof item.caseId === 'string' && item.caseId === caseId
          );
        });
        setBoardItems(caseId, items);

        const manualEdges = response.board_edges
          .filter(edge => {
            return (
              typeof edge.id === 'string' &&
              typeof edge.source === 'string' &&
              typeof edge.target === 'string' &&
              edge.id.startsWith('manual-')
            );
          })
          .map(boardStateEdgeToReactFlowEdge);

        setEdges(currentEdges => {
          const merged = [...currentEdges];
          const seenIds = new Set(merged.map(edge => edge.id));
          for (const edge of manualEdges) {
            if (seenIds.has(edge.id)) continue;
            merged.push(edge);
            seenIds.add(edge.id);
          }
          return merged;
        });
      } catch {
        // Anonymous sessions or missing auth should not block board usage.
        setFeedback({
          kind: 'info',
          message: t('feedback.persistenceUnavailable'),
        });
      } finally {
        if (!cancelled) {
          setHasLoadedBoardState(true);
        }
      }
    };

    void loadBoardState();

    return () => {
      cancelled = true;
    };
  }, [caseId, setBoardItems, setEdges, t]);

  const entitiesById = useMemo(() => {
    return new Map(entities.map(entity => [entity.entity_id, entity]));
  }, [entities]);

  const documentsById = useMemo(() => {
    return new Map(documents.map(document => [document.doc_id, document]));
  }, [documents]);

  useEffect(() => {
    const nextNodes: BoardNode[] = [];
    for (const item of caseBoardItems) {
      if (item.type === 'entity') {
        const entityId = item.id.startsWith('entity-') ? item.id.slice('entity-'.length) : item.id;
        const entityFromData = isEntity(item.data) ? item.data : undefined;
        const entity = entityFromData ?? entitiesById.get(entityId);
        if (!entity) continue;

        nextNodes.push({
          id: item.id,
          type: 'entity',
          position: item.position,
          data: {
            entity,
            label: item.label,
            caseId,
          },
        } as BoardNode);
        continue;
      }

      const docId = item.id.startsWith('document-') ? item.id.slice('document-'.length) : item.id;
      const documentFromData = isDocument(item.data) ? item.data : undefined;
      const document = documentFromData ?? documentsById.get(docId);
      if (!document) continue;

      nextNodes.push({
        id: item.id,
        type: 'document',
        position: item.position,
        data: {
          document,
          label: item.label,
          caseId,
        },
      } as BoardNode);
    }

    setNodes(nextNodes);
    setEdges(currentEdges => {
      const currentNodeIds = new Set(nextNodes.map(node => node.id));
      return currentEdges.filter(
        edge => currentNodeIds.has(edge.source) && currentNodeIds.has(edge.target),
      );
    });
  }, [caseBoardItems, caseId, documentsById, entitiesById, setEdges, setNodes]);

  const persistBoardState = useCallback(async () => {
    const boardEdges = edges
      .filter(edge => edge.id.startsWith('manual-'))
      .map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: typeof edge.label === 'string' ? edge.label : 'LINKED',
        relationship_type: typeof edge.label === 'string' ? edge.label : 'LINKED',
      }));

    try {
      await api.put<BoardStatePayload>(`/api/cases/${caseId}/board-state`, {
        board_items: caseBoardItems,
        board_edges: boardEdges,
      });
    } catch {
      // Do not interrupt the investigation flow if persistence fails.
    }
  }, [caseBoardItems, caseId, edges]);

  useEffect(() => {
    if (!hasLoadedBoardState) return;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      void persistBoardState();
    }, 700);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [caseBoardItems, edges, hasLoadedBoardState, persistBoardState]);

  const handleNodesChange = useCallback(
    (changes: NodeChange<BoardNode>[]) => {
      onNodesChange(changes);

      changes.forEach(change => {
        if (
          change.type === 'position' &&
          change.position &&
          change.dragging === false &&
          (change.id.startsWith('entity-') || change.id.startsWith('document-'))
        ) {
          updateBoardPosition(caseId, change.id, change.position);
        }
      });
    },
    [caseId, onNodesChange, updateBoardPosition],
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
      if (isMobile) {
        setMobileLayer('details');
      }
    },
    [isMobile],
  );

  // Add entity node to board (without expanding)
  const addEntityNodeOnly = useCallback(
    (entity: Entity, position?: { x: number; y: number }): boolean => {
      const nodeId = `entity-${entity.entity_id}`;
      const exists = useGameStore
        .getState()
        .boardItems.some(item => item.caseId === caseId && item.id === nodeId);
      if (exists) return false;

      addToBoard({
        id: nodeId,
        type: 'entity',
        caseId,
        label: entity.name,
        data: entity as unknown as Record<string, unknown>,
        position: position ?? {
          x: Math.random() * 400 + 100,
          y: Math.random() * 300 + 100,
        },
      });
      return true;
    },
    [addToBoard, caseId],
  );

  const addDocumentNodeOnly = useCallback(
    (document: Document, position?: { x: number; y: number }): boolean => {
      const nodeId = `document-${document.doc_id}`;
      const exists = useGameStore
        .getState()
        .boardItems.some(item => item.caseId === caseId && item.id === nodeId);
      if (exists) return false;

      addToBoard({
        id: nodeId,
        type: 'document',
        caseId,
        label: document.subject ?? document.doc_type,
        data: document as unknown as Record<string, unknown>,
        position: position ?? {
          x: Math.random() * 380 + 120,
          y: Math.random() * 280 + 220,
        },
      });
      return true;
    },
    [addToBoard, caseId],
  );

  // Expand connections for an entity (fetch neighbors and edges from Neo4j)
  const expandEntityConnections = useCallback(
    async (
      entityId: string,
      centerPosition: { x: number; y: number },
      options?: { force?: boolean },
    ) => {
      // Don't expand if already expanded
      if (expandedEntities.has(entityId) && !options?.force) return;

      const response = await getNeighbors(entityId, 1);
      if (!response || response.neighbors.length === 0) return;

      // Mark as expanded
      setExpandedEntities(prev => new Set(prev).add(entityId));

      // Limit to 10 neighbors to avoid visual clutter
      const limitedNeighbors = response.neighbors.slice(0, 10);

      // Add neighbor entities in a circle around the center
      const radius = 150;
      const focusedNodeIds = [`entity-${entityId}`];
      limitedNeighbors.forEach((neighbor, index) => {
        const angle = (2 * Math.PI * index) / limitedNeighbors.length;
        const x = centerPosition.x + radius * Math.cos(angle);
        const y = centerPosition.y + radius * Math.sin(angle);

        const entity = entitiesById.get(neighbor.entity_id) ?? {
          entity_id: neighbor.entity_id,
          case_id: caseId,
          entity_type: normalizeEntityType(neighbor.entity_type),
          name: neighbor.name,
          attrs_json: neighbor.properties,
        };
        addEntityNodeOnly(entity, { x, y });
        focusedNodeIds.push(`entity-${neighbor.entity_id}`);
      });

      // Add edges
      const newEdges = response.edges.map(graphEdgeToReactFlowEdge);
      setEdges(eds => {
        const existingIds = new Set(eds.map(e => e.id));
        return [...eds, ...newEdges.filter(e => !existingIds.has(e.id))];
      });
      scheduleFocus(focusedNodeIds);
    },
    [
      addEntityNodeOnly,
      caseId,
      entitiesById,
      expandedEntities,
      getNeighbors,
      scheduleFocus,
      setEdges,
    ],
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
    setLastGraphAction('hubs');
    const hubsResponse = await getHubs(10);
    if (!hubsResponse) return;
    if (hubsResponse.hubs.length === 0) {
      setFeedback({
        kind: 'info',
        message: t('feedback.hubsEmpty'),
      });
      return;
    }

    // Add hub entities to the board in a circle layout
    const centerX = 400;
    const centerY = 300;
    const radius = 200;
    const focusedNodeIds: string[] = [];

    hubsResponse.hubs.forEach((hub, index) => {
      const entity = entitiesById.get(hub.entity_id);
      if (entity) {
        const angle = (2 * Math.PI * index) / hubsResponse.hubs.length;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        void addEntityToBoard(entity, { x, y });
        focusedNodeIds.push(`entity-${entity.entity_id}`);
      }
    });
    scheduleFocus(focusedNodeIds);
    setFeedback({
      kind: 'success',
      message: t('feedback.hubsLoaded', { count: hubsResponse.hubs.length }),
    });
  }, [addEntityToBoard, entitiesById, getHubs, scheduleFocus, t]);

  const handleSyncGraph = useCallback(async () => {
    setLastGraphAction('sync');
    const result = await syncGraph();
    if (!result) return;
    setExpandedEntities(new Set());
    setFeedback({
      kind: 'success',
      message: t('feedback.syncSuccess', {
        nodes: result.nodes_created,
        links: result.relationships_created,
      }),
    });
  }, [syncGraph, t]);

  const handleClearBoard = useCallback(() => {
    clearBoard(caseId);
    setEdges([]);
    setSelectedNode(null);
    setExpandedEntities(new Set());
    setFeedback(null);
  }, [caseId, clearBoard, setEdges]);

  const handleAutoLayout = useCallback(() => {
    if (caseBoardItems.length === 0) return;

    const entityItems = caseBoardItems.filter(item => item.type === 'entity');
    const documentItems = caseBoardItems.filter(item => item.type === 'document');

    const centerX = 420;
    const centerY = 260;
    const entityRadius = Math.max(160, 60 * Math.ceil(Math.sqrt(entityItems.length || 1)));

    entityItems.forEach((item, index) => {
      const angle = (2 * Math.PI * index) / Math.max(1, entityItems.length);
      updateBoardPosition(caseId, item.id, {
        x: centerX + entityRadius * Math.cos(angle),
        y: centerY + entityRadius * Math.sin(angle),
      });
    });

    const docCols = Math.max(2, Math.ceil(Math.sqrt(documentItems.length || 1)));
    const docSpacingX = 210;
    const docSpacingY = 130;
    const docStartX = centerX - ((docCols - 1) * docSpacingX) / 2;
    const docStartY = centerY + entityRadius + 120;

    documentItems.forEach((item, index) => {
      updateBoardPosition(caseId, item.id, {
        x: docStartX + (index % docCols) * docSpacingX,
        y: docStartY + Math.floor(index / docCols) * docSpacingY,
      });
    });
  }, [caseBoardItems, caseId, updateBoardPosition]);

  const handleSearch = useCallback(
    (query: string) => {
      const lowerQuery = query.toLowerCase();
      const matchingEntities = entities
        .filter(
          e =>
            e.name.toLowerCase().includes(lowerQuery) ||
            e.entity_type.toLowerCase().includes(lowerQuery),
        )
        .slice(0, 4);
      const matchingDocuments = documents
        .filter(doc => {
          const subject = doc.subject?.toLowerCase() ?? '';
          return (
            subject.includes(lowerQuery) ||
            doc.doc_type.toLowerCase().includes(lowerQuery) ||
            doc.body.toLowerCase().includes(lowerQuery)
          );
        })
        .slice(0, 3);

      if (matchingEntities.length === 0 && matchingDocuments.length === 0) {
        setFeedback({
          kind: 'info',
          message: t('feedback.searchNoMatches', { query }),
        });
        return;
      }

      const focusedNodeIds: string[] = [];
      matchingEntities.forEach((entity, index) => {
        void addEntityToBoard(entity, {
          x: 120 + index * 180,
          y: 120,
        });
        focusedNodeIds.push(`entity-${entity.entity_id}`);
      });
      matchingDocuments.forEach((document, index) => {
        addDocumentNodeOnly(document, {
          x: 120 + index * 220,
          y: 360,
        });
        focusedNodeIds.push(`document-${document.doc_id}`);
      });
      scheduleFocus(focusedNodeIds);
      setFeedback({
        kind: 'success',
        message: t('feedback.searchAdded', {
          entities: matchingEntities.length,
          documents: matchingDocuments.length,
        }),
      });
    },
    [addDocumentNodeOnly, addEntityToBoard, documents, entities, scheduleFocus, t],
  );

  const handleTraceSuspects = useCallback(async () => {
    if (suspectedEntities.length < 2) return;
    setLastGraphAction('trace');
    const ranked = [...suspectedEntities].sort((a, b) => {
      const aConfidence = suspectConfidence[a] ?? 50;
      const bConfidence = suspectConfidence[b] ?? 50;
      return bConfidence - aConfidence;
    });

    const fromEntityId = ranked[0];
    const toEntityId = ranked[1];
    if (!fromEntityId || !toEntityId) return;

    const response = await getPath(fromEntityId, toEntityId, 5);
    if (!response) return;
    if (!response.found || response.nodes.length === 0) {
      setFeedback({
        kind: 'info',
        message: t('feedback.traceNoPath'),
      });
      return;
    }

    const centerX = 420;
    const centerY = 220;
    const stepX = 190;
    const startX = centerX - ((response.nodes.length - 1) * stepX) / 2;
    const focusedNodeIds: string[] = [];

    response.nodes.forEach((pathNode, index) => {
      const entity = entitiesById.get(pathNode.entity_id) ?? {
        entity_id: pathNode.entity_id,
        case_id: caseId,
        entity_type: normalizeEntityType(pathNode.entity_type),
        name: pathNode.name,
        attrs_json: pathNode.properties,
      };
      addEntityNodeOnly(entity, {
        x: startX + index * stepX,
        y: centerY + (index % 2 === 0 ? -20 : 55),
      });
      focusedNodeIds.push(`entity-${pathNode.entity_id}`);
    });

    const newEdges = response.edges.map(graphEdgeToReactFlowEdge);
    setEdges(currentEdges => {
      const existingIds = new Set(currentEdges.map(edge => edge.id));
      return [...currentEdges, ...newEdges.filter(edge => !existingIds.has(edge.id))];
    });
    scheduleFocus(focusedNodeIds);
    setFeedback({
      kind: 'success',
      message: t('feedback.traceFound', { count: response.nodes.length }),
    });
  }, [
    addEntityNodeOnly,
    caseId,
    entitiesById,
    getPath,
    setEdges,
    scheduleFocus,
    suspectConfidence,
    suspectedEntities,
    t,
  ]);

  const handleNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node<EntityNodeData | DocumentNodeData>) => {
      if (node.type !== 'entity') return;
      const entityData = node.data as EntityNodeData;
      void expandEntityConnections(entityData.entity.entity_id, node.position, { force: true });
    },
    [expandEntityConnections],
  );

  const handleFocusNode = useCallback(
    (nodeId: string) => {
      focusSingleNode(nodeId);
      if (isMobile) {
        setMobileLayer('map');
      }
      setFeedback({
        kind: 'info',
        message: t('feedback.focusedNode'),
      });
    },
    [focusSingleNode, isMobile, t],
  );

  const handleExpandEntity = useCallback(
    (entityId: string) => {
      const nodeId = `entity-${entityId}`;
      const node = reactFlowRef.current?.getNode(nodeId);
      const centerPosition = node?.position ?? { x: 420, y: 220 };
      void expandEntityConnections(entityId, centerPosition, { force: true });
      setFeedback({
        kind: 'info',
        message: t('feedback.expandingNode'),
      });
    },
    [expandEntityConnections, t],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      const edgeId = `manual-${connection.source}-${connection.target}-${connectionType}`;
      const newEdge: BoardEdge = {
        id: edgeId,
        source: connection.source,
        target: connection.target,
        label: connectionType,
        type: 'smoothstep',
        animated: false,
        style: {
          stroke: getEdgeColor(connectionType),
          strokeWidth: 2,
          strokeDasharray: '6 4',
        },
        labelStyle: { fontSize: 10, fill: '#475569' },
        labelBgStyle: { fill: 'white', fillOpacity: 0.8 },
        labelBgPadding: [4, 2] as [number, number],
      };

      setEdges(currentEdges => {
        if (currentEdges.some(edge => edge.id === edgeId)) {
          return currentEdges;
        }
        return [...currentEdges, newEdge];
      });
    },
    [connectionType, setEdges],
  );

  const handleRemoveFromBoard = useCallback(
    (id: string) => {
      const boardIds = new Set([id, `entity-${id}`, `document-${id}`]);
      boardIds.forEach(boardId => {
        removeFromBoard(caseId, boardId);
      });
      setNodes(nds => nds.filter(n => !boardIds.has(n.id)));
      setEdges(eds => eds.filter(e => !boardIds.has(e.source) && !boardIds.has(e.target)));
      setSelectedNode(null);
    },
    [caseId, removeFromBoard, setEdges, setNodes],
  );

  const handleClosePanel = useCallback(() => {
    setSelectedNode(null);
    if (isMobile) {
      setMobileLayer('map');
    }
  }, [isMobile]);

  const onboardingSteps = useMemo(
    () => [
      {
        id: 'inbox',
        title: t('onboarding.steps.inbox.title'),
        description: t('onboarding.steps.inbox.description'),
        cta: t('onboarding.steps.inbox.cta'),
        done: openedDocCount > 0,
        href: `/cases/${caseId}/inbox`,
        icon: Files,
      },
      {
        id: 'chat',
        title: t('onboarding.steps.chat.title'),
        description: t('onboarding.steps.chat.description'),
        cta: t('onboarding.steps.chat.cta'),
        done: ariaQuestions > 0,
        href: `/cases/${caseId}/chat`,
        icon: MessageSquare,
      },
      {
        id: 'board',
        title: t('onboarding.steps.board.title'),
        description: t('onboarding.steps.board.description'),
        cta: t('onboarding.steps.board.cta'),
        done: nodes.length >= 3,
        icon: Sparkles,
      },
    ],
    [ariaQuestions, caseId, nodes.length, openedDocCount, t],
  );
  const completedOnboardingSteps = onboardingSteps.filter(step => step.done).length;

  // Memoize node types to prevent re-renders
  const memoizedNodeTypes = useMemo(() => nodeTypes, []);
  const mobileLayerTabs: {
    id: MobileLayer;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'map', label: t('mobileLayers.map'), icon: MapIcon },
    { id: 'details', label: t('mobileLayers.details'), icon: PanelRight },
    { id: 'evidence', label: t('mobileLayers.evidence'), icon: Pin },
  ];

  return (
    <div className="relative flex h-full w-full">
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col',
          isMobile && mobileLayer !== 'map' && 'hidden',
        )}
      >
        <BoardToolbar
          caseId={caseId}
          onLoadHubs={handleLoadHubs}
          onSyncGraph={handleSyncGraph}
          onTraceSuspects={handleTraceSuspects}
          onClearBoard={handleClearBoard}
          onAutoLayout={handleAutoLayout}
          onSearch={handleSearch}
          connectionType={connectionType}
          onConnectionTypeChange={setConnectionType}
          isLoading={isLoading}
          suspectCount={suspectedEntities.length}
          nodeCount={nodes.length}
          edgeCount={edges.length}
          manualEdgeCount={edges.filter(edge => edge.id.startsWith('manual-')).length}
        />

        {showOnboarding && (
          <div className="ink-divider border-border/70 bg-muted/35 border-b px-3 py-3 md:px-4">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.12em]">
                  {t('onboarding.title')}
                </p>
                <p className="mt-1 text-sm">{t('onboarding.description')}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={dismissOnboarding}
                aria-label={t('onboarding.dismiss')}
                title={t('onboarding.dismiss')}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-2 md:grid-cols-3">
              {onboardingSteps.map(step => {
                const StepIcon = step.icon;
                return (
                  <div
                    key={step.id}
                    className={cn(
                      'rounded-xl border px-3 py-2',
                      step.done
                        ? 'border-emerald-500/35 bg-emerald-500/10'
                        : 'bg-card/70 border-border/80',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {step.done ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                      ) : (
                        <CircleDashed className="text-muted-foreground h-4 w-4" />
                      )}
                      <StepIcon className="text-muted-foreground h-4 w-4" />
                      <p className="text-sm font-semibold">{step.title}</p>
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">{step.description}</p>

                    {step.href ? (
                      <Link
                        href={step.href}
                        className="text-primary mt-2 inline-flex text-xs font-semibold hover:underline"
                      >
                        {step.cta}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="text-primary mt-2 inline-flex text-xs font-semibold hover:underline"
                        onClick={() => {
                          void handleLoadHubs();
                        }}
                      >
                        {step.cta}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="text-muted-foreground mt-2 text-xs">
              {t('onboarding.progress', {
                done: completedOnboardingSteps,
                total: onboardingSteps.length,
              })}
            </p>
          </div>
        )}

        <div className="relative min-h-0 flex-1">
          {feedback && (
            <div
              className={[
                'absolute left-3 top-3 z-20 flex max-w-[92%] items-start gap-2 rounded-lg border px-3 py-2 shadow-md md:max-w-[70%]',
                feedback.kind === 'error'
                  ? 'border-destructive/40 bg-destructive/10 text-destructive'
                  : feedback.kind === 'success'
                    ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-800'
                    : 'border-border/80 bg-card/95 text-foreground',
              ].join(' ')}
            >
              {feedback.kind === 'error' ? (
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              ) : feedback.kind === 'success' ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
              ) : (
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className="text-sm">{feedback.message}</p>
                {feedback.retryAction && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-1 h-7 gap-1.5 px-2 text-xs"
                    onClick={() => {
                      if (feedback.retryAction === 'sync') {
                        void handleSyncGraph();
                        return;
                      }
                      if (feedback.retryAction === 'hubs') {
                        void handleLoadHubs();
                        return;
                      }
                      if (feedback.retryAction === 'trace') {
                        void handleTraceSuspects();
                      }
                    }}
                    disabled={isLoading}
                  >
                    <RefreshCcw className="h-3.5 w-3.5" />
                    {t('feedback.retry')}
                  </Button>
                )}
              </div>
              <button
                type="button"
                aria-label={t('feedback.dismiss')}
                className="rounded p-0.5 opacity-80 transition-opacity hover:opacity-100"
                onClick={() => {
                  setFeedback(null);
                }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {nodes.length === 0 ? (
            <EmptyBoardState caseId={caseId} onSuggestionClick={handleSearch} />
          ) : (
            <ReactFlow
              style={{ width: '100%', height: '100%' }}
              nodes={nodes}
              edges={edges}
              onInit={instance => {
                reactFlowRef.current = instance;
              }}
              onNodesChange={handleNodesChange}
              onEdgesChange={handleEdgesChange}
              onConnect={handleConnect}
              onNodeClick={handleNodeClick}
              onNodeDoubleClick={handleNodeDoubleClick}
              nodeTypes={memoizedNodeTypes}
              fitView
              className="bg-[radial-gradient(circle_at_top,_hsl(var(--secondary)/0.32),_transparent_60%),linear-gradient(160deg,_hsl(var(--background)/0.55),_hsl(var(--background)/0.2))]"
            >
              <Background variant={BackgroundVariant.Lines} gap={28} size={1} />
              {!isMobile && <Controls />}
              {!isMobile && (
                <MiniMap
                  nodeColor={node => {
                    if (node.type === 'entity') return '#3b82f6';
                    return '#6b7280';
                  }}
                  maskColor="rgba(0, 0, 0, 0.1)"
                />
              )}
            </ReactFlow>
          )}
        </div>
      </div>

      {isMobile && mobileLayer === 'details' && (
        <div className="flex min-h-0 flex-1 flex-col md:hidden">
          {selectedNode ? (
            <NodeDetailsPanel
              caseId={caseId}
              selectedNode={selectedNode}
              onFocusNode={handleFocusNode}
              onExpandEntity={handleExpandEntity}
              onClose={handleClosePanel}
              onRemoveFromBoard={handleRemoveFromBoard}
              mobileInline
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <PanelRight className="text-muted-foreground mb-3 h-10 w-10" />
              <p className="font-display text-lg font-semibold">
                {t('mobileLayers.noSelectionTitle')}
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                {t('mobileLayers.noSelectionDescription')}
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setMobileLayer('map');
                }}
              >
                {t('mobileLayers.backToMap')}
              </Button>
            </div>
          )}
        </div>
      )}

      {isMobile && mobileLayer === 'evidence' && (
        <MobileEvidenceLayer
          caseId={caseId}
          pinnedDocs={pinnedDocs.map(doc => ({ id: doc.id, label: doc.label }))}
          pinnedEntities={pinnedEntities.map(entity => ({ id: entity.id, label: entity.label }))}
          suspects={suspectEntities.map(suspect => ({ id: suspect.entity_id, name: suspect.name }))}
          suspectConfidence={suspectConfidence}
          onRemovePin={id => {
            unpinItem(caseId, id);
          }}
          onToggleSuspect={entityId => {
            toggleSuspect(caseId, entityId);
          }}
        />
      )}

      {!isMobile && (
        <NodeDetailsPanel
          caseId={caseId}
          selectedNode={selectedNode}
          onFocusNode={handleFocusNode}
          onExpandEntity={handleExpandEntity}
          onClose={handleClosePanel}
          onRemoveFromBoard={handleRemoveFromBoard}
        />
      )}

      {isMobile && (
        <div className="pointer-events-none fixed inset-x-3 bottom-3 z-30 md:hidden">
          <div className="border-border/80 bg-card/95 pointer-events-auto grid grid-cols-3 gap-1 rounded-2xl border p-1 shadow-[0_20px_34px_-24px_rgba(10,23,38,0.95)] backdrop-blur">
            {mobileLayerTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = mobileLayer === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    if (tab.id === 'details' && !selectedNode) {
                      setFeedback({
                        kind: 'info',
                        message: t('mobileLayers.selectNodePrompt'),
                      });
                      return;
                    }
                    setMobileLayer(tab.id);
                  }}
                  className={cn(
                    'inline-flex h-11 items-center justify-center gap-1 rounded-xl text-xs font-semibold transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function MobileEvidenceLayer({
  caseId,
  pinnedDocs,
  pinnedEntities,
  suspects,
  suspectConfidence,
  onRemovePin,
  onToggleSuspect,
}: MobileEvidenceLayerProps) {
  const tBoard = useTranslations('board.mobileLayers');
  const tEvidence = useTranslations('evidencePanel');
  const tNav = useTranslations('nav');
  const canSubmit = suspects.length > 0 && pinnedDocs.length > 0;
  const hasContent = suspects.length > 0 || pinnedDocs.length > 0 || pinnedEntities.length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col pb-20 md:hidden">
      <div className="ink-divider border-border/80 border-b px-4 py-3">
        <p className="font-display text-lg font-semibold">{tBoard('snapshotTitle')}</p>
        <p className="text-muted-foreground mt-1 text-xs">{tBoard('snapshotDescription')}</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3">
        <div className="bg-muted/50 border-border/70 mb-4 grid grid-cols-3 gap-2 rounded-xl border p-2 text-center">
          <div>
            <p className="text-foreground text-sm font-semibold">{suspects.length}</p>
            <p className="text-muted-foreground text-[11px] uppercase">{tEvidence('suspects')}</p>
          </div>
          <div>
            <p className="text-foreground text-sm font-semibold">{pinnedDocs.length}</p>
            <p className="text-muted-foreground text-[11px] uppercase">{tEvidence('documents')}</p>
          </div>
          <div>
            <p className="text-foreground text-sm font-semibold">{pinnedEntities.length}</p>
            <p className="text-muted-foreground text-[11px] uppercase">{tEvidence('entities')}</p>
          </div>
        </div>

        {!hasContent && (
          <div className="bg-muted/35 border-border/70 rounded-xl border border-dashed px-4 py-8 text-center">
            <p className="font-medium">{tBoard('emptyTitle')}</p>
            <p className="text-muted-foreground mt-1 text-sm">{tBoard('emptyDescription')}</p>
          </div>
        )}

        {suspects.length > 0 && (
          <div className="mb-4">
            <p className="text-muted-foreground mb-2 text-xs font-semibold uppercase">
              {tEvidence('suspects')}
            </p>
            <div className="space-y-2">
              {suspects.map(suspect => (
                <div
                  key={suspect.id}
                  className="flex items-center justify-between rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Star className="h-3.5 w-3.5 flex-shrink-0 fill-amber-500 text-amber-500" />
                    <span className="truncate text-sm font-medium">{suspect.name}</span>
                    <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
                      {suspectConfidence[suspect.id] ?? 50}%
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 flex-shrink-0"
                    onClick={() => {
                      onToggleSuspect(suspect.id);
                    }}
                    title={tEvidence('removeSuspect')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {pinnedDocs.length > 0 && (
          <div className="mb-4">
            <p className="text-muted-foreground mb-2 text-xs font-semibold uppercase">
              {tEvidence('documents')}
            </p>
            <div className="space-y-2">
              {pinnedDocs.map(doc => (
                <div
                  key={doc.id}
                  className="bg-muted/45 border-border/70 flex items-center justify-between rounded-xl border px-3 py-2"
                >
                  <span className="mr-2 truncate text-sm">{doc.label}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 flex-shrink-0"
                    onClick={() => {
                      onRemovePin(doc.id);
                    }}
                    title={tEvidence('removeEvidence')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {pinnedEntities.length > 0 && (
          <div className="mb-4">
            <p className="text-muted-foreground mb-2 text-xs font-semibold uppercase">
              {tEvidence('entities')}
            </p>
            <div className="space-y-2">
              {pinnedEntities.map(entity => (
                <div
                  key={entity.id}
                  className="bg-muted/45 border-border/70 flex items-center justify-between rounded-xl border px-3 py-2"
                >
                  <span className="mr-2 truncate text-sm">{entity.label}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 flex-shrink-0"
                    onClick={() => {
                      onRemovePin(entity.id);
                    }}
                    title={tEvidence('removeEvidence')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="ink-divider border-border/80 border-t px-4 py-3">
        {canSubmit ? (
          <Link
            href={`/cases/${caseId}/submit`}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 w-full items-center justify-center rounded-xl text-sm font-semibold"
          >
            {tNav('submit')}
          </Link>
        ) : (
          <Button className="w-full rounded-xl" disabled>
            {tNav('submit')}
          </Button>
        )}
        {!canSubmit && (
          <p className="text-muted-foreground mt-2 text-center text-xs">
            {tEvidence('requirements')}
          </p>
        )}
      </div>
    </div>
  );
}
