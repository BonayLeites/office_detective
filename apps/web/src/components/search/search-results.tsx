'use client';

import { FileSearch } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { SearchResultItem } from './search-result-item';

import type { SearchResult } from '@/types';

import { ScrollArea } from '@/components/ui/scroll-area';

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
  total: number;
  caseId: string;
  onViewDocument: (docId: string) => void;
}

export function SearchResults({
  results,
  query,
  total,
  caseId,
  onViewDocument,
}: SearchResultsProps) {
  const t = useTranslations('search');

  if (results.length === 0 && query) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileSearch className="text-muted-foreground mb-4 h-12 w-12 opacity-50" />
        <h3 className="mb-2 text-lg font-medium">{t('noResults', { query })}</h3>
        <p className="text-muted-foreground max-w-md text-sm">{t('tryDifferent')}</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileSearch className="text-muted-foreground mb-4 h-12 w-12 opacity-50" />
        <h3 className="mb-2 text-lg font-medium">{t('placeholder')}</h3>
        <p className="text-muted-foreground max-w-md text-sm">{t('tryDifferent')}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Results count */}
      <div className="border-border border-b px-4 py-2">
        <p className="text-muted-foreground text-sm">
          <span className="text-foreground font-medium">{total}</span> &quot;{query}&quot;
        </p>
      </div>

      {/* Results list */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {results.map(result => (
            <SearchResultItem
              key={result.chunk_id}
              result={result}
              caseId={caseId}
              query={query}
              onView={onViewDocument}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
