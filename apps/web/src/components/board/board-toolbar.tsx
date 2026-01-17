'use client';

import {
  ArrowRight,
  Loader2,
  Network,
  Pin,
  Plus,
  RotateCcw,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGameStore } from '@/stores/game-store';

interface BoardToolbarProps {
  caseId: string;
  onLoadHubs: () => Promise<void>;
  onSyncGraph: () => Promise<void>;
  onClearBoard: () => void;
  onAutoLayout: () => void;
  onSearch: (query: string) => void;
  isLoading: boolean;
  nodeCount: number;
}

export function BoardToolbar({
  caseId,
  onLoadHubs,
  onSyncGraph,
  onClearBoard,
  onAutoLayout,
  onSearch,
  isLoading,
  nodeCount,
}: BoardToolbarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const pinnedItems = useGameStore(state => state.pinnedItems);
  const suspectedEntities = useGameStore(state => state.suspectedEntities);
  const currentCaseId = useGameStore(state => state.currentCaseId);

  // Filter items for current case
  const casePinnedCount = pinnedItems.filter(p => p.caseId === caseId).length;
  const caseSuspectedCount = currentCaseId === caseId ? suspectedEntities.size : 0;

  const canSubmit = casePinnedCount > 0 && caseSuspectedCount > 0;

  const handleSearch = () => {
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
      setSearchQuery('');
    }
  };

  const handleGoToSubmit = () => {
    router.push(`/cases/${caseId}/submit`);
  };

  return (
    <div className="border-border bg-background/95 flex items-center gap-2 border-b px-4 py-2 backdrop-blur">
      {/* Search to add */}
      <div className="flex flex-1 gap-2">
        <Input
          placeholder="Search entities to add..."
          value={searchQuery}
          onChange={e => {
            setSearchQuery(e.target.value);
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') handleSearch();
          }}
          className="max-w-xs"
        />
        <Button variant="outline" size="icon" onClick={handleSearch} disabled={!searchQuery.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={onSyncGraph}
          disabled={isLoading}
          className="gap-2"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Network className="h-4 w-4" />
          )}
          Sync Graph
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onLoadHubs}
          disabled={isLoading}
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          Load Hubs
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onAutoLayout}
          disabled={nodeCount === 0}
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Auto Layout
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClearBoard}
          disabled={nodeCount === 0}
          className="text-destructive hover:text-destructive gap-2"
        >
          <Trash2 className="h-4 w-4" />
          Clear
        </Button>
      </div>

      {/* Divider */}
      <div className="bg-border mx-2 h-6 w-px" />

      {/* Case status counters */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm">
          <Pin className="h-4 w-4 text-blue-500" />
          <span className="font-medium">{casePinnedCount}</span>
          <span className="text-muted-foreground">evidencia</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <Star className="h-4 w-4 text-yellow-500" />
          <span className="font-medium">{caseSuspectedCount}</span>
          <span className="text-muted-foreground">sospechosos</span>
        </div>
      </div>

      {/* Submit button */}
      {canSubmit && (
        <Button size="sm" onClick={handleGoToSubmit} className="gap-2">
          Ir a Submit
          <ArrowRight className="h-4 w-4" />
        </Button>
      )}

      {/* Node count */}
      <span className="text-muted-foreground ml-auto text-sm">{nodeCount} nodes</span>
    </div>
  );
}
