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
        'inline-flex items-center rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800',
        className,
      )}
      title={citation.quote.slice(0, 100)}
    >
      [{index + 1}]
    </button>
  );
}
