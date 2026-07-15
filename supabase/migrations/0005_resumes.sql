-- Phase 3A: persistent resume library with immutable versions.
-- Additive only; existing analyses keep working (new columns are nullable).

create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index resumes_user_updated_idx on public.resumes (user_id, updated_at desc);

create table public.resume_versions (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  version int not null,
  content text,      -- pasted or edited resume text
  file_path text,    -- storage path in the `resumes` bucket when uploaded as PDF
  source text not null default 'paste' check (source in ('paste', 'pdf')),
  created_at timestamptz not null default now(),
  unique (resume_id, version),
  check (content is not null or file_path is not null)
);
create index resume_versions_resume_idx
  on public.resume_versions (resume_id, version desc);

alter table public.resumes enable row level security;
alter table public.resume_versions enable row level security;

create policy "Users can view own resumes"
  on public.resumes for select using (auth.uid() = user_id);
create policy "Users can insert own resumes"
  on public.resumes for insert with check (auth.uid() = user_id);
create policy "Users can update own resumes"
  on public.resumes for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Users can delete own resumes"
  on public.resumes for delete using (auth.uid() = user_id);

-- Versions are immutable: select + insert only. Rows disappear only via
-- the resume's on delete cascade.
create policy "Users can view own resume versions"
  on public.resume_versions for select using (auth.uid() = user_id);
create policy "Users can insert own resume versions"
  on public.resume_versions for insert with check (auth.uid() = user_id);

-- Link analyses to the resume/version they were scored against.
alter table public.analyses
  add column resume_id uuid references public.resumes(id) on delete set null,
  add column resume_version_id uuid references public.resume_versions(id) on delete set null;
