import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Check, Sliders } from 'lucide-react';
import {
  BudgetCategory,
  BudgetMode,
  CategoryBudgetItem,
  RecurringTemplateItem,
  SalaryType,
  TransactionRecord,
  UserProfile,
} from '../../types/domain';
import {
  calculateBudgetSummary,
  centsToDollars,
  dollarsToCents,
  NormalizedSalaryMetrics,
} from '../../lib/budget-calculator';

type BudgetCalculationSummary = ReturnType<typeof calculateBudgetSummary>;

interface SlantedBudgetGaugeProps {
  remainingRatio: number; // 0 to 1
  size?: 'compact' | 'expanded';
}

/**
 * Separate overlayed slanted vertical bar component on the right of the Budget Widget container.
 * Partitioned into three vertical bars of the exact same color so they are indistinguishable
 * when aligned, but each bar animates up and down slightly with different animation timings
 * so the top surface periodically looks flat and periodically steps into three distinct heights.
 */
export const SlantedBudgetGauge: React.FC<SlantedBudgetGaugeProps> = ({
  remainingRatio,
  size = 'compact',
}) => {
  const clampedPct = Math.max(8, Math.min(96, Math.round(remainingRatio * 100)));

  // Three coprime animation timings so the three identically-colored bars
  // periodically align into a flat surface and periodically diverge in height.
  // Faster cadence with subtle vertical fluctuation.
  const barConfigs = [
    { id: 0, deltaPct: 1.8, duration: 1.15, delay: 0 },
    { id: 1, deltaPct: 2.3, duration: 1.5, delay: 0.2 },
    { id: 2, deltaPct: 1.5, duration: 1.85, delay: 0.45 },
  ];

  const dimensions =
    size === 'expanded'
      ? 'h-32 w-14 sm:h-36 sm:w-16'
      : 'h-36 w-14 sm:h-40 sm:w-16 md:h-44 md:w-20';

  return (
    <div
      data-testid="slanted-budget-gauge"
      aria-label={`Budget remaining gauge: ${clampedPct}%`}
      style={{ transform: 'skewX(-12deg)' }}
      className={`relative z-30 shrink-0 overflow-hidden rounded-2xl border-[1.5px] border-[#070A12] bg-[#151D2E] shadow-[0_14px_30px_rgba(0,0,0,0.55)] ${dimensions}`}
    >
      {/* Inner gauge track */}
      <div className="relative flex h-full w-full items-end overflow-hidden bg-[#151D2E]">
        {barConfigs.map((bar) => {
          const lowPct = Math.max(4, clampedPct - bar.deltaPct);
          const highPct = Math.min(100, clampedPct + bar.deltaPct);
          return (
            <motion.div
              key={bar.id}
              data-testid={`gauge-partition-bar-${bar.id}`}
              initial={{ height: `${clampedPct}%` }}
              animate={{
                height: [`${lowPct}%`, `${highPct}%`, `${clampedPct}%`, `${lowPct}%`],
              }}
              transition={{
                duration: bar.duration,
                delay: bar.delay,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              // Slight horizontal overlap (-mx-[0.5px]) and identical color (#10B981)
              // so the 3 vertical partitions are completely seamless/indistinguishable
              // except by their animated top heights.
              className="-mx-[0.5px] h-full flex-1 bg-[#10B981]"
            />
          );
        })}

        {/* Subtle horizontal measurement ticks on the glass */}
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between py-3 opacity-25">
          <div className="h-[1px] w-full bg-white" />
          <div className="h-[1px] w-full bg-white" />
          <div className="h-[1px] w-full bg-white" />
        </div>
      </div>
    </div>
  );
};

interface BudgetWidgetProps {
  user: UserProfile;
  budgetSummary: BudgetCalculationSummary;
  salaryMetrics: NormalizedSalaryMetrics;
  categoryBudgets: CategoryBudgetItem[];
  recurringTemplates: RecurringTemplateItem[];
  transactions: TransactionRecord[];
  onSetCategoryLimit: (category: BudgetCategory, monthlyLimitCents: number | null) => void;
  onUpdateSalary: (
    salaryType: SalaryType,
    salaryAmountCents: number,
    weeklyHours: number
  ) => void;
  onUpdateBudgetMode: (
    budgetMode: BudgetMode,
    totalMonthlyBudgetCents: number | null
  ) => void;
}

type TransitionStage =
  | 'idle'
  | 'fading'
  | 'morphing'
  | 'expanded'
  | 'collapsing-content'
  | 'collapsing-morph';

interface MeasuredGeometry {
  containerLeft: number;
  containerTop: number;
  containerWidth: number;
  containerHeight: number;
  titleLeft: number;
  titleBottom: number;
  titleWidth: number;
  titleHeight: number;
  viewportWidth: number;
  viewportHeight: number;
}

export const BudgetWidget: React.FC<BudgetWidgetProps> = ({
  user,
  budgetSummary,
  salaryMetrics,
  onSetCategoryLimit,
  onUpdateSalary,
  onUpdateBudgetMode,
}) => {
  const [stage, setStage] = useState<TransitionStage>('idle');
  const [geometry, setGeometry] = useState<MeasuredGeometry | null>(null);

  const compactContainerRef = useRef<HTMLDivElement | null>(null);
  const compactTitleRef = useRef<HTMLHeadingElement | null>(null);
  const timersRef = useRef<number[]>([]);

  // Category Cap Editor inside Full-Screen Expanded View
  const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(null);
  const [categoryCapInput, setCategoryCapInput] = useState('');

  // Salary & Pool Editor inside Full-Screen Expanded View
  const [showSalaryEditor, setShowSalaryEditor] = useState(false);
  const [salaryTypeEdit, setSalaryTypeEdit] = useState<SalaryType>(user.salaryType);
  const [salaryDollarsEdit, setSalaryDollarsEdit] = useState(
    (user.salaryAmountCents / 100).toFixed(2)
  );
  const [weeklyHoursEdit, setWeeklyHoursEdit] = useState(String(user.weeklyHours));
  const [totalBudgetEdit, setTotalBudgetEdit] = useState(
    user.totalMonthlyBudgetCents
      ? (user.totalMonthlyBudgetCents / 100).toFixed(0)
      : '4200'
  );

  const clearTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

  // Update viewport dimensions on resize when expanded
  useEffect(() => {
    if (stage === 'idle') return;
    const handleResize = () => {
      setGeometry((prev) =>
        prev
          ? {
              ...prev,
              viewportWidth: window.innerWidth,
              viewportHeight: window.innerHeight,
            }
          : prev
      );
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [stage]);

  const measureCurrentGeometry = (): MeasuredGeometry => {
    const cRect = compactContainerRef.current?.getBoundingClientRect();
    const tRect = compactTitleRef.current?.getBoundingClientRect();
    const vw = window.innerWidth || 1280;
    const vh = window.innerHeight || 800;

    return {
      containerLeft: cRect ? cRect.left : 24,
      containerTop: cRect ? cRect.top : 120,
      containerWidth: cRect ? cRect.width : Math.min(vw - 48, 1100),
      containerHeight: cRect ? cRect.height : 132,
      titleLeft: tRect ? tRect.left : 44,
      titleBottom: tRect ? tRect.bottom : 140,
      titleWidth: tRect ? tRect.width : 210,
      titleHeight: tRect ? tRect.height : 67,
      viewportWidth: vw,
      viewportHeight: vh,
    };
  };

  const handleOpenExpanded = () => {
    if (stage !== 'idle') return;
    clearTimers();
    const measured = measureCurrentGeometry();
    setGeometry(measured);

    // Step 1: Quickly fade out inner text/figures & compact gauge (~110ms)
    setStage('fading');

    // Step 2 & 3: Rotate yellow container 200° CW + scale up so no corners are visible,
    // and fly "BUDGET" title to top-right rotated 20° CW (~340ms snappy morph)
    const morphTimer = window.setTimeout(() => {
      setStage('morphing');
    }, 110);

    // Step 4: Once transition completes, animate the extended widget's information in
    const expandTimer = window.setTimeout(() => {
      setStage('expanded');
    }, 460);

    timersRef.current.push(morphTimer, expandTimer);
  };

  const handleCloseExpanded = () => {
    if (stage !== 'expanded' && stage !== 'morphing') return;
    clearTimers();
    setShowSalaryEditor(false);
    setEditingCategory(null);

    // Re-measure the compact card slot in case the layout shifted
    const measured = measureCurrentGeometry();
    setGeometry(measured);

    // Step 1 (Reverse): Fade out the extended widget's information (~130ms)
    setStage('collapsing-content');

    // Step 2 (Reverse): Rotate yellow container counter-clockwise from 200° back to 0°
    // and shrink/translate back to its unexpanded rounded rectangle while flying "BUDGET" back (~340ms)
    const reverseMorphTimer = window.setTimeout(() => {
      setStage('collapsing-morph');
    }, 130);

    // Step 3 (Reverse): Restore compact widget and fade inner figures & gauge back in
    const restoreIdleTimer = window.setTimeout(() => {
      setStage('idle');
    }, 470);

    timersRef.current.push(reverseMorphTimer, restoreIdleTimer);
  };

  // Total usable monthly budget after fixed recurring bills (or overarching monthly pool)
  const discretionaryPoolCents = Math.max(
    100,
    budgetSummary.effectiveMonthlyPoolCents - budgetSummary.fixedRecurringObligationsCents
  );
  const remainingMonthlyCents = budgetSummary.remainingAllowableMonthCents;
  const remainingRatio = Math.max(
    0,
    Math.min(1, remainingMonthlyCents / discretionaryPoolCents)
  );

  const formattedRemaining = centsToDollars(remainingMonthlyCents);
  const formattedTotalPool = centsToDollars(discretionaryPoolCents).replace(/\.00$/, '');
  const formattedDailySpend = centsToDollars(budgetSummary.allowableDailySpendCents);
  const remainingDays = budgetSummary.remainingDaysInMonth;

  const handleSaveSalaryAndPool = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSalary(
      salaryTypeEdit,
      dollarsToCents(salaryDollarsEdit),
      Number(weeklyHoursEdit) || 40
    );
    onUpdateBudgetMode(
      user.budgetMode,
      totalBudgetEdit.trim() ? dollarsToCents(totalBudgetEdit) : null
    );
    setShowSalaryEditor(false);
  };

  // Calculate target transforms for the 200° CW yellow container and 20° CW "BUDGET" title
  const isMorphedOrExpanded =
    stage === 'morphing' || stage === 'expanded' || stage === 'collapsing-content';
  const isOverlayActive =
    stage === 'morphing' ||
    stage === 'expanded' ||
    stage === 'collapsing-content' ||
    stage === 'collapsing-morph';

  // Anchor point P_TR on the top-right where the 200°-rotated yellow container ends (tilted at 20° CW)
  // and where the "BUDGET" title sits mostly outside (above & to the right of the edge).
  const vw = geometry?.viewportWidth ?? 1280;
  const vh = geometry?.viewportHeight ?? 800;
  const isMobileViewport = vw < 640;

  const containerExpandRotateDeg = 200;
  const edgeTiltDeg = containerExpandRotateDeg - 180; // 20° CW
  const edgeTiltRad = (edgeTiltDeg * Math.PI) / 180;
  const sinTilt = Math.sin(edgeTiltRad); // sin(20°) ≈ 0.34202014
  const cosTilt = Math.cos(edgeTiltRad); // cos(20°) ≈ 0.93969262

  const anchorPx = vw - (isMobileViewport ? 105 : 165);
  const anchorPy = isMobileViewport ? 76 : 92;

  // Normal vector pointing toward top-right (perpendicular to 20° CW edge): n = (+sinTilt, -cosTilt)
  // Signed projection d = x * sinTilt - y * cosTilt
  const dTopRightCorner = vw * sinTilt;
  const dTopRightEdge = anchorPx * sinTilt - anchorPy * cosTilt;
  const deltaTR = Math.max(40, dTopRightCorner - dTopRightEdge);

  // Triangular cutout at the bottom-left corner (0, vh) along the parallel 20° CW edge
  const deltaBL = isMobileViewport ? 56 : 96;
  const dBottomLeftCorner = -vh * cosTilt;
  const dBottomLeftEdge = dBottomLeftCorner + deltaBL;

  // Exact perpendicular thickness (expanded height) of the 200°-rotated yellow container
  // so its two parallel 20° edges form the top-right triangle and the bottom-left triangle,
  // while its expanded width pushes all 4 corners far outside the viewport.
  const expandedBandHeight = Math.max(240, dTopRightEdge - dBottomLeftEdge);
  const expandedBandWidth = Math.ceil(Math.hypot(vw, vh) * 2.6);

  // Center (targetCenterX, targetCenterY) of the 200°-rotated yellow band
  const dMid = (dTopRightEdge + dBottomLeftEdge) / 2;
  const dViewportCenter = (vw / 2) * sinTilt - (vh / 2) * cosTilt;
  const dOffsetFromCenter = dMid - dViewportCenter;
  const targetCenterX = vw / 2 + sinTilt * dOffsetFromCenter;
  const targetCenterY = vh / 2 - cosTilt * dOffsetFromCenter;

  // Exact 6-vertex clip-path polygon matching the visible yellow band inside the viewport
  // so zero elements can ever bleed onto the top-right or bottom-left empty triangular spaces.
  const xTR = Math.max(0, vw - deltaTR / sinTilt);
  const yTR = Math.min(vh, deltaTR / cosTilt);
  const xBL = Math.min(vw, deltaBL / sinTilt);
  const yBL = Math.max(0, vh - deltaBL / cosTilt);
  const yellowBandClipPath = `polygon(0px 0px, ${xTR.toFixed(1)}px 0px, ${vw}px ${yTR.toFixed(
    1
  )}px, ${vw}px ${vh}px, ${xBL.toFixed(1)}px ${vh}px, 0px ${yBL.toFixed(1)}px)`;

  // Compact container initial coordinates & center
  const cLeft = geometry?.containerLeft ?? 24;
  const cTop = geometry?.containerTop ?? 120;
  const cWidth = geometry?.containerWidth ?? 800;
  const cHeight = geometry?.containerHeight ?? 132;
  const cStartCenterX = cLeft + cWidth / 2;
  const cStartCenterY = cTop + cHeight / 2;
  const initialScaleX = cWidth / expandedBandWidth;
  const initialScaleY = cHeight / expandedBandHeight;
  const compactBorderRadius = `${Math.round(24 / initialScaleX)}px / ${Math.round(
    24 / initialScaleY
  )}px`;

  // Title initial bottom-center coordinates (unscaled layout height is text-5xl = 48px)
  const unscaledTitleHeight = 48;
  const tLeft = geometry?.titleLeft ?? 44;
  const tBottom = geometry?.titleBottom ?? 140;
  const tWidth = geometry?.titleWidth ?? 210;

  const tStartBottomCenterX = tLeft + tWidth / 2;
  const tStartBottomCenterY = tBottom;

  // Place "BUDGET" bottom-center 12px inside the yellow edge along inward normal (-sinTilt, +cosTilt)
  // so ~82% of the "BUDGET" height sits outside the yellow container (above & right of where it ends)
  // and ~18% overlaps the yellow container edge, matching the compact widget motif.
  const overlapIntoContainerPx = 12;
  const titleTargetBottomCenterX = anchorPx - overlapIntoContainerPx * sinTilt;
  const titleTargetBottomCenterY = anchorPy + overlapIntoContainerPx * cosTilt;

  const titleDeltaX = titleTargetBottomCenterX - tStartBottomCenterX;
  const titleDeltaY = titleTargetBottomCenterY - tStartBottomCenterY;

  return (
    <>
      {/* COMPACT HOME WIDGET */}
      <div
        className={`relative select-none ${
          isOverlayActive ? 'pointer-events-none invisible' : ''
        }`}
      >
        {/* Left-aligned "BUDGET" Title above the container, with its bottom part slightly overlapping the container */}
        <h2
          ref={compactTitleRef}
          data-testid="budget-widget-title"
          className="relative z-20 mt-3 -mb-5 ml-5 inline-block origin-bottom scale-y-[1.4] text-left text-5xl leading-none font-black uppercase tracking-wider text-white opacity-50 sm:-mb-4 sm:ml-6 sm:text-5xl"
          style={{ fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif" }}
        >
          BUDGET
        </h2>

        {/* Relative wrapper holding the Primary Color Rounded Container + Overlayed Slanted Gauge on the right */}
        <div className="relative flex items-center">
          <div
            ref={compactContainerRef}
            role="button"
            tabIndex={0}
            data-testid="budget-widget-container"
            aria-label="Expand Budget Widget for category details"
            onClick={handleOpenExpanded}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleOpenExpanded();
              }
            }}
            className="relative z-10 w-full cursor-pointer rounded-3xl bg-[#E5B84B] p-6 pr-24 text-[#070A12] shadow-2xl transition-transform hover:brightness-[1.02] active:scale-[0.99] sm:p-7 sm:pr-32 md:p-8 md:pr-36"
          >
            {/* Inner figures fade out first when clicked, and fade back in after reverse morph completes */}
            <motion.div
              animate={{ opacity: stage === 'idle' ? 1 : 0 }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
            >
              {/* Main Figure + Split Two-Row "out of / $Total" on the same row */}
              <div className="flex flex-nowrap items-end gap-2.5 sm:gap-4">
                <span
                  data-testid="budget-widget-remaining-amount"
                  className="font-mono whitespace-nowrap text-[2.5rem] scale-y-[1.25] leading-none font-black tracking-tight tabular-nums text-[#FAF8F5] drop-shadow-[0_2px_4px_rgba(7,10,18,0.28)] sm:text-5xl md:text-6xl"
                  style={{ fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif" }}
                >
                  {formattedRemaining}
                </span>

                {/* Split into two rows: "out of" on top, total budget on bottom */}
                <div
                  data-testid="budget-widget-out-of-split"
                  className="flex shrink-0 flex-col justify-center leading-tight text-[#070A12]/85 -gap-1"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider sm:text-xs">
                    out of
                  </span>
                  <span
                    data-testid="budget-widget-total-amount"
                    className="font-mono text-base font-extrabold tabular-nums sm:text-md md:text-lg"
                    style={{ fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif" }}
                  >
                    {formattedTotalPool}
                  </span>
                </div>
              </div>

              {/* Smaller Daily Burn-Rate Subtext Below */}
              <p
                data-testid="budget-widget-daily-subtext"
                className="mt-3 text-xs font-semibold text-[#070A12]/85 sm:text-sm"
              >
                You can spend{' '}
                <span className="font-mono font-black underline decoration-[#070A12]/40 underline-offset-2">
                  {formattedDailySpend}/day
                </span>{' '}
                for {remainingDays} more {remainingDays === 1 ? 'day' : 'days'}
              </p>
            </motion.div>
          </div>

          {/* Slanted Vertical Bar Overlayed in Front of the Right Side of the Container */}
          <motion.div
            onClick={handleOpenExpanded}
            animate={{ opacity: stage === 'idle' ? 1 : 0 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="absolute right-3 top-1/2 z-30 -translate-y-1/2 cursor-pointer sm:right-6 md:right-8"
          >
            <SlantedBudgetGauge remainingRatio={remainingRatio} size="compact" />
          </motion.div>
        </div>
      </div>

      {/* FULL-SCREEN ANIMATED TRANSITION & EXPANDED BUDGET VIEW */}
      <AnimatePresence>
        {isOverlayActive && geometry && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Expanded Budget Details and Category Usages"
            data-testid="budget-widget-expanded-fullscreen"
            className="fixed inset-0 z-50 h-screen w-screen overflow-hidden"
          >
            {/* Dark backdrop that fades in on expand and fades out on collapse so the yellow card visibly returns to the Home page */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: isMorphedOrExpanded ? 1 : 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="pointer-events-none absolute inset-0 bg-[#0B0F17]"
            />

            {/* 1. Yellow Widget Container rotating 200° clockwise & expanding so no corners are visible
                   (and reversing 200° -> 0° back into its unexpanded rounded rectangle when Back is clicked) */}
            <motion.div
              data-testid="budget-expanded-yellow-plane"
              initial={{
                x: 0,
                y: 0,
                rotate: 0,
                scaleX: initialScaleX,
                scaleY: initialScaleY,
                borderRadius: compactBorderRadius,
              }}
              animate={{
                x: isMorphedOrExpanded ? targetCenterX - cStartCenterX : 0,
                y: isMorphedOrExpanded ? targetCenterY - cStartCenterY : 0,
                rotate: isMorphedOrExpanded ? containerExpandRotateDeg : 0,
                scaleX: isMorphedOrExpanded ? 1 : initialScaleX,
                scaleY: isMorphedOrExpanded ? 1 : initialScaleY,
                borderRadius: isMorphedOrExpanded ? '0px / 0px' : compactBorderRadius,
              }}
              transition={{
                duration: 0.34,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{
                position: 'fixed',
                left: cStartCenterX - expandedBandWidth / 2,
                top: cStartCenterY - expandedBandHeight / 2,
                width: expandedBandWidth,
                height: expandedBandHeight,
                transformOrigin: '50% 50%',
              }}
              className="pointer-events-none z-10 bg-[#E5B84B] shadow-2xl"
            />

            {/* 2. "BUDGET" Title flying to top-right of the yellow container's new position & rotating 20° clockwise
                   (and flying back to its unexpanded position when Back is clicked) */}
            <motion.div
              data-testid="budget-expanded-flying-title"
              initial={{
                x: 0,
                y: 0,
                rotate: 0,
                scale: 1,
              }}
              animate={{
                x: isMorphedOrExpanded ? titleDeltaX : 0,
                y: isMorphedOrExpanded ? titleDeltaY : 0,
                rotate: isMorphedOrExpanded ? edgeTiltDeg : 0,
                scale: isMorphedOrExpanded && isMobileViewport ? 0.84 : 1,
              }}
              transition={{
                duration: 0.34,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{
                position: 'fixed',
                left: tLeft,
                top: tBottom - unscaledTitleHeight,
                width: tWidth,
                height: unscaledTitleHeight,
                transformOrigin: '50% 100%',
              }}
              className="pointer-events-none z-30 flex items-end justify-start"
            >
              <span
                style={{ fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif" }}
                className="inline-block origin-bottom scale-y-[1.4] whitespace-nowrap text-left text-5xl leading-none font-black uppercase tracking-wider text-white opacity-50"
              >
                BUDGET
              </span>
            </motion.div>

            {/* 3. Extended Widget Information (animates in ONLY after the 200° transition completes,
                   fades out first when Back is clicked, and is strictly clipped to the yellow band polygon) */}
            <div
              style={{ clipPath: yellowBandClipPath }}
              className="relative z-20 h-full w-full overflow-hidden"
            >
              <AnimatePresence>
                {stage === 'expanded' && (
                  <motion.div
                    key="expanded-budget-details-content"
                    data-testid="budget-expanded-details-content"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.13, ease: 'easeOut' }}
                    className="h-full w-full overflow-y-auto text-[#070A12]"
                  >
                  <div className="mx-auto max-w-6xl space-y-6 px-4 pt-5 pb-28 sm:px-8 md:px-12 md:pt-8 md:pb-32">
                    {/* Top Navigation Row: Back Button & Salary Config kept well left of the top-right triangle */}
                    <div className="flex flex-wrap items-center gap-3 pr-36 sm:pr-64 md:pr-80">
                      <button
                        type="button"
                        data-testid="close-expanded-budget"
                        onClick={handleCloseExpanded}
                        className="inline-flex min-h-[42px] items-center gap-2 rounded-2xl bg-[#070A12] px-4 py-2 text-xs font-bold text-[#F4F1EA] shadow-lg transition-transform hover:bg-[#151D2E] active:scale-95"
                      >
                        <ArrowLeft className="h-4 w-4 text-[#E5B84B]" />
                        <span>Back</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowSalaryEditor(!showSalaryEditor)}
                        className="inline-flex min-h-[40px] items-center gap-2 rounded-2xl border border-[#070A12]/30 bg-[#070A12]/10 px-4 py-2 text-xs font-bold text-[#070A12] hover:bg-[#070A12]/20"
                      >
                        <Sliders className="h-3.5 w-3.5" />
                        <span>Configure Salary &amp; Pool</span>
                      </button>
                    </div>

                    {/* High-Level Summary Header + Slanted Gauge kept well inside the yellow container */}
                    <div className="flex flex-wrap items-center justify-between gap-6 border-b border-[#070A12]/15 pb-6 pr-20 sm:pr-48 md:pr-64">
                      <div className="max-w-xl space-y-2 pr-8 sm:pr-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-lg bg-[#070A12] px-2.5 py-1 text-[11px] font-black uppercase tracking-widest text-[#E5B84B]">
                            MONTHLY POOL
                          </span>
                          <span className="text-xs font-bold text-[#070A12]/80">
                            Net Take-Home {centsToDollars(salaryMetrics.netMonthlyCents)}/mo · After{' '}
                            {centsToDollars(budgetSummary.fixedRecurringObligationsCents)} fixed bills
                          </span>
                        </div>

                        <div className="flex flex-nowrap items-end gap-3 pt-1 sm:gap-4">
                          <span
                            className="font-mono whitespace-nowrap text-4xl scale-y-[1.2] leading-none font-black tracking-tight tabular-nums text-[#FAF8F5] drop-shadow-[0_2px_4px_rgba(7,10,18,0.28)] sm:text-5xl md:text-6xl"
                            style={{ fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif" }}
                          >
                            {formattedRemaining}
                          </span>
                          <div className="flex shrink-0 flex-col justify-center leading-tight text-[#070A12]/85">
                            <span className="text-[11px] font-bold uppercase tracking-wider sm:text-xs">
                              out of
                            </span>
                            <span
                              className="font-mono text-lg font-extrabold tabular-nums sm:text-xl md:text-2xl"
                              style={{ fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif" }}
                            >
                              {formattedTotalPool}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs font-bold text-[#070A12]/90 sm:text-sm">
                          You can spend{' '}
                          <span className="font-mono font-black underline decoration-[#070A12]/40 underline-offset-2">
                            {formattedDailySpend}/day
                          </span>{' '}
                          ({centsToDollars(budgetSummary.allowableWeeklySpendCents)}/wk) for{' '}
                          {remainingDays} more {remainingDays === 1 ? 'day' : 'days'}
                        </p>
                      </div>

                      <div className="shrink-0">
                        <SlantedBudgetGauge remainingRatio={remainingRatio} size="expanded" />
                      </div>
                    </div>

                    {/* Salary & Pool Editor (when toggled) */}
                    {showSalaryEditor && (
                      <form
                        onSubmit={handleSaveSalaryAndPool}
                        className="grid grid-cols-1 gap-4 rounded-3xl bg-[#0B0F17] p-5 text-[#F4F1EA] shadow-xl sm:grid-cols-4"
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

                    {/* All 11 Individual Category Budgets & Usages */}
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-[11px] font-black uppercase tracking-wider text-[#070A12]/70">
                            11 Core Fixed Categories · Nullable Cap Support
                          </div>
                          <h3
                            className="mt-0.5 text-2xl font-black text-[#070A12]"
                            style={{ fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif" }}
                          >
                            Individual Category Budgets &amp; Usages
                          </h3>
                        </div>
                        <span className="text-xs font-semibold text-[#070A12]/75">
                          Tap any category limit to adjust cap or toggle Uncapped mode
                        </span>
                      </div>

                      <div
                        data-testid="expanded-category-budgets-grid"
                        className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3"
                      >
                        {budgetSummary.categoryBreakdown.map((item) => {
                          const isEditing = editingCategory === item.category;
                          const pct =
                            item.utilizationRatio !== null
                              ? Math.min(100, Math.round(item.utilizationRatio * 100))
                              : 0;

                          return (
                            <div
                              key={item.category}
                              data-testid={`expanded-category-card-${item.category}`}
                              className="rounded-2xl border border-[#070A12]/20 bg-[#0B0F17]/95 p-4 text-[#F4F1EA] shadow-xl"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-bold text-[#F4F1EA]">
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
                                    className="font-mono text-xs font-semibold tabular-nums text-[#E5B84B] hover:underline"
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
                                        onSetCategoryLimit(
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
                                        onSetCategoryLimit(item.category, null);
                                        setEditingCategory(null);
                                      }}
                                      className="rounded-lg border border-slate-700 px-2 py-1 text-[10px] text-slate-300"
                                    >
                                      Uncap
                                    </button>
                                  </div>
                                )}
                              </div>

                              {item.isCapped && item.monthlyLimitCents !== null ? (
                                <div className="mt-3 space-y-1.5">
                                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#151D2E]">
                                    <div
                                      className={`h-full rounded-full transition-all ${
                                        item.isOverCap ? 'bg-rose-500' : 'bg-[#10B981]'
                                      }`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <div className="flex justify-between text-[11px] text-[#94A3B8]">
                                    <span>{pct}% used</span>
                                    <span>
                                      {item.remainingCents !== null && item.remainingCents >= 0
                                        ? `${centsToDollars(item.remainingCents)} left`
                                        : `${centsToDollars(
                                            Math.abs(item.remainingCents ?? 0)
                                          )} over cap`}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="mt-3 text-[11px] text-[#64748B]">
                                  Bookkeeping-only mode (no over-budget penalty)
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
