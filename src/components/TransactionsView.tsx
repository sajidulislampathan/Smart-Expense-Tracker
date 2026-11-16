import React, { useMemo, useState } from 'react';
import { Download, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import {
  CurrencyCode,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  Transaction,
} from '../types/finance';
import { exportTransactionsCsv, formatCurrency, formatDateShort, formatMonthLabel } from '../lib/format';

interface TransactionsViewProps {
  loading: boolean;
  transactions: Transaction[];
  currency: CurrencyCode;
  month: string;
  onAddTransaction: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (txId: string) => Promise<void>;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  loading,
  transactions,
  currency,
  month,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [scopeAllMonths, setScopeAllMonths] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const allCategories = useMemo(
    () => Array.from(new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES])),
    [],
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (tx.currency !== currency) return false;
      if (!scopeAllMonths && tx.month !== month) return false;
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false;
      if (q) {
        const hay = `${tx.category} ${tx.note} ${tx.date}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, currency, month, scopeAllMonths, typeFilter, categoryFilter, searchQuery]);

  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of filtered) {
      if (tx.type === 'income') income += tx.amount;
      else expense += tx.amount;
    }
    return { income, expense, count: filtered.length };
  }, [filtered]);

  const handleConfirmDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDeleteTransaction(id);
      setConfirmDeleteId(null);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3 animate-pulse">
        {[0, 1, 2, 3, 4].map((idx) => (
          <div key={idx} className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[240px]">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes or category..."
                aria-label="Search transactions"
                className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              {(['all', 'expense', 'income'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    typeFilter === t
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {t === 'all' ? 'All' : t === 'expense' ? 'Expenses' : 'Income'}
                </button>
              ))}
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter by category"
              className="px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="all">All categories</option>
              {allCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setScopeAllMonths((prev) => !prev)}
              className={`px-3 py-2 text-xs font-medium border rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                scopeAllMonths
                  ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {scopeAllMonths ? `All Months (${currency})` : formatMonthLabel(month)}
            </button>
          </div>

          <button
            type="button"
            disabled={filtered.length === 0}
            onClick={() =>
              exportTransactionsCsv(filtered, currency, scopeAllMonths ? 'all-months' : month)
            }
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
          <span>{summary.count} matching entries</span>
          <span aria-hidden="true">·</span>
          <span className="text-emerald-700 dark:text-emerald-400">
            Income: +{formatCurrency(summary.income, currency)}
          </span>
          <span aria-hidden="true">·</span>
          <span className="text-rose-700 dark:text-rose-400">
            Expenses: -{formatCurrency(summary.expense, currency)}
          </span>
        </div>
      </div>

      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center space-y-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No transactions match your current {currency} filters.
            </p>
            <button
              type="button"
              onClick={onAddTransaction}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Transaction</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-6">Date</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Note</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                {filtered.map((tx) => {
                  const isConfirming = confirmDeleteId === tx.id;
                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-3 px-6 font-mono tabular-nums text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {formatDateShort(tx.date)}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {tx.category}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-sm truncate">
                        {tx.note || '—'}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {tx.type === 'income' ? 'Income' : 'Expense'}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono tabular-nums font-medium whitespace-nowrap ${
                          tx.type === 'income'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : '-'}
                        {formatCurrency(tx.amount, tx.currency)}
                      </td>
                      <td className="py-3 px-6 text-right whitespace-nowrap">
                        {isConfirming ? (
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              disabled={deletingId === tx.id}
                              onClick={() => void handleConfirmDelete(tx.id)}
                              className="px-2.5 py-1 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-md cursor-pointer"
                            >
                              {deletingId === tx.id ? 'Deleting...' : 'Confirm'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 text-xs text-slate-600 dark:text-slate-300 hover:underline cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onEditTransaction(tx)}
                              aria-label={`Edit ${tx.category} transaction`}
                              className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 rounded-md cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(tx.id)}
                              aria-label={`Delete ${tx.category} transaction`}
                              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
