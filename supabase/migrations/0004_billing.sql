-- Phase 2 M5: Stripe billing.
-- Additive only; existing profiles default to the free plan.
alter table public.profiles
  add column plan text not null default 'free' check (plan in ('free', 'pro')),
  add column stripe_customer_id text,
  add column stripe_subscription_id text,
  add column subscription_status text;

create unique index profiles_stripe_customer_idx
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

-- Billing columns must only change via the service role (Stripe webhook /
-- checkout flow). Without this, the "own profile" RLS policy would let a
-- user set plan = 'pro' directly through the REST API. Column-level grants
-- keep full_name self-serviceable.
revoke update on public.profiles from anon, authenticated;
grant update (full_name) on public.profiles to authenticated;
