import Decimal from 'decimal.js';
import {
  BudgetCategory,
  BudgetMode,
  CategoryBudgetItem,
  RecurringFrequency,
  RecurringTemplateItem,
  SalaryType,
  TransactionRecord,
  TransactionType,
} from '../types/domain';

Decimal.set({ precision: 24, rounding: Decimal.ROUND_HALF_UP });

export const ALL_BUDGET_CATEGORIES: readonly BudgetCategory[] = [
  BudgetCategory.RENT,
  BudgetCategory.GROCERIES,
  BudgetCategory.DINING,
  BudgetCategory.ENTERTAINMENT,
  BudgetCategory.STUDENT_LOAN,
  BudgetCategory.SUBSCRIPTIONS,
  BudgetCategory.SHOPPING,
  BudgetCategory.BUSINESS,
  BudgetCategory.TRANSIT,
  BudgetCategory.INVESTMENT,
  BudgetCategory.MISCELLANEOUS,
] as const;

export const CATEGORY_METADATA: Record<
  BudgetCategory,
  { label: string; colorHex: string; isFixedRecurringCandidate: boolean }
> = {
  [BudgetCategory.RENT]: { label: 'Rent', colorHex: '#60A5FA', isFixedRecurringCandidate: true },
  [BudgetCategory.GROCERIES]: { label: 'Groceries', colorHex: '#34D399', isFixedRecurringCandidate: false },
  [BudgetCategory.DINING]: { label: 'Dining', colorHex: '#FBBF24', isFixedRecurringCandidate: false },
  [BudgetCategory.ENTERTAINMENT]: { label: 'Entertainment', colorHex: '#A78BFA', isFixedRecurringCandidate: false },
  [BudgetCategory.STUDENT_LOAN]: { label: 'Student Loan', colorHex: '#FB923C', isFixedRecurringCandidate: true },
  [BudgetCategory.SUBSCRIPTIONS]: { label: 'Subscriptions', colorHex: '#38BDF8', isFixedRecurringCandidate: true },
  [BudgetCategory.SHOPPING]: { label: 'Shopping', colorHex: '#F472B6', isFixedRecurringCandidate: false },
  [BudgetCategory.BUSINESS]: { label: 'Business', colorHex: '#94A3B8', isFixedRecurringCandidate: false },
  [BudgetCategory.TRANSIT]: { label: 'Transit', colorHex: '#2DD4BF', isFixedRecurringCandidate: true },
  [BudgetCategory.INVESTMENT]: { label: 'Investment', colorHex: '#E5B84B', isFixedRecurringCandidate: false },
  [BudgetCategory.MISCELLANEOUS]: { label: 'Miscellaneous', colorHex: '#CBD5E1', isFixedRecurringCandidate: false },
};

/**
 * Converts a dollar string (e.g. "1250.50") to exact integer cents using Decimal.js.
 */
