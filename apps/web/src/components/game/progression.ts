export interface InvestigationSnapshot {
  openedDocs: number;
  searchesRun: number;
  ariaQuestions: number;
  pinnedItems: number;
  suspects: number;
  boardItems: number;
  submissionCount: number;
  lastSubmissionScore: number | null;
}

export interface SubmissionTimelineEntry {
  caseId: string;
  score: number;
  timestamp?: number;
  hintsUsed?: number;
  shieldProtected?: boolean;
}

export interface CaseStreakSummary {
  current: number;
  best: number;
}

export type MetaMissionId =
  | 'daily_closer'
  | 'daily_elite'
  | 'weekly_sprint'
  | 'weekly_variety'
  | 'weekly_clean_chain'
  | 'monthly_master';

export interface MetaMissionProgress {
  id: MetaMissionId;
  period: 'daily' | 'weekly' | 'monthly';
  current: number;
  target: number;
  rewardXp: number;
  completed: boolean;
  claimKey: string;
}

export interface SpeedComboSnapshot {
  openedDocs: number;
  searchesRun: number;
  ariaQuestions: number;
  pinnedItems: number;
  boardItems: number;
  hintsUsed: number;
}

export interface SpeedComboImpact {
  modifier: number;
  tier: 'blitz' | 'rapid' | 'steady';
  effortScore: number;
}

export type RankId = 'recruit' | 'investigator' | 'analyst' | 'detective' | 'mastermind';

export interface RankTier {
  id: RankId;
  minXp: number;
}

export type MissionId =
  | 'first_clue'
  | 'cross_check'
  | 'evidence_chain'
  | 'suspect_pressure'
  | 'board_mastery'
  | 'final_report'
  | 'score_hunt'
  | 'victory_lap';

export interface MissionProgress {
  id: MissionId;
  current: number;
  target: number;
  rewardXp: number;
}

export type RewardId = 'breakthrough' | 'connector' | 'profiler' | 'closer' | 'elite';
export type TwistId =
  | 'timeline_gap'
  | 'crossfire'
  | 'suspect_heat'
  | 'board_shock'
  | 'evidence_rush'
  | 'score_recovery';

export interface TwistChallenge {
  id: TwistId;
  current: number;
  target: number;
  rewardXp: number;
  urgency: 'low' | 'medium' | 'high';
  timeboxMinutes: number;
}

export interface TwistImpact {
  modifier: number;
  completed: boolean;
  ratio: number;
  tier: 'perfect' | 'good' | 'partial' | 'missed';
}

export const RANK_TIERS: RankTier[] = [
  { id: 'recruit', minXp: 0 },
  { id: 'investigator', minXp: 120 },
  { id: 'analyst', minXp: 260 },
  { id: 'detective', minXp: 420 },
  { id: 'mastermind', minXp: 620 },
];

export const REWARD_IDS: RewardId[] = ['breakthrough', 'connector', 'profiler', 'closer', 'elite'];

const STREAK_SUCCESS_SCORE = 85;
const STREAK_FAIL_SCORE = 70;

function hashString(value: string): number {
  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) % 2147483647;
  }
  return Math.abs(hash);
}

function buildTwistPool(snapshot: InvestigationSnapshot): TwistChallenge[] {
  const checks = snapshot.searchesRun + snapshot.ariaQuestions;
  const score = snapshot.lastSubmissionScore ?? 0;

  const pool: TwistChallenge[] = [
    {
      id: 'timeline_gap',
      current: snapshot.openedDocs,
      target: 5,
      rewardXp: 22,
      urgency: 'medium',
      timeboxMinutes: 8,
    },
    {
      id: 'crossfire',
      current: checks,
      target: 6,
      rewardXp: 28,
      urgency: 'high',
      timeboxMinutes: 7,
    },
    {
      id: 'suspect_heat',
      current: snapshot.suspects,
      target: 2,
      rewardXp: 30,
      urgency: 'high',
      timeboxMinutes: 6,
    },
    {
      id: 'board_shock',
      current: snapshot.boardItems,
      target: 8,
      rewardXp: 24,
      urgency: 'medium',
      timeboxMinutes: 9,
    },
    {
      id: 'evidence_rush',
      current: snapshot.pinnedItems,
      target: 5,
      rewardXp: 26,
      urgency: 'medium',
      timeboxMinutes: 8,
    },
  ];

  if (snapshot.submissionCount > 0 && score < 90) {
    pool.push({
      id: 'score_recovery',
      current: score,
      target: 90,
      rewardXp: 36,
      urgency: 'high',
      timeboxMinutes: 10,
    });
  }

  return pool;
}

