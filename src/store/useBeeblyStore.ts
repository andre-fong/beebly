import { create } from 'zustand';
import {
  BudgetCategory,
  BudgetMode,
  CatCutInType,
  CatExpression,
  CatSoundCategory,
  CategoryBudgetItem,
  DialogueTriggerSource,
  LegacySheetMapping,
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
} from '../types/domain';
import { AppCameraRoute } from '../lib/motion-configs';
import { createInitialSeedState } from '../../prisma/seed';
import {
  calculateBudgetSummary,
  dollarsToCents,
  normalizeSalary,
} from '../lib/budget-calculator';
import {
  calculateRankFromPoints,
  evaluateEodCompletionAwards,
  evaluateTransactionStatAwards,
  getRankTitle,
  StatAwardCandidate,
} from '../lib/wealth-stats';
import {
  getTimeSlotFromDate,
  upsertTransitPatternList,
} from '../lib/transit-engine';
import { useCompanionStore } from './useCompanionStore';
import { soundEngine } from '../lib/cat-audio';

const STORAGE_KEY = 'beebly_persistent_state_v1';

interface BeeblyAppState {
  activeRoute: AppCameraRoute;
  isWelcomeCalendarOpen: boolean;
  isOnboardingOpen: boolean;
  onboardingStep: 0 | 1 | 2 | 3;
  isWealthModalOpen: boolean;
  queuedStatAwards: WealthStatEventRecord[];

  user: UserProfile;
  categoryBudgets: CategoryBudgetItem[];
  recurringTemplates: RecurringTemplateItem[];
  transactions: TransactionRecord[];
  transitLogs: TransitLogRecord[];
  transitPatterns: TransitPatternRecord[];
  wealthStatPoints: Record<WealthStatType, number>;
  wealthStatEvents: WealthStatEventRecord[];

  setActiveRoute: (route: AppCameraRoute) => void;
  completeWelcomeCalendar: () => void;
  reopenWelcomeCalendar: () => void;
  openOnboarding: (step?: 0 | 1 | 2 | 3) => void;
  setOnboardingStep: (step: 0 | 1 | 2 | 3) => void;
  completeOnboarding: () => void;
  openWealthModal: () => void;
  closeWealthModal: () => void;
  clearQueuedStatAwards: () => void;

  updateUserProfile: (patch: Partial<UserProfile>) => void;
  updateSalaryConfig: (salaryType: SalaryType, salaryAmountCents: number, weeklyHours: number) => void;
  updateBudgetModeConfig: (budgetMode: BudgetMode, totalMonthlyBudgetCents: number | null) => void;
  setCategoryMonthlyLimit: (category: BudgetCategory, monthlyLimitCents: number | null) => void;
  toggleRecurringTemplate: (id: string) => void;
  addRecurringTemplate: (item: Omit<RecurringTemplateItem, 'id'>) => void;

  logTransaction: (
    tx: Omit<TransactionRecord, 'id' | 'syncedToSheets'>,
    options?: { triggerWalletDrop?: boolean }
  ) => WealthStatEventRecord[];

  logTransitCommute: (params: {
    agency: TransitAgency;
    originStop: string;
    destinationStop: string;
    calculatedFareCents: number;
    actualFareCents: number;
    wasPredicted: boolean;
    oneFareApplied: boolean;
  }) => void;

  completeEodReview: () => WealthStatEventRecord[];
  applyLegacySheetImport: (mapping: LegacySheetMapping, sheetId?: string) => void;
  markAllTransactionsSynced: (sheetId: string, sheetName: string) => void;
  awardWealthStatPoints: (
    candidates: StatAwardCandidate[],
    triggerWalletDrop?: boolean
  ) => WealthStatEventRecord[];
}

