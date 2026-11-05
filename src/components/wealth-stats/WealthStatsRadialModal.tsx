import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  Eye,
  Heart,
  Crown,
  Flame,
  Anchor,
  X,
  Coins,
  Sparkles,
  Plus,
} from 'lucide-react';
import { WealthStatType } from '../../types/domain';
import {
  buildWealthStatRecords,
  getRankProgressDetails,
  WEALTH_STAT_METADATA,
} from '../../lib/wealth-stats';
import { useBeeblyStore } from '../../store/useBeeblyStore';
import { SPRING_PHYSICS } from '../../lib/motion-configs';
import { soundEngine } from '../../lib/cat-audio';

const ORDERED_STATS: readonly WealthStatType[] = [
  WealthStatType.DISCIPLINE,
  WealthStatType.INSIGHT,
  WealthStatType.KINDNESS,
  WealthStatType.PROSPERITY,
  WealthStatType.VITALITY,
  WealthStatType.FORTITUDE,
] as const;

const STAT_ICONS: Record<WealthStatType, React.ComponentType<{ className?: string }>> = {
  [WealthStatType.DISCIPLINE]: ShieldCheck,
  [WealthStatType.INSIGHT]: Eye,
  [WealthStatType.KINDNESS]: Heart,
  [WealthStatType.PROSPERITY]: Crown,
  [WealthStatType.VITALITY]: Flame,
  [WealthStatType.FORTITUDE]: Anchor,
};

/**
 * Semi-circular arc coordinates (in a 680x440 SVG/stage coordinate system)
 * Modeled after Metaphor: ReFantazio's Royal Virtues semi-circular crown layout
 * where the central profile silhouette anchors the bottom-center (cx=340, cy=360)
 * and the 6 virtue nodes fan across the upper arc.
 */
const ARC_ANGLES_DEG = [-162, -129, -96, -84, -51, -18]; // Wait—let's make them evenly spaced along the upper semi-circle!
const EVEN_ARC_ANGLES_DEG = [-165, -135, -105, -75, -45, -15];

interface RadialStatsStageProps {
  isModal?: boolean;
  onClose?: () => void;
}

