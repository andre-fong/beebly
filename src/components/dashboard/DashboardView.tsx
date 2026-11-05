import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Calendar,
  Check,
  Coins,
  Plus,
  RefreshCw,
  Sliders,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  BudgetCategory,
  BudgetMode,
  SalaryType,
  TransactionSubType,
  TransactionType,
} from '../../types/domain';
import {
  ALL_BUDGET_CATEGORIES,
  calculateBudgetSummary,
  CATEGORY_METADATA,
  centsToDollars,
  dollarsToCents,
  normalizeSalary,
} from '../../lib/budget-calculator';
import { buildWealthStatRecords, WEALTH_STAT_METADATA } from '../../lib/wealth-stats';
import { useBeeblyStore } from '../../store/useBeeblyStore';

export const DashboardView: React.FC = () => {
  const user = useBeeblyStore((s) => s.user);
  const categoryBudgets = useBeeblyStore((s) => s.categoryBudgets);
  const recurringTemplates = useBeeblyStore((s) => s.recurringTemplates);
  const transactions = useBeeblyStore((s) => s.transactions);
  const wealthStatPoints = useBeeblyStore((s) => s.wealthStatPoints);

  const logTransaction = useBeeblyStore((s) => s.logTransaction);
  const setCategoryMonthlyLimit = useBeeblyStore((s) => s.setCategoryMonthlyLimit);
  const updateSalaryConfig = useBeeblyStore((s) => s.updateSalaryConfig);
  const updateBudgetModeConfig = useBeeblyStore((s) => s.updateBudgetModeConfig);
  const toggleRecurringTemplate = useBeeblyStore((s) => s.toggleRecurringTemplate);
  const openWealthModal = useBeeblyStore((s) => s.openWealthModal);
  const reopenWelcomeCalendar = useBeeblyStore((s) => s.reopenWelcomeCalendar);

  // Quick Logger Form State
  const [txType, setTxType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [category, setCategory] = useState<BudgetCategory>(BudgetCategory.DINING);
  const [subType, setSubType] = useState<TransactionSubType>(TransactionSubType.STANDARD);
  const [merchant, setMerchant] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [isPlannedFuture, setIsPlannedFuture] = useState(false);
  const [retainedIncome, setRetainedIncome] = useState(true);
  const [triggerCeremonyOnLog, setTriggerCeremonyOnLog] = useState(false);

  // Salary & Budget Inline Editor State
  const [showSalaryEditor, setShowSalaryEditor] = useState(false);
  const [salaryTypeEdit, setSalaryTypeEdit] = useState<SalaryType>(user.salaryType);
  const [salaryDollarsEdit, setSalaryDollarsEdit] = useState(
    (user.salaryAmountCents / 100).toFixed(2)
  );
  const [weeklyHoursEdit, setWeeklyHoursEdit] = useState(String(user.weeklyHours));
  const [totalBudgetEdit, setTotalBudgetEdit] = useState(
    user.totalMonthlyBudgetCents ? (user.totalMonthlyBudgetCents / 100).toFixed(0) : '4200'
  );

  // Editing Category Cap
  const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(null);
  const [categoryCapInput, setCategoryCapInput] = useState('');

  const salaryMetrics = useMemo(
    () => normalizeSalary(user.salaryType, user.salaryAmountCents, user.weeklyHours),
    [user.salaryType, user.salaryAmountCents, user.weeklyHours]
  );

  const budgetSummary = useMemo(
    () =>
      calculateBudgetSummary({
        budgetMode: user.budgetMode,
        totalMonthlyBudgetCents: user.totalMonthlyBudgetCents,
        categoryBudgets,
        recurringTemplates,
        transactions,
        referenceDate: new Date(),
      }),
    [user.budgetMode, user.totalMonthlyBudgetCents, categoryBudgets, recurringTemplates, transactions]
  );

  const statRecords = useMemo(
    () => buildWealthStatRecords(wealthStatPoints),
    [wealthStatPoints]
  );

  const openOnboarding = useBeeblyStore((s) => s.openOnboarding);

  const handleLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountCents = dollarsToCents(amountInput);
    if (!merchant.trim() || amountCents <= 0) return;

    logTransaction(
      {
        type: txType,
        category,
        subType,
        amountCents,
        occurredAt: isPlannedFuture
          ? new Date(Date.now() + 5 * 86400000).toISOString()
          : new Date().toISOString(),
        isPlannedFuture,
        isRecurringInstance: false,
        merchant: merchant.trim(),
        notes: isPlannedFuture ? 'Planned future expense' : '',
        retainedIncome,
      },
      { triggerWalletDrop: triggerCeremonyOnLog }
    );

    setMerchant('');
    setAmountInput('');
    setIsPlannedFuture(false);
  };

  const handleSaveSalaryAndPool = (e: React.FormEvent) => {
    e.preventDefault();
    updateSalaryConfig(
      salaryTypeEdit,
      dollarsToCents(salaryDollarsEdit),
      Number(weeklyHoursEdit) || 40
    );
    updateBudgetModeConfig(
      user.budgetMode,
      totalBudgetEdit.trim() ? dollarsToCents(totalBudgetEdit) : null
    );
    setShowSalaryEditor(false);
  };

  return (
    <div className="space-y-6">
      {/* HERO: Allowable Daily & Weekly Spend (Date lives exclusively in Top-Right Header) */}
      <div className="rounded-3xl border border-[#E5B84B]/35 bg-[#121826]/95 p-6 shadow-2xl">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="flex items-start gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#94A3B8]">
                <span>Allowable Burn-Rate Engine</span>
                <span>·</span>
                <span className="font-mono tabular-nums text-[#E5B84B]">
                  {budgetSummary.remainingDaysInMonth} days left in month
                </span>
                <span>·</span>
                <span>
                  Net Take-Home {centsToDollars(salaryMetrics.netMonthlyCents)}/mo
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-baseline gap-6">
                <div>
                  <span className="block text-xs text-[#94A3B8]">
                    Allowable Daily Spend
                  </span>
                  <span
                    className="font-mono text-4xl font-extrabold tabular-nums text-[#F4F1EA] md:text-5xl"
                    style={{ fontFamily: 'Fraunces, serif' }}
                  >
                    {centsToDollars(budgetSummary.allowableDailySpendCents)}
                  </span>
                  <span className="ml-1.5 text-xs text-[#34D399]">/ day</span>
                </div>

                <div className="border-l border-slate-800 pl-6">
                  <span className="block text-xs text-[#94A3B8]">
                    Allowable Weekly Spend
                  </span>
                  <span
                    className="font-mono text-2xl font-bold tabular-nums text-[#E5B84B] md:text-3xl"
                    style={{ fontFamily: 'Fraunces, serif' }}
                  >
                    {centsToDollars(budgetSummary.allowableWeeklySpendCents)}
                  </span>
                  <span className="ml-1.5 text-xs text-[#94A3B8]">/ wk</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Summary Metrics & Salary Config Trigger */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-slate-800 bg-[#0B0F17] px-4 py-3">
              <div className="text-[11px] text-[#94A3B8]">Remaining Monthly Pool</div>
              <div className="font-mono text-lg font-bold tabular-nums text-[#34D399]">
                {centsToDollars(budgetSummary.remainingAllowableMonthCents)}
              </div>
              <div className="text-[11px] text-[#64748B]">
                After {centsToDollars(budgetSummary.fixedRecurringObligationsCents)} fixed bills
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSalaryEditor(!showSalaryEditor)}
              className="flex min-h-[44px] items-center gap-2 rounded-2xl border border-slate-700 bg-[#0B0F17] px-4 py-2.5 text-xs font-semibold text-[#F4F1EA] hover:border-[#E5B84B]"
            >
              <Sliders className="h-4 w-4 text-[#E5B84B]" />
              <span>Configure Salary &amp; Mode</span>
            </button>

            <button
              type="button"
              onClick={() => openOnboarding(0)}
              className="flex min-h-[44px] items-center gap-2 rounded-2xl bg-[#E5B84B] px-4 py-2.5 text-xs font-bold text-[#0B0F17] hover:bg-[#f0c75e]"
            >
              <span>Setup Wizard</span>
            </button>
          </div>
        </div>

        {/* Collapsible Salary & Budget Mode Configurator */}
        {showSalaryEditor && (
          <form
            onSubmit={handleSaveSalaryAndPool}
            className="mt-5 grid grid-cols-1 gap-4 rounded-2xl border border-slate-800 bg-[#0B0F17] p-4 sm:grid-cols-4"
          >
            <label className="block text-xs font-medium text-[#CBD5E1]">
              Salary Type
              <select
                value={salaryTypeEdit}
                onChange={(e) => setSalaryTypeEdit(e.target.value as SalaryType)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-[#121826] px-3 py-2 text-xs text-white"
              >
                <option value={SalaryType.HOURLY}>Hourly</option>
                <option value={SalaryType.MONTHLY}>Monthly</option>
                <option value={SalaryType.ANNUAL}>Annual</option>
              </select>
            </label>

            <label className="block text-xs font-medium text-[#CBD5E1]">
              {salaryTypeEdit === SalaryType.HOURLY
                ? 'Hourly Rate ($)'
                : salaryTypeEdit === SalaryType.MONTHLY
                ? 'Monthly Salary ($)'
                : 'Annual Salary ($)'}
              <input
                type="text"
                value={salaryDollarsEdit}
                onChange={(e) => setSalaryDollarsEdit(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-[#121826] px-3 py-2 font-mono text-xs tabular-nums text-white"
              />
            </label>

            {salaryTypeEdit === SalaryType.HOURLY ? (
              <label className="block text-xs font-medium text-[#CBD5E1]">
                Weekly Hours
                <input
                  type="number"
                  value={weeklyHoursEdit}
                  onChange={(e) => setWeeklyHoursEdit(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-[#121826] px-3 py-2 font-mono text-xs tabular-nums text-white"
                />
              </label>
            ) : (
              <label className="block text-xs font-medium text-[#CBD5E1]">
                Overarching Monthly Cap ($)
                <input
                  type="text"
                  value={totalBudgetEdit}
                  onChange={(e) => setTotalBudgetEdit(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-[#121826] px-3 py-2 font-mono text-xs tabular-nums text-white"
                />
              </label>
            )}

            <div className="flex items-end">
              <button
                type="submit"
                className="flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-xl bg-[#E5B84B] px-4 py-2 text-xs font-bold text-[#0B0F17]"
              >
                <Check className="h-4 w-4" />
                <span>Save Baseline</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* MAIN TWO-COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left 5 Cols: Multi-Modal Transaction Logger + Wealth Virtues Ribbon */}
        <div className="space-y-6 lg:col-span-5">
          <form
            onSubmit={handleLogSubmit}
            className="rounded-3xl border border-slate-800 bg-[#121826] p-6 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-[#E5B84B]">Multi-Modal Ledger Input</div>
                <h2
                  className="text-lg font-bold text-[#F4F1EA]"
                  style={{ fontFamily: 'Fraunces, serif' }}
                >
                  Log Expense, Income, or Planned Item
                </h2>
              </div>
            </div>

            {/* Transaction Type Segmented Control */}
            <div className="mt-4 grid grid-cols-3 gap-1.5 rounded-2xl bg-[#0B0F17] p-1">
              {(
                [
                  { id: TransactionType.EXPENSE, label: 'Expense' },
                  { id: TransactionType.INCOME, label: 'Income' },
                  { id: TransactionType.RETURN, label: 'Return/Refund' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTxType(t.id)}
                  className={`min-h-[38px] rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                    txType === t.id
                      ? 'bg-[#E5B84B] text-[#0B0F17]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-medium text-[#CBD5E1]">
                  Amount ($)
                  <input
                    type="text"
                    required
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    placeholder="24.50"
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-[#0B0F17] px-3.5 py-2.5 font-mono text-sm tabular-nums text-white focus:border-[#E5B84B] focus:outline-none"
                  />
                </label>

                <label className="block text-xs font-medium text-[#CBD5E1]">
                  Category (11 Core)
                  <select
                    value={category}
                    onChange={(e) => {
                      const nextCat = e.target.value as BudgetCategory;
                      setCategory(nextCat);
                      if (nextCat === BudgetCategory.INVESTMENT) {
                        setSubType(TransactionSubType.MARKET_INVESTMENT);
                      } else {
                        setSubType(TransactionSubType.STANDARD);
                      }
                    }}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-[#0B0F17] px-3 py-2.5 text-xs text-white focus:border-[#E5B84B] focus:outline-none"
                  >
                    {ALL_BUDGET_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {CATEGORY_METADATA[cat].label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block text-xs font-medium text-[#CBD5E1]">
                Merchant or Description
                <input
                  type="text"
                  required
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  placeholder="e.g. St. Lawrence Market, Wealthsimple ETF, Charity"
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-[#0B0F17] px-3.5 py-2.5 text-sm text-white focus:border-[#E5B84B] focus:outline-none"
                />
              </label>

              {/* Virtue Tagging / Sub-Type Selector (Feeds INSIGHT & KINDNESS) */}
              <label className="block text-xs font-medium text-[#CBD5E1]">
                Virtue Sub-Classification (Optional)
                <select
                  value={subType}
                  onChange={(e) => setSubType(e.target.value as TransactionSubType)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-[#0B0F17] px-3 py-2 text-xs text-white"
                >
                  <option value={TransactionSubType.STANDARD}>Standard Entry</option>
                  <option value={TransactionSubType.MARKET_INVESTMENT}>
                    Market Investment (+Insight Virtue)
                  </option>
                  <option value={TransactionSubType.PHYSICAL_INVESTMENT}>
                    Physical Investment / Bullion (+Insight Virtue)
                  </option>
                  <option value={TransactionSubType.CHARITY_GIFT}>
                    Charity / Donation / Gift (+Kindness Virtue)
                  </option>
                  <option value={TransactionSubType.GENEROUS_TIP}>
                    Generous Tip (+Kindness Virtue)
                  </option>
                </select>
              </label>

              {/* Future Planned Toggle (Feeds INSIGHT) or Income Retention Toggle (Feeds DISCIPLINE) */}
              <div className="flex flex-col gap-2 pt-1 text-xs text-[#CBD5E1]">
                {txType === TransactionType.EXPENSE ? (
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isPlannedFuture}
                      onChange={(e) => setIsPlannedFuture(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-700 accent-[#E5B84B]"
                    />
                    <span>Log as Future Planned Expense (+8 Insight pts)</span>
                  </label>
                ) : (
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={retainedIncome}
                      onChange={(e) => setRetainedIncome(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-700 accent-[#E5B84B]"
                    />
                    <span>Retain &amp; Save Inflow without Spending (+10 Discipline pts)</span>
                  </label>
                )}

                <label className="flex cursor-pointer items-center gap-2 text-[#E5B84B]">
                  <input
                    type="checkbox"
                    checked={triggerCeremonyOnLog}
                    onChange={(e) => setTriggerCeremonyOnLog(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 accent-[#E5B84B]"
                  />
                  <span>Launch Wallet-Drop Radial Ceremony on Submit</span>
                </label>
              </div>

              <button
                type="submit"
                className="mt-2 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-[#E5B84B] px-5 py-3 text-xs font-bold text-[#0B0F17] shadow-lg transition-transform active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>Record to Ledger</span>
              </button>
            </div>
          </form>

          {/* Compact Royal Virtues Summary Card (Opens Full Wallet-Drop Radial Modal) */}
          <div className="rounded-3xl border border-slate-800 bg-[#121826] p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-[#C084FC]">Metaphor Royal Virtues</div>
                <h3
                  className="text-base font-bold text-[#F4F1EA]"
                  style={{ fontFamily: 'Fraunces, serif' }}
                >
                  Wealth Stats Summary
                </h3>
              </div>
              <button
                type="button"
                onClick={openWealthModal}
                className="flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#E5B84B]/15 px-3.5 py-2 text-xs font-bold text-[#E5B84B] hover:bg-[#E5B84B]/25"
              >
                <Coins className="h-3.5 w-3.5" />
                <span>Open Radial Astrolabe</span>
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {statRecords.map((rec) => {
                const meta = WEALTH_STAT_METADATA[rec.statType];
                return (
                  <button
                    key={rec.statType}
                    type="button"
                    onClick={openWealthModal}
                    className="flex flex-col items-start rounded-2xl border border-slate-800/90 bg-[#0B0F17] p-3 text-left hover:border-[#E5B84B]/50"
                  >
                    <div className="flex w-full items-baseline justify-between">
                      <span className="text-[11px] font-semibold text-[#94A3B8]">
                        {meta.label}
                      </span>
                      <span
                        className="font-mono text-sm font-extrabold text-[#E5B84B]"
                        style={{ fontFamily: 'Fraunces, serif' }}
                      >
                        R{rec.currentRank > 6 ? '6+' : rec.currentRank}
                      </span>
                    </div>
                    <div className="mt-1 truncate text-xs font-bold text-[#F4F1EA]">
                      {rec.title}
                    </div>
                    <div className="font-mono text-[10px] tabular-nums text-[#64748B]">
                      {rec.points} pts
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 7 Cols: 11-Category Discretionary vs. Uncapped Bookkeeping Matrix & Recent Ledger */}
        <div className="space-y-6 lg:col-span-7">
          <div className="rounded-3xl border border-slate-800 bg-[#121826] p-6 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
                  <span>11 Core Fixed Categories</span>
                  <span>·</span>
                  <span>Nullable Cap Support</span>
                </div>
                <h2
                  className="mt-0.5 text-lg font-bold text-[#F4F1EA]"
                  style={{ fontFamily: 'Fraunces, serif' }}
                >
                  Category Budgets &amp; Uncapped Bookkeeping
                </h2>
              </div>
              <span className="text-xs text-[#94A3B8]">
                Click any limit to set cap or toggle Uncapped
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {budgetSummary.categoryBreakdown.map((item) => {
                const isEditing = editingCategory === item.category;
                const pct =
                  item.utilizationRatio !== null
                    ? Math.min(100, Math.round(item.utilizationRatio * 100))
                    : 0;

                return (
                  <div
                    key={item.category}
                    className="rounded-2xl border border-slate-800/90 bg-[#0B0F17] p-3.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#F4F1EA]">
                        {item.label}
                      </span>

                      {!isEditing ? (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategory(item.category);
                            setCategoryCapInput(
                              item.monthlyLimitCents !== null
                                ? (item.monthlyLimitCents / 100).toFixed(0)
                                : ''
                            );
                          }}
                          className="font-mono text-xs tabular-nums text-[#E5B84B] hover:underline"
                        >
                          {item.isCapped && item.monthlyLimitCents !== null
                            ? `${centsToDollars(item.spentCents)} / ${centsToDollars(
                                item.monthlyLimitCents
                              )}`
                            : `${centsToDollars(item.spentCents)} · Uncapped`}
                        </button>
                      ) : (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={categoryCapInput}
                            onChange={(e) => setCategoryCapInput(e.target.value)}
                            placeholder="Uncapped"
                            aria-label={`Monthly limit for ${item.label}`}
                            className="w-20 rounded-lg border border-slate-700 bg-[#121826] px-2 py-1 font-mono text-xs text-white"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const trimmed = categoryCapInput.trim();
                              setCategoryMonthlyLimit(
                                item.category,
                                trimmed ? dollarsToCents(trimmed) : null
                              );
                              setEditingCategory(null);
                            }}
                            className="rounded-lg bg-[#E5B84B] px-2 py-1 text-[10px] font-bold text-[#0B0F17]"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCategoryMonthlyLimit(item.category, null);
                              setEditingCategory(null);
                            }}
                            className="rounded-lg border border-slate-700 px-2 py-1 text-[10px] text-slate-300"
                          >
                            Uncap
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Progress Bar for Capped Categories vs Quiet Rule for Uncapped Bookkeeping */}
                    {item.isCapped ? (
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#151D2E]">
                        <div
                          className={`h-full rounded-full transition-all ${
                            item.isOverCap ? 'bg-rose-500' : 'bg-[#34D399]'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    ) : (
                      <div className="mt-2 text-[11px] text-[#64748B]">
                        Bookkeeping-only mode (no over-budget penalty)
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Automated Recurring Bills & Recent Transactions */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Recurring Obligations */}
            <div className="rounded-3xl border border-slate-800 bg-[#121826] p-5">
              <h3
                className="text-base font-bold text-[#F4F1EA]"
                style={{ fontFamily: 'Fraunces, serif' }}
              >
                Recurring Obligations
              </h3>
              <p className="mt-0.5 text-xs text-[#94A3B8]">
                Rent, Subscriptions, Student Loan &amp; Transit
              </p>

              <div className="mt-3 space-y-2.5">
                {recurringTemplates.map((rt) => (
                  <div
                    key={rt.id}
                    className="flex items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-[#0B0F17] p-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold text-[#F4F1EA]">
                        {rt.title}
                      </div>
                      <div className="text-[11px] text-[#94A3B8]">
                        {CATEGORY_METADATA[rt.category].label} · {rt.frequency}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleRecurringTemplate(rt.id)}
                      className={`shrink-0 rounded-xl px-2.5 py-1 font-mono text-xs font-bold tabular-nums ${
                        rt.active
                          ? 'bg-[#E5B84B]/15 text-[#E5B84B]'
                          : 'bg-slate-800 text-slate-500 line-through'
                      }`}
                    >
                      {centsToDollars(rt.amountCents)}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Ledger Feed */}
            <div className="rounded-3xl border border-slate-800 bg-[#121826] p-5">
              <h3
                className="text-base font-bold text-[#F4F1EA]"
                style={{ fontFamily: 'Fraunces, serif' }}
              >
                Recent Ledger Activity
              </h3>
              <p className="mt-0.5 text-xs text-[#94A3B8]">
                Live expenses, investments &amp; planned items
              </p>

              <div className="mt-3 space-y-2.5">
                {transactions.slice(0, 6).map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2 last:border-none last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-[#F4F1EA]">
                        {tx.merchant}
                      </p>
                      <p className="text-[11px] text-[#94A3B8]">
                        {CATEGORY_METADATA[tx.category].label}
                        {tx.isPlannedFuture ? ' · Planned Future' : ''}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 font-mono text-xs font-bold tabular-nums ${
                        tx.type === TransactionType.EXPENSE
                          ? 'text-[#F4F1EA]'
                          : 'text-[#34D399]'
                      }`}
                    >
                      {tx.type === TransactionType.EXPENSE ? '-' : '+'}
                      {centsToDollars(tx.amountCents)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
