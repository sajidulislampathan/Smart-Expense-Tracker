import React, { useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Download,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Menu,
  Moon,
  PieChart,
  Plus,
  Sun,
  X,
} from 'lucide-react';
import { AuthView } from './components/AuthView';
import { BudgetModal } from './components/BudgetModal';
import { BudgetsView } from './components/BudgetsView';
import { MonthlyCashFlowPoint } from './components/Charts';
import { DashboardView } from './components/DashboardView';
import { ReportsView } from './components/ReportsView';
import { TransactionModal } from './components/TransactionModal';
import { TransactionsView } from './components/TransactionsView';
import { auth } from './lib/firebase';
import {
  createTransaction,
  deleteBudget,
  deleteTransaction,
  ensureUserProfile,
  subscribeBudgets,
  subscribeTransactions,
  updateTransaction,
  updateUserPreferences,
  upsertBudget,
} from './lib/financeService';
import {
  formatCurrency,
  formatMonthLabel,
  getCurrentMonth,
  getRecentMonths,
  shiftMonth,
} from './lib/format';
import {
  AppView,
  Budget,
  BudgetInput,
  BudgetProgress,
  CURRENCIES,
  CurrencyCode,
  Transaction,
  TransactionInput,
  UserProfile,
} from './types/finance';

const VIEW_LABELS: Record<AppView, string> = {
  dashboard: 'Dashboard',
  transactions: 'Transactions',
  budgets: 'Budgets',
  reports: 'Reports',
};