export function calculateInvestigationXp(snapshot: InvestigationSnapshot): number {
  const scoreBonus =
    snapshot.submissionCount > 0 && typeof snapshot.lastSubmissionScore === 'number'
      ? Math.max(0, Math.round(snapshot.lastSubmissionScore / 2))
      : 0;

  return (
    snapshot.openedDocs * 8 +
    snapshot.searchesRun * 12 +
    snapshot.ariaQuestions * 12 +
    snapshot.pinnedItems * 15 +
    snapshot.suspects * 18 +
    snapshot.boardItems * 6 +
    snapshot.submissionCount * 40 +
    scoreBonus
  );
}

export function calculateCaseStreak(entries: SubmissionTimelineEntry[]): CaseStreakSummary {
  let current = 0;
  let best = 0;
  const activeCases = new Set<string>();

  for (const entry of entries) {
    const score = Math.round(entry.score);
    if (score < STREAK_FAIL_SCORE) {
      if (entry.shieldProtected === true) {
        continue;
      }
      current = 0;
      activeCases.clear();
      continue;
    }

    if (score < STREAK_SUCCESS_SCORE) {
      continue;
    }

    if (activeCases.has(entry.caseId)) {
      continue;
    }

    activeCases.add(entry.caseId);
    current += 1;
    if (current > best) {
      best = current;
    }
  }

  return { current, best };
}

export function getWeeklyResilienceCharges(
  claimedMetaRewards: Record<string, number>,
  entries: SubmissionTimelineEntry[],
  now = Date.now(),
): number {
  const weekStart = getStartOfLocalWeek(now);
  const weeklyClaimKey = `weekly_clean_chain:${weekStart.toString()}`;
  const totalCharges = typeof claimedMetaRewards[weeklyClaimKey] === 'number' ? 1 : 0;
  if (totalCharges <= 0) return 0;

  const consumedCharges = entries.filter(
    entry =>
      (entry.timestamp ?? 0) >= weekStart &&
      Math.round(entry.score) < STREAK_FAIL_SCORE &&
      entry.shieldProtected === true,
  ).length;
  return Math.max(0, totalCharges - consumedCharges);
}

export function calculateStreakBonusXp(streak: number): number {
  const normalized = Math.max(0, Math.floor(streak));
  if (normalized <= 0) return 0;
  if (normalized === 1) return 8;
  if (normalized === 2) return 18;
  return Math.min(72, 18 + (normalized - 2) * 12);
}

function getStartOfLocalDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function getStartOfLocalWeek(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  const day = (date.getDay() + 6) % 7; // Monday = 0
  date.setDate(date.getDate() - day);
  return date.getTime();
}

function getStartOfLocalMonth(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  date.setDate(1);
  return date.getTime();
}

function getTimelineWindow(
  entries: SubmissionTimelineEntry[],
  windowStart: number,
): SubmissionTimelineEntry[] {
  return entries.filter(entry => (entry.timestamp ?? 0) >= windowStart);
}

function calculateCleanRunChain(entries: SubmissionTimelineEntry[]): number {
  let current = 0;
  let best = 0;

  for (const entry of entries) {
    const cleanRun = entry.score >= 80 && (entry.hintsUsed ?? 99) === 0;
    if (!cleanRun) {
      current = 0;
      continue;
    }
    current += 1;
    if (current > best) {
      best = current;
    }
  }

  return best;
}

