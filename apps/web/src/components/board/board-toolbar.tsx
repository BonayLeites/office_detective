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
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from '@/i18n/navigation';
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
  const t = useTranslations('board');
  const tCommon = useTranslations('common');
  const [searchQuery, setSearchQuery] = useState('');
  const pinnedItems = useGameStore(state => state.pinnedItems);
  const suspectedEntities = useGameStore(state => state.suspectedEntities);
  const currentCaseId = useGameStore(state => state.currentCaseId);

  // Filter items for current case
  const casePinnedCount = pinnedItems.filter(p => p.caseId === caseId).length;
  const caseSuspectedCount = currentCaseId === caseId ? suspectedEntities.length : 0;

  const canSubmit = casePinnedCount > 0 && caseSuspectedCount > 0;

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
          placeholder={t('searchPlaceholder')}
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
          {t('syncGraph')}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onLoadHubs}
          disabled={isLoading}
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          {t('loadHubs')}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onAutoLayout}
          disabled={nodeCount === 0}
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          {t('autoLayout')}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClearBoard}
          disabled={nodeCount === 0}
          className="text-destructive hover:text-destructive gap-2"
        >
          <Trash2 className="h-4 w-4" />
          {tCommon('clear')}
        </Button>
      </div>

      {/* Divider */}
      <div className="bg-border mx-2 h-6 w-px" />

      {/* Case status counters */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm">
          <Pin className="h-4 w-4 text-blue-500" />
          <span className="font-medium">{casePinnedCount}</span>
          <span className="text-muted-foreground">{t('evidence')}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <Star className="h-4 w-4 text-yellow-500" />
          <span className="font-medium">{caseSuspectedCount}</span>
          <span className="text-muted-foreground">{t('suspects')}</span>
        </div>
      </div>

      {/* Submit button */}
      {canSubmit && (
        <Link
          href={`/cases/${caseId}/submit`}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium"
        >
          {t('goToSubmit')}
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}

      {/* Node count */}
      <span className="text-muted-foreground ml-auto text-sm">
        {t('nodes', { count: nodeCount })}
      </span>
    </div>
  );
}
