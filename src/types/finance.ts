export type CurrencyCode =
  | 'USD'
  | 'BDT'
  | 'EUR'
  | 'GBP'
  | 'INR'
  | 'CAD'
  | 'AUD'
  | 'AED'
  | 'SAR'
  | 'JPY';

export interface CurrencyMeta {
  code: CurrencyCode;
  name: string;
  symbol: string;
  decimals: number;
}

export const CURRENCIES: CurrencyMeta[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2 },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', decimals: 2 },
  { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2 },
  { code: 'GBP', name: 'British Pound', symbol: '£', decimals: 2 },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimals: 2 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimals: 2 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimals: 2 },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED', decimals: 2 },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR', decimals: 2 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimals: 0 },
];

export const CURRENCY_CODES: CurrencyCode[] = CURRENCIES.map((c) => c.code);

export const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Transport',
  'Housing & Rent',
  'Utilities',
  'Healthcare',
  'Shopping',
  'Entertainment',
  'Education',
  'Travel',
  'Subscriptions',
  'Other Expense',
] as const;

export const INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Business',
  'Investments',
  'Gift',
  'Refund',
  'Other Income',
] as const;

export type TransactionType = 'income' | 'expense';

export const VALIDATION_LIMITS = {
  MAX_NOTE_LENGTH: 240,
  MAX_CATEGORY_LENGTH: 48,
  MAX_DISPLAY_NAME_LENGTH: 100,
  MAX_EMAIL_LENGTH: 254,
  MAX_AMOUNT: 1_000_000_000,
  DATE_PATTERN: /^\d{4}-\d{2}-\d{2}$/,
  MONTH_PATTERN: /^\d{4}-\d{2}$/,
} as const;

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  defaultCurrency: CurrencyCode;
  notificationsEnabled: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  currency: CurrencyCode;
  category: string;
  note: string;
  date: string; // YYYY-MM-DD
  month: string; // YYYY-MM
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface TransactionInput {
  type: TransactionType;
  amount: number;
  currency: CurrencyCode;
  category: string;
  note: string;
  date: string;
}

export interface Budget {
  id: string;
  userId: string;
  month: string; // YYYY-MM
  category: string;
  currency: CurrencyCode;
  limitAmount: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface BudgetInput {
  month: string;
  category: string;
  currency: CurrencyCode;
  limitAmount: number;
}

export type BudgetAlertLevel = 'normal' | 'warning' | 'exceeded';

export interface BudgetProgress {
  budget: Budget;
  spent: number;
  remaining: number;
  ratio: number; // 0..1+
  percentage: number;
  level: BudgetAlertLevel;
}

export type AppView = 'dashboard' | 'transactions' | 'budgets' | 'reports';
