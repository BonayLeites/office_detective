'use client';

import { ExternalLink, Pin, Star, Trash2, X } from 'lucide-react';
import Link from 'next/link';

import type { Document, Entity } from '@/types';

import { DocumentTypeBadge } from '@/components/documents/document-type-badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useGameStore } from '@/stores/game-store';

interface NodeDetailsPanelProps {
  caseId: string;
  selectedNode: { type: 'entity'; data: Entity } | { type: 'document'; data: Document } | null;
  onClose: () => void;
  onRemoveFromBoard: (id: string) => void;
}

export function NodeDetailsPanel({
  caseId,
  selectedNode,
  onClose,
  onRemoveFromBoard,
}: NodeDetailsPanelProps) {
  if (!selectedNode) {
    return null;
  }

  return (
    <div className="border-border bg-background flex h-full w-80 flex-col border-l">
      {/* Header */}
      <div className="border-border flex items-center justify-between border-b px-4 py-3">
        <h3 className="font-semibold">
          {selectedNode.type === 'entity' ? 'Entity Details' : 'Document Details'}
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
            onRemove={() => {
              onRemoveFromBoard(selectedNode.data.entity_id);
            }}
          />
        ) : (
          <DocumentDetails
            document={selectedNode.data}
            caseId={caseId}
            onRemove={() => {
              onRemoveFromBoard(selectedNode.data.doc_id);
            }}
          />
        )}
      </ScrollArea>
    </div>
  );
}

function EntityDetails({
  entity,
  caseId,
  onRemove,
}: {
  entity: Entity;
  caseId: string;
  onRemove: () => void;
}) {
  const pinItem = useGameStore(state => state.pinItem);
  const unpinItem = useGameStore(state => state.unpinItem);
  const toggleSuspect = useGameStore(state => state.toggleSuspect);
  const pinned = useGameStore(state => state.pinnedItems.some(p => p.id === entity.entity_id));
  const suspected = useGameStore(state => state.suspectedEntities.includes(entity.entity_id));
  const isPerson = entity.entity_type === 'person';

  const handlePin = () => {
    if (pinned) {
      unpinItem(entity.entity_id);
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
    toggleSuspect(entity.entity_id);
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-lg font-medium">{entity.name}</h4>
        <span className="text-muted-foreground text-sm capitalize">{entity.entity_type}</span>
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
            {suspected ? 'Sospechoso' : 'Marcar sospechoso'}
          </Button>
        )}
        <Button
          variant={pinned ? 'default' : 'outline'}
          size="sm"
          onClick={handlePin}
          className={cn('flex-1 gap-2', pinned && 'bg-blue-500 hover:bg-blue-600')}
        >
          <Pin className={cn('h-4 w-4', pinned && 'fill-current')} />
          {pinned ? 'Pinneado' : 'Agregar evidencia'}
        </Button>
      </div>

      <div>
        <h5 className="text-muted-foreground mb-1 text-xs font-semibold uppercase">Atributos</h5>
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
        Quitar del tablero
      </Button>
    </div>
  );
}

function DocumentDetails({
  document,
  caseId,
  onRemove,
}: {
  document: Document;
  caseId: string;
  onRemove: () => void;
}) {
  const pinItem = useGameStore(state => state.pinItem);
  const unpinItem = useGameStore(state => state.unpinItem);
  const pinned = useGameStore(state => state.pinnedItems.some(p => p.id === document.doc_id));

  const handlePin = () => {
    if (pinned) {
      unpinItem(document.doc_id);
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

      {/* Action button */}
      <Button
        variant={pinned ? 'default' : 'outline'}
        size="sm"
        onClick={handlePin}
        className={cn('w-full gap-2', pinned && 'bg-blue-500 hover:bg-blue-600')}
      >
        <Pin className={cn('h-4 w-4', pinned && 'fill-current')} />
        {pinned ? 'Pinneado' : 'Agregar a evidencia'}
      </Button>

      <div>
        <h5 className="text-muted-foreground mb-1 text-xs font-semibold uppercase">ID</h5>
        <code className="bg-muted rounded px-2 py-1 text-xs">{document.doc_id}</code>
      </div>

      <div>
        <h5 className="text-muted-foreground mb-1 text-xs font-semibold uppercase">Timestamp</h5>
        <p className="text-sm">{new Date(document.ts).toLocaleString()}</p>
      </div>

      <div>
        <h5 className="text-muted-foreground mb-1 text-xs font-semibold uppercase">Contenido</h5>
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
            Ver en Inbox
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="text-destructive hover:text-destructive gap-2"
        >
          <Trash2 className="h-4 w-4" />
          Quitar
        </Button>
      </div>
    </div>
  );
}
