-- ALIGN life — morning ritual, journal, plans, bible cursor.
-- Run once in SQL Editor after schema.sql.

create table if not exists public.mornings (
  user_id uuid not null references auth.users on delete cascade,
  date date not null,
  steps jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create table if not exists public.day_plans (
  user_id uuid not null references auth.users on delete cascade,
  date date not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create table if not exists public.journals (
  user_id uuid not null references auth.users on delete cascade,
  date date not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create table if not exists public.bible_state (
  user_id uuid primary key references auth.users on delete cascade,
  book text not null default 'Genesis',
  chapter int not null default 1,
  log jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.mornings enable row level security;
alter table public.day_plans enable row level security;
alter table public.journals enable row level security;
alter table public.bible_state enable row level security;

drop policy if exists "mornings self" on public.mornings;
create policy "mornings self" on public.mornings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "plans self" on public.day_plans;
create policy "plans self" on public.day_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "journals self" on public.journals;
create policy "journals self" on public.journals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "bible self" on public.bible_state;
create policy "bible self" on public.bible_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.app_state enable row level security;
drop policy if exists "app state self" on public.app_state;
create policy "app state self" on public.app_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
