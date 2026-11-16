import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { Card, colors, FieldInput, PrimaryButton } from '../components/UI';

export default function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!supabase) {
      setError('Supabase environment variables are not configured in .env yet.');
      return;
    }

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
        });
        if (signUpError) throw signUpError;
        setMessage('Account created. Check your inbox if email confirmation is enabled.');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (signInError) throw signInError;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.hero}>
            <Text style={styles.brand}>Smart Expense Tracker</Text>
            <Text style={styles.subtitle}>
              Track multi-currency income and expenses, set monthly category budgets, and get 80% & 100% alerts.
            </Text>
          </View>

          {!supabase ? (
            <Card style={{ gap: 8 }}>
              <Text style={styles.configTitle}>Supabase Configuration Required</Text>
              <Text style={styles.configBody}>
                Copy .env.example to .env and set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY, then restart Expo.
              </Text>
            </Card>
          ) : null}

          <Card style={{ gap: 16 }}>
            <View style={styles.tabs}>
              <TouchableOpacity
                onPress={() => {
                  setMode('signin');
                  setError(null);
                }}
                style={[styles.tab, mode === 'signin' && styles.tabActive]}
              >
                <Text style={[styles.tabText, mode === 'signin' && styles.tabTextActive]}>
                  Sign In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setMode('signup');
                  setError(null);
                }}
                style={[styles.tab, mode === 'signup' && styles.tabActive]}
              >
                <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>

            <FieldInput
              label="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
            />

            <FieldInput
              label="Password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholder="Minimum 6 characters"
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {message ? <Text style={styles.success}>{message}</Text> : null}

            <PrimaryButton
              label={mode === 'signin' ? 'Sign In' : 'Create Account'}
              loading={loading}
              onPress={() => void handleSubmit()}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    gap: 20,
  },
  hero: {
    gap: 8,
  },
  brand: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  configTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.warning,
  },
  configBody: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.text,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
  },
  tabTextActive: {
    color: colors.text,
  },
  error: {
    fontSize: 13,
    color: colors.danger,
  },
  success: {
    fontSize: 13,
    color: colors.success,
  },
});
