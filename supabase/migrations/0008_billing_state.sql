-- Phase 4A: production Stripe billing state.
-- Additive only. Existing rows keep working (new columns are nullable or
-- defaulted); legacy webhook-written fields are unchanged.

-- Full subscription state so the UI can show renewal/end dates and
-- cancellation status, and support can see exactly what Stripe reported.
alter table public.profiles
  add column stripe_price_id text,
  add column current_period_start timestamptz,
  add column current_period_end timestamptz,
  add column cancel_at_period_end boolean not null default false,
  -- Stripe event `created` timestamp of the last applied billing event;
  -- used to ignore out-of-order webhook deliveries.
  add column billing_event_at timestamptz;

-- Processed-webhook ledger for idempotency: event IDs are inserted before
-- processing; a conflict means the event was already handled (retry).
create table public.stripe_events (
  id text primary key,
  type text not null,
  created_at timestamptz not null default now()
);

-- Service-role only: RLS enabled with no policies means the anon/auth
-- roles can never read or write webhook bookkeeping.
alter table public.stripe_events enable row level security;
