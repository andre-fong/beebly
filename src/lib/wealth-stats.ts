import {
  BudgetCategory,
  TransactionRecord,
  TransactionSubType,
  TransactionType,
  WealthStatRecord,
  WealthStatType,
} from '../types/domain';

/**
 * Exact point thresholds for Ranks 1 through 6:
 * Rank 1: 0 pts
 * Rank 2: 10 pts
 * Rank 3: 30 pts
 * Rank 4: 80 pts
 * Rank 5: 200 pts
 * Rank 6: 400 pts
 * For Ranks > 6: +250 pts per additional rank (e.g., Rank 7 = 650, Rank 8 = 900)
 */
export const WEALTH_RANK_THRESHOLDS: readonly number[] = [0, 10, 30, 80, 200, 400] as const;
export const OVER_RANK_STEP_POINTS = 250;

export const WEALTH_STAT_TITLES: Record<WealthStatType, readonly [string, string, string, string, string, string]> = {
  [WealthStatType.DISCIPLINE]: ['Casual', 'Steady', 'Mindful', 'Resolute', 'Unshakable', 'Ascetic'],
  [WealthStatType.INSIGHT]: ['Present-minded', 'Aware', 'Calculative', 'Shrewd', 'Astute', 'Visionary'],
  [WealthStatType.KINDNESS]: ['Modest', 'Thoughtful', 'Helpful', 'Generous', 'Altruistic', 'Philanthropist'],
  [WealthStatType.PROSPERITY]: ['Sustained', 'Stable', 'Comfortable', 'Thriving', 'Affluent', 'Wealthy'],
  [WealthStatType.VITALITY]: ['Simple', 'Balanced', 'Spirited', 'Vibrant', 'Dynamic', 'Exuberant'],
  [WealthStatType.FORTITUDE]: ['Ordinary', 'Patient', 'Courageous', 'Resilient', 'Indomitable', 'Dauntless'],
};

export const WEALTH_STAT_METADATA: Record<
  WealthStatType,
  {
    label: string;
    shortDesc: string;
    earningRule: string;
    accentHex: string;
  }
> = {
  [WealthStatType.DISCIPLINE]: {
    label: 'Discipline',
    shortDesc: 'Self-mastery over impulse & daily consistency',
    earningRule: 'Stay under daily budget, maintain logging streaks, and retain logged income/returns.',
    accentHex: '#60A5FA',
  },
  [WealthStatType.INSIGHT]: {
    label: 'Insight',
    shortDesc: 'Foresight in markets, assets & future obligations',
    earningRule: 'Log physical or market investments and schedule future planned expenses ahead of time.',
    accentHex: '#C084FC',
  },
  [WealthStatType.KINDNESS]: {
    label: 'Kindness',
    shortDesc: 'Generosity toward community, gifts & gratitude',
    earningRule: 'Log charity donations, gifts for others, or generous tips.',
    accentHex: '#F472B6',
  },
  [WealthStatType.PROSPERITY]: {
    label: 'Prosperity',
    shortDesc: 'Surplus velocity & net wealth expansion',
    earningRule: 'Maintain net monthly compensation consistently higher than total monthly expenses.',
    accentHex: '#E5B84B',
  },
  [WealthStatType.VITALITY]: {
    label: 'Vitality',
    shortDesc: 'Joyful living balanced within leisure boundaries',
    earningRule: 'Enjoy Entertainment experiences while staying strictly within your Entertainment cap.',
    accentHex: '#34D399',
  },
  [WealthStatType.FORTITUDE]: {
    label: 'Fortitude',
    shortDesc: 'Unflinching accountability under financial pressure',
    earningRule: 'Continue honest logging even when over budget, or pay down student loans and debt.',
    accentHex: '#FB923C',
  },
};

/**
 * Calculates the exact numerical Rank (1..infinity) from accumulated stat points.
 */
export function calculateRankFromPoints(points: number): number {
  const safePoints = Math.max(0, Math.floor(points));

  if (safePoints < WEALTH_RANK_THRESHOLDS[1]) return 1;
  if (safePoints < WEALTH_RANK_THRESHOLDS[2]) return 2;
  if (safePoints < WEALTH_RANK_THRESHOLDS[3]) return 3;
  if (safePoints < WEALTH_RANK_THRESHOLDS[4]) return 4;
  if (safePoints < WEALTH_RANK_THRESHOLDS[5]) return 5;

  // At or above 400 pts (Rank 6+)
  const pointsAboveRank6 = safePoints - WEALTH_RANK_THRESHOLDS[5];
  const extraRanks = Math.floor(pointsAboveRank6 / OVER_RANK_STEP_POINTS);
  return 6 + extraRanks;
}

