'use client';

import { ChevronLeft, ChevronRight, FileText, Pin, Star, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { useGameStore } from '@/stores/game-store';

interface EvidenceSidebarProps {
  caseId: string;
}

export function EvidenceSidebar({ caseId }: EvidenceSidebarProps) {
  const t = useTranslations('evidenceSidebar');
  const [isExpanded, setIsExpanded] = useState(false);

  const pinnedItems = useGameStore(state => state.pinnedItems);
  const suspectedEntities = useGameStore(state => state.suspectedEntities);
  const unpinItem = useGameStore(state => state.unpinItem);

  // Filter items for current case
  const casePins = pinnedItems.filter(p => p.caseId === caseId);
  const documents = casePins.filter(p => p.type === 'document' || p.type === 'chunk');
  const entities = casePins.filter(p => p.type === 'entity');

  const totalCount = casePins.length;
  const suspectCount = suspectedEntities.length;

  // Collapsed state - just show counts
  if (!isExpanded) {
    return (
      <div className="border-border bg-muted/30 flex flex-col items-center border-l py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setIsExpanded(true);
          }}
          className="mb-4"
          title={t('expand')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex flex-col items-center gap-3 text-xs">
          <div className="flex flex-col items-center" title={t('evidence')}>
            <Pin className="text-primary mb-1 h-4 w-4" />
            <span className="font-medium">{totalCount}</span>
          </div>
          <div className="flex flex-col items-center" title={t('suspects')}>
            <Star className="mb-1 h-4 w-4 fill-yellow-500 text-yellow-500" />
            <span className="font-medium">{suspectCount}</span>
          </div>
        </div>

        {(totalCount > 0 || suspectCount > 0) && (
          <Link
            href={`/cases/${caseId}/board`}
            className="text-primary hover:text-primary/80 mt-4 text-xs underline"
          >
            {t('viewBoard')}
          </Link>
        )}
      </div>
    );
  }

  // Expanded state - show details
  return (
    <div className="border-border bg-background flex w-64 flex-col border-l">
      {/* Header */}
      <div className="border-border flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <Pin className="text-primary h-4 w-4" />
          <span className="text-sm font-medium">{t('title')}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setIsExpanded(false);
          }}
          className="h-7 w-7"
          title={t('collapse')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="space-y-4 p-3">
          {/* Summary */}
          <div className="bg-muted/50 flex items-center justify-around rounded-md p-2">
            <div className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-xs font-medium">{documents.length}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
              <span className="text-xs font-medium">{suspectCount}</span>
            </div>
          </div>

          {/* Documents */}
          {documents.length > 0 && (
            <div>
              <h4 className="text-muted-foreground mb-2 text-xs font-medium uppercase">
                {t('documents')}
              </h4>
              <div className="space-y-1">
                {documents.map(doc => (
                  <div
                    key={doc.id}
                    className="bg-muted/30 group flex items-center justify-between rounded px-2 py-1"
                  >
                    <span className="truncate text-xs">{doc.label}</span>
                    <button
                      onClick={() => {
                        unpinItem(doc.id);
                      }}
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                      title={t('remove')}
                    >
                      <Trash2 className="text-muted-foreground hover:text-destructive h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Entities */}
          {entities.length > 0 && (
            <div>
              <h4 className="text-muted-foreground mb-2 text-xs font-medium uppercase">
                {t('entities')}
              </h4>
              <div className="space-y-1">
                {entities.map(ent => (
                  <div
                    key={ent.id}
                    className="bg-muted/30 group flex items-center justify-between rounded px-2 py-1"
                  >
                    <span className="truncate text-xs">{ent.label}</span>
                    <button
                      onClick={() => {
                        unpinItem(ent.id);
                      }}
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                      title={t('remove')}
                    >
                      <Trash2 className="text-muted-foreground hover:text-destructive h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {totalCount === 0 && suspectCount === 0 && (
            <p className="text-muted-foreground py-4 text-center text-xs">{t('empty')}</p>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-border border-t p-3">
        <Link
          href={`/cases/${caseId}/board`}
          className={cn(
            'inline-flex h-8 w-full items-center justify-center rounded-md text-xs font-medium',
            'bg-primary text-primary-foreground hover:bg-primary/90',
          )}
        >
          {t('viewBoard')}
        </Link>
      </div>
    </div>
  );
}
