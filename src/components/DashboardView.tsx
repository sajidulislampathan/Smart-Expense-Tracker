import React from 'react';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Plus, TrendingUp } from 'lucide-react';
import { BudgetProgress, CurrencyCode, Transaction } from '../types/finance';
import { formatCurrency, formatDateShort, formatMonthLabel } from '../lib/format';
import { CashFlowChart, MonthlyCashFlowPoint } from './Charts';

interface DashboardViewProps {
  loading: boolean;
  currency: CurrencyCode;
  month: string;
  incomeTotal: number;
  expenseTotal: number;
  netBalance: number;
  savingsRate: number | null;
  recentTransactions: Transaction[];
  budgetProgress: BudgetProgress[];
  cashFlowSeries: MonthlyCashFlowPoint[];
  onAddTransaction: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onNavigate: (view: 'transactions' | 'budgets' | 'reports') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  loading,
  currency,
  month,
  incomeTotal,
  expenseTotal,
  netBalance,
  savingsRate,
  recentTransactions,
  budgetProgress,
  cashFlowSeries,
  onAddTransaction,
  onEditTransaction,
  onNavigate,
}) => {
  const alertBudgets = budgetProgress.filter((b) => b.level !== 'normal');

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="h-28 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 animate-pulse"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-7 h-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl animate-pulse" />
          <div className="xl:col-span-5 h-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {alertBudgets.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400 mt-0.5 sm:mt-0 shrink-0" />
            <p className="text-sm text-amber-950 dark:text-amber-200">
              {alertBudgets.length === 1
                ? `${alertBudgets[0].budget.category} is at ${alertBudgets[0].percentage.toFixed(0)}% of its ${formatMonthLabel(month)} budget (${formatCurrency(alertBudgets[0].spent, currency)} of ${formatCurrency(alertBudgets[0].budget.limitAmount, currency)}).`
                : `${alertBudgets.length} category budgets have reached 80% or more for ${formatMonthLabel(month)}.`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('budgets')}
            className="text-xs font-medium text-amber-900 dark:text-amber-300 underline underline-offset-4 hover:opacity-80 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Review budgets
          </button>
        </div>
      )}

      {/* 4-column KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Income</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-2xl font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {formatCurrency(incomeTotal, currency)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {formatMonthLabel(month)} · {currency}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Expenses</span>
            <ArrowDownRight className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <p className="text-2xl font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {formatCurrency(expenseTotal, currency)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {formatMonthLabel(month)} · {currency}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Net Balance</span>
            <TrendingUp className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </div>
          <p
            className={`text-2xl font-semibold font-mono tabular-nums ${
              netBalance >= 0
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-rose-700 dark:text-rose-400'
            }`}
          >
            {netBalance > 0 ? '+' : ''}
            {formatCurrency(netBalance, currency)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Income minus expenses
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Savings Rate</span>
          </div>
          <p className="text-2xl font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {savingsRate === null ? '—' : `${savingsRate.toFixed(1)}%`}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {savingsRate === null ? 'No income recorded yet' : 'Share of monthly income retained'}
          </p>
        </div>
      </div>

      {/* Main Analytics + Budget Watchlist */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        <section className="xl:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Six-Month Cash Flow
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Monthly {currency} income and expenses ending {formatMonthLabel(month)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Full reports
            </button>
          </div>
          <CashFlowChart data={cashFlowSeries} currency={currency} />
        </section>

        <section className="xl:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Budget Watchlist
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {formatMonthLabel(month)} · {currency}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('budgets')}
              className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Manage budgets
            </button>
          </div>

          {budgetProgress.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8 space-y-3">
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
                No {currency} category budgets configured for {formatMonthLabel(month)}.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('budgets')}
                className="px-3.5 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Set Monthly Budget
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {budgetProgress.slice(0, 5).map((item) => {
                const barWidth = Math.min(100, item.percentage);
                const barColor =
                  item.level === 'exceeded'
                    ? 'bg-rose-600 dark:bg-rose-500'
                    : item.level === 'warning'
                      ? 'bg-amber-600 dark:bg-amber-500'
                      : 'bg-emerald-600 dark:bg-emerald-500';
                const statusLabel =
                  item.level === 'exceeded'
                    ? 'Exceeded'
                    : item.level === 'warning'
                      ? '80% Warning'
                      : 'On Track';
                const statusTextColor =
                  item.level === 'exceeded'
                    ? 'text-rose-700 dark:text-rose-400'
                    : item.level === 'warning'
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-emerald-700 dark:text-emerald-400';

                return (
                  <div key={item.budget.id} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {item.budget.category}
                      </span>
                      <span className={`text-xs font-medium whitespace-nowrap ${statusTextColor}`}>
                        {statusLabel} · {item.percentage.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor}`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      <span>{formatCurrency(item.spent, currency)} spent</span>
                      <span>Limit {formatCurrency(item.budget.limitAmount, currency)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Recent Transactions */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Recent Transactions
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Latest {currency} entries in {formatMonthLabel(month)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('transactions')}
            className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer"
          >
            View all
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="px-6 py-12 text-center space-y-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No {currency} transactions recorded for {formatMonthLabel(month)} yet.
            </p>
            <button
              type="button"
              onClick={onAddTransaction}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Log First Transaction</span>
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
                  <th className="py-3 px-6 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                {recentTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    onClick={() => onEditTransaction(tx)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-6 font-mono tabular-nums text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {formatDateShort(tx.date)}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {tx.category}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                      {tx.note || '—'}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {tx.type === 'income' ? 'Income' : 'Expense'}
                    </td>
                    <td
                      className={`py-3 px-6 text-right font-mono tabular-nums font-medium whitespace-nowrap ${
                        tx.type === 'income'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'}
                      {formatCurrency(tx.amount, tx.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
