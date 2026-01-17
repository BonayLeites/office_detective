'use client';

import { FileSearch } from 'lucide-react';

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
  if (results.length === 0 && query) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileSearch className="text-muted-foreground mb-4 h-12 w-12 opacity-50" />
        <h3 className="mb-2 text-lg font-medium">No results found</h3>
        <p className="text-muted-foreground max-w-md text-sm">
          Try different keywords or phrases. Semantic search works best with descriptive queries
          like &quot;suspicious vendor payments&quot; or &quot;communication about budget&quot;.
        </p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileSearch className="text-muted-foreground mb-4 h-12 w-12 opacity-50" />
        <h3 className="mb-2 text-lg font-medium">Search documents</h3>
        <p className="text-muted-foreground max-w-md text-sm">
          Enter a query above to search through case documents using semantic similarity. Results
          will show the most relevant document chunks.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Results count */}
      <div className="border-border border-b px-4 py-2">
        <p className="text-muted-foreground text-sm">
          Found <span className="text-foreground font-medium">{total}</span> results for{' '}
          <span className="text-foreground font-medium">&quot;{query}&quot;</span>
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
