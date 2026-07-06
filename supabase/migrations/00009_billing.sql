-- ============================================================
-- Phase 10: billing. Users READ their own rows; ONLY the
-- Stripe webhook (service role) writes. DB mirrors Stripe.
-- ============================================================

create table public.billing_customers (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now()
);
alter table public.billing_customers enable row level security;
create policy "billing_customers_select_own" on public.billing_customers
  for select using (profile_id = auth.uid());
-- no insert/update/delete policies: service role only

create table public.subscriptions (
  id text primary key, -- Stripe subscription id
  profile_id uuid not null references public.profiles (id) on delete cascade,
  price_id text not null,
  status text not null, -- trialing | active | past_due | canceled | ...
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);
create index subscriptions_profile_idx on public.subscriptions (profile_id);
alter table public.subscriptions enable row level security;
create policy "subscriptions_select_own" on public.subscriptions
  for select using (profile_id = auth.uid());

create table public.purchases (
  id text primary key, -- Stripe payment intent id
  profile_id uuid not null references public.profiles (id) on delete cascade,
  product text not null, -- e.g. coach_lifetime
  amount integer not null,
  purchased_at timestamptz not null default now()
);
create index purchases_profile_idx on public.purchases (profile_id);
alter table public.purchases enable row level security;
create policy "purchases_select_own" on public.purchases
  for select using (profile_id = auth.uid());
