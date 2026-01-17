'use client';

import { Loader2, Network, Plus, RotateCcw, Sparkles, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface BoardToolbarProps {
  onLoadHubs: () => Promise<void>;
  onSyncGraph: () => Promise<void>;
  onClearBoard: () => void;
  onAutoLayout: () => void;
  onSearch: (query: string) => void;
  isLoading: boolean;
  nodeCount: number;
}

export function BoardToolbar({
  onLoadHubs,
  onSyncGraph,
  onClearBoard,
  onAutoLayout,
  onSearch,
  isLoading,
  nodeCount,
}: BoardToolbarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = () => {
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
      setSearchQuery('');
    }
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

      {/* Node count */}
      <span className="text-muted-foreground text-sm">{nodeCount} nodes</span>
    </div>
  );
}
