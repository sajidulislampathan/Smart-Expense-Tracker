import { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  Budget,
  BudgetInput,
  CURRENCY_CODES,
  CurrencyCode,
  Transaction,
  TransactionInput,
  UserProfile,
  VALIDATION_LIMITS,
} from '../types/finance';
import { db, handleFirestoreError, OperationType } from './firebase';

function sanitizeIdPart(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
}

function generateValidId(prefix: string): string {
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 16)
      : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${random}`;
}

function normalizeCurrency(code: string): CurrencyCode {
  return CURRENCY_CODES.includes(code as CurrencyCode) ? (code as CurrencyCode) : 'USD';
}

function validateTransactionInput(input: TransactionInput): TransactionInput {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > VALIDATION_LIMITS.MAX_AMOUNT) {
    throw new Error('Amount must be a positive number up to 1,000,000,000.');
  }
  const category = input.category.trim().slice(0, VALIDATION_LIMITS.MAX_CATEGORY_LENGTH);
  if (!category) {
    throw new Error('Please choose a category.');
  }
  const date = input.date.trim();
  if (!VALIDATION_LIMITS.DATE_PATTERN.test(date)) {
    throw new Error('Please enter a valid date in YYYY-MM-DD format.');
  }
  const note = input.note.trim().slice(0, VALIDATION_LIMITS.MAX_NOTE_LENGTH);
  const currency = normalizeCurrency(input.currency);
  const type = input.type === 'income' ? 'income' : 'expense';
  return { type, amount, currency, category, note, date };
}

function validateBudgetInput(input: BudgetInput): BudgetInput {
  const limitAmount = Number(input.limitAmount);
  if (
    !Number.isFinite(limitAmount) ||
    limitAmount <= 0 ||
    limitAmount > VALIDATION_LIMITS.MAX_AMOUNT
  ) {
    throw new Error('Budget limit must be a positive number up to 1,000,000,000.');
  }
  const category = input.category.trim().slice(0, VALIDATION_LIMITS.MAX_CATEGORY_LENGTH);
  if (!category) {
    throw new Error('Please choose a category.');
  }
  const month = input.month.trim();
  if (!VALIDATION_LIMITS.MONTH_PATTERN.test(month)) {
    throw new Error('Please choose a valid month in YYYY-MM format.');
  }
  const currency = normalizeCurrency(input.currency);
  return { month, category, currency, limitAmount };
}

export async function ensureUserProfile(
  user: User,
  defaultCurrency: CurrencyCode = 'USD',
): Promise<UserProfile> {
  const userPath = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  const safeEmail = (user.email ?? '').trim().slice(0, VALIDATION_LIMITS.MAX_EMAIL_LENGTH);
  const safeName = (user.displayName ?? safeEmail.split('@')[0] ?? 'User')
    .trim()
    .slice(0, VALIDATION_LIMITS.MAX_DISPLAY_NAME_LENGTH);

  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const payload = {
        uid: user.uid,
        email: safeEmail,
        displayName: safeName,
        defaultCurrency: normalizeCurrency(defaultCurrency),
        notificationsEnabled: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(userRef, payload);
      return {
        uid: user.uid,
        email: safeEmail,
        displayName: safeName,
        defaultCurrency: normalizeCurrency(defaultCurrency),
        notificationsEnabled: false,
      };
    }

    const data = snap.data() as UserProfile;
    return {
      uid: user.uid,
      email: data.email || safeEmail,
      displayName: data.displayName || safeName,
      defaultCurrency: normalizeCurrency(data.defaultCurrency),
      notificationsEnabled: Boolean(data.notificationsEnabled),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

export async function updateUserPreferences(
  uid: string,
  updates: Partial<Pick<UserProfile, 'defaultCurrency' | 'notificationsEnabled' | 'displayName'>>,
): Promise<void> {
  const userPath = `users/${uid}`;
  const userRef = doc(db, 'users', uid);
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (updates.defaultCurrency !== undefined) {
    payload.defaultCurrency = normalizeCurrency(updates.defaultCurrency);
  }
  if (updates.notificationsEnabled !== undefined) {
    payload.notificationsEnabled = Boolean(updates.notificationsEnabled);
  }
  if (updates.displayName !== undefined) {
    payload.displayName = updates.displayName
      .trim()
      .slice(0, VALIDATION_LIMITS.MAX_DISPLAY_NAME_LENGTH);
  }

  try {
    await updateDoc(userRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }
}

function getCreatedAtMillis(val: unknown): number {
  if (val instanceof Timestamp) {
    return val.toMillis();
  }
  if (val && typeof val === 'object' && 'seconds' in val) {
    return Number((val as { seconds: number }).seconds) * 1000;
  }
  return 0;
}

export function subscribeTransactions(
  uid: string,
  onData: (transactions: Transaction[]) => void,
  onError: (error: Error) => void,
): () => void {
  const collectionPath = `users/${uid}/transactions`;
  const q = query(collection(db, 'users', uid, 'transactions'), where('userId', '==', uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: Transaction[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          userId: String(d.userId),
          type: d.type === 'income' ? 'income' : 'expense',
          amount: Number(d.amount),
          currency: normalizeCurrency(String(d.currency)),
          category: String(d.category),
          note: String(d.note ?? ''),
          date: String(d.date),
          month: String(d.month),
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        };
      });

      items.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return getCreatedAtMillis(b.createdAt) - getCreatedAtMillis(a.createdAt);
      });

      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, collectionPath);
      } catch (err) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    },
  );
}

export function subscribeBudgets(
  uid: string,
  onData: (budgets: Budget[]) => void,
  onError: (error: Error) => void,
): () => void {
  const collectionPath = `users/${uid}/budgets`;
  const q = query(collection(db, 'users', uid, 'budgets'), where('userId', '==', uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: Budget[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          userId: String(d.userId),
          month: String(d.month),
          category: String(d.category),
          currency: normalizeCurrency(String(d.currency)),
          limitAmount: Number(d.limitAmount),
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        };
      });

      items.sort((a, b) => a.category.localeCompare(b.category));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, collectionPath);
      } catch (err) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    },
  );
}

export async function createTransaction(uid: string, input: TransactionInput): Promise<void> {
  const clean = validateTransactionInput(input);
  const txId = generateValidId('tx');
  const path = `users/${uid}/transactions/${txId}`;
  const docRef = doc(db, 'users', uid, 'transactions', txId);

  try {
    await setDoc(docRef, {
      userId: uid,
      type: clean.type,
      amount: clean.amount,
      currency: clean.currency,
      category: clean.category,
      note: clean.note,
      date: clean.date,
      month: clean.date.slice(0, 7),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateTransaction(
  uid: string,
  txId: string,
  input: TransactionInput,
): Promise<void> {
  const clean = validateTransactionInput(input);
  const path = `users/${uid}/transactions/${txId}`;
  const docRef = doc(db, 'users', uid, 'transactions', txId);

  try {
    await updateDoc(docRef, {
      type: clean.type,
      amount: clean.amount,
      currency: clean.currency,
      category: clean.category,
      note: clean.note,
      date: clean.date,
      month: clean.date.slice(0, 7),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteTransaction(uid: string, txId: string): Promise<void> {
  const path = `users/${uid}/transactions/${txId}`;
  const docRef = doc(db, 'users', uid, 'transactions', txId);

  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function makeBudgetDocId(month: string, category: string, currency: CurrencyCode): string {
  const safeMonth = month.replace('-', '');
  const safeCat = sanitizeIdPart(category) || 'cat';
  return `b_${safeMonth}_${safeCat}_${currency}`;
}

export async function upsertBudget(
  uid: string,
  input: BudgetInput,
  existingId?: string,
): Promise<void> {
  const clean = validateBudgetInput(input);
  const budgetId = existingId || makeBudgetDocId(clean.month, clean.category, clean.currency);
  const path = `users/${uid}/budgets/${budgetId}`;
  const docRef = doc(db, 'users', uid, 'budgets', budgetId);

  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      await updateDoc(docRef, {
        month: clean.month,
        category: clean.category,
        currency: clean.currency,
        limitAmount: clean.limitAmount,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        userId: uid,
        month: clean.month,
        category: clean.category,
        currency: clean.currency,
        limitAmount: clean.limitAmount,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteBudget(uid: string, budgetId: string): Promise<void> {
  const path = `users/${uid}/budgets/${budgetId}`;
  const docRef = doc(db, 'users', uid, 'budgets', budgetId);

  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
