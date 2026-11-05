import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useBeeblyStore } from '../../store/useBeeblyStore';
import { soundEngine } from '../../lib/cat-audio';

interface DaySlotItem {
  offset: number; // -1 = prevDay, 0 = currentDay, +1 = tomorrow, etc.
  dayFormatted: string;
}

/**
 * Helper component that renders a 2-character string (such as DD or MM)
 * rotated at 0° in screen space for clean readability, while translating
 * the right character slightly above the left character to preserve the diagonal angle.
 */
const StaggeredPairText: React.FC<{
  value: string;
  className?: string;
  rightLiftClass?: string;
  leftDropClass?: string;
  testId?: string;
}> = ({
  value,
  className = '',
  rightLiftClass = '-translate-y-[0.14em]',
  leftDropClass = 'translate-y-[0.14em]',
  testId,
}) => {
  const leftChar = value.slice(0, 1);
  const rightChar = value.slice(1, 2);

  return (
    <span
      data-testid={testId}
      className={`inline-flex items-center tracking-tight tabular-nums ${className}`}
      style={{ fontFamily: 'Fraunces, serif' }}
    >
      <span className={`inline-block ${leftDropClass}`}>{leftChar}</span>
      <span className={`inline-block ${rightLiftClass}`}>{rightChar}</span>
    </span>
  );
};

/**
 * Full-screen kinetic RPG Welcome Calendar:
 * - Covers the entire screen on first login.
 * - Top-right corner displays Year (YYYY) and Month ("November" / "April").
 * - Center of screen (tilted 45°): from left to right -> WEEKDAY in ALL CAPS,
 *   Day Number (DD) in bold yellow font taking up the most space, and Month Number (MM).
 * - Weekday and Month Number containers extend off-screen, with the weekday container
 *   positioned further toward the bottom-left away from the center day number.
 * - All text (excluding the weekday name) is rotated to 0° so it is upright and readable,
 *   with the right character translated slightly above the left character.
 * - Current date stays unlit while rotating down into the center and lights up in bold yellow
 *   just as it is about to finish its animation to the center of the page.
 */
