'use client';

import { AlertCircle, RefreshCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
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

export function DocumentList({ caseId, selectedDocId, onSelectDoc }: DocumentListProps) {
  const t = useTranslations('documents');
  const { documents, isLoading, error, hasMore, loadMore, refresh } = useDocuments(caseId);
  const openedDocs = useGameStore(state => state.getOpenedDocs(caseId));
  const pinnedItems = useGameStore(state => state.pinnedItems);
  const openDoc = useGameStore(state => state.openDoc);
  const pinItem = useGameStore(state => state.pinItem);
  const unpinItem = useGameStore(state => state.unpinItem);
  const docTypes: { value: DocType | 'all'; label: string }[] = [
    { value: 'all', label: t('types.all') },
    { value: 'email', label: t('types.emails') },
    { value: 'chat', label: t('types.chats') },
    { value: 'invoice', label: t('types.invoices') },
    { value: 'ticket', label: t('types.tickets') },
    { value: 'report', label: t('types.reports') },
  ];

  const handleSelect = (docId: string) => {
    openDoc(caseId, docId);
    onSelectDoc(docId);
  };

  const handlePin = (docId: string) => {
    const doc = documents.find(d => d.doc_id === docId);
    if (!doc) return;

    const isPinnedDoc = pinnedItems.some(p => p.caseId === caseId && p.id === docId);
    if (isPinnedDoc) {
      unpinItem(caseId, docId);
    } else {
      pinItem({
        id: docId,
        type: 'document',
        caseId,
        label: doc.subject ?? `${doc.doc_type} - ${doc.doc_id.slice(0, 8)}`,
        data: { docType: doc.doc_type, ts: doc.ts, body: doc.body },
      });
    }
  };

  const isPinned = (docId: string) => pinnedItems.some(p => p.caseId === caseId && p.id === docId);
  const casePinnedCount = pinnedItems.filter(item => item.caseId === caseId).length;

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
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="border-destructive/35 bg-destructive/10 mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full border">
          <AlertCircle className="text-destructive h-5 w-5" />
        </div>
        <p className="text-destructive text-sm font-semibold">{t('loadError')}</p>
        <p className="text-muted-foreground mt-1 text-xs">{error.message}</p>
        <button
          type="button"
          className="border-border/70 mt-4 inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium"
          onClick={() => {
            void refresh();
          }}
        >
          <RefreshCcw className="h-4 w-4" />
          {t('retryLoad')}
        </button>
      </div>
    );
  }

  return (
    <Tabs defaultValue="all" className="flex h-full flex-col">
      <div className="ink-divider px-3 py-3">
        <p className="text-muted-foreground text-[11px] uppercase tracking-[0.12em]">
          Workspace Activity
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <span className="border-border/70 bg-card/60 rounded-full border px-2 py-1">
            Opened: <strong>{openedDocs.length}</strong>
          </span>
          <span className="border-border/70 bg-card/60 rounded-full border px-2 py-1">
            Pinned: <strong>{casePinnedCount}</strong>
          </span>
          <span className="border-border/70 bg-card/60 rounded-full border px-2 py-1">
            Total: <strong>{documents.length}</strong>
          </span>
        </div>
      </div>

      <TabsList className="mx-2 mt-2 flex-shrink-0 rounded-xl">
        {docTypes.map(type => (
          <TabsTrigger key={type.value} value={type.value} className="text-xs">
            {type.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {docTypes.map(type => {
        const filteredDocuments = filterDocuments(documents, type.value);
        return (
          <TabsContent key={type.value} value={type.value} className="mt-0 flex-1 overflow-hidden">
            <ScrollArea id="document-list-scroll" className="h-full p-2">
              <div className="stagger-list space-y-2">
                {isLoading && documents.length === 0
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton
                        key={i}
                        className="h-24 w-full rounded-lg"
                        style={{ '--stagger-index': i } as React.CSSProperties}
                      />
                    ))
                  : filteredDocuments.map((doc, index) => (
                      <DocumentCard
                        key={doc.doc_id}
                        document={doc}
                        style={{ '--stagger-index': index } as React.CSSProperties}
                        isSelected={doc.doc_id === selectedDocId}
                        isRead={openedDocs.includes(doc.doc_id)}
                        isPinned={isPinned(doc.doc_id)}
                        onSelect={handleSelect}
                        onPin={handlePin}
                      />
                    ))}

                {isLoading && documents.length > 0 && (
                  <Skeleton className="h-24 w-full rounded-lg" />
                )}

                {!isLoading && filteredDocuments.length === 0 && (
                  <div className="py-8 text-center">
                    <p className="text-muted-foreground text-sm">{t('noDocuments')}</p>
                    <button
                      type="button"
                      className="border-border/70 mt-3 inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium"
                      onClick={() => {
                        void refresh();
                      }}
                    >
                      <RefreshCcw className="h-4 w-4" />
                      {t('refreshList')}
                    </button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}

function filterDocuments(documents: Document[], filter: DocType | 'all'): Document[] {
  if (filter === 'all') return documents;
  return documents.filter(doc => doc.doc_type === filter);
}
