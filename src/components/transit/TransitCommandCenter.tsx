import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Train,
  Bus,
  ArrowRight,
  Check,
  Sparkles,
  RefreshCw,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { TransitAgency } from '../../types/domain';
import {
  calculateTransitFare,
  findPredictiveCommute,
  getStationsForAgency,
} from '../../lib/transit-engine';
import { centsToDollars, dollarsToCents } from '../../lib/budget-calculator';
import { useBeeblyStore } from '../../store/useBeeblyStore';

export const TransitCommandCenter: React.FC = () => {
  const transitLogs = useBeeblyStore((s) => s.transitLogs);
  const transitPatterns = useBeeblyStore((s) => s.transitPatterns);
  const logTransitCommute = useBeeblyStore((s) => s.logTransitCommute);

  const [agency, setAgency] = useState<TransitAgency>(TransitAgency.GO_TRANSIT);
  const stations = useMemo(() => getStationsForAgency(agency), [agency]);

  const [originStop, setOriginStop] = useState<string>(stations[4]?.name ?? stations[0].name);
  const [destinationStop, setDestinationStop] = useState<string>(stations[0].name);
  const [overrideFareInput, setOverrideFareInput] = useState<string>('');
  const [isOverridingFare, setIsOverridingFare] = useState(false);
  const [justLoggedBanner, setJustLoggedBanner] = useState<string | null>(null);

  const handleAgencyChange = (nextAgency: TransitAgency) => {
    setAgency(nextAgency);
    const list = getStationsForAgency(nextAgency);
    setOriginStop(list[0]?.name ?? '');
    setDestinationStop(list[1]?.name ?? list[0]?.name ?? '');
    setIsOverridingFare(false);
  };

  const fareCalc = useMemo(
    () =>
      calculateTransitFare({
        agency,
        originStopName: originStop,
        destinationStopName: destinationStop,
        recentLogs: transitLogs,
        referenceTime: new Date(),
      }),
    [agency, originStop, destinationStop, transitLogs]
  );

  const predictiveSuggestion = useMemo(
    () => findPredictiveCommute(transitPatterns, new Date()),
    [transitPatterns]
  );

  const handleConfirmCalculatedCommute = () => {
    const finalCents =
      isOverridingFare && overrideFareInput.trim()
        ? dollarsToCents(overrideFareInput)
        : fareCalc.calculatedFareCents;

    logTransitCommute({
      agency,
      originStop,
      destinationStop,
      calculatedFareCents: fareCalc.calculatedFareCents,
      actualFareCents: finalCents,
      wasPredicted: false,
      oneFareApplied: fareCalc.oneFareApplied,
    });

    setJustLoggedBanner(
      `Logged ${originStop} → ${destinationStop} (${centsToDollars(finalCents)})`
    );
    setIsOverridingFare(false);
    setOverrideFareInput('');
    setTimeout(() => setJustLoggedBanner(null), 3500);
  };

  const handleOneTapPredictedConfirm = () => {
    if (!predictiveSuggestion) return;
    const { pattern } = predictiveSuggestion;
    logTransitCommute({
      agency: pattern.agency,
      originStop: pattern.originStop,
      destinationStop: pattern.destinationStop,
      calculatedFareCents: pattern.standardFareCents,
      actualFareCents: pattern.standardFareCents,
      wasPredicted: true,
      oneFareApplied: false,
    });

    setJustLoggedBanner(
      `One-tap commute confirmed: ${pattern.originStop} → ${pattern.destinationStop} (${centsToDollars(
        pattern.standardFareCents
      )})`
    );
    setTimeout(() => setJustLoggedBanner(null), 3500);
  };

  return (
    <div className="space-y-6">
      {/* High-Confidence Pattern Predictor Card (Bypasses manual station selection!) */}
      {predictiveSuggestion && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-[#2DD4BF]/40 bg-[#111C28] p-5 shadow-xl"
        >
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-[#2DD4BF]">
                <Sparkles className="h-3.5 w-3.5" />
                <span>High-Confidence Commute Pattern Detected ({predictiveSuggestion.pattern.confidenceCount}x Weekday Match)</span>
              </div>
              <h2
                className="text-lg font-bold text-[#F4F1EA] md:text-xl"
                style={{ fontFamily: 'Fraunces, serif' }}
              >
                {predictiveSuggestion.promptText}
              </h2>
              <p className="text-xs text-[#94A3B8]">
                One-tap confirmation bypasses station selection and records directly to your Transit ledger.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2.5">
              <button
                type="button"
                onClick={handleOneTapPredictedConfirm}
                className="flex min-h-[44px] items-center gap-2 rounded-2xl bg-[#2DD4BF] px-5 py-2.5 text-xs font-bold text-[#0B0F17] shadow-lg transition-transform active:scale-95"
              >
                <Check className="h-4 w-4" />
                <span>Yes, Confirm ({centsToDollars(predictiveSuggestion.pattern.standardFareCents)})</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {justLoggedBanner && (
        <div
          role="status"
          className="flex items-center justify-between rounded-2xl border border-[#34D399]/50 bg-[#0D231E] px-4 py-3 text-xs font-medium text-[#34D399]"
        >
          <span>{justLoggedBanner}</span>
          <Check className="h-4 w-4" />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Station-to-Station Fare Calculator & Logger (7 Cols) */}
        <div className="rounded-3xl border border-slate-800 bg-[#121826] p-6 shadow-xl lg:col-span-7">
          <div className="mb-4">
            <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
              <span>PRESTO Matrix</span>
              <span>·</span>
              <span>Ontario One Fare &amp; 2-Hour Transfer Engine</span>
            </div>
            <h2
              className="mt-1 text-xl font-bold text-[#F4F1EA]"
              style={{ fontFamily: 'Fraunces, serif' }}
            >
              Station-to-Station Fare Calculator
            </h2>
          </div>

          {/* Mode Selector Tabs */}
          <div className="mb-5 grid grid-cols-3 gap-2 rounded-2xl bg-[#0B0F17] p-1.5">
            {(
              [
                { id: TransitAgency.GO_TRANSIT, label: 'GO Transit', icon: Train },
                { id: TransitAgency.TTC_SUBWAY, label: 'TTC Subway', icon: Train },
                { id: TransitAgency.TTC_BUS, label: 'TTC Bus', icon: Bus },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const active = agency === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleAgencyChange(item.id)}
                  className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[#E5B84B] text-[#0B0F17] shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Origin & Destination Selectors */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-xs font-medium text-[#CBD5E1]">
              Origin Station / Stop
              <select
                value={originStop}
                onChange={(e) => setOriginStop(e.target.value)}
                className="mt-1.5 w-full rounded-2xl border border-slate-700 bg-[#0B0F17] px-3.5 py-3 text-sm text-white focus:border-[#E5B84B] focus:outline-none"
              >
                {stations.map((st) => (
                  <option key={st.id} value={st.name}>
                    {st.name} ({st.corridorOrLine})
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-medium text-[#CBD5E1]">
              Destination Station / Stop
              <select
                value={destinationStop}
                onChange={(e) => setDestinationStop(e.target.value)}
                className="mt-1.5 w-full rounded-2xl border border-slate-700 bg-[#0B0F17] px-3.5 py-3 text-sm text-white focus:border-[#E5B84B] focus:outline-none"
              >
                {stations.map((st) => (
                  <option key={st.id} value={st.name}>
                    {st.name} ({st.corridorOrLine})
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Calculated Fare Verification Card */}
          <div className="mt-5 rounded-2xl border border-[#E5B84B]/30 bg-[#0B0F17] p-4">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <div className="text-xs text-[#94A3B8]">
                  Calculated fare:{' '}
                  <strong className="font-mono text-base font-bold tabular-nums text-[#E5B84B]">
                    {centsToDollars(fareCalc.calculatedFareCents)}
                  </strong>
                  . Is this correct?
                </div>
                <div className="mt-1 text-xs text-[#CBD5E1]">
                  {fareCalc.discountReason ?? 'Standard Adult PRESTO Tariff'} · Distance ~
                  {fareCalc.distanceKm} km
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsOverridingFare(!isOverridingFare)}
                  className="min-h-[40px] rounded-xl border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 hover:border-slate-500 hover:text-white"
                >
                  {isOverridingFare ? 'Use Calculated' : 'Override Fare'}
                </button>

                <button
                  type="button"
                  onClick={handleConfirmCalculatedCommute}
                  className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#E5B84B] px-4 py-2 text-xs font-bold text-[#0B0F17] transition-transform active:scale-95"
                >
                  <Check className="h-4 w-4" />
                  <span>Confirm &amp; Log</span>
                </button>
              </div>
            </div>

            {isOverridingFare && (
              <div className="mt-3 border-t border-slate-800 pt-3">
                <label className="block text-xs font-medium text-[#CBD5E1]">
                  Custom Fare Amount ($)
                  <input
                    type="text"
                    value={overrideFareInput}
                    onChange={(e) => setOverrideFareInput(e.target.value)}
                    placeholder={(fareCalc.calculatedFareCents / 100).toFixed(2)}
                    className="mt-1.5 w-44 rounded-xl border border-slate-700 bg-[#121826] px-3 py-2 font-mono text-sm tabular-nums text-white"
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Right 5 Cols: Learned Commute Patterns & Recent PRESTO Tap History */}
        <div className="space-y-6 lg:col-span-5">
          <div className="rounded-3xl border border-slate-800 bg-[#121826] p-5">
            <h3
              className="text-base font-bold text-[#F4F1EA]"
              style={{ fontFamily: 'Fraunces, serif' }}
            >
              Learned Commute Patterns
            </h3>
            <p className="mt-1 text-xs text-[#94A3B8]">
              Routes with 3+ weekday logs unlock instant single-tap commute predictions.
            </p>

            <div className="mt-3 space-y-2.5">
              {transitPatterns.map((pat) => (
                <div
                  key={pat.id}
                  className="flex items-center justify-between gap-2 rounded-2xl border border-slate-800/90 bg-[#0B0F17] p-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-[#F4F1EA]">
                      {pat.originStop} → {pat.destinationStop}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[#94A3B8]">
                      {pat.agency.replace('_', ' ')} · {pat.timeSlot.replace('_', ' ')} ·{' '}
                      <span className="text-[#2DD4BF]">
                        {pat.confidenceCount}x logged
                      </span>
                    </div>
                  </div>
                  <span className="shrink-0 font-mono text-xs font-bold tabular-nums text-[#E5B84B]">
                    {centsToDollars(pat.standardFareCents)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-[#121826] p-5">
            <h3
              className="text-base font-bold text-[#F4F1EA]"
              style={{ fontFamily: 'Fraunces, serif' }}
            >
              Recent Transit Ledger
            </h3>
            <div className="mt-3 space-y-2.5">
              {transitLogs.slice(0, 5).map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5 last:border-none last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-[#F4F1EA]">
                      {log.originStop} → {log.destinationStop}
                    </p>
                    <p className="text-[11px] text-[#94A3B8]">
                      {log.agency.replace('_', ' ')}
                      {log.oneFareApplied ? ' · One Fare ($0 Transfer)' : ''}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-[#F4F1EA]">
                    {centsToDollars(log.actualFareCents)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
