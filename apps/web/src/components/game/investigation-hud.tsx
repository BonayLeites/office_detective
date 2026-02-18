'use client';

import {
  AlarmClock,
  CheckCircle2,
  CircleDashed,
  Flame,
  Gauge,
  Medal,
  Sparkles,
  Star,
  Target,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  REWARD_IDS,
  calculateCaseStreak,
  calculateInvestigationXp,
  calculateStreakBonusXp,
  getActiveMissions,
  getActiveTwist,
  getMetaMissions,
  getNextRank,
  getRankForXp,
  getWeeklyResilienceCharges,
  getUnlockedRewards,
} from '@/components/game/progression';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useGameStore } from '@/stores/game-store';

interface InvestigationHudProps {
  caseId: string;
  compact?: boolean;
}

interface Goal {
  id: string;
  label: string;
  current: number;
  target: number;
}

function getProgress(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

export function InvestigationHud({ caseId, compact = false }: InvestigationHudProps) {
  const t = useTranslations('investigation');
  const openedDocs = useGameStore(state => state.getOpenedDocs(caseId).length);
  const searchesRun = useGameStore(state => state.getSearchesRun(caseId));
  const ariaQuestions = useGameStore(state => state.getAriaQuestions(caseId));
  const pinnedItems = useGameStore(
    state => state.pinnedItems.filter(item => item.caseId === caseId).length,
  );
  const suspects = useGameStore(state => state.getSuspectedEntities(caseId).length);
  const boardItems = useGameStore(
    state => state.boardItems.filter(item => item.caseId === caseId).length,
  );
  const submissionCount = useGameStore(state => state.getSubmissionStats(caseId).count);
  const lastSubmissionScore = useGameStore(state => state.getSubmissionStats(caseId).lastScore);
  const submissionTimeline = useGameStore(state => state.submissionTimeline);
  const claimedMetaRewards = useGameStore(state => state.claimedMetaRewards);
  const claimedMetaXp = useGameStore(state => state.getClaimedMetaXp());
  const recentEvents = useGameStore(state => state.getRecentEvents(caseId).slice(0, 4));
  const snapshot = {
    openedDocs,
    searchesRun,
    ariaQuestions,
    pinnedItems,
    suspects,
    boardItems,
    submissionCount,
    lastSubmissionScore,
  };
  const baseXp = calculateInvestigationXp(snapshot);
  const normalizedTimeline = submissionTimeline.map(entry => ({
    caseId: entry.caseId,
    score: entry.score,
    timestamp: entry.timestamp,
    hintsUsed: entry.hintsUsed,
    shieldProtected: entry.shieldProtected,
  }));
  const resilienceCharges = getWeeklyResilienceCharges(claimedMetaRewards, normalizedTimeline);
  const streakSummary = calculateCaseStreak(normalizedTimeline);
  const streakBonusXp = calculateStreakBonusXp(streakSummary.current);
  const metaMissions = getMetaMissions(normalizedTimeline);
  const claimableMetaXp = metaMissions.reduce(
    (sum, mission) =>
      sum +
      (mission.completed && typeof claimedMetaRewards[mission.claimKey] !== 'number'
        ? mission.rewardXp
        : 0),
    0,
  );
  const xp = baseXp + streakBonusXp + claimedMetaXp;
  const currentRank = getRankForXp(xp);
  const nextRank = getNextRank(xp);
  const activeTwist = getActiveTwist(snapshot, caseId);
  const activeMissions = getActiveMissions(snapshot, 3, caseId);
  const unlockedRewards = getUnlockedRewards(snapshot);
  const rankProgressPct = nextRank
    ? getProgress(xp - currentRank.minXp, nextRank.minXp - currentRank.minXp)
    : 100;
  const twistCurrent = Math.min(activeTwist.current, activeTwist.target);
  const twistProgress = getProgress(twistCurrent, activeTwist.target);
  const twistUrgencyClass = cn(
    'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]',
    activeTwist.urgency === 'high'
      ? 'border-rose-500/35 bg-rose-500/10 text-rose-700'
      : activeTwist.urgency === 'medium'
        ? 'border-amber-500/35 bg-amber-500/10 text-amber-700'
        : 'border-emerald-500/35 bg-emerald-500/10 text-emerald-700',
  );

  const goals: Goal[] = [
    { id: 'docs', label: t('goals.docs'), current: openedDocs, target: 4 },
    { id: 'searches', label: t('goals.searches'), current: searchesRun, target: 3 },
    { id: 'aria', label: t('goals.aria'), current: ariaQuestions, target: 3 },
    { id: 'evidence', label: t('goals.evidence'), current: pinnedItems, target: 4 },
    { id: 'suspects', label: t('goals.suspects'), current: suspects, target: 2 },
    { id: 'board', label: t('goals.board'), current: boardItems, target: 6 },
  ];

  const avgReadiness = Math.round(
    goals.reduce((sum, goal) => sum + getProgress(goal.current, goal.target), 0) / goals.length,
  );

  const phases = [
    {
      id: 'phase1',
      label: t('phases.phase1'),
      complete: openedDocs >= 2 && searchesRun >= 1 && ariaQuestions >= 1,
    },
    {
      id: 'phase2',
      label: t('phases.phase2'),
      complete: pinnedItems >= 3 && suspects >= 1 && boardItems >= 3,
    },
    {
      id: 'phase3',
      label: t('phases.phase3'),
      complete: submissionCount > 0 || (pinnedItems >= 4 && suspects >= 1 && ariaQuestions >= 2),
    },
  ];
  const completedPhases = phases.filter(phase => phase.complete).length;

  return (
    <Card className={cn('border-border/80 rounded-xl p-4', compact ? 'mt-4' : 'p-5')}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-muted-foreground text-[11px] uppercase tracking-[0.12em]">
          {t('title')}
        </p>
        <span className="text-xs font-semibold">{avgReadiness}%</span>
      </div>

      <div className="bg-muted/60 mb-4 h-2 overflow-hidden rounded-full">
        <div
          className="bg-primary h-full transition-all duration-300"
          style={{ width: `${avgReadiness.toString()}%` }}
        />
      </div>

      <div className="border-border/70 bg-card/45 mb-4 rounded-lg border p-3">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-muted-foreground text-[11px] uppercase tracking-[0.1em]">
            {t('ranks.title')}
          </p>
          <div className="flex items-center gap-1 text-xs font-semibold">
            <Medal className="text-primary h-3.5 w-3.5" />
            <span>{t(`ranks.${currentRank.id}`)}</span>
          </div>
        </div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold">{t('ranks.xpValue', { xp })}</p>
          {nextRank ? (
            <p className="text-muted-foreground text-xs">
              {t('ranks.next', {
                xp: Math.max(0, nextRank.minXp - xp),
                rank: t(`ranks.${nextRank.id}`),
              })}
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">{t('ranks.maxed')}</p>
          )}
        </div>
        <div className="bg-muted/60 h-1.5 overflow-hidden rounded-full">
          <div
            className="bg-primary/80 h-full transition-all duration-300"
            style={{
              width: `${rankProgressPct.toString()}%`,
            }}
          />
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-muted-foreground text-[11px] uppercase tracking-[0.1em]">
            {t('streak.title')}
          </p>
          <div className="flex items-center gap-1 text-xs font-semibold text-amber-700">
            <Flame className="h-3.5 w-3.5" />
            <span>{t('streak.current', { count: streakSummary.current })}</span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">{t('streak.bonus', { xp: streakBonusXp })}</p>
          <p className="text-muted-foreground text-xs">
            {t('streak.best', { count: streakSummary.best })}
          </p>
        </div>
        <p className="text-muted-foreground mt-1 text-xs">
          {t('streak.metaBonus', { xp: claimedMetaXp })}
        </p>
        {claimableMetaXp > 0 && (
          <p className="text-muted-foreground mt-1 text-xs">
            {t('streak.metaPending', { xp: claimableMetaXp })}
          </p>
        )}
        {resilienceCharges > 0 && (
          <p className="text-muted-foreground mt-1 text-xs">
            {t('streak.shieldActive', { count: resilienceCharges })}
          </p>
        )}
        {!compact && <p className="text-muted-foreground mt-1 text-xs">{t('streak.hint')}</p>}
      </div>

      <div className="border-primary/25 bg-primary/5 mb-4 rounded-lg border p-3">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-muted-foreground text-[11px] uppercase tracking-[0.1em]">
            {t('twist.title')}
          </p>
          <span className="text-primary text-xs font-semibold">+{activeTwist.rewardXp} XP</span>
        </div>
        <div className="mb-1 flex items-start gap-2">
          <AlarmClock className="text-primary mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold">{t(`twist.items.${activeTwist.id}.label`)}</p>
            <p className="text-muted-foreground text-xs">
              {t(`twist.items.${activeTwist.id}.hint`)}
            </p>
          </div>
        </div>
        <div className="bg-muted/60 mb-1 mt-2 h-1.5 rounded-full">
          <div
            className="bg-primary/80 h-full rounded-full transition-all duration-300"
            style={{ width: `${twistProgress.toString()}%` }}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className={twistUrgencyClass}>{t(`twist.urgency.${activeTwist.urgency}`)}</span>
          <span className="text-muted-foreground text-[11px]">
            {t('twist.window', { minutes: activeTwist.timeboxMinutes })}
          </span>
          <span className="text-muted-foreground text-[11px] font-semibold">
            {twistCurrent}/{activeTwist.target}
          </span>
        </div>
      </div>

      {!compact && (
        <div className="mb-4 space-y-2">
          <p className="text-muted-foreground text-[11px] uppercase tracking-[0.1em]">
            {t('missions.title')}
          </p>
          {activeMissions.map(mission => {
            const current = Math.min(mission.current, mission.target);
            const progress = getProgress(current, mission.target);
            return (
              <div key={mission.id} className="border-border/70 bg-card/45 rounded-lg border p-2.5">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium">{t(`missions.items.${mission.id}.label`)}</span>
                  <span className="text-primary font-semibold">+{mission.rewardXp} XP</span>
                </div>
                <div className="bg-muted/60 mb-1 h-1.5 rounded-full">
                  <div
                    className="bg-primary/80 h-full rounded-full transition-all duration-300"
                    style={{ width: `${progress.toString()}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground text-[11px]">
                    {t(`missions.items.${mission.id}.hint`)}
                  </p>
                  <p className="text-muted-foreground text-[11px] font-semibold">
                    {current}/{mission.target}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mb-4 space-y-2">
        {phases.map(phase => (
          <div key={phase.id} className="flex items-center gap-2">
            {phase.complete ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <CircleDashed className="text-muted-foreground h-4 w-4" />
            )}
            <span className="text-sm">{phase.label}</span>
          </div>
        ))}
      </div>

      {!compact && (
        <div className="mb-4 space-y-2">
          {goals.map(goal => {
            const pct = getProgress(goal.current, goal.target);
            return (
              <div key={goal.id}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{goal.label}</span>
                  <span className="font-medium">
                    {goal.current}/{goal.target}
                  </span>
                </div>
                <div className="bg-muted/60 h-1.5 rounded-full">
                  <div
                    className="bg-primary/80 h-full rounded-full"
                    style={{ width: `${pct.toString()}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-muted/45 border-border/70 rounded-lg border p-3">
        {submissionCount > 0 ? (
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="text-primary h-4 w-4" />
            <span>
              {t('lastSubmission')} <strong>{lastSubmissionScore ?? 0}/100</strong>
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm">
            {completedPhases >= 2 ? (
              <Target className="text-primary h-4 w-4" />
            ) : (
              <Gauge className="text-muted-foreground h-4 w-4" />
            )}
            <span>{completedPhases >= 2 ? t('readyToSubmit') : t('keepInvestigating')}</span>
          </div>
        )}
      </div>

      {!compact && (
        <div className="border-border/70 bg-card/45 mt-4 rounded-lg border p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-muted-foreground text-[11px] uppercase tracking-[0.1em]">
              {t('rewards.title')}
            </p>
            <p className="text-muted-foreground text-xs">
              {t('rewards.unlocked', {
                count: unlockedRewards.length,
                total: REWARD_IDS.length,
              })}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {REWARD_IDS.map(rewardId => {
              const unlocked = unlockedRewards.includes(rewardId);
              return (
                <span
                  key={rewardId}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px]',
                    unlocked
                      ? 'border-primary/40 bg-primary/10 text-foreground'
                      : 'border-border/70 text-muted-foreground',
                  )}
                >
                  <Star className={cn('h-3 w-3', unlocked && 'text-primary fill-current')} />
                  {t(`rewards.items.${rewardId}`)}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {!compact && recentEvents.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-muted-foreground text-[11px] uppercase tracking-[0.1em]">
            {t('activity')}
          </p>
          {recentEvents.map(event => (
            <div key={event.id} className="text-muted-foreground text-xs">
              {event.label}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
