# Changelog

All notable changes to **Smart Expense Tracker** are documented in this file.

## [1.0.0] - 2026-11-16

### Added
- Initial release of the Expo + React Native + TypeScript mobile application (`Expo APP/`).
- Email and password sign-up, sign-in, and sign-out via Supabase Auth.
- Complete PostgreSQL database schema (`database/schema.sql`) with profiles, categories, transactions, budgets, and budget alerts protected by per-user Row Level Security.
- Demo seed script (`database/seed.sql`) with sample categories, multi-currency transactions, monthly budgets, and an 80%+ alert entry.
- Multi-currency support (`USD`, `BDT`, `EUR`, `GBP`, `INR`, `CAD`, `AUD`, `AED`, `SAR`, `JPY`) with strict per-currency filtering on all totals and reports.
- Realtime Supabase subscriptions for automatic cross-device updates on transactions and budgets.
- Monthly category budget progress tracking with 80% and 100%+ local notification alerts via `expo-notifications`.
- Full documentation suite (`README.md`, `HowToSetup.md`, `CLAUDE.md`, `LICENSE-NOTE.md`, `docs/architecture.md`).