export default function App() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [verificationTick, setVerificationTick] = useState(0);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('USD');
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth());
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('set_theme') === 'dark';
  });

  const [txModalOpen, setTxModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | 'unsupported'
  >(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });

  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const notifiedThresholdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    try {
      window.localStorage.setItem('set_theme', darkMode ? 'dark' : 'light');
    } catch {
      // ignore storage errors
    }
  }, [darkMode]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const isVerifiedSignedIn = Boolean(authUser && authUser.emailVerified);

  useEffect(() => {
    if (!authReady) return;
    if (!authUser || !authUser.emailVerified) {
      setProfile(null);
      setTransactions([]);
      setBudgets([]);
      setDataLoading(false);
      return;
    }

    let cancelled = false;
    let unsubTx: (() => void) | undefined;
    let unsubBudgets: (() => void) | undefined;

    setDataLoading(true);
    setDataError(null);

    ensureUserProfile(authUser)
      .then((userProfile) => {
        if (cancelled) return;
        setProfile(userProfile);
        setSelectedCurrency(userProfile.defaultCurrency);

        let txLoaded = false;
        let budgetLoaded = false;
        const markReady = () => {
          if (txLoaded && budgetLoaded) {
            setDataLoading(false);
          }
        };

        unsubTx = subscribeTransactions(
          authUser.uid,
          (items) => {
            if (cancelled) return;
            setTransactions(items);
            txLoaded = true;
            markReady();
          },
          (err) => {
            if (cancelled) return;
            setDataError(err.message);
            setDataLoading(false);
          },
        );

        unsubBudgets = subscribeBudgets(
          authUser.uid,
          (items) => {
            if (cancelled) return;
            setBudgets(items);
            budgetLoaded = true;
            markReady();
          },
          (err) => {
            if (cancelled) return;
            setDataError(err.message);
            setDataLoading(false);
          },
        );
      })
      .catch((err) => {
        if (cancelled) return;
        setDataError(err instanceof Error ? err.message : 'Unable to load your profile.');
        setDataLoading(false);
      });

    return () => {
      cancelled = true;
      unsubTx?.();
      unsubBudgets?.();
    };
  }, [authReady, authUser, verificationTick]);

  // Monthly totals strictly isolated to selectedCurrency & selectedMonth
  const monthlyMetrics = useMemo(() => {
    let income = 0;
    let expense = 0;
    const monthCurrencyTx: Transaction[] = [];
    let otherCurrencyTxCount = 0;

    for (const tx of transactions) {
      if (tx.month !== selectedMonth) continue;
      if (tx.currency !== selectedCurrency) {
        otherCurrencyTxCount += 1;
        continue;
      }
      monthCurrencyTx.push(tx);
      if (tx.type === 'income') income += tx.amount;
      else expense += tx.amount;
    }

    const netBalance = income - expense;
    const savingsRate = income > 0 ? ((income - expense) / income) * 100 : null;

    return {
      income,
      expense,
      netBalance,
      savingsRate,
      recentTransactions: monthCurrencyTx.slice(0, 8),
      otherCurrencyTxCount,
    };
  }, [transactions, selectedMonth, selectedCurrency]);

  // 6-month cash flow series strictly for selectedCurrency
  const cashFlowSeries = useMemo<MonthlyCashFlowPoint[]>(() => {
    const months = getRecentMonths(6, selectedMonth);
    const map = new Map<string, { income: number; expense: number }>();
    for (const m of months) {
      map.set(m, { income: 0, expense: 0 });
    }

    for (const tx of transactions) {
      if (tx.currency !== selectedCurrency) continue;
      const bucket = map.get(tx.month);
      if (!bucket) continue;
      if (tx.type === 'income') bucket.income += tx.amount;
      else bucket.expense += tx.amount;
    }

    return months.map((m) => {
      const bucket = map.get(m) ?? { income: 0, expense: 0 };
      return {
        month: m,
        income: bucket.income,
        expense: bucket.expense,
        net: bucket.income - bucket.expense,
      };
    });
  }, [transactions, selectedCurrency, selectedMonth]);

  // Budget progress for selectedMonth + selectedCurrency
  const budgetProgress = useMemo<BudgetProgress[]>(() => {
    const spentByCategory = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.type !== 'expense' || tx.currency !== selectedCurrency || tx.month !== selectedMonth) {
        continue;
      }
      spentByCategory.set(tx.category, (spentByCategory.get(tx.category) ?? 0) + tx.amount);
    }

    return budgets
      .filter((b) => b.month === selectedMonth && b.currency === selectedCurrency)
      .map((budget) => {
        const spent = spentByCategory.get(budget.category) ?? 0;
        const ratio = budget.limitAmount > 0 ? spent / budget.limitAmount : 0;
        const percentage = ratio * 100;
        const level: BudgetProgress['level'] =
          percentage >= 100 ? 'exceeded' : percentage >= 80 ? 'warning' : 'normal';
        return {
          budget,
          spent,
          remaining: budget.limitAmount - spent,
          ratio,
          percentage,
          level,
        };
      })
      .sort((a, b) => b.percentage - a.percentage);
  }, [budgets, transactions, selectedMonth, selectedCurrency]);

  // Check current-month budgets across all currencies for 80% / 100% browser notifications
  useEffect(() => {
    if (!isVerifiedSignedIn || dataLoading || !profile?.notificationsEnabled) return;
    if (notificationPermission !== 'granted') return;

    const currentMonth = getCurrentMonth();
    const spentMap = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.type !== 'expense' || tx.month !== currentMonth) continue;
      const key = `${tx.category}__${tx.currency}`;
      spentMap.set(key, (spentMap.get(key) ?? 0) + tx.amount);
    }

    for (const budget of budgets) {
      if (budget.month !== currentMonth) continue;
      const spent = spentMap.get(`${budget.category}__${budget.currency}`) ?? 0;
      const pct = budget.limitAmount > 0 ? (spent / budget.limitAmount) * 100 : 0;
      const threshold = pct >= 100 ? '100' : pct >= 80 ? '80' : null;
      if (!threshold) continue;

      const alertKey = `${budget.month}_${budget.category}_${budget.currency}_${threshold}`;
      if (notifiedThresholdsRef.current.has(alertKey)) continue;
      notifiedThresholdsRef.current.add(alertKey);

      const title =
        threshold === '100'
          ? `Budget Limit Reached: ${budget.category}`
          : `Budget Warning (80%): ${budget.category}`;
      const body = `Spent ${formatCurrency(spent, budget.currency)} of ${formatCurrency(budget.limitAmount, budget.currency)} (${pct.toFixed(0)}%) for ${formatMonthLabel(currentMonth)}.`;

      try {
        new Notification(title, { body });
      } catch {
        // Fallback to in-app banner if browser blocks constructor
      }
      setBannerMessage(`${title} — ${body}`);
    }
  }, [isVerifiedSignedIn, dataLoading, profile?.notificationsEnabled, notificationPermission, budgets, transactions]);

  const handleCurrencyChange = async (nextCurrency: CurrencyCode) => {
    setSelectedCurrency(nextCurrency);
    if (authUser && authUser.emailVerified) {
      try {
        await updateUserPreferences(authUser.uid, { defaultCurrency: nextCurrency });
      } catch {
        // non-blocking preference update
      }
    }
  };

  const handleEnableNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);

    if (permission === 'granted' && authUser) {
      const nextValue = !profile?.notificationsEnabled;
      await updateUserPreferences(authUser.uid, { notificationsEnabled: nextValue });
      setProfile((prev) => (prev ? { ...prev, notificationsEnabled: nextValue } : prev));
      setBannerMessage(
        nextValue
          ? 'Browser budget alerts enabled for 80% and 100% category thresholds.'
          : 'Browser budget alerts paused.',
      );
    }
  };

  const handleSaveTransaction = async (input: TransactionInput, editingId?: string) => {
    if (!authUser) return;
    if (editingId) {
      await updateTransaction(authUser.uid, editingId, input);
    } else {
      await createTransaction(authUser.uid, input);
    }
    if (input.currency !== selectedCurrency) {
      setBannerMessage(
        `Saved ${input.currency} transaction. Switch your active currency to ${input.currency} to inspect it in totals.`,
      );
    }
  };

  const handleDeleteTransaction = async (txId: string) => {
    if (!authUser) return;
    await deleteTransaction(authUser.uid, txId);
  };

  const handleSaveBudget = async (input: BudgetInput, existingId?: string) => {
    if (!authUser) return;
    await upsertBudget(authUser.uid, input, existingId);
  };

  const handleDeleteBudget = async (budgetId: string) => {
    if (!authUser) return;
    await deleteBudget(authUser.uid, budgetId);
  };

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-6 h-6 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authUser || !authUser.emailVerified) {
    return (
      <AuthView
        pendingVerificationUser={authUser && !authUser.emailVerified ? authUser : null}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode((prev) => !prev)}
        onVerificationRefreshed={() => setVerificationTick((t) => t + 1)}
      />
    );
  }

  const navItems: { id: AppView; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'transactions', label: 'Transactions', icon: <ListOrdered className="w-4 h-4" /> },
    { id: 'budgets', label: 'Budgets', icon: <PieChart className="w-4 h-4" /> },
    { id: 'reports', label: 'Reports', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  const userDisplay = profile?.displayName || authUser.displayName || 'Account';
  const userEmail = profile?.email || authUser.email || '';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800">
          <span className="text-base font-bold tracking-tight font-display text-slate-900 dark:text-slate-100 whitespace-nowrap">
            Smart Expense Tracker
          </span>
        </div>

        <nav className="flex-1 p-4 space-y-1" aria-label="Main navigation">
          {navItems.map((item) => {
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="px-2 space-y-0.5">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
              {userDisplay}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{userEmail}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDarkMode((prev) => !prev)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
            >
              {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              <span>{darkMode ? 'Light' : 'Dark'}</span>
            </button>

            <button
              type="button"
              onClick={() => void signOut(auth)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>

          <a
            href="/Smart-Expense-Tracker.zip"
            download="Smart Expense Tracker.zip"
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Expo ZIP</span>
          </a>
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/50"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-64 max-w-[80vw] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-sm font-bold font-display text-slate-900 dark:text-slate-100 whitespace-nowrap">
                Smart Expense Tracker
              </span>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close navigation"
                className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 p-4 space-y-1">
              {navItems.map((item) => {
                const active = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveView(item.id);
                      setMobileNavOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                      active
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className="px-1">
                <p className="text-sm font-medium truncate">{userDisplay}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{userEmail}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDarkMode((prev) => !prev)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
                >
                  {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                  <span>{darkMode ? 'Light' : 'Dark'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void signOut(auth)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-4 flex items-center justify-between gap-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="hidden sm:inline text-slate-400 dark:text-slate-500 whitespace-nowrap">
                Smart Expense Tracker
              </span>
              <span className="hidden sm:inline text-slate-300 dark:text-slate-700" aria-hidden="true">
                /
              </span>
              <h1 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 truncate font-display">
                {VIEW_LABELS[activeView]}
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingTransaction(null);
              setTxModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Transaction</span>
          </button>
        </header>

        {/* Workspace Filter Strip */}
        <div className="border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 px-4 sm:px-8 py-3">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="workspace-currency"
                  className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap"
                >
                  Currency
                </label>
                <select
                  id="workspace-currency"
                  value={selectedCurrency}
                  onChange={(e) => void handleCurrencyChange(e.target.value as CurrencyCode)}
                  className="px-2.5 py-1.5 text-xs font-mono font-medium bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} · {c.symbol}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setSelectedMonth((m) => shiftMonth(m, -1))}
                  aria-label="Previous month"
                  className="px-2.5 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <input
                  type="month"
                  aria-label="Active month"
                  value={selectedMonth}
                  onChange={(e) => {
                    if (e.target.value) setSelectedMonth(e.target.value);
                  }}
                  className="px-2 py-1 text-xs font-mono tabular-nums bg-transparent text-slate-900 dark:text-slate-100 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setSelectedMonth((m) => shiftMonth(m, 1))}
                  aria-label="Next month"
                  className="px-2.5 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Totals show {selectedCurrency} only
              {monthlyMetrics.otherCurrencyTxCount > 0 && (
                <>
                  {' '}
                  ·{' '}
                  <span className="font-mono tabular-nums">
                    {monthlyMetrics.otherCurrencyTxCount}
                  </span>{' '}
                  {monthlyMetrics.otherCurrencyTxCount === 1 ? 'entry' : 'entries'} in other
                  currencies excluded
                </>
              )}
            </p>
          </div>
        </div>

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            {dataError && (
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl px-5 py-3.5 flex items-center justify-between gap-4">
                <p className="text-sm text-rose-800 dark:text-rose-200 break-words">{dataError}</p>
                <button
                  type="button"
                  onClick={() => setDataError(null)}
                  className="text-xs font-medium text-rose-700 dark:text-rose-300 hover:underline shrink-0 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {bannerMessage && (
              <div className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-xl px-5 py-3 flex items-center justify-between gap-4">
                <p className="text-xs sm:text-sm">{bannerMessage}</p>
                <button
                  type="button"
                  onClick={() => setBannerMessage(null)}
                  aria-label="Dismiss notification"
                  className="p-1 opacity-75 hover:opacity-100 shrink-0 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {activeView === 'dashboard' && (
              <DashboardView
                loading={dataLoading}
                currency={selectedCurrency}
                month={selectedMonth}
                incomeTotal={monthlyMetrics.income}
                expenseTotal={monthlyMetrics.expense}
                netBalance={monthlyMetrics.netBalance}
                savingsRate={monthlyMetrics.savingsRate}
                recentTransactions={monthlyMetrics.recentTransactions}
                budgetProgress={budgetProgress}
                cashFlowSeries={cashFlowSeries}
                onAddTransaction={() => {
                  setEditingTransaction(null);
                  setTxModalOpen(true);
                }}
                onEditTransaction={(tx) => {
                  setEditingTransaction(tx);
                  setTxModalOpen(true);
                }}
                onNavigate={(view) => setActiveView(view)}
              />
            )}

            {activeView === 'transactions' && (
              <TransactionsView
                loading={dataLoading}
                transactions={transactions}
                currency={selectedCurrency}
                month={selectedMonth}
                onAddTransaction={() => {
                  setEditingTransaction(null);
                  setTxModalOpen(true);
                }}
                onEditTransaction={(tx) => {
                  setEditingTransaction(tx);
                  setTxModalOpen(true);
                }}
                onDeleteTransaction={handleDeleteTransaction}
              />
            )}

            {activeView === 'budgets' && (
              <BudgetsView
                loading={dataLoading}
                currency={selectedCurrency}
                month={selectedMonth}
                budgetProgress={budgetProgress}
                notificationPermission={notificationPermission}
                notificationsEnabled={Boolean(profile?.notificationsEnabled)}
                onEnableNotifications={handleEnableNotifications}
                onAddBudget={() => {
                  setEditingBudget(null);
                  setBudgetModalOpen(true);
                }}
                onEditBudget={(b) => {
                  setEditingBudget(b);
                  setBudgetModalOpen(true);
                }}
                onDeleteBudget={handleDeleteBudget}
              />
            )}

            {activeView === 'reports' && (
              <ReportsView
                loading={dataLoading}
                currency={selectedCurrency}
                month={selectedMonth}
                transactions={transactions}
                cashFlowSeries={cashFlowSeries}
              />
            )}
          </div>
        </main>
      </div>

      <TransactionModal
        open={txModalOpen}
        editingTransaction={editingTransaction}
        defaultCurrency={selectedCurrency}
        onClose={() => {
          setTxModalOpen(false);
          setEditingTransaction(null);
        }}
        onSave={handleSaveTransaction}
      />

      <BudgetModal
        open={budgetModalOpen}
        editingBudget={editingBudget}
        defaultMonth={selectedMonth}
        defaultCurrency={selectedCurrency}
        onClose={() => {
          setBudgetModalOpen(false);
          setEditingBudget(null);
        }}
        onSave={handleSaveBudget}
      />
    </div>
  );
}
