import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  CURRENCIES,
  CurrencyCode,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  Transaction,
  TransactionInput,
  TransactionType,
  VALIDATION_LIMITS,
} from '../types/finance';
import { getTodayDate } from '../lib/format';

interface TransactionModalProps {
  open: boolean;
  editingTransaction: Transaction | null;
  defaultCurrency: CurrencyCode;
  onClose: () => void;
  onSave: (input: TransactionInput, editingId?: string) => Promise<void>;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  open,
  editingTransaction,
  defaultCurrency,
  onClose,
  onSave,
}) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>(defaultCurrency);
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [date, setDate] = useState(getTodayDate());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmount(String(editingTransaction.amount));
      setCurrency(editingTransaction.currency);
      setCategory(editingTransaction.category);
      setDate(editingTransaction.date);
      setNote(editingTransaction.note);
    } else {
      setType('expense');
      setAmount('');
      setCurrency(defaultCurrency);
      setCategory(EXPENSE_CATEGORIES[0]);
      setDate(getTodayDate());
      setNote('');
    }
  }, [open, editingTransaction, defaultCurrency]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const availableCategories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const handleTypeChange = (nextType: TransactionType) => {
    setType(nextType);
    const nextList = nextType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    if (!nextList.includes(category as never)) {
      setCategory(nextList[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Please enter an amount greater than zero.');
      return;
    }
    if (numericAmount > VALIDATION_LIMITS.MAX_AMOUNT) {
      setError('Amount exceeds the maximum supported limit.');
      return;
    }
    if (!VALIDATION_LIMITS.DATE_PATTERN.test(date)) {
      setError('Please pick a valid transaction date.');
      return;
    }

    setSaving(true);
    try {
      await onSave(
        {
          type,
          amount: numericAmount,
          currency,
          category,
          note: note.trim(),
          date,
        },
        editingTransaction?.id,
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save transaction.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tx-modal-title"
    >
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2
            id="tx-modal-title"
            className="text-base font-semibold text-slate-900 dark:text-slate-100"
          >
            {editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
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
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                type === 'expense'
                  ? 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              className={`py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                type === 'income'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Income
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label
                htmlFor="tx-amount"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Amount
              </label>
              <input
                id="tx-amount"
                type="number"
                step="any"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="tx-currency"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Currency
              </label>
              <select
                id="tx-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="tx-category"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Category
              </label>
              <select
                id="tx-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="tx-date"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Date
              </label>
              <input
                id="tx-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="tx-note"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Note
              </label>
              <span className="text-[11px] font-mono tabular-nums text-slate-400">
                {note.length}/{VALIDATION_LIMITS.MAX_NOTE_LENGTH}
              </span>
            </div>
            <input
              id="tx-note"
              type="text"
              maxLength={VALIDATION_LIMITS.MAX_NOTE_LENGTH}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Merchant, description, or reference"
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
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
              {saving ? 'Saving...' : editingTransaction ? 'Save Changes' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
