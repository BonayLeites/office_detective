'use client';

import {
  ArrowRight,
  Loader2,
  Network,
  Pin,
  Plus,
  Route,
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
  onTraceSuspects: () => Promise<void>;
  onClearBoard: () => void;
  onAutoLayout: () => void;
  onSearch: (query: string) => void;
  connectionType: string;
  onConnectionTypeChange: (type: string) => void;
  isLoading: boolean;
  suspectCount: number;
  nodeCount: number;
  edgeCount: number;
  manualEdgeCount: number;
}

export function BoardToolbar({
  caseId,
  onLoadHubs,
  onSyncGraph,
  onTraceSuspects,
  onClearBoard,
  onAutoLayout,
  onSearch,
  connectionType,
  onConnectionTypeChange,
  isLoading,
  suspectCount,
  nodeCount,
  edgeCount,
  manualEdgeCount,
}: BoardToolbarProps) {
  const t = useTranslations('board');
  const tCommon = useTranslations('common');
  const [searchQuery, setSearchQuery] = useState('');
  const pinnedItems = useGameStore(state => state.pinnedItems);
  const suspectedEntities = useGameStore(state => state.getSuspectedEntities(caseId));

  // Filter items for current case
  const casePinnedCount = pinnedItems.filter(p => p.caseId === caseId).length;
  const caseSuspectedCount = suspectedEntities.length;

  const canSubmit = casePinnedCount > 0 && caseSuspectedCount > 0;

  const handleSearch = () => {
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
      setSearchQuery('');
    }
  };

  return (
    <div className="ink-divider paper-panel border-border/80 flex flex-col gap-2 border-b px-3 py-2 backdrop-blur md:flex-row md:items-center md:px-4">
      {/* Search to add */}
      <div className="flex w-full gap-2 md:flex-1">
        <Input
          placeholder={t('searchPlaceholder')}
          value={searchQuery}
          onChange={e => {
            setSearchQuery(e.target.value);
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') handleSearch();
          }}
          className="w-full rounded-lg md:max-w-xs"
        />
        <Button
          variant="outline"
          size="icon"
          onClick={handleSearch}
          disabled={!searchQuery.trim()}
          className="rounded-lg"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Actions */}
      <div className="no-scrollbar flex w-full items-center gap-1 overflow-x-auto pb-1 md:w-auto md:overflow-visible md:pb-0">
        <Button
          variant="outline"
          size="sm"
          onClick={onSyncGraph}
          disabled={isLoading}
          className="gap-2 whitespace-nowrap"
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
          className="gap-2 whitespace-nowrap"
        >
          <Sparkles className="h-4 w-4" />
          {t('loadHubs')}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onTraceSuspects}
          disabled={isLoading || suspectCount < 2}
          className="gap-2 whitespace-nowrap"
          title={suspectCount < 2 ? t('needTwoSuspects') : t('tracePath')}
        >
          <Route className="h-4 w-4" />
          {t('tracePath')}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onAutoLayout}
          disabled={nodeCount === 0}
          className="gap-2 whitespace-nowrap"
        >
          <RotateCcw className="h-4 w-4" />
          {t('autoLayout')}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClearBoard}
          disabled={nodeCount === 0}
          className="text-destructive hover:text-destructive gap-2 whitespace-nowrap"
        >
          <Trash2 className="h-4 w-4" />
          {tCommon('clear')}
        </Button>

        <select
          value={connectionType}
          onChange={event => {
            onConnectionTypeChange(event.target.value);
          }}
          className="bg-background border-border/80 h-9 rounded-md border px-2 text-xs md:text-sm"
          title="Connection type"
        >
          <option value="LINKED">Link</option>
          <option value="SENT">Sent</option>
          <option value="MENTIONS">Mentions</option>
          <option value="APPROVED">Approved</option>
          <option value="PAID_TO">Paid To</option>
          <option value="WORKS_AT">Works At</option>
        </select>
      </div>

      <div className="flex w-full items-center gap-3 md:ml-auto md:w-auto">
        <div className="bg-border/80 hidden h-6 w-px md:block" />

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs md:text-sm">
            <Pin className="h-4 w-4 text-blue-500" />
            <span className="font-medium">{casePinnedCount}</span>
            <span className="text-muted-foreground">{t('evidence')}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs md:text-sm">
            <Star className="h-4 w-4 text-yellow-500" />
            <span className="font-medium">{caseSuspectedCount}</span>
            <span className="text-muted-foreground">{t('suspects')}</span>
          </div>
        </div>

        {canSubmit && (
          <Link
            href={`/cases/${caseId}/submit`}
            className="bg-primary text-primary-foreground hover:bg-primary/90 ml-auto inline-flex h-8 items-center justify-center gap-2 rounded-md px-3 text-xs font-medium md:ml-0 md:h-9 md:text-sm"
          >
            {t('goToSubmit')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}

        <span className="text-muted-foreground ml-auto whitespace-nowrap text-xs md:text-sm">
          {t('nodes', { count: nodeCount })}
        </span>
        <span className="text-muted-foreground whitespace-nowrap text-xs md:text-sm">
          {t('links', { count: edgeCount })}
        </span>
        {manualEdgeCount > 0 && (
          <span className="text-muted-foreground whitespace-nowrap text-xs md:text-sm">
            {t('manualLinks', { count: manualEdgeCount })}
          </span>
        )}
      </div>
    </div>
  );
}
