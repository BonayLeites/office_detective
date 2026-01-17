'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { FileText } from 'lucide-react';

import type { Document } from '@/types';

import { DocumentTypeBadge } from '@/components/documents/document-type-badge';
import { cn } from '@/lib/utils';

export interface DocumentNodeData extends Record<string, unknown> {
  document: Document;
  label: string;
}

type DocumentNodeProps = NodeProps & { data: DocumentNodeData };

export function DocumentNode({ data, selected }: DocumentNodeProps) {
  const { document } = data;
  const docType = document.doc_type;
  const subject = document.subject ?? docType;

  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-secondary" />
      <div
        className={cn(
          'bg-background flex min-w-[100px] max-w-[180px] flex-col rounded-md border p-2 shadow-sm transition-shadow',
          selected && 'ring-primary ring-2 ring-offset-2',
        )}
      >
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
