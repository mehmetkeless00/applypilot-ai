-- ApplyPilot AI — initial schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).

-- ============================================================
-- Profiles: one row per auth user, auto-created on signup
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Analyses: one row per job-application analysis
-- ============================================================
create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job_title text not null,
  company text,
  job_description text not null,
  resume_text text,              -- null when a PDF was uploaded instead
  resume_file_path text,         -- storage path in the `resumes` bucket when PDF uploaded
  fit_score int not null check (fit_score between 0 and 100),
  fit_summary text not null default '',
  missing_skills jsonb not null default '[]'::jsonb,  -- [{skill, importance, suggestion}]
  strengths jsonb not null default '[]'::jsonb,       -- [{strength, evidence}]
  tailored_summary text not null,
  cover_letter text not null,
  model text not null,
  created_at timestamptz not null default now()
);

create index analyses_user_created_idx
  on public.analyses (user_id, created_at desc);

alter table public.analyses enable row level security;

create policy "Users can view own analyses"
  on public.analyses for select
  using (auth.uid() = user_id);

create policy "Users can insert own analyses"
  on public.analyses for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own analyses"
  on public.analyses for delete
  using (auth.uid() = user_id);

-- ============================================================
-- Storage: private bucket for uploaded resumes
-- Objects are stored under {user_id}/{uuid}.pdf
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resumes', 'resumes', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

create policy "Users can upload own resumes"
  on storage.objects for insert
  with check (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can read own resumes"
  on storage.objects for select
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own resumes"
  on storage.objects for delete
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
