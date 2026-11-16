-- Smart Expense Tracker — Supabase PostgreSQL Schema
-- Run this script in the Supabase SQL Editor on an empty database.

create extension if not exists pgcrypto;

-- 1. Helper trigger for updated_at timestamps
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- 2. User profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  full_name text not null default '',
  default_currency text not null default 'USD'
    check (default_currency in ('USD', 'BDT', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'AED', 'SAR', 'JPY')),
  notifications_enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create profile row on new auth.users signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, 'User'), '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. Custom & default categories per user
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 48),
  type text not null check (type in ('income', 'expense')),
  color text not null default '#0F766E',
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, type, name)
);

create index if not exists idx_categories_user_type
  on public.categories(user_id, type);

-- 4. Income & Expense transactions
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  amount numeric(14, 2) not null check (amount > 0 and amount <= 1000000000),
  currency text not null
    check (currency in ('USD', 'BDT', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'AED', 'SAR', 'JPY')),
  category text not null check (char_length(trim(category)) between 1 and 48),
  note text not null default '' check (char_length(note) <= 240),
  date date not null,
  month text generated always as (to_char(date, 'YYYY-MM')) stored,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_transactions_user_month_currency
  on public.transactions(user_id, month, currency);

create index if not exists idx_transactions_user_date
  on public.transactions(user_id, date desc);

drop trigger if exists trg_transactions_updated_at on public.transactions;
create trigger trg_transactions_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

-- 5. Monthly category budgets
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  category text not null check (char_length(trim(category)) between 1 and 48),
  currency text not null
    check (currency in ('USD', 'BDT', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'AED', 'SAR', 'JPY')),
  limit_amount numeric(14, 2) not null check (limit_amount > 0 and limit_amount <= 1000000000),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, month, category, currency)
);

create index if not exists idx_budgets_user_month_currency
  on public.budgets(user_id, month, currency);

drop trigger if exists trg_budgets_updated_at on public.budgets;
create trigger trg_budgets_updated_at
  before update on public.budgets
  for each row execute function public.set_updated_at();

-- 6. Budget threshold alert log (80% & 100%)
create table if not exists public.budget_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  budget_id uuid references public.budgets(id) on delete cascade,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  category text not null check (char_length(trim(category)) between 1 and 48),
  currency text not null
    check (currency in ('USD', 'BDT', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'AED', 'SAR', 'JPY')),
  threshold_pct integer not null check (threshold_pct in (80, 100)),
  spent_amount numeric(14, 2) not null check (spent_amount >= 0),
  limit_amount numeric(14, 2) not null check (limit_amount > 0),
  triggered_at timestamptz not null default timezone('utc', now()),
  unique (user_id, month, category, currency, threshold_pct)
);

create index if not exists idx_budget_alerts_user_month
  on public.budget_alerts(user_id, month, triggered_at desc);

-- 7. Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.budget_alerts enable row level security;

-- Profiles policies
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Categories policies
drop policy if exists "categories_all_own" on public.categories;
create policy "categories_all_own"
  on public.categories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Transactions policies
drop policy if exists "transactions_all_own" on public.transactions;
create policy "transactions_all_own"
  on public.transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Budgets policies
drop policy if exists "budgets_all_own" on public.budgets;
create policy "budgets_all_own"
  on public.budgets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Budget alerts policies
drop policy if exists "budget_alerts_all_own" on public.budget_alerts;
create policy "budget_alerts_all_own"
  on public.budget_alerts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 8. Enable Supabase Realtime for transactions and budgets
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'transactions'
  ) then
    alter publication supabase_realtime add table public.transactions;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'budgets'
  ) then
    alter publication supabase_realtime add table public.budgets;
  end if;
end $$;
