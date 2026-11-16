import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { BudgetProgress } from '../types/finance';
import { formatCurrency } from './format';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === 'granted') return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === 'granted';
}

export async function dispatchBudgetThresholdAlert(
  progress: BudgetProgress,
  sentKeys: Set<string>,
): Promise<'80' | '100' | null> {
  if (progress.level === 'normal') return null;

  const threshold: '80' | '100' = progress.level === 'exceeded' ? '100' : '80';
  const key = `${progress.budget.month}_${progress.budget.category}_${progress.budget.currency}_${threshold}`;
  if (sentKeys.has(key)) return null;
  sentKeys.add(key);

  if (Platform.OS === 'web') {
    return threshold;
  }

  const title =
    threshold === '100'
      ? `Budget Exceeded: ${progress.budget.category}`
      : `Budget Warning (80%): ${progress.budget.category}`;
  const body = `Spent ${formatCurrency(progress.spent, progress.budget.currency)} of ${formatCurrency(
    progress.budget.limit_amount,
    progress.budget.currency,
  )} (${progress.percentage.toFixed(0)}%).`;

  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    });
  } catch {
    // Ignore local notification scheduling errors on unsupported simulators
  }

  return threshold;
}
