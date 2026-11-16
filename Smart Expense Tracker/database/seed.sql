-- Smart Expense Tracker — Demo Seed Script
-- Prerequisites:
--   1. Run database/schema.sql first.
--   2. Create at least one user in Supabase Authentication -> Users
--      (e.g. demo@smartexpensetracker.app) so auth.users contains a user row.

do $$
declare
  v_user_id uuid;
  v_month text := to_char(current_date, 'YYYY-MM');
  v_prev_month text := to_char((date_trunc('month', current_date) - interval '1 month')::date, 'YYYY-MM');
  v_food_budget_id uuid;
begin
  select id into v_user_id
  from auth.users
  where email = 'demo@smartexpensetracker.app'
  limit 1;

  if v_user_id is null then
    select id into v_user_id
    from auth.users
    order by created_at desc
    limit 1;
  end if;

  if v_user_id is null then
    raise exception 'No user found in auth.users. Create a demo user in Supabase Authentication -> Users before running seed.sql.';
  end if;

  -- Ensure profile exists
  insert into public.profiles (id, email, full_name, default_currency, notifications_enabled)
  select id, coalesce(email, 'demo@smartexpensetracker.app'), 'Demo Account', 'USD', true
  from auth.users
  where id = v_user_id
  on conflict (id) do update
    set default_currency = excluded.default_currency,
        notifications_enabled = true;

  -- Demo categories
  insert into public.categories (user_id, name, type, color) values
    (v_user_id, 'Salary', 'income', '#16A34A'),
    (v_user_id, 'Freelance', 'income', '#059669'),
    (v_user_id, 'Food & Dining', 'expense', '#0F766E'),
    (v_user_id, 'Groceries', 'expense', '#0284C7'),
    (v_user_id, 'Transport', 'expense', '#D97706'),
    (v_user_id, 'Housing & Rent', 'expense', '#4F46E5'),
    (v_user_id, 'Utilities', 'expense', '#475569'),
    (v_user_id, 'Subscriptions', 'expense', '#7C3AED')
  on conflict (user_id, type, name) do nothing;

  -- Demo USD and BDT transactions (skip if user already has transactions)
  if not exists (select 1 from public.transactions where user_id = v_user_id) then
    insert into public.transactions (user_id, type, amount, currency, category, note, date) values
      (v_user_id, 'income', 4800.00, 'USD', 'Salary', 'Monthly payroll deposit', (v_month || '-01')::date),
      (v_user_id, 'income', 850.00, 'USD', 'Freelance', 'Mobile UI consulting milestone', (v_month || '-05')::date),
      (v_user_id, 'expense', 1450.00, 'USD', 'Housing & Rent', 'Apartment rent', (v_month || '-02')::date),
      (v_user_id, 'expense', 260.40, 'USD', 'Groceries', 'Weekly market & produce', (v_month || '-04')::date),
      (v_user_id, 'expense', 185.00, 'USD', 'Food & Dining', 'Client lunch and coffee', (v_month || '-06')::date),
      (v_user_id, 'expense', 240.00, 'USD', 'Food & Dining', 'Team dinner', (v_month || '-10')::date),
      (v_user_id, 'expense', 92.50, 'USD', 'Transport', 'Metro pass and rideshare', (v_month || '-08')::date),
      (v_user_id, 'expense', 118.00, 'USD', 'Utilities', 'Electricity and fiber internet', (v_month || '-09')::date),
      (v_user_id, 'expense', 44.00, 'USD', 'Subscriptions', 'Cloud backup and music', (v_month || '-11')::date),
      -- Previous month baseline for reports
      (v_user_id, 'income', 4800.00, 'USD', 'Salary', 'Monthly payroll deposit', (v_prev_month || '-01')::date),
      (v_user_id, 'expense', 1450.00, 'USD', 'Housing & Rent', 'Apartment rent', (v_prev_month || '-02')::date),
      (v_user_id, 'expense', 310.00, 'USD', 'Food & Dining', 'Dining and cafes', (v_prev_month || '-14')::date),
      -- Secondary currency (BDT) entries demonstrating strict currency isolation
      (v_user_id, 'income', 65000.00, 'BDT', 'Freelance', 'Local studio retainer', (v_month || '-03')::date),
      (v_user_id, 'expense', 14500.00, 'BDT', 'Groceries', 'Household groceries', (v_month || '-07')::date);
  end if;

  -- Demo monthly budgets (Food & Dining intentionally at 85% = 425 / 500 to demonstrate an 80% alert)
  insert into public.budgets (user_id, month, category, currency, limit_amount)
  values
    (v_user_id, v_month, 'Food & Dining', 'USD', 500.00),
    (v_user_id, v_month, 'Groceries', 'USD', 450.00),
    (v_user_id, v_month, 'Transport', 'USD', 150.00),
    (v_user_id, v_month, 'Utilities', 'USD', 180.00)
  on conflict (user_id, month, category, currency) do nothing;

  select id into v_food_budget_id
  from public.budgets
  where user_id = v_user_id
    and month = v_month
    and category = 'Food & Dining'
    and currency = 'USD'
  limit 1;

  -- Demo 80% budget alert row
  if v_food_budget_id is not null then
    insert into public.budget_alerts (
      user_id, budget_id, month, category, currency, threshold_pct, spent_amount, limit_amount
    ) values (
      v_user_id, v_food_budget_id, v_month, 'Food & Dining', 'USD', 80, 425.00, 500.00
    )
    on conflict (user_id, month, category, currency, threshold_pct) do nothing;
  end if;
end $$;
