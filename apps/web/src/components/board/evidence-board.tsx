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
import { HypothesisNode, type HypothesisNodeData } from './hypothesis-node';
import { NodeDetailsPanel } from './node-details-panel';

import type { BoardStatePayload, Document, Entity, EvidenceReliability, GraphEdge } from '@/types';

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
    SUPPORTS: '#16a34a', // green - supports
    CONTRADICTS: '#dc2626', // red - contradicts
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

function createManualBoardEdge(params: {
  source: string;
  target: string;
  relationshipType: string;
  id?: string;
}): Edge {
  const relationshipType = params.relationshipType.trim().toUpperCase() || 'LINKED';
  return {
    id: params.id ?? `manual-${params.source}-${params.target}-${relationshipType}`,
    source: params.source,
    target: params.target,
    label: relationshipType,
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

function boardStateEdgeToReactFlowEdge(edge: BoardStatePayload['board_edges'][number]): Edge {
  const relationshipType = edge.relationship_type || edge.label || 'LINKED';
  return createManualBoardEdge({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    relationshipType,
  });
}

const nodeTypes = {
  entity: EntityNode,
  document: DocumentNode,
  hypothesis: HypothesisNode,
};

interface EvidenceBoardProps {
  caseId: string;
}

type BoardNode = Node<EntityNodeData | DocumentNodeData | HypothesisNodeData>;
type BoardEdge = Edge;
type GraphAction = 'sync' | 'hubs' | 'trace';
type MobileLayer = 'map' | 'details' | 'evidence';
type NodeTypeFilter = 'all' | 'entity' | 'document' | 'hypothesis';
type ReliabilityFilter = 'all' | EvidenceReliability;
type HypothesisStatusFilter = 'all' | HypothesisStatus;
type HypothesisStatus = 'supported' | 'contradicted' | 'missing';
interface HypothesisInsight {
  status: HypothesisStatus;
  supportScore: number;
  contradictionScore: number;
  linkedEvidence: number;
  contradictionEvidence: string[];
}
type SelectedNode =
  | { type: 'entity'; data: Entity; boardId: string }
  | { type: 'document'; data: Document; boardId: string }
  | {
      type: 'hypothesis';
      data: {
        hypothesis: string;
        status: HypothesisStatus;
        supportScore: number;
        contradictionScore: number;
        linkedEvidence: number;
        contradictionEvidence: string[];
      };
      boardId: string;
    };
interface BoardFeedback {
  kind: 'info' | 'success' | 'error';
  message: string;
  retryAction?: GraphAction;
}
interface SelectedManualEdge {
  id: string;
  source: string;
  target: string;
  relationshipType: string;
  sourceLabel: string;
  targetLabel: string;
}
interface HypothesisTrackerRow {
  boardId: string;
  label: string;
  status: HypothesisStatus;
  supportScore: number;
  contradictionScore: number;
  linkedEvidence: number;
  isVisible: boolean;
}

interface MobileEvidenceLayerProps {
  caseId: string;
  pinnedDocs: { id: string; label: string; reliability: EvidenceReliability }[];
  pinnedEntities: { id: string; label: string; reliability: EvidenceReliability }[];
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

function normalizeReliability(value: unknown): EvidenceReliability {
  if (value === 'reliable' || value === 'uncertain' || value === 'false') {
    return value;
  }
  return 'uncertain';
}

function normalizeEdgeRelationshipType(edge: BoardEdge): string {
  const raw = typeof edge.label === 'string' ? edge.label : '';
  return raw.trim() ? raw.trim().toUpperCase() : 'LINKED';
}

function buildHypothesisInsights(
  boardItems: Array<{
    id: string;
    type: 'entity' | 'document' | 'hypothesis';
    label: string;
    reliability: EvidenceReliability;
  }>,
  edges: BoardEdge[],
): Map<string, HypothesisInsight> {
  const byId = new Map(boardItems.map(item => [item.id, item]));
  const hypothesisIds = boardItems.filter(item => item.type === 'hypothesis').map(item => item.id);
  const insightById = new Map<string, HypothesisInsight>();

  for (const hypothesisId of hypothesisIds) {
    let supportScore = 0;
    let contradictionScore = 0;
    const linkedEvidenceIds = new Set<string>();
    const contradictionEvidence = new Set<string>();

    for (const edge of edges) {
      if (!edge.id.startsWith('manual-')) continue;
      const source = edge.source;
      const target = edge.target;
      const evidenceId =
        source === hypothesisId ? target : target === hypothesisId ? source : undefined;
      if (!evidenceId) continue;

      const evidenceItem = byId.get(evidenceId);
      if (!evidenceItem || (evidenceItem.type !== 'entity' && evidenceItem.type !== 'document')) {
        continue;
      }
      linkedEvidenceIds.add(evidenceId);

      const relationshipType = normalizeEdgeRelationshipType(edge);
      const reliability = normalizeReliability(evidenceItem.reliability);

      if (relationshipType === 'CONTRADICTS') {
        if (reliability === 'reliable') {
          contradictionScore += 2;
          contradictionEvidence.add(evidenceItem.label);
        } else if (reliability === 'uncertain') {
          contradictionScore += 1;
          contradictionEvidence.add(evidenceItem.label);
        }
        continue;
      }

      if (relationshipType === 'SUPPORTS' || relationshipType === 'LINKED') {
        if (reliability === 'reliable') {
          supportScore += 2;
        } else if (reliability === 'uncertain') {
          supportScore += 1;
        } else {
          contradictionScore += 1;
          contradictionEvidence.add(evidenceItem.label);
        }
        continue;
      }

      if (reliability === 'reliable') {
        supportScore += 1;
      }
    }

    let status: HypothesisStatus = 'missing';
    if (linkedEvidenceIds.size === 0) {
      status = 'missing';
    } else if (contradictionScore > supportScore) {
      status = 'contradicted';
    } else if (supportScore >= 2) {
      status = 'supported';
    } else {
      status = 'missing';
    }

    insightById.set(hypothesisId, {
      status,
      supportScore,
      contradictionScore,
      linkedEvidence: linkedEvidenceIds.size,
      contradictionEvidence: Array.from(contradictionEvidence),
    });
  }

  return insightById;
}

function getNodeSearchText(node: BoardNode): string {
  const baseLabel = typeof node.data.label === 'string' ? node.data.label : '';

  if (node.type === 'entity') {
    const data = node.data as EntityNodeData;
    return [baseLabel, data.entity.name, data.entity.entity_type].join(' ').toLowerCase();
  }

  if (node.type === 'document') {
    const data = node.data as DocumentNodeData;
    return [baseLabel, data.document.subject ?? '', data.document.doc_type, data.document.body]
      .join(' ')
      .toLowerCase();
  }

  if (node.type === 'hypothesis') {
    const data = node.data as HypothesisNodeData;
    return [baseLabel, data.status, data.contradictionEvidence.join(' ')].join(' ').toLowerCase();
  }

  return baseLabel.toLowerCase();
}

export function EvidenceBoard({ caseId }: EvidenceBoardProps) {
  const t = useTranslations('board');
  const [nodes, setNodes, onNodesChange] = useNodesState<BoardNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<BoardEdge>([]);
  const [connectionType, setConnectionType] = useState('LINKED');
  const [boardQuery, setBoardQuery] = useState('');
  const [nodeTypeFilter, setNodeTypeFilter] = useState<NodeTypeFilter>('all');
  const [reliabilityFilter, setReliabilityFilter] = useState<ReliabilityFilter>('all');
  const [hypothesisStatusFilter, setHypothesisStatusFilter] =
    useState<HypothesisStatusFilter>('all');
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
  const [selectedManualEdgeId, setSelectedManualEdgeId] = useState<string | null>(null);
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
  const setBoardItemReliability = useGameStore(state => state.setBoardItemReliability);
  const setBoardItemLabel = useGameStore(state => state.setBoardItemLabel);

  // Track which entities have been expanded to avoid loops
  const [expandedEntities, setExpandedEntities] = useState<Set<string>>(new Set());
  const casePins = useMemo(
    () => pinnedItems.filter(item => item.caseId === caseId),
    [caseId, pinnedItems],
  );
  const reliabilityByNodeId = useMemo(() => {
    return new Map(caseBoardItems.map(item => [item.id, item.reliability]));
  }, [caseBoardItems]);
  const hypothesisInsights = useMemo(
    () =>
      buildHypothesisInsights(
        caseBoardItems.map(item => ({
          id: item.id,
          type: item.type,
          label: item.label,
          reliability: item.reliability,
        })),
        edges,
      ),
    [caseBoardItems, edges],
  );
  const normalizedBoardQuery = boardQuery.trim().toLowerCase();
  const visibleNodes = useMemo(
    () =>
      nodes.filter(node => {
        if (nodeTypeFilter !== 'all' && node.type !== nodeTypeFilter) {
          return false;
        }

        if (reliabilityFilter !== 'all') {
          if (node.type === 'entity') {
            const reliability = normalizeReliability((node.data as EntityNodeData).reliability);
            if (reliability !== reliabilityFilter) {
              return false;
            }
          } else if (node.type === 'document') {
            const reliability = normalizeReliability((node.data as DocumentNodeData).reliability);
            if (reliability !== reliabilityFilter) {
              return false;
            }
          } else {
            return false;
          }
        }

        if (hypothesisStatusFilter !== 'all') {
          if (node.type !== 'hypothesis') {
            return false;
          }
          if ((node.data as HypothesisNodeData).status !== hypothesisStatusFilter) {
            return false;
          }
        }

        if (normalizedBoardQuery.length > 0) {
          return getNodeSearchText(node).includes(normalizedBoardQuery);
        }

        return true;
      }),
    [hypothesisStatusFilter, nodeTypeFilter, nodes, normalizedBoardQuery, reliabilityFilter],
  );
  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map(node => node.id)), [visibleNodes]);
  const visibleEdges = useMemo(
    () => edges.filter(edge => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)),
    [edges, visibleNodeIds],
  );
  const visibleEdgeIds = useMemo(() => new Set(visibleEdges.map(edge => edge.id)), [visibleEdges]);
  const visibleManualEdgeCount = useMemo(
    () => visibleEdges.filter(edge => edge.id.startsWith('manual-')).length,
    [visibleEdges],
  );
  const nodeLabelsById = useMemo(() => {
    return new Map(
      nodes.map(node => [
        node.id,
        typeof node.data.label === 'string' && node.data.label.trim() ? node.data.label : node.id,
      ]),
    );
  }, [nodes]);
  const selectedManualEdge = useMemo<SelectedManualEdge | null>(() => {
    if (!selectedManualEdgeId) return null;
    const edge = edges.find(candidate => candidate.id === selectedManualEdgeId);
    if (!edge || !edge.id.startsWith('manual-')) return null;
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      relationshipType: normalizeEdgeRelationshipType(edge),
      sourceLabel: nodeLabelsById.get(edge.source) ?? edge.source,
      targetLabel: nodeLabelsById.get(edge.target) ?? edge.target,
    };
  }, [edges, nodeLabelsById, selectedManualEdgeId]);
  const hypothesisTrackerRows = useMemo<HypothesisTrackerRow[]>(() => {
    const statusRank: Record<HypothesisStatus, number> = {
      contradicted: 0,
      missing: 1,
      supported: 2,
    };

    return caseBoardItems
      .filter(item => item.type === 'hypothesis')
      .map(item => {
        const hypothesisValue = item.data['hypothesis'];
        const label =
          typeof hypothesisValue === 'string' && hypothesisValue.trim()
            ? hypothesisValue
            : item.label;
        const insight = hypothesisInsights.get(item.id) ?? {
          status: 'missing' as const,
          supportScore: 0,
          contradictionScore: 0,
          linkedEvidence: 0,
          contradictionEvidence: [],
        };

        return {
          boardId: item.id,
          label,
          status: insight.status,
          supportScore: insight.supportScore,
          contradictionScore: insight.contradictionScore,
          linkedEvidence: insight.linkedEvidence,
          isVisible: visibleNodeIds.has(item.id),
        };
      })
      .sort((a, b) => {
        const statusDelta = statusRank[a.status] - statusRank[b.status];
        if (statusDelta !== 0) return statusDelta;
        const contradictionDelta = b.contradictionScore - a.contradictionScore;
        if (contradictionDelta !== 0) return contradictionDelta;
        return b.supportScore - a.supportScore;
      });
  }, [caseBoardItems, hypothesisInsights, visibleNodeIds]);
  const hypothesisTrackerCounts = useMemo(
    () =>
      hypothesisTrackerRows.reduce(
        (acc, row) => {
          acc[row.status] += 1;
          return acc;
        },
        { supported: 0, contradicted: 0, missing: 0 } as Record<HypothesisStatus, number>,
      ),
    [hypothesisTrackerRows],
  );
  const hiddenHypothesisCount = useMemo(
    () => hypothesisTrackerRows.filter(row => !row.isVisible).length,
    [hypothesisTrackerRows],
  );
  const pinnedDocs = useMemo(
    () =>
      casePins
        .filter(item => item.type === 'document' || item.type === 'chunk')
        .map(item => ({
          ...item,
          reliability: reliabilityByNodeId.get(`document-${item.id}`) ?? 'uncertain',
        })),
    [casePins, reliabilityByNodeId],
  );
  const pinnedEntities = useMemo(
    () =>
      casePins
        .filter(item => item.type === 'entity')
        .map(item => ({
          ...item,
          reliability: reliabilityByNodeId.get(`entity-${item.id}`) ?? 'uncertain',
        })),
    [casePins, reliabilityByNodeId],
  );
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
    if (selectedNode?.type !== 'hypothesis') return;
    const selectedId = selectedNode.boardId;
    const insight = hypothesisInsights.get(selectedId) ?? {
      status: 'missing' as const,
      supportScore: 0,
      contradictionScore: 0,
      linkedEvidence: 0,
      contradictionEvidence: [],
    };
    const item = caseBoardItems.find(boardItem => boardItem.id === selectedId);
    const rawHypothesis = item?.data['hypothesis'];
    const hypothesisText =
      typeof rawHypothesis === 'string' && rawHypothesis.trim()
        ? rawHypothesis
        : selectedNode.data.hypothesis;

    const changed =
      selectedNode.data.hypothesis !== hypothesisText ||
      selectedNode.data.status !== insight.status ||
      selectedNode.data.supportScore !== insight.supportScore ||
      selectedNode.data.contradictionScore !== insight.contradictionScore ||
      selectedNode.data.linkedEvidence !== insight.linkedEvidence ||
      selectedNode.data.contradictionEvidence.join('|') !== insight.contradictionEvidence.join('|');

    if (!changed) return;

    setSelectedNode({
      type: 'hypothesis',
      boardId: selectedId,
      data: {
        hypothesis: hypothesisText,
        status: insight.status,
        supportScore: insight.supportScore,
        contradictionScore: insight.contradictionScore,
        linkedEvidence: insight.linkedEvidence,
        contradictionEvidence: insight.contradictionEvidence,
      },
    });
  }, [caseBoardItems, hypothesisInsights, selectedNode]);

  useEffect(() => {
    if (!selectedNode) return;
    if (visibleNodeIds.has(selectedNode.boardId)) return;
    setSelectedNode(null);
    if (isMobile && mobileLayer === 'details') {
      setMobileLayer('map');
    }
  }, [isMobile, mobileLayer, selectedNode, visibleNodeIds]);

  useEffect(() => {
    if (!selectedManualEdgeId) return;
    const edgeStillExists = edges.some(
      edge => edge.id === selectedManualEdgeId && edge.id.startsWith('manual-'),
    );
    if (!edgeStillExists) {
      setSelectedManualEdgeId(null);
    }
  }, [edges, selectedManualEdgeId]);

  useEffect(() => {
    if (!selectedManualEdgeId) return;
    if (!visibleEdgeIds.has(selectedManualEdgeId)) {
      setSelectedManualEdgeId(null);
    }
  }, [selectedManualEdgeId, visibleEdgeIds]);

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
            boardId: item.id,
            reliability: item.reliability,
          },
        } as BoardNode);
        continue;
      }

      if (item.type === 'hypothesis') {
        const hypothesisValue = item.data['hypothesis'];
        const hypothesisText =
          typeof hypothesisValue === 'string' && hypothesisValue.trim()
            ? hypothesisValue
            : item.label;
        const insight = hypothesisInsights.get(item.id) ?? {
          status: 'missing',
          supportScore: 0,
          contradictionScore: 0,
          linkedEvidence: 0,
          contradictionEvidence: [],
        };
        nextNodes.push({
          id: item.id,
          type: 'hypothesis',
          position: item.position,
          data: {
            boardId: item.id,
            caseId,
            label: hypothesisText,
            status: insight.status,
            supportScore: insight.supportScore,
            contradictionScore: insight.contradictionScore,
            linkedEvidence: insight.linkedEvidence,
            contradictionEvidence: insight.contradictionEvidence,
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
          boardId: item.id,
          reliability: item.reliability,
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
  }, [caseBoardItems, caseId, documentsById, entitiesById, hypothesisInsights, setEdges, setNodes]);

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
          (change.id.startsWith('entity-') ||
            change.id.startsWith('document-') ||
            change.id.startsWith('hypothesis-'))
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
    (
      _event: React.MouseEvent,
      node: Node<EntityNodeData | DocumentNodeData | HypothesisNodeData>,
    ) => {
      setSelectedManualEdgeId(null);
      if (node.type === 'entity') {
        const entityData = node.data as EntityNodeData;
        setSelectedNode({ type: 'entity', data: entityData.entity, boardId: entityData.boardId });
      } else if (node.type === 'document') {
        const docData = node.data as DocumentNodeData;
        setSelectedNode({ type: 'document', data: docData.document, boardId: docData.boardId });
      } else if (node.type === 'hypothesis') {
        const hypothesisData = node.data as HypothesisNodeData;
        setSelectedNode({
          type: 'hypothesis',
          data: {
            hypothesis: hypothesisData.label,
            status: hypothesisData.status,
            supportScore: hypothesisData.supportScore,
            contradictionScore: hypothesisData.contradictionScore,
            linkedEvidence: hypothesisData.linkedEvidence,
            contradictionEvidence: hypothesisData.contradictionEvidence,
          },
          boardId: hypothesisData.boardId,
        });
      }
      if (isMobile) {
        setMobileLayer('details');
      }
    },
    [isMobile],
  );

  const handleEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: BoardEdge) => {
      if (!edge.id.startsWith('manual-')) {
        setSelectedManualEdgeId(null);
        return;
      }
      setSelectedNode(null);
      setSelectedManualEdgeId(edge.id);
      if (isMobile) {
        setMobileLayer('map');
      }
    },
    [isMobile],
  );

  const handlePaneClick = useCallback(() => {
    setSelectedManualEdgeId(null);
  }, []);

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

  const addHypothesisNode = useCallback(() => {
    const hypothesisId = `hypothesis-${Date.now().toString()}-${Math.random().toString(36).slice(2, 7)}`;
    const label = t('hypothesis.defaultText');
    addToBoard({
      id: hypothesisId,
      type: 'hypothesis',
      caseId,
      label,
      data: { hypothesis: label },
      position: {
        x: 320 + Math.random() * 80,
        y: 120 + Math.random() * 60,
      },
    });
    setSelectedNode({
      type: 'hypothesis',
      boardId: hypothesisId,
      data: {
        hypothesis: label,
        status: 'missing',
        supportScore: 0,
        contradictionScore: 0,
        linkedEvidence: 0,
        contradictionEvidence: [],
      },
    });
    if (isMobile) {
      setMobileLayer('details');
    }
  }, [addToBoard, caseId, isMobile, t]);

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
    setSelectedManualEdgeId(null);
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
    (
      _event: React.MouseEvent,
      node: Node<EntityNodeData | DocumentNodeData | HypothesisNodeData>,
    ) => {
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
      const newEdge = createManualBoardEdge({
        id: edgeId,
        source: connection.source,
        target: connection.target,
        relationshipType: connectionType,
      });

      setEdges(currentEdges => {
        if (currentEdges.some(edge => edge.id === edgeId)) {
          return currentEdges;
        }
        return [...currentEdges, newEdge];
      });
      setSelectedManualEdgeId(edgeId);
    },
    [connectionType, setEdges],
  );

  const handleDeleteSelectedEdge = useCallback(() => {
    if (!selectedManualEdge) return;
    setEdges(currentEdges => currentEdges.filter(edge => edge.id !== selectedManualEdge.id));
    setSelectedManualEdgeId(null);
  }, [selectedManualEdge, setEdges]);

  const handleUpdateSelectedEdgeRelationship = useCallback(
    (relationshipType: string) => {
      if (!selectedManualEdge) return;

      const nextRelationshipType = relationshipType.trim().toUpperCase() || 'LINKED';
      if (nextRelationshipType === selectedManualEdge.relationshipType) return;

      const nextId = `manual-${selectedManualEdge.source}-${selectedManualEdge.target}-${nextRelationshipType}`;

      setEdges(currentEdges => {
        const duplicateExists = currentEdges.some(
          edge => edge.id === nextId && edge.id !== selectedManualEdge.id,
        );
        const withoutCurrent = currentEdges.filter(edge => edge.id !== selectedManualEdge.id);
        if (duplicateExists) {
          return withoutCurrent;
        }

        const insertAt = currentEdges.findIndex(edge => edge.id === selectedManualEdge.id);
        const replacement = createManualBoardEdge({
          id: nextId,
          source: selectedManualEdge.source,
          target: selectedManualEdge.target,
          relationshipType: nextRelationshipType,
        });

        if (insertAt < 0) {
          return [...withoutCurrent, replacement];
        }

        return [
          ...withoutCurrent.slice(0, insertAt),
          replacement,
          ...withoutCurrent.slice(insertAt),
        ];
      });

      setSelectedManualEdgeId(nextId);
    },
    [selectedManualEdge, setEdges],
  );

  const handleRemoveFromBoard = useCallback(
    (id: string) => {
      const boardIds = new Set([id, `entity-${id}`, `document-${id}`, `hypothesis-${id}`]);
      boardIds.forEach(boardId => {
        removeFromBoard(caseId, boardId);
      });
      setNodes(nds => nds.filter(n => !boardIds.has(n.id)));
      setEdges(eds => eds.filter(e => !boardIds.has(e.source) && !boardIds.has(e.target)));
      setSelectedNode(null);
      setSelectedManualEdgeId(null);
    },
    [caseId, removeFromBoard, setEdges, setNodes],
  );

  const handleClosePanel = useCallback(() => {
    setSelectedNode(null);
    if (isMobile) {
      setMobileLayer('map');
    }
  }, [isMobile]);

  const handleClearFilters = useCallback(() => {
    setBoardQuery('');
    setNodeTypeFilter('all');
    setReliabilityFilter('all');
    setHypothesisStatusFilter('all');
  }, []);

  const handleOpenHypothesisFromTracker = useCallback(
    (boardId: string) => {
      const item = caseBoardItems.find(
        boardItem => boardItem.id === boardId && boardItem.type === 'hypothesis',
      );
      if (!item) return;

      const hypothesisValue = item.data['hypothesis'];
      const hypothesisText =
        typeof hypothesisValue === 'string' && hypothesisValue.trim()
          ? hypothesisValue
          : item.label;
      const insight = hypothesisInsights.get(boardId) ?? {
        status: 'missing' as const,
        supportScore: 0,
        contradictionScore: 0,
        linkedEvidence: 0,
        contradictionEvidence: [],
      };

      setSelectedManualEdgeId(null);
      setSelectedNode({
        type: 'hypothesis',
        boardId,
        data: {
          hypothesis: hypothesisText,
          status: insight.status,
          supportScore: insight.supportScore,
          contradictionScore: insight.contradictionScore,
          linkedEvidence: insight.linkedEvidence,
          contradictionEvidence: insight.contradictionEvidence,
        },
      });

      if (isMobile) {
        setMobileLayer('map');
      }

      if (!visibleNodeIds.has(boardId)) {
        handleClearFilters();
        window.setTimeout(() => {
          focusSingleNode(boardId);
        }, 100);
      } else {
        focusSingleNode(boardId);
      }

      setFeedback({
        kind: 'info',
        message: t('feedback.focusedNode'),
      });
    },
    [
      caseBoardItems,
      focusSingleNode,
      handleClearFilters,
      hypothesisInsights,
      isMobile,
      t,
      visibleNodeIds,
    ],
  );

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
          onAddHypothesis={addHypothesisNode}
          onClearBoard={handleClearBoard}
          onAutoLayout={handleAutoLayout}
          onSearch={handleSearch}
          boardQuery={boardQuery}
          onBoardQueryChange={setBoardQuery}
          nodeTypeFilter={nodeTypeFilter}
          onNodeTypeFilterChange={setNodeTypeFilter}
          reliabilityFilter={reliabilityFilter}
          onReliabilityFilterChange={setReliabilityFilter}
          hypothesisStatusFilter={hypothesisStatusFilter}
          onHypothesisStatusFilterChange={setHypothesisStatusFilter}
          onClearFilters={handleClearFilters}
          connectionType={connectionType}
          onConnectionTypeChange={setConnectionType}
          isLoading={isLoading}
          suspectCount={suspectedEntities.length}
          nodeCount={nodes.length}
          visibleNodeCount={visibleNodes.length}
          edgeCount={visibleEdges.length}
          manualEdgeCount={visibleManualEdgeCount}
        />

        {hypothesisTrackerRows.length > 0 && (
          <div className="ink-divider border-border/70 bg-muted/25 border-b px-3 py-2 md:px-4">
            <div className="mb-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.11em]">
                  {t('hypothesisTracker.title')}
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {t('hypothesisTracker.summary', {
                    supported: hypothesisTrackerCounts.supported,
                    contradicted: hypothesisTrackerCounts.contradicted,
                    missing: hypothesisTrackerCounts.missing,
                  })}
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-emerald-800">
                  <CheckCircle2 className="h-3 w-3" />
                  {hypothesisTrackerCounts.supported}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/25 bg-rose-500/10 px-2 py-0.5 text-rose-800">
                  <AlertCircle className="h-3 w-3" />
                  {hypothesisTrackerCounts.contradicted}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-amber-800">
                  <CircleDashed className="h-3 w-3" />
                  {hypothesisTrackerCounts.missing}
                </span>
                {hiddenHypothesisCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={handleClearFilters}
                  >
                    {t('hypothesisTracker.showAll', { count: hiddenHypothesisCount })}
                  </Button>
                )}
              </div>
            </div>

            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              {hypothesisTrackerRows.map(row => {
                const statusClass =
                  row.status === 'supported'
                    ? 'border-emerald-500/30 bg-emerald-500/10'
                    : row.status === 'contradicted'
                      ? 'border-rose-500/30 bg-rose-500/10'
                      : 'border-amber-500/30 bg-amber-500/10';
                const isSelected =
                  selectedNode?.type === 'hypothesis' && selectedNode.boardId === row.boardId;

                return (
                  <button
                    key={row.boardId}
                    type="button"
                    onClick={() => {
                      handleOpenHypothesisFromTracker(row.boardId);
                    }}
                    className={cn(
                      'bg-card/90 hover:bg-card min-w-[220px] max-w-[260px] rounded-xl border px-3 py-2 text-left shadow-sm transition-colors',
                      statusClass,
                      isSelected && 'ring-primary ring-2 ring-offset-1',
                      !row.isVisible && 'opacity-80',
                    )}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.08em]">
                        {t(`hypothesis.status.${row.status}`)}
                      </span>
                      {!row.isVisible && (
                        <span className="text-muted-foreground border-border/70 rounded-full border px-1.5 py-0.5 text-[10px]">
                          {t('hypothesisTracker.hidden')}
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-2 text-sm font-medium">{row.label}</p>
                    <div className="text-muted-foreground mt-2 flex items-center justify-between text-[11px]">
                      <span>
                        {t('hypothesis.scores', {
                          support: row.supportScore,
                          contradiction: row.contradictionScore,
                        })}
                      </span>
                      <span>{row.linkedEvidence}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

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
          {selectedManualEdge && (
            <div className="bg-card/95 border-border/80 absolute right-3 top-3 z-20 w-[min(320px,92%)] rounded-xl border p-3 shadow-md backdrop-blur">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em]">
                    {t('edgeEditor.title')}
                  </p>
                  <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                    {selectedManualEdge.sourceLabel} → {selectedManualEdge.targetLabel}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={t('feedback.dismiss')}
                  className="rounded p-0.5 opacity-80 transition-opacity hover:opacity-100"
                  onClick={() => {
                    setSelectedManualEdgeId(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <label className="text-muted-foreground mb-1 block text-xs font-medium">
                {t('edgeEditor.relationship')}
              </label>
              <select
                value={selectedManualEdge.relationshipType}
                onChange={event => {
                  handleUpdateSelectedEdgeRelationship(event.target.value);
                }}
                className="bg-background border-border/80 h-9 w-full rounded-md border px-2 text-sm"
              >
                <option value="LINKED">{t('relationships.LINKED')}</option>
                <option value="SUPPORTS">{t('relationships.SUPPORTS')}</option>
                <option value="CONTRADICTS">{t('relationships.CONTRADICTS')}</option>
                <option value="SENT">{t('relationships.SENT')}</option>
                <option value="MENTIONS">{t('relationships.MENTIONS')}</option>
                <option value="APPROVED">{t('relationships.APPROVED')}</option>
                <option value="PAID_TO">{t('relationships.PAID_TO')}</option>
                <option value="WORKS_AT">{t('relationships.WORKS_AT')}</option>
              </select>

              <div className="mt-3 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive gap-1.5"
                  onClick={handleDeleteSelectedEdge}
                >
                  <Trash2 className="h-4 w-4" />
                  {t('edgeEditor.delete')}
                </Button>
              </div>
            </div>
          )}
          {nodes.length === 0 ? (
            <EmptyBoardState caseId={caseId} onSuggestionClick={handleSearch} />
          ) : visibleNodes.length === 0 ? (
            <div className="flex h-full items-center justify-center px-6">
              <div className="bg-card/90 border-border/80 w-full max-w-md rounded-2xl border px-5 py-6 text-center shadow-sm">
                <p className="font-display text-lg font-semibold">{t('filters.emptyTitle')}</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {t('filters.emptyDescription')}
                </p>
                <Button variant="outline" className="mt-4" onClick={handleClearFilters}>
                  {t('filters.clear')}
                </Button>
              </div>
            </div>
          ) : (
            <ReactFlow
              style={{ width: '100%', height: '100%' }}
              nodes={visibleNodes}
              edges={visibleEdges}
              onInit={instance => {
                reactFlowRef.current = instance;
              }}
              onNodesChange={handleNodesChange}
              onEdgesChange={handleEdgesChange}
              onConnect={handleConnect}
              onPaneClick={handlePaneClick}
              onNodeClick={handleNodeClick}
              onEdgeClick={handleEdgeClick}
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
              onSetReliability={(id, reliability) => {
                setBoardItemReliability(caseId, id, reliability);
              }}
              onUpdateHypothesis={(id, text) => {
                setBoardItemLabel(caseId, id, text);
                const insight = hypothesisInsights.get(id) ?? {
                  status: 'missing',
                  supportScore: 0,
                  contradictionScore: 0,
                  linkedEvidence: 0,
                  contradictionEvidence: [],
                };
                setSelectedNode({
                  type: 'hypothesis',
                  boardId: id,
                  data: {
                    hypothesis: text,
                    status: insight.status,
                    supportScore: insight.supportScore,
                    contradictionScore: insight.contradictionScore,
                    linkedEvidence: insight.linkedEvidence,
                    contradictionEvidence: insight.contradictionEvidence,
                  },
                });
              }}
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
          pinnedDocs={pinnedDocs.map(doc => ({
            id: doc.id,
            label: doc.label,
            reliability: doc.reliability,
          }))}
          pinnedEntities={pinnedEntities.map(entity => ({
            id: entity.id,
            label: entity.label,
            reliability: entity.reliability,
          }))}
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
          onSetReliability={(id, reliability) => {
            setBoardItemReliability(caseId, id, reliability);
          }}
          onUpdateHypothesis={(id, text) => {
            setBoardItemLabel(caseId, id, text);
            const insight = hypothesisInsights.get(id) ?? {
              status: 'missing',
              supportScore: 0,
              contradictionScore: 0,
              linkedEvidence: 0,
              contradictionEvidence: [],
            };
            setSelectedNode({
              type: 'hypothesis',
              boardId: id,
              data: {
                hypothesis: text,
                status: insight.status,
                supportScore: insight.supportScore,
                contradictionScore: insight.contradictionScore,
                linkedEvidence: insight.linkedEvidence,
                contradictionEvidence: insight.contradictionEvidence,
              },
            });
          }}
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
  const tReliability = useTranslations('board.reliability');
  const canSubmit = suspects.length > 0 && pinnedDocs.length > 0;
  const hasContent = suspects.length > 0 || pinnedDocs.length > 0 || pinnedEntities.length > 0;

  const getReliabilityLabel = (reliability: EvidenceReliability): string => {
    if (reliability === 'reliable') return tReliability('reliable');
    if (reliability === 'false') return tReliability('false');
    return tReliability('uncertain');
  };

  const getReliabilityClass = (reliability: EvidenceReliability): string => {
    if (reliability === 'reliable') {
      return 'border-emerald-500/30 bg-emerald-500/12 text-emerald-700';
    }
    if (reliability === 'false') {
      return 'border-rose-500/30 bg-rose-500/12 text-rose-700';
    }
    return 'border-amber-500/30 bg-amber-500/12 text-amber-700';
  };

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
                  <div className="mr-2 min-w-0">
                    <span className="block truncate text-sm">{doc.label}</span>
                    <span
                      className={cn(
                        'mt-1 inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold',
                        getReliabilityClass(doc.reliability),
                      )}
                    >
                      {getReliabilityLabel(doc.reliability)}
                    </span>
                  </div>
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
                  <div className="mr-2 min-w-0">
                    <span className="block truncate text-sm">{entity.label}</span>
                    <span
                      className={cn(
                        'mt-1 inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold',
                        getReliabilityClass(entity.reliability),
                      )}
                    >
                      {getReliabilityLabel(entity.reliability)}
                    </span>
                  </div>
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
