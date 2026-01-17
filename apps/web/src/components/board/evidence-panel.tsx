'use client';

import { ArrowRight, Building2, FileText, Star, Trash2, User } from 'lucide-react';
import { useTranslations } from 'next-intl';

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
  const pinnedItems = useGameStore(state => state.pinnedItems);
  const suspectedEntities = useGameStore(state => state.suspectedEntities);
  const unpinItem = useGameStore(state => state.unpinItem);
  const toggleSuspect = useGameStore(state => state.toggleSuspect);
  const { entities } = useEntities(caseId);

  // Filter items for current case
  const casePins = pinnedItems.filter(p => p.caseId === caseId);
  const documents = casePins.filter(p => p.type === 'document');
  const pinnedEntities = casePins.filter(p => p.type === 'entity');

  // Get suspect entity details from entity list
  const suspects = entities.filter(e => suspectedEntities.includes(e.entity_id));

  const canSubmit = casePins.length > 0 && suspectedEntities.length > 0;

  return (
    <div className="border-border bg-background flex h-full w-72 flex-col border-l">
      {/* Header */}
      <div className="border-border border-b px-4 py-3">
        <h2 className="text-lg font-semibold">{t('title')}</h2>
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
                    toggleSuspect(suspect.entity_id);
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
                onRemove={() => {
                  unpinItem(doc.id);
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
                onRemove={() => {
                  unpinItem(ent.id);
                }}
                removeTitle={t('removeEvidence')}
              />
            ))}
          </Section>
        </div>
      </ScrollArea>

      {/* Footer with action */}
      <div className="border-border border-t p-4">
        {canSubmit ? (
          <Link
            href={`/cases/${caseId}/submit`}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium"
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
    <div className="group flex items-center justify-between rounded-md border border-yellow-200 bg-yellow-50 px-2.5 py-1.5 dark:border-yellow-900 dark:bg-yellow-950">
      <div className="flex items-center gap-2">
        <User className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400" />
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
  onRemove,
  removeTitle,
}: {
  icon: React.ReactNode;
  label: string;
  onRemove: () => void;
  removeTitle: string;
}) {
  return (
    <div className="bg-muted/50 group flex items-center justify-between rounded-md border px-2.5 py-1.5">
      <div className="flex items-center gap-2 overflow-hidden">
        <span className="text-muted-foreground flex-shrink-0">{icon}</span>
        <span className="truncate text-sm">{label}</span>
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
