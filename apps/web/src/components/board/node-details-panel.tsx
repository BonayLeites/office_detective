'use client';

import { ExternalLink, Focus, Network, Pin, Star, Trash2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import type { Document, Entity, EvidenceReliability } from '@/types';

import { DocumentTypeBadge } from '@/components/documents/document-type-badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { useGameStore } from '@/stores/game-store';

interface NodeDetailsPanelProps {
  caseId: string;
  selectedNode:
    | { type: 'entity'; data: Entity; boardId: string }
    | { type: 'document'; data: Document; boardId: string }
    | {
        type: 'hypothesis';
        data: {
          hypothesis: string;
          status: 'supported' | 'contradicted' | 'missing';
          supportScore: number;
          contradictionScore: number;
          linkedEvidence: number;
          contradictionEvidence: string[];
        };
        boardId: string;
      }
    | null;
  onFocusNode: (nodeId: string) => void;
  onExpandEntity: (entityId: string) => void;
  onSetReliability: (id: string, reliability: EvidenceReliability) => void;
  onUpdateHypothesis: (id: string, text: string) => void;
  onClose: () => void;
  onRemoveFromBoard: (id: string) => void;
  mobileInline?: boolean;
}

export function NodeDetailsPanel({
  caseId,
  selectedNode,
  onFocusNode,
  onExpandEntity,
  onSetReliability,
  onUpdateHypothesis,
  onClose,
  onRemoveFromBoard,
  mobileInline = false,
}: NodeDetailsPanelProps) {
  const t = useTranslations('board');

  if (!selectedNode) {
    return null;
  }

  return (
    <div
      className={cn(
        'paper-panel border-border/80 flex flex-col',
        mobileInline
          ? 'h-full rounded-none border-0'
          : 'fixed inset-x-2 bottom-2 top-20 z-40 rounded-2xl border md:static md:inset-auto md:h-full md:w-80 md:rounded-none md:border-l md:border-t-0',
      )}
    >
      {/* Header */}
      <div className="ink-divider border-border/80 flex items-center justify-between border-b px-4 py-3">
        <h3 className="font-semibold">
          {selectedNode.type === 'entity'
            ? t('quickActions.entityDetails')
            : selectedNode.type === 'document'
              ? t('quickActions.documentDetails')
              : t('hypothesis.detailsTitle')}
        </h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-4">
        {selectedNode.type === 'entity' ? (
          <EntityDetails
            entity={selectedNode.data}
            boardId={selectedNode.boardId}
            caseId={caseId}
            onFocusNode={onFocusNode}
            onExpandEntity={onExpandEntity}
            onSetReliability={onSetReliability}
            onRemove={() => {
              onRemoveFromBoard(selectedNode.data.entity_id);
            }}
          />
        ) : selectedNode.type === 'document' ? (
          <DocumentDetails
            document={selectedNode.data}
            boardId={selectedNode.boardId}
            caseId={caseId}
            onFocusNode={onFocusNode}
            onSetReliability={onSetReliability}
            onRemove={() => {
              onRemoveFromBoard(selectedNode.data.doc_id);
            }}
          />
        ) : (
          <HypothesisDetails
            hypothesis={selectedNode.data.hypothesis}
            status={selectedNode.data.status}
            supportScore={selectedNode.data.supportScore}
            contradictionScore={selectedNode.data.contradictionScore}
            linkedEvidence={selectedNode.data.linkedEvidence}
            contradictionEvidence={selectedNode.data.contradictionEvidence}
            boardId={selectedNode.boardId}
            onFocusNode={onFocusNode}
            onUpdateHypothesis={onUpdateHypothesis}
            onRemove={() => {
              onRemoveFromBoard(selectedNode.boardId);
            }}
          />
        )}
      </ScrollArea>
    </div>
  );
}

function getConfidenceLabel(
  confidence: number,
  labels: { veryHigh: string; high: string; medium: string; low: string },
): string {
  if (confidence >= 80) return labels.veryHigh;
  if (confidence >= 60) return labels.high;
  if (confidence >= 40) return labels.medium;
  return labels.low;
}

function getReliabilityStyle(reliability: EvidenceReliability, active: boolean): string {
  if (reliability === 'reliable') {
    return active
      ? 'border-emerald-600 bg-emerald-500/18 text-emerald-900'
      : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15';
  }
  if (reliability === 'false') {
    return active
      ? 'border-rose-600 bg-rose-500/18 text-rose-900'
      : 'border-rose-500/30 bg-rose-500/10 text-rose-700 hover:bg-rose-500/15';
  }
  return active
    ? 'border-amber-600 bg-amber-500/18 text-amber-900'
    : 'border-amber-500/30 bg-amber-500/10 text-amber-700 hover:bg-amber-500/15';
}

function ReliabilitySection({
  reliability,
  onChange,
}: {
  reliability: EvidenceReliability;
  onChange: (reliability: EvidenceReliability) => void;
}) {
  const t = useTranslations('board.reliability');
  const options: EvidenceReliability[] = ['reliable', 'uncertain', 'false'];

  return (
    <div className="space-y-2 rounded-xl border border-slate-400/25 bg-slate-100/35 p-3">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">
          {t('title')}
        </p>
        <p className="text-xs text-slate-600">{t('helper')}</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {options.map(option => (
          <button
            key={option}
            type="button"
            onClick={() => {
              onChange(option);
            }}
            className={cn(
              'rounded-md border px-2 py-1.5 text-xs font-semibold transition-colors',
              getReliabilityStyle(option, reliability === option),
            )}
          >
            {t(option)}
          </button>
        ))}
      </div>
    </div>
  );
}

function EntityDetails({
  entity,
  boardId,
  caseId,
  onFocusNode,
  onExpandEntity,
  onSetReliability,
  onRemove,
}: {
  entity: Entity;
  boardId: string;
  caseId: string;
  onFocusNode: (nodeId: string) => void;
  onExpandEntity: (entityId: string) => void;
  onSetReliability: (id: string, reliability: EvidenceReliability) => void;
  onRemove: () => void;
}) {
  const t = useTranslations('board');
  const pinItem = useGameStore(state => state.pinItem);
  const unpinItem = useGameStore(state => state.unpinItem);
  const toggleSuspect = useGameStore(state => state.toggleSuspect);
  const setSuspectConfidence = useGameStore(state => state.setSuspectConfidence);
  const pinned = useGameStore(state =>
    state.pinnedItems.some(p => p.caseId === caseId && p.id === entity.entity_id),
  );
  const suspected = useGameStore(state =>
    state.getSuspectedEntities(caseId).includes(entity.entity_id),
  );
  const confidence = useGameStore(
    state => state.getSuspectConfidenceMap(caseId)[entity.entity_id] ?? 50,
  );
  const reliability = useGameStore(
    state =>
      state.boardItems.find(item => item.caseId === caseId && item.id === boardId)?.reliability ??
      'uncertain',
  );
  const isPerson = entity.entity_type === 'person';

  const handlePin = () => {
    if (pinned) {
      unpinItem(caseId, entity.entity_id);
    } else {
      pinItem({
        id: entity.entity_id,
        type: 'entity',
        caseId,
        label: entity.name,
        data: entity as unknown as Record<string, unknown>,
      });
    }
  };

  const handleSuspect = () => {
    toggleSuspect(caseId, entity.entity_id);
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-lg font-medium">{entity.name}</h4>
        <span className="text-muted-foreground text-sm capitalize">{entity.entity_type}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => {
            onFocusNode(`entity-${entity.entity_id}`);
          }}
        >
          <Focus className="h-4 w-4" />
          {t('quickActions.focusNode')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => {
            onExpandEntity(entity.entity_id);
          }}
        >
          <Network className="h-4 w-4" />
          {t('quickActions.expandConnections')}
        </Button>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {isPerson && (
          <Button
            variant={suspected ? 'default' : 'outline'}
            size="sm"
            onClick={handleSuspect}
            className={cn('flex-1 gap-2', suspected && 'bg-yellow-500 hover:bg-yellow-600')}
          >
            <Star className={cn('h-4 w-4', suspected && 'fill-current')} />
            {suspected
              ? `${t('quickActions.unmarkSuspect')} (${confidence.toString()}%)`
              : t('quickActions.markSuspect')}
          </Button>
        )}
        <Button
          variant={pinned ? 'default' : 'outline'}
          size="sm"
          onClick={handlePin}
          className={cn('flex-1 gap-2', pinned && 'bg-blue-500 hover:bg-blue-600')}
        >
          <Pin className={cn('h-4 w-4', pinned && 'fill-current')} />
          {pinned ? t('quickActions.unpinEvidence') : t('quickActions.pinEvidence')}
        </Button>
      </div>

      {isPerson && suspected && (
        <div className="space-y-2 rounded-xl border border-amber-500/35 bg-amber-500/10 p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase text-amber-900">
              {t('quickActions.confidence')}
            </p>
            <p className="text-sm font-semibold text-amber-900">{confidence}%</p>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={confidence}
            onChange={event => {
              setSuspectConfidence(caseId, entity.entity_id, Number(event.target.value));
            }}
            className="w-full accent-amber-600"
          />
          <p className="text-xs text-amber-800/90">
            {t('quickActions.currentLevel')}:{' '}
            <strong>
              {getConfidenceLabel(confidence, {
                veryHigh: t('quickActions.levelVeryHigh'),
                high: t('quickActions.levelHigh'),
                medium: t('quickActions.levelMedium'),
                low: t('quickActions.levelLow'),
              })}
            </strong>
          </p>
        </div>
      )}

      <ReliabilitySection
        reliability={reliability}
        onChange={nextReliability => {
          onSetReliability(boardId, nextReliability);
        }}
      />

      <div>
        <h5 className="text-muted-foreground mb-1 text-xs font-semibold uppercase">
          {t('quickActions.attributes')}
        </h5>
        <div className="space-y-1">
          {Object.entries(entity.attrs_json).map(([key, value]) => (
            <div key={key} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{key}:</span>
              <span className="font-mono text-xs">{String(value)}</span>
            </div>
          ))}
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="text-destructive hover:text-destructive w-full gap-2"
      >
        <Trash2 className="h-4 w-4" />
        {t('quickActions.removeFromBoard')}
      </Button>
    </div>
  );
}

