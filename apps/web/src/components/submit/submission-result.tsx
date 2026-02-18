'use client';

import { Award, CheckCircle2, Crown, RefreshCw, Sparkles, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type {
  MetaMissionId,
  RankId,
  SpeedComboImpact,
  TwistId,
} from '@/components/game/progression';
import type { ScoreBreakdown } from '@/types';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

interface SubmissionResultProps {
  score: number;
  maxScore: number;
  correctCulprits: string[];
  playerCulprits: string[];
  feedback: string;
  breakdown: ScoreBreakdown;
  challengeSummary?: {
    twistId: TwistId;
    modifier: number;
    speedModifier: number;
    speedTier: SpeedComboImpact['tier'];
    challengeScore: number;
    adjustedScore: number;
    completed: boolean;
    tier: 'perfect' | 'good' | 'partial' | 'missed';
  } | null;
  progressSummary?: {
    streakCurrent: number;
    streakBest: number;
    completedMetaMissions: {
      id: MetaMissionId;
      rewardXp: number;
    }[];
    claimedNowXp: number;
    shieldUsed: boolean;
  } | null;
  runSummary?: {
    xpBefore: number;
    xpAfter: number;
    gainedXp: number;
    rankBefore: RankId;
    rankAfter: RankId;
  } | null;
  onRetry: () => void;
}

export function SubmissionResult({
  score,
  maxScore,
  correctCulprits,
  playerCulprits,
  feedback,
  breakdown,
  challengeSummary = null,
  progressSummary = null,
  runSummary = null,
  onRetry,
}: SubmissionResultProps) {
  const t = useTranslations('results');
  const tInvestigation = useTranslations('investigation');
  const tCases = useTranslations('cases');
  const percentage = Math.round((score / maxScore) * 100);
  const isPerfect = score === maxScore;
  const isPassing = percentage >= 70;

  const correctMatches = playerCulprits.filter(id => correctCulprits.includes(id));
  const incorrectGuesses = playerCulprits.filter(id => !correctCulprits.includes(id));
  const missedCulprits = correctCulprits.filter(id => !playerCulprits.includes(id));
  const hasRankUp = runSummary ? runSummary.rankBefore !== runSummary.rankAfter : false;

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      {/* Score Display */}
      <div className="animate-reveal-up text-center">
        <div
          className={cn(
            'mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full border shadow-[0_22px_35px_-26px_rgba(10,23,38,0.8)]',
            isPerfect
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
              : isPassing
                ? 'border-primary/30 bg-primary/10 text-primary'
                : 'border-destructive/30 bg-destructive/10 text-destructive',
          )}
        >
          {isPerfect ? (
            <Award className="h-12 w-12" />
          ) : isPassing ? (
            <CheckCircle2 className="h-12 w-12" />
          ) : (
            <XCircle className="h-12 w-12" />
          )}
        </div>

        <h1 className="font-display mb-2 text-3xl font-bold">
          {isPerfect ? t('perfect') : isPassing ? t('solved') : t('notQuite')}
        </h1>

        <p className="text-muted-foreground text-lg">
          {t('score', { score, maxScore, percentage })}
        </p>

        <div className="mx-auto mt-4 max-w-sm">
          <div className="bg-muted/60 h-2 overflow-hidden rounded-full">
            <div
              className={cn(
                'h-full transition-all duration-500',
                isPerfect ? 'bg-emerald-600' : isPassing ? 'bg-primary' : 'bg-destructive',
              )}
              style={{ width: `${percentage.toString()}%` }}
            />
          </div>
        </div>
      </div>

      {challengeSummary && (
        <div className="border-primary/30 bg-primary/10 rounded-xl border p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">{t('challenge.title')}</p>
            <span className="text-primary text-xs font-semibold">
              {challengeSummary.modifier >= 0
                ? t('challenge.modifierPositive', { value: challengeSummary.modifier })
                : t('challenge.modifierNegative', { value: Math.abs(challengeSummary.modifier) })}
            </span>
          </div>
          <p className="text-sm">
            {tInvestigation(`twist.items.${challengeSummary.twistId}.label`)}
          </p>
          <div className="border-border/60 bg-card/70 mt-2 grid gap-2 rounded-lg border p-3 text-sm sm:grid-cols-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('challenge.officialScore')}</span>
              <span className="font-semibold">{score}/100</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('challenge.twistScore')}</span>
              <span className="font-semibold">{challengeSummary.challengeScore}/100</span>
            </div>
            <div className="flex items-center justify-between sm:col-span-2">
              <span className="text-muted-foreground">{t('challenge.comboScore')}</span>
              <span className="font-semibold">{challengeSummary.adjustedScore}/100</span>
            </div>
            <div className="flex items-center justify-between sm:col-span-2">
              <span className="text-muted-foreground">
                {challengeSummary.speedModifier > 0
                  ? t('challenge.comboPositive', { value: challengeSummary.speedModifier })
                  : t('challenge.comboZero')}
              </span>
              <span className="font-semibold">
                {t(`challenge.comboTier.${challengeSummary.speedTier}`)}
              </span>
            </div>
          </div>
          <p className="text-muted-foreground mt-2 flex items-center gap-1.5 text-xs">
            <Sparkles className="text-primary h-3.5 w-3.5" />
            {t(`challenge.tiers.${challengeSummary.tier}`)}
          </p>
        </div>
      )}

      {progressSummary && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="mb-2 text-sm font-semibold">{t('progress.title')}</p>
          <div className="border-border/60 bg-card/70 grid gap-2 rounded-lg border p-3 text-sm sm:grid-cols-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('progress.streakCurrent')}</span>
              <span className="font-semibold">{progressSummary.streakCurrent}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('progress.streakBest')}</span>
              <span className="font-semibold">{progressSummary.streakBest}</span>
            </div>
          </div>
          {progressSummary.completedMetaMissions.length > 0 ? (
            <div className="mt-2 space-y-1.5">
              <p className="text-muted-foreground text-xs">{t('progress.metaUnlocked')}</p>
              {progressSummary.completedMetaMissions.map(mission => (
                <p key={mission.id} className="text-sm">
                  {tCases(`metaMissions.items.${mission.id}.label`)}{' '}
                  <span className="font-semibold">+{mission.rewardXp} XP</span>
                </p>
              ))}
              <p className="text-muted-foreground text-xs">
                {t('progress.metaClaimedNow', { xp: progressSummary.claimedNowXp })}
              </p>
              {progressSummary.shieldUsed && (
                <p className="text-muted-foreground text-xs">{t('progress.shieldUsed')}</p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground mt-2 text-xs">{t('progress.metaPending')}</p>
          )}
        </div>
      )}

      {runSummary && (
        <div className="border-primary/30 bg-primary/10 rounded-xl border p-4">
          <p className="mb-2 text-sm font-semibold">{t('progress.rankPulse')}</p>
          <div className="border-border/60 bg-card/70 grid gap-2 rounded-lg border p-3 text-sm sm:grid-cols-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('progress.xpBefore')}</span>
              <span className="font-semibold">{runSummary.xpBefore}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('progress.xpAfter')}</span>
              <span className="font-semibold">{runSummary.xpAfter}</span>
            </div>
            <div className="flex items-center justify-between sm:col-span-2">
              <span className="text-muted-foreground">{t('progress.xpGain')}</span>
              <span className="font-semibold">+{runSummary.gainedXp}</span>
            </div>
          </div>
          {hasRankUp && (
            <div className="mt-2 animate-pulse rounded-lg border border-emerald-500/35 bg-emerald-500/10 p-2 text-sm font-semibold text-emerald-700">
              <span className="inline-flex items-center gap-1.5">
                <Crown className="h-4 w-4" />
                {t('progress.rankUpBadge', {
                  to: tInvestigation(`ranks.${runSummary.rankAfter}`),
                })}
              </span>
            </div>
          )}
          <p className="text-muted-foreground mt-2 text-xs">
            {runSummary.rankBefore === runSummary.rankAfter
              ? t('progress.rankHold', { rank: tInvestigation(`ranks.${runSummary.rankAfter}`) })
              : t('progress.rankUp', {
                  from: tInvestigation(`ranks.${runSummary.rankBefore}`),
                  to: tInvestigation(`ranks.${runSummary.rankAfter}`),
                })}
          </p>
        </div>
      )}

      {/* Breakdown */}
      <div className="surface-lift border-border/80 bg-card/70 space-y-4 rounded-xl border p-4">
        <h2 className="font-display font-semibold">{t('breakdown')}</h2>

        <div className="border-border/60 bg-muted/35 grid gap-2 rounded-lg border p-3 text-sm sm:grid-cols-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t('scoreComponents.culprit')}</span>
            <span className="font-semibold">{breakdown.culprit_score}/40</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t('scoreComponents.evidence')}</span>
            <span className="font-semibold">{breakdown.evidence_score}/20</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t('scoreComponents.explanation')}</span>
            <span className="font-semibold">{breakdown.explanation_score}/30</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t('scoreComponents.efficiency')}</span>
            <span className="font-semibold">{breakdown.efficiency_score}/10</span>
          </div>
          <div className="flex items-center justify-between sm:col-span-2">
            <span className="text-muted-foreground">{t('scoreComponents.board')}</span>
            <span className="font-semibold">+{breakdown.board_reasoning_score}</span>
          </div>
        </div>

        {/* Correct identifications */}
        {correctMatches.length > 0 && (
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
            <div>
              <p className="font-medium text-green-600">{t('correctlyIdentified')}</p>
              <p className="text-muted-foreground text-sm">
                {t('correctlyIdentifiedDesc', { count: correctMatches.length })}
              </p>
            </div>
          </div>
        )}

        {/* Incorrect guesses */}
        {incorrectGuesses.length > 0 && (
          <div className="flex items-start gap-2">
            <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
            <div>
              <p className="font-medium text-red-600">{t('incorrectAccusations')}</p>
              <p className="text-muted-foreground text-sm">
                {t('incorrectAccusationsDesc', { count: incorrectGuesses.length })}
              </p>
            </div>
          </div>
        )}

        {/* Missed culprits */}
        {missedCulprits.length > 0 && (
          <div className="flex items-start gap-2">
            <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
            <div>
              <p className="font-medium text-amber-600">{t('missedCulprits')}</p>
              <p className="text-muted-foreground text-sm">
                {t('missedCulpritsDesc', { count: missedCulprits.length })}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Feedback */}
      <div className="surface-lift bg-muted/50 border-border/70 rounded-xl border p-4">
        <h2 className="font-display mb-2 font-semibold">{t('feedback')}</h2>
        <p className="text-muted-foreground text-sm">{feedback}</p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button variant="outline" onClick={onRetry} className="flex-1 gap-2 rounded-lg">
          <RefreshCw className="h-4 w-4" />
          {t('tryAgain')}
        </Button>
        <Link
          href="/cases"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 flex-1 items-center justify-center rounded-lg px-4 py-2 text-sm font-medium"
        >
          {t('browseOther')}
        </Link>
      </div>
    </div>
  );
}
