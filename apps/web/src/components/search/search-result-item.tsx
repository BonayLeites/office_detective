'use client';

import { format } from 'date-fns';
import { ExternalLink, Pin } from 'lucide-react';

import type { SearchResult } from '@/types';

import { DocumentTypeBadge } from '@/components/documents/document-type-badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useGameStore } from '@/stores/game-store';

interface SearchResultItemProps {
  result: SearchResult;
  caseId: string;
  query: string;
  onView: (docId: string) => void;
}

export function SearchResultItem({ result, caseId, query, onView }: SearchResultItemProps) {
  const pinnedItems = useGameStore(state => state.pinnedItems);
  const pinItem = useGameStore(state => state.pinItem);
  const unpinItem = useGameStore(state => state.unpinItem);

  const isPinned = pinnedItems.some(p => p.id === result.chunk_id);
  const scorePercent = Math.round(result.score * 100);
  const formattedDate = format(new Date(result.ts), 'MMM d, yyyy');

  // Highlight query terms in text
  const highlightedText = highlightQuery(result.text, query);

  const handlePin = () => {
    if (isPinned) {
      unpinItem(result.chunk_id);
    } else {
      pinItem({
        id: result.chunk_id,
        type: 'chunk',
        caseId,
        label: result.subject ?? `Chunk from ${result.doc_type}`,
        data: {
          docId: result.doc_id,
          text: result.text,
          score: result.score,
        },
      });
    }
  };

  return (
    <div className="border-border hover:bg-accent/50 rounded-lg border p-4 transition-colors">
      {/* Header */}
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <DocumentTypeBadge docType={result.doc_type} />
          <span className="text-muted-foreground text-xs">{formattedDate}</span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-medium',
              scorePercent >= 80
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : scorePercent >= 60
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
            )}
          >
            {scorePercent}% match
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePin}
            title={isPinned ? 'Unpin' : 'Pin to evidence'}
            className="h-8 w-8"
          >
            <Pin className={cn('h-4 w-4', isPinned && 'text-primary fill-current')} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              onView(result.doc_id);
            }}
            title="View document"
            className="h-8 w-8"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Subject */}
      {result.subject && <h4 className="mb-1 font-medium">{result.subject}</h4>}

      {/* Text with highlighted query */}
      <p
        className="text-muted-foreground text-sm"
        dangerouslySetInnerHTML={{ __html: highlightedText }}
      />
    </div>
  );
}

function highlightQuery(text: string, query: string): string {
  if (!query.trim()) return escapeHtml(text);

  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  let result = escapeHtml(text);

  for (const word of words) {
    const regex = new RegExp(`(${escapeRegex(word)})`, 'gi');
    result = result.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
  }

  return result;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
