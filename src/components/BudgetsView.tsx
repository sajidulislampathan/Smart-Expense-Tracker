import React, { useState } from 'react';
import { AlertTriangle, Bell, CheckCircle2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Budget, BudgetProgress, CurrencyCode } from '../types/finance';
import { formatCurrency, formatMonthLabel } from '../lib/format';

interface BudgetsViewProps {
  loading: boolean;
  currency: CurrencyCode;
  month: string;
  budgetProgress: BudgetProgress[];
  notificationPermission: NotificationPermission | 'unsupported';
  notificationsEnabled: boolean;
  onEnableNotifications: () => Promise<void>;
  onAddBudget: () => void;
  onEditBudget: (budget: Budget) => void;
  onDeleteBudget: (budgetId: string) => Promise<void>;
}

export const BudgetsView: React.FC<BudgetsViewProps> = ({
  loading,
  currency,
  month,
  budgetProgress,
  notificationPermission,
  notificationsEnabled,
  onEnableNotifications,
  onAddBudget,
  onEditBudget,
  onDeleteBudget,
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const totalBudgeted = budgetProgress.reduce((acc, b) => acc + b.budget.limitAmount, 0);
  const totalSpent = budgetProgress.reduce((acc, b) => acc + b.spent, 0);

  const handleConfirmDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDeleteBudget(id);
      setConfirmDeleteId(null);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
        {[0, 1, 2, 3].map((idx) => (
          <div
            key={idx}
            className="h-36 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {formatMonthLabel(month)} Budgets · {currency}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            {budgetProgress.length} active category limits · Total budgeted{' '}
            {formatCurrency(totalBudgeted, currency)} · Spent{' '}
            {formatCurrency(totalSpent, currency)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {notificationPermission !== 'unsupported' && (
            <button
              type="button"
              onClick={() => void onEnableNotifications()}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium border rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                notificationsEnabled && notificationPermission === 'granted'
                  ? 'border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>
                {notificationPermission === 'denied'
                  ? 'Browser Alerts Blocked'
                  : notificationsEnabled && notificationPermission === 'granted'
                    ? '80% & 100% Alerts On'
                    : 'Enable Browser Alerts'}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={onAddBudget}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Set Category Budget</span>
          </button>
        </div>
      </div>

      {budgetProgress.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-6 py-16 text-center space-y-3">
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Set monthly spending limits per expense category in {currency} to receive automatic 80% warning and 100% threshold alerts.
          </p>
          <button
            type="button"
            onClick={onAddBudget}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Budget</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgetProgress.map((item) => {
            const barWidth = Math.min(100, item.percentage);
            const barColor =
              item.level === 'exceeded'
                ? 'bg-rose-600 dark:bg-rose-500'
                : item.level === 'warning'
                  ? 'bg-amber-600 dark:bg-amber-500'
                  : 'bg-emerald-600 dark:bg-emerald-500';
            const statusTextColor =
              item.level === 'exceeded'
                ? 'text-rose-700 dark:text-rose-400'
                : item.level === 'warning'
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-emerald-700 dark:text-emerald-400';

            const isConfirming = confirmDeleteId === item.budget.id;

            return (
              <div
                key={item.budget.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {item.budget.category}
                    </h3>
                    <div className={`inline-flex items-center gap-1.5 text-xs font-medium ${statusTextColor}`}>
                      {item.level === 'normal' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {item.level === 'exceeded'
                          ? `Over budget (${item.percentage.toFixed(0)}%)`
                          : item.level === 'warning'
                            ? `Approaching limit (${item.percentage.toFixed(0)}%)`
                            : `On track (${item.percentage.toFixed(0)}%)`}
                      </span>
                    </div>
                  </div>

                  {isConfirming ? (
                    <div className="inline-flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={deletingId === item.budget.id}
                        onClick={() => void handleConfirmDelete(item.budget.id)}
                        className="px-2.5 py-1 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-md cursor-pointer"
                      >
                        {deletingId === item.budget.id ? 'Removing...' : 'Confirm'}
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
                    <div className="inline-flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onEditBudget(item.budget)}
                        aria-label={`Edit ${item.budget.category} budget`}
                        className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 rounded-md cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(item.budget.id)}
                        aria-label={`Delete ${item.budget.category} budget`}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${barColor}`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400">
                  <span>Spent: {formatCurrency(item.spent, currency)}</span>
                  <span>
                    {item.remaining >= 0
                      ? `${formatCurrency(item.remaining, currency)} left`
                      : `${formatCurrency(Math.abs(item.remaining), currency)} over`}
                  </span>
                  <span>Limit: {formatCurrency(item.budget.limitAmount, currency)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