export function getMetaMissions(
  entries: SubmissionTimelineEntry[],
  now = Date.now(),
): MetaMissionProgress[] {
  const dayStart = getStartOfLocalDay(now);
  const weekStart = getStartOfLocalWeek(now);
  const monthStart = getStartOfLocalMonth(now);
  const dailyEntries = getTimelineWindow(entries, dayStart);
  const weeklyEntries = getTimelineWindow(entries, weekStart);
  const monthlyEntries = getTimelineWindow(entries, monthStart);

  const dailyClosers = new Set(
    dailyEntries.filter(entry => entry.score >= 80).map(entry => entry.caseId),
  ).size;
  const dailyElite = dailyEntries.filter(entry => entry.score >= 92).length;
  const weeklySprint = weeklyEntries.filter(entry => entry.score >= 75).length;
  const weeklyVariety = new Set(
    weeklyEntries.filter(entry => entry.score >= 80).map(entry => entry.caseId),
  ).size;
  const weeklyCleanChain = calculateCleanRunChain(weeklyEntries);
  const monthlyMaster = monthlyEntries.filter(entry => entry.score >= 85).length;

  const missions: MetaMissionProgress[] = [
    {
      id: 'daily_closer',
      period: 'daily',
      current: dailyClosers,
      target: 2,
      rewardXp: 24,
      completed: dailyClosers >= 2,
      claimKey: `daily_closer:${dayStart.toString()}`,
    },
    {
      id: 'daily_elite',
      period: 'daily',
      current: dailyElite,
      target: 1,
      rewardXp: 20,
      completed: dailyElite >= 1,
      claimKey: `daily_elite:${dayStart.toString()}`,
    },
    {
      id: 'weekly_sprint',
      period: 'weekly',
      current: weeklySprint,
      target: 6,
      rewardXp: 36,
      completed: weeklySprint >= 6,
      claimKey: `weekly_sprint:${weekStart.toString()}`,
    },
    {
      id: 'weekly_variety',
      period: 'weekly',
      current: weeklyVariety,
      target: 4,
      rewardXp: 32,
      completed: weeklyVariety >= 4,
      claimKey: `weekly_variety:${weekStart.toString()}`,
    },
    {
      id: 'weekly_clean_chain',
      period: 'weekly',
      current: weeklyCleanChain,
      target: 3,
      rewardXp: 34,
      completed: weeklyCleanChain >= 3,
      claimKey: `weekly_clean_chain:${weekStart.toString()}`,
    },
    {
      id: 'monthly_master',
      period: 'monthly',
      current: monthlyMaster,
      target: 12,
      rewardXp: 64,
      completed: monthlyMaster >= 12,
      claimKey: `monthly_master:${monthStart.toString()}`,
    },
  ];

  return missions;
}

export function calculateMetaMissionBonusXp(missions: MetaMissionProgress[]): number {
  return missions.reduce((sum, mission) => sum + (mission.completed ? mission.rewardXp : 0), 0);
}

export function evaluateSpeedCombo(snapshot: SpeedComboSnapshot): SpeedComboImpact {
  const effortScore =
    snapshot.openedDocs +
    snapshot.searchesRun * 2 +
    snapshot.ariaQuestions * 2 +
    snapshot.pinnedItems * 2 +
    snapshot.boardItems;
  const hintsUsed = Math.max(0, snapshot.hintsUsed);

  if (hintsUsed === 0 && effortScore <= 20) {
    return { modifier: 8, tier: 'blitz', effortScore };
  }

  if (hintsUsed <= 1 && effortScore <= 30) {
    return { modifier: 4, tier: 'rapid', effortScore };
  }

  return { modifier: 0, tier: 'steady', effortScore };
}

export function getRankForXp(xp: number): RankTier {
  const normalizedXp = Math.max(0, xp);
  const reversed = [...RANK_TIERS].reverse();
  const tier = reversed.find(entry => normalizedXp >= entry.minXp);
  const fallbackTier = RANK_TIERS[0];
  if (!fallbackTier) {
    return { id: 'recruit', minXp: 0 };
  }
  return tier ?? fallbackTier;
}

export function getNextRank(xp: number): RankTier | null {
  const current = getRankForXp(xp);
  const index = RANK_TIERS.findIndex(entry => entry.id === current.id);
  if (index < 0 || index >= RANK_TIERS.length - 1) return null;
  return RANK_TIERS[index + 1] ?? null;
}

function getMissionPool(snapshot: InvestigationSnapshot): MissionProgress[] {
  const missionPool: MissionProgress[] = [
    {
      id: 'first_clue',
      current: snapshot.openedDocs,
      target: 2,
      rewardXp: 20,
    },
    {
      id: 'cross_check',
      current: snapshot.searchesRun + snapshot.ariaQuestions,
      target: 4,
      rewardXp: 30,
    },
    {
      id: 'evidence_chain',
      current: snapshot.pinnedItems,
      target: 4,
      rewardXp: 35,
    },
    {
      id: 'suspect_pressure',
      current: snapshot.suspects,
      target: 2,
      rewardXp: 40,
    },
    {
      id: 'board_mastery',
      current: snapshot.boardItems,
      target: 6,
      rewardXp: 30,
    },
    {
      id: 'final_report',
      current: snapshot.submissionCount,
      target: 1,
      rewardXp: 50,
    },
  ];

  if (snapshot.submissionCount > 0) {
    missionPool.unshift({
      id: 'score_hunt',
      current: snapshot.lastSubmissionScore ?? 0,
      target: 90,
      rewardXp: 40,
    });
  }

  return missionPool;
}