export const WelcomeCalendar: React.FC = () => {
  const isOpen = useBeeblyStore((s) => s.isWelcomeCalendarOpen);
  const completeWelcomeCalendar = useBeeblyStore((s) => s.completeWelcomeCalendar);

  const now = useMemo(() => new Date(), []);
  const prevDate = useMemo(() => new Date(now.getTime() - 86400000), [now]);

  const yearYYYY = String(now.getFullYear());
  const monthFullName = now.toLocaleDateString('en-US', { month: 'long' });
  const monthNumberMM = String(now.getMonth() + 1).padStart(2, '0');

  const currentWeekdayCaps = now
    .toLocaleDateString('en-US', { weekday: 'long' })
    .toUpperCase();
  const prevWeekdayCaps = prevDate
    .toLocaleDateString('en-US', { weekday: 'long' })
    .toUpperCase();

  // Generate day slots along the quarter circle:
  // offset = -1 is prevDay (starts in center slot at 45°),
  // offset = 0 is currentDay (starts 1 slot UP the page and shifts DOWN into center),
  // offset > 0 are increasing days as you go up the page,
  // offset < -1 are decreasing days lower down the page.
  const daySlots: DaySlotItem[] = useMemo(() => {
    const offsets = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
    return offsets.map((offset) => {
      const d = new Date(now.getTime() + offset * 86400000);
      return {
        offset,
        dayFormatted: String(d.getDate()).padStart(2, '0'),
      };
    });
  }, [now]);

  const [hasShiftedDown, setHasShiftedDown] = useState(false);
  // Controls which day slot is lit up in bold yellow:
  // -1 = prevDay is lit initially;
  // null = travelling in neutral slate while rotating;
  // 0 = currentDay lights up right as it is about to finish its animation to the center.
  const [litSlotOffset, setLitSlotOffset] = useState<-1 | 0 | null>(-1);
  const [isTransitioningOut, setIsTransitioningOut] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setHasShiftedDown(false);
      setLitSlotOffset(-1);
      setIsTransitioningOut(false);
      return;
    }

    // Step 1 (900ms): Begin 980ms quarter-circle slot rotation; unlight prevDay while numbers travel
    const shiftTimer = setTimeout(() => {
      setHasShiftedDown(true);
      setLitSlotOffset(null);
    }, 900);

    // Step 2 (1660ms — 760ms into the 980ms slot animation, right as currentDay is about to finish settling in center):
    // Light up the current date in bold yellow and flip the weekday banner!
    const lightUpTimer = setTimeout(() => {
      setLitSlotOffset(0);
      soundEngine.playCoinClink(1.08);
    }, 1450);

    // Step 3 (3450ms): Begin stylish diagonal shutter + morph transition to main home screen
    const exitStartTimer = setTimeout(() => {
      setIsTransitioningOut(true);
      soundEngine.playCoinClink(1.22);
    }, 3450);

    // Step 4 (4100ms): Unmount into main home screen
    const finishTimer = setTimeout(() => {
      completeWelcomeCalendar();
    }, 4100);

    return () => {
      clearTimeout(shiftTimer);
      clearTimeout(lightUpTimer);
      clearTimeout(exitStartTimer);
      clearTimeout(finishTimer);
    };
  }, [isOpen, completeWelcomeCalendar]);

  // Quarter-circle geometry with origin at the top-right of the page:
  const RADIUS = 520;
  const STEP_DEG = 14;
  const originOffsetX = RADIUS * Math.cos((45 * Math.PI) / 180);
  const originOffsetY = -RADIUS * Math.sin((45 * Math.PI) / 180);

  const activeWeekday = litSlotOffset === 0 ? currentWeekdayCaps : prevWeekdayCaps;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="welcome-calendar-fullscreen"
          role="dialog"
          aria-modal="true"
          aria-label="Daily Welcome Calendar"
          data-testid="welcome-calendar-screen"
          initial={{ opacity: 1 }}
          animate={{
            opacity: isTransitioningOut ? 0 : 1,
            scale: isTransitioningOut ? 1.07 : 1,
          }}
          exit={{
            opacity: 0,
            transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
          }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          onClick={() => completeWelcomeCalendar()}
          className="fixed inset-0 z-[100] h-screen w-screen cursor-pointer select-none overflow-hidden bg-[#070A12]"
        >
          {/* Stylish Diagonal Wipe Band on Exit Transition */}
          <motion.div
            initial={{ x: '-130%', rotate: -45 }}
            animate={
              isTransitioningOut
                ? { x: '130%', rotate: -45 }
                : { x: '-130%', rotate: -45 }
            }
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none absolute -inset-[60%] z-40 bg-gradient-to-r from-transparent via-[#FACC15]/35 to-transparent"
          />

          {/* Subtle Top-Right Origin Radial Glow & 45° Axis Guide */}
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full opacity-40"
          >
            <defs>
              <radialGradient id="topRightOriginGlow" cx="92%" cy="8%" r="75%">
                <stop offset="0%" stopColor="#E5B84B" stopOpacity="0.26" />
                <stop offset="55%" stopColor="#1E293B" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#070A12" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#topRightOriginGlow)" />
            <line
              x1="100%"
              y1="0%"
              x2="0%"
              y2="100%"
              stroke="#E5B84B"
              strokeOpacity="0.2"
              strokeWidth="1.5"
              strokeDasharray="6 8"
            />
          </svg>

          <div className="relative h-full w-full">
            {/* 1. TOP RIGHT OF THE SCREEN: Year (YYYY) and Month ("November" / "April") at 0° rotation */}
            <motion.div
              layoutId="beebly-calendar-badge"
              data-testid="calendar-top-right-year-month"
              className="absolute right-6 top-6 z-30 flex flex-col items-end text-right md:right-12 md:top-10"
            >
              <span
                data-testid="calendar-year-yyyy"
                className="font-mono text-3xl font-black tracking-wider tabular-nums text-[#FACC15] md:text-5xl"
                style={{ fontFamily: 'Fraunces, serif' }}
              >
                {yearYYYY}
              </span>
              <span
                data-testid="calendar-month-name"
                className="mt-0.5 text-xl font-bold tracking-wide text-[#F4F1EA] md:text-3xl"
                style={{ fontFamily: 'Fraunces, serif' }}
              >
                {monthFullName}
              </span>
            </motion.div>

            {/* 2. QUARTER-CIRCLE DAY NUMBER REEL (Origin at Top-Right of the Page)
                - Numbers are rotated back to 0° for readability, with the right character
                  translated slightly above the left character to preserve the diagonal angle.
                - Animation timing eases in from the start, then springs at the end.
                - The current day stays unlit while travelling and lights up in bold yellow
                  just as it is about to finish its animation to the center of the page. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-0 w-0"
            >
              {/* Quarter-Circle Arc Ring Centered at the Top-Right Origin */}
              <div
                style={{
                  transform: `translate(${originOffsetX - RADIUS}px, ${originOffsetY - RADIUS}px)`,
                  width: `${RADIUS * 2}px`,
                  height: `${RADIUS * 2}px`,
                }}
                className="pointer-events-none absolute rounded-full"
              />

              {daySlots.map((slot) => {
                const getArcCoords = (p: number) => {
                  const slotIdx = slot.offset + 1 - p;
                  const thetaDeg = 45 - slotIdx * STEP_DEG;
                  const thetaRad = (thetaDeg * Math.PI) / 180;
                  return {
                    x: originOffsetX - RADIUS * Math.cos(thetaRad),
                    y: originOffsetY + RADIUS * Math.sin(thetaRad),
                    thetaDeg,
                    slotIdx,
                  };
                };

                const initialArc = getArcCoords(0);
                const finalArc = getArcCoords(hasShiftedDown ? 1 : 0);

                // Keyframes for ease-in start (0 -> 1.14) followed by damped spring bounce at the end (1.14 -> 0.96 -> 1.025 -> 1)
                const springSteps = [0, 1.14, 0.96, 1.025, 1];
                const arcKeyframes = springSteps.map((p) => getArcCoords(p));

                const isInCenterSlot = finalArc.slotIdx === 0;
                const isLitYellow = litSlotOffset === slot.offset;
                const distanceFromCenter = Math.abs(finalArc.slotIdx);
                const inQuarterCircle =
                  finalArc.thetaDeg >= -2 && finalArc.thetaDeg <= 92;

                // All slots share the same base typography size (`text-[5.25rem] sm:text-[7rem] md:text-[9.25rem]`)
                // and scale up to 1.0 ONLY when lit in yellow, preventing any premature size jump while animating.
                const targetScale = isLitYellow
                  ? isTransitioningOut
                    ? 1.16
                    : 1
                  : Math.max(0.24, 0.42 - distanceFromCenter * 0.05);

                const targetOpacity = !inQuarterCircle
                  ? 0
                  : isLitYellow
                  ? 1
                  : Math.max(0.18, 0.54 - distanceFromCenter * 0.1);

                return (
                  <motion.div
                    key={slot.offset}
                    data-testid={`calendar-reel-day-${slot.offset}`}
                    initial={false}
                    animate={
                      hasShiftedDown
                        ? {
                            x: arcKeyframes.map((k) => k.x),
                            y: arcKeyframes.map((k) => k.y),
                            rotate: 0,
                            scale: targetScale,
                            opacity: targetOpacity,
                          }
                        : {
                            x: initialArc.x,
                            y: initialArc.y,
                            rotate: 0,
                            scale: targetScale,
                            opacity: targetOpacity,
                          }
                    }
                    transition={
                      hasShiftedDown
                        ? {
                            x: {
                              duration: 0.98,
                              times: [0, 0.54, 0.74, 0.88, 1],
                              ease: [
                                [0.55, 0.06, 0.85, 0.35], // Ease-in from the start
                                [0.22, 1, 0.36, 1],        // Spring rebound 1
                                'easeInOut',               // Spring rebound 2
                                'easeOut',                 // Final lock-in
                              ],
                            },
                            y: {
                              duration: 0.98,
                              times: [0, 0.54, 0.74, 0.88, 1],
                              ease: [
                                [0.55, 0.06, 0.85, 0.35], // Ease-in from the start
                                [0.22, 1, 0.36, 1],        // Spring rebound 1
                                'easeInOut',               // Spring rebound 2
                                'easeOut',                 // Final lock-in
                              ],
                            },
                            scale: {
                              duration: 0.28,
                              ease: [0.34, 1.56, 0.64, 1],
                            },
                            opacity: { duration: 0.24 },
                          }
                        : { duration: 0.3 }
                    }
                    className="-translate-x-1/2 -translate-y-1/2 absolute flex items-center justify-center"
                  >
                    <StaggeredPairText
                      value={slot.dayFormatted}
                      testId={isInCenterSlot ? 'calendar-active-day-dd' : undefined}
                      leftDropClass="translate-y-[0.13em]"
                      rightLiftClass="-translate-y-[0.13em]"
                      className={`font-mono text-[5.25rem] font-black leading-none transition-colors duration-200 sm:text-[7rem] md:text-[9.25rem] ${
                        isLitYellow
                          ? 'text-[#FACC15] drop-shadow-[0_12px_32px_rgba(250,204,21,0.55)]'
                          : 'text-[#94A3B8]'
                      }`}
                    />
                  </motion.div>
                );
              })}
            </div>

            {/* 3. CENTER 45°-TILTED MAIN INFO ASSEMBLY:
                - Anchored at screen center (left-1/2 top-1/2) and rotated -45°.
                - Weekday container is moved further toward the bottom-left (`right-[135px] sm:right-[180px] md:right-[230px]`)
                  so it sits well clear of the center day number, and extends off-screen to the bottom-left/left.
                - Month number (MM) container starts to the top-right (`left-[110px] sm:left-[145px] md:left-[185px]`)
                  and extends off-screen to the top-right/right. */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-0 w-0">
              <motion.div
                initial={{ scale: 0.94, opacity: 0, rotate: -45 }}
                animate={{
                  scale: isTransitioningOut ? 1.12 : 1,
                  opacity: isTransitioningOut ? 0 : 1,
                  rotate: -45,
                }}
                transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
                data-testid="calendar-center-tilted-group"
                className="relative h-0 w-0"
              >
                {/* LEFT / BOTTOM-LEFT: WEEKDAY CONTAINER */}
                <div
                  data-testid="calendar-weekday-container"
                  style={{
                    clipPath: 'polygon(0% 46%, 100% 0%, 100% 100%, 0% 54%)',
                  }}
                  className="absolute right-[135px] top-1/2 flex h-[64px] w-[780px] -translate-y-1/2 items-center justify-end bg-slate-900 pr-6 shadow-[0_14px_34px_rgba(0,0,0,0.7)] sm:right-[180px] sm:h-[82px] sm:w-[960px] sm:pr-9 md:right-[230px] md:h-[98px] md:w-[1150px] md:pr-11"
                >
                  <motion.span
                    key={activeWeekday}
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.22 }}
                    data-testid="calendar-weekday-caps"
                    className="relative z-10 font-mono text-sm font-black uppercase tracking-[0.2em] text-slate-500 sm:text-lg md:text-2xl"
                  >
                    {activeWeekday.slice(0, 3)}
                  </motion.span>
                </div>

                {/* RIGHT / TOP-RIGHT: MONTH NUMBER (MM) CONTAINER */}
                <div
                  data-testid="calendar-month-number-container"
                  style={{
                    clipPath: 'polygon(0% 28%, 100% 0%, 100% 100%, 0% 72%)',
                  }}
                  className="absolute left-[110px] top-1/2 flex h-[76px] w-[780px] -translate-y-1/2 items-center justify-start bg-[#E5B84B] pl-7 shadow-[0_14px_34px_rgba(0,0,0,0.7)] sm:left-[145px] sm:h-[96px] sm:w-[960px] sm:pl-10 md:left-[185px] md:h-[116px] md:w-[1150px] md:pl-12"
                >
                  <div className="relative z-10 rotate-45">
                    <StaggeredPairText
                      value={monthNumberMM}
                      testId="calendar-month-mm"
                      leftDropClass="translate-y-[0.14em]"
                      rightLiftClass="-translate-y-[0.14em]"
                      className="font-mono text-xl font-black text-[#070A12] sm:text-3xl md:text-4xl"
                    />
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Subtle bottom-left skip hint */}
            <div className="pointer-events-none absolute bottom-6 left-6 z-30 flex items-center gap-2 text-xs font-medium tracking-widest text-[#94A3B8]/75 md:bottom-10 md:left-12">
              <span>Tap anywhere to skip &gt;&gt;</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
