-- ALIGN schema — paste this into the Supabase SQL editor and run it once.
-- Dashboard → SQL Editor → New query → Run

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  date date not null,
  day_id text not null,
  minutes int not null default 0,
  completed int not null default 0,
  total int not null default 0,
  log jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists workouts_user_date_idx on public.workouts (user_id, date desc);
create unique index if not exists workouts_user_date_day_uidx on public.workouts (user_id, date, day_id);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists push_subs_user_idx on public.push_subscriptions (user_id);

create table if not exists public.notification_prefs (
  user_id uuid primary key references auth.users on delete cascade,
  enabled boolean not null default true,
  reminder_hour int not null default 7,
  reminder_minute int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.workouts enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_prefs enable row level security;

drop policy if exists "profiles self" on public.profiles;
create policy "profiles self" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "workouts self" on public.workouts;
create policy "workouts self" on public.workouts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "push self" on public.push_subscriptions;
create policy "push self" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "prefs self" on public.notification_prefs;
create policy "prefs self" on public.notification_prefs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  insert into public.notification_prefs (user_id, enabled, reminder_hour, reminder_minute)
  values (new.id, true, 7, 0)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Allow the edge function (service role) to read prefs + subscriptions.
-- Service role bypasses RLS by default; no extra policy needed.
