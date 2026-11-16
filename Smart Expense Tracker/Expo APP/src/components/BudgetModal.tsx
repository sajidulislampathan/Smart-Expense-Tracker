import React, { useEffect, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  BudgetRow,
  CURRENCIES,
  CurrencyCode,
  EXPENSE_CATEGORIES,
} from '../types/finance';
import { colors, FieldInput, PrimaryButton } from './UI';

export interface BudgetFormPayload {
  month: string;
  category: string;
  currency: CurrencyCode;
  limit_amount: number;
}

interface BudgetModalProps {
  visible: boolean;
  editing: BudgetRow | null;
  defaultMonth: string;
  defaultCurrency: CurrencyCode;
  onClose: () => void;
  onSave: (payload: BudgetFormPayload, editingId?: string) => Promise<void>;
}

export const BudgetModal: React.FC<BudgetModalProps> = ({
  visible,
  editing,
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
    if (!visible) return;
    setError(null);
    if (editing) {
      setMonth(editing.month);
      setCategory(editing.category);
      setCurrency(editing.currency);
      setLimitAmount(String(editing.limit_amount));
    } else {
      setMonth(defaultMonth);
      setCategory(EXPENSE_CATEGORIES[0]);
      setCurrency(defaultCurrency);
      setLimitAmount('');
    }
  }, [visible, editing, defaultMonth, defaultCurrency]);

  const handleSubmit = async () => {
    setError(null);
    const parsed = Number(limitAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Monthly limit must be greater than 0.');
      return;
    }
    if (!/^\d{4}-\d{2}$/.test(month.trim())) {
      setError('Month must be in YYYY-MM format.');
      return;
    }

    setSaving(true);
    try {
      await onSave(
        {
          month: month.trim(),
          category,
          currency,
          limit_amount: parsed,
        },
        editing?.id,
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save budget.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{editing ? 'Edit Budget' : 'Set Monthly Budget'}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            <FieldInput
              label="Month (YYYY-MM)"
              editable={!editing}
              value={month}
              onChangeText={setMonth}
              placeholder="2026-11"
            />

            <View style={{ gap: 6 }}>
              <Text style={styles.groupLabel}>Currency</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  {CURRENCIES.map((c) => {
                    const active = currency === c.code;
                    return (
                      <TouchableOpacity
                        key={c.code}
                        disabled={Boolean(editing)}
                        onPress={() => setCurrency(c.code)}
                        style={[styles.choiceBtn, active && styles.choiceBtnActive]}
                      >
                        <Text style={[styles.choiceText, active && styles.choiceTextActive]}>
                          {c.code}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            <View style={{ gap: 6 }}>
              <Text style={styles.groupLabel}>Expense Category</Text>
              <View style={styles.wrapRow}>
                {EXPENSE_CATEGORIES.map((cat) => {
                  const active = category === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      disabled={Boolean(editing)}
                      onPress={() => setCategory(cat)}
                      style={[styles.choiceBtn, active && styles.choiceBtnActive]}
                    >
                      <Text style={[styles.choiceText, active && styles.choiceTextActive]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <FieldInput
              label="Monthly Spending Limit"
              keyboardType="decimal-pad"
              value={limitAmount}
              onChangeText={setLimitAmount}
              placeholder="500.00"
            />

            <Text style={styles.hint}>
              Local alerts fire automatically at 80% warning and 100% limit reached.
            </Text>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <PrimaryButton
              label={editing ? 'Update Budget' : 'Save Budget'}
              loading={saving}
              onPress={() => void handleSubmit()}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  closeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  body: {
    padding: 20,
    gap: 14,
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choiceBtn: {
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  choiceBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  choiceText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
  },
  choiceTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  hint: {
    fontSize: 12,
    color: colors.muted,
  },
  error: {
    fontSize: 13,
    color: colors.danger,
  },
});
