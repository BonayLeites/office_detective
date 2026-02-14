'use client';

import { use, useState } from 'react';

import type { SubmissionResponse } from '@/types';

import { SubmissionForm, type SubmissionData } from '@/components/submit/submission-form';
import { SubmissionResult } from '@/components/submit/submission-result';
import { Skeleton } from '@/components/ui/skeleton';
import { useEntities } from '@/hooks/use-entities';
import { api } from '@/lib/api';
import { useGameStore } from '@/stores/game-store';

interface SubmitPageProps {
  params: Promise<{ caseId: string }>;
}

export default function SubmitPage({ params }: SubmitPageProps) {
  const { caseId } = use(params);
  const { entities, isLoading } = useEntities(caseId);
  const pinnedItems = useGameStore(state => state.pinnedItems);
  const resetCase = useGameStore(state => state.resetCase);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<SubmissionResponse | null>(null);
  const [playerCulprits, setPlayerCulprits] = useState<string[]>([]);

  const handleSubmit = async (data: SubmissionData) => {
    setIsSubmitting(true);
    setPlayerCulprits(data.culpritIds);

    try {
      const response = await api.post<SubmissionResponse>(`/api/cases/${caseId}/submit`, {
        culprit_ids: data.culpritIds,
        evidence_ids: data.evidenceIds,
        explanation: data.explanation,
      });
      setResult(response);
    } catch (error) {
      console.error('Submission failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    setResult(null);
    setPlayerCulprits([]);
    resetCase();
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (result) {
    return (
      <SubmissionResult
        score={result.score}
        maxScore={result.max_score}
        correctCulprits={result.correct_culprits}
        playerCulprits={playerCulprits}
        feedback={result.feedback}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <SubmissionForm
      entities={entities}
      pinnedItems={pinnedItems}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
    />
  );
}
