'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { FileText, Pin, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { Document, EvidenceReliability } from '@/types';

import { DocumentTypeBadge } from '@/components/documents/document-type-badge';
import { cn } from '@/lib/utils';
import { useGameStore } from '@/stores/game-store';

export interface DocumentNodeData extends Record<string, unknown> {
  document: Document;
  label: string;
  caseId: string;
  boardId: string;
  reliability: EvidenceReliability;
}

type DocumentNodeProps = NodeProps & { data: DocumentNodeData };

function getReliabilityPill(reliability: EvidenceReliability): {
  key: EvidenceReliability;
  className: string;
} {
  if (reliability === 'reliable') {
    return {
      key: 'reliable',
      className: 'border-emerald-500/30 bg-emerald-500/12 text-emerald-700',
    };
  }
  if (reliability === 'false') {
    return {
      key: 'false',
      className: 'border-rose-500/30 bg-rose-500/12 text-rose-700',
    };
  }
  return {
    key: 'uncertain',
    className: 'border-amber-500/30 bg-amber-500/12 text-amber-700',
  };
}

export function DocumentNode({ data, selected }: DocumentNodeProps) {
  const t = useTranslations('board.reliability');
  const { document, caseId, reliability } = data;
  const docType = document.doc_type;
  const subject = document.subject ?? docType;
  const reliabilityPill = getReliabilityPill(reliability);

  const pinItem = useGameStore(state => state.pinItem);
  const unpinItem = useGameStore(state => state.unpinItem);
  const removeFromBoard = useGameStore(state => state.removeFromBoard);
  const pinned = useGameStore(state =>
    state.pinnedItems.some(p => p.caseId === caseId && p.id === document.doc_id),
  );

  const handlePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (pinned) {
      unpinItem(caseId, document.doc_id);
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

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeFromBoard(caseId, `document-${document.doc_id}`);
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
        <button
          onClick={handleRemove}
          className="hover:border-destructive hover:text-destructive absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-400 opacity-0 shadow-sm transition-all group-hover:opacity-100 dark:border-gray-600 dark:bg-gray-800"
          title="Quitar del tablero"
        >
          <Trash2 className="h-3 w-3" />
        </button>

        <div className="mb-1 flex items-center gap-1">
          <FileText className="h-3 w-3 flex-shrink-0" />
          <DocumentTypeBadge docType={docType} className="text-[10px]" />
        </div>
        <span className="line-clamp-2 text-xs font-medium">{subject}</span>
        <span
          className={cn(
            'mt-1 inline-flex w-fit rounded-md border px-1.5 py-0.5 text-[10px] font-semibold',
            reliabilityPill.className,
          )}
        >
          {t(reliabilityPill.key)}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-secondary" />
    </>
  );
}
