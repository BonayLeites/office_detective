'use client';

import { CheckCircle2, CircleDashed, Flame, History, Trophy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import {
  calculateCaseStreak,
  getMetaMissions,
  getWeeklyResilienceCharges,
} from '@/components/game/progression';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useGameStore } from '@/stores/game-store';

interface CaseReference {
  case_id: string;
  title: string;
}

interface StreakHistoryPanelProps {
  cases: CaseReference[];
}

function formatScoreDate(timestamp: number | undefined): string {
  if (!timestamp) return '--';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(timestamp));
}

export function StreakHistoryPanel({ cases }: StreakHistoryPanelProps) {
  const t = useTranslations('cases');
  const submissionTimeline = useGameStore(state => state.submissionTimeline);
  const claimedMetaRewards = useGameStore(state => state.claimedMetaRewards);
  const claimMetaMissionReward = useGameStore(state => state.claimMetaMissionReward);
  const claimedMetaXp = useGameStore(state => state.getClaimedMetaXp());

  const caseTitleMap = useMemo(
    () => new Map(cases.map(entry => [entry.case_id, entry.title])),
    [cases],
  );
  const streak = useMemo(
    () =>
      calculateCaseStreak(
        submissionTimeline.map(entry => ({
          caseId: entry.caseId,
          score: entry.score,
          timestamp: entry.timestamp,
          hintsUsed: entry.hintsUsed,
          shieldProtected: entry.shieldProtected,
        })),
      ),
    [submissionTimeline],
  );
  const resilienceCharges = getWeeklyResilienceCharges(
    claimedMetaRewards,
    submissionTimeline.map(entry => ({
      caseId: entry.caseId,
      score: entry.score,
      timestamp: entry.timestamp,
      hintsUsed: entry.hintsUsed,
      shieldProtected: entry.shieldProtected,
    })),
  );
  const missions = useMemo(
    () =>
      getMetaMissions(
        submissionTimeline.map(entry => ({
          caseId: entry.caseId,
          score: entry.score,
          timestamp: entry.timestamp,
          hintsUsed: entry.hintsUsed,
          shieldProtected: entry.shieldProtected,
        })),
      ),
    [submissionTimeline],
  );
  const claimableMetaXp = missions.reduce(
    (sum, mission) =>
      sum +
      (mission.completed && typeof claimedMetaRewards[mission.claimKey] !== 'number'
        ? mission.rewardXp
        : 0),
    0,
  );
  const recentRuns = submissionTimeline.slice(-8).reverse();

  return (
    <Card className="border-border/80 rounded-2xl p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-[0.14em]">
            {t('streak.title')}
          </p>
          <p className="font-display text-2xl font-semibold">
            {t('streak.current', { count: streak.current })}
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/35 bg-amber-500/10 px-3 py-1 text-amber-800">
            <Flame className="h-4 w-4" />
            {t('streak.best', { count: streak.best })}
          </div>
          <div className="border-primary/35 bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-full border px-3 py-1">
            <Trophy className="h-4 w-4" />
            {t('streak.metaClaimed', { xp: claimedMetaXp })}
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1 text-emerald-700">
            <Trophy className="h-4 w-4" />
            {t('streak.metaPending', { xp: claimableMetaXp })}
          </div>
          {resilienceCharges > 0 && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/35 bg-sky-500/10 px-3 py-1 text-sky-700">
              <Trophy className="h-4 w-4" />
              {t('streak.shieldActive', { count: resilienceCharges })}
            </div>
          )}
        </div>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-2">
        {missions.map(mission => {
          const progress = Math.min(100, Math.round((mission.current / mission.target) * 100));
          const claimed = typeof claimedMetaRewards[mission.claimKey] === 'number';
          return (
            <div key={mission.id} className="border-border/75 bg-card/55 rounded-xl border p-3">
              <div className="mb-1 flex items-center justify-between text-xs">
                <p className="font-semibold">{t(`metaMissions.items.${mission.id}.label`)}</p>
                <span className="text-primary font-semibold">+{mission.rewardXp} XP</span>
              </div>
              <p className="text-muted-foreground mb-2 text-xs">
                {t(`metaMissions.items.${mission.id}.hint`)}
              </p>
              <div className="bg-muted/60 mb-1 h-1.5 rounded-full">
                <div
                  className="bg-primary/85 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress.toString()}%` }}
                />
              </div>
              <div className="text-muted-foreground flex items-center justify-between text-[11px]">
                <span>{t(`metaMissions.period.${mission.period}`)}</span>
                <span className="font-semibold">
                  {Math.min(mission.current, mission.target)}/{mission.target}
                </span>
              </div>
              <div className="mt-2 flex justify-end">
                {mission.completed && !claimed ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      claimMetaMissionReward(mission.claimKey, mission.rewardXp);
                    }}
                  >
                    {t('metaMissions.actions.claim')}
                  </Button>
                ) : mission.completed ? (
                  <span className="text-muted-foreground text-xs font-semibold">
                    {t('metaMissions.actions.claimed')}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs">
                    {t('metaMissions.actions.progress')}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <p className="text-muted-foreground mb-2 inline-flex items-center gap-1 text-xs uppercase tracking-[0.12em]">
          <History className="h-3.5 w-3.5" />
          {t('streak.history')}
        </p>
        {recentRuns.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('streak.emptyHistory')}</p>
        ) : (
          <div className="space-y-2">
            {recentRuns.map((entry, index) => {
              const title = caseTitleMap.get(entry.caseId) ?? entry.caseId.slice(0, 8);
              const solved = entry.score >= 70;
              const entryKey = `${entry.caseId}-${entry.timestamp.toString()}-${index.toString()}`;
              return (
                <div
                  key={entryKey}
                  className="border-border/70 bg-card/40 flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {solved ? (
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                    ) : (
                      <CircleDashed className="text-muted-foreground h-4 w-4 flex-shrink-0" />
                    )}
                    <span className="truncate">{title}</span>
                  </div>
                  <div className="text-muted-foreground flex items-center gap-3 text-xs">
                    <span className="text-foreground font-semibold">{entry.score}/100</span>
                    <span>{formatScoreDate(entry.timestamp)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
