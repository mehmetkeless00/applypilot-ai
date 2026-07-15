-- Phase 3B: re-score loop.
-- Links a re-run analysis to the analysis it re-scored, so score changes
-- can be shown over time. Additive only.
alter table public.analyses
  add column rescored_from uuid references public.analyses(id) on delete set null;

create index analyses_rescored_from_idx
  on public.analyses (rescored_from)
  where rescored_from is not null;
