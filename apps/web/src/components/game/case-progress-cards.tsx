'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import type { ProgressResponse } from '@/types';

import { Card } from '@/components/ui/card';
import { api } from '@/lib/api';
import { useGameStore } from '@/stores/game-store';

interface CaseProgressCardsProps {
  caseId: string;
  documentCount: number;
  entityCount: number;
}

function getProgress(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

export function CaseProgressCards({ caseId, documentCount, entityCount }: CaseProgressCardsProps) {
  const t = useTranslations('caseDetail');
  const openedDocs = useGameStore(state => state.getOpenedDocs(caseId).length);
  const searchesRun = useGameStore(state => state.getSearchesRun(caseId));
  const ariaQuestions = useGameStore(state => state.getAriaQuestions(caseId));
  const pinnedItems = useGameStore(
    state => state.pinnedItems.filter(item => item.caseId === caseId).length,
  );
  const suspects = useGameStore(state => state.getSuspectedEntities(caseId).length);
  const boardItems = useGameStore(
    state => state.boardItems.filter(item => item.caseId === caseId).length,
  );
  const localHintsUsed = useGameStore(state => state.getHintsUsed(caseId));
  const submissionCount = useGameStore(state => state.getSubmissionStats(caseId).count);
  const [remoteProgress, setRemoteProgress] = useState<ProgressResponse | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProgress() {
      try {
        const progress = await api.get<ProgressResponse>(`/api/cases/${caseId}/progress`);
        if (isMounted) {
          setRemoteProgress(progress);
        }
      } catch {
        if (isMounted) {
          setRemoteProgress(null);
        }
      }
    }

    void loadProgress();
    return () => {
      isMounted = false;
    };
  }, [caseId]);

  const readiness = useMemo(() => {
    const goals = [
      { current: openedDocs, target: 4 },
      { current: searchesRun, target: 3 },
      { current: ariaQuestions, target: 3 },
      { current: pinnedItems, target: 4 },
      { current: suspects, target: 2 },
      { current: boardItems, target: 6 },
    ];

    return Math.round(
      goals.reduce((sum, goal) => sum + getProgress(goal.current, goal.target), 0) / goals.length,
    );
  }, [ariaQuestions, boardItems, openedDocs, pinnedItems, searchesRun, suspects]);

  const hasSubmission = submissionCount > 0 || remoteProgress?.has_submission === true;
  const progressPercent = hasSubmission ? 100 : readiness;
  const hintsUsed = Math.max(localHintsUsed, remoteProgress?.hints_used ?? 0);

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card className="rounded-2xl p-6">
        <h3 className="text-muted-foreground mb-2 text-sm font-medium">{t('documentsLabel')}</h3>
        <p className="font-display text-3xl font-bold">{documentCount}</p>
      </Card>

      <Card className="rounded-2xl p-6">
        <h3 className="text-muted-foreground mb-2 text-sm font-medium">{t('entitiesLabel')}</h3>
        <p className="font-display text-3xl font-bold">{entityCount}</p>
      </Card>

      <Card className="rounded-2xl p-6">
        <h3 className="text-muted-foreground mb-2 text-sm font-medium">{t('hintsUsed')}</h3>
        <p className="font-display text-3xl font-bold">{hintsUsed}</p>
      </Card>

      <Card className="rounded-2xl p-6">
        <h3 className="text-muted-foreground mb-2 text-sm font-medium">{t('progress')}</h3>
        <p className="font-display text-3xl font-bold">{progressPercent}%</p>
      </Card>
    </div>
  );
}
