import React, { useState } from 'react';
import { Download, Smartphone } from 'lucide-react';
import { usePWAInstall } from './usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-[#E5B84B] px-4 py-2 text-xs font-bold text-[#0B0F17] shadow-sm transition-transform active:scale-95"
      >
        <Download className="h-4 w-4" />
        <span>Install beebly App</span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuide(true)}
        className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-[#0B0F17] px-4 py-2 text-xs font-semibold text-slate-300 hover:border-[#E5B84B] hover:text-white"
      >
        <Smartphone className="h-4 w-4 text-[#E5B84B]" />
        <span>{isIOS ? 'Install on iPhone / iPad' : 'Install as Mobile PWA'}</span>
      </button>

      {showGuide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Install beebly as a Progressive Web App"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-sm rounded-3xl border border-[#E5B84B]/40 bg-[#121826] p-6 shadow-2xl">
            <h3
              className="text-lg font-bold text-[#F4F1EA]"
              style={{ fontFamily: 'Fraunces, serif' }}
            >
              Install beebly on Home Screen
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-[#CBD5E1]">
              1. Open your browser&apos;s <strong>Share</strong> or <strong>Menu (⋮)</strong>.<br />
              2. Select <strong>Add to Home Screen</strong> or <strong>Install App</strong> to launch beebly in full-screen standalone portrait mode.
            </p>
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-4 min-h-[42px] w-full rounded-xl bg-[#E5B84B] py-2 text-xs font-bold text-[#0B0F17]"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
