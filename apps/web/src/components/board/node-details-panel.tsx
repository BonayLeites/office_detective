'use client';

import { ExternalLink, Focus, Network, Pin, Star, Trash2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { Document, Entity } from '@/types';

import { DocumentTypeBadge } from '@/components/documents/document-type-badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { useGameStore } from '@/stores/game-store';

interface NodeDetailsPanelProps {
  caseId: string;
  selectedNode: { type: 'entity'; data: Entity } | { type: 'document'; data: Document } | null;
  onFocusNode: (nodeId: string) => void;
  onExpandEntity: (entityId: string) => void;
  onClose: () => void;
  onRemoveFromBoard: (id: string) => void;
  mobileInline?: boolean;
}

export function NodeDetailsPanel({
  caseId,
  selectedNode,
  onFocusNode,
  onExpandEntity,
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
            : t('quickActions.documentDetails')}
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
            caseId={caseId}
            onFocusNode={onFocusNode}
            onExpandEntity={onExpandEntity}
            onRemove={() => {
              onRemoveFromBoard(selectedNode.data.entity_id);
            }}
          />
        ) : (
          <DocumentDetails
            document={selectedNode.data}
            caseId={caseId}
            onFocusNode={onFocusNode}
            onRemove={() => {
              onRemoveFromBoard(selectedNode.data.doc_id);
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

function EntityDetails({
  entity,
  caseId,
  onFocusNode,
  onExpandEntity,
  onRemove,
}: {
  entity: Entity;
  caseId: string;
  onFocusNode: (nodeId: string) => void;
  onExpandEntity: (entityId: string) => void;
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
  caseId,
  onFocusNode,
  onRemove,
}: {
  document: Document;
  caseId: string;
  onFocusNode: (nodeId: string) => void;
  onRemove: () => void;
}) {
  const t = useTranslations('board');
  const pinItem = useGameStore(state => state.pinItem);
  const unpinItem = useGameStore(state => state.unpinItem);
  const pinned = useGameStore(state =>
    state.pinnedItems.some(p => p.caseId === caseId && p.id === document.doc_id),
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
