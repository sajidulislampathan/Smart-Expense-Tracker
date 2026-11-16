import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import { Check, Lock, Mail, Moon, Sun } from 'lucide-react';
import { auth, googleProvider } from '../lib/firebase';

interface AuthViewProps {
  pendingVerificationUser: User | null;
  darkMode: boolean;
  onToggleDark: () => void;
  onVerificationRefreshed: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  pendingVerificationUser,
  darkMode,
  onToggleDark,
  onVerificationRefreshed,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setError(null);
    setInfoMessage(null);
    setSubmitting(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/popup-closed-by-user') {
        setError('Sign-in popup was closed before completing.');
      } else {
        setError(err instanceof Error ? err.message : 'Unable to sign in with Google.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Please enter both your email address and password.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        if (displayName.trim()) {
          await updateProfile(cred.user, { displayName: displayName.trim().slice(0, 100) });
        }
        await sendEmailVerification(cred.user);
        setInfoMessage('Verification link sent. Please check your inbox and verify your email.');
      } else {
        await signInWithEmailAndPassword(auth, trimmedEmail, password);
      }
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/operation-not-allowed') {
        setError(
          'Email/Password sign-in is not yet enabled in your Firebase Console (Authentication → Sign-in method → Email/Password). Use Continue with Google above, or enable Email/Password in Firebase Console.',
        );
      } else if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        setError('Incorrect email or password.');
      } else if (code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Try signing in instead.');
      } else if (code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.');
      } else {
        setError(err instanceof Error ? err.message : 'Authentication failed.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (!pendingVerificationUser) return;
    setError(null);
    setInfoMessage(null);
    setSubmitting(true);
    try {
      await sendEmailVerification(pendingVerificationUser);
      setInfoMessage('A fresh verification link has been sent to your email.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send verification email.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefreshVerification = async () => {
    if (!pendingVerificationUser) return;
    setError(null);
    setSubmitting(true);
    try {
      await pendingVerificationUser.reload();
      onVerificationRefreshed();
      if (!auth.currentUser?.emailVerified) {
        setError('Email is not verified yet. Please click the link in your inbox first.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to refresh verification status.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <header className="w-full border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-8">
          <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0 font-display">
            Smart Expense Tracker
          </span>
          <button
            type="button"
            onClick={onToggleDark}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            <span>{darkMode ? 'Light' : 'Dark'}</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <section className="lg:col-span-6 space-y-6">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-tight [text-wrap:balance]">
              Multi-currency expense tracking and disciplined monthly budgets.
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
              Record income and expenses in 10 currencies without cross-currency distortion, monitor monthly category limits with 80% and 100% alerts, and sync across your devices.
            </p>
            <ul className="space-y-3 pt-2 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-3">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <span>Isolated currency totals across USD, BDT, EUR, GBP, INR, CAD, AUD, AED, SAR, and JPY</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <span>Real-time cloud ledger with per-user security rules and instant updates</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <span>Automated 80% warning and 100% exceeded category budget alerts</span>
              </li>
            </ul>
          </section>

          <section className="lg:col-span-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
              {pendingVerificationUser ? (
                <div className="space-y-5">
                  <div className="space-y-1">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                      Verify your email address
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      We sent a verification link to{' '}
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {pendingVerificationUser.email}
                      </span>
                      . Verify your email before writing to your ledger.
                    </p>
                  </div>

                  {error && (
                    <p className="text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg px-3.5 py-2.5">
                      {error}
                    </p>
                  )}
                  {infoMessage && (
                    <p className="text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 rounded-lg px-3.5 py-2.5">
                      {infoMessage}
                    </p>
                  )}

                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleRefreshVerification}
                      className="w-full py-2.5 px-4 text-sm font-medium rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
                    >
                      I have verified, continue
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleResendVerification}
                      className="w-full py-2.5 px-4 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      Resend verification email
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => void signOut(auth)}
                      className="w-full py-2 px-4 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                    >
                      Sign out and use another account
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                      {mode === 'signin' ? 'Sign in to your ledger' : 'Create your account'}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Access your transactions, budgets, and monthly reports.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleGoogleSignIn}
                    className="w-full py-2.5 px-4 flex items-center justify-center gap-3 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </button>

                  <div className="relative flex items-center">
                    <div className="flex-1 border-t border-slate-200 dark:border-slate-800" />
                    <span className="px-3 text-xs text-slate-400 dark:text-slate-500">or with email</span>
                    <div className="flex-1 border-t border-slate-200 dark:border-slate-800" />
                  </div>

                  <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signin');
                        setError(null);
                      }}
                      className={`py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                        mode === 'signin'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signup');
                        setError(null);
                      }}
                      className={`py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                        mode === 'signup'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      Create Account
                    </button>
                  </div>

                  <form onSubmit={handleEmailSubmit} className="space-y-4">
                    {mode === 'signup' && (
                      <div className="space-y-1.5">
                        <label
                          htmlFor="auth-name"
                          className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                        >
                          Full name
                        </label>
                        <input
                          id="auth-name"
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          maxLength={100}
                          placeholder="Alex Morgan"
                          className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label
                        htmlFor="auth-email"
                        className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                      >
                        Email address
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          id="auth-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="auth-password"
                        className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                      >
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          id="auth-password"
                          type="password"
                          required
                          minLength={6}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Minimum 6 characters"
                          className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />
                      </div>
                    </div>

                    {error && (
                      <p className="text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg px-3.5 py-2.5 leading-relaxed">
                        {error}
                      </p>
                    )}

                    {infoMessage && (
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 rounded-lg px-3.5 py-2.5 leading-relaxed">
                        {infoMessage}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-2.5 px-4 text-sm font-medium rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {submitting
                        ? 'Please wait...'
                        : mode === 'signin'
                          ? 'Sign In'
                          : 'Create Account'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};
