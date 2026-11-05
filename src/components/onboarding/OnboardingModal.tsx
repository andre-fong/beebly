import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Check, Coins, Sparkles, X } from 'lucide-react';
import { useBeeblyStore } from '../../store/useBeeblyStore';
import { BudgetMode, SalaryType } from '../../types/domain';
import { centsToDollars, dollarsToCents } from '../../lib/budget-calculator';
import { PixelCatSprite } from '../companion/CatCompanion';
import { useCompanionStore } from '../../store/useCompanionStore';

export const OnboardingModal: React.FC = () => {
  const isOpen = useBeeblyStore((s) => s.isOnboardingOpen);
  const step = useBeeblyStore((s) => s.onboardingStep);
  const setStep = useBeeblyStore((s) => s.setOnboardingStep);
  const completeOnboarding = useBeeblyStore((s) => s.completeOnboarding);

  const user = useBeeblyStore((s) => s.user);
  const updateUserProfile = useBeeblyStore((s) => s.updateUserProfile);
  const updateSalaryConfig = useBeeblyStore((s) => s.updateSalaryConfig);
  const updateBudgetModeConfig = useBeeblyStore((s) => s.updateBudgetModeConfig);

  const catExpression = useCompanionStore((s) => s.expression);

  const [nameInput, setNameInput] = useState(user.name);
  const [salaryType, setSalaryType] = useState<SalaryType>(user.salaryType);
  const [salaryDollars, setSalaryDollars] = useState(
    (user.salaryAmountCents / 100).toFixed(2)
  );
  const [weeklyHours, setWeeklyHours] = useState(String(user.weeklyHours));
  const [budgetDollars, setBudgetDollars] = useState(
    user.totalMonthlyBudgetCents ? (user.totalMonthlyBudgetCents / 100).toFixed(0) : '4200'
  );

  const handleNext = () => {
    if (step === 0) {
      if (nameInput.trim()) {
        updateUserProfile({ name: nameInput.trim() });
      }
      setStep(1);
    } else if (step === 1) {
      updateSalaryConfig(
        salaryType,
        dollarsToCents(salaryDollars),
        Number(weeklyHours) || 40
      );
      updateBudgetModeConfig(BudgetMode.HYBRID, dollarsToCents(budgetDollars));
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else {
      completeOnboarding();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="onboarding-wizard-modal"
          role="dialog"
          aria-modal="true"
          aria-label="beebly 4-Step Guided Onboarding"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
        >
          <motion.div
            initial={{ y: 20, scale: 0.96 }}
            animate={{ y: 0, scale: 1 }}
            className="w-full max-w-lg overflow-hidden rounded-3xl border border-[#E5B84B]/40 bg-[#121826] p-6 shadow-2xl"
          >
            {/* Header with Mochi Avatar */}
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-[#E5B84B]/50 bg-[#0B0F17] p-2">
                  <PixelCatSprite expression={catExpression} size={42} />
                </div>
                <div>
                  <div className="text-xs text-[#E5B84B]">
                    Step {step + 1} of 4 · Royal Setup
                  </div>
                  <h2
                    className="text-xl font-bold text-[#F4F1EA]"
                    style={{ fontFamily: 'Fraunces, serif' }}
                  >
                    {step === 0 && '01. Identity & Ledger Name'}
                    {step === 1 && '02. Salary & Budget Baseline'}
                    {step === 2 && '03. Smart Transit & OCR Logging'}
                    {step === 3 && '04. The 6 Royal Wealth Virtues'}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={completeOnboarding}
                aria-label="Close onboarding wizard"
                className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Step Body */}
            <div className="space-y-4 py-2">
              {step === 0 && (
                <div className="space-y-3">
                  <label className="block text-xs font-medium text-[#CBD5E1]">
                    Your Display Name
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="mt-1.5 w-full rounded-2xl border border-slate-700 bg-[#0B0F17] px-4 py-3 text-sm text-white focus:border-[#E5B84B] focus:outline-none"
                      placeholder="Alex Rivera"
                    />
                  </label>
                  <p className="text-xs text-[#94A3B8]">
                    Mochi only speaks during Onboarding, End of Day Reviews, or when you tap the Help (?) icon—staying expressive but silent during routine logging.
                  </p>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <span className="block text-xs font-medium text-[#CBD5E1]">
                      Compensation Structure
                    </span>
                    <div className="mt-1.5 grid grid-cols-3 gap-2">
                      {([SalaryType.HOURLY, SalaryType.MONTHLY, SalaryType.ANNUAL] as const).map(
                        (st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setSalaryType(st)}
                            className={`min-h-[42px] rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                              salaryType === st
                                ? 'bg-[#E5B84B] text-[#0B0F17]'
                                : 'border border-slate-700 bg-[#0B0F17] text-slate-300'
                            }`}
                          >
                            {st}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-xs font-medium text-[#CBD5E1]">
                      {salaryType === SalaryType.HOURLY
                        ? 'Hourly Rate ($)'
                        : salaryType === SalaryType.MONTHLY
                        ? 'Monthly Gross ($)'
                        : 'Annual Salary ($)'}
                      <input
                        type="text"
                        value={salaryDollars}
                        onChange={(e) => setSalaryDollars(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#0B0F17] px-3.5 py-2.5 font-mono text-sm tabular-nums text-white"
                      />
                    </label>

                    {salaryType === SalaryType.HOURLY ? (
                      <label className="block text-xs font-medium text-[#CBD5E1]">
                        Weekly Hours
                        <input
                          type="number"
                          value={weeklyHours}
                          onChange={(e) => setWeeklyHours(e.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#0B0F17] px-3.5 py-2.5 font-mono text-sm tabular-nums text-white"
                        />
                      </label>
                    ) : (
                      <label className="block text-xs font-medium text-[#CBD5E1]">
                        Target Monthly Budget ($)
                        <input
                          type="text"
                          value={budgetDollars}
                          onChange={(e) => setBudgetDollars(e.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#0B0F17] px-3.5 py-2.5 font-mono text-sm tabular-nums text-white"
                        />
                      </label>
                    )}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-3 rounded-2xl border border-slate-800 bg-[#0B0F17] p-4 text-xs leading-relaxed text-[#CBD5E1]">
                  <p>
                    <strong className="text-[#E5B84B]">1. Predictive TTC &amp; GO Transit:</strong>{' '}
                    Calculates exact PRESTO fares with 2-hour transfers and Ontario One Fare free subway/bus connections. After 3+ trips on the same weekday, confirm commutes in one tap.
                  </p>
                  <p>
                    <strong className="text-[#E5B84B]">2. Apple &amp; Google Wallet Vision OCR:</strong>{' '}
                    During your End of Day review, drop any wallet screenshot to auto-extract merchants, timestamps, and categories.
                  </p>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-3 rounded-2xl border border-slate-800 bg-[#0B0F17] p-4 text-xs leading-relaxed text-[#CBD5E1]">
                  <p>
                    Your financial choices cultivate 6 Royal Virtues:{' '}
                    <span className="text-[#E5B84B]">
                      Discipline, Insight, Kindness, Prosperity, Vitality, and Fortitude
                    </span>
                    .
                  </p>
                  <p>
                    Each virtue ascends from <strong>Rank 1 (0 pts)</strong> to{' '}
                    <strong>Rank 6 (400 pts)</strong> and beyond into Over-Ranks (
                    <span className="font-mono text-[#C084FC]">Visionary+</span>,{' '}
                    <span className="font-mono text-[#C084FC]">Visionary++</span>).
                  </p>
                </div>
              )}
            </div>

            {/* Footer Controls */}
            <div className="mt-6 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                {[0, 1, 2, 3].map((idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setStep(idx as 0 | 1 | 2 | 3)}
                    aria-label={`Go to onboarding step ${idx + 1}`}
                    className={`h-2.5 rounded-full transition-all ${
                      step === idx ? 'w-7 bg-[#E5B84B]' : 'w-2.5 bg-slate-700'
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={handleNext}
                className="flex min-h-[44px] items-center gap-2 rounded-2xl bg-[#E5B84B] px-5 py-2.5 text-xs font-bold text-[#0B0F17] shadow-lg transition-transform active:scale-95"
              >
                <span>{step === 3 ? 'Complete Setup' : 'Continue'}</span>
                {step === 3 ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
