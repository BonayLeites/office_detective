'use client';

import { Check, File, FileText, Tag } from 'lucide-react';

import type { PinnedItem } from '@/types';

import { cn } from '@/lib/utils';

interface EvidenceSelectorProps {
  pinnedItems: PinnedItem[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  minRequired?: number;
}

const typeIcons: Record<PinnedItem['type'], React.ComponentType<{ className?: string }>> = {
  document: FileText,
  entity: Tag,
  chunk: File,
};

export function EvidenceSelector({
  pinnedItems,
  selectedIds,
  onToggle,
  minRequired = 1,
}: EvidenceSelectorProps) {
  const selectedCount = selectedIds.size;
  const hasMinRequired = selectedCount >= minRequired;

  if (pinnedItems.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <FileText className="text-muted-foreground mx-auto mb-2 h-8 w-8 opacity-50" />
        <p className="text-muted-foreground text-sm">
          No evidence pinned yet. Go to the Inbox or Search to pin relevant documents and chunks.
        </p>
      </div>
    );
  }

  // Group by type
  const grouped = pinnedItems.reduce<Record<PinnedItem['type'], PinnedItem[]>>(
    (acc, item) => {
      const existing = acc[item.type] as PinnedItem[] | undefined;
      acc[item.type] = existing ? [...existing, item] : [item];
      return acc;
    },
    {} as Record<PinnedItem['type'], PinnedItem[]>,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm">
          Selected: <span className="font-medium">{selectedCount}</span>
          {minRequired > 0 && (
            <span className={cn('ml-1', hasMinRequired ? 'text-green-600' : 'text-amber-600')}>
              (min {minRequired} required)
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={() => {
            pinnedItems.forEach(item => {
              onToggle(item.id);
            });
          }}
          className="text-primary text-sm hover:underline"
        >
          {selectedCount === pinnedItems.length ? 'Deselect all' : 'Select all'}
        </button>
      </div>

      {Object.entries(grouped).map(([type, items]) => {
        const Icon = typeIcons[type as PinnedItem['type']];
        return (
          <div key={type}>
            <h4 className="text-muted-foreground mb-2 flex items-center gap-2 text-xs font-semibold uppercase">
              <Icon className="h-3 w-3" />
              {type}s ({items.length})
            </h4>
            <div className="space-y-2">
              {items.map(item => {
                const isSelected = selectedIds.has(item.id);
                return (
                  <label
                    key={item.id}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors',
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50',
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-5 w-5 items-center justify-center rounded border',
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-muted-foreground',
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        onToggle(item.id);
                      }}
                      className="sr-only"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.label}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        ID: {item.id.slice(0, 8)}...
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
