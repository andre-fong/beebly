import { z } from 'zod';

export enum SalaryType {
  HOURLY = 'HOURLY',
  MONTHLY = 'MONTHLY',
  ANNUAL = 'ANNUAL',
}

export enum BudgetCategory {
  RENT = 'RENT',
  GROCERIES = 'GROCERIES',
  DINING = 'DINING',
  ENTERTAINMENT = 'ENTERTAINMENT',
  STUDENT_LOAN = 'STUDENT_LOAN',
  SUBSCRIPTIONS = 'SUBSCRIPTIONS',
  SHOPPING = 'SHOPPING',
  BUSINESS = 'BUSINESS',
  TRANSIT = 'TRANSIT',
  INVESTMENT = 'INVESTMENT',
  MISCELLANEOUS = 'MISCELLANEOUS',
}

export enum BudgetMode {
  TOTAL_ONLY = 'TOTAL_ONLY',
  CATEGORY_ONLY = 'CATEGORY_ONLY',
  HYBRID = 'HYBRID',
}

export enum TransactionType {
  EXPENSE = 'EXPENSE',
  INCOME = 'INCOME',
  RETURN = 'RETURN',
}

export enum TransactionSubType {
  STANDARD = 'STANDARD',
  PHYSICAL_INVESTMENT = 'PHYSICAL_INVESTMENT',
  MARKET_INVESTMENT = 'MARKET_INVESTMENT',
  CHARITY_GIFT = 'CHARITY_GIFT',
  GENEROUS_TIP = 'GENEROUS_TIP',
}

export enum RecurringFrequency {
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
  ANNUAL = 'ANNUAL',
}

export enum TransitAgency {
  GO_TRANSIT = 'GO_TRANSIT',
  TTC_SUBWAY = 'TTC_SUBWAY',
  TTC_BUS = 'TTC_BUS',
}

export enum WealthStatType {
  DISCIPLINE = 'DISCIPLINE',
  INSIGHT = 'INSIGHT',
  KINDNESS = 'KINDNESS',
  PROSPERITY = 'PROSPERITY',
  VITALITY = 'VITALITY',
  FORTITUDE = 'FORTITUDE',
}

export enum CatExpression {
  NEUTRAL = 'Neutral',
  SMILE = 'Smile',
  CURIOUS = 'Curious',
  EXCITED = 'Excited',
  SAD = 'Sad',
  SHOCKED = 'Shocked',
  ANGRY = 'Angry',
}

export enum CatCutInType {
  SURPRISED = 'Surprised',
  FOCUSED = 'Focused',
}

export enum CatSoundCategory {
  MEOW = 'Meow',
  PURR = 'Purr',
  TRILL = 'Trill',
}

export enum DialogueTriggerSource {
  ONBOARDING = 'ONBOARDING',
  EOD_REVIEW = 'EOD_REVIEW',
  HELP_BUTTON = 'HELP_BUTTON',
}

export interface OnboardingFlags {
  name: boolean;
  budgeting: boolean;
  logging: boolean;
  wealthStats: boolean;
  completed: boolean;
}

export interface CategoryBudgetItem {
  id: string;
  category: BudgetCategory;
  /** null means uncapped bookkeeping-only category */
  monthlyLimitCents: number | null;
}

export interface TransactionRecord {
  id: string;
  type: TransactionType;
  category: BudgetCategory;
  subType: TransactionSubType;
  amountCents: number;
  occurredAt: string; // ISO string
  isPlannedFuture: boolean;
  isRecurringInstance: boolean;
  merchant: string;
  notes: string;
  syncedToSheets: boolean;
  retainedIncome: boolean;
}

export interface RecurringTemplateItem {
  id: string;
  title: string;
  category: BudgetCategory;
  amountCents: number;
  frequency: RecurringFrequency;
  nextDueDate: string;
  transitRouteId: string | null;
  active: boolean;
}

