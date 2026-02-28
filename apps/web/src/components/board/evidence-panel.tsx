'use client';

import { ArrowRight, Building2, FileText, Star, Trash2, User } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { EvidenceReliability } from '@/types';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEntities } from '@/hooks/use-entities';
import { Link } from '@/i18n/navigation';
import { useGameStore } from '@/stores/game-store';

interface EvidencePanelProps {
  caseId: string;
}

export function EvidencePanel({ caseId }: EvidencePanelProps) {
  const t = useTranslations('evidencePanel');
  const tReliability = useTranslations('board.reliability');
  const pinnedItems = useGameStore(state => state.pinnedItems);
  const boardItems = useGameStore(state => state.boardItems);
  const suspectedEntities = useGameStore(state => state.getSuspectedEntities(caseId));
  const unpinItem = useGameStore(state => state.unpinItem);
  const toggleSuspect = useGameStore(state => state.toggleSuspect);
  const { entities } = useEntities(caseId);

  // Filter items for current case
  const casePins = pinnedItems.filter(p => p.caseId === caseId);
  const documents = casePins.filter(p => p.type === 'document');
  const pinnedEntities = casePins.filter(p => p.type === 'entity');
  const reliabilityByNodeId = new Map(
    boardItems.filter(item => item.caseId === caseId).map(item => [item.id, item.reliability]),
  );

  // Get suspect entity details from entity list
  const suspects = entities.filter(e => suspectedEntities.includes(e.entity_id));

  const canSubmit = casePins.length > 0 && suspects.length > 0;

  return (
    <div className="paper-panel border-border/80 flex h-full w-72 flex-col border-l">
      {/* Header */}
      <div className="ink-divider border-border/80 border-b px-4 py-3">
        <h2 className="font-display text-lg font-semibold">{t('title')}</h2>
        <p className="text-muted-foreground text-xs">{t('subtitle')}</p>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          {/* Suspects Section */}
          <Section
            title={t('suspects')}
            icon={<Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />}
            count={suspects.length}
            emptyText={t('emptySuspects')}
          >
            {suspects.map(suspect => {
              const attrs = suspect.attrs_json as { role?: string };
              return (
                <SuspectItem
                  key={suspect.entity_id}
                  name={suspect.name}
                  {...(attrs.role ? { role: attrs.role } : {})}
                  onRemove={() => {
                    toggleSuspect(caseId, suspect.entity_id);
                  }}
                  removeTitle={t('removeSuspect')}
                />
              );
            })}
          </Section>

          {/* Documents Section */}
          <Section
            title={t('documents')}
            icon={<FileText className="h-4 w-4 text-blue-500" />}
            count={documents.length}
            emptyText={t('emptyDocuments')}
          >
            {documents.map(doc => (
              <EvidenceItem
                key={doc.id}
                icon={<FileText className="h-3.5 w-3.5" />}
                label={doc.label}
                reliability={reliabilityByNodeId.get(`document-${doc.id}`) ?? 'uncertain'}
                reliabilityLabel={getReliabilityLabel(
                  reliabilityByNodeId.get(`document-${doc.id}`) ?? 'uncertain',
                  tReliability,
                )}
                onRemove={() => {
                  unpinItem(caseId, doc.id);
                }}
                removeTitle={t('removeEvidence')}
              />
            ))}
          </Section>

          {/* Entities Section */}
          <Section
            title={t('entities')}
            icon={<Building2 className="h-4 w-4 text-purple-500" />}
            count={pinnedEntities.length}
            emptyText={t('emptyEntities')}
          >
            {pinnedEntities.map(ent => (
              <EvidenceItem
                key={ent.id}
                icon={<Building2 className="h-3.5 w-3.5" />}
                label={ent.label}
                reliability={reliabilityByNodeId.get(`entity-${ent.id}`) ?? 'uncertain'}
                reliabilityLabel={getReliabilityLabel(
                  reliabilityByNodeId.get(`entity-${ent.id}`) ?? 'uncertain',
                  tReliability,
                )}
                onRemove={() => {
                  unpinItem(caseId, ent.id);
                }}
                removeTitle={t('removeEvidence')}
              />
            ))}
          </Section>
        </div>
      </ScrollArea>

      {/* Footer with action */}
      <div className="border-border/80 border-t p-4">
        {canSubmit ? (
          <Link
            href={`/cases/${caseId}/submit`}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
          >
            {t('resolveCase')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <Button className="w-full gap-2" disabled>
            {t('resolveCase')}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
        {!canSubmit && (
          <p className="text-muted-foreground mt-2 text-center text-xs">{t('requirements')}</p>
        )}
      </div>
    </div>
  );
}

function getReliabilityLabel(
  reliability: EvidenceReliability,
  tReliability: ReturnType<typeof useTranslations<'board.reliability'>>,
): string {
  if (reliability === 'reliable') return tReliability('reliable');
  if (reliability === 'false') return tReliability('false');
  return tReliability('uncertain');
}

function getReliabilityClass(reliability: EvidenceReliability): string {
  if (reliability === 'reliable') {
    return 'border-emerald-500/30 bg-emerald-500/12 text-emerald-700';
  }
  if (reliability === 'false') {
    return 'border-rose-500/30 bg-rose-500/12 text-rose-700';
  }
  return 'border-amber-500/30 bg-amber-500/12 text-amber-700';
}

// Section component for grouping items
function Section({
  title,
  icon,
  count,
  emptyText,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <span className="text-sm font-medium">{title}</span>
        <span className="bg-muted rounded-full px-2 py-0.5 text-xs">{count}</span>
      </div>
      <div className="space-y-1.5">
        {count === 0 ? <p className="text-muted-foreground py-2 text-xs">{emptyText}</p> : children}
      </div>
    </div>
  );
}

// Suspect item with star indicator
function SuspectItem({
  name,
  role,
  onRemove,
  removeTitle,
}: {
  name: string;
  role?: string;
  onRemove: () => void;
  removeTitle: string;
}) {
  return (
    <div className="group flex items-center justify-between rounded-lg border border-amber-500/35 bg-amber-500/10 px-2.5 py-1.5">
      <div className="flex items-center gap-2">
        <User className="h-3.5 w-3.5 text-amber-700" />
        <div>
          <p className="text-sm font-medium">{name}</p>
          {role && <p className="text-muted-foreground text-xs">{role}</p>}
        </div>
      </div>
      <button
        onClick={onRemove}
        className="opacity-0 transition-opacity group-hover:opacity-100"
        title={removeTitle}
      >
        <Trash2 className="text-muted-foreground hover:text-destructive h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// Generic evidence item (document or entity)
function EvidenceItem({
  icon,
  label,
  reliability,
  reliabilityLabel,
  onRemove,
  removeTitle,
}: {
  icon: React.ReactNode;
  label: string;
  reliability: EvidenceReliability;
  reliabilityLabel: string;
  onRemove: () => void;
  removeTitle: string;
}) {
  return (
    <div className="bg-muted/45 border-border/70 group flex items-center justify-between rounded-lg border px-2.5 py-1.5">
      <div className="flex items-center gap-2 overflow-hidden">
        <span className="text-muted-foreground flex-shrink-0">{icon}</span>
        <div className="min-w-0">
          <span className="block truncate text-sm">{label}</span>
          <span
            className={`mt-0.5 inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${getReliabilityClass(reliability)}`}
          >
            {reliabilityLabel}
          </span>
        </div>
      </div>
      <button
        onClick={onRemove}
        className="flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
        title={removeTitle}
      >
        <Trash2 className="text-muted-foreground hover:text-destructive h-3.5 w-3.5" />
      </button>
    </div>
  );
}
