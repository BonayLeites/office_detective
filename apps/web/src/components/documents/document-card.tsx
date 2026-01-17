'use client';

import { format } from 'date-fns';
import { Pin } from 'lucide-react';

import { DocumentTypeBadge } from './document-type-badge';

import type { Document } from '@/types';

import { cn } from '@/lib/utils';

interface DocumentCardProps {
  document: Document;
  isSelected?: boolean;
  isRead?: boolean;
  isPinned?: boolean;
  onSelect: (docId: string) => void;
  onPin: (docId: string) => void;
}

export function DocumentCard({
  document,
  isSelected = false,
  isRead = true,
  isPinned = false,
  onSelect,
  onPin,
}: DocumentCardProps) {
  const formattedDate = format(new Date(document.ts), 'MMM d, yyyy HH:mm');
  const previewText = document.body.slice(0, 100) + (document.body.length > 100 ? '...' : '');

  return (
    <div
      className={cn(
        'group relative cursor-pointer rounded-lg border p-3 transition-colors',
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50 hover:bg-accent/50',
        !isRead && 'border-l-4 border-l-blue-500',
      )}
      onClick={() => {
        onSelect(document.doc_id);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(document.doc_id);
        }
      }}
    >
      {/* Unread indicator */}
      {!isRead && (
        <span
          className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-500"
          data-testid="unread-indicator"
        />
      )}

      {/* Pin button */}
      <button
        className={cn(
          'absolute right-2 top-2 rounded p-1 opacity-0 transition-opacity group-hover:opacity-100',
          isPinned ? 'text-primary opacity-100' : 'text-muted-foreground hover:text-foreground',
          !isRead && 'right-6',
        )}
        onClick={e => {
          e.stopPropagation();
          onPin(document.doc_id);
        }}
        title={isPinned ? 'Unpin document' : 'Pin document'}
      >
        <Pin className={cn('h-4 w-4', isPinned && 'fill-current')} />
      </button>

      {/* Header */}
      <div className="mb-2 flex items-center gap-2">
        <DocumentTypeBadge docType={document.doc_type} />
        <span className="text-muted-foreground text-xs">{formattedDate}</span>
      </div>

      {/* Subject */}
      {document.subject && (
        <h3 className="mb-1 truncate text-sm font-medium">{document.subject}</h3>
      )}

      {/* Preview */}
      <p className="text-muted-foreground line-clamp-2 text-xs">{previewText}</p>
    </div>
  );
}
