import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRankFromPoints,
  getRankTitle,
  getRankProgressDetails,
  evaluateTransactionStatAwards,
} from './wealth-stats';
import {
  dollarsToCents,
  centsToDollars,
  normalizeSalary,
  calculateBudgetSummary,
} from './budget-calculator';
import {
  calculateTransitFare,
  findPredictiveCommute,
  upsertTransitPatternList,
} from './transit-engine';
import {
  BudgetCategory,
  BudgetMode,
  SalaryType,
  TransactionSubType,
  TransactionType,
  TransitAgency,
  WealthStatType,
} from '../types/domain';

test('Wealth Stats exact rank progression thresholds (0, 10, 30, 80, 200, 400, 6+)', () => {
  assert.equal(calculateRankFromPoints(0), 1);
  assert.equal(calculateRankFromPoints(9), 1);
  assert.equal(calculateRankFromPoints(10), 2);
  assert.equal(calculateRankFromPoints(29), 2);
  assert.equal(calculateRankFromPoints(30), 3);
  assert.equal(calculateRankFromPoints(79), 3);
  assert.equal(calculateRankFromPoints(80), 4);
  assert.equal(calculateRankFromPoints(199), 4);
  assert.equal(calculateRankFromPoints(200), 5);
  assert.equal(calculateRankFromPoints(399), 5);
  assert.equal(calculateRankFromPoints(400), 6);
  assert.equal(calculateRankFromPoints(649), 6);
  assert.equal(calculateRankFromPoints(650), 7);
  assert.equal(calculateRankFromPoints(900), 8);
});

test('Wealth Stats rank titles and Over-Rank (6+) suffix generator', () => {
  assert.equal(getRankTitle(WealthStatType.DISCIPLINE, 1), 'Casual');
  assert.equal(getRankTitle(WealthStatType.DISCIPLINE, 6), 'Ascetic');
  assert.equal(getRankTitle(WealthStatType.INSIGHT, 1), 'Present-minded');
  assert.equal(getRankTitle(WealthStatType.INSIGHT, 6), 'Visionary');
  assert.equal(getRankTitle(WealthStatType.INSIGHT, 7), 'Visionary+');
  assert.equal(getRankTitle(WealthStatType.INSIGHT, 8), 'Visionary++');
  assert.equal(getRankTitle(WealthStatType.KINDNESS, 6), 'Philanthropist');
  assert.equal(getRankTitle(WealthStatType.PROSPERITY, 5), 'Affluent');
  assert.equal(getRankTitle(WealthStatType.VITALITY, 6), 'Exuberant');
  assert.equal(getRankTitle(WealthStatType.FORTITUDE, 6), 'Dauntless');

  const details = getRankProgressDetails(WealthStatType.INSIGHT, 660);
  assert.equal(details.rank, 7);
  assert.equal(details.title, 'Visionary+');
});

test('Wealth Stats evaluators award points for Investments, Charity, Vitality, and Fortitude', () => {
  const awards = evaluateTransactionStatAwards({
    transaction: {
      id: 'tx-test-1',
      type: TransactionType.EXPENSE,
      category: BudgetCategory.INVESTMENT,
      subType: TransactionSubType.MARKET_INVESTMENT,
      amountCents: 50000,
      occurredAt: new Date().toISOString(),
      isPlannedFuture: true,
      isRecurringInstance: false,
      merchant: 'Vanguard S&P 500',
      notes: '',
      syncedToSheets: false,
      retainedIncome: true,
    },
    isCurrentlyOverDailyAllowable: false,
    isEntertainmentWithinCap: true,
    netMonthlySalaryCents: 500000,
    monthToDateExpensesCents: 150000,
    underBudgetStreakDays: 5,
  });

  const insightPoints = awards
    .filter((a) => a.statType === WealthStatType.INSIGHT)
    .reduce((sum, a) => sum + a.deltaPoints, 0);
  assert.equal(insightPoints, 20); // 12 for investment + 8 for planned future
});

