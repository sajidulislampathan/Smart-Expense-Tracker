# CLAUDE.md — Engineering & AI Coding Guide

This guide documents the architecture, invariants, and conventions for AI coding assistants working inside `Smart Expense Tracker`.

## Repository Layout

- `Expo APP/` — React Native + Expo SDK 53 TypeScript mobile app.
  - `App.tsx` — Root auth session listener switching between `AuthScreen` and `MainScreen`.
  - `src/types/finance.ts` — Domain types (`Transaction`, `Budget`, `Category`, `BudgetAlert`, `CurrencyCode`).
  - `src/lib/supabase.ts` — Supabase client configured with `AsyncStorage` persistence and safe env checks.
  - `src/lib/format.ts` — Currency formatting (`Intl.NumberFormat`), month utilities, and date validation.
  - `src/lib/notifications.ts` — `expo-notifications` permission requests and 80%/100% local alert dispatch.
  - `src/components/UI.tsx` — Shared design tokens (`colors`) and primitive components.
  - `src/components/TransactionModal.tsx` — Add/edit transaction modal.
  - `src/components/BudgetModal.tsx` — Add/edit monthly category budget modal.
  - `src/screens/AuthScreen.tsx` — Email/password login and signup screen.
  - `src/screens/MainScreen.tsx` — Bottom-tab workspace (`Dashboard`, `Transactions`, `Budgets`, `Reports`).
- `database/schema.sql` — Authoritative PostgreSQL schema, constraints, indexes, triggers, RLS policies, and Realtime setup.
- `database/seed.sql` — Idempotent demo data script for categories, transactions, budgets, and alerts.

## Non-Negotiable Invariants

1. **Strict Currency Isolation**: Never sum amounts across different ISO currency codes (`USD`, `BDT`, `EUR`, etc.). Every dashboard metric, budget calculation, and report must filter by `currency === selectedCurrency`.
2. **Row Level Security First**: All queries rely on Supabase RLS (`auth.uid() = user_id`). Always supply `user_id` explicitly on inserts and never bypass RLS with service keys in client code.
3. **Date & Month Consistency**: `date` uses `YYYY-MM-DD` and `month` uses `YYYY-MM` (matching `substring(date from 1 for 7)` in SQL). Keep both synchronized on every transaction insert/update.
4. **Budget Threshold Semantics**:
   - `< 80%`: Normal
   - `>= 80%` and `< 100%`: Warning alert (`threshold_pct = 80`)
   - `>= 100%`: Exceeded alert (`threshold_pct = 100`)
   Deduplicate notifications per `(month, category, currency, threshold)` so users are not spammed on re-renders.
5. **Type Safety**: Run `npm run typecheck` inside `Expo APP/` after every edit. Keep `strict: true` in `tsconfig.json` clean with zero `any` regressions.
