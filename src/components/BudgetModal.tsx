import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  Budget,
  BudgetInput,
  CURRENCIES,
  CurrencyCode,
  EXPENSE_CATEGORIES,
  VALIDATION_LIMITS,
} from '../types/finance';

interface BudgetModalProps {
  open: boolean;
  editingBudget: Budget | null;
  defaultMonth: string;
  defaultCurrency: CurrencyCode;
  onClose: () => void;
  onSave: (input: BudgetInput, existingId?: string) => Promise<void>;
}

export const BudgetModal: React.FC<BudgetModalProps> = ({
  open,
  editingBudget,
  defaultMonth,
  defaultCurrency,
  onClose,
  onSave,
}) => {
  const [month, setMonth] = useState(defaultMonth);
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [currency, setCurrency] = useState<CurrencyCode>(defaultCurrency);
  const [limitAmount, setLimitAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editingBudget) {
      setMonth(editingBudget.month);
      setCategory(editingBudget.category);
      setCurrency(editingBudget.currency);
      setLimitAmount(String(editingBudget.limitAmount));
    } else {
      setMonth(defaultMonth);
      setCategory(EXPENSE_CATEGORIES[0]);
      setCurrency(defaultCurrency);
      setLimitAmount('');
    }
  }, [open, editingBudget, defaultMonth, defaultCurrency]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numericLimit = Number(limitAmount);
    if (!Number.isFinite(numericLimit) || numericLimit <= 0) {
      setError('Monthly limit must be greater than zero.');
      return;
    }
    if (numericLimit > VALIDATION_LIMITS.MAX_AMOUNT) {
      setError('Limit exceeds the maximum allowed amount.');
      return;
    }
    if (!VALIDATION_LIMITS.MONTH_PATTERN.test(month)) {
      setError('Please choose a valid month.');
      return;
    }

    setSaving(true);
    try {
      await onSave(
        {
          month,
          category,
          currency,
          limitAmount: numericLimit,
        },
        editingBudget?.id,
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save budget.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="budget-modal-title"
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2
            id="budget-modal-title"
            className="text-base font-semibold text-slate-900 dark:text-slate-100"
          >
            {editingBudget ? 'Edit Monthly Budget' : 'Set Monthly Budget'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="budget-month"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Month
              </label>
              <input
                id="budget-month"
                type="month"
                required
                disabled={Boolean(editingBudget)}
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="budget-currency"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Currency
              </label>
              <select
                id="budget-currency"
                disabled={Boolean(editingBudget)}
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="budget-category"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Expense Category
            </label>
            <select
              id="budget-category"
              disabled={Boolean(editingBudget)}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="budget-limit"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Monthly Spending Limit
            </label>
            <input
              id="budget-limit"
              type="number"
              step="any"
              min="0.01"
              required
              value={limitAmount}
              onChange={(e) => setLimitAmount(e.target.value)}
              placeholder="500.00"
              className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Alerts trigger at 80% warning and 100% limit reached.
            </p>
          </div>

          {error && (
            <p className="text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg px-3.5 py-2.5">
              {error}
            </p>
          )}

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Saving...' : editingBudget ? 'Update Budget' : 'Save Budget'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