export function dollarsToCents(dollars: string | number): number {
  const clean = typeof dollars === 'string' ? dollars.replace(/[^0-9.-]/g, '') : String(dollars);
  if (!clean || isNaN(Number(clean))) return 0;
  return new Decimal(clean).times(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
}

/**
 * Converts integer cents to formatted dollar string ("1,250.50" or "$1,250.50").
 */
export function centsToDollars(cents: number, includeSymbol = true): string {
  const dec = new Decimal(cents).dividedBy(100);
  const isNeg = dec.isNegative();
  const absFixed = dec.abs().toFixed(2);
  const [whole, frac] = absFixed.split('.');
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const sign = isNeg ? '-' : '';
  const symbol = includeSymbol ? '$' : '';
  return `${sign}${symbol}${withCommas}.${frac}`;
}

export interface NormalizedSalaryMetrics {
  grossMonthlyCents: number;
  netMonthlyCents: number;
  netDailyCents: number;
  effectiveAnnualCents: number;
}

/**
 * Normalizes Hourly (with weeklyHours), Monthly, or Annual salary into exact integer-cent figures.
 * Applies a realistic Ontario/Canadian composite payroll deduction factor (~22% effective tax/CPP/EI)
 * to derive net take-home figures alongside gross figures.
 */
export function normalizeSalary(
  salaryType: SalaryType,
  salaryAmountCents: number,
  weeklyHours: number,
  daysInMonth = 30
): NormalizedSalaryMetrics {
  const baseAmt = new Decimal(Math.max(0, salaryAmountCents));
  const hours = new Decimal(Math.max(0, weeklyHours));
  let grossAnnualCents = new Decimal(0);

  if (salaryType === SalaryType.HOURLY) {
    // 52 weeks per year
    grossAnnualCents = baseAmt.times(hours).times(52);
  } else if (salaryType === SalaryType.MONTHLY) {
    grossAnnualCents = baseAmt.times(12);
  } else {
    grossAnnualCents = baseAmt;
  }

  const grossMonthlyCents = grossAnnualCents.dividedBy(12).toDecimalPlaces(0);
  // Net take-home multiplier (0.78 after composite tax/CPP/EI)
  const netMonthlyCents = grossMonthlyCents.times(new Decimal('0.78')).toDecimalPlaces(0);
  const netDailyCents = netMonthlyCents.dividedBy(Math.max(1, daysInMonth)).toDecimalPlaces(0);

  return {
    grossMonthlyCents: grossMonthlyCents.toNumber(),
    netMonthlyCents: netMonthlyCents.toNumber(),
    netDailyCents: netDailyCents.toNumber(),
    effectiveAnnualCents: grossAnnualCents.toDecimalPlaces(0).toNumber(),
  };
}

export interface CategoryBurnSummary {
  category: BudgetCategory;
  label: string;
  colorHex: string;
  /** null means uncapped bookkeeping-only */
  monthlyLimitCents: number | null;
  spentCents: number;
  remainingCents: number | null;
  utilizationRatio: number | null;
  isOverCap: boolean;
  isCapped: boolean;
}

export interface BudgetSummaryResult {
  effectiveMonthlyPoolCents: number;
  sumOfCappedCategoriesCents: number;
  fixedRecurringObligationsCents: number;
  unpaidRecurringObligationsCents: number;
  monthToDateDiscretionarySpendCents: number;
  monthToDateTotalSpendCents: number;
  monthToDateIncomeAndReturnsCents: number;
  remainingAllowableMonthCents: number;
  allowableDailySpendCents: number;
  allowableWeeklySpendCents: number;
  todaySpendCents: number;
  remainingTodayAllowableCents: number;
  isOverDailyAllowable: boolean;
  remainingDaysInMonth: number;
  remainingWeeksInMonth: number;
  categoryBreakdown: CategoryBurnSummary[];
}

/**
 * Normalizes a recurring template's amount into its monthly equivalent in cents.
 */
export function normalizeRecurringMonthlyCents(item: RecurringTemplateItem): Decimal {
  if (!item.active) return new Decimal(0);
  const amt = new Decimal(item.amountCents);
  switch (item.frequency) {
    case RecurringFrequency.WEEKLY:
      return amt.times(52).dividedBy(12);
    case RecurringFrequency.BIWEEKLY:
      return amt.times(26).dividedBy(12);
    case RecurringFrequency.ANNUAL:
      return amt.dividedBy(12);
    case RecurringFrequency.MONTHLY:
    default:
      return amt;
  }
}

/**
 * Core Budgeting & Allowable Spend Calculator.
 * Handles nullable category limits (uncapped bookkeeping vs. capped tracking),
 * recurring obligations, and remaining Daily / Weekly allowable spend math:
 * (Total Budget or Sum of Capped Budgets - Fixed Recurring Obligations - Month-to-Date Spend) / Remaining Days or Weeks in Month
 */
export function calculateBudgetSummary(params: {
  budgetMode: BudgetMode;
  totalMonthlyBudgetCents: number | null;
  categoryBudgets: CategoryBudgetItem[];
  recurringTemplates: RecurringTemplateItem[];
  transactions: TransactionRecord[];
  referenceDate: Date;
}): BudgetSummaryResult {
  const {
    budgetMode,
    totalMonthlyBudgetCents,
    categoryBudgets,
    recurringTemplates,
    transactions,
    referenceDate,
  } = params;

  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const currentDay = referenceDate.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Inclusive of today
  const remainingDaysInMonth = Math.max(1, daysInMonth - currentDay + 1);
  const remainingWeeksInMonth = new Decimal(remainingDaysInMonth).dividedBy(7).toNumber();

  // Filter current month active transactions (excluding future-dated planned expenses after this month)
  const currentMonthTransactions = transactions.filter((tx) => {
    if (tx.isPlannedFuture) return false;
    const d = new Date(tx.occurredAt);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  // Sum of capped category budgets
  let sumOfCapped = new Decimal(0);
  const budgetMap = new Map<BudgetCategory, number | null>();
  for (const cat of ALL_BUDGET_CATEGORIES) {
    budgetMap.set(cat, null);
  }
  for (const cb of categoryBudgets) {
    budgetMap.set(cb.category, cb.monthlyLimitCents);
    if (cb.monthlyLimitCents !== null && cb.monthlyLimitCents > 0) {
      sumOfCapped = sumOfCapped.plus(cb.monthlyLimitCents);
    }
  }

  // Determine overarching Effective Monthly Pool
  let effectivePool = new Decimal(0);
  if (budgetMode === BudgetMode.TOTAL_ONLY && totalMonthlyBudgetCents !== null) {
    effectivePool = new Decimal(totalMonthlyBudgetCents);
  } else if (budgetMode === BudgetMode.CATEGORY_ONLY) {
    effectivePool = sumOfCapped;
  } else {
    // HYBRID mode: use totalMonthlyBudgetCents if set & greater than 0, otherwise sumOfCapped
    if (totalMonthlyBudgetCents !== null && totalMonthlyBudgetCents > 0) {
      effectivePool = Decimal.max(new Decimal(totalMonthlyBudgetCents), sumOfCapped);
    } else {
      effectivePool = sumOfCapped;
    }
  }

  // Calculate Fixed Recurring Obligations
  let fixedRecurringTotal = new Decimal(0);
  for (const rt of recurringTemplates) {
    fixedRecurringTotal = fixedRecurringTotal.plus(normalizeRecurringMonthlyCents(rt));
  }

  // Calculate Month-to-Date spend by category and today's spend
  const spentByCategory = new Map<BudgetCategory, Decimal>();
  for (const cat of ALL_BUDGET_CATEGORIES) {
    spentByCategory.set(cat, new Decimal(0));
  }

  let mtdTotalSpend = new Decimal(0);
  let mtdRecurringLoggedSpend = new Decimal(0);
  let mtdIncomeAndReturns = new Decimal(0);
  let todaySpend = new Decimal(0);

  for (const tx of currentMonthTransactions) {
    const amt = new Decimal(tx.amountCents);
    const txDate = new Date(tx.occurredAt);
    const isToday =
      txDate.getFullYear() === year &&
      txDate.getMonth() === month &&
      txDate.getDate() === currentDay;

    if (tx.type === TransactionType.EXPENSE) {
      mtdTotalSpend = mtdTotalSpend.plus(amt);
      const prevCat = spentByCategory.get(tx.category) ?? new Decimal(0);
      spentByCategory.set(tx.category, prevCat.plus(amt));

      if (tx.isRecurringInstance) {
        mtdRecurringLoggedSpend = mtdRecurringLoggedSpend.plus(amt);
      } else if (isToday) {
        todaySpend = todaySpend.plus(amt);
      }
    } else {
      mtdIncomeAndReturns = mtdIncomeAndReturns.plus(amt);
    }
  }

  // Unpaid recurring obligations still ahead this month (so we don't double-subtract already-logged recurring bills)
  const unpaidRecurringObligations = Decimal.max(0, fixedRecurringTotal.minus(mtdRecurringLoggedSpend));

  // Formula: (Total Budget or Sum of Capped Budgets - Fixed Recurring Obligations - Month-to-Date Discretionary Spend)
  // Which is mathematically equivalent to: effectivePool - unpaidRecurringObligations - mtdTotalSpend
  const mtdDiscretionarySpend = Decimal.max(0, mtdTotalSpend.minus(mtdRecurringLoggedSpend));
  const remainingAllowableMonth = Decimal.max(
    0,
    effectivePool.minus(fixedRecurringTotal).minus(mtdDiscretionarySpend)
  );

  const allowableDailySpend = remainingAllowableMonth
    .dividedBy(remainingDaysInMonth)
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP);

  const effectiveWeeksDivisor = Decimal.max(new Decimal(1), new Decimal(remainingDaysInMonth).dividedBy(7));
  const allowableWeeklySpend = remainingAllowableMonth
    .dividedBy(effectiveWeeksDivisor)
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP);

  const remainingTodayAllowable = allowableDailySpend.minus(todaySpend);

  const categoryBreakdown: CategoryBurnSummary[] = ALL_BUDGET_CATEGORIES.map((category) => {
    const meta = CATEGORY_METADATA[category];
    const limitCents = budgetMap.get(category) ?? null;
    const spentDec = spentByCategory.get(category) ?? new Decimal(0);
    const spentCents = spentDec.toDecimalPlaces(0).toNumber();

    if (limitCents === null) {
      return {
        category,
        label: meta.label,
        colorHex: meta.colorHex,
        monthlyLimitCents: null,
        spentCents,
        remainingCents: null,
        utilizationRatio: null,
        isOverCap: false,
        isCapped: false,
      };
    }

    const limitDec = new Decimal(limitCents);
    const remainingDec = limitDec.minus(spentDec);
    const utilizationRatio = limitCents > 0 ? spentDec.dividedBy(limitDec).toNumber() : 0;

    return {
      category,
      label: meta.label,
      colorHex: meta.colorHex,
      monthlyLimitCents: limitCents,
      spentCents,
      remainingCents: remainingDec.toDecimalPlaces(0).toNumber(),
      utilizationRatio,
      isOverCap: remainingDec.isNegative(),
      isCapped: true,
    };
  });

  return {
    effectiveMonthlyPoolCents: effectivePool.toDecimalPlaces(0).toNumber(),
    sumOfCappedCategoriesCents: sumOfCapped.toDecimalPlaces(0).toNumber(),
    fixedRecurringObligationsCents: fixedRecurringTotal.toDecimalPlaces(0).toNumber(),
    unpaidRecurringObligationsCents: unpaidRecurringObligations.toDecimalPlaces(0).toNumber(),
    monthToDateDiscretionarySpendCents: mtdDiscretionarySpend.toDecimalPlaces(0).toNumber(),
    monthToDateTotalSpendCents: mtdTotalSpend.toDecimalPlaces(0).toNumber(),
    monthToDateIncomeAndReturnsCents: mtdIncomeAndReturns.toDecimalPlaces(0).toNumber(),
    remainingAllowableMonthCents: remainingAllowableMonth.toDecimalPlaces(0).toNumber(),
    allowableDailySpendCents: allowableDailySpend.toNumber(),
    allowableWeeklySpendCents: allowableWeeklySpend.toNumber(),
    todaySpendCents: todaySpend.toDecimalPlaces(0).toNumber(),
    remainingTodayAllowableCents: remainingTodayAllowable.toDecimalPlaces(0).toNumber(),
    isOverDailyAllowable: remainingTodayAllowable.isNegative(),
    remainingDaysInMonth,
    remainingWeeksInMonth: Number(remainingWeeksInMonth.toFixed(1)),
    categoryBreakdown,
  };
}