/**
 * Generates the exact Rank Title for a given WealthStatType and Rank number.
 * Ranks > 6 append a '+' for each rank above 6 (e.g. Rank 7 Insight -> "Visionary+", Rank 8 -> "Visionary++").
 */
export function getRankTitle(statType: WealthStatType, rank: number): string {
  const titles = WEALTH_STAT_TITLES[statType];
  const clampedIndex = Math.max(0, Math.min(5, rank - 1));
  const baseTitle = titles[clampedIndex];

  if (rank <= 6) {
    return baseTitle;
  }

  const plusCount = rank - 6;
  return `${titles[5]}${'+'.repeat(plusCount)}`;
}

/**
 * Formats the display rank badge string (e.g. "1".."6", or "7 (6+)", etc.)
 */
export function getRankProgressDetails(statType: WealthStatType, points: number): {
  rank: number;
  title: string;
  currentRankFloor: number;
  nextRankCeiling: number;
  progressRatio: number;
  pointsToNextRank: number;
} {
  const safePoints = Math.max(0, Math.floor(points));
  const rank = calculateRankFromPoints(safePoints);
  const title = getRankTitle(statType, rank);

  let currentRankFloor = 0;
  let nextRankCeiling = 10;

  if (rank < 6) {
    currentRankFloor = WEALTH_RANK_THRESHOLDS[rank - 1];
    nextRankCeiling = WEALTH_RANK_THRESHOLDS[rank];
  } else {
    const overRankOffset = rank - 6;
    currentRankFloor = WEALTH_RANK_THRESHOLDS[5] + overRankOffset * OVER_RANK_STEP_POINTS;
    nextRankCeiling = currentRankFloor + OVER_RANK_STEP_POINTS;
  }

  const span = Math.max(1, nextRankCeiling - currentRankFloor);
  const progressRatio = Math.min(1, Math.max(0, (safePoints - currentRankFloor) / span));
  const pointsToNextRank = Math.max(0, nextRankCeiling - safePoints);

  return {
    rank,
    title,
    currentRankFloor,
    nextRankCeiling,
    progressRatio,
    pointsToNextRank,
  };
}

export interface StatAwardCandidate {
  statType: WealthStatType;
  deltaPoints: number;
  reason: string;
}

export interface EvaluationContext {
  transaction: TransactionRecord;
  isCurrentlyOverDailyAllowable: boolean;
  isEntertainmentWithinCap: boolean;
  netMonthlySalaryCents: number;
  monthToDateExpensesCents: number;
  underBudgetStreakDays: number;
}

/**
 * Evaluates a newly logged transaction against all 6 Wealth Stat triggers
 * and returns the list of earned stat point awards.
 */
