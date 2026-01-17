'use client';

import { useEffect, useState } from 'react';

import type { Case } from '@/types';

import { api } from '@/lib/api';

export function useCase(caseId: string) {
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchCase() {
      try {
        setIsLoading(true);
        const data = await api.get<Case>(`/api/cases/${caseId}`);
        setCaseData(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch case'));
        setCaseData(null);
      } finally {
        setIsLoading(false);
      }
    }

    void fetchCase();
  }, [caseId]);

  return { caseData, isLoading, error };
}