function loadPersistedOrSeed() {
  const seed = createInitialSeedState(new Date());
  if (typeof window === 'undefined') {
    return {
      ...seed,
      shouldShowWelcome: true,
    };
  }

  const params = new URLSearchParams(window.location.search);
  const autostart = params.get('autostart') === '1';

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        user: { ...seed.user, ...parsed.user },
        categoryBudgets: parsed.categoryBudgets ?? seed.categoryBudgets,
        recurringTemplates: parsed.recurringTemplates ?? seed.recurringTemplates,
        transactions: parsed.transactions ?? seed.transactions,
        transitLogs: parsed.transitLogs ?? seed.transitLogs,
        transitPatterns: parsed.transitPatterns ?? seed.transitPatterns,
        wealthStatPoints: parsed.wealthStatPoints ?? seed.wealthStatPoints,
        wealthStatEvents: parsed.wealthStatEvents ?? seed.wealthStatEvents,
        shouldShowWelcome: !autostart,
      };
    }
  } catch {
    // Fallback to seed
  }

  return {
    ...seed,
    shouldShowWelcome: !autostart,
  };
}

function saveToStorage(state: Partial<BeeblyAppState>) {
  if (typeof window === 'undefined') return;
  try {
    const payload = {
      user: state.user,
      categoryBudgets: state.categoryBudgets,
      recurringTemplates: state.recurringTemplates,
      transactions: state.transactions,
      transitLogs: state.transitLogs,
      transitPatterns: state.transitPatterns,
      wealthStatPoints: state.wealthStatPoints,
      wealthStatEvents: state.wealthStatEvents,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota errors
  }
}

const initial = loadPersistedOrSeed();

export const useBeeblyStore = create<BeeblyAppState>((set, get) => ({
  activeRoute: 'dashboard',
  isWelcomeCalendarOpen: initial.shouldShowWelcome,
  isOnboardingOpen: false,
  onboardingStep: 0,
  isWealthModalOpen: false,
  queuedStatAwards: [],

  user: initial.user,
  categoryBudgets: initial.categoryBudgets,
  recurringTemplates: initial.recurringTemplates,
  transactions: initial.transactions,
  transitLogs: initial.transitLogs,
  transitPatterns: initial.transitPatterns,
  wealthStatPoints: initial.wealthStatPoints,
  wealthStatEvents: initial.wealthStatEvents,

  setActiveRoute: (route) => {
    set({ activeRoute: route });
    const companion = useCompanionStore.getState();
    if (route === 'eod') {
      companion.reactSilently(CatExpression.CURIOUS, CatSoundCategory.TRILL, 1.05, {
        type: CatCutInType.FOCUSED,
        subtitle: 'END OF DAY ACCOUNTABILITY AUDIT',
      });
    } else if (route === 'wealth-stats') {
      companion.reactSilently(CatExpression.EXCITED, CatSoundCategory.PURR, 1.0);
    } else if (route === 'transit') {
      companion.reactSilently(CatExpression.CURIOUS, CatSoundCategory.MEOW, 1.08);
    } else {
      companion.reactSilently(CatExpression.NEUTRAL);
    }
  },

  completeWelcomeCalendar: () => {
    const todayKey = new Date().toISOString().slice(0, 10);
    soundEngine.playCoinClink(1.15);
    set((state) => {
      const updatedUser = { ...state.user, lastWelcomeCalendarDate: todayKey };
      const next = { ...state, isWelcomeCalendarOpen: false, user: updatedUser };
      saveToStorage(next);
      return { isWelcomeCalendarOpen: false, user: updatedUser };
    });
  },

  reopenWelcomeCalendar: () => {
    set({ isWelcomeCalendarOpen: true });
  },

  openOnboarding: (step = 0) => {
    set({ isOnboardingOpen: true, onboardingStep: step });
    const messages: Record<number, string> = {
      0: "Welcome to beebly! I'm Mochi, your pocket ledger guide. First, how should I address you on your royal ledger?",
      1: 'Configure your compensation and monthly caps. Leave any category uncapped if you only want pure bookkeeping!',
      2: 'Log daily expenses, PRESTO transit commutes, or Apple/Google Wallet screenshots in seconds.',
      3: 'Every wise financial choice awards gleaming coins toward your 6 Royal Wealth Virtues!',
    };
    useCompanionStore
      .getState()
      .speakPermittedDialogue(
        DialogueTriggerSource.ONBOARDING,
        messages[step],
        CatExpression.EXCITED,
        CatSoundCategory.TRILL
      );
  },

  setOnboardingStep: (step) => {
    set({ onboardingStep: step });
    const messages: Record<number, string> = {
      0: "Welcome to beebly! I'm Mochi, your pocket ledger guide. First, how should I address you on your royal ledger?",
      1: 'Configure your compensation and monthly caps. Leave any category uncapped if you only want pure bookkeeping!',
      2: 'Log daily expenses, PRESTO transit commutes, or Apple/Google Wallet screenshots in seconds.',
      3: 'Every wise financial choice awards gleaming coins toward your 6 Royal Wealth Virtues!',
    };
    useCompanionStore
      .getState()
      .speakPermittedDialogue(
        DialogueTriggerSource.ONBOARDING,
        messages[step],
        step === 3 ? CatExpression.EXCITED : CatExpression.SMILE,
        CatSoundCategory.MEOW
      );
  },

  completeOnboarding: () => {
    useCompanionStore.getState().dismissDialogue();
    useCompanionStore.getState().reactSilently(CatExpression.SMILE, CatSoundCategory.PURR);
    set((state) => {
      const updatedUser: UserProfile = {
        ...state.user,
        onboardingState: {
          name: true,
          budgeting: true,
          logging: true,
          wealthStats: true,
          completed: true,
        },
      };
      const next = { ...state, isOnboardingOpen: false, user: updatedUser };
      saveToStorage(next);
      return { isOnboardingOpen: false, user: updatedUser };
    });
  },

  openWealthModal: () => {
    soundEngine.playCoinClink(0.95);
    set({ isWealthModalOpen: true });
  },

  closeWealthModal: () => {
    set({ isWealthModalOpen: false, queuedStatAwards: [] });
  },

  clearQueuedStatAwards: () => set({ queuedStatAwards: [] }),

  updateUserProfile: (patch) => {
    set((state) => {
      const updatedUser = { ...state.user, ...patch };
      const next = { ...state, user: updatedUser };
      saveToStorage(next);
      return { user: updatedUser };
    });
  },

  updateSalaryConfig: (salaryType, salaryAmountCents, weeklyHours) => {
    useCompanionStore.getState().reactSilently(CatExpression.SMILE, CatSoundCategory.PURR);
    set((state) => {
      const updatedUser: UserProfile = {
        ...state.user,
        salaryType,
        salaryAmountCents,
        weeklyHours,
      };
      const next = { ...state, user: updatedUser };
      saveToStorage(next);
      return { user: updatedUser };
    });
  },

  updateBudgetModeConfig: (budgetMode, totalMonthlyBudgetCents) => {
    useCompanionStore.getState().reactSilently(CatExpression.CURIOUS, CatSoundCategory.TRILL);
    set((state) => {
      const updatedUser: UserProfile = {
        ...state.user,
        budgetMode,
        totalMonthlyBudgetCents,
      };
      const next = { ...state, user: updatedUser };
      saveToStorage(next);
      return { user: updatedUser };
    });
  },

  setCategoryMonthlyLimit: (category, monthlyLimitCents) => {
    useCompanionStore.getState().reactSilently(CatExpression.SMILE, CatSoundCategory.MEOW, 1.05);
    set((state) => {
      const updated = state.categoryBudgets.map((cb) =>
        cb.category === category ? { ...cb, monthlyLimitCents } : cb
      );
      const next = { ...state, categoryBudgets: updated };
      saveToStorage(next);
      return { categoryBudgets: updated };
    });
  },

  toggleRecurringTemplate: (id) => {
    useCompanionStore.getState().reactSilently(CatExpression.CURIOUS, CatSoundCategory.TRILL);
    set((state) => {
      const updated = state.recurringTemplates.map((rt) =>
        rt.id === id ? { ...rt, active: !rt.active } : rt
      );
      const next = { ...state, recurringTemplates: updated };
      saveToStorage(next);
      return { recurringTemplates: updated };
    });
  },

  addRecurringTemplate: (item) => {
    useCompanionStore.getState().reactSilently(CatExpression.SMILE, CatSoundCategory.PURR);
    set((state) => {
      const newRec: RecurringTemplateItem = {
        ...item,
        id: `rec-${Date.now()}`,
      };
      const updated = [newRec, ...state.recurringTemplates];
      const next = { ...state, recurringTemplates: updated };
      saveToStorage(next);
      return { recurringTemplates: updated };
    });
  },

  awardWealthStatPoints: (candidates, triggerWalletDrop = true) => {
    if (candidates.length === 0) return [];
    const state = get();
    const updatedPoints = { ...state.wealthStatPoints };
    const createdEvents: WealthStatEventRecord[] = [];
    let anyRankUp = false;

    for (const c of candidates) {
      const prevPts = updatedPoints[c.statType] ?? 0;
      const prevRank = calculateRankFromPoints(prevPts);
      const nextPts = prevPts + c.deltaPoints;
      const nextRank = calculateRankFromPoints(nextPts);
      updatedPoints[c.statType] = nextPts;

      if (nextRank > prevRank) {
        anyRankUp = true;
      }

      createdEvents.push({
        id: `wse-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        statType: c.statType,
        deltaPoints: c.deltaPoints,
        reason: c.reason,
        createdAt: new Date().toISOString(),
        previousRank: prevRank,
        newRank: nextRank,
        newTitle: getRankTitle(c.statType, nextRank),
      });
    }

    soundEngine.playCoinClink(anyRankUp ? 1.25 : 1.0);

    if (anyRankUp) {
      useCompanionStore
        .getState()
        .reactSilently(CatExpression.EXCITED, CatSoundCategory.TRILL, 1.2, {
          type: CatCutInType.SURPRISED,
          subtitle: 'ROYAL VIRTUE RANK ASCENSION!',
        });
    }

    set((curr) => {
      const nextEvents = [...createdEvents, ...curr.wealthStatEvents];
      const nextState = {
        ...curr,
        wealthStatPoints: updatedPoints,
        wealthStatEvents: nextEvents,
        queuedStatAwards: [...curr.queuedStatAwards, ...createdEvents],
        isWealthModalOpen: triggerWalletDrop ? true : curr.isWealthModalOpen,
      };
      saveToStorage(nextState);
      return {
        wealthStatPoints: updatedPoints,
        wealthStatEvents: nextEvents,
        queuedStatAwards: nextState.queuedStatAwards,
        isWealthModalOpen: nextState.isWealthModalOpen,
      };
    });

    return createdEvents;
  },

  logTransaction: (txInput, options = { triggerWalletDrop: false }) => {
    const state = get();
    const newTx: TransactionRecord = {
      ...txInput,
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      syncedToSheets: false,
    };

    const updatedTransactions = [newTx, ...state.transactions];
    const summary = calculateBudgetSummary({
      budgetMode: state.user.budgetMode,
      totalMonthlyBudgetCents: state.user.totalMonthlyBudgetCents,
      categoryBudgets: state.categoryBudgets,
      recurringTemplates: state.recurringTemplates,
      transactions: updatedTransactions,
      referenceDate: new Date(),
    });

    const salaryNorm = normalizeSalary(
      state.user.salaryType,
      state.user.salaryAmountCents,
      state.user.weeklyHours
    );

    const entCat = summary.categoryBreakdown.find(
      (c) => c.category === BudgetCategory.ENTERTAINMENT
    );
    const isEntertainmentWithinCap = entCat ? !entCat.isOverCap : true;

    const candidates = evaluateTransactionStatAwards({
      transaction: newTx,
      isCurrentlyOverDailyAllowable: summary.isOverDailyAllowable,
      isEntertainmentWithinCap,
      netMonthlySalaryCents: salaryNorm.netMonthlyCents,
      monthToDateExpensesCents: summary.monthToDateTotalSpendCents,
      underBudgetStreakDays: state.user.underBudgetStreakDays,
    });

    // Silent reactive expression for routine transaction logging (NO verbal text bubble!)
    const companion = useCompanionStore.getState();
    if (
      newTx.category === BudgetCategory.INVESTMENT ||
      newTx.subType === TransactionSubType.CHARITY_GIFT
    ) {
      companion.reactSilently(CatExpression.EXCITED, CatSoundCategory.TRILL, 1.15);
    } else if (newTx.type === TransactionType.EXPENSE && newTx.amountCents >= 15000) {
      companion.reactSilently(CatExpression.SHOCKED, CatSoundCategory.MEOW, 0.85, {
        type: CatCutInType.SURPRISED,
        subtitle: 'HIGH-IMPACT OUTFLOW DETECTED!',
      });
    } else if (summary.isOverDailyAllowable) {
      companion.reactSilently(CatExpression.SAD, CatSoundCategory.MEOW, 0.9);
    } else {
      companion.reactSilently(CatExpression.SMILE, CatSoundCategory.PURR, 1.0);
    }

    set((curr) => {
      const next = { ...curr, transactions: updatedTransactions };
      saveToStorage(next);
      return { transactions: updatedTransactions };
    });

    return get().awardWealthStatPoints(candidates, options.triggerWalletDrop ?? false);
  },

  logTransitCommute: (params) => {
    const now = new Date();
    const newLog: TransitLogRecord = {
      id: `tlog-${Date.now()}`,
      agency: params.agency,
      originStop: params.originStop,
      destinationStop: params.destinationStop,
      calculatedFareCents: params.calculatedFareCents,
      actualFareCents: params.actualFareCents,
      dayOfWeek: now.getDay(),
      timeSlot: getTimeSlotFromDate(now),
      wasPredicted: params.wasPredicted,
      oneFareApplied: params.oneFareApplied,
      occurredAt: now.toISOString(),
    };

    const agencyLabel =
      params.agency === TransitAgency.GO_TRANSIT
        ? 'GO Transit'
        : params.agency === TransitAgency.TTC_SUBWAY
        ? 'TTC Subway'
        : 'TTC Bus';

    set((state) => {
      const updatedLogs = [newLog, ...state.transitLogs];
      const updatedPatterns = upsertTransitPatternList(state.transitPatterns, newLog);
      const next = {
        ...state,
        transitLogs: updatedLogs,
        transitPatterns: updatedPatterns,
      };
      saveToStorage(next);
      return {
        transitLogs: updatedLogs,
        transitPatterns: updatedPatterns,
      };
    });

    // Also record as a TRANSIT expense in the main transaction ledger
    get().logTransaction(
      {
        type: TransactionType.EXPENSE,
        category: BudgetCategory.TRANSIT,
        subType: TransactionSubType.STANDARD,
        amountCents: params.actualFareCents,
        occurredAt: now.toISOString(),
        isPlannedFuture: false,
        isRecurringInstance: false,
        merchant: `PRESTO ${agencyLabel}: ${params.originStop} → ${params.destinationStop}`,
        notes: params.oneFareApplied
          ? 'Ontario One Fare transfer applied'
          : params.wasPredicted
          ? 'Auto-predicted commute'
          : 'Manual station-to-station log',
        retainedIncome: true,
      },
      { triggerWalletDrop: false }
    );
  },

  completeEodReview: () => {
    const state = get();
    const summary = calculateBudgetSummary({
      budgetMode: state.user.budgetMode,
      totalMonthlyBudgetCents: state.user.totalMonthlyBudgetCents,
      categoryBudgets: state.categoryBudgets,
      recurringTemplates: state.recurringTemplates,
      transactions: state.transactions,
      referenceDate: new Date(),
    });

    const salaryNorm = normalizeSalary(
      state.user.salaryType,
      state.user.salaryAmountCents,
      state.user.weeklyHours
    );

    const awards = evaluateEodCompletionAwards({
      underDailyAllowable: !summary.isOverDailyAllowable,
      netMonthlySalaryCents: salaryNorm.netMonthlyCents,
      monthToDateExpensesCents: summary.monthToDateTotalSpendCents,
      loggingStreakDays: state.user.loggingStreakDays,
    });

    set((curr) => {
      const updatedUser: UserProfile = {
        ...curr.user,
        loggingStreakDays: curr.user.loggingStreakDays + 1,
        underBudgetStreakDays: !summary.isOverDailyAllowable
          ? curr.user.underBudgetStreakDays + 1
          : curr.user.underBudgetStreakDays,
      };
      const next = { ...curr, user: updatedUser };
      saveToStorage(next);
      return { user: updatedUser };
    });

    const events = get().awardWealthStatPoints(awards, true);

    // Permitted EOD Review completion spoken dialogue!
    const eodAffirmation = !summary.isOverDailyAllowable
      ? `Purr-fect EOD audit! You stayed under your daily allowable spend and extended your streak to ${
          state.user.loggingStreakDays + 1
        } days. Your Discipline & Prosperity virtues shine brightly!`
      : `Honest logging on a heavy spend day takes true courage! You earned Fortitude & Discipline points for completing your EOD review without hiding from the numbers.`;

    useCompanionStore
      .getState()
      .speakPermittedDialogue(
        DialogueTriggerSource.EOD_REVIEW,
        eodAffirmation,
        !summary.isOverDailyAllowable ? CatExpression.EXCITED : CatExpression.SMILE,
        CatSoundCategory.PURR
      );

    return events;
  },

  applyLegacySheetImport: (mapping, sheetId) => {
    set((state) => {
      const updatedUser: UserProfile = {
        ...state.user,
        salaryType: mapping.detectedSalaryType ?? state.user.salaryType,
        salaryAmountCents: mapping.detectedSalaryDollars
          ? dollarsToCents(mapping.detectedSalaryDollars)
          : state.user.salaryAmountCents,
        totalMonthlyBudgetCents: mapping.detectedTotalMonthlyBudgetDollars
          ? dollarsToCents(mapping.detectedTotalMonthlyBudgetDollars)
          : state.user.totalMonthlyBudgetCents,
        googleSheetId: sheetId ?? state.user.googleSheetId,
        googleSheetName: mapping.detectedSheetTitle || state.user.googleSheetName,
      };

      const updatedCategoryBudgets = state.categoryBudgets.map((cb) => {
        const match = mapping.categoryBudgets.find((m) => m.category === cb.category);
        if (!match) return cb;
        return {
          ...cb,
          monthlyLimitCents:
            match.monthlyLimitDollars !== null ? dollarsToCents(match.monthlyLimitDollars) : null,
        };
      });

      const importedRecurring: RecurringTemplateItem[] = mapping.recurringBills.map((rb, idx) => ({
        id: `rec-imp-${Date.now()}-${idx}`,
        title: rb.title,
        category: rb.category,
        amountCents: dollarsToCents(rb.amountDollars),
        frequency: rb.frequency,
        nextDueDate: new Date().toISOString(),
        transitRouteId: null,
        active: true,
      }));

      const importedTx: TransactionRecord[] = mapping.transactions.map((t, idx) => ({
        id: `tx-imp-${Date.now()}-${idx}`,
        type: t.type,
        category: t.category,
        subType: TransactionSubType.STANDARD,
        amountCents: dollarsToCents(t.amountDollars),
        occurredAt: t.occurredAt || new Date().toISOString(),
        isPlannedFuture: false,
        isRecurringInstance: false,
        merchant: t.merchant,
        notes: `Imported from ${mapping.detectedSheetTitle}`,
        syncedToSheets: true,
        retainedIncome: true,
      }));

      const next = {
        ...state,
        user: updatedUser,
        categoryBudgets: updatedCategoryBudgets,
        recurringTemplates: [...importedRecurring, ...state.recurringTemplates],
        transactions: [...importedTx, ...state.transactions],
      };
      saveToStorage(next);
      return {
        user: updatedUser,
        categoryBudgets: updatedCategoryBudgets,
        recurringTemplates: next.recurringTemplates,
        transactions: next.transactions,
      };
    });

    useCompanionStore.getState().reactSilently(CatExpression.EXCITED, CatSoundCategory.TRILL, 1.15);
  },

  markAllTransactionsSynced: (sheetId, sheetName) => {
    set((state) => {
      const updatedTx = state.transactions.map((tx) => ({ ...tx, syncedToSheets: true }));
      const updatedUser: UserProfile = {
        ...state.user,
        googleSheetId: sheetId,
        googleSheetName: sheetName,
        googleSheetSyncEnabled: true,
      };
      const next = { ...state, user: updatedUser, transactions: updatedTx };
      saveToStorage(next);
      return { user: updatedUser, transactions: updatedTx };
    });
    useCompanionStore.getState().reactSilently(CatExpression.SMILE, CatSoundCategory.PURR);
  },
}));
