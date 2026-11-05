import {
  CategoryBudgetItem,
  LegacySheetMapping,
  LegacySheetMappingSchema,
  TransactionRecord,
  UserProfile,
} from '../types/domain';
import { centsToDollars } from './budget-calculator';

export interface DriveSpreadsheetFile {
  id: string;
  name: string;
  modifiedTime?: string;
}

/**
 * Lists Google Spreadsheets accessible to the user via Google Drive API v3.
 */
export async function listUserSpreadsheets(accessToken: string): Promise<DriveSpreadsheetFile[]> {
  const query = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&pageSize=15&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Failed to list Google Drive spreadsheets (${res.status}): ${errBody}`);
  }

  const data = (await res.json()) as { files?: DriveSpreadsheetFile[] };
  return data.files ?? [];
}

/**
 * Reads metadata and top rows from an arbitrary Google Spreadsheet (without assuming "Sheet1" tab name)
 * so our backend AI schema-mapper can parse unknown legacy budget formats.
 */
export async function fetchSpreadsheetStructuralSample(
  accessToken: string,
  spreadsheetId: string
): Promise<{
  title: string;
  sheetNames: string[];
  sampleRowsByTab: Record<string, string[][]>;
}> {
  // 1. Fetch spreadsheet metadata to discover actual sheet tab names
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties.title`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!metaRes.ok) {
    throw new Error(`Could not read spreadsheet metadata (${metaRes.status}). Check your spreadsheet ID and permissions.`);
  }

  const metaJson = (await metaRes.json()) as {
    properties?: { title?: string };
    sheets?: Array<{ properties?: { title?: string } }>;
  };

  const title = metaJson.properties?.title ?? 'Imported Spreadsheet';
  const sheetNames = (metaJson.sheets ?? [])
    .map((s) => s.properties?.title)
    .filter((t): t is string => Boolean(t));

  const tabsToSample = sheetNames.slice(0, 3);
  const sampleRowsByTab: Record<string, string[][]> = {};

  for (const tabName of tabsToSample) {
    const encodedRange = encodeURIComponent(`'${tabName}'!A1:H35`);
    const valRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (valRes.ok) {
      const valJson = (await valRes.json()) as { values?: string[][] };
      sampleRowsByTab[tabName] = valJson.values ?? [];
    }
  }

  return {
    title,
    sheetNames,
    sampleRowsByTab,
  };
}

/**
 * Sends a structural sample of an arbitrary spreadsheet (or pasted CSV/table cells)
 * to our backend AI Schema Mapper (`/api/sheets/parse`) and validates the response with Zod.
 */
export async function parseArbitrarySheetWithAI(payload: {
  title: string;
  sampleDataText: string;
}): Promise<LegacySheetMapping> {
  const res = await fetch('/api/sheets/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to parse legacy spreadsheet' }));
    throw new Error(err.error || 'Failed to parse spreadsheet layout');
  }

  const raw = await res.json();
  return LegacySheetMappingSchema.parse(raw);
}

/**
 * Mode 2: Creates a brand new formatted `beebly Financial Ledger` spreadsheet in the user's Google Drive
 * and populates initial tabs (`beebly_Transactions`, `beebly_Budgets`).
 */
export async function createBeeblyFinancialLedgerSheet(params: {
  accessToken: string;
  user: UserProfile;
  categoryBudgets: CategoryBudgetItem[];
  transactions: TransactionRecord[];
}): Promise<{ spreadsheetId: string; spreadsheetUrl: string; title: string }> {
  const { accessToken, user, categoryBudgets, transactions } = params;
  const title = `beebly Financial Ledger — ${user.name}`;

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [
        { properties: { title: 'beebly_Transactions' } },
        { properties: { title: 'beebly_Budgets' } },
      ],
    }),
  });

  if (!createRes.ok) {
    const txt = await createRes.text();
    throw new Error(`Failed to provision Google Sheet (${createRes.status}): ${txt}`);
  }

  const created = (await createRes.json()) as {
    spreadsheetId: string;
    spreadsheetUrl?: string;
  };

  await syncAllRecordsToSheet({
    accessToken,
    spreadsheetId: created.spreadsheetId,
    categoryBudgets,
    transactions,
  });

  return {
    spreadsheetId: created.spreadsheetId,
    spreadsheetUrl:
      created.spreadsheetUrl ?? `https://docs.google.com/spreadsheets/d/${created.spreadsheetId}`,
    title,
  };
}

/**
 * Mode 2 Live Sync: Writes or appends current transactions and category budgets to the connected Google Sheet
 * with resilient exponential backoff retry logic.
 */
export async function syncAllRecordsToSheet(params: {
  accessToken: string;
  spreadsheetId: string;
  categoryBudgets: CategoryBudgetItem[];
  transactions: TransactionRecord[];
}): Promise<{ syncedCount: number }> {
  const { accessToken, spreadsheetId, categoryBudgets, transactions } = params;

  // Discover first tab or `beebly_Transactions` tab
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  let targetTab = 'beebly_Transactions';
  if (metaRes.ok) {
    const meta = (await metaRes.json()) as {
      sheets?: Array<{ properties?: { title?: string } }>;
    };
    const existingTabs = (meta.sheets ?? [])
      .map((s) => s.properties?.title)
      .filter((t): t is string => Boolean(t));
    if (!existingTabs.includes('beebly_Transactions') && existingTabs.length > 0) {
      targetTab = existingTabs[0];
    }
  }

  const txRows: string[][] = [
    ['Transaction ID', 'Timestamp', 'Type', 'Category', 'SubType', 'Merchant', 'Amount', 'Planned Future', 'Notes'],
    ...transactions.map((tx) => [
      tx.id,
      tx.occurredAt,
      tx.type,
      tx.category,
      tx.subType,
      tx.merchant,
      centsToDollars(tx.amountCents, false),
      tx.isPlannedFuture ? 'YES' : 'NO',
      tx.notes,
    ]),
    [],
    ['Category Budget Configuration', 'Monthly Cap ($)'],
    ...categoryBudgets.map((cb) => [
      cb.category,
      cb.monthlyLimitCents !== null ? centsToDollars(cb.monthlyLimitCents, false) : 'UNCAPPED (Bookkeeping)',
    ]),
  ];

  const encodedRange = encodeURIComponent(`'${targetTab}'!A1`);

  let attempt = 0;
  while (attempt < 3) {
    attempt++;
    const putRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: txRows,
        }),
      }
    );

    if (putRes.ok) {
      return { syncedCount: transactions.length };
    }

    if (attempt >= 3) {
      const errText = await putRes.text();
      throw new Error(`Google Sheets sync failed (${putRes.status}): ${errText}`);
    }
    await new Promise((r) => setTimeout(r, 400 * attempt));
  }

  return { syncedCount: transactions.length };
}
