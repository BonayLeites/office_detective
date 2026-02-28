'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Lightbulb, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useGameStore } from '@/stores/game-store';

export interface HypothesisNodeData extends Record<string, unknown> {
  boardId: string;
  caseId: string;
  label: string;
  status: 'supported' | 'contradicted' | 'missing';
  supportScore: number;
  contradictionScore: number;
  linkedEvidence: number;
  contradictionEvidence: string[];
}

type HypothesisNodeProps = NodeProps & { data: HypothesisNodeData };

export function HypothesisNode({ data, selected }: HypothesisNodeProps) {
  const t = useTranslations('board');
  const tStatus = useTranslations('board.hypothesis.status');
  const removeFromBoard = useGameStore(state => state.removeFromBoard);

  const statusClass =
    data.status === 'supported'
      ? 'border-emerald-500/45 bg-emerald-100/70 text-emerald-900'
      : data.status === 'contradicted'
        ? 'border-rose-500/45 bg-rose-100/70 text-rose-900'
        : 'border-amber-500/45 bg-amber-100/75 text-amber-900';
  const toneClass =
    data.status === 'supported'
      ? 'text-emerald-800'
      : data.status === 'contradicted'
        ? 'text-rose-800'
        : 'text-amber-800';

  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-amber-500" />
      <div
        className={[
          'group relative flex min-w-[180px] max-w-[240px] flex-col rounded-xl border px-4 py-3 shadow-md',
          statusClass,
          selected ? 'ring-primary ring-2 ring-offset-2' : '',
        ].join(' ')}
      >
        <button
          type="button"
          onClick={event => {
            event.stopPropagation();
            removeFromBoard(data.caseId, data.boardId);
          }}
          className="hover:border-destructive hover:text-destructive absolute -left-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border border-amber-600/30 bg-amber-50 text-amber-700 opacity-0 shadow-sm transition-all group-hover:opacity-100"
          title={t('quickActions.removeFromBoard')}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>

        <div className="mb-2 flex items-center gap-2">
          <Lightbulb className={`h-4 w-4 ${toneClass}`} />
          <span className={`text-[11px] font-semibold uppercase tracking-[0.09em] ${toneClass}`}>
            {t('hypothesis.badge')}
          </span>
        </div>
        <p className="line-clamp-4 text-sm font-semibold">{data.label}</p>
        <div className="mt-2 flex items-center justify-between text-[11px]">
          <span className="font-semibold">{tStatus(data.status)}</span>
          <span className="opacity-90">
            {data.supportScore}/{data.contradictionScore}
          </span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-amber-500" />
    </>
  );
}
