'use client';

import { useCallback, useState } from 'react';

import type { GraphStats, HubsResponse, NeighborsResponse, PathResponse } from '@/types';

import { api } from '@/lib/api';

interface SyncResult {
  case_id: string;
  nodes_created: number;
  relationships_created: number;
  status: string;
}

interface UseGraphReturn {
  isLoading: boolean;
  error: Error | null;
  syncGraph: () => Promise<SyncResult | null>;
  getPath: (
    fromEntityId: string,
    toEntityId: string,
    maxDepth?: number,
  ) => Promise<PathResponse | null>;
  getNeighbors: (entityId: string, depth?: number) => Promise<NeighborsResponse | null>;
  getHubs: (limit?: number) => Promise<HubsResponse | null>;
  getStats: () => Promise<GraphStats | null>;
}

export function useGraph(caseId: string): UseGraphReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const syncGraph = useCallback(async (): Promise<SyncResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await api.post<SyncResult>(`/api/cases/${caseId}/graph/sync`, {});
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to sync graph'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [caseId]);

  const getPath = useCallback(
    async (
      fromEntityId: string,
      toEntityId: string,
      maxDepth = 6,
    ): Promise<PathResponse | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await api.post<PathResponse>(`/api/cases/${caseId}/graph/path`, {
          from_entity_id: fromEntityId,
          to_entity_id: toEntityId,
          max_depth: maxDepth,
        });
        return result;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to get path'));
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [caseId],
  );

  const getNeighbors = useCallback(
    async (entityId: string, depth = 1): Promise<NeighborsResponse | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ depth: depth.toString() });
        const result = await api.get<NeighborsResponse>(
          `/api/cases/${caseId}/graph/neighbors/${entityId}?${params.toString()}`,
        );
        return result;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to get neighbors'));
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [caseId],
  );

  const getHubs = useCallback(
    async (limit = 10): Promise<HubsResponse | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ limit: limit.toString() });
        const result = await api.get<HubsResponse>(
          `/api/cases/${caseId}/graph/hubs?${params.toString()}`,
        );
        return result;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to get hubs'));
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [caseId],
  );

  const getStats = useCallback(async (): Promise<GraphStats | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await api.get<GraphStats>(`/api/cases/${caseId}/graph/stats`);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to get graph stats'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [caseId]);

  return {
    isLoading,
    error,
    syncGraph,
    getPath,
    getNeighbors,
    getHubs,
    getStats,
  };
}
