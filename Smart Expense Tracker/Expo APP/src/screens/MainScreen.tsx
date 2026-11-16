import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {
  formatCurrency,
  formatMonthLabel,
  getCurrentMonth,
  shiftMonth,
} from '../lib/format';
import {
  dispatchBudgetThresholdAlert,
  requestNotificationPermission,
} from '../lib/notifications';
import {
  BudgetProgress,
  BudgetRow,
  CURRENCIES,
  CurrencyCode,
  TransactionRow,
} from '../types/finance';
import { Card, colors, PrimaryButton, ProgressBar, SectionTitle } from '../components/UI';
import { TransactionFormPayload, TransactionModal } from '../components/TransactionModal';
import { BudgetFormPayload, BudgetModal } from '../components/BudgetModal';

type TabKey = 'dashboard' | 'transactions' | 'budgets' | 'reports';

export default function MainScreen({ session }: { session: Session }) {
  const userId = session.user.id;
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('USD');
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth());

  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [txModalVisible, setTxModalVisible] = useState(false);
  const [editingTx, setEditingTx] = useState<TransactionRow | null>(null);
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetRow | null>(null);

  const sentAlertKeysRef = useRef<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    if (!supabase) return;
    const [txRes, budgetRes] = await Promise.all([
      supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('budgets')
        .select('*')
        .eq('user_id', userId)
        .order('category', { ascending: true }),
    ]);

    if (!txRes.error && txRes.data) {
      setTransactions(txRes.data as TransactionRow[]);
    }
    if (!budgetRes.error && budgetRes.data) {
      setBudgets(budgetRes.data as BudgetRow[]);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void requestNotificationPermission();
    void loadData();

    if (!supabase) return;
    const channel = supabase
      .channel(`user-finance-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${userId}` },
        () => void loadData(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'budgets', filter: `user_id=eq.${userId}` },
        () => void loadData(),
      )
      .subscribe();

    return () => {
      void supabase?.removeChannel(channel);
    };
  }, [userId, loadData]);

  const monthTransactions = useMemo(
    () =>
      transactions.filter(
        (t) => t.month === selectedMonth && t.currency === selectedCurrency,
      ),
    [transactions, selectedMonth, selectedCurrency],
  );

  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of monthTransactions) {
      if (tx.type === 'income') income += Number(tx.amount);
      else expense += Number(tx.amount);
    }
    return { income, expense, net: income - expense };
  }, [monthTransactions]);

  const budgetProgressList = useMemo<BudgetProgress[]>(() => {
    const spentMap = new Map<string, number>();
    for (const tx of monthTransactions) {
      if (tx.type !== 'expense') continue;
      spentMap.set(tx.category, (spentMap.get(tx.category) ?? 0) + Number(tx.amount));
    }

    return budgets
      .filter((b) => b.month === selectedMonth && b.currency === selectedCurrency)
      .map((budget) => {
        const spent = spentMap.get(budget.category) ?? 0;
        const pct = budget.limit_amount > 0 ? (spent / budget.limit_amount) * 100 : 0;
        const level = pct >= 100 ? 'exceeded' : pct >= 80 ? 'warning' : 'normal';
        return {
          budget,
          spent,
          remaining: budget.limit_amount - spent,
          percentage: pct,
          level,
        };
      });
  }, [budgets, monthTransactions, selectedMonth, selectedCurrency]);

  // Evaluate current month budgets across all currencies and trigger 80% / 100% local notifications
  useEffect(() => {
    const currentMonth = getCurrentMonth();
    const spentMap = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.type !== 'expense' || tx.month !== currentMonth) continue;
      const key = `${tx.category}__${tx.currency}`;
      spentMap.set(key, (spentMap.get(key) ?? 0) + Number(tx.amount));
    }

    for (const budget of budgets) {
      if (budget.month !== currentMonth) continue;
      const spent = spentMap.get(`${budget.category}__${budget.currency}`) ?? 0;
      const pct = budget.limit_amount > 0 ? (spent / budget.limit_amount) * 100 : 0;
      const level = pct >= 100 ? 'exceeded' : pct >= 80 ? 'warning' : 'normal';
      if (level === 'normal') continue;

      void dispatchBudgetThresholdAlert(
        {
          budget,
          spent,
          remaining: budget.limit_amount - spent,
          percentage: pct,
          level,
        },
        sentAlertKeysRef.current,
      ).then((threshold) => {
        if (threshold && supabase) {
          void supabase.from('budget_alerts').upsert(
            {
              user_id: userId,
              budget_id: budget.id,
              month: budget.month,
              category: budget.category,
              currency: budget.currency,
              threshold_pct: threshold === '100' ? 100 : 80,
              spent_amount: spent,
              limit_amount: budget.limit_amount,
            },
            { onConflict: 'user_id,month,category,currency,threshold_pct' },
          );
        }
      });
    }
  }, [transactions, budgets, userId]);

  const categoryReport = useMemo(() => {
    const totals = new Map<string, number>();
    let totalExpense = 0;
    for (const tx of monthTransactions) {
      if (tx.type !== 'expense') continue;
      totalExpense += Number(tx.amount);
      totals.set(tx.category, (totals.get(tx.category) ?? 0) + Number(tx.amount));
    }
    return Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount]) => ({
        category,
        amount,
        share: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
      }));
  }, [monthTransactions]);

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return monthTransactions;
    return monthTransactions.filter(
      (tx) =>
        tx.category.toLowerCase().includes(q) ||
        tx.note.toLowerCase().includes(q) ||
        tx.date.includes(q),
    );
  }, [monthTransactions, searchQuery]);

  const handleSaveTransaction = async (
    payload: TransactionFormPayload,
    editingId?: string,
  ) => {
    if (!supabase) return;
    if (editingId) {
      const { error } = await supabase
        .from('transactions')
        .update(payload)
        .eq('id', editingId)
        .eq('user_id', userId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from('transactions')
        .insert({ ...payload, user_id: userId });
      if (error) throw new Error(error.message);
    }
    await loadData();
  };

  const handleDeleteTransaction = (id: string) => {
    Alert.alert('Delete Transaction', 'Remove this transaction from your ledger?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!supabase) return;
          await supabase.from('transactions').delete().eq('id', id).eq('user_id', userId);
          await loadData();
        },
      },
    ]);
  };

  const handleSaveBudget = async (payload: BudgetFormPayload, editingId?: string) => {
    if (!supabase) return;
    if (editingId) {
      const { error } = await supabase
        .from('budgets')
        .update({ limit_amount: payload.limit_amount })
        .eq('id', editingId)
        .eq('user_id', userId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from('budgets').upsert(
        {
          user_id: userId,
          month: payload.month,
          category: payload.category,
          currency: payload.currency,
          limit_amount: payload.limit_amount,
        },
        { onConflict: 'user_id,month,category,currency' },
      );
      if (error) throw new Error(error.message);
    }
    await loadData();
  };

  const handleDeleteBudget = (id: string) => {
    Alert.alert('Delete Budget', 'Remove this monthly budget limit?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!supabase) return;
          await supabase.from('budgets').delete().eq('id', id).eq('user_id', userId);
          await loadData();
        },
      },
    ]);
  };

  const handleSignOut = async () => {
    await supabase?.auth.signOut();
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Smart Expense Tracker</Text>
          <Text style={styles.headerSub}>{session.user.email}</Text>
        </View>
        <TouchableOpacity onPress={() => void handleSignOut()} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {/* Currency & Month Filter Bar */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.currencyRow}>
            {CURRENCIES.map((c) => {
              const active = c.code === selectedCurrency;
              return (
                <TouchableOpacity
                  key={c.code}
                  onPress={() => setSelectedCurrency(c.code)}
                  style={[styles.currencyBtn, active && styles.currencyBtnActive]}
                >
                  <Text style={[styles.currencyText, active && styles.currencyTextActive]}>
                    {c.code}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.monthRow}>
          <TouchableOpacity
            onPress={() => setSelectedMonth((m) => shiftMonth(m, -1))}
            style={styles.monthArrow}
          >
            <Ionicons name="chevron-back" size={16} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{formatMonthLabel(selectedMonth)}</Text>
          <TouchableOpacity
            onPress={() => setSelectedMonth((m) => shiftMonth(m, 1))}
            style={styles.monthArrow}
          >
            <Ionicons name="chevron-forward" size={16} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {activeTab === 'dashboard' ? (
            <>
              <View style={styles.kpiGrid}>
                <Card style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>Income</Text>
                  <Text style={[styles.kpiValue, { color: colors.success }]}>
                    {formatCurrency(summary.income, selectedCurrency)}
                  </Text>
                </Card>
                <Card style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>Expenses</Text>
                  <Text style={[styles.kpiValue, { color: colors.danger }]}>
                    {formatCurrency(summary.expense, selectedCurrency)}
                  </Text>
                </Card>
              </View>

              <Card>
                <Text style={styles.kpiLabel}>Net Balance ({selectedCurrency} only)</Text>
                <Text style={styles.netValue}>
                  {formatCurrency(summary.net, selectedCurrency)}
                </Text>
              </Card>

              <PrimaryButton
                label="+ Add Transaction"
                onPress={() => {
                  setEditingTx(null);
                  setTxModalVisible(true);
                }}
              />

              <Card style={{ gap: 12 }}>
                <SectionTitle
                  title="Budget Watchlist"
                  subtitle={`${formatMonthLabel(selectedMonth)} · ${selectedCurrency}`}
                />
                {budgetProgressList.length === 0 ? (
                  <Text style={styles.emptyText}>
                    No {selectedCurrency} budgets set for this month.
                  </Text>
                ) : (
                  budgetProgressList.slice(0, 4).map((b) => {
                    const barColor =
                      b.level === 'exceeded'
                        ? colors.danger
                        : b.level === 'warning'
                          ? colors.warning
                          : colors.success;
                    return (
                      <View key={b.budget.id} style={{ gap: 6 }}>
                        <View style={styles.rowBetween}>
                          <Text style={styles.rowTitle}>{b.budget.category}</Text>
                          <Text style={[styles.statusText, { color: barColor }]}>
                            {b.percentage.toFixed(0)}%
                          </Text>
                        </View>
                        <ProgressBar percentage={b.percentage} color={barColor} />
                        <Text style={styles.rowSub}>
                          {formatCurrency(b.spent, selectedCurrency)} of{' '}
                          {formatCurrency(b.budget.limit_amount, selectedCurrency)}
                        </Text>
                      </View>
                    );
                  })
                )}
              </Card>

              <Card style={{ gap: 12 }}>
                <SectionTitle title="Recent Transactions" />
                {monthTransactions.length === 0 ? (
                  <Text style={styles.emptyText}>
                    No {selectedCurrency} entries for {formatMonthLabel(selectedMonth)}.
                  </Text>
                ) : (
                  monthTransactions.slice(0, 6).map((tx) => (
                    <TouchableOpacity
                      key={tx.id}
                      onPress={() => {
                        setEditingTx(tx);
                        setTxModalVisible(true);
                      }}
                      style={styles.txRow}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle}>{tx.category}</Text>
                        <Text style={styles.rowSub} numberOfLines={1}>
                          {tx.date} {tx.note ? `· ${tx.note}` : ''}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.txAmount,
                          { color: tx.type === 'income' ? colors.success : colors.text },
                        ]}
                      >
                        {tx.type === 'income' ? '+' : '-'}
                        {formatCurrency(Number(tx.amount), tx.currency)}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </Card>
            </>
          ) : null}

          {activeTab === 'transactions' ? (
            <>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search category, note, or date..."
                placeholderTextColor="#94A3B8"
                style={styles.searchInput}
              />
              <PrimaryButton
                label="+ Add Transaction"
                onPress={() => {
                  setEditingTx(null);
                  setTxModalVisible(true);
                }}
              />
              <Card style={{ gap: 12 }}>
                <SectionTitle
                  title="Transactions"
                  subtitle={`${filteredTransactions.length} entries in ${selectedCurrency}`}
                />
                {filteredTransactions.length === 0 ? (
                  <Text style={styles.emptyText}>No matching transactions.</Text>
                ) : (
                  filteredTransactions.map((tx) => (
                    <View key={tx.id} style={styles.txRow}>
                      <TouchableOpacity
                        style={{ flex: 1 }}
                        onPress={() => {
                          setEditingTx(tx);
                          setTxModalVisible(true);
                        }}
                      >
                        <Text style={styles.rowTitle}>{tx.category}</Text>
                        <Text style={styles.rowSub}>
                          {tx.date} {tx.note ? `· ${tx.note}` : ''}
                        </Text>
                      </TouchableOpacity>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Text
                          style={[
                            styles.txAmount,
                            { color: tx.type === 'income' ? colors.success : colors.text },
                          ]}
                        >
                          {tx.type === 'income' ? '+' : '-'}
                          {formatCurrency(Number(tx.amount), tx.currency)}
                        </Text>
                        <TouchableOpacity onPress={() => handleDeleteTransaction(tx.id)}>
                          <Text style={styles.deleteLink}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </Card>
            </>
          ) : null}

          {activeTab === 'budgets' ? (
            <>
              <PrimaryButton
                label="+ Set Monthly Budget"
                onPress={() => {
                  setEditingBudget(null);
                  setBudgetModalVisible(true);
                }}
              />
              {budgetProgressList.length === 0 ? (
                <Card>
                  <Text style={styles.emptyText}>
                    No {selectedCurrency} budgets set for {formatMonthLabel(selectedMonth)}.
                  </Text>
                </Card>
              ) : (
                budgetProgressList.map((b) => {
                  const barColor =
                    b.level === 'exceeded'
                      ? colors.danger
                      : b.level === 'warning'
                        ? colors.warning
                        : colors.success;
                  return (
                    <Card key={b.budget.id} style={{ gap: 10 }}>
                      <View style={styles.rowBetween}>
                        <Text style={styles.rowTitle}>{b.budget.category}</Text>
                        <Text style={[styles.statusText, { color: barColor }]}>
                          {b.level === 'exceeded'
                            ? `Over Budget (${b.percentage.toFixed(0)}%)`
                            : b.level === 'warning'
                              ? `80% Warning (${b.percentage.toFixed(0)}%)`
                              : `On Track (${b.percentage.toFixed(0)}%)`}
                        </Text>
                      </View>
                      <ProgressBar percentage={b.percentage} color={barColor} />
                      <View style={styles.rowBetween}>
                        <Text style={styles.rowSub}>
                          Spent {formatCurrency(b.spent, selectedCurrency)} /{' '}
                          {formatCurrency(b.budget.limit_amount, selectedCurrency)}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                          <TouchableOpacity
                            onPress={() => {
                              setEditingBudget(b.budget);
                              setBudgetModalVisible(true);
                            }}
                          >
                            <Text style={styles.editLink}>Edit</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDeleteBudget(b.budget.id)}>
                            <Text style={styles.deleteLink}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </Card>
                  );
                })
              )}
            </>
          ) : null}

          {activeTab === 'reports' ? (
            <Card style={{ gap: 14 }}>
              <SectionTitle
                title="Expense Breakdown"
                subtitle={`${formatMonthLabel(selectedMonth)} · ${selectedCurrency} only`}
              />
              {categoryReport.length === 0 ? (
                <Text style={styles.emptyText}>
                  No {selectedCurrency} expenses recorded for {formatMonthLabel(selectedMonth)}.
                </Text>
              ) : (
                categoryReport.map((item) => (
                  <View key={item.category} style={{ gap: 6 }}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.rowTitle}>{item.category}</Text>
                      <Text style={styles.rowSub}>
                        {item.share.toFixed(1)}% ·{' '}
                        {formatCurrency(item.amount, selectedCurrency)}
                      </Text>
                    </View>
                    <ProgressBar percentage={item.share} color={colors.primary} />
                  </View>
                ))
              )}
            </Card>
          ) : null}
        </ScrollView>
      )}

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        {(
          [
            { key: 'dashboard', label: 'Dashboard', icon: 'grid-outline' },
            { key: 'transactions', label: 'Ledger', icon: 'list-outline' },
            { key: 'budgets', label: 'Budgets', icon: 'pie-chart-outline' },
            { key: 'reports', label: 'Reports', icon: 'bar-chart-outline' },
          ] as const
        ).map((tab) => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={styles.tabItem}
            >
              <Ionicons
                name={tab.icon}
                size={20}
                color={active ? colors.primary : colors.muted}
              />
              <Text style={[styles.tabLabel, active && { color: colors.primary }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TransactionModal
        visible={txModalVisible}
        editing={editingTx}
        defaultCurrency={selectedCurrency}
        onClose={() => setTxModalVisible(false)}
        onSave={handleSaveTransaction}
      />

      <BudgetModal
        visible={budgetModalVisible}
        editing={editingBudget}
        defaultMonth={selectedMonth}
        defaultCurrency={selectedCurrency}
        onClose={() => setBudgetModalVisible(false)}
        onSave={handleSaveBudget}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  headerSub: {
    fontSize: 12,
    color: colors.muted,
  },
  signOutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  signOutText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  filterBar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 6,
  },
  currencyBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  currencyBtnActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  currencyText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
  },
  currencyTextActive: {
    color: colors.primary,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthArrow: {
    padding: 4,
  },
  monthLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  content: {
    padding: 16,
    gap: 14,
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  kpiCard: {
    flex: 1,
  },
  kpiLabel: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  netValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  rowSub: {
    fontSize: 12,
    color: colors.muted,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 12,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    paddingVertical: 12,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  editLink: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  deleteLink: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.danger,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
  },
});
