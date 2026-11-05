import {
  BudgetCategory,
  BudgetMode,
  CategoryBudgetItem,
  RecurringFrequency,
  RecurringTemplateItem,
  SalaryType,
  TransactionRecord,
  TransactionSubType,
  TransactionType,
  TransitAgency,
  TransitLogRecord,
  TransitPatternRecord,
  UserProfile,
  WealthStatEventRecord,
  WealthStatType,
} from '../src/types/domain';
import {
  GO_TRANSIT_STATIONS,
  TTC_BUS_STOPS,
  TTC_SUBWAY_STATIONS,
} from '../src/lib/transit-engine';

export const SEED_TRANSIT_STATIONS = {
  ttcSubway: TTC_SUBWAY_STATIONS,
  ttcBus: TTC_BUS_STOPS,
  goTransit: GO_TRANSIT_STATIONS,
};

export function createInitialSeedState(now: Date = new Date()): {
  user: UserProfile;
  categoryBudgets: CategoryBudgetItem[];
  recurringTemplates: RecurringTemplateItem[];
  transactions: TransactionRecord[];
  transitLogs: TransitLogRecord[];
  transitPatterns: TransitPatternRecord[];
  wealthStatPoints: Record<WealthStatType, number>;
  wealthStatEvents: WealthStatEventRecord[];
} {
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();

  const makeIso = (dayOffset: number, hour = 13, minute = 15) => {
    const targetDay = Math.max(1, day + dayOffset);
    return new Date(year, month, targetDay, hour, minute).toISOString();
  };

  const user: UserProfile = {
    id: 'usr-beebly-demo',
    name: 'Alex Rivera',
    email: 'alex.rivera@toronto.ca',
    salaryType: SalaryType.ANNUAL,
    salaryAmountCents: 8400000, // $84,000.00 / yr gross (~$5,460/mo net)
    weeklyHours: 40,
    budgetMode: BudgetMode.HYBRID,
    totalMonthlyBudgetCents: 420000, // $4,200.00 / mo overarching budget
    onboardingState: {
      name: true,
      budgeting: true,
      logging: true,
      wealthStats: true,
      completed: true,
    },
    lastWelcomeCalendarDate: null, // Triggers Slot-Flip Welcome Calendar on first visit
    googleSheetId: null,
    googleSheetName: null,
    googleSheetSyncEnabled: false,
    reducedMotion: false,
    loggingStreakDays: 6,
    underBudgetStreakDays: 4,
    eodReminderTime: '21:00',
    notificationsEnabled: true,
  };

  // Note how beberapa categories have a monthlyLimitCents and others are null (uncapped bookkeeping-only)
  const categoryBudgets: CategoryBudgetItem[] = [
    { id: 'cb-rent', category: BudgetCategory.RENT, monthlyLimitCents: 185000 },
    { id: 'cb-groceries', category: BudgetCategory.GROCERIES, monthlyLimitCents: 48000 },
    { id: 'cb-dining', category: BudgetCategory.DINING, monthlyLimitCents: 26000 },
    { id: 'cb-entertainment', category: BudgetCategory.ENTERTAINMENT, monthlyLimitCents: 18000 },
    { id: 'cb-student-loan', category: BudgetCategory.STUDENT_LOAN, monthlyLimitCents: 32000 },
    { id: 'cb-subscriptions', category: BudgetCategory.SUBSCRIPTIONS, monthlyLimitCents: 9500 },
    { id: 'cb-shopping', category: BudgetCategory.SHOPPING, monthlyLimitCents: 22000 },
    { id: 'cb-business', category: BudgetCategory.BUSINESS, monthlyLimitCents: null }, // Uncapped bookkeeping
    { id: 'cb-transit', category: BudgetCategory.TRANSIT, monthlyLimitCents: 24000 },
    { id: 'cb-investment', category: BudgetCategory.INVESTMENT, monthlyLimitCents: null }, // Uncapped wealth building
    { id: 'cb-misc', category: BudgetCategory.MISCELLANEOUS, monthlyLimitCents: null }, // Uncapped bookkeeping
  ];

  const recurringTemplates: RecurringTemplateItem[] = [
    {
      id: 'rec-rent',
      title: 'Midtown Apartment Lease',
      category: BudgetCategory.RENT,
      amountCents: 185000,
      frequency: RecurringFrequency.MONTHLY,
      nextDueDate: new Date(year, month + 1, 1).toISOString(),
      transitRouteId: null,
      active: true,
    },
    {
      id: 'rec-osap',
      title: 'NSLSC / OSAP Student Loan',
      category: BudgetCategory.STUDENT_LOAN,
      amountCents: 32000,
      frequency: RecurringFrequency.MONTHLY,
      nextDueDate: new Date(year, month, 28).toISOString(),
      transitRouteId: null,
      active: true,
    },
    {
      id: 'rec-subs',
      title: 'Cloud Storage & Fiber Internet',
      category: BudgetCategory.SUBSCRIPTIONS,
      amountCents: 7800,
      frequency: RecurringFrequency.MONTHLY,
      nextDueDate: new Date(year, month, 18).toISOString(),
      transitRouteId: null,
      active: true,
    },
    {
      id: 'rec-transit',
      title: 'PRESTO Commuter Baseline',
      category: BudgetCategory.TRANSIT,
      amountCents: 16500,
      frequency: RecurringFrequency.MONTHLY,
      nextDueDate: new Date(year, month, 25).toISOString(),
      transitRouteId: 'go-oakville-union',
      active: true,
    },
  ];

  const transactions: TransactionRecord[] = [
    {
      id: 'tx-1',
      type: TransactionType.EXPENSE,
      category: BudgetCategory.RENT,
      subType: TransactionSubType.STANDARD,
      amountCents: 185000,
      occurredAt: new Date(year, month, 1, 9, 0).toISOString(),
      isPlannedFuture: false,
      isRecurringInstance: true,
      merchant: 'Midtown Property Management',
      notes: 'Monthly apartment rent',
      syncedToSheets: true,
      retainedIncome: true,
    },
    {
      id: 'tx-2',
      type: TransactionType.EXPENSE,
      category: BudgetCategory.GROCERIES,
      subType: TransactionSubType.STANDARD,
      amountCents: 8420,
      occurredAt: makeIso(-2, 18, 30),
      isPlannedFuture: false,
      isRecurringInstance: false,
      merchant: 'St. Lawrence Market Produce',
      notes: 'Weekly produce & pantry essentials',
      syncedToSheets: true,
      retainedIncome: true,
    },
    {
      id: 'tx-3',
      type: TransactionType.EXPENSE,
      category: BudgetCategory.INVESTMENT,
      subType: TransactionSubType.MARKET_INVESTMENT,
      amountCents: 35000,
      occurredAt: makeIso(-1, 10, 15),
      isPlannedFuture: false,
      isRecurringInstance: false,
      merchant: 'Wealthsimple TFSA — XEQT ETF',
      notes: 'Automated bi-weekly index contribution',
      syncedToSheets: true,
      retainedIncome: true,
    },
    {
      id: 'tx-4',
      type: TransactionType.EXPENSE,
      category: BudgetCategory.ENTERTAINMENT,
      subType: TransactionSubType.STANDARD,
      amountCents: 2450,
      occurredAt: makeIso(-1, 20, 0),
      isPlannedFuture: false,
      isRecurringInstance: false,
      merchant: 'TIFF Bell Lightbox',
      notes: 'Evening screening ticket',
      syncedToSheets: true,
      retainedIncome: true,
    },
    {
      id: 'tx-5',
      type: TransactionType.EXPENSE,
      category: BudgetCategory.MISCELLANEOUS,
      subType: TransactionSubType.CHARITY_GIFT,
      amountCents: 3000,
      occurredAt: makeIso(-1, 14, 10),
      isPlannedFuture: false,
      isRecurringInstance: false,
      merchant: 'Daily Bread Food Bank Toronto',
      notes: 'Monthly community food bank donation',
      syncedToSheets: true,
      retainedIncome: true,
    },
    {
      id: 'tx-6',
      type: TransactionType.EXPENSE,
      category: BudgetCategory.DINING,
      subType: TransactionSubType.STANDARD,
      amountCents: 1680,
      occurredAt: makeIso(0, 12, 45),
      isPlannedFuture: false,
      isRecurringInstance: false,
      merchant: 'Pai Northern Thai Kitchen',
      notes: 'Lunch bowl downtown',
      syncedToSheets: false,
      retainedIncome: true,
    },
    {
      id: 'tx-7',
      type: TransactionType.EXPENSE,
      category: BudgetCategory.SHOPPING,
      subType: TransactionSubType.STANDARD,
      amountCents: 14500,
      occurredAt: new Date(year, month, Math.min(28, day + 6), 12, 0).toISOString(),
      isPlannedFuture: true,
      isRecurringInstance: false,
      merchant: 'Winter Commuter Boots Replacement',
      notes: 'Planned ahead for late-November weather',
      syncedToSheets: false,
      retainedIncome: true,
    },
  ];

  const transitLogs: TransitLogRecord[] = [
    {
      id: 'tlog-1',
      agency: TransitAgency.GO_TRANSIT,
      originStop: 'Oakville GO',
      destinationStop: 'Union Station GO',
      calculatedFareCents: 892,
      actualFareCents: 892,
      dayOfWeek: now.getDay(),
      timeSlot: 'MORNING_RUSH',
      wasPredicted: true,
      oneFareApplied: false,
      occurredAt: makeIso(-1, 8, 15),
    },
    {
      id: 'tlog-2',
      agency: TransitAgency.TTC_SUBWAY,
      originStop: 'Union Station',
      destinationStop: 'St. George Station',
      calculatedFareCents: 0,
      actualFareCents: 0,
      dayOfWeek: now.getDay(),
      timeSlot: 'MORNING_RUSH',
      wasPredicted: true,
      oneFareApplied: true,
      occurredAt: makeIso(-1, 8, 52),
    },
  ];

  // High-confidence pattern (4 prior identical commutes on today's weekday) so predictive prompt works immediately
  const transitPatterns: TransitPatternRecord[] = [
    {
      id: 'tpat-oakville-union',
      dayOfWeek: now.getDay(),
      timeSlot: 'MORNING_RUSH',
      agency: TransitAgency.GO_TRANSIT,
      originStop: 'Oakville GO',
      destinationStop: 'Union Station GO',
      standardFareCents: 892,
      confidenceCount: 5,
    },
    {
      id: 'tpat-ttc-union-bloor',
      dayOfWeek: now.getDay(),
      timeSlot: 'EVENING_RUSH',
      agency: TransitAgency.TTC_SUBWAY,
      originStop: 'Bloor-Yonge Station',
      destinationStop: 'Union Station',
      standardFareCents: 330,
      confidenceCount: 4,
    },
  ];

  const wealthStatPoints: Record<WealthStatType, number> = {
    [WealthStatType.DISCIPLINE]: 86,   // Rank 4: Resolute
    [WealthStatType.INSIGHT]: 415,     // Rank 6: Visionary (close to Visionary+ at 650)
    [WealthStatType.KINDNESS]: 38,     // Rank 3: Helpful
    [WealthStatType.PROSPERITY]: 212,  // Rank 5: Affluent
    [WealthStatType.VITALITY]: 34,     // Rank 3: Spirited
    [WealthStatType.FORTITUDE]: 92,    // Rank 4: Resilient
  };

  const wealthStatEvents: WealthStatEventRecord[] = [
    {
      id: 'wse-1',
      statType: WealthStatType.INSIGHT,
      deltaPoints: 12,
      reason: 'Logged Market Investment (Wealthsimple TFSA — XEQT ETF)',
      createdAt: makeIso(-1, 10, 16),
      previousRank: 6,
      newRank: 6,
      newTitle: 'Visionary',
    },
    {
      id: 'wse-2',
      statType: WealthStatType.KINDNESS,
      deltaPoints: 14,
      reason: 'Generosity: Logged charity/gift (Daily Bread Food Bank Toronto)',
      createdAt: makeIso(-1, 14, 11),
      previousRank: 2,
      newRank: 3,
      newTitle: 'Helpful',
    },
    {
      id: 'wse-3',
      statType: WealthStatType.VITALITY,
      deltaPoints: 10,
      reason: 'Balanced joy: Logged Entertainment within monthly cap',
      createdAt: makeIso(-1, 20, 5),
      previousRank: 2,
      newRank: 3,
      newTitle: 'Spirited',
    },
  ];

  return {
    user,
    categoryBudgets,
    recurringTemplates,
    transactions,
    transitLogs,
    transitPatterns,
    wealthStatPoints,
    wealthStatEvents,
  };
}
