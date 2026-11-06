import React, { useMemo, useState } from 'react';
import { Coins, Plus, Sparkles } from 'lucide-react';
import {
  BudgetCategory,
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
import { BudgetWidget } from './BudgetWidget';

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
  const openOnboarding = useBeeblyStore((s) => s.openOnboarding);

  // Quick Logger Form State
  const [txType, setTxType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [category, setCategory] = useState<BudgetCategory>(BudgetCategory.DINING);
  const [subType, setSubType] = useState<TransactionSubType>(TransactionSubType.STANDARD);
  const [merchant, setMerchant] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [isPlannedFuture, setIsPlannedFuture] = useState(false);
  const [retainedIncome, setRetainedIncome] = useState(true);
  const [triggerCeremonyOnLog, setTriggerCeremonyOnLog] = useState(false);

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
    [
      user.budgetMode,
      user.totalMonthlyBudgetCents,
      categoryBudgets,
      recurringTemplates,
      transactions,
    ]
  );

  const statRecords = useMemo(
    () => buildWealthStatRecords(wealthStatPoints),
    [wealthStatPoints]
  );

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

  return (
    <div className="space-y-8">
      {/* FIRST WIDGET: THE BUDGET WIDGET (Expands to Full Screen on Click to Show All Category Budgets & Usages) */}
      <BudgetWidget
        user={user}
        budgetSummary={budgetSummary}
        salaryMetrics={salaryMetrics}
        categoryBudgets={categoryBudgets}
        recurringTemplates={recurringTemplates}
        transactions={transactions}
        onSetCategoryLimit={setCategoryMonthlyLimit}
        onUpdateSalary={updateSalaryConfig}
        onUpdateBudgetMode={updateBudgetModeConfig}
      />

      {/* HIGH-LEVEL HOME SUMMARY WIDGETS */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left 6 Cols: Quick Transaction Logger Widget */}
        <div className="space-y-6 lg:col-span-6">
          <form
            onSubmit={handleLogSubmit}
            className="rounded-3xl border border-slate-800 bg-[#121826] p-6 shadow-xl"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-xs text-[#E5B84B]">Quick Ledger Widget</div>
                <h2
                  className="text-lg font-bold text-[#F4F1EA]"
                  style={{ fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif" }}
                >
                  Log Expense, Income, or Planned Item
                </h2>
              </div>

              <button
                type="button"
                onClick={() => openOnboarding(0)}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-slate-700 bg-[#0B0F17] px-3 py-1.5 text-xs font-semibold text-[#E5B84B] hover:border-[#E5B84B]"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Setup Wizard</span>
              </button>
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
        </div>

        {/* Right 6 Cols: Wealth Virtues Summary Widget + Recurring & Recent Activity Widgets */}
        <div className="space-y-6 lg:col-span-6">
          {/* Compact Royal Virtues Summary Card */}
          <div className="rounded-3xl border border-slate-800 bg-[#121826] p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-[#C084FC]">Metaphor Royal Virtues</div>
                <h3
                  className="text-base font-bold text-[#F4F1EA]"
                  style={{ fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif" }}
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
                        style={{ fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif" }}
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

          {/* Automated Recurring Bills & Recent Transactions */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Recurring Obligations */}
            <div className="rounded-3xl border border-slate-800 bg-[#121826] p-5">
              <h3
                className="text-base font-bold text-[#F4F1EA]"
                style={{ fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif" }}
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

            {/* Recent Activity Feed */}
            <div className="rounded-3xl border border-slate-800 bg-[#121826] p-5">
              <h3
                className="text-base font-bold text-[#F4F1EA]"
                style={{ fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif" }}
              >
                Recent Activity
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
