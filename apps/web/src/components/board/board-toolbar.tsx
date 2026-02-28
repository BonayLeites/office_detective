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

type NodeTypeFilter = 'all' | 'entity' | 'document' | 'hypothesis';
type ReliabilityFilter = 'all' | 'reliable' | 'uncertain' | 'false';
type HypothesisStatusFilter = 'all' | 'supported' | 'contradicted' | 'missing';

interface BoardToolbarProps {
  caseId: string;
  onLoadHubs: () => Promise<void>;
  onSyncGraph: () => Promise<void>;
  onTraceSuspects: () => Promise<void>;
  onAddHypothesis: () => void;
  onClearBoard: () => void;
  onAutoLayout: () => void;
  onSearch: (query: string) => void;
  boardQuery: string;
  onBoardQueryChange: (query: string) => void;
  nodeTypeFilter: NodeTypeFilter;
  onNodeTypeFilterChange: (value: NodeTypeFilter) => void;
  reliabilityFilter: ReliabilityFilter;
  onReliabilityFilterChange: (value: ReliabilityFilter) => void;
  hypothesisStatusFilter: HypothesisStatusFilter;
  onHypothesisStatusFilterChange: (value: HypothesisStatusFilter) => void;
  onClearFilters: () => void;
  connectionType: string;
  onConnectionTypeChange: (type: string) => void;
  isLoading: boolean;
  suspectCount: number;
  nodeCount: number;
  visibleNodeCount: number;
  edgeCount: number;
  manualEdgeCount: number;
}

export function BoardToolbar({
  caseId,
  onLoadHubs,
  onSyncGraph,
  onTraceSuspects,
  onAddHypothesis,
  onClearBoard,
  onAutoLayout,
  onSearch,
  boardQuery,
  onBoardQueryChange,
  nodeTypeFilter,
  onNodeTypeFilterChange,
  reliabilityFilter,
  onReliabilityFilterChange,
  hypothesisStatusFilter,
  onHypothesisStatusFilterChange,
  onClearFilters,
  connectionType,
  onConnectionTypeChange,
  isLoading,
  suspectCount,
  nodeCount,
  visibleNodeCount,
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
  const hasActiveFilters =
    boardQuery.trim().length > 0 ||
    nodeTypeFilter !== 'all' ||
    reliabilityFilter !== 'all' ||
    hypothesisStatusFilter !== 'all';

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
          onClick={onAddHypothesis}
          className="gap-2 whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          {t('hypothesis.add')}
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
          <option value="LINKED">{t('relationships.LINKED')}</option>
          <option value="SUPPORTS">{t('relationships.SUPPORTS')}</option>
          <option value="CONTRADICTS">{t('relationships.CONTRADICTS')}</option>
          <option value="SENT">{t('relationships.SENT')}</option>
          <option value="MENTIONS">{t('relationships.MENTIONS')}</option>
          <option value="APPROVED">{t('relationships.APPROVED')}</option>
          <option value="PAID_TO">{t('relationships.PAID_TO')}</option>
          <option value="WORKS_AT">{t('relationships.WORKS_AT')}</option>
        </select>
      </div>

      <div className="no-scrollbar flex w-full items-center gap-1 overflow-x-auto pb-1 md:w-auto md:overflow-visible md:pb-0">
        <Input
          placeholder={t('filters.searchPlaceholder')}
          value={boardQuery}
          onChange={event => {
            onBoardQueryChange(event.target.value);
          }}
          className="h-9 w-[180px] rounded-lg text-xs md:text-sm"
        />
        <select
          value={nodeTypeFilter}
          onChange={event => {
            onNodeTypeFilterChange(event.target.value as NodeTypeFilter);
          }}
          className="bg-background border-border/80 h-9 rounded-md border px-2 text-xs md:text-sm"
          title={t('filters.nodeType')}
        >
          <option value="all">{t('filters.allTypes')}</option>
          <option value="entity">{t('filters.entity')}</option>
          <option value="document">{t('filters.document')}</option>
          <option value="hypothesis">{t('filters.hypothesis')}</option>
        </select>
        <select
          value={reliabilityFilter}
          onChange={event => {
            onReliabilityFilterChange(event.target.value as ReliabilityFilter);
          }}
          className="bg-background border-border/80 h-9 rounded-md border px-2 text-xs md:text-sm"
          title={t('filters.reliability')}
        >
          <option value="all">{t('filters.allReliability')}</option>
          <option value="reliable">{t('reliability.reliable')}</option>
          <option value="uncertain">{t('reliability.uncertain')}</option>
          <option value="false">{t('reliability.false')}</option>
        </select>
        <select
          value={hypothesisStatusFilter}
          onChange={event => {
            onHypothesisStatusFilterChange(event.target.value as HypothesisStatusFilter);
          }}
          className="bg-background border-border/80 h-9 rounded-md border px-2 text-xs md:text-sm"
          title={t('filters.hypothesisStatus')}
        >
          <option value="all">{t('filters.allStatus')}</option>
          <option value="supported">{t('hypothesis.status.supported')}</option>
          <option value="contradicted">{t('hypothesis.status.contradicted')}</option>
          <option value="missing">{t('hypothesis.status.missing')}</option>
        </select>
        <Button
          variant="ghost"
          size="sm"
          className="whitespace-nowrap"
          onClick={onClearFilters}
          disabled={!hasActiveFilters}
        >
          {t('filters.clear')}
        </Button>
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
          {t('visibleNodes', { visible: visibleNodeCount, total: nodeCount })}
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
