import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, Volume2, VolumeX, X } from 'lucide-react';
import {
  CatCutInType,
  CatExpression,
  CatSoundCategory,
  DialogueTriggerSource,
} from '../../types/domain';
import { useCompanionStore } from '../../store/useCompanionStore';
import { useBeeblyStore } from '../../store/useBeeblyStore';

/**
 * Crisp 16x16 nearest-neighbor pixel-art SVG sprite renderer for Mochi the Cat Companion.
 * Supports all 7 required expressions: Neutral, Smile, Curious, Excited, Sad, Shocked, Angry.
 */
export const PixelCatSprite: React.FC<{
  expression: CatExpression;
  size?: number;
}> = ({ expression, size = 56 }) => {
  const [blinkFrame, setBlinkFrame] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setBlinkFrame(true);
      setTimeout(() => setBlinkFrame(false), 160);
    }, 3600);
    return () => clearInterval(interval);
  }, []);

  const renderEyesAndMouth = () => {
    if (blinkFrame && expression !== CatExpression.SHOCKED) {
      return (
        <>
          <rect x="4" y="8" width="2" height="1" fill="#0B0F17" />
          <rect x="10" y="8" width="2" height="1" fill="#0B0F17" />
          <rect x="7" y="10" width="2" height="1" fill="#F472B6" />
        </>
      );
    }

    switch (expression) {
      case CatExpression.SMILE:
        return (
          <>
            {/* Happy curved pixel eyes ^ ^ */}
            <rect x="4" y="7" width="1" height="1" fill="#0B0F17" />
            <rect x="5" y="6" width="1" height="1" fill="#0B0F17" />
            <rect x="6" y="7" width="1" height="1" fill="#0B0F17" />
            <rect x="9" y="7" width="1" height="1" fill="#0B0F17" />
            <rect x="10" y="6" width="1" height="1" fill="#0B0F17" />
            <rect x="11" y="7" width="1" height="1" fill="#0B0F17" />
            {/* Rosy cheeks & cat smile */}
            <rect x="3" y="9" width="1" height="1" fill="#F472B6" />
            <rect x="12" y="9" width="1" height="1" fill="#F472B6" />
            <rect x="7" y="10" width="2" height="1" fill="#0B0F17" />
          </>
        );
      case CatExpression.EXCITED:
        return (
          <>
            {/* Golden starry eyes */}
            <rect x="4" y="6" width="2" height="2" fill="#E5B84B" />
            <rect x="5" y="6" width="1" height="1" fill="#FFFFFF" />
            <rect x="10" y="6" width="2" height="2" fill="#E5B84B" />
            <rect x="10" y="6" width="1" height="1" fill="#FFFFFF" />
            {/* Open happy mouth */}
            <rect x="7" y="10" width="2" height="2" fill="#F472B6" />
            <rect x="3" y="9" width="1" height="1" fill="#F472B6" />
            <rect x="12" y="9" width="1" height="1" fill="#F472B6" />
          </>
        );
      case CatExpression.CURIOUS:
        return (
          <>
            {/* Asymmetric inquisitive eyes */}
            <rect x="4" y="7" width="2" height="2" fill="#0B0F17" />
            <rect x="4" y="7" width="1" height="1" fill="#FFFFFF" />
            <rect x="10" y="6" width="2" height="3" fill="#0B0F17" />
            <rect x="10" y="6" width="1" height="1" fill="#FFFFFF" />
            <rect x="7" y="10" width="1" height="1" fill="#0B0F17" />
          </>
        );
      case CatExpression.SAD:
        return (
          <>
            {/* Droopy eyes with pixel tear */}
            <rect x="4" y="8" width="2" height="1" fill="#0B0F17" />
            <rect x="4" y="9" width="1" height="2" fill="#38BDF8" />
            <rect x="10" y="8" width="2" height="1" fill="#0B0F17" />
            <rect x="11" y="9" width="1" height="2" fill="#38BDF8" />
            <rect x="7" y="11" width="2" height="1" fill="#0B0F17" />
          </>
        );
      case CatExpression.SHOCKED:
        return (
          <>
            {/* Wide ringed eyes & gasping mouth */}
            <rect x="3" y="6" width="3" height="3" fill="#FFFFFF" />
            <rect x="4" y="7" width="1" height="1" fill="#0B0F17" />
            <rect x="10" y="6" width="3" height="3" fill="#FFFFFF" />
            <rect x="11" y="7" width="1" height="1" fill="#0B0F17" />
            <rect x="7" y="10" width="2" height="2" fill="#0B0F17" />
          </>
        );
      case CatExpression.ANGRY:
        return (
          <>
            {/* Furrowed brow & sharp eyes */}
            <rect x="4" y="6" width="2" height="1" fill="#EF4444" />
            <rect x="10" y="6" width="2" height="1" fill="#EF4444" />
            <rect x="4" y="7" width="2" height="2" fill="#0B0F17" />
            <rect x="10" y="7" width="2" height="2" fill="#0B0F17" />
            <rect x="6" y="10" width="4" height="1" fill="#0B0F17" />
          </>
        );
      case CatExpression.NEUTRAL:
      default:
        return (
          <>
            <rect x="4" y="7" width="2" height="2" fill="#0B0F17" />
            <rect x="4" y="7" width="1" height="1" fill="#FFFFFF" />
            <rect x="10" y="7" width="2" height="2" fill="#0B0F17" />
            <rect x="10" y="7" width="1" height="1" fill="#FFFFFF" />
            <rect x="7" y="9" width="2" height="1" fill="#F472B6" />
            <rect x="6" y="10" width="1" height="1" fill="#0B0F17" />
            <rect x="9" y="10" width="1" height="1" fill="#0B0F17" />
          </>
        );
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      style={{ imageRendering: 'pixelated' }}
      aria-label={`Mochi the Cat Companion (${expression} expression)`}
    >
      {/* Left & Right Pointed Pixel Cat Ears */}
      <rect x="2" y="2" width="3" height="3" fill="#F4F1EA" />
      <rect x="3" y="3" width="1" height="1" fill="#F472B6" />
      <rect x="11" y="2" width="3" height="3" fill="#F4F1EA" />
      <rect x="12" y="3" width="1" height="1" fill="#F472B6" />

      {/* Royal Gold Coin Forehead Emblem */}
      <rect x="2" y="4" width="12" height="9" fill="#F4F1EA" />
      <rect x="1" y="5" width="14" height="7" fill="#F4F1EA" />
      <rect x="7" y="4" width="2" height="2" fill="#E5B84B" />

      {/* Whiskers */}
      <rect x="0" y="8" width="2" height="1" fill="#94A3B8" />
      <rect x="14" y="8" width="2" height="1" fill="#94A3B8" />

      {/* Expression Eyes & Mouth */}
      {renderEyesAndMouth()}

      {/* Royal Red/Gold Collar & Bell */}
      <rect x="3" y="13" width="10" height="1" fill="#EF4444" />
      <rect x="7" y="13" width="2" height="2" fill="#E5B84B" />
    </svg>
  );
};

