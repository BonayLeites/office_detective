'use client';

import { useCallback, useState } from 'react';

import type { DocType, SearchResponse, SearchResult } from '@/types';

import { api } from '@/lib/api';

interface SearchOptions {
  k?: number;
  docTypes?: DocType[];
  minScore?: number;
}

interface UseSearchReturn {
  results: SearchResult[];
  query: string;
  total: number;
  isSearching: boolean;
  error: Error | null;
  search: (query: string, options?: SearchOptions) => Promise<void>;
  clearResults: () => void;
}

export function useSearch(caseId: string): UseSearchReturn {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [query, setQuery] = useState('');
  const [total, setTotal] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const search = useCallback(
    async (searchQuery: string, options: SearchOptions = {}) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setQuery('');
        setTotal(0);
        return;
      }

      try {
        setIsSearching(true);
        setError(null);

        const body: Record<string, unknown> = {
          query: searchQuery,
          k: options.k ?? 10,
        };

        if (options.docTypes && options.docTypes.length > 0) {
          body['doc_types'] = options.docTypes;
        }

        if (options.minScore !== undefined) {
          body['min_score'] = options.minScore;
        }

        const data = await api.post<SearchResponse>(`/api/cases/${caseId}/search`, body);

        setResults(data.results);
        setQuery(data.query);
        setTotal(data.total);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Search failed'));
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [caseId],
  );

  const clearResults = useCallback(() => {
    setResults([]);
    setQuery('');
    setTotal(0);
    setError(null);
  }, []);

  return {
    results,
    query,
    total,
    isSearching,
    error,
    search,
    clearResults,
  };
}
