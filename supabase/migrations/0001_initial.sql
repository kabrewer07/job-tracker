-- Job Tracker — complete initial schema
-- Run once against a new Supabase project:
--   Dashboard → SQL Editor → paste and run
--   or: supabase db push (Supabase CLI linked to your project)
--
-- Creates:
--   • public.applications — job application records per user
--   • public.monitored_sources — careers pages to watch (Job Monitor)
--   • public.excluded_keywords — title keywords to skip (Job Monitor)
--   • public.discovered_jobs — deduped postings found by the monitor
--     (salary, location, work_type, summary added in 0002 for existing installs)
--   • indexes, updated_at triggers, RLS policies, and grants

-- ─── applications ─────────────────────────────────────────────────────────────

create table if not exists public.applications (
  id               uuid        not null default gen_random_uuid() primary key,
  user_id          uuid        not null references auth.users (id) on delete cascade,
  company          text        not null,
  role             text        not null,
  date_applied     date,                    -- null when status is 'saved' (not applied yet)
  status           text        not null default 'saved'
                               check (status in (
                                 'saved',       -- saved JD, not applied yet
                                 'applied',
                                 'interviewing',
                                 'offer',
                                 'rejected'
                               )),
  job_url          text,
  notes            text,
  job_description  text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists applications_user_id_idx
  on public.applications (user_id);

create index if not exists applications_status_idx
  on public.applications (status);

create index if not exists applications_date_applied_idx
  on public.applications (date_applied desc nulls last);

-- ─── updated_at trigger (shared) ──────────────────────────────────────────────

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at
  before update on public.applications
  for each row
  execute function public.handle_updated_at();

alter table public.applications enable row level security;

create policy "Users can view own applications"
  on public.applications
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own applications"
  on public.applications
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own applications"
  on public.applications
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own applications"
  on public.applications
  for delete
  using (auth.uid() = user_id);

-- ─── Job Monitor: monitored_sources ───────────────────────────────────────────

create table if not exists public.monitored_sources (
  id          uuid        not null default gen_random_uuid() primary key,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  url         text        not null,
  label         text,
  dense_listing boolean     not null default false,
  active        boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, url)
);

create index if not exists monitored_sources_user_id_idx
  on public.monitored_sources (user_id);

create trigger set_monitored_sources_updated_at
  before update on public.monitored_sources
  for each row
  execute function public.handle_updated_at();

alter table public.monitored_sources enable row level security;

create policy "Users can view own monitored sources"
  on public.monitored_sources for select
  using (auth.uid() = user_id);

create policy "Users can insert own monitored sources"
  on public.monitored_sources for insert
  with check (auth.uid() = user_id);

create policy "Users can update own monitored sources"
  on public.monitored_sources for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own monitored sources"
  on public.monitored_sources for delete
  using (auth.uid() = user_id);

-- ─── Job Monitor: excluded_keywords ─────────────────────────────────────────────

create table if not exists public.excluded_keywords (
  id          uuid        not null default gen_random_uuid() primary key,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  keyword     text        not null,
  created_at  timestamptz not null default now(),
  unique (user_id, keyword)
);

create index if not exists excluded_keywords_user_id_idx
  on public.excluded_keywords (user_id);

alter table public.excluded_keywords enable row level security;

create policy "Users can view own excluded keywords"
  on public.excluded_keywords for select
  using (auth.uid() = user_id);

create policy "Users can insert own excluded keywords"
  on public.excluded_keywords for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own excluded keywords"
  on public.excluded_keywords for delete
  using (auth.uid() = user_id);

-- ─── Job Monitor: discovered_jobs ─────────────────────────────────────────────
-- Written by the cron/manual run (service role). Users can read their own rows.

create table if not exists public.discovered_jobs (
  id            uuid        not null default gen_random_uuid() primary key,
  user_id       uuid        not null references auth.users (id) on delete cascade,
  source_id     uuid        references public.monitored_sources (id) on delete set null,
  title         text        not null,
  company       text,
  job_url       text,
  posted_text   text,
  posted_at     date,
  salary        text,
  location      text,
  work_type     text,
  summary       text,
  source_label  text,
  source_url    text,
  also_seen_on  text[]      not null default '{}',
  fingerprint   text        not null,
  discovered_at timestamptz not null default now(),
  emailed_at    timestamptz,
  unique (user_id, fingerprint)
);

create index if not exists discovered_jobs_user_id_idx
  on public.discovered_jobs (user_id);

create index if not exists discovered_jobs_emailed_at_idx
  on public.discovered_jobs (user_id, emailed_at);

alter table public.discovered_jobs enable row level security;

create policy "Users can view own discovered jobs"
  on public.discovered_jobs for select
  using (auth.uid() = user_id);

-- ─── Job Monitor: monitor_runs ──────────────────────────────────────────────
-- Run history + skipped jobs (written by cron/manual run via service role).

create table if not exists public.monitor_runs (
  id               uuid        not null default gen_random_uuid() primary key,
  user_id          uuid        not null references auth.users (id) on delete cascade,
  ran_at           timestamptz not null default now(),
  sources_checked  int         not null default 0,
  jobs_found       int         not null default 0,
  skipped_keywords int         not null default 0,
  skipped_location int         not null default 0,
  jobs_eligible    int         not null default 0,
  jobs_inserted    int         not null default 0,
  jobs_merged      int         not null default 0,
  new_jobs         int         not null default 0,
  email_sent       boolean     not null default false,
  errors           text[]      not null default '{}',
  skipped_jobs     jsonb       not null default '[]',
  sources          jsonb       not null default '[]'
);

create index if not exists monitor_runs_user_ran_at_idx
  on public.monitor_runs (user_id, ran_at desc);

alter table public.monitor_runs enable row level security;

create policy "Users can view own monitor runs"
  on public.monitor_runs for select
  using (auth.uid() = user_id);

-- ─── Grants ───────────────────────────────────────────────────────────────────
-- RLS still restricts which rows each user can access.

grant usage on schema public to postgres, anon, authenticated, service_role;

grant all on public.applications to postgres, service_role;
grant select, insert, update, delete on public.applications to authenticated;

grant all on public.monitored_sources to postgres, service_role;
grant select, insert, update, delete on public.monitored_sources to authenticated;

grant all on public.excluded_keywords to postgres, service_role;
grant select, insert, delete on public.excluded_keywords to authenticated;

grant all on public.discovered_jobs to postgres, service_role;
grant select on public.discovered_jobs to authenticated;

grant all on public.monitor_runs to postgres, service_role;
grant select on public.monitor_runs to authenticated;
