-- Job Tracker — complete initial schema
-- Run once against a new Supabase project:
--   Dashboard → SQL Editor → paste and run
--   or: supabase db push (Supabase CLI linked to your project)
--
-- Creates:
--   • public.applications — job application records per user
--   • indexes on user_id, status, date_applied
--   • updated_at trigger
--   • row-level security (users see only their own rows)
--   • grants for the authenticated role

-- ─── Table ────────────────────────────────────────────────────────────────────

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

-- ─── Indexes ──────────────────────────────────────────────────────────────────

create index if not exists applications_user_id_idx
  on public.applications (user_id);

create index if not exists applications_status_idx
  on public.applications (status);

create index if not exists applications_date_applied_idx
  on public.applications (date_applied desc nulls last);

-- ─── updated_at trigger ───────────────────────────────────────────────────────

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

-- ─── Row-Level Security ───────────────────────────────────────────────────────

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

-- ─── Grants ───────────────────────────────────────────────────────────────────
-- RLS still restricts which rows each user can access.

grant usage on schema public to postgres, anon, authenticated, service_role;

grant all on public.applications to postgres, service_role;

grant select, insert, update, delete on public.applications to authenticated;
