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

export interface TransactionRow {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  currency: CurrencyCode;
  category: string;
  note: string;
  date: string; // YYYY-MM-DD
  month: string; // YYYY-MM
  created_at: string;
  updated_at: string;
}

export interface BudgetRow {
  id: string;
  user_id: string;
  month: string; // YYYY-MM
  category: string;
  currency: CurrencyCode;
  limit_amount: number;
  created_at: string;
  updated_at: string;
}

export type AlertLevel = 'normal' | 'warning' | 'exceeded';

export interface BudgetProgress {
  budget: BudgetRow;
  spent: number;
  remaining: number;
  percentage: number;
  level: AlertLevel;
}
