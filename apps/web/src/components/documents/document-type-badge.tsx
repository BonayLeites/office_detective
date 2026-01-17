import type { DocType } from '@/types';

import { cn } from '@/lib/utils';

interface DocumentTypeBadgeProps {
  docType: DocType;
  className?: string;
}

const typeConfig: Record<DocType, { label: string; className: string }> = {
  email: {
    label: 'Email',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  },
  chat: {
    label: 'Chat',
    className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  },
  ticket: {
    label: 'Ticket',
    className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  },
  invoice: {
    label: 'Invoice',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  },
  csv: {
    label: 'CSV',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  },
  note: {
    label: 'Note',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  },
  report: {
    label: 'Report',
    className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  },
};

export function DocumentTypeBadge({ docType, className }: DocumentTypeBadgeProps) {
  const config = typeConfig[docType];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