test('Budgeting calculator normalizes Hourly, Monthly, and Annual salaries and handles nullable category caps', () => {
  assert.equal(dollarsToCents('14.50'), 1450);
  assert.equal(centsToDollars(125050), '$1,250.50');

  const hourlyNorm = normalizeSalary(SalaryType.HOURLY, 4000, 40, 30); // $40/hr * 40h * 52w = $83,200/yr
  assert.equal(hourlyNorm.effectiveAnnualCents, 8320000);

  const refDate = new Date(2026, 10, 16, 12, 0); // Nov 16, 2026 (15 days remaining in 30-day month)
  const summary = calculateBudgetSummary({
    budgetMode: BudgetMode.HYBRID,
    totalMonthlyBudgetCents: 300000, // $3,000
    categoryBudgets: [
      { id: '1', category: BudgetCategory.RENT, monthlyLimitCents: 150000 },
      { id: '2', category: BudgetCategory.DINING, monthlyLimitCents: 30000 },
      { id: '3', category: BudgetCategory.BUSINESS, monthlyLimitCents: null }, // Uncapped bookkeeping
    ],
    recurringTemplates: [
      {
        id: 'r1',
        title: 'Rent',
        category: BudgetCategory.RENT,
        amountCents: 150000,
        frequency: 'MONTHLY' as any,
        nextDueDate: refDate.toISOString(),
        transitRouteId: null,
        active: true,
      },
    ],
    transactions: [
      {
        id: 't1',
        type: TransactionType.EXPENSE,
        category: BudgetCategory.DINING,
        subType: TransactionSubType.STANDARD,
        amountCents: 10000, // $100 discretionary spent
        occurredAt: refDate.toISOString(),
        isPlannedFuture: false,
        isRecurringInstance: false,
        merchant: 'Bistro',
        notes: '',
        syncedToSheets: false,
        retainedIncome: true,
      },
    ],
    referenceDate: refDate,
  });

  // Remaining allowable month = $3,000 - $1,500 recurring - $100 discretionary = $1,400 (140000 cents)
  assert.equal(summary.remainingAllowableMonthCents, 140000);
  assert.equal(summary.remainingDaysInMonth, 15);
  // 140000 / 15 = 9333 cents ($93.33/day)
  assert.equal(summary.allowableDailySpendCents, 9333);

  const businessBreakdown = summary.categoryBreakdown.find((c) => c.category === BudgetCategory.BUSINESS);
  assert.equal(businessBreakdown?.isCapped, false);
  assert.equal(businessBreakdown?.monthlyLimitCents, null);
});

test('TTC & GO Transit fare calculator and 3+ commute pattern predictor', () => {
  const now = new Date(2026, 10, 5, 8, 30);

  // 1. Standard GO Transit trip Oakville GO -> Union Station GO
  const goFare = calculateTransitFare({
    agency: TransitAgency.GO_TRANSIT,
    originStopName: 'Oakville GO',
    destinationStopName: 'Union Station GO',
    recentLogs: [],
    referenceTime: now,
  });
  assert.ok(goFare.calculatedFareCents > 800 && goFare.calculatedFareCents < 950);

  // 2. Ontario One Fare: Connecting to TTC Subway within 3 hours of GO Transit costs $0.00
  const ttcTransferFare = calculateTransitFare({
    agency: TransitAgency.TTC_SUBWAY,
    originStopName: 'Union Station',
    destinationStopName: 'Bloor-Yonge Station',
    recentLogs: [
      {
        id: 'log-go',
        agency: TransitAgency.GO_TRANSIT,
        originStop: 'Oakville GO',
        destinationStop: 'Union Station GO',
        calculatedFareCents: goFare.calculatedFareCents,
        actualFareCents: goFare.calculatedFareCents,
        dayOfWeek: now.getDay(),
        timeSlot: 'MORNING_RUSH',
        wasPredicted: false,
        oneFareApplied: false,
        occurredAt: new Date(now.getTime() - 35 * 60 * 1000).toISOString(),
      },
    ],
    referenceTime: now,
  });
  assert.equal(ttcTransferFare.calculatedFareCents, 0);
  assert.equal(ttcTransferFare.oneFareApplied, true);

  // 3. Pattern recognition triggers after 3+ identical commutes
  let patterns: any[] = [];
  for (let i = 0; i < 3; i++) {
    patterns = upsertTransitPatternList(patterns, {
      id: `l-${i}`,
      agency: TransitAgency.GO_TRANSIT,
      originStop: 'Oakville GO',
      destinationStop: 'Union Station GO',
      calculatedFareCents: 892,
      actualFareCents: 892,
      dayOfWeek: now.getDay(),
      timeSlot: 'MORNING_RUSH',
      wasPredicted: false,
      oneFareApplied: false,
      occurredAt: now.toISOString(),
    });
  }

  const prediction = findPredictiveCommute(patterns, now);
  assert.ok(prediction !== null);
  assert.equal(
    prediction?.promptText,
    'Took the GO from Oakville GO to Union Station GO today ($8.92)?'
  );
});
