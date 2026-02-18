'use client';

import { ChevronLeft, ChevronRight, FileText, Pin, Star, Trash2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEntities } from '@/hooks/use-entities';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { useGameStore } from '@/stores/game-store';

interface EvidenceSidebarProps {
  caseId: string;
}

export function EvidenceSidebar({ caseId }: EvidenceSidebarProps) {
  const t = useTranslations('evidenceSidebar');
  const tNav = useTranslations('nav');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const pinnedItems = useGameStore(state => state.pinnedItems);
  const suspectedEntities = useGameStore(state => state.getSuspectedEntities(caseId));
  const suspectConfidence = useGameStore(state => state.getSuspectConfidenceMap(caseId));
  const unpinItem = useGameStore(state => state.unpinItem);
  const toggleSuspect = useGameStore(state => state.toggleSuspect);
  const { entities: caseEntities } = useEntities(caseId);

  const casePins = pinnedItems.filter(p => p.caseId === caseId);
  const documents = casePins.filter(p => p.type === 'document' || p.type === 'chunk');
  const entities = casePins.filter(p => p.type === 'entity');
  const suspects = caseEntities.filter(entity => suspectedEntities.includes(entity.entity_id));

  const totalCount = casePins.length;
  const suspectCount = suspects.length;
  const canSubmit = totalCount > 0 && suspectCount > 0;

  const mobileSidebar = (
    <div className="md:hidden">
      {isMobileOpen && (
        <>
          <button
            type="button"
            aria-label={t('collapse')}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
            onClick={() => {
              setIsMobileOpen(false);
            }}
          />

          <div className="paper-panel border-border/80 fixed inset-x-2 bottom-2 z-50 flex max-h-[74vh] flex-col rounded-2xl border shadow-[0_28px_50px_-32px_rgba(10,23,38,0.9)]">
            <div className="ink-divider border-border/80 flex items-center justify-between border-b px-3 py-2">
              <div className="flex items-center gap-2">
                <Pin className="text-primary h-4 w-4" />
                <span className="text-sm font-medium">{t('title')}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  setIsMobileOpen(false);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-4 p-3">
                <div className="bg-muted/55 flex items-center justify-around rounded-lg p-2">
                  <div className="flex items-center gap-1.5">
                    <FileText className="text-primary h-3.5 w-3.5" />
                    <span className="text-xs font-medium">{documents.length}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                    <span className="text-xs font-medium">{suspectCount}</span>
                  </div>
                </div>

                {suspects.length > 0 && (
                  <div>
                    <h4 className="text-muted-foreground mb-2 text-xs font-medium uppercase">
                      {t('suspects')}
                    </h4>
                    <div className="space-y-1">
                      {suspects.map(suspect => (
                        <div
                          key={suspect.entity_id}
                          className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1"
                        >
                          <div className="flex min-w-0 items-center gap-1.5">
                            <Star className="h-3 w-3 flex-shrink-0 fill-amber-500 text-amber-500" />
                            <span className="truncate text-xs">{suspect.name}</span>
                            <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
                              {suspectConfidence[suspect.entity_id] ?? 50}%
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              toggleSuspect(caseId, suspect.entity_id);
                            }}
                            title={t('remove')}
                          >
                            <Trash2 className="text-muted-foreground hover:text-destructive h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {documents.length > 0 && (
                  <div>
                    <h4 className="text-muted-foreground mb-2 text-xs font-medium uppercase">
                      {t('documents')}
                    </h4>
                    <div className="space-y-1">
                      {documents.map(doc => (
                        <div
                          key={doc.id}
                          className="bg-muted/35 flex items-center justify-between rounded-lg px-2 py-1"
                        >
                          <span className="truncate text-xs">{doc.label}</span>
                          <button
                            onClick={() => {
                              unpinItem(caseId, doc.id);
                            }}
                            title={t('remove')}
                          >
                            <Trash2 className="text-muted-foreground hover:text-destructive h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {entities.length > 0 && (
                  <div>
                    <h4 className="text-muted-foreground mb-2 text-xs font-medium uppercase">
                      {t('entities')}
                    </h4>
                    <div className="space-y-1">
                      {entities.map(ent => (
                        <div
                          key={ent.id}
                          className="bg-muted/35 flex items-center justify-between rounded-lg px-2 py-1"
                        >
                          <span className="truncate text-xs">{ent.label}</span>
                          <button
                            onClick={() => {
                              unpinItem(caseId, ent.id);
                            }}
                            title={t('remove')}
                          >
                            <Trash2 className="text-muted-foreground hover:text-destructive h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {totalCount === 0 && suspectCount === 0 && (
                  <p className="text-muted-foreground py-4 text-center text-xs">{t('empty')}</p>
                )}
              </div>
            </ScrollArea>

            <div className="border-border/80 flex gap-2 border-t p-3">
              <Link
                href={`/cases/${caseId}/board`}
                onClick={() => {
                  setIsMobileOpen(false);
                }}
                className={cn(
                  'inline-flex h-9 flex-1 items-center justify-center rounded-lg text-xs font-medium',
                  'bg-primary text-primary-foreground hover:bg-primary/90',
                )}
              >
                {t('viewBoard')}
              </Link>
              {canSubmit && (
                <Link
                  href={`/cases/${caseId}/submit`}
                  onClick={() => {
                    setIsMobileOpen(false);
                  }}
                  className={cn(
                    'inline-flex h-9 flex-1 items-center justify-center rounded-lg border text-xs font-medium',
                    'border-border/80 bg-card/75',
                  )}
                >
                  {tNav('submit')}
                </Link>
              )}
            </div>
          </div>
        </>
      )}

      <button
        type="button"
        onClick={() => {
          setIsMobileOpen(true);
        }}
        className={cn(
          'paper-panel border-border/80 fixed bottom-3 right-3 z-30 flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold shadow-[0_18px_34px_-22px_rgba(10,23,38,0.9)]',
          isMobileOpen && 'hidden',
        )}
      >
        <Pin className="text-primary h-3.5 w-3.5" />
        <span>{totalCount}</span>
        <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
        <span>{suspectCount}</span>
      </button>
    </div>
  );

  if (!isExpanded) {
    return (
      <>
        {mobileSidebar}
        <div className="paper-panel border-border/80 hidden flex-col items-center border-l py-3 md:flex">
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
      </>
    );
  }

  return (
    <>
      {mobileSidebar}
      <div className="paper-panel border-border/80 hidden w-64 flex-col border-l md:flex">
        <div className="ink-divider border-border/80 flex items-center justify-between border-b px-3 py-2">
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

        <ScrollArea className="flex-1">
          <div className="space-y-4 p-3">
            <div className="bg-muted/55 flex items-center justify-around rounded-lg p-2">
              <div className="flex items-center gap-1.5">
                <FileText className="text-primary h-3.5 w-3.5" />
                <span className="text-xs font-medium">{documents.length}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                <span className="text-xs font-medium">{suspectCount}</span>
              </div>
            </div>

            {suspects.length > 0 && (
              <div>
                <h4 className="text-muted-foreground mb-2 text-xs font-medium uppercase">
                  {t('suspects')}
                </h4>
                <div className="space-y-1">
                  {suspects.map(suspect => (
                    <div
                      key={suspect.entity_id}
                      className="group flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1"
                    >
                      <div className="flex min-w-0 items-center gap-1.5">
                        <Star className="h-3 w-3 flex-shrink-0 fill-amber-500 text-amber-500" />
                        <span className="truncate text-xs">{suspect.name}</span>
                        <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
                          {suspectConfidence[suspect.entity_id] ?? 50}%
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          toggleSuspect(caseId, suspect.entity_id);
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

            {documents.length > 0 && (
              <div>
                <h4 className="text-muted-foreground mb-2 text-xs font-medium uppercase">
                  {t('documents')}
                </h4>
                <div className="space-y-1">
                  {documents.map(doc => (
                    <div
                      key={doc.id}
                      className="bg-muted/35 group flex items-center justify-between rounded-lg px-2 py-1"
                    >
                      <span className="truncate text-xs">{doc.label}</span>
                      <button
                        onClick={() => {
                          unpinItem(caseId, doc.id);
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

            {entities.length > 0 && (
              <div>
                <h4 className="text-muted-foreground mb-2 text-xs font-medium uppercase">
                  {t('entities')}
                </h4>
                <div className="space-y-1">
                  {entities.map(ent => (
                    <div
                      key={ent.id}
                      className="bg-muted/35 group flex items-center justify-between rounded-lg px-2 py-1"
                    >
                      <span className="truncate text-xs">{ent.label}</span>
                      <button
                        onClick={() => {
                          unpinItem(caseId, ent.id);
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

            {totalCount === 0 && suspectCount === 0 && (
              <p className="text-muted-foreground py-4 text-center text-xs">{t('empty')}</p>
            )}
          </div>
        </ScrollArea>

        <div className="border-border/80 border-t p-3">
          <Link
            href={`/cases/${caseId}/board`}
            className={cn(
              'inline-flex h-8 w-full items-center justify-center rounded-lg text-xs font-medium',
              'bg-primary text-primary-foreground hover:bg-primary/90',
            )}
          >
            {t('viewBoard')}
          </Link>
        </div>
      </div>
    </>
  );
}
