'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { FileText, Pin } from 'lucide-react';

import type { Document } from '@/types';

import { DocumentTypeBadge } from '@/components/documents/document-type-badge';
import { cn } from '@/lib/utils';
import { useGameStore } from '@/stores/game-store';

export interface DocumentNodeData extends Record<string, unknown> {
  document: Document;
  label: string;
  caseId: string;
}

type DocumentNodeProps = NodeProps & { data: DocumentNodeData };

export function DocumentNode({ data, selected }: DocumentNodeProps) {
  const { document, caseId } = data;
  const docType = document.doc_type;
  const subject = document.subject ?? docType;

  const { pinItem, unpinItem, isPinned } = useGameStore();
  const pinned = isPinned(document.doc_id);

  const handlePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (pinned) {
      unpinItem(document.doc_id);
    } else {
      pinItem({
        id: document.doc_id,
        type: 'document',
        caseId,
        label: subject,
        data: document as unknown as Record<string, unknown>,
      });
    }
  };

  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-secondary" />
      <div
        className={cn(
          'bg-background group relative flex min-w-[100px] max-w-[180px] flex-col rounded-md border p-2 shadow-sm transition-shadow',
          selected && 'ring-primary ring-2 ring-offset-2',
          pinned && 'ring-2 ring-blue-400 ring-offset-1',
        )}
      >
        {/* Pin button - visible on hover or when pinned */}
        <button
          onClick={handlePin}
          className={cn(
            'absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border opacity-0 shadow-sm transition-all group-hover:opacity-100',
            pinned
              ? 'border-blue-400 bg-blue-100 text-blue-600 opacity-100 dark:bg-blue-900 dark:text-blue-400'
              : 'border-gray-300 bg-white text-gray-400 hover:border-blue-400 hover:text-blue-500 dark:border-gray-600 dark:bg-gray-800',
          )}
          title={pinned ? 'Quitar de evidencia' : 'Agregar a evidencia'}
        >
          <Pin className={cn('h-3 w-3', pinned && 'fill-current')} />
        </button>

        <div className="mb-1 flex items-center gap-1">
          <FileText className="h-3 w-3 flex-shrink-0" />
          <DocumentTypeBadge docType={docType} className="text-[10px]" />
        </div>
        <span className="line-clamp-2 text-xs font-medium">{subject}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-secondary" />
    </>
  );
}