function DocumentDetails({
  document,
  boardId,
  caseId,
  onFocusNode,
  onSetReliability,
  onRemove,
}: {
  document: Document;
  boardId: string;
  caseId: string;
  onFocusNode: (nodeId: string) => void;
  onSetReliability: (id: string, reliability: EvidenceReliability) => void;
  onRemove: () => void;
}) {
  const t = useTranslations('board');
  const pinItem = useGameStore(state => state.pinItem);
  const unpinItem = useGameStore(state => state.unpinItem);
  const pinned = useGameStore(state =>
    state.pinnedItems.some(p => p.caseId === caseId && p.id === document.doc_id),
  );
  const reliability = useGameStore(
    state =>
      state.boardItems.find(item => item.caseId === caseId && item.id === boardId)?.reliability ??
      'uncertain',
  );

  const handlePin = () => {
    if (pinned) {
      unpinItem(caseId, document.doc_id);
    } else {
      pinItem({
        id: document.doc_id,
        type: 'document',
        caseId,
        label: document.subject ?? document.doc_type,
        data: document as unknown as Record<string, unknown>,
      });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1">
          <DocumentTypeBadge docType={document.doc_type} />
        </div>
        {document.subject && <h4 className="font-medium">{document.subject}</h4>}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => {
            onFocusNode(`document-${document.doc_id}`);
          }}
        >
          <Focus className="h-4 w-4" />
          {t('quickActions.focusNode')}
        </Button>
        <Link href={`/cases/${caseId}/inbox?doc=${document.doc_id}`} className="w-full">
          <Button variant="outline" size="sm" className="w-full gap-2">
            <ExternalLink className="h-4 w-4" />
            {t('quickActions.openInInbox')}
          </Button>
        </Link>
      </div>

      {/* Action button */}
      <Button
        variant={pinned ? 'default' : 'outline'}
        size="sm"
        onClick={handlePin}
        className={cn('w-full gap-2', pinned && 'bg-blue-500 hover:bg-blue-600')}
      >
        <Pin className={cn('h-4 w-4', pinned && 'fill-current')} />
        {pinned ? t('quickActions.unpinEvidence') : t('quickActions.pinEvidence')}
      </Button>

      <ReliabilitySection
        reliability={reliability}
        onChange={nextReliability => {
          onSetReliability(boardId, nextReliability);
        }}
      />

      <div>
        <h5 className="text-muted-foreground mb-1 text-xs font-semibold uppercase">ID</h5>
        <code className="bg-muted rounded px-2 py-1 text-xs">{document.doc_id}</code>
      </div>

      <div>
        <h5 className="text-muted-foreground mb-1 text-xs font-semibold uppercase">
          {t('quickActions.timestamp')}
        </h5>
        <p className="text-sm">{new Date(document.ts).toLocaleString()}</p>
      </div>

      <div>
        <h5 className="text-muted-foreground mb-1 text-xs font-semibold uppercase">
          {t('quickActions.content')}
        </h5>
        <div className="bg-muted/30 rounded-md border p-3">
          <pre className="text-foreground whitespace-pre-wrap font-sans text-sm">
            {document.body}
          </pre>
        </div>
      </div>

      <div className="flex gap-2">
        <Link href={`/cases/${caseId}/inbox?doc=${document.doc_id}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full gap-2">
            <ExternalLink className="h-4 w-4" />
            {t('quickActions.viewInInbox')}
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="text-destructive hover:text-destructive gap-2"
        >
          <Trash2 className="h-4 w-4" />
          {t('quickActions.removeFromBoard')}
        </Button>
      </div>
    </div>
  );
}

function HypothesisDetails({
  hypothesis,
  status,
  supportScore,
  contradictionScore,
  linkedEvidence,
  contradictionEvidence,
  boardId,
  onFocusNode,
  onUpdateHypothesis,
  onRemove,
}: {
  hypothesis: string;
  status: 'supported' | 'contradicted' | 'missing';
  supportScore: number;
  contradictionScore: number;
  linkedEvidence: number;
  contradictionEvidence: string[];
  boardId: string;
  onFocusNode: (nodeId: string) => void;
  onUpdateHypothesis: (id: string, text: string) => void;
  onRemove: () => void;
}) {
  const t = useTranslations('board');
  const tStatus = useTranslations('board.hypothesis.status');
  const [draft, setDraft] = useState(hypothesis);

  useEffect(() => {
    setDraft(hypothesis);
  }, [hypothesis]);

  const trimmed = draft.trim();
  const canSave = trimmed.length >= 6;

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-lg font-medium">{t('hypothesis.detailsTitle')}</h4>
        <p className="text-muted-foreground text-sm">{t('hypothesis.helper')}</p>
      </div>

      <div
        className={cn(
          'rounded-xl border px-3 py-2',
          status === 'supported'
            ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-900'
            : status === 'contradicted'
              ? 'border-rose-500/35 bg-rose-500/10 text-rose-900'
              : 'border-amber-500/35 bg-amber-500/10 text-amber-900',
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">{tStatus(status)}</p>
          <p className="text-xs font-semibold">
            {t('hypothesis.scores', {
              support: supportScore,
              contradiction: contradictionScore,
            })}
          </p>
        </div>
        <p className="mt-1 text-xs">
          {t('hypothesis.links', {
            count: linkedEvidence,
          })}
        </p>
        {contradictionEvidence.length > 0 && (
          <p className="mt-1 text-xs">
            {t('hypothesis.contradictions', {
              evidence: contradictionEvidence.slice(0, 3).join(', '),
            })}
          </p>
        )}
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full gap-2"
        onClick={() => {
          onFocusNode(boardId);
        }}
      >
        <Focus className="h-4 w-4" />
        {t('quickActions.focusNode')}
      </Button>

      <div>
        <h5 className="text-muted-foreground mb-1 text-xs font-semibold uppercase">
          {t('hypothesis.label')}
        </h5>
        <textarea
          value={draft}
          onChange={event => {
            setDraft(event.target.value);
          }}
          className="border-border/80 bg-background min-h-[120px] w-full rounded-md border px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          placeholder={t('hypothesis.placeholder')}
        />
        <p className="text-muted-foreground mt-1 text-xs">{t('hypothesis.minLength')}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!canSave}
          onClick={() => {
            if (!canSave) return;
            onUpdateHypothesis(boardId, trimmed);
          }}
        >
          {t('hypothesis.save')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive gap-2"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
          {t('quickActions.removeFromBoard')}
        </Button>
      </div>
    </div>
  );
}
