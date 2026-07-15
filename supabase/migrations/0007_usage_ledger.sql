-- Phase 3F: append-only usage ledger.
-- Plan limits and rate limits previously counted rows in `analyses`, which
-- users can delete — deleting an analysis silently refunded quota. The
-- ledger has no update/delete policies, so usage survives deletion.

create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'analysis'
    check (kind in ('analysis', 'import', 'export')),
  created_at timestamptz not null default now()
);

create index usage_events_user_kind_created_idx
  on public.usage_events (user_id, kind, created_at desc);

alter table public.usage_events enable row level security;

create policy "Users can view own usage"
  on public.usage_events for select using (auth.uid() = user_id);
create policy "Users can record own usage"
  on public.usage_events for insert with check (auth.uid() = user_id);
-- Intentionally no update/delete policies: the ledger is append-only.

-- Backfill: existing analyses count toward this month's usage.
insert into public.usage_events (user_id, kind, created_at)
select user_id, 'analysis', created_at from public.analyses;
