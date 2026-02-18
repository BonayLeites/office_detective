'use client';

import { format } from 'date-fns';
import { Pin } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { DocumentTypeBadge } from './document-type-badge';

import type { Document } from '@/types';

import { cn } from '@/lib/utils';

interface DocumentCardProps {
  document: Document;
  style?: React.CSSProperties;
  isSelected?: boolean;
  isRead?: boolean;
  isPinned?: boolean;
  onSelect: (docId: string) => void;
  onPin: (docId: string) => void;
}

export function DocumentCard({
  document,
  style,
  isSelected = false,
  isRead = true,
  isPinned = false,
  onSelect,
  onPin,
}: DocumentCardProps) {
  const t = useTranslations('documents');
  const formattedDate = format(new Date(document.ts), 'MMM d, yyyy HH:mm');
  const previewText = document.body.slice(0, 100) + (document.body.length > 100 ? '...' : '');

  return (
    <div
      className={cn(
        'surface-lift group relative cursor-pointer rounded-xl border p-3 transition-all duration-200',
        isSelected
          ? 'border-primary/60 bg-primary/10 shadow-[0_16px_28px_-24px_hsl(var(--primary)/0.95)]'
          : 'border-border/80 bg-card/70 hover:border-primary/40 hover:bg-card hover:-translate-y-0.5',
        !isRead && 'border-l-primary border-l-4',
      )}
      style={style}
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
          className="bg-primary absolute right-2 top-2 h-2 w-2 rounded-full"
          data-testid="unread-indicator"
        />
      )}

      {/* Pin button */}
      <button
        className={cn(
          'absolute right-2 top-2 rounded p-1 transition-opacity',
          isPinned
            ? 'text-primary opacity-100'
            : 'text-muted-foreground hover:text-foreground opacity-0 group-hover:scale-105 group-hover:opacity-100',
          !isRead && 'right-6',
        )}
        onClick={e => {
          e.stopPropagation();
          onPin(document.doc_id);
        }}
        title={isPinned ? t('removeFromEvidence') : t('addToEvidence')}
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
