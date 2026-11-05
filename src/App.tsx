/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  Compass,
  Coins,
  FileSpreadsheet,
  LayoutDashboard,
  Train,
} from 'lucide-react';
import { CameraStage } from './components/layout/CameraStage';
import { WelcomeCalendar } from './components/calendar/WelcomeCalendar';
import {
  WealthStatsRadialModal,
  WealthStatsStageContent,
} from './components/wealth-stats/WealthStatsRadialModal';
import { CatCompanion } from './components/companion/CatCompanion';
import { OnboardingModal } from './components/onboarding/OnboardingModal';
import { DashboardView } from './components/dashboard/DashboardView';
import { TransitCommandCenter } from './components/transit/TransitCommandCenter';
import { EndOfDayReview } from './components/eod/EndOfDayReview';
import { GoogleSheetsSyncView } from './components/sheets/GoogleSheetsSyncView';
import { useBeeblyStore } from './store/useBeeblyStore';
import { AppCameraRoute } from './lib/motion-configs';

const queryClient = new QueryClient();

const NAV_ITEMS: ReadonlyArray<{
  id: AppCameraRoute;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'dashboard', label: 'Ledger', icon: LayoutDashboard },
  { id: 'transit', label: 'Transit', icon: Train },
  { id: 'eod', label: 'EOD Review', icon: Compass },
  { id: 'wealth-stats', label: 'Virtues', icon: Coins },
  { id: 'sheets', label: 'Sheets Sync', icon: FileSpreadsheet },
];

export default function App() {
  const activeRoute = useBeeblyStore((s) => s.activeRoute);
  const setActiveRoute = useBeeblyStore((s) => s.setActiveRoute);
  const reopenWelcomeCalendar = useBeeblyStore((s) => s.reopenWelcomeCalendar);
  const isWelcomeCalendarOpen = useBeeblyStore((s) => s.isWelcomeCalendarOpen);

  const headerDateFormatted = useMemo(() => {
    const now = new Date();
    const weekday = now.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    const monthShort = now.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const dayDD = String(now.getDate()).padStart(2, '0');
    const yearYYYY = now.getFullYear();
    return {
      weekday,
      monthShort,
      dayDD,
      yearYYYY,
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <CameraStage>
        {/* Top Bar Contract: 3-Zone Header (Brand Wordmark — 5 Single-Line Nav Links — Top-Right Date Badge) */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-8 border-b border-slate-800/80 bg-[#0B0F17]/85 px-4 backdrop-blur-md md:px-8">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveRoute('dashboard');
            }}
            className="shrink-0 whitespace-nowrap text-xl font-extrabold tracking-tight text-[#E5B84B]"
            style={{ fontFamily: 'Fraunces, serif' }}
          >
            beebly
          </a>

          {/* Zone 2: 5 concise single-line text navigation links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden items-center gap-6 text-sm font-medium text-[#CBD5E1] md:flex"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = activeRoute === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveRoute(item.id)}
                  className={`shrink-0 whitespace-nowrap py-1 transition-colors ${
                    isActive
                      ? 'border-b-2 border-[#E5B84B] font-semibold text-[#F4F1EA]'
                      : 'text-[#94A3B8] hover:text-[#F4F1EA]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Exclusive Date Display in the Top Right of the Header */}
          <div className="flex shrink-0 items-center">
            {!isWelcomeCalendarOpen && (
              <motion.button
                type="button"
                layoutId="beebly-calendar-badge"
                data-testid="header-top-right-date"
                onClick={reopenWelcomeCalendar}
                aria-label="Replay Daily Welcome Calendar"
                className="flex min-h-[38px] shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border border-[#E5B84B]/50 bg-[#121826] px-3.5 py-1.5 text-xs font-bold text-[#F4F1EA] shadow-sm transition-colors hover:border-[#FACC15]"
              >
                <span className="font-mono uppercase tracking-wider text-[#94A3B8]">
                  {headerDateFormatted.weekday}
                </span>
                <span
                  className="font-mono text-sm font-black tabular-nums text-[#FACC15]"
                  style={{ fontFamily: 'Fraunces, serif' }}
                >
                  {headerDateFormatted.monthShort} {headerDateFormatted.dayDD}
                </span>
                <span className="font-mono text-[11px] tabular-nums text-[#94A3B8]">
                  {headerDateFormatted.yearYYYY}
                </span>
              </motion.button>
            )}
          </div>
        </header>

        {/* Main Responsive Viewport Canvas */}
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-16">
          {activeRoute === 'dashboard' && <DashboardView />}
          {activeRoute === 'transit' && <TransitCommandCenter />}
          {activeRoute === 'eod' && <EndOfDayReview />}
          {activeRoute === 'wealth-stats' && <WealthStatsStageContent isModal={false} />}
          {activeRoute === 'sheets' && <GoogleSheetsSyncView />}
        </main>

        {/* Mobile Ergonomic Bottom Navigation Bar */}
        <nav
          aria-label="Mobile Bottom Navigation"
          className="fixed bottom-0 left-0 right-0 z-30 grid h-16 grid-cols-5 items-center border-t border-slate-800 bg-[#0B0F17]/95 px-2 backdrop-blur-md md:hidden"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeRoute === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveRoute(item.id)}
                className={`flex min-h-[44px] flex-col items-center justify-center rounded-xl transition-colors ${
                  isActive ? 'text-[#E5B84B]' : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="mt-1 whitespace-nowrap text-[10px] font-medium tracking-tight">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Global Overlays & Expressive Pixel-Art Cat Companion */}
        <WelcomeCalendar />
        <WealthStatsRadialModal />
        <OnboardingModal />
        <CatCompanion />
      </CameraStage>
    </QueryClientProvider>
  );
}
