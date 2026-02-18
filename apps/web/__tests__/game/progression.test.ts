import { describe, expect, it } from 'vitest';

import {
  applyTwistScoreModifier,
  calculateCaseStreak,
  calculateInvestigationXp,
  calculateMetaMissionBonusXp,
  calculateStreakBonusXp,
  evaluateSpeedCombo,
  evaluateTwistImpact,
  getActiveMissions,
  getActiveTwist,
  getMetaMissions,
  getNextRank,
  getRankForXp,
  getWeeklyResilienceCharges,
  getUnlockedRewards,
  type InvestigationSnapshot,
} from '@/components/game/progression';

const baseSnapshot: InvestigationSnapshot = {
  openedDocs: 0,
  searchesRun: 0,
  ariaQuestions: 0,
  pinnedItems: 0,
  suspects: 0,
  boardItems: 0,
  submissionCount: 0,
  lastSubmissionScore: null,
};

describe('investigation progression', () => {
  it('calculates XP from core actions', () => {
    const xp = calculateInvestigationXp({
      ...baseSnapshot,
      openedDocs: 3,
      searchesRun: 2,
      ariaQuestions: 1,
      pinnedItems: 4,
      suspects: 2,
      boardItems: 6,
      submissionCount: 1,
      lastSubmissionScore: 80,
    });

    expect(xp).toBe(272);
  });

  it('resolves rank tiers and next tier correctly', () => {
    expect(getRankForXp(0).id).toBe('recruit');
    expect(getRankForXp(121).id).toBe('investigator');
    expect(getRankForXp(700).id).toBe('mastermind');
    expect(getNextRank(700)).toBeNull();
    expect(getNextRank(121)?.id).toBe('analyst');
  });

  it('prioritizes pending missions before submission', () => {
    const missions = getActiveMissions({
      ...baseSnapshot,
      openedDocs: 1,
      searchesRun: 1,
      ariaQuestions: 0,
      pinnedItems: 0,
      suspects: 0,
      boardItems: 0,
    });

    expect(missions.map(m => m.id)).toEqual(['first_clue', 'cross_check', 'evidence_chain']);
  });

  it('adds score hunt mission when there is a submission below target score', () => {
    const missions = getActiveMissions({
      ...baseSnapshot,
      openedDocs: 4,
      searchesRun: 3,
      ariaQuestions: 2,
      pinnedItems: 4,
      suspects: 2,
      boardItems: 6,
      submissionCount: 1,
      lastSubmissionScore: 72,
    });

    expect(missions[0]?.id).toBe('score_hunt');
    expect(missions[0]?.target).toBe(90);
  });

  it('returns victory lap mission when all core missions are complete', () => {
    const missions = getActiveMissions({
      ...baseSnapshot,
      openedDocs: 4,
      searchesRun: 3,
      ariaQuestions: 2,
      pinnedItems: 4,
      suspects: 2,
      boardItems: 6,
      submissionCount: 1,
      lastSubmissionScore: 95,
    });

    expect(missions).toHaveLength(1);
    expect(missions[0]?.id).toBe('victory_lap');
  });

  it('unlocks rewards based on investigation milestones', () => {
    const rewards = getUnlockedRewards({
      ...baseSnapshot,
      openedDocs: 3,
      searchesRun: 1,
      ariaQuestions: 1,
      pinnedItems: 2,
      suspects: 2,
      boardItems: 7,
      submissionCount: 1,
      lastSubmissionScore: 92,
    });

    expect(rewards).toEqual(['breakthrough', 'connector', 'profiler', 'closer', 'elite']);
  });

  it('keeps twist stable for the same case while challenge is still pending', () => {
    const snapshot: InvestigationSnapshot = {
      ...baseSnapshot,
      openedDocs: 2,
      searchesRun: 1,
      ariaQuestions: 1,
      pinnedItems: 2,
      suspects: 1,
      boardItems: 3,
      submissionCount: 0,
      lastSubmissionScore: null,
    };
    const changedSnapshot: InvestigationSnapshot = {
      ...snapshot,
      openedDocs: 3,
      searchesRun: 2,
      ariaQuestions: 1,
    };

    const twistA = getActiveTwist(snapshot, 'case-stable');
    const twistARepeat = getActiveTwist(changedSnapshot, 'case-stable');

    expect(twistA.id).toBe(twistARepeat.id);
    expect(twistA.target).toBeGreaterThan(twistA.current);
  });

  it('includes score recovery twist only after a low-score submission', () => {
    const withoutSubmission = getActiveTwist(baseSnapshot, 'case-low');
    expect(withoutSubmission.id).not.toBe('score_recovery');

    const withLowScore = getActiveTwist(
      {
        ...baseSnapshot,
        submissionCount: 1,
        lastSubmissionScore: 62,
      },
      'case-low',
    );
    expect(withLowScore.id).toBe('score_recovery');
  });

  it('raises mission target when active twist applies pressure', () => {
    const snapshot: InvestigationSnapshot = {
      ...baseSnapshot,
      openedDocs: 1,
      searchesRun: 0,
      ariaQuestions: 0,
      pinnedItems: 1,
      suspects: 0,
      boardItems: 0,
    };
    const caseId = 'case-crossfire';
    const activeTwist = getActiveTwist(snapshot, caseId);
    const baseMissions = getActiveMissions(snapshot, 6);
    const twistMissions = getActiveMissions(snapshot, 6, caseId);
    const twistMissionById: Record<string, string> = {
      timeline_gap: 'first_clue',
      crossfire: 'cross_check',
      suspect_heat: 'suspect_pressure',
      board_shock: 'board_mastery',
      evidence_rush: 'evidence_chain',
      score_recovery: 'score_hunt',
    };

    const boostedMissionId = twistMissionById[activeTwist.id];
    const baseMission = baseMissions.find(m => m.id === boostedMissionId);
    const twistMission = twistMissions.find(m => m.id === boostedMissionId);

    expect(baseMission).toBeDefined();
    expect(twistMission).toBeDefined();
    expect((twistMission?.target ?? 0) - (baseMission?.target ?? 0)).toBeGreaterThanOrEqual(1);
  });

  it('computes positive twist impact when challenge is completed', () => {
    const snapshot: InvestigationSnapshot = {
      ...baseSnapshot,
      openedDocs: 6,
      searchesRun: 4,
      ariaQuestions: 3,
      pinnedItems: 5,
      suspects: 2,
      boardItems: 8,
    };
    const twist = getActiveTwist(snapshot, 'case-complete');
    const impact = evaluateTwistImpact(snapshot, twist);

    expect(impact.tier).toBe('perfect');
    expect(impact.modifier).toBeGreaterThan(0);
    expect(applyTwistScoreModifier(78, impact.modifier, 100)).toBeGreaterThan(78);
  });

  it('applies penalty when high-urgency twist is ignored', () => {
    const snapshot: InvestigationSnapshot = {
      ...baseSnapshot,
      openedDocs: 0,
      searchesRun: 0,
      ariaQuestions: 0,
      pinnedItems: 0,
      suspects: 0,
      boardItems: 0,
      submissionCount: 1,
      lastSubmissionScore: 10,
    };
    const twist = getActiveTwist(snapshot, 'case-penalty');
    const impact = evaluateTwistImpact(snapshot, twist);

    expect(impact.tier).toBe('missed');
    expect(impact.modifier).toBeLessThanOrEqual(0);
    expect(applyTwistScoreModifier(70, impact.modifier, 100)).toBeLessThanOrEqual(70);
  });

  it('computes cross-case streaks and streak XP bonus', () => {
    const streak = calculateCaseStreak([
      { caseId: 'case-a', score: 88 },
      { caseId: 'case-a', score: 92 }, // same case does not increment
      { caseId: 'case-b', score: 90 },
      { caseId: 'case-c', score: 66 }, // break streak
      { caseId: 'case-d', score: 86 },
    ]);

    expect(streak.current).toBe(1);
    expect(streak.best).toBe(2);
    expect(calculateStreakBonusXp(streak.current)).toBeGreaterThan(0);
    expect(calculateStreakBonusXp(0)).toBe(0);
  });

  it('computes daily and weekly meta missions from timeline', () => {
    const now = new Date('2026-02-17T18:00:00.000Z').getTime();
    const oneHour = 60 * 60 * 1000;
    const twoDays = 2 * 24 * 60 * 60 * 1000;
    const missions = getMetaMissions(
      [
        { caseId: 'case-a', score: 85, timestamp: now - oneHour, hintsUsed: 1 },
        { caseId: 'case-b', score: 94, timestamp: now - oneHour * 2, hintsUsed: 0 },
        { caseId: 'case-c', score: 77, timestamp: now - oneHour * 3, hintsUsed: 2 },
        { caseId: 'case-d', score: 88, timestamp: now - twoDays, hintsUsed: 1 },
      ],
      now,
    );

    const dailyCloser = missions.find(m => m.id === 'daily_closer');
    const dailyElite = missions.find(m => m.id === 'daily_elite');
    const weeklySprint = missions.find(m => m.id === 'weekly_sprint');

    expect(dailyCloser?.completed).toBe(true);
    expect(dailyElite?.completed).toBe(true);
    expect(weeklySprint?.current).toBeGreaterThanOrEqual(3);
    expect(calculateMetaMissionBonusXp(missions)).toBeGreaterThan(0);
  });

  it('tracks weekly clean chain and monthly master missions', () => {
    const now = new Date('2026-02-17T18:00:00.000Z').getTime();
    const hour = 60 * 60 * 1000;
    const day = 24 * hour;
    const missions = getMetaMissions(
      [
        { caseId: 'case-a', score: 90, timestamp: now - hour, hintsUsed: 0 },
        { caseId: 'case-b', score: 88, timestamp: now - hour * 2, hintsUsed: 0 },
        { caseId: 'case-c', score: 86, timestamp: now - hour * 3, hintsUsed: 0 },
        { caseId: 'case-d', score: 87, timestamp: now - day * 5, hintsUsed: 1 },
      ],
      now,
    );

    const cleanChain = missions.find(m => m.id === 'weekly_clean_chain');
    const monthlyMaster = missions.find(m => m.id === 'monthly_master');

    expect(cleanChain?.current).toBeGreaterThanOrEqual(3);
    expect(cleanChain?.completed).toBe(true);
    expect(cleanChain?.claimKey.startsWith('weekly_clean_chain:')).toBe(true);
    expect(monthlyMaster?.period).toBe('monthly');
    expect(monthlyMaster?.current).toBeGreaterThanOrEqual(4);
    expect(monthlyMaster?.completed).toBe(false);
  });

  it('evaluates speed combo tiers by pace and hint usage', () => {
    const blitz = evaluateSpeedCombo({
      openedDocs: 3,
      searchesRun: 2,
      ariaQuestions: 1,
      pinnedItems: 2,
      boardItems: 2,
      hintsUsed: 0,
    });
    const steady = evaluateSpeedCombo({
      openedDocs: 7,
      searchesRun: 5,
      ariaQuestions: 4,
      pinnedItems: 5,
      boardItems: 8,
      hintsUsed: 2,
    });

    expect(blitz.tier).toBe('blitz');
    expect(blitz.modifier).toBeGreaterThan(0);
    expect(steady.tier).toBe('steady');
    expect(steady.modifier).toBe(0);
  });

  it('applies streak shield from weekly clean-chain reward', () => {
    const first = { caseId: 'case-a', score: 88, timestamp: 1, hintsUsed: 0 };
    const second = { caseId: 'case-b', score: 90, timestamp: 2, hintsUsed: 0 };
    const breakRun = { caseId: 'case-c', score: 64, timestamp: 3, hintsUsed: 1 };
    const fourth = { caseId: 'case-d', score: 92, timestamp: 4, hintsUsed: 0 };
    const entries = [first, second, breakRun, fourth];
    const protectedEntries = [first, second, { ...breakRun, shieldProtected: true }, fourth];

    const withoutShield = calculateCaseStreak(entries);
    const withShield = calculateCaseStreak(protectedEntries);

    expect(withoutShield.current).toBe(1);
    expect(withShield.current).toBe(3);

    const now = new Date('2026-02-17T18:00:00.000Z').getTime();
    const week = new Date(now);
    week.setHours(0, 0, 0, 0);
    week.setDate(week.getDate() - ((week.getDay() + 6) % 7));
    const claimKey = `weekly_clean_chain:${week.getTime().toString()}`;
    expect(
      getWeeklyResilienceCharges(
        { [claimKey]: 34 },
        [{ caseId: 'x', score: 60, timestamp: now - 10, shieldProtected: true }],
        now,
      ),
    ).toBe(0);
  });
});
