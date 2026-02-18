'use client';

import type { Citation } from '@/types';

import { cn } from '@/lib/utils';

interface CitationBadgeProps {
  citation: Citation;
  index: number;
  onClick: (citation: Citation) => void;
  className?: string;
}

export function CitationBadge({ citation, index, onClick, className }: CitationBadgeProps) {
  return (
    <button
      type="button"
      onClick={() => {
        onClick(citation);
      }}
      className={cn(
        'border-primary/25 bg-primary/10 text-primary hover:bg-primary/20 inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium transition-colors',
        className,
      )}
      title={citation.quote.slice(0, 100)}
    >
      [{index + 1}]
    </button>
  );
}
