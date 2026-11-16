# Smart Expense Tracker

A cross-platform personal finance mobile application built with **Expo**, **React Native**, **TypeScript**, and **Supabase** (PostgreSQL + Auth + Realtime).

## Target Audience

- Individuals tracking daily expenses and income across one or more currencies without misleading FX aggregation.
- Freelancers, expats, and travelers managing separate balances in `USD`, `BDT`, `EUR`, `GBP`, `INR`, `CAD`, `AUD`, `AED`, `SAR`, or `JPY`.
- Mobile product builders looking for a clean, RLS-hardened Expo + Supabase starter architecture.

## Included Features

- **Email & Password Authentication**: Sign up, sign in, and sign out via Supabase Auth (`src/screens/AuthScreen.tsx`).
- **Cloud Persistence & Row Level Security**: Every transaction, category budget, and alert record is scoped strictly to `auth.uid()` via PostgreSQL RLS policies.
- **Realtime Sync**: Live Supabase Realtime subscriptions refresh transactions and budgets across signed-in devices.
- **Multi-Currency Isolation**: Supports `USD`, `BDT`, `EUR`, `GBP`, `INR`, `CAD`, `AUD`, `AED`, `SAR`, and `JPY`. Totals, budgets, and reports strictly filter to the selected currency and never combine unconverted currencies.
- **Transactions Ledger**: Income and expense entries with category, amount, currency, date (`YYYY-MM-DD`), and notes.
- **Monthly Category Budgets**: Set category spending caps per month and currency with visual progress bars.
- **80% & 100% Budget Alerts**: Local device notifications via `expo-notifications` plus persisted alert logs when category spending reaches 80% or 100%+.
- **Dashboard, History, Budgets & Reports**: Four-tab mobile navigation (`Dashboard`, `Transactions`, `Budgets`, `Reports`) in an English-only interface.

## Folder Structure

```text
Smart Expense Tracker/
├── README.md
├── HowToSetup.md
├── CLAUDE.md
├── CHANGELOG.md
├── LICENSE-NOTE.md
├── Expo APP/
│   ├── App.tsx
│   ├── app.json
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── .gitignore
│   └── src/
│       ├── components/
│       ├── lib/
│       ├── screens/
│       └── types/
├── database/
│   ├── schema.sql
│   └── seed.sql
└── docs/
    └── architecture.md
```

## Screens Overview

1. **Auth Screen**: Clean email/password sign-in and account creation card with configuration status checks.
2. **Dashboard**: Selected currency & month switcher, Income / Expense / Net KPI summary, budget watchlist, and recent entries.
3. **Transactions**: Searchable ledger filtered by currency, month, type, and category with add/edit/delete support.
4. **Budgets**: Monthly category limits with normal, 80% warning, and 100% exceeded progress states.
5. **Reports**: Category-by-category spending breakdown and month-over-month cash flow summary for the selected currency.

## Demo Login (After Running `database/seed.sql`)

1. Create a user in **Supabase Authentication → Users** (for example `demo@smartexpensetracker.app` with a password you choose, and check **Auto Confirm User**).
2. Run `database/schema.sql` followed by `database/seed.sql` in the **Supabase SQL Editor** (the seed script automatically attaches sample categories, multi-currency transactions, budgets, and an 80%+ alert to that demo account's user ID or the most recent user in `auth.users`).
3. Sign in inside the Expo app with that email and password.

## License Note

Commercial and buyer usage terms are documented in [`LICENSE-NOTE.md`](./LICENSE-NOTE.md).
