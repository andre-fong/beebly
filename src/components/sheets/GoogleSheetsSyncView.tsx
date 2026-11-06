import React, { useEffect, useState } from 'react';
import {
  Bell,
  Check,
  CloudUpload,
  FileSpreadsheet,
  Loader2,
  LogOut,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import {
  auth,
  getAccessToken,
  googleSignIn,
  initAuth,
  logoutGoogle,
} from '../../lib/firebase-auth';
import {
  createBeeblyFinancialLedgerSheet,
  DriveSpreadsheetFile,
  fetchSpreadsheetStructuralSample,
  listUserSpreadsheets,
  parseArbitrarySheetWithAI,
  syncAllRecordsToSheet,
} from '../../lib/google-sheets';
import { LegacySheetMapping } from '../../types/domain';
import { useBeeblyStore } from '../../store/useBeeblyStore';
import { PWAInstallButton } from '../pwa/PWAInstallButton';

const SAMPLE_LEGACY_CSV = `Category,Monthly Budget,Current Month Spent,Notes
Apartment Rent,1900.00,1900.00,Fixed Monthly Lease
Groceries & Market,520.00,310.45,Loblaws & St Lawrence Market
Dining & Coffee,280.00,142.20,Downtown lunches
TTC & GO Transit,240.00,168.50,PRESTO Commuter
Investments (TFSA),UNCAPPED,450.00,Wealthsimple XEQT`;

export const GoogleSheetsSyncView: React.FC = () => {
  const user = useBeeblyStore((s) => s.user);
  const categoryBudgets = useBeeblyStore((s) => s.categoryBudgets);
  const transactions = useBeeblyStore((s) => s.transactions);
  const updateUserProfile = useBeeblyStore((s) => s.updateUserProfile);
  const applyLegacySheetImport = useBeeblyStore((s) => s.applyLegacySheetImport);
  const markAllTransactionsSynced = useBeeblyStore((s) => s.markAllTransactionsSynced);

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [googleUserEmail, setGoogleUserEmail] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [driveFiles, setDriveFiles] = useState<DriveSpreadsheetFile[]>([]);
  const [selectedDriveSheetId, setSelectedDriveSheetId] = useState<string>('');

  // Mode 1: AI Legacy Spreadsheet Parser State
  const [rawSampleInput, setRawSampleInput] = useState(SAMPLE_LEGACY_CSV);
  const [aiParsing, setAiParsing] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<LegacySheetMapping | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Mode 2: Confirmation Modal before mutating Google Sheets data (Mandatory per workspace-integration skill)
  const [pendingConfirmAction, setPendingConfirmAction] = useState<
    null | { type: 'CREATE_NEW' | 'SYNC_EXISTING'; description: string }
  >(null);
  const [syncingLive, setSyncingLive] = useState(false);

  useEffect(() => {
    const unsub = initAuth(
      async (u, token) => {
        setAccessToken(token);
        setGoogleUserEmail(u.email);
        try {
          const files = await listUserSpreadsheets(token);
          setDriveFiles(files);
          if (files[0] && !selectedDriveSheetId) {
            setSelectedDriveSheetId(files[0].id);
          }
        } catch {
          // Ignore initial listing error until user interacts
        }
      },
      () => {
        setAccessToken(null);
        setGoogleUserEmail(null);
      }
    );
    return () => unsub();
  }, []);

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setErrorMessage(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setAccessToken(res.accessToken);
        setGoogleUserEmail(res.user.email);
        const files = await listUserSpreadsheets(res.accessToken);
        setDriveFiles(files);
        if (files[0]) setSelectedDriveSheetId(files[0].id);
        setStatusMessage('Connected to Google Drive & Google Sheets!');
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Google Sign-In was cancelled or failed.'
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleParseSelectedDriveSheet = async () => {
    if (!accessToken || !selectedDriveSheetId) return;
    setAiParsing(true);
    setErrorMessage(null);
    try {
      const sample = await fetchSpreadsheetStructuralSample(accessToken, selectedDriveSheetId);
      const formattedSample = JSON.stringify(sample.sampleRowsByTab, null, 2);
      const mapping = await parseArbitrarySheetWithAI({
        title: sample.title,
        sampleDataText: formattedSample,
      });
      setParsedPreview(mapping);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to parse Google Sheet.');
    } finally {
      setAiParsing(false);
    }
  };

  const handleParseRawSampleWithAI = async () => {
    if (!rawSampleInput.trim()) return;
    setAiParsing(true);
    setErrorMessage(null);
    try {
      const mapping = await parseArbitrarySheetWithAI({
        title: 'Legacy Personal Budget Sheet',
        sampleDataText: rawSampleInput,
      });
      setParsedPreview(mapping);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'AI Schema Mapper failed.');
    } finally {
      setAiParsing(false);
    }
  };

  const handleConfirmLegacyImport = () => {
    if (!parsedPreview) return;
    applyLegacySheetImport(parsedPreview, selectedDriveSheetId || undefined);
    setStatusMessage(
      `Imported ${parsedPreview.categoryBudgets.length} category budgets and ${parsedPreview.transactions.length} transactions from "${parsedPreview.detectedSheetTitle}"!`
    );
    setParsedPreview(null);
  };

  const executeConfirmedSheetMutation = async () => {
    if (!pendingConfirmAction) return;
    const action = pendingConfirmAction;
    setPendingConfirmAction(null);
    setSyncingLive(true);
    setErrorMessage(null);

    try {
      const token = accessToken ?? (await getAccessToken());
      if (!token) {
        throw new Error('Please sign in with Google first to write to Google Sheets.');
      }

      if (action.type === 'CREATE_NEW') {
        const created = await createBeeblyFinancialLedgerSheet({
          accessToken: token,
          user,
          categoryBudgets,
          transactions,
        });
        markAllTransactionsSynced(created.spreadsheetId, created.title);
        setSelectedDriveSheetId(created.spreadsheetId);
        setStatusMessage(`Created & synced "${created.title}" in your Google Drive!`);
      } else {
        const targetId = user.googleSheetId || selectedDriveSheetId;
        if (!targetId) {
          throw new Error('Select a target Google Spreadsheet first.');
        }
        const res = await syncAllRecordsToSheet({
          accessToken: token,
          spreadsheetId: targetId,
          categoryBudgets,
          transactions,
        });
        markAllTransactionsSynced(targetId, user.googleSheetName || 'Linked Ledger');
        setStatusMessage(`Synced ${res.syncedCount} transactions to Google Sheets!`);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Google Sheets sync failed.');
    } finally {
      setSyncingLive(false);
    }
  };

  const handleTestWebPushNotification = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setStatusMessage('In-app EOD Accountability Reminder scheduled for ' + user.eodReminderTime);
      return;
    }
    if (Notification.permission === 'granted') {
      new Notification('beebly · End of Day Review', {
        body: "Time to verify today's PRESTO commute and log your Wallet expenses!",
      });
      setStatusMessage('Sent live browser notification!');
    } else {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        new Notification('beebly · End of Day Review', {
          body: "Notifications enabled! Mochi will nudge you at " + user.eodReminderTime,
        });
        setStatusMessage('Web Push notifications enabled!');
      } else {
        setStatusMessage('In-app EOD Accountability Reminder active for ' + user.eodReminderTime);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Mandatory Confirmation Dialog for Mutating Google Sheets Operations */}
      {pendingConfirmAction && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm Google Sheets Update"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-3xl border border-[#E5B84B]/50 bg-[#121826] p-6 shadow-2xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#E5B84B]">
              <ShieldAlert className="h-4 w-4" />
              <span>Confirm Google Workspace Write Operation</span>
            </div>
            <h3
              className="mt-2 text-lg font-bold text-[#F4F1EA]"
              style={{ fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif" }}
            >
              Update Google Spreadsheet Data?
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-[#CBD5E1]">
              {pendingConfirmAction.description}
            </p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingConfirmAction(null)}
                className="min-h-[42px] rounded-xl border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeConfirmedSheetMutation}
                className="min-h-[42px] rounded-xl bg-[#E5B84B] px-5 py-2 text-xs font-bold text-[#0B0F17]"
              >
                Confirm &amp; Sync
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Google OAuth Connection Card */}
      <div className="rounded-3xl border border-slate-800 bg-[#121826] p-6 shadow-xl">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#34D399]">
              <span>Google Sheets API v4 &amp; Drive Integration</span>
              <span>·</span>
              <span>Bi-Directional Ledger Sync</span>
            </div>
            <h2
              className="mt-1 text-2xl font-bold text-[#F4F1EA]"
              style={{ fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif" }}
            >
              Google Spreadsheet Synchronization
            </h2>
            <p className="mt-1 text-xs text-[#94A3B8]">
              Ingest legacy spreadsheets of any format using AI schema mapping, or maintain a live two-way sync with your personal Google Drive.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!accessToken ? (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={authLoading}
                className="gsi-material-button flex min-h-[44px] items-center gap-3 rounded-2xl border border-slate-600 bg-white px-4 py-2.5 text-xs font-semibold text-slate-900 shadow-md hover:bg-slate-100 transition-colors"
              >
                <svg className="h-4 w-4" viewBox="0 0 48 48">
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                </svg>
                <span>{authLoading ? 'Connecting...' : 'Sign in with Google'}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#34D399]">
                  Connected: {googleUserEmail ?? 'Google Account'}
                </span>
                <button
                  type="button"
                  onClick={logoutGoogle}
                  aria-label="Sign out of Google"
                  className="flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-700 bg-[#0B0F17] px-3 py-2 text-xs text-slate-300 hover:text-white"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Disconnect</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {statusMessage && (
          <div className="mt-4 rounded-xl border border-[#34D399]/40 bg-[#0D231E] px-4 py-2.5 text-xs text-[#34D399]">
            {statusMessage}
          </div>
        )}
        {errorMessage && (
          <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-950/40 px-4 py-2.5 text-xs text-rose-300">
            {errorMessage}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Mode 1: Intelligent Legacy Spreadsheet Ingestion (Quick Start) */}
        <div className="rounded-3xl border border-slate-800 bg-[#121826] p-6 shadow-xl lg:col-span-7">
          <div className="text-xs text-[#E5B84B]">Mode 1 · Quick-Start Legacy Ingestion</div>
          <h3
            className="mt-1 text-lg font-bold text-[#F4F1EA]"
            style={{ fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif" }}
          >
            AI Arbitrary Spreadsheet Schema Mapper
          </h3>
          <p className="mt-1 text-xs text-[#94A3B8]">
            Select an existing Google Sheet or paste raw rows from any custom budgeting template. Our AI mapper extracts your categories, uncapped vs. capped limits, and transactions.
          </p>

          {accessToken && driveFiles.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <select
                value={selectedDriveSheetId}
                onChange={(e) => setSelectedDriveSheetId(e.target.value)}
                aria-label="Select a Google Spreadsheet from Drive"
                className="min-h-[42px] flex-1 rounded-xl border border-slate-700 bg-[#0B0F17] px-3 py-2 text-xs text-white"
              >
                {driveFiles.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={aiParsing}
                onClick={handleParseSelectedDriveSheet}
                className="flex min-h-[42px] items-center gap-1.5 rounded-xl bg-[#E5B84B] px-4 py-2 text-xs font-bold text-[#0B0F17]"
              >
                {aiParsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                <span>Map Selected Drive Sheet</span>
              </button>
            </div>
          )}

          <div className="mt-4">
            <label className="block text-xs font-medium text-[#CBD5E1]">
              Or Test / Paste Arbitrary Legacy Spreadsheet Cells (CSV / TSV)
              <textarea
                rows={5}
                value={rawSampleInput}
                onChange={(e) => setRawSampleInput(e.target.value)}
                className="mt-1.5 w-full rounded-2xl border border-slate-700 bg-[#0B0F17] p-3 font-mono text-xs text-slate-200 focus:border-[#E5B84B] focus:outline-none"
              />
            </label>

            <button
              type="button"
              disabled={aiParsing}
              onClick={handleParseRawSampleWithAI}
              className="mt-3 flex min-h-[44px] items-center gap-2 rounded-2xl bg-[#E5B84B]/15 px-4 py-2.5 text-xs font-semibold text-[#E5B84B] hover:bg-[#E5B84B]/25"
            >
              {aiParsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              <span>Run AI Schema Mapper on Sample</span>
            </button>
          </div>

          {parsedPreview && (
            <div className="mt-4 rounded-2xl border border-[#E5B84B]/40 bg-[#0B0F17] p-4">
              <div className="text-xs font-bold text-[#E5B84B]">
                Preview Mapped Schema: {parsedPreview.detectedSheetTitle}
              </div>
              <div className="mt-2 text-xs text-[#CBD5E1]">
                • Mapped {parsedPreview.categoryBudgets.length} category limits (including uncapped bookkeeping detection)
                <br />• Extracted {parsedPreview.transactions.length} transactions &amp;{' '}
                {parsedPreview.recurringBills.length} recurring obligations
              </div>
              <button
                type="button"
                onClick={handleConfirmLegacyImport}
                className="mt-3 flex min-h-[42px] items-center gap-1.5 rounded-xl bg-[#34D399] px-4 py-2 text-xs font-bold text-[#0B0F17]"
              >
                <Check className="h-4 w-4" />
                <span>Confirm &amp; Populate beebly Ledger</span>
              </button>
            </div>
          )}
        </div>

        {/* Mode 2: Live Automated Ledger Sync + PWA & Notifications (5 Cols) */}
        <div className="space-y-6 lg:col-span-5">
          <div className="rounded-3xl border border-slate-800 bg-[#121826] p-6 shadow-xl">
            <div className="text-xs text-[#34D399]">Mode 2 · Live Automated Ledger Sync</div>
            <h3
              className="mt-1 text-lg font-bold text-[#F4F1EA]"
              style={{ fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif" }}
            >
              Provision or Sync Google Sheet
            </h3>
            <p className="mt-1 text-xs text-[#94A3B8]">
              Provision a clean <code className="text-[#E5B84B]">beebly Financial Ledger</code> in your Google Drive or sync your {transactions.length} ledger entries now.
            </p>

            <div className="mt-4 space-y-2.5">
              <button
                type="button"
                disabled={syncingLive}
                onClick={() =>
                  setPendingConfirmAction({
                    type: 'CREATE_NEW',
                    description: `This will create a new "beebly Financial Ledger — ${user.name}" spreadsheet in your Google Drive and write ${transactions.length} transactions and ${categoryBudgets.length} category budgets.`,
                  })
                }
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-[#E5B84B] px-4 py-2.5 text-xs font-bold text-[#0B0F17] shadow-md"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Create New beebly Ledger in Google Drive</span>
              </button>

              <button
                type="button"
                disabled={syncingLive}
                onClick={() =>
                  setPendingConfirmAction({
                    type: 'SYNC_EXISTING',
                    description: `This will overwrite/sync the 'beebly_Transactions' ledger tab in your connected Google Spreadsheet with ${transactions.length} current transactions and ${categoryBudgets.length} category caps.`,
                  })
                }
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-[#0B0F17] px-4 py-2.5 text-xs font-semibold text-white hover:border-[#E5B84B]"
              >
                <CloudUpload className="h-4 w-4 text-[#34D399]" />
                <span>Sync {transactions.length} Entries to Connected Sheet</span>
              </button>
            </div>
          </div>

          {/* Daily Accountability Notifications & Motion Accessibility */}
          <div className="rounded-3xl border border-slate-800 bg-[#121826] p-6 shadow-xl">
            <h3
              className="text-base font-bold text-[#F4F1EA]"
              style={{ fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif" }}
            >
              PWA, Notifications &amp; Motion Settings
            </h3>

            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-[#F4F1EA]">
                    Daily EOD Reminder Time
                  </div>
                  <div className="text-[11px] text-[#94A3B8]">
                    Web Push nudge for transit &amp; Wallet OCR review
                  </div>
                </div>
                <input
                  type="time"
                  aria-label="Daily EOD Reminder Time"
                  value={user.eodReminderTime}
                  onChange={(e) => updateUserProfile({ eodReminderTime: e.target.value })}
                  className="rounded-xl border border-slate-700 bg-[#0B0F17] px-3 py-1.5 font-mono text-xs text-white"
                />
              </div>

              <button
                type="button"
                onClick={handleTestWebPushNotification}
                className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-[#0B0F17] px-4 py-2 text-xs font-semibold text-[#E5B84B] hover:border-[#E5B84B]"
              >
                <Bell className="h-4 w-4" />
                <span>Test Daily Accountability Notification</span>
              </button>

              <div className="flex items-center justify-between border-t border-slate-800 pt-3">
                <div>
                  <div className="text-xs font-semibold text-[#F4F1EA]">
                    Performance / Static Camera Mode
                  </div>
                  <div className="text-[11px] text-[#94A3B8]">
                    Reduces 3D stage perspective pans
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => updateUserProfile({ reducedMotion: !user.reducedMotion })}
                  className={`min-h-[38px] rounded-xl px-3.5 py-1.5 text-xs font-bold ${
                    user.reducedMotion
                      ? 'bg-[#E5B84B] text-[#0B0F17]'
                      : 'border border-slate-700 bg-[#0B0F17] text-slate-300'
                  }`}
                >
                  {user.reducedMotion ? 'Static On' : '3D Kinetic On'}
                </button>
              </div>

              <div className="pt-1">
                <PWAInstallButton />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
