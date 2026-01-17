'use client';

import { useCallback, useEffect, useState } from 'react';

import type { Entity, EntityListResponse, EntityType } from '@/types';

import { api } from '@/lib/api';

interface UseEntitiesOptions {
  entityType?: EntityType;
  limit?: number;
}

interface UseEntitiesReturn {
  entities: Entity[];
  isLoading: boolean;
  error: Error | null;
  total: number;
  refresh: () => Promise<void>;
}

export function useEntities(caseId: string, options: UseEntitiesOptions = {}): UseEntitiesReturn {
  const { entityType, limit = 100 } = options;
  const [entities, setEntities] = useState<Entity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);

  const fetchEntities = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        skip: '0',
        limit: limit.toString(),
      });
      if (entityType) {
        params.set('entity_type', entityType);
      }

      const data = await api.get<EntityListResponse>(
        `/api/cases/${caseId}/entities?${params.toString()}`,
      );

      setEntities(data.entities);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch entities'));
    } finally {
      setIsLoading(false);
    }
  }, [caseId, entityType, limit]);

  useEffect(() => {
    void fetchEntities();
  }, [fetchEntities]);

  return {
    entities,
    isLoading,
    error,
    total,
    refresh: fetchEntities,
  };
}

interface UseEntityReturn {
  entity: Entity | null;
  isLoading: boolean;
  error: Error | null;
}

export function useEntity(caseId: string, entityId: string | null): UseEntityReturn {
  const [entity, setEntity] = useState<Entity | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!entityId) {
      setEntity(null);
      return;
    }

    async function fetchEntity() {
      try {
        setIsLoading(true);
        const data = await api.get<Entity>(`/api/cases/${caseId}/entities/${String(entityId)}`);
        setEntity(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch entity'));
        setEntity(null);
      } finally {
        setIsLoading(false);
      }
    }

    void fetchEntity();
  }, [caseId, entityId]);

  return { entity, isLoading, error };
}
