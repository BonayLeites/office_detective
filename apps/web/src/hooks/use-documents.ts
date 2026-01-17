'use client';

import { useCallback, useEffect, useState } from 'react';

import type { DocType, Document, DocumentListResponse, DocumentWithChunks } from '@/types';

import { api } from '@/lib/api';

interface UseDocumentsOptions {
  docType?: DocType;
  limit?: number;
}

interface UseDocumentsReturn {
  documents: Document[];
  isLoading: boolean;
  error: Error | null;
  total: number;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useDocuments(
  caseId: string,
  options: UseDocumentsOptions = {},
): UseDocumentsReturn {
  const { docType, limit = 20 } = options;
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);

  const fetchDocuments = useCallback(
    async (skip: number, append = false) => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams({
          skip: skip.toString(),
          limit: limit.toString(),
        });
        if (docType) {
          params.set('doc_type', docType);
        }

        const data = await api.get<DocumentListResponse>(
          `/api/cases/${caseId}/documents?${params.toString()}`,
        );

        setDocuments(prev => (append ? [...prev, ...data.documents] : data.documents));
        setTotal(data.total);
        setOffset(skip + data.documents.length);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch documents'));
      } finally {
        setIsLoading(false);
      }
    },
    [caseId, docType, limit],
  );

  useEffect(() => {
    setDocuments([]);
    setOffset(0);
    void fetchDocuments(0, false);
  }, [fetchDocuments]);

  const loadMore = useCallback(async () => {
    if (!isLoading && offset < total) {
      await fetchDocuments(offset, true);
    }
  }, [fetchDocuments, isLoading, offset, total]);

  const refresh = useCallback(async () => {
    setDocuments([]);
    setOffset(0);
    await fetchDocuments(0, false);
  }, [fetchDocuments]);

  return {
    documents,
    isLoading,
    error,
    total,
    hasMore: offset < total,
    loadMore,
    refresh,
  };
}

interface UseDocumentReturn {
  document: DocumentWithChunks | null;
  isLoading: boolean;
  error: Error | null;
}

export function useDocument(caseId: string, docId: string | null): UseDocumentReturn {
  const [document, setDocument] = useState<DocumentWithChunks | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!docId) {
      setDocument(null);
      return;
    }

    async function fetchDocument() {
      try {
        setIsLoading(true);
        const data = await api.get<DocumentWithChunks>(
          `/api/cases/${caseId}/documents/${String(docId)}/full`,
        );
        setDocument(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch document'));
        setDocument(null);
      } finally {
        setIsLoading(false);
      }
    }

    void fetchDocument();
  }, [caseId, docId]);

  return { document, isLoading, error };
}
