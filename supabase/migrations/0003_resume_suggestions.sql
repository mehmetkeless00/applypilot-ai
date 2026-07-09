-- Phase 2 M3: resume rewrite suggestions.
-- Additive only; existing rows get an empty array and keep rendering.
alter table public.analyses
  add column resume_suggestions jsonb not null default '[]'::jsonb;
