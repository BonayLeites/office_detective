'use client';

import { useEffect } from 'react';

import { DocumentCard } from './document-card';

import type { DocType, Document } from '@/types';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDocuments } from '@/hooks/use-documents';
import { useGameStore } from '@/stores/game-store';

interface DocumentListProps {
  caseId: string;
  selectedDocId: string | null;
  onSelectDoc: (docId: string) => void;
}

const docTypes: { value: DocType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'email', label: 'Emails' },
  { value: 'chat', label: 'Chats' },
  { value: 'invoice', label: 'Invoices' },
  { value: 'ticket', label: 'Tickets' },
  { value: 'report', label: 'Reports' },
];

export function DocumentList({ caseId, selectedDocId, onSelectDoc }: DocumentListProps) {
  const { documents, isLoading, error, hasMore, loadMore } = useDocuments(caseId);
  const openedDocs = useGameStore(state => state.openedDocs);
  const pinnedItems = useGameStore(state => state.pinnedItems);
  const openDoc = useGameStore(state => state.openDoc);
  const pinItem = useGameStore(state => state.pinItem);
  const unpinItem = useGameStore(state => state.unpinItem);

  const handleSelect = (docId: string) => {
    openDoc(docId);
    onSelectDoc(docId);
  };

  const handlePin = (docId: string) => {
    const doc = documents.find(d => d.doc_id === docId);
    if (!doc) return;

    const isPinned = pinnedItems.some(p => p.id === docId);
    if (isPinned) {
      unpinItem(docId);
    } else {
      pinItem({
        id: docId,
        type: 'document',
        caseId,
        label: doc.subject ?? `${doc.doc_type} - ${doc.doc_id.slice(0, 8)}`,
        data: { docType: doc.doc_type, ts: doc.ts },
      });
    }
  };

  const isPinned = (docId: string) => pinnedItems.some(p => p.id === docId);

  // Handle infinite scroll
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      const { scrollTop, scrollHeight, clientHeight } = target;
      if (scrollHeight - scrollTop <= clientHeight * 1.5 && hasMore && !isLoading) {
        void loadMore();
      }
    };

    const scrollContainer = document.getElementById('document-list-scroll');
    scrollContainer?.addEventListener('scroll', handleScroll);
    return () => scrollContainer?.removeEventListener('scroll', handleScroll);
  }, [hasMore, isLoading, loadMore]);

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">Failed to load documents: {error.message}</div>
    );
  }

  return (
    <Tabs defaultValue="all" className="flex h-full flex-col">
      <TabsList className="mx-2 mt-2 flex-shrink-0">
        {docTypes.map(type => (
          <TabsTrigger key={type.value} value={type.value} className="text-xs">
            {type.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {docTypes.map(type => (
        <TabsContent key={type.value} value={type.value} className="mt-0 flex-1 overflow-hidden">
          <ScrollArea id="document-list-scroll" className="h-full p-2">
            <div className="space-y-2">
              {isLoading && documents.length === 0
                ? Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-lg" />
                  ))
                : filterDocuments(documents, type.value).map(doc => (
                    <DocumentCard
                      key={doc.doc_id}
                      document={doc}
                      isSelected={doc.doc_id === selectedDocId}
                      isRead={openedDocs.has(doc.doc_id)}
                      isPinned={isPinned(doc.doc_id)}
                      onSelect={handleSelect}
                      onPin={handlePin}
                    />
                  ))}

              {isLoading && documents.length > 0 && <Skeleton className="h-24 w-full rounded-lg" />}

              {!isLoading && documents.length === 0 && (
                <p className="text-muted-foreground py-8 text-center text-sm">No documents found</p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      ))}
    </Tabs>
  );
}

function filterDocuments(documents: Document[], filter: DocType | 'all'): Document[] {
  if (filter === 'all') return documents;
  return documents.filter(doc => doc.doc_type === filter);
}
