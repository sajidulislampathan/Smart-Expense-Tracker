# Architecture & Entity-Relationship Diagram

## System Overview

Smart Expense Tracker follows a client-to-BaaS architecture using **Expo / React Native** on mobile devices and **Supabase (PostgreSQL + GoTrue Auth + Realtime)** as the backend.

```text
+-----------------------------------+
|      Expo Mobile App (iOS/Android)|
|  - AuthScreen (Email/Password)    |
|  - MainScreen Tabs:               |
|    Dashboard | Ledger | Budgets | |
|    Reports                        |
|  - Local Notifications (80%/100%) |
+-----------------+-----------------+
                  | HTTPS + WebSocket (Anon Key + User JWT)
                  v
+-----------------------------------+
|            Supabase               |
|  - Auth (auth.users)              |
|  - PostgreSQL + RLS               |
|  - Realtime CDC Publication       |
+-----------------------------------+
```

## Entity-Relationship Diagram (ERD)

```text
+---------------------+       1:1       +---------------------+
|     auth.users      |---------------->|   public.profiles   |
|---------------------|                 |---------------------|
| id (PK, uuid)       |                 | id (PK/FK, uuid)    |
| email               |                 | full_name           |
+---------------------+                 | default_currency    |
          |                             +---------------------+
          | 1:N
          +--------------------+--------------------+--------------------+
          |                    |                    |                    |
          v                    v                    v                    v
+-------------------+ +-------------------+ +-------------------+ +-------------------+
| public.categories | |public.transactions| |  public.budgets   | |public.budget_alerts|
|-------------------| |-------------------| |-------------------| |-------------------|
| id (PK, uuid)     | | id (PK, uuid)     | | id (PK, uuid)     | | id (PK, uuid)     |
| user_id (FK)      | | user_id (FK)      | | user_id (FK)      | | user_id (FK)      |
| name              | | type              | | month (YYYY-MM)   | | budget_id (FK)    |
| type              | | amount (> 0)      | | category          | | month (YYYY-MM)   |
| icon              | | currency (ISO)    | | currency (ISO)    | | category          |
+-------------------+ | category          | | limit_amount (>0) | | currency (ISO)    |
                      | note              | +-------------------+ | threshold_pct     |
                      | date (YYYY-MM-DD) |                       | spent_amount      |
                      | month (YYYY-MM)   |                       | triggered_at      |
                      +-------------------+                       +-------------------+
```

## Currency Isolation Design

Every financial row (`transactions`, `budgets`, `budget_alerts`) stores an explicit 3-letter ISO currency code constrained to the 10 supported currencies (`USD`, `BDT`, `EUR`, `GBP`, `INR`, `CAD`, `AUD`, `AED`, `SAR`, `JPY`). All aggregations group or filter by `(user_id, month, currency)` so figures are never combined across currencies without an explicit FX snapshot.
