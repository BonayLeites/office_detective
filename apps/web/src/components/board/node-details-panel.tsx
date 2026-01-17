'use client';

import { X } from 'lucide-react';

import type { Document, Entity } from '@/types';

import { DocumentTypeBadge } from '@/components/documents/document-type-badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NodeDetailsPanelProps {
  selectedNode: { type: 'entity'; data: Entity } | { type: 'document'; data: Document } | null;
  onClose: () => void;
  onRemoveFromBoard: (id: string) => void;
}

export function NodeDetailsPanel({
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
            onRemove={() => {
              onRemoveFromBoard(selectedNode.data.entity_id);
            }}
          />
        ) : (
          <DocumentDetails
            document={selectedNode.data}
            onRemove={() => {
              onRemoveFromBoard(selectedNode.data.doc_id);
            }}
          />
        )}
      </ScrollArea>
    </div>
  );
}

function EntityDetails({ entity, onRemove }: { entity: Entity; onRemove: () => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-lg font-medium">{entity.name}</h4>
        <span className="text-muted-foreground text-sm capitalize">{entity.entity_type}</span>
      </div>

      <div>
        <h5 className="text-muted-foreground mb-1 text-xs font-semibold uppercase">ID</h5>
        <code className="bg-muted rounded px-2 py-1 text-xs">{entity.entity_id}</code>
      </div>

      <div>
        <h5 className="text-muted-foreground mb-1 text-xs font-semibold uppercase">Attributes</h5>
        <div className="space-y-1">
          {Object.entries(entity.attrs_json).map(([key, value]) => (
            <div key={key} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{key}:</span>
              <span className="font-mono text-xs">{String(value)}</span>
            </div>
          ))}
        </div>
      </div>

      <Button variant="destructive" size="sm" onClick={onRemove} className="w-full">
        Remove from Board
      </Button>
    </div>
  );
}

function DocumentDetails({ document, onRemove }: { document: Document; onRemove: () => void }) {
  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1">
          <DocumentTypeBadge docType={document.doc_type} />
        </div>
        {document.subject && <h4 className="font-medium">{document.subject}</h4>}
      </div>

      <div>
        <h5 className="text-muted-foreground mb-1 text-xs font-semibold uppercase">ID</h5>
        <code className="bg-muted rounded px-2 py-1 text-xs">{document.doc_id}</code>
      </div>

      <div>
        <h5 className="text-muted-foreground mb-1 text-xs font-semibold uppercase">Timestamp</h5>
        <p className="text-sm">{new Date(document.ts).toLocaleString()}</p>
      </div>

      <div>
        <h5 className="text-muted-foreground mb-1 text-xs font-semibold uppercase">Preview</h5>
        <p className="text-muted-foreground line-clamp-4 text-sm">{document.body}</p>
      </div>

      <Button variant="destructive" size="sm" onClick={onRemove} className="w-full">
        Remove from Board
      </Button>
    </div>
  );
}