const CONTEXTUAL_HELP_TIPS: Record<string, string> = {
  dashboard:
    'Your Daily & Weekly Allowable Spend automatically deducts fixed recurring bills and month-to-date spending. Leave any category uncapped for pure bookkeeping!',
  transit:
    'Log 3+ identical weekday trips on GO Transit or TTC and I will unlock a 1-tap predictive commute card. Ontario One Fare automatically zeroes out TTC transfers from GO!',
  eod:
    'Complete the 2-Stage End of Day Review: verify your commute first, then upload an Apple/Google Wallet screenshot for instant Vision OCR categorization.',
  'wealth-stats':
    'Your 6 Royal Wealth Virtues grow from Rank 1 (0 pts) to Rank 6 (400 pts) and infinitely beyond into Over-Ranks like Visionary+ and Visionary++!',
  sheets:
    'Connect Google Sheets to either parse an existing spreadsheet of any layout via AI or automatically sync every new expense to a live beebly Financial Ledger.',
};

export const CatCompanion: React.FC = () => {
  const expression = useCompanionStore((s) => s.expression);
  const dialogueText = useCompanionStore((s) => s.dialogueText);
  const activeCutIn = useCompanionStore((s) => s.activeCutIn);
  const soundMuted = useCompanionStore((s) => s.soundMuted);
  const speakPermittedDialogue = useCompanionStore((s) => s.speakPermittedDialogue);
  const dismissDialogue = useCompanionStore((s) => s.dismissDialogue);
  const toggleSoundMute = useCompanionStore((s) => s.toggleSoundMute);
  const reactSilently = useCompanionStore((s) => s.reactSilently);

  const activeRoute = useBeeblyStore((s) => s.activeRoute);

  const handleHelpClick = () => {
    const tip = CONTEXTUAL_HELP_TIPS[activeRoute] ?? CONTEXTUAL_HELP_TIPS.dashboard;
    speakPermittedDialogue(
      DialogueTriggerSource.HELP_BUTTON,
      tip,
      CatExpression.CURIOUS,
      CatSoundCategory.MEOW
    );
  };

  return (
    <>
      {/* 2 Full-Screen / Banner Cut-In Illustrations (Surprised & Focused) */}
      <AnimatePresence>
        {activeCutIn && (
          <motion.div
            key="persona-cut-in-banner"
            initial={{ x: '-100%', skewY: -6, opacity: 0 }}
            animate={{ x: 0, skewY: -6, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="pointer-events-none fixed inset-x-0 top-24 z-50 flex items-center justify-center overflow-hidden border-y-4 border-[#E5B84B] bg-[#0B0F17]/95 py-4 shadow-2xl"
          >
            <div className="flex items-center gap-6 px-6">
              <div className="rounded-2xl border-2 border-[#E5B84B] bg-[#151D2E] p-2">
                <PixelCatSprite
                  expression={
                    activeCutIn.type === CatCutInType.SURPRISED
                      ? CatExpression.SHOCKED
                      : CatExpression.CURIOUS
                  }
                  size={64}
                />
              </div>
              <div>
                <div className="text-xs font-bold tracking-widest text-[#E5B84B]">
                  MOCHI CUT-IN · {activeCutIn.type.toUpperCase()}
                </div>
                <div
                  className="text-2xl font-extrabold italic tracking-tight text-[#F4F1EA] md:text-3xl"
                  style={{ fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif" }}
                >
                  {activeCutIn.subtitle}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Non-Intrusive Companion HUD Dock (Bottom-Right above mobile tab bar) */}
      <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end gap-2 md:bottom-6 md:right-6">
        {/* Sparingly-Used Dialogue Bubble ( ONLY visible on Onboarding, EOD Review, or Help '?' click ) */}
        <AnimatePresence>
          {dialogueText && (
            <motion.div
              key="cat-dialogue-bubble"
              initial={{ opacity: 0, y: 12, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.92 }}
              className="relative max-w-xs rounded-2xl border border-[#E5B84B]/60 bg-[#121826]/95 p-4 text-xs leading-relaxed text-[#F4F1EA] shadow-2xl backdrop-blur-md"
            >
              <div className="mb-1 flex items-center justify-between gap-3">
                <span
                  className="font-bold text-[#E5B84B]"
                  style={{ fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif" }}
                >
                  Mochi · Ledger Guide
                </span>
                <button
                  type="button"
                  onClick={dismissDialogue}
                  aria-label="Dismiss Mochi message"
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <p>{dialogueText}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tactile Rounded Companion Dock Pill */}
        <div className="flex items-center gap-1.5 rounded-2xl border border-slate-700/80 bg-[#121826]/95 p-1.5 shadow-xl backdrop-blur-md">
          <button
            type="button"
            onClick={() => {
              // Silent pet reaction: cycles expression & purrs without unprompted text
              const nextExpr =
                expression === CatExpression.SMILE
                  ? CatExpression.EXCITED
                  : CatExpression.SMILE;
              reactSilently(nextExpr, CatSoundCategory.PURR, 1.0);
            }}
            aria-label={`Pet Mochi the Cat (Current mood: ${expression})`}
            className="flex items-center gap-2 rounded-xl bg-[#0B0F17] px-2.5 py-1.5 hover:border-[#E5B84B]/40 transition-transform active:scale-95"
          >
            <PixelCatSprite expression={expression} size={38} />
            <div className="hidden text-left sm:block">
              <div className="text-[11px] font-semibold text-[#F4F1EA]">Mochi</div>
              <div className="text-[10px] text-[#E5B84B]">{expression}</div>
            </div>
          </button>

          {/* Explicit Help (?) Trigger — One of the 3 Permitted Verbal Dialogue Triggers */}
          <button
            type="button"
            onClick={handleHelpClick}
            aria-label="Ask Mochi for contextual help"
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-slate-300 hover:bg-slate-800 hover:text-[#E5B84B] transition-colors"
          >
            <HelpCircle className="h-4 w-4" />
          </button>

          {/* Audio Mute Toggle */}
          <button
            type="button"
            onClick={toggleSoundMute}
            aria-label={soundMuted ? 'Unmute companion audio' : 'Mute companion audio'}
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-slate-300 hover:bg-slate-800 hover:text-[#E5B84B] transition-colors"
          >
            {soundMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </>
  );
};
