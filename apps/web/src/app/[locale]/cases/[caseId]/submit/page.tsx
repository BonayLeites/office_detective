'use client';

import { use, useState } from 'react';

import type { SubmissionResponse } from '@/types';

import {
  applyTwistScoreModifier,
  calculateCaseStreak,
  calculateInvestigationXp,
  calculateStreakBonusXp,
  evaluateSpeedCombo,
  evaluateTwistImpact,
  getActiveTwist,
  getMetaMissions,
  getRankForXp,
  getWeeklyResilienceCharges,
  type RankId,
  type MetaMissionId,
  type SpeedComboImpact,
  type TwistImpact,
  type TwistId,
} from '@/components/game/progression';
import { SubmissionForm, type SubmissionData } from '@/components/submit/submission-form';
import { SubmissionResult } from '@/components/submit/submission-result';
import { Skeleton } from '@/components/ui/skeleton';
import { useEntities } from '@/hooks/use-entities';
import { api } from '@/lib/api';
import { useGameStore } from '@/stores/game-store';

interface SubmitPageProps {
  params: Promise<{ caseId: string }>;
}

interface ChallengeSummary {
  twistId: TwistId;
  modifier: number;
  speedModifier: number;
  speedTier: SpeedComboImpact['tier'];
  challengeScore: number;
  adjustedScore: number;
  completed: boolean;
  tier: TwistImpact['tier'];
}

interface ProgressSummary {
  streakCurrent: number;
  streakBest: number;
  completedMetaMissions: {
    id: MetaMissionId;
    rewardXp: number;
  }[];
  claimedNowXp: number;
  shieldUsed: boolean;
}

interface RunSummary {
  xpBefore: number;
  xpAfter: number;
  gainedXp: number;
  rankBefore: RankId;
  rankAfter: RankId;
}