export function evaluateTransactionStatAwards(ctx: EvaluationContext): StatAwardCandidate[] {
  const awards: StatAwardCandidate[] = [];
  const { transaction } = ctx;

  // 1. INSIGHT: Physical/Market investments OR future planned expenses ahead of time
  if (
    transaction.category === BudgetCategory.INVESTMENT ||
    transaction.subType === TransactionSubType.PHYSICAL_INVESTMENT ||
    transaction.subType === TransactionSubType.MARKET_INVESTMENT
  ) {
    const subLabel =
      transaction.subType === TransactionSubType.PHYSICAL_INVESTMENT
        ? 'Physical Asset Investment'
        : 'Market Investment';
    awards.push({
      statType: WealthStatType.INSIGHT,
      deltaPoints: 12,
      reason: `Logged ${subLabel} (${transaction.merchant})`,
    });
  }

  if (transaction.isPlannedFuture) {
    awards.push({
      statType: WealthStatType.INSIGHT,
      deltaPoints: 8,
      reason: `Foresight: Scheduled future planned expense (${transaction.merchant})`,
    });
  }

  // 2. KINDNESS: Charity/Donation, Gifts, or Generous Tips
  if (
    transaction.subType === TransactionSubType.CHARITY_GIFT ||
    transaction.subType === TransactionSubType.GENEROUS_TIP
  ) {
    awards.push({
      statType: WealthStatType.KINDNESS,
      deltaPoints: transaction.subType === TransactionSubType.CHARITY_GIFT ? 14 : 8,
      reason:
        transaction.subType === TransactionSubType.CHARITY_GIFT
          ? `Generosity: Logged charity/gift (${transaction.merchant})`
          : `Graciousness: Logged generous tip (${transaction.merchant})`,
    });
  }

  // 3. DISCIPLINE: Retaining logged income/returns without spending, or staying under daily budget
  if (
    (transaction.type === TransactionType.INCOME || transaction.type === TransactionType.RETURN) &&
    transaction.retainedIncome
  ) {
    awards.push({
      statType: WealthStatType.DISCIPLINE,
      deltaPoints: 10,
      reason: `Retained ${transaction.type.toLowerCase()} inflow without impulse spending`,
    });
  } else if (
    transaction.type === TransactionType.EXPENSE &&
    !ctx.isCurrentlyOverDailyAllowable &&
    !transaction.isPlannedFuture
  ) {
    awards.push({
      statType: WealthStatType.DISCIPLINE,
      deltaPoints: 4,
      reason: `Logged daily expense within allowable burn rate`,
    });
  }

  // 4. VITALITY: Entertainment expense while strictly staying within Entertainment budget limit
  if (
    transaction.type === TransactionType.EXPENSE &&
    transaction.category === BudgetCategory.ENTERTAINMENT &&
    ctx.isEntertainmentWithinCap
  ) {
    awards.push({
      statType: WealthStatType.VITALITY,
      deltaPoints: 10,
      reason: `Balanced joy: Logged Entertainment within monthly cap`,
    });
  }

  // 5. FORTITUDE: Paying down Student Loan OR accountable logging even when over budget limit
  if (transaction.category === BudgetCategory.STUDENT_LOAN) {
    awards.push({
      statType: WealthStatType.FORTITUDE,
      deltaPoints: 15,
      reason: `Debt resilience: Paid down Student Loan (${transaction.merchant})`,
    });
  } else if (transaction.type === TransactionType.EXPENSE && ctx.isCurrentlyOverDailyAllowable) {
    awards.push({
      statType: WealthStatType.FORTITUDE,
      deltaPoints: 9,
      reason: `Accountability under pressure: Logged expense transparently while over cap`,
    });
  }

  // 6. PROSPERITY: Net salary consistently exceeds month-to-date expenses
  if (
    ctx.netMonthlySalaryCents > 0 &&
    ctx.monthToDateExpensesCents < ctx.netMonthlySalaryCents * 0.75 &&
    (transaction.type === TransactionType.INCOME || transaction.category === BudgetCategory.INVESTMENT)
  ) {
    awards.push({
      statType: WealthStatType.PROSPERITY,
      deltaPoints: 8,
      reason: `Surplus velocity: Net compensation outpaces monthly burn`,
    });
  }

  return awards;
}

/**
 * Evaluates End-of-Day (EOD) Accountability Review completion awards.
 */
export function evaluateEodCompletionAwards(params: {
  underDailyAllowable: boolean;
  netMonthlySalaryCents: number;
  monthToDateExpensesCents: number;
  loggingStreakDays: number;
}): StatAwardCandidate[] {
  const awards: StatAwardCandidate[] = [
    {
      statType: WealthStatType.DISCIPLINE,
      deltaPoints: params.underDailyAllowable ? 12 : 6,
      reason: `Completed End of Day Review (${params.loggingStreakDays + 1}-day streak)`,
    },
  ];

  if (!params.underDailyAllowable) {
    awards.push({
      statType: WealthStatType.FORTITUDE,
      deltaPoints: 12,
      reason: `Completed EOD Accountability Review despite high-spend day`,
    });
  }

  if (params.netMonthlySalaryCents > params.monthToDateExpensesCents) {
    awards.push({
      statType: WealthStatType.PROSPERITY,
      deltaPoints: 8,
      reason: `Positive net monthly cashflow maintained at EOD`,
    });
  }

  return awards;
}

/**
 * Normalizes a map or array of points into complete WealthStatRecord objects.
 */
export function buildWealthStatRecords(pointsByStat: Record<WealthStatType, number>): WealthStatRecord[] {
  const orderedTypes: WealthStatType[] = [
    WealthStatType.DISCIPLINE,
    WealthStatType.INSIGHT,
    WealthStatType.KINDNESS,
    WealthStatType.PROSPERITY,
    WealthStatType.VITALITY,
    WealthStatType.FORTITUDE,
  ];

  return orderedTypes.map((statType) => {
    const pts = Math.max(0, Math.floor(pointsByStat[statType] ?? 0));
    const currentRank = calculateRankFromPoints(pts);
    return {
      statType,
      points: pts,
      currentRank,
      title: getRankTitle(statType, currentRank),
    };
  });
}