export interface TransitLogRecord {
  id: string;
  agency: TransitAgency;
  originStop: string;
  destinationStop: string;
  calculatedFareCents: number;
  actualFareCents: number;
  dayOfWeek: number;
  timeSlot: 'MORNING_RUSH' | 'MIDDAY' | 'EVENING_RUSH' | 'LATE_NIGHT';
  wasPredicted: boolean;
  oneFareApplied: boolean;
  occurredAt: string;
}

export interface TransitPatternRecord {
  id: string;
  dayOfWeek: number;
  timeSlot: 'MORNING_RUSH' | 'MIDDAY' | 'EVENING_RUSH' | 'LATE_NIGHT';
  agency: TransitAgency;
  originStop: string;
  destinationStop: string;
  standardFareCents: number;
  confidenceCount: number;
}

export interface WealthStatRecord {
  statType: WealthStatType;
  points: number;
  currentRank: number;
  title: string;
}

export interface WealthStatEventRecord {
  id: string;
  statType: WealthStatType;
  deltaPoints: number;
  reason: string;
  createdAt: string;
  previousRank: number;
  newRank: number;
  newTitle: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  salaryType: SalaryType;
  salaryAmountCents: number;
  weeklyHours: number;
  budgetMode: BudgetMode;
  totalMonthlyBudgetCents: number | null;
  onboardingState: OnboardingFlags;
  lastWelcomeCalendarDate: string | null;
  googleSheetId: string | null;
  googleSheetName: string | null;
  googleSheetSyncEnabled: boolean;
  reducedMotion: boolean;
  loggingStreakDays: number;
  underBudgetStreakDays: number;
  eodReminderTime: string; // HH:mm
  notificationsEnabled: boolean;
}

// Zod validation schemas for API payloads, OCR outputs, and Google Sheet row parsers
export const CreateTransactionSchema = z.object({
  type: z.nativeEnum(TransactionType),
  category: z.nativeEnum(BudgetCategory),
  subType: z.nativeEnum(TransactionSubType).default(TransactionSubType.STANDARD),
  amountDollars: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid dollar amount (e.g. 14.50)'),
  merchant: z.string().min(1, 'Merchant or description is required').max(120),
  notes: z.string().max(300).default(''),
  occurredAt: z.string().optional(),
  isPlannedFuture: z.boolean().default(false),
  isRecurringInstance: z.boolean().default(false),
  retainedIncome: z.boolean().default(true),
});

export const WalletOcrItemSchema = z.object({
  merchant: z.string(),
  amountDollars: z.string(),
  occurredAt: z.string(),
  category: z.nativeEnum(BudgetCategory),
  subType: z.nativeEnum(TransactionSubType),
  confidence: z.number().min(0).max(1),
});

export const WalletOcrResponseSchema = z.object({
  sourceWallet: z.enum(['APPLE_WALLET', 'GOOGLE_WALLET', 'RECEIPT_LEDGER']),
  transactions: z.array(WalletOcrItemSchema),
  summaryNote: z.string(),
});

export type WalletOcrItem = z.infer<typeof WalletOcrItemSchema>;
export type WalletOcrResponse = z.infer<typeof WalletOcrResponseSchema>;

export const LegacySheetMappingSchema = z.object({
  detectedSheetTitle: z.string(),
  detectedSalaryType: z.nativeEnum(SalaryType).optional(),
  detectedSalaryDollars: z.string().optional(),
  detectedTotalMonthlyBudgetDollars: z.string().optional(),
  categoryBudgets: z.array(
    z.object({
      category: z.nativeEnum(BudgetCategory),
      monthlyLimitDollars: z.string().nullable(),
    })
  ),
  recurringBills: z.array(
    z.object({
      title: z.string(),
      category: z.nativeEnum(BudgetCategory),
      amountDollars: z.string(),
      frequency: z.nativeEnum(RecurringFrequency),
    })
  ),
  transactions: z.array(
    z.object({
      merchant: z.string(),
      amountDollars: z.string(),
      category: z.nativeEnum(BudgetCategory),
      type: z.nativeEnum(TransactionType),
      occurredAt: z.string(),
    })
  ),
});

export type LegacySheetMapping = z.infer<typeof LegacySheetMappingSchema>;
