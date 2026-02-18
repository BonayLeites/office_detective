'use client';

import { AlertTriangle, Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { EvidenceSelector } from './evidence-selector';

import type { SpeedComboImpact, TwistChallenge } from '@/components/game/progression';
import type { Entity, PinnedItem } from '@/types';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface SubmissionFormProps {
  entities: Entity[];
  pinnedItems: PinnedItem[];
  suspectConfidence: Record<string, number>;
  activeTwist: TwistChallenge;
  twistModifierPreview: number;
  speedModifierPreview: number;
  speedTierPreview: SpeedComboImpact['tier'];
  onSubmit: (data: SubmissionData) => Promise<void>;
  isSubmitting: boolean;
}

export interface SubmissionData {
  culpritIds: string[];
  evidenceIds: string[];
  culpritConfidence: Record<string, number>;
  explanation: string;
}

export function SubmissionForm({
  entities,
  pinnedItems,
  suspectConfidence,
  activeTwist,
  twistModifierPreview,
  speedModifierPreview,
  speedTierPreview,
  onSubmit,
  isSubmitting,
}: SubmissionFormProps) {
  const t = useTranslations('submit');
  const [selectedCulprits, setSelectedCulprits] = useState<Set<string>>(new Set());
  const [selectedEvidence, setSelectedEvidence] = useState<Set<string>>(new Set());
  const [explanation, setExplanation] = useState('');

  // Filter to only show person entities as potential culprits, sorted by confidence.
  const personEntities = useMemo(
    () =>
      entities
        .filter(e => e.entity_type === 'person')
        .sort((a, b) => {
          const confA = suspectConfidence[a.entity_id] ?? 0;
          const confB = suspectConfidence[b.entity_id] ?? 0;
          if (confA !== confB) return confB - confA;
          return a.name.localeCompare(b.name);
        }),
    [entities, suspectConfidence],
  );

  useEffect(() => {
    if (selectedCulprits.size > 0 || personEntities.length === 0) return;

    const recommended = personEntities
      .filter(entity => (suspectConfidence[entity.entity_id] ?? 0) >= 65)
      .slice(0, 2)
      .map(entity => entity.entity_id);

    if (recommended.length > 0) {
      setSelectedCulprits(new Set(recommended));
    }
  }, [personEntities, selectedCulprits.size, suspectConfidence]);

  const toggleCulprit = (id: string) => {
    setSelectedCulprits(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleEvidence = (id: string) => {
    setSelectedEvidence(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    const culpritConfidence = Array.from(selectedCulprits).reduce<Record<string, number>>(
      (acc, culpritId) => ({
        ...acc,
        [culpritId]: suspectConfidence[culpritId] ?? 0,
      }),
      {},
    );

    await onSubmit({
      culpritIds: Array.from(selectedCulprits),
      evidenceIds: Array.from(selectedEvidence),
      culpritConfidence,
      explanation,
    });
  };

  const canSubmit =
    selectedCulprits.size > 0 &&
    selectedEvidence.size >= 1 &&
    explanation.trim().length >= 20 &&
    !isSubmitting;
  const explanationChars = explanation.trim().length;
  const culpritGoal = Math.max(1, Math.min(2, personEntities.length));
  const culpritProgress =
    personEntities.length === 0
      ? 0
      : Math.min(100, Math.round((selectedCulprits.size / culpritGoal) * 100));
  const evidenceProgress = selectedEvidence.size >= 1 ? 100 : 0;
  const explanationProgress = Math.min(100, Math.round((explanationChars / 120) * 100));
  const readiness = Math.round((culpritProgress + evidenceProgress + explanationProgress) / 3);

  return (
    <ScrollArea className="h-full">
      <div className="space-y-8 p-6">
        {/* Warning */}
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/35 bg-amber-500/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
          <div>
            <h3 className="font-display text-base font-semibold text-amber-900">
              {t('warningTitle')}
            </h3>
            <p className="mt-1 text-sm text-amber-800/90">{t('warningDescription')}</p>
          </div>
        </div>

        <div className="border-border/70 bg-card/65 rounded-xl border p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-muted-foreground text-[11px] uppercase tracking-[0.12em]">
              {t('readiness.label')}
            </p>
            <p className="text-sm font-semibold">{readiness}%</p>
          </div>
          <div className="bg-muted/60 h-2 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full transition-all duration-300"
              style={{ width: `${readiness.toString()}%` }}
            />
          </div>
          <p className="text-muted-foreground mt-2 text-xs">{t('readiness.hint')}</p>
        </div>

        <div className="border-primary/30 bg-primary/10 rounded-xl border p-4">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-muted-foreground text-[11px] uppercase tracking-[0.12em]">
              {t('twist.title')}
            </p>
            <p className="text-sm font-semibold">
              {twistModifierPreview >= 0
                ? t('twist.modifierPositive', { value: twistModifierPreview })
                : t('twist.modifierNegative', { value: Math.abs(twistModifierPreview) })}
            </p>
          </div>
          <p className="text-sm font-semibold">{t(`twist.items.${activeTwist.id}.label`)}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {t(`twist.items.${activeTwist.id}.hint`)}
          </p>
          <p className="text-muted-foreground mt-2 text-xs">
            {t('twist.status', {
              current: Math.min(activeTwist.current, activeTwist.target),
              target: activeTwist.target,
              minutes: activeTwist.timeboxMinutes,
            })}
          </p>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-muted-foreground text-[11px] uppercase tracking-[0.12em]">
              {t('combo.title')}
            </p>
            <p className="text-sm font-semibold">
              {speedModifierPreview > 0
                ? t('combo.modifierPositive', { value: speedModifierPreview })
                : t('combo.modifierZero')}
            </p>
          </div>
          <p className="text-sm font-semibold">{t(`combo.tiers.${speedTierPreview}.label`)}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {t(`combo.tiers.${speedTierPreview}.hint`)}
          </p>
        </div>

        {/* Culprit Selection */}
        <section className="surface-lift border-border/70 bg-card/60 rounded-xl border p-4">
          <h2 className="font-display mb-4 text-lg font-semibold">{t('culprit.title')}</h2>
          <p className="text-muted-foreground mb-4 text-sm">{t('culprit.description')}</p>
          <p className="text-muted-foreground mb-4 text-xs">
            {t('culprit.prioritizedByConfidence')}
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
            {personEntities.map(entity => {
              const isSelected = selectedCulprits.has(entity.entity_id);
              const confidence = suspectConfidence[entity.entity_id] ?? 0;
              let culpritCardClass = 'border-border/80 bg-card/60 hover:border-primary/35';
              if (confidence >= 70) {
                culpritCardClass = 'border-amber-500/35 bg-amber-500/10 hover:border-amber-500/55';
              }
              if (isSelected) {
                culpritCardClass =
                  'border-primary/45 bg-primary/10 shadow-[0_14px_26px_-24px_hsl(var(--primary)/0.95)]';
              }
              return (
                <label
                  key={entity.entity_id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all duration-200',
                    culpritCardClass,
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {
                      toggleCulprit(entity.entity_id);
                    }}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <div>
                    <p className="font-medium">
                      {entity.name}
                      {confidence > 0 && (
                        <span className="ml-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                          {confidence}%
                        </span>
                      )}
                    </p>
                    {typeof entity.attrs_json['role'] === 'string' && (
                      <p className="text-muted-foreground text-xs">{entity.attrs_json['role']}</p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>

          {personEntities.length === 0 && (
            <p className="text-muted-foreground text-sm">{t('culprit.empty')}</p>
          )}
        </section>

        {/* Evidence Selection */}
        <section className="surface-lift border-border/70 bg-card/60 rounded-xl border p-4">
          <h2 className="font-display mb-4 text-lg font-semibold">{t('evidence.title')}</h2>
          <p className="text-muted-foreground mb-4 text-sm">{t('evidence.description')}</p>

          <EvidenceSelector
            pinnedItems={pinnedItems}
            selectedIds={selectedEvidence}
            onToggle={toggleEvidence}
            minRequired={1}
          />
        </section>

        {/* Explanation */}
        <section className="surface-lift border-border/70 bg-card/60 rounded-xl border p-4">
          <h2 className="font-display mb-4 text-lg font-semibold">{t('explanation.title')}</h2>
          <p className="text-muted-foreground mb-4 text-sm">{t('explanation.description')}</p>

          <Textarea
            value={explanation}
            onChange={e => {
              setExplanation(e.target.value);
            }}
            placeholder={t('explanation.placeholder')}
            rows={5}
            className="resize-none rounded-xl"
          />
          <p className="text-muted-foreground mt-2 text-xs">
            {t('explanation.minChars', { count: explanation.length })}
          </p>
        </section>

        {/* Submit */}
        <section className="border-border/80 border-t pt-6">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            size="lg"
            className="w-full gap-2 rounded-lg"
          >
            <Send className="h-4 w-4" />
            {t('submitButton')}
          </Button>

          {!canSubmit && (
            <p className="text-muted-foreground mt-2 text-center text-sm">
              {selectedCulprits.size === 0 && t('validation.needCulprit') + ' '}
              {selectedEvidence.size < 1 && t('validation.needEvidence') + ' '}
              {explanation.trim().length < 20 && t('validation.needExplanation')}
            </p>
          )}
        </section>
      </div>
    </ScrollArea>
  );
}
