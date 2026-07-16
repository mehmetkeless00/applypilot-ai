-- Phase 5B: per-analysis output language.
-- Additive only. Existing rows are backfilled to 'en' by the default, so
-- legacy analyses safely stay English; re-scores copy the original's value.

alter table public.analyses
  add column output_language text not null default 'en'
  check (output_language in ('en', 'tr'));
