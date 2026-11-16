import React, { useMemo } from 'react';
import { CurrencyCode, Transaction } from '../types/finance';
import { formatCurrency, formatMonthLabel, formatMonthShort } from '../lib/format';
import {
  buildCategorySlices,
  CashFlowChart,
  CategoryDonutChart,
  MonthlyCashFlowPoint,
} from './Charts';

interface ReportsViewProps {
  loading: boolean;
  currency: CurrencyCode;
  month: string;
  transactions: Transaction[];
  cashFlowSeries: MonthlyCashFlowPoint[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  loading,
  currency,
  month,
  transactions,
  cashFlowSeries,
}) => {
  const monthStats = useMemo(() => {
    const expenseByCategory = new Map<string, number>();
    const incomeByCategory = new Map<string, number>();
    let totalExpense = 0;
    let totalIncome = 0;

    for (const tx of transactions) {
      if (tx.currency !== currency || tx.month !== month) continue;
      if (tx.type === 'expense') {
        totalExpense += tx.amount;
        expenseByCategory.set(tx.category, (expenseByCategory.get(tx.category) ?? 0) + tx.amount);
      } else {
        totalIncome += tx.amount;
        incomeByCategory.set(tx.category, (incomeByCategory.get(tx.category) ?? 0) + tx.amount);
      }
    }

    const [y, m] = month.split('-').map(Number);
    const daysInMonth = y && m ? new Date(y, m, 0).getDate() : 30;
    const dailyAvgExpense = totalExpense / daysInMonth;

    return {
      totalExpense,
      totalIncome,
      dailyAvgExpense,
      expenseSlices: buildCategorySlices(expenseByCategory, totalExpense),
      incomeSlices: buildCategorySlices(incomeByCategory, totalIncome),
    };
  }, [transactions, currency, month]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl" />
        <div className="h-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Category Breakdown */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <section className="xl:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Expense Breakdown
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {formatMonthLabel(month)} · {currency} · Daily avg{' '}
                <span className="font-mono tabular-nums">
                  {formatCurrency(monthStats.dailyAvgExpense, currency)}/day
                </span>
              </p>
            </div>
          </div>

          <CategoryDonutChart
            slices={monthStats.expenseSlices}
            total={monthStats.totalExpense}
            currency={currency}
            emptyLabel={`No ${currency} expenses recorded in ${formatMonthLabel(month)}.`}
          />
        </section>

        <section className="xl:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Income Sources
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {formatMonthLabel(month)} · {currency}
            </p>
          </div>

          <CategoryDonutChart
            slices={monthStats.incomeSlices}
            total={monthStats.totalIncome}
            currency={currency}
            emptyLabel={`No ${currency} income recorded in ${formatMonthLabel(month)}.`}
          />
        </section>
      </div>

      {/* Six-month Cash Flow & Summary Table */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Six-Month Cash Flow Summary
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Isolated to {currency} transactions only (no unverified FX aggregation)
          </p>
        </div>

        <CashFlowChart data={cashFlowSeries} currency={currency} />

        <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-800 pt-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                <th className="py-2.5 pr-4">Month</th>
                <th className="py-2.5 px-4 text-right">Income</th>
                <th className="py-2.5 px-4 text-right">Expenses</th>
                <th className="py-2.5 px-4 text-right">Net</th>
                <th className="py-2.5 pl-4 text-right">Savings Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm font-mono tabular-nums">
              {cashFlowSeries.map((row) => {
                const rate = row.income > 0 ? ((row.income - row.expense) / row.income) * 100 : null;
                return (
                  <tr key={row.month} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 pr-4 font-sans font-medium text-slate-900 dark:text-slate-100">
                      {formatMonthShort(row.month)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(row.income, currency)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-700 dark:text-slate-300">
                      {formatCurrency(row.expense, currency)}
                    </td>
                    <td
                      className={`py-2.5 px-4 text-right font-medium ${
                        row.net >= 0
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      {row.net > 0 ? '+' : ''}
                      {formatCurrency(row.net, currency)}
                    </td>
                    <td className="py-2.5 pl-4 text-right text-slate-600 dark:text-slate-400">
                      {rate === null ? '—' : `${rate.toFixed(1)}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
