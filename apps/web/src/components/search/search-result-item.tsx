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
  style?: React.CSSProperties;
  caseId: string;
  query: string;
  onView: (docId: string) => void;
}

export function SearchResultItem({ result, style, caseId, query, onView }: SearchResultItemProps) {
  const pinnedItems = useGameStore(state => state.pinnedItems);
  const pinItem = useGameStore(state => state.pinItem);
  const unpinItem = useGameStore(state => state.unpinItem);

  const isPinned = pinnedItems.some(p => p.caseId === caseId && p.id === result.chunk_id);
  const scorePercent = Math.round(result.score * 100);
  const formattedDate = format(new Date(result.ts), 'MMM d, yyyy');

  // Highlight query terms in text
  const highlightedText = highlightQuery(result.text, query);

  const handlePin = () => {
    if (isPinned) {
      unpinItem(caseId, result.chunk_id);
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
    <div
      className="surface-lift border-border/80 bg-card/70 hover:bg-card rounded-xl border p-4 transition-all duration-200 hover:-translate-y-0.5"
      style={style}
    >
      {/* Header */}
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <DocumentTypeBadge docType={result.doc_type} />
          <span className="text-muted-foreground text-xs">{formattedDate}</span>
          <span
            className={cn(
              'rounded-full border px-2 py-0.5 text-xs font-medium',
              scorePercent >= 80
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
                : scorePercent >= 60
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-700'
                  : 'border-slate-500/25 bg-slate-500/10 text-slate-700',
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
    result = result.replace(regex, '<mark class="rounded bg-amber-300/60 px-0.5">$1</mark>');
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