function getTwistMissionAdjustments(
  twist: TwistChallenge | null,
): Partial<Record<MissionId, number>> {
  if (!twist) return {};

  switch (twist.id) {
    case 'timeline_gap':
      return { first_clue: 1 };
    case 'crossfire':
      return { cross_check: 2 };
    case 'suspect_heat':
      return { suspect_pressure: 1 };
    case 'board_shock':
      return { board_mastery: 2 };
    case 'evidence_rush':
      return { evidence_chain: 1 };
    case 'score_recovery':
      return { score_hunt: 5 };
    default:
      return {};
  }
}

export function getActiveMissions(
  snapshot: InvestigationSnapshot,
  limit = 3,
  caseId?: string,
): MissionProgress[] {
  const activeTwist = caseId ? getActiveTwist(snapshot, caseId) : null;
  const missionAdjustments = getTwistMissionAdjustments(activeTwist);
  const missionPool = getMissionPool(snapshot).map(mission => {
    const adjustedTarget = mission.target + (missionAdjustments[mission.id] ?? 0);
    return {
      ...mission,
      target: adjustedTarget,
    };
  });

  const pending = missionPool.filter(mission => mission.current < mission.target);
  if (pending.length > 0) {
    return pending.slice(0, Math.max(1, limit));
  }

  return [
    {
      id: 'victory_lap',
      current: 1,
      target: 1,
      rewardXp: 25,
    },
  ];
}

export function getUnlockedRewards(snapshot: InvestigationSnapshot): RewardId[] {
  const rewards: RewardId[] = [];
  const checks = snapshot.searchesRun + snapshot.ariaQuestions;

  if (snapshot.openedDocs >= 2 && checks >= 2) rewards.push('breakthrough');
  if (snapshot.boardItems >= 6) rewards.push('connector');
  if (snapshot.suspects >= 2) rewards.push('profiler');
  if (snapshot.submissionCount > 0) rewards.push('closer');
  if ((snapshot.lastSubmissionScore ?? 0) >= 90) rewards.push('elite');

  return rewards;
}

export function evaluateTwistImpact(
  snapshot: InvestigationSnapshot,
  twist: TwistChallenge,
): TwistImpact {
  const current = Math.min(
    Math.max(0, twist.current),
    twist.id === 'score_recovery'
      ? Math.max(snapshot.lastSubmissionScore ?? 0, twist.current)
      : twist.current,
  );
  const ratio = twist.target > 0 ? current / twist.target : 1;
  const clampedRatio = Math.max(0, Math.min(1.5, ratio));

  if (clampedRatio >= 1) {
    const modifier = twist.urgency === 'high' ? 12 : twist.urgency === 'medium' ? 10 : 8;
    return { modifier, completed: true, ratio: clampedRatio, tier: 'perfect' };
  }

  if (clampedRatio >= 0.75) {
    const modifier = twist.urgency === 'high' ? 6 : twist.urgency === 'medium' ? 5 : 4;
    return { modifier, completed: false, ratio: clampedRatio, tier: 'good' };
  }

  if (clampedRatio >= 0.5) {
    const modifier = twist.urgency === 'high' ? 3 : twist.urgency === 'medium' ? 2 : 1;
    return { modifier, completed: false, ratio: clampedRatio, tier: 'partial' };
  }

  if (clampedRatio >= 0.25) {
    return { modifier: 0, completed: false, ratio: clampedRatio, tier: 'partial' };
  }

  const penalty = twist.urgency === 'high' ? -4 : twist.urgency === 'medium' ? -3 : -1;
  return { modifier: penalty, completed: false, ratio: clampedRatio, tier: 'missed' };
}

export function applyTwistScoreModifier(score: number, modifier: number, maxScore = 100): number {
  const adjusted = score + modifier;
  return Math.max(0, Math.min(maxScore, adjusted));
}

export function getActiveTwist(snapshot: InvestigationSnapshot, caseId: string): TwistChallenge {
  const twistPool = buildTwistPool(snapshot);
  const scoreRecovery = twistPool.find(
    twist => twist.id === 'score_recovery' && twist.current < twist.target,
  );
  if (scoreRecovery) {
    return scoreRecovery;
  }

  const baseIndex = hashString(caseId) % twistPool.length;
  const rotatedPool = [...twistPool.slice(baseIndex), ...twistPool.slice(0, baseIndex)];
  const pending = rotatedPool.find(twist => twist.current < twist.target);
  return (
    pending ??
    rotatedPool[0] ??
    twistPool[0] ?? {
      id: 'timeline_gap',
      current: 0,
      target: 1,
      rewardXp: 20,
      urgency: 'medium',
      timeboxMinutes: 8,
    }
  );
}
