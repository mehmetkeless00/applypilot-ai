-- Phase 2 / M2: ATS keyword coverage.
-- Additive and backward compatible — existing rows get an empty array
-- (Postgres backfills NOT NULL columns that have a default).
alter table public.analyses
  add column ats_keywords jsonb not null default '[]'::jsonb;
