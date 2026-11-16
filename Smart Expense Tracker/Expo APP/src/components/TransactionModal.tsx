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
  CURRENCIES,
  CurrencyCode,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  TransactionRow,
  TransactionType,
} from '../types/finance';
import { getTodayDate } from '../lib/format';
import { colors, FieldInput, PrimaryButton } from './UI';

export interface TransactionFormPayload {
  type: TransactionType;
  amount: number;
  currency: CurrencyCode;
  category: string;
  note: string;
  date: string;
}

interface TransactionModalProps {
  visible: boolean;
  editing: TransactionRow | null;
  defaultCurrency: CurrencyCode;
  onClose: () => void;
  onSave: (payload: TransactionFormPayload, editingId?: string) => Promise<void>;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  visible,
  editing,
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
    if (!visible) return;
    setError(null);
    if (editing) {
      setType(editing.type);
      setAmount(String(editing.amount));
      setCurrency(editing.currency);
      setCategory(editing.category);
      setDate(editing.date);
      setNote(editing.note);
    } else {
      setType('expense');
      setAmount('');
      setCurrency(defaultCurrency);
      setCategory(EXPENSE_CATEGORIES[0]);
      setDate(getTodayDate());
      setNote('');
    }
  }, [visible, editing, defaultCurrency]);

  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const handleTypeSwitch = (next: TransactionType) => {
    setType(next);
    const nextCats = next === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    if (!nextCats.includes(category as never)) {
      setCategory(nextCats[0]);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Enter an amount greater than 0.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      setError('Date must be in YYYY-MM-DD format.');
      return;
    }

    setSaving(true);
    try {
      await onSave(
        {
          type,
          amount: parsedAmount,
          currency,
          category,
          note: note.trim().slice(0, 240),
          date: date.trim(),
        },
        editing?.id,
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save transaction.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {editing ? 'Edit Transaction' : 'Add Transaction'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            <View style={styles.segmentRow}>
              {(['expense', 'income'] as const).map((t) => {
                const active = type === t;
                return (
                  <TouchableOpacity
                    key={t}
                    onPress={() => handleTypeSwitch(t)}
                    style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                  >
                    <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                      {t === 'expense' ? 'Expense' : 'Income'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <FieldInput
              label="Amount"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
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
              <Text style={styles.groupLabel}>Category</Text>
              <View style={styles.wrapRow}>
                {categories.map((cat) => {
                  const active = category === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
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
              label="Date (YYYY-MM-DD)"
              value={date}
              onChangeText={setDate}
              placeholder="2026-11-16"
            />

            <FieldInput
              label="Note"
              value={note}
              onChangeText={setNote}
              maxLength={240}
              placeholder="Merchant or description"
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <PrimaryButton
              label={editing ? 'Save Changes' : 'Save Transaction'}
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
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
  },
  segmentTextActive: {
    color: colors.text,
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
  error: {
    fontSize: 13,
    color: colors.danger,
  },
});
