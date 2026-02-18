import type { DocType } from '@/types';

import { cn } from '@/lib/utils';

interface DocumentTypeBadgeProps {
  docType: DocType;
  className?: string;
}

const typeConfig: Record<DocType, { label: string; className: string }> = {
  email: {
    label: 'Email',
    className: 'bg-blue-500/15 text-blue-800 border-blue-500/30',
  },
  chat: {
    label: 'Chat',
    className: 'bg-emerald-500/15 text-emerald-800 border-emerald-500/30',
  },
  ticket: {
    label: 'Ticket',
    className: 'bg-cyan-500/15 text-cyan-800 border-cyan-500/30',
  },
  invoice: {
    label: 'Invoice',
    className: 'bg-amber-500/15 text-amber-800 border-amber-500/30',
  },
  csv: {
    label: 'CSV',
    className: 'bg-slate-500/15 text-slate-800 border-slate-500/30',
  },
  note: {
    label: 'Note',
    className: 'bg-yellow-500/15 text-yellow-800 border-yellow-500/30',
  },
  report: {
    label: 'Report',
    className: 'bg-rose-500/15 text-rose-800 border-rose-500/30',
  },
};

export function DocumentTypeBadge({ docType, className }: DocumentTypeBadgeProps) {
  const config = typeConfig[docType];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
