'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  Building2,
  CreditCard,
  MapPin,
  Package,
  Pin,
  Server,
  Star,
  Ticket,
  User,
} from 'lucide-react';

import type { Entity, EntityType } from '@/types';

import { cn } from '@/lib/utils';
import { useGameStore } from '@/stores/game-store';

const entityIcons: Record<EntityType, React.ComponentType<{ className?: string }>> = {
  person: User,
  org: Building2,
  account: CreditCard,
  sku: Package,
  ip: Server,
  location: MapPin,
  order: Package,
  ticket: Ticket,
};

interface EntityColorScheme {
  bg: string;
  border: string;
  text: string;
  icon: string;
}

const entityColors: Record<EntityType, EntityColorScheme> = {
  person: {
    bg: 'bg-blue-50 dark:bg-slate-800',
    border: 'border-blue-400 dark:border-blue-500',
    text: 'text-blue-900 dark:text-blue-100',
    icon: 'text-blue-600 dark:text-blue-400',
  },
  org: {
    bg: 'bg-violet-50 dark:bg-slate-800',
    border: 'border-violet-400 dark:border-violet-500',
    text: 'text-violet-900 dark:text-violet-100',
    icon: 'text-violet-600 dark:text-violet-400',
  },
  account: {
    bg: 'bg-emerald-50 dark:bg-slate-800',
    border: 'border-emerald-400 dark:border-emerald-500',
    text: 'text-emerald-900 dark:text-emerald-100',
    icon: 'text-emerald-600 dark:text-emerald-400',
  },
  sku: {
    bg: 'bg-orange-50 dark:bg-slate-800',
    border: 'border-orange-400 dark:border-orange-500',
    text: 'text-orange-900 dark:text-orange-100',
    icon: 'text-orange-600 dark:text-orange-400',
  },
  ip: {
    bg: 'bg-slate-50 dark:bg-slate-800',
    border: 'border-slate-400 dark:border-slate-500',
    text: 'text-slate-900 dark:text-slate-100',
    icon: 'text-slate-600 dark:text-slate-400',
  },
  location: {
    bg: 'bg-rose-50 dark:bg-slate-800',
    border: 'border-rose-400 dark:border-rose-500',
    text: 'text-rose-900 dark:text-rose-100',
    icon: 'text-rose-600 dark:text-rose-400',
  },
  order: {
    bg: 'bg-amber-50 dark:bg-slate-800',
    border: 'border-amber-400 dark:border-amber-500',
    text: 'text-amber-900 dark:text-amber-100',
    icon: 'text-amber-600 dark:text-amber-400',
  },
  ticket: {
    bg: 'bg-pink-50 dark:bg-slate-800',
    border: 'border-pink-400 dark:border-pink-500',
    text: 'text-pink-900 dark:text-pink-100',
    icon: 'text-pink-600 dark:text-pink-400',
  },
};

export interface EntityNodeData extends Record<string, unknown> {
  entity: Entity;
  label: string;
  caseId: string;
}

type EntityNodeProps = NodeProps & { data: EntityNodeData };

export function EntityNode({ data, selected }: EntityNodeProps) {
  const { entity, caseId } = data;
  const entityType = entity.entity_type;
  const Icon = entityIcons[entityType];
  const colors = entityColors[entityType];

  const pinItem = useGameStore(state => state.pinItem);
  const unpinItem = useGameStore(state => state.unpinItem);
  const toggleSuspect = useGameStore(state => state.toggleSuspect);
  const pinned = useGameStore(state => state.pinnedItems.some(p => p.id === entity.entity_id));
  const suspected = useGameStore(state => state.suspectedEntities.has(entity.entity_id));
  const isPerson = entityType === 'person';

  const handlePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (pinned) {
      unpinItem(entity.entity_id);
    } else {
      pinItem({
        id: entity.entity_id,
        type: 'entity',
        caseId,
        label: entity.name,
        data: entity as unknown as Record<string, unknown>,
      });
    }
  };

  const handleSuspect = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSuspect(entity.entity_id);
  };

  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-primary !h-2 !w-2" />
      <div
        className={cn(
          'group relative flex min-w-[140px] flex-col items-center rounded-xl border-2 px-4 py-3 shadow-lg transition-all hover:shadow-xl',
          colors.bg,
          colors.border,
          selected && 'ring-primary ring-2 ring-offset-2',
          suspected && 'ring-2 ring-yellow-500 ring-offset-1',
        )}
      >
        {/* Action buttons - visible on hover or when active */}
        <div
          className={cn(
            'absolute -top-2 right-0 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100',
            (pinned || suspected) && 'opacity-100',
          )}
        >
          {isPerson && (
            <button
              onClick={handleSuspect}
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full border shadow-sm transition-colors',
                suspected
                  ? 'border-yellow-400 bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400'
                  : 'border-gray-300 bg-white text-gray-400 hover:border-yellow-400 hover:text-yellow-500 dark:border-gray-600 dark:bg-gray-800',
              )}
              title={suspected ? 'Quitar sospechoso' : 'Marcar como sospechoso'}
            >
              <Star className={cn('h-3.5 w-3.5', suspected && 'fill-current')} />
            </button>
          )}
          <button
            onClick={handlePin}
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-full border shadow-sm transition-colors',
              pinned
                ? 'border-blue-400 bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                : 'border-gray-300 bg-white text-gray-400 hover:border-blue-400 hover:text-blue-500 dark:border-gray-600 dark:bg-gray-800',
            )}
            title={pinned ? 'Quitar de evidencia' : 'Agregar a evidencia'}
          >
            <Pin className={cn('h-3.5 w-3.5', pinned && 'fill-current')} />
          </button>
        </div>

        <div
          className={cn(
            'mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 dark:bg-slate-900/80',
            colors.icon,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <span
          className={cn('max-w-[140px] truncate text-center text-sm font-semibold', colors.text)}
        >
          {entity.name}
        </span>
        <span className={cn('mt-0.5 text-xs font-medium capitalize opacity-70', colors.text)}>
          {entityType}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-primary !h-2 !w-2" />
    </>
  );
}
