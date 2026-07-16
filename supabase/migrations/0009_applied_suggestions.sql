-- Phase 5A: guided resume improvement loop.
-- Additive only. Applying an analysis suggestion creates a new immutable
-- resume version with source 'applied_suggestion' and enough metadata to
-- trace the source analysis, the suggestion, and the version it was
-- applied on top of.

alter table public.resume_versions
  drop constraint resume_versions_source_check;
alter table public.resume_versions
  add constraint resume_versions_source_check
  check (source in ('paste', 'pdf', 'applied_suggestion'));

alter table public.resume_versions
  add column source_analysis_id uuid references public.analyses(id) on delete set null,
  add column source_suggestion int,
  add column previous_version_id uuid references public.resume_versions(id) on delete set null;

-- Double-submit protection: applying the same suggestion of the same
-- analysis on top of the same previous version yields exactly one row,
-- even under concurrent requests.
create unique index resume_versions_applied_once_idx
  on public.resume_versions (source_analysis_id, source_suggestion, previous_version_id)
  where source = 'applied_suggestion';
