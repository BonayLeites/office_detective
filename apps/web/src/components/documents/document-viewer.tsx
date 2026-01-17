'use client';

import { format } from 'date-fns';
import { FileText, LayoutGrid, Pin, X } from 'lucide-react';

import { DocumentTypeBadge } from './document-type-badge';
import { ChatRenderer } from './renderers/chat-renderer';
import { EmailRenderer } from './renderers/email-renderer';
import { InvoiceRenderer } from './renderers/invoice-renderer';
import { TicketRenderer } from './renderers/ticket-renderer';

import type { DocumentWithChunks } from '@/types';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEntity } from '@/hooks/use-entities';
import { cn } from '@/lib/utils';
import { useGameStore } from '@/stores/game-store';

interface DocumentViewerProps {
  document: DocumentWithChunks | null;
  caseId: string;
  isLoading?: boolean;
  onClose?: () => void;
}

export function DocumentViewer({
  document,
  caseId,
  isLoading = false,
  onClose,
}: DocumentViewerProps) {
  const pinnedItems = useGameStore(state => state.pinnedItems);
  const boardItems = useGameStore(state => state.boardItems);
  const pinItem = useGameStore(state => state.pinItem);
  const unpinItem = useGameStore(state => state.unpinItem);
  const addToBoard = useGameStore(state => state.addToBoard);

  const { entity: author } = useEntity(caseId, document?.author_entity_id ?? null);

  if (isLoading) {
    return (
      <div className="flex h-full flex-col p-4">
        <Skeleton className="mb-4 h-8 w-3/4" />
        <Skeleton className="mb-2 h-4 w-1/2" />
        <Skeleton className="flex-1" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="text-muted-foreground flex h-full flex-col items-center justify-center p-8">
        <FileText className="mb-4 h-12 w-12 opacity-50" />
        <p className="text-center">Select a document to view its contents</p>
      </div>
    );
  }

  const isPinned = pinnedItems.some(p => p.id === document.doc_id);
  const isOnBoard = boardItems.some(b => b.id === `document-${document.doc_id}`);

  const handlePin = () => {
    if (isPinned) {
      unpinItem(document.doc_id);
    } else {
      pinItem({
        id: document.doc_id,
        type: 'document',
        caseId,
        label: document.subject ?? `${document.doc_type} - ${document.doc_id.slice(0, 8)}`,
        data: { docType: document.doc_type, ts: document.ts },
      });
    }
  };

  const handleAddToBoard = () => {
    if (!isOnBoard) {
      addToBoard({
        id: `document-${document.doc_id}`,
        type: 'document',
        caseId,
        label: document.subject ?? `${document.doc_type} - ${document.doc_id.slice(0, 8)}`,
        data: document as unknown as Record<string, unknown>,
      });
    }
  };

  const renderContent = () => {
    switch (document.doc_type) {
      case 'email':
        return <EmailRenderer document={document} author={author} />;
      case 'chat':
        return <ChatRenderer document={document} />;
      case 'invoice':
        return <InvoiceRenderer document={document} />;
      case 'ticket':
        return <TicketRenderer document={document} />;
      default:
        return (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <pre className="whitespace-pre-wrap font-mono text-sm">{document.body}</pre>
          </div>
        );
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-border flex items-start justify-between border-b p-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <DocumentTypeBadge docType={document.doc_type} />
            <span className="text-muted-foreground text-xs">
              {format(new Date(document.ts), 'MMM d, yyyy HH:mm')}
            </span>
          </div>
          {document.subject && (
            <h2 className="truncate text-lg font-semibold">{document.subject}</h2>
          )}
        </div>
        <div className="ml-2 flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleAddToBoard}
            title={isOnBoard ? 'Ya en el tablero' : 'Añadir al tablero'}
            disabled={isOnBoard}
          >
            <LayoutGrid className={cn('h-4 w-4', isOnBoard && 'fill-current text-purple-500')} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePin}
            title={isPinned ? 'Quitar de evidencia' : 'Añadir a evidencia'}
          >
            <Pin className={cn('h-4 w-4', isPinned && 'text-primary fill-current')} />
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <Tabs defaultValue="content" className="flex flex-1 flex-col overflow-hidden">
        <TabsList className="mx-4 mt-2 flex-shrink-0">
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
          {document.chunks.length > 0 && (
            <TabsTrigger value="chunks">Chunks ({document.chunks.length})</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="content" className="mt-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full p-4">{renderContent()}</ScrollArea>
        </TabsContent>

        <TabsContent value="metadata" className="mt-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full p-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-muted-foreground mb-1 text-xs font-semibold uppercase">
                  Document ID
                </h3>
                <code className="bg-muted rounded px-2 py-1 text-xs">{document.doc_id}</code>
              </div>

              {author && (
                <div>
                  <h3 className="text-muted-foreground mb-1 text-xs font-semibold uppercase">
                    Author
                  </h3>
                  <p className="text-sm">{author.name}</p>
                  {typeof author.attrs_json['email'] === 'string' && (
                    <p className="text-muted-foreground text-xs">{author.attrs_json['email']}</p>
                  )}
                </div>
              )}

              <div>
                <h3 className="text-muted-foreground mb-1 text-xs font-semibold uppercase">
                  Metadata
                </h3>
                <pre className="bg-muted overflow-auto rounded p-2 text-xs">
                  {JSON.stringify(document.metadata_json, null, 2)}
                </pre>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="chunks" className="mt-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full p-4">
            <div className="space-y-3">
              {document.chunks.map((chunk, index) => (
                <div key={chunk.chunk_id} className="border-border rounded-lg border p-3">
                  <div className="text-muted-foreground mb-2 flex items-center justify-between text-xs">
                    <span>Chunk {index + 1}</span>
                    <code className="bg-muted rounded px-1">{chunk.chunk_id.slice(0, 8)}</code>
                  </div>
                  <p className="text-sm">{chunk.text}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
