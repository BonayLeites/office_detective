'use client';

import { use, useState } from 'react';

import { SubmissionForm, type SubmissionData } from '@/components/submit/submission-form';
import { SubmissionResult } from '@/components/submit/submission-result';
import { Skeleton } from '@/components/ui/skeleton';
import { useEntities } from '@/hooks/use-entities';
import { useGameStore } from '@/stores/game-store';

interface SubmitPageProps {
  params: Promise<{ caseId: string }>;
}

interface SubmissionResultData {
  score: number;
  maxScore: number;
  correctCulprits: string[];
  feedback: string;
}

export default function SubmitPage({ params }: SubmitPageProps) {
  const { caseId } = use(params);
  const { entities, isLoading } = useEntities(caseId);
  const pinnedItems = useGameStore(state => state.pinnedItems);
  const resetCase = useGameStore(state => state.resetCase);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<SubmissionResultData | null>(null);
  const [playerCulprits, setPlayerCulprits] = useState<string[]>([]);

  const handleSubmit = async (data: SubmissionData) => {
    setIsSubmitting(true);
    setPlayerCulprits(data.culpritIds);

    try {
      // TODO: Submit to backend API when endpoint is available
      // For now, simulate a response
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Simulated result - in real implementation, this comes from the backend
      // which compares against ground_truth_json
      setResult({
        score: 75,
        maxScore: 100,
        correctCulprits: data.culpritIds, // In reality, this comes from backend
        feedback:
          'Good investigation! You identified the main culprit correctly. The fraud mechanism was a ghost vendor scheme where fake invoices were approved by an insider. Consider looking more closely at the banking details in future cases.',
      });
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
        maxScore={result.maxScore}
        correctCulprits={result.correctCulprits}
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
