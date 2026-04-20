-- Job Tracker — initial schema
-- Run against your Supabase project via the SQL editor or the Supabase CLI:
--   supabase db push  (if using local dev)
--   or paste into the SQL editor in the Supabase dashboard

-- ─── Table ────────────────────────────────────────────────────────────────────

create table if not exists public.applications (
  id           uuid        not null default gen_random_uuid() primary key,
  user_id      uuid        not null references auth.users (id) on delete cascade,
  company      text        not null,
  role         text        not null,
  date_applied date        not null,
  status       text        not null default 'applied'
                           check (status in ('applied', 'interviewing', 'offer', 'rejected')),
  job_url          text,
  notes            text,
  job_description  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

create index if not exists applications_user_id_idx
  on public.applications (user_id);

create index if not exists applications_status_idx
  on public.applications (status);

create index if not exists applications_date_applied_idx
  on public.applications (date_applied desc);

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
  execute procedure public.handle_updated_at();

-- ─── Row-Level Security ───────────────────────────────────────────────────────

alter table public.applications enable row level security;

-- Users may only select their own rows
create policy "Users can view own applications"
  on public.applications
  for select
  using (auth.uid() = user_id);

-- Users may only insert rows they own
create policy "Users can insert own applications"
  on public.applications
  for insert
  with check (auth.uid() = user_id);

-- Users may only update their own rows
create policy "Users can update own applications"
  on public.applications
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Users may only delete their own rows
create policy "Users can delete own applications"
  on public.applications
  for delete
  using (auth.uid() = user_id);
