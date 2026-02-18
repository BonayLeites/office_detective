'use client';

import { use, useState } from 'react';

import { DocumentViewer } from '@/components/documents/document-viewer';
import { SearchBar } from '@/components/search/search-bar';
import { SearchResults } from '@/components/search/search-results';
import { useDocument } from '@/hooks/use-documents';
import { useSearch } from '@/hooks/use-search';
import { cn } from '@/lib/utils';

interface SearchPageProps {
  params: Promise<{ caseId: string }>;
}

export default function SearchPage({ params }: SearchPageProps) {
  const { caseId } = use(params);
  const { results, query, total, isSearching, search } = useSearch(caseId);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const { document, isLoading } = useDocument(caseId, selectedDocId);

  return (
    <div className="bg-card/35 flex h-full flex-col">
      {/* Search Bar */}
      <div className="ink-divider border-border/70 paper-panel animate-reveal-up border-b p-4">
        <SearchBar onSearch={search} isSearching={isSearching} />
      </div>

      {/* Results and Document Viewer */}
      <div className="flex flex-1 overflow-hidden">
        <div
          className={cn(
            'animate-reveal-up-delay flex-1 transition-all duration-300',
            selectedDocId ? 'hidden md:block md:w-1/2' : 'w-full',
          )}
        >
          <SearchResults
            results={results}
            query={query}
            total={total}
            caseId={caseId}
            onViewDocument={setSelectedDocId}
          />
        </div>

        {selectedDocId && (
          <div className="border-border/80 paper-panel animate-reveal-scale w-full border-l md:w-1/2">
            <DocumentViewer
              document={document}
              caseId={caseId}
              isLoading={isLoading}
              onClose={() => {
                setSelectedDocId(null);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
