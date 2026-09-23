-- ALIGN — missing app_state table (scripture / memory verse / sprint).
-- Run once in Supabase → SQL Editor. Safe if already applied.

create table if not exists public.app_state (
  user_id uuid primary key references auth.users on delete cascade,
  scripture jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

drop policy if exists "app state self" on public.app_state;
create policy "app state self" on public.app_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create unique index if not exists workouts_user_date_day_uidx on public.workouts (user_id, date, day_id);