export default function SubmitPage({ params }: SubmitPageProps) {
  const { caseId } = use(params);
  const { entities, isLoading } = useEntities(caseId);
  const openedDocs = useGameStore(state => state.getOpenedDocs(caseId).length);
  const searchesRun = useGameStore(state => state.getSearchesRun(caseId));
  const ariaQuestions = useGameStore(state => state.getAriaQuestions(caseId));
  const allPinnedItems = useGameStore(state => state.pinnedItems);
  const pinnedItems = allPinnedItems.filter(item => item.caseId === caseId);
  const suspects = useGameStore(state => state.getSuspectedEntities(caseId).length);
  const boardItems = useGameStore(
    state => state.boardItems.filter(item => item.caseId === caseId).length,
  );
  const hintsUsed = useGameStore(state => state.getHintsUsed(caseId));
  const submissionStats = useGameStore(state => state.getSubmissionStats(caseId));
  const submissionTimeline = useGameStore(state => state.submissionTimeline);
  const claimedMetaRewards = useGameStore(state => state.claimedMetaRewards);
  const claimedMetaXp = useGameStore(state => state.getClaimedMetaXp());
  const claimMetaMissionReward = useGameStore(state => state.claimMetaMissionReward);
  const suspectConfidence = useGameStore(state => state.getSuspectConfidenceMap(caseId));
  const recordSubmission = useGameStore(state => state.recordSubmission);
  const resetCase = useGameStore(state => state.resetCase);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<SubmissionResponse | null>(null);
  const [playerCulprits, setPlayerCulprits] = useState<string[]>([]);
  const [challengeSummary, setChallengeSummary] = useState<ChallengeSummary | null>(null);
  const [progressSummary, setProgressSummary] = useState<ProgressSummary | null>(null);
  const [runSummary, setRunSummary] = useState<RunSummary | null>(null);
  const snapshot = {
    openedDocs,
    searchesRun,
    ariaQuestions,
    pinnedItems: pinnedItems.length,
    suspects,
    boardItems,
    submissionCount: submissionStats.count,
    lastSubmissionScore: submissionStats.lastScore,
  };
  const activeTwist = getActiveTwist(snapshot, caseId);
  const previewImpact = evaluateTwistImpact(snapshot, activeTwist);
  const previewSpeedCombo = evaluateSpeedCombo({
    openedDocs,
    searchesRun,
    ariaQuestions,
    pinnedItems: pinnedItems.length,
    boardItems,
    hintsUsed,
  });

  const handleSubmit = async (data: SubmissionData) => {
    setIsSubmitting(true);
    setPlayerCulprits(data.culpritIds);
    const twistImpact = evaluateTwistImpact(snapshot, activeTwist);
    const speedCombo = evaluateSpeedCombo({
      openedDocs,
      searchesRun,
      ariaQuestions,
      pinnedItems: pinnedItems.length,
      boardItems,
      hintsUsed,
    });

    try {
      const response = await api.post<SubmissionResponse>(`/api/cases/${caseId}/submit`, {
        culprit_ids: data.culpritIds,
        evidence_ids: data.evidenceIds,
        explanation: data.explanation,
      });
      const challengeScore = applyTwistScoreModifier(
        response.score,
        twistImpact.modifier,
        response.max_score,
      );
      const adjustedScore = applyTwistScoreModifier(
        challengeScore,
        speedCombo.modifier,
        response.max_score,
      );
      const now = Date.now();
      const timelineBefore = submissionTimeline.map(entry => ({
        caseId: entry.caseId,
        score: entry.score,
        timestamp: entry.timestamp,
        hintsUsed: entry.hintsUsed,
        shieldProtected: entry.shieldProtected,
      }));
      const beforeMissions = getMetaMissions(timelineBefore, now);
      const resilienceCharges = getWeeklyResilienceCharges(claimedMetaRewards, timelineBefore, now);
      const shieldUsed = response.score < 70 && resilienceCharges > 0;
      const timelineAfter = [
        ...timelineBefore,
        { caseId, score: response.score, timestamp: now, hintsUsed, shieldProtected: shieldUsed },
      ];
      const afterMissions = getMetaMissions(timelineAfter, now);
      const newlyCompletedMissions = afterMissions
        .filter(
          mission =>
            mission.completed &&
            !beforeMissions.some(prev => prev.id === mission.id && prev.completed),
        )
        .map(mission => ({
          id: mission.id,
          rewardXp: mission.rewardXp,
          claimKey: mission.claimKey,
        }));
      const streakAfter = calculateCaseStreak(timelineAfter);
      const streakBefore = calculateCaseStreak(timelineBefore);
      const claimedNowXp = newlyCompletedMissions.reduce((sum, mission) => {
        const claimed = claimMetaMissionReward(mission.claimKey, mission.rewardXp);
        return claimed ? sum + mission.rewardXp : sum;
      }, 0);
      const snapshotAfter = {
        ...snapshot,
        submissionCount: snapshot.submissionCount + 1,
        lastSubmissionScore: response.score,
      };
      const xpBefore =
        calculateInvestigationXp(snapshot) +
        calculateStreakBonusXp(streakBefore.current) +
        claimedMetaXp;
      const xpAfter =
        calculateInvestigationXp(snapshotAfter) +
        calculateStreakBonusXp(streakAfter.current) +
        claimedMetaXp +
        claimedNowXp;
      const rankBefore = getRankForXp(xpBefore).id;
      const rankAfter = getRankForXp(xpAfter).id;
      recordSubmission(caseId, response.score, hintsUsed, shieldUsed);
      setChallengeSummary({
        twistId: activeTwist.id,
        modifier: twistImpact.modifier,
        speedModifier: speedCombo.modifier,
        speedTier: speedCombo.tier,
        challengeScore,
        adjustedScore,
        completed: twistImpact.completed,
        tier: twistImpact.tier,
      });
      setProgressSummary({
        streakCurrent: streakAfter.current,
        streakBest: streakAfter.best,
        completedMetaMissions: newlyCompletedMissions.map(mission => ({
          id: mission.id,
          rewardXp: mission.rewardXp,
        })),
        claimedNowXp,
        shieldUsed,
      });
      setRunSummary({
        xpBefore,
        xpAfter,
        gainedXp: Math.max(0, xpAfter - xpBefore),
        rankBefore,
        rankAfter,
      });
      setResult(response);
    } catch (error) {
      console.error('Submission failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    setResult(null);
    setPlayerCulprits([]);
    setChallengeSummary(null);
    setProgressSummary(null);
    setRunSummary(null);
    resetCase(caseId);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (result) {
    return (
      <SubmissionResult
        score={result.score}
        maxScore={result.max_score}
        correctCulprits={result.correct_culprits}
        playerCulprits={playerCulprits}
        feedback={result.feedback}
        breakdown={result.breakdown}
        challengeSummary={challengeSummary}
        progressSummary={progressSummary}
        runSummary={runSummary}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <SubmissionForm
      entities={entities}
      pinnedItems={pinnedItems}
      suspectConfidence={suspectConfidence}
      activeTwist={activeTwist}
      twistModifierPreview={previewImpact.modifier}
      speedModifierPreview={previewSpeedCombo.modifier}
      speedTierPreview={previewSpeedCombo.tier}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
    />
  );
}
