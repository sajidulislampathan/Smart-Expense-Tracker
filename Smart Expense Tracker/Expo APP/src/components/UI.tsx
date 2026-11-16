import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

export const colors = {
  bg: '#F4F7FB',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  text: '#0F172A',
  muted: '#64748B',
  primary: '#0F766E',
  primarySoft: '#CCFBF1',
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
};

export const Card: React.FC<{ children: React.ReactNode; style?: ViewStyle }> = ({
  children,
  style,
}) => <View style={[styles.card, style]}>{children}</View>;

export const SectionTitle: React.FC<{ title: string; subtitle?: string }> = ({
  title,
  subtitle,
}) => (
  <View style={{ gap: 2 }}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
  </View>
);

export const PrimaryButton: React.FC<{
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}> = ({ label, onPress, loading, disabled, variant = 'primary' }) => {
  const bg =
    variant === 'danger'
      ? colors.danger
      : variant === 'secondary'
        ? '#E2E8F0'
        : colors.primary;
  const fg = variant === 'secondary' ? colors.text : '#FFFFFF';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={Boolean(disabled || loading)}
      activeOpacity={0.85}
      style={[
        styles.button,
        { backgroundColor: bg, opacity: disabled || loading ? 0.6 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <Text style={[styles.buttonText, { color: fg }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
};

export const FieldInput: React.FC<TextInputProps & { label: string }> = ({
  label,
  style,
  ...props
}) => (
  <View style={{ gap: 6 }}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      placeholderTextColor="#94A3B8"
      style={[styles.input, style]}
      {...props}
    />
  </View>
);

export const ProgressBar: React.FC<{ percentage: number; color: string }> = ({
  percentage,
  color,
}) => {
  const clamped = Math.max(0, Math.min(100, percentage));
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${clamped}%`, backgroundColor: color }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.muted,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
});
