import { CURRENCIES, CurrencyCode, Transaction } from '../types/finance';

const currencyMetaMap = new Map(CURRENCIES.map((c) => [c.code, c]));

export function formatCurrency(amount: number, currency: CurrencyCode): string {
  const meta = currencyMetaMap.get(currency);
  const decimals = meta?.decimals ?? 2;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  } catch {
    const symbol = meta?.symbol ?? currency;
    return `${symbol} ${amount.toFixed(decimals)}`;
  }
}

export function formatCompactCurrency(amount: number, currency: CurrencyCode): string {
  const meta = currencyMetaMap.get(currency);
  const decimals = meta?.decimals ?? 2;
  if (Math.abs(amount) >= 1000) {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(amount);
    } catch {
      return formatCurrency(amount, currency);
    }
  }
  return formatCurrency(amount, currency);
}

export function getCurrencyMeta(currency: CurrencyCode) {
  return currencyMetaMap.get(currency) ?? CURRENCIES[0];
}

export function getCurrentMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function getTodayDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatMonthLabel(month: string): string {
  const [yearStr, monthStr] = month.split('-');
  const year = Number(yearStr);
  const mIdx = Number(monthStr) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(mIdx) || mIdx < 0 || mIdx > 11) {
    return month;
  }
  const date = new Date(year, mIdx, 1);
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
}

export function formatMonthShort(month: string): string {
  const [yearStr, monthStr] = month.split('-');
  const year = Number(yearStr);
  const mIdx = Number(monthStr) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(mIdx) || mIdx < 0 || mIdx > 11) {
    return month;
  }
  const date = new Date(year, mIdx, 1);
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' }).format(date);
}

export function formatDateShort(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const date = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function getRecentMonths(count: number, baseMonth: string): string[] {
  const [yearStr, monthStr] = baseMonth.split('-');
  const baseYear = Number(yearStr);
  const baseMonthIdx = Number(monthStr) - 1;
  const result: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(baseYear, baseMonthIdx - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    result.push(`${y}-${m}`);
  }
  return result;
}

export function shiftMonth(month: string, delta: number): string {
  const [yearStr, monthStr] = month.split('-');
  const d = new Date(Number(yearStr), Number(monthStr) - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function exportTransactionsCsv(
  transactions: Transaction[],
  currency: CurrencyCode,
  monthLabel: string,
): void {
  const headers = ['Date', 'Type', 'Category', 'Amount', 'Currency', 'Note'];
  const escapeCell = (val: string) => {
    const safe = val.replace(/"/g, '""');
    return /[",\n]/.test(safe) ? `"${safe}"` : safe;
  };

  const rows = transactions.map((tx) =>
    [
      tx.date,
      tx.type,
      escapeCell(tx.category),
      String(tx.amount),
      tx.currency,
      escapeCell(tx.note),
    ].join(','),
  );

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `smart-expense-tracker-${currency.toLowerCase()}-${monthLabel}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