export const WealthStatsStageContent: React.FC<RadialStatsStageProps> = ({
  isModal = false,
  onClose,
}) => {
  const wealthStatPoints = useBeeblyStore((s) => s.wealthStatPoints);
  const wealthStatEvents = useBeeblyStore((s) => s.wealthStatEvents);
  const queuedStatAwards = useBeeblyStore((s) => s.queuedStatAwards);
  const clearQueuedStatAwards = useBeeblyStore((s) => s.clearQueuedStatAwards);
  const awardWealthStatPoints = useBeeblyStore((s) => s.awardWealthStatPoints);
  const userName = useBeeblyStore((s) => s.user.name);

  const [selectedStat, setSelectedStat] = useState<WealthStatType>(WealthStatType.INSIGHT);
  const [walletCascadeDone, setWalletCascadeDone] = useState(!isModal);
  const [activeCoinParticles, setActiveCoinParticles] = useState<
    Array<{ id: string; statType: WealthStatType; targetX: number; targetY: number; delta: number }>
  >([]);

  const records = buildWealthStatRecords(wealthStatPoints);

  const centerX = 340;
  const centerY = 345;
  const nodeRadius = 235;
  const maxPolygonRadius = 155;

  const getNodePosition = (index: number) => {
    const rad = (EVEN_ARC_ANGLES_DEG[index] * Math.PI) / 180;
    return {
      x: centerX + Math.cos(rad) * nodeRadius,
      y: centerY + Math.sin(rad) * nodeRadius,
      rad,
    };
  };

  useEffect(() => {
    if (isModal) {
      setWalletCascadeDone(false);
      const t = setTimeout(() => {
        setWalletCascadeDone(true);
      }, 650);
      return () => clearTimeout(t);
    } else {
      setWalletCascadeDone(true);
    }
  }, [isModal]);

  // Spawn flying coin particles whenever queuedStatAwards has items
  useEffect(() => {
    if (queuedStatAwards.length === 0) return;

    const particles = queuedStatAwards.map((ev, idx) => {
      const statIndex = ORDERED_STATS.indexOf(ev.statType);
      const pos = getNodePosition(statIndex >= 0 ? statIndex : 0);
      return {
        id: `${ev.id}-${idx}`,
        statType: ev.statType,
        targetX: pos.x,
        targetY: pos.y,
        delta: ev.deltaPoints,
      };
    });

    setActiveCoinParticles(particles);
    if (queuedStatAwards[0]) {
      setSelectedStat(queuedStatAwards[0].statType);
    }

    const timer = setTimeout(() => {
      soundEngine.playCoinClink(1.2);
      setActiveCoinParticles([]);
      clearQueuedStatAwards();
    }, 1500);

    return () => clearTimeout(timer);
  }, [queuedStatAwards, clearQueuedStatAwards]);

  // Compute Metaphor-style 6-pointed starburst crown polygon with alternating spoke peaks and inner valleys
  const polygonPointsString = ORDERED_STATS.map((statType, idx) => {
    const pts = wealthStatPoints[statType] ?? 0;
    const details = getRankProgressDetails(statType, pts);
    const normalizedRatio = Math.min(1, (details.rank - 1 + details.progressRatio) / 6);
    const r = 56 + normalizedRatio * (maxPolygonRadius - 56);
    const rad = (EVEN_ARC_ANGLES_DEG[idx] * Math.PI) / 180;
    const px = centerX + Math.cos(rad) * r;
    const py = centerY + Math.sin(rad) * r;

    if (idx < ORDERED_STATS.length - 1) {
      const midDeg = (EVEN_ARC_ANGLES_DEG[idx] + EVEN_ARC_ANGLES_DEG[idx + 1]) / 2;
      const midRad = (midDeg * Math.PI) / 180;
      const valleyR = 54;
      const vx = centerX + Math.cos(midRad) * valleyR;
      const vy = centerY + Math.sin(midRad) * valleyR;
      return `${px.toFixed(1)},${py.toFixed(1)} ${vx.toFixed(1)},${vy.toFixed(1)}`;
    }
    return `${px.toFixed(1)},${py.toFixed(1)}`;
  }).join(' ');

  const selectedDetails = getRankProgressDetails(
    selectedStat,
    wealthStatPoints[selectedStat] ?? 0
  );
  const selectedMeta = WEALTH_STAT_METADATA[selectedStat];

  const handleSimulateStatBoost = (statType: WealthStatType, delta: number, reason: string) => {
    setSelectedStat(statType);
    awardWealthStatPoints([{ statType, deltaPoints: delta, reason }], false);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#E5B84B]/30 bg-[#0E131F] p-5 md:p-7 shadow-2xl">
      {/* Stage 1: Wallet-Drop Cascade Transition when opened as Global Ceremony Modal */}
      <AnimatePresence>
        {isModal && !walletCascadeDone && (
          <motion.div
            key="wallet-drop-cascade"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-start bg-[#0B0F17]/95 pt-10"
          >
            {/* Stylized 3D Vector Wallet Snapping Open */}
            <motion.div
              initial={{ y: -90, rotateX: -45, scale: 0.8 }}
              animate={{ y: 0, rotateX: 0, scale: 1 }}
              transition={SPRING_PHYSICS.walletDrop}
              className="flex h-24 w-44 flex-col items-center justify-center rounded-2xl border-2 border-[#E5B84B] bg-[#1A2234] shadow-2xl"
            >
              <div className="h-3 w-16 rounded-full bg-[#E5B84B]" />
              <span
                className="mt-2 text-xs font-semibold tracking-wider text-[#F4F1EA]"
                style={{ fontFamily: 'Fraunces, serif' }}
              >
                ROYAL WALLET UNLOCKED
              </span>
            </motion.div>

            {/* Cascading Receipts / Cards Wiping Viewport */}
            {[0, 1, 2].map((cardIdx) => (
              <motion.div
                key={cardIdx}
                initial={{ y: -40, opacity: 0, rotate: -6 + cardIdx * 6 }}
                animate={{ y: 120 + cardIdx * 95, opacity: 1, rotate: -3 + cardIdx * 3 }}
                transition={{ delay: 0.08 * cardIdx, duration: 0.38 }}
                className="mt-3 h-16 w-64 rounded-2xl border border-[#E5B84B]/40 bg-[#151D2E] p-3 shadow-xl"
              >
                <div className="flex items-center justify-between text-xs text-[#E5B84B]">
                  <span>Virtue Ledger Voucher #{cardIdx + 1}</span>
                  <Coins className="h-4 w-4" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header Row */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#E5B84B]">
            <span>Royal Virtues Astrolabe</span>
            <span>·</span>
            <span>6-Axis Wealth Matrix</span>
          </div>
          <h2
            className="text-2xl font-bold tracking-tight text-[#F4F1EA] md:text-3xl"
            style={{ fontFamily: 'Fraunces, serif' }}
          >
            {userName}&apos;s Wealth Virtues
          </h2>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Wealth Virtues Modal"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl border border-slate-700/80 bg-[#151D2E] text-slate-300 hover:border-[#E5B84B] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center">
        {/* Left/Center 7 Cols: Metaphor: ReFantazio Inspired Semi-Circular Radial Stage */}
        <div className="relative flex items-center justify-center rounded-3xl border border-slate-800/90 bg-[#090D15] p-3 lg:col-span-7">
          <svg
            viewBox="0 0 680 420"
            className="h-auto w-full max-w-[680px] select-none overflow-visible"
            role="img"
            aria-label="Six-pointed Royal Virtues radial chart"
          >
            <defs>
              <radialGradient id="virtueStarburstFill" cx="50%" cy="80%" r="65%">
                <stop offset="0%" stopColor="#E5B84B" stopOpacity="0.58" />
                <stop offset="70%" stopColor="#C084FC" stopOpacity="0.24" />
                <stop offset="100%" stopColor="#E5B84B" stopOpacity="0.1" />
              </radialGradient>
            </defs>

            {/* Sweeping Circular Astrolabe Arcs */}
            {[80, 120, 160, 235].map((r) => (
              <path
                key={r}
                d={`M ${centerX - r} ${centerY} A ${r} ${r} 0 0 1 ${centerX + r} ${centerY}`}
                fill="none"
                stroke="#E5B84B"
                strokeOpacity={r === 235 ? 0.35 : 0.16}
                strokeWidth={r === 235 ? 1.5 : 1}
                strokeDasharray={r === 120 ? '4 6' : undefined}
              />
            ))}

            {/* 6 Radial Spokes from Silhouette Center to Each Virtue Node */}
            {ORDERED_STATS.map((statType, idx) => {
              const pos = getNodePosition(idx);
              const isSelected = selectedStat === statType;
              return (
                <line
                  key={statType}
                  x1={centerX}
                  y1={centerY}
                  x2={pos.x}
                  y2={pos.y}
                  stroke={isSelected ? '#E5B84B' : '#475569'}
                  strokeWidth={isSelected ? 2 : 1}
                  strokeDasharray={isSelected ? undefined : '3 5'}
                />
              );
            })}

            {/* Golden 6-Pointed Starburst Polygon */}
            <polygon
              points={`${centerX},${centerY} ${polygonPointsString}`}
              fill="url(#virtueStarburstFill)"
              stroke="#E5B84B"
              strokeWidth="2.4"
              strokeLinejoin="round"
            />

            {/* Flying Coin Particles Arcing Across Screen into Target Node */}
            {activeCoinParticles.map((coin) => (
              <motion.g
                key={coin.id}
                initial={{ x: centerX, y: 30, scale: 0.5, opacity: 1 }}
                animate={{ x: coin.targetX, y: coin.targetY, scale: [1, 1.35, 0.9], opacity: [1, 1, 0] }}
                transition={{ duration: 1.15, ease: 'easeOut' }}
              >
                <circle r="14" fill="#E5B84B" stroke="#FFFBEB" strokeWidth="2" />
                <text
                  textAnchor="middle"
                  dy="4"
                  fontSize="10"
                  fontWeight="bold"
                  fill="#0B0F17"
                >
                  +{coin.delta}
                </text>
              </motion.g>
            ))}

            {/* 6 Virtue Nodes in Semi-Circular Arc */}
            {records.map((rec, idx) => {
              const pos = getNodePosition(idx);
              const meta = WEALTH_STAT_METADATA[rec.statType];
              const isSelected = selectedStat === rec.statType;
              const rankDisplay = rec.currentRank > 6 ? '6+' : String(rec.currentRank);

              return (
                <g
                  key={rec.statType}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  onClick={() => {
                    soundEngine.playCoinClink(1.0 + idx * 0.05);
                    setSelectedStat(rec.statType);
                  }}
                  className="cursor-pointer"
                  role="button"
                  tabIndex={0}
                  aria-label={`${meta.label} Rank ${rec.currentRank} ${rec.title} (${rec.points} points)`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setSelectedStat(rec.statType);
                    }
                  }}
                >
                  {/* Outer Circular Node Ring */}
                  <circle
                    r={isSelected ? 49 : 45}
                    fill="#121826"
                    stroke={isSelected ? '#E5B84B' : meta.accentHex}
                    strokeWidth={isSelected ? 3 : 1.8}
                  />

                  {/* Massive Bold Serif Rank Number (Left-anchored inside upper hemisphere) */}
                  <text
                    x="-22"
                    y="-4"
                    textAnchor="middle"
                    fill="#F4F1EA"
                    fontSize={rankDisplay.length > 1 ? '18' : '22'}
                    fontWeight="800"
                    style={{ fontFamily: 'Fraunces, serif' }}
                  >
                    {rankDisplay}
                  </text>

                  {/* Stat Name (Start-aligned with clean gap from Rank Number) */}
                  <text
                    x="-8"
                    y="-7"
                    textAnchor="start"
                    fill={isSelected ? '#E5B84B' : '#CBD5E1'}
                    fontSize="9"
                    fontWeight="700"
                  >
                    {meta.label}
                  </text>

                  {/* Clean Horizontal Divider Rule */}
                  <line
                    x1="-33"
                    y1="4"
                    x2="33"
                    y2="4"
                    stroke="#E5B84B"
                    strokeOpacity="0.55"
                    strokeWidth="1"
                  />

                  {/* Current Rank Title (including Visionary+, Visionary++ Over-Rank suffix) */}
                  <text
                    x="0"
                    y="18"
                    textAnchor="middle"
                    fill="#F4F1EA"
                    fontSize="10"
                    fontWeight="600"
                    style={{ fontFamily: 'Fraunces, serif' }}
                  >
                    {rec.title}
                  </text>

                  {/* Tabular Points Counter */}
                  <text
                    x="0"
                    y="31"
                    textAnchor="middle"
                    fill="#94A3B8"
                    fontSize="8.5"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {rec.points} pts
                  </text>
                </g>
              );
            })}

            {/* Central Stylized Profile Silhouette / Royal Emblem at Bottom-Center */}
            <g transform={`translate(${centerX}, ${centerY})`}>
              <circle r="48" fill="#151D2E" stroke="#E5B84B" strokeWidth="2.5" />
              {/* Stylized Crown & Profile Bust */}
              <path
                d="M -18 -18 L -10 -8 L 0 -22 L 10 -8 L 18 -18 L 14 -2 L -14 -2 Z"
                fill="#E5B84B"
              />
              <circle cx="0" cy="10" r="10" fill="#F4F1EA" />
              <path
                d="M -22 38 C -22 22, 22 22, 22 38 Z"
                fill="#CBD5E1"
              />
            </g>
          </svg>
        </div>

        {/* Right 5 Cols: Selected Virtue Inspector & Over-Rank Progression Matrix */}
        <div className="flex flex-col justify-between space-y-4 lg:col-span-5">
          <div className="rounded-2xl border border-slate-800 bg-[#141B2D] p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {React.createElement(STAT_ICONS[selectedStat], {
                  className: 'h-5 w-5 text-[#E5B84B]',
                })}
                <span
                  className="text-xl font-bold text-[#F4F1EA]"
                  style={{ fontFamily: 'Fraunces, serif' }}
                >
                  {selectedMeta.label}
                </span>
              </div>
              <span className="font-mono text-sm font-semibold tabular-nums text-[#E5B84B]">
                Rank {selectedDetails.rank} · {selectedDetails.title}
              </span>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-[#94A3B8]">
              {selectedMeta.earningRule}
            </p>

            {/* Progress Bar toward Next Rank */}
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-xs font-mono tabular-nums text-[#CBD5E1]">
                <span>{wealthStatPoints[selectedStat] ?? 0} pts</span>
                <span>
                  Next Rank at {selectedDetails.nextRankCeiling} pts ({selectedDetails.pointsToNextRank} to go)
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#0B0F17]">
                <motion.div
                  className="h-full rounded-full bg-[#E5B84B]"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round(selectedDetails.progressRatio * 100)}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </div>

            {/* Quick Interactive Coin Ceremony Trigger for Selected Virtue */}
            <div className="mt-4 flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() =>
                  handleSimulateStatBoost(
                    selectedStat,
                    15,
                    `Manual ${selectedMeta.label} Virtue Milestone (+15 pts)`
                  )
                }
                className="flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#E5B84B]/15 px-3.5 py-2 text-xs font-semibold text-[#E5B84B] hover:bg-[#E5B84B]/25 transition-colors"
              >
                <Coins className="h-3.5 w-3.5" />
                <span>Award +15 {selectedMeta.label} Coins</span>
              </button>

              {selectedStat === WealthStatType.INSIGHT && (
                <button
                  type="button"
                  onClick={() =>
                    handleSimulateStatBoost(
                      WealthStatType.INSIGHT,
                      250,
                      'Major Portfolio Rebalance (Over-Rank 6+ Ascension)'
                    )
                  }
                  className="flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#C084FC]/40 bg-[#C084FC]/10 px-3.5 py-2 text-xs font-semibold text-[#C084FC] hover:bg-[#C084FC]/20 transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Ascend Over-Rank (+250 pts)</span>
                </button>
              )}
            </div>
          </div>

          {/* Recent Wealth Virtue Coin Ceremony Log */}
          <div className="rounded-2xl border border-slate-800 bg-[#141B2D] p-4">
            <h3 className="mb-2.5 text-xs font-semibold text-[#94A3B8]">
              Recent Virtue Point Awards
            </h3>
            <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
              {wealthStatEvents.slice(0, 5).map((ev) => {
                const meta = WEALTH_STAT_METADATA[ev.statType];
                return (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2 last:border-none last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-[#F4F1EA]">
                        {ev.reason}
                      </p>
                      <p className="text-[11px] text-[#94A3B8]">
                        {meta.label} · {ev.newTitle}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-xs font-bold tabular-nums text-[#E5B84B]">
                      +{ev.deltaPoints} pts
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const WealthStatsRadialModal: React.FC = () => {
  const isOpen = useBeeblyStore((s) => s.isWealthModalOpen);
  const closeWealthModal = useBeeblyStore((s) => s.closeWealthModal);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="wealth-stats-global-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Royal Wealth Virtues Radial Menu"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-md"
        >
          <div className="my-auto w-full max-w-5xl">
            <WealthStatsStageContent isModal={true} onClose={closeWealthModal} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
