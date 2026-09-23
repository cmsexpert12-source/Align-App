-- ALIGN — everything. Paste into Supabase → SQL Editor → Run.
-- Safe to run again. One shot: accounts, mornings, Word, books, sound.

create extension if not exists "pgcrypto";

-- ---------- account ----------
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
  timezone text not null default 'Africa/Lagos',
  last_wake_sent date,
  last_lights_sent date,
  updated_at timestamptz not null default now()
);

-- ---------- morning / Word / plan ----------
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

create table if not exists public.notes (
  user_id uuid not null references auth.users on delete cascade,
  id text not null,
  date date not null,
  title text not null default '',
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists notes_user_updated_idx on public.notes (user_id, updated_at desc);

create table if not exists public.bible_state (
  user_id uuid primary key references auth.users on delete cascade,
  book text not null default 'Genesis',
  chapter int not null default 1,
  log jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.app_state (
  user_id uuid primary key references auth.users on delete cascade,
  scripture jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------- books ----------
create table if not exists public.books (
  id uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  author text not null default '',
  filename text,
  storage_path text,
  bytes int not null default 0,
  pages int not null default 0,
  current_page int not null default 1,
  slot text not null default 'evening',
  days int[] not null default '{1,2,3,4,5,6}',
  pages_per_day int not null default 8,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists books_user_idx on public.books (user_id);

create table if not exists public.reading_log (
  user_id uuid not null references auth.users on delete cascade,
  book_id uuid not null references public.books on delete cascade,
  date date not null,
  from_page int,
  to_page int,
  updated_at timestamptz not null default now(),
  primary key (user_id, book_id, date)
);

-- ---------- sound ----------
create table if not exists public.sounds (
  id uuid primary key,
  user_id uuid references auth.users on delete cascade,
  title text not null,
  artist text not null default '',
  source text not null default 'upload',
  license text not null default '',
  mood text not null default 'still',
  source_url text,
  storage_path text,
  filename text,
  mime text,
  bytes int not null default 0,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sounds_user_idx on public.sounds (user_id);
create index if not exists sounds_public_idx on public.sounds (is_public) where is_public = true;

-- ---------- row security ----------
alter table public.profiles enable row level security;
alter table public.workouts enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_prefs enable row level security;
alter table public.mornings enable row level security;
alter table public.day_plans enable row level security;
alter table public.journals enable row level security;
alter table public.notes enable row level security;
alter table public.bible_state enable row level security;
alter table public.app_state enable row level security;
alter table public.books enable row level security;
alter table public.reading_log enable row level security;
alter table public.sounds enable row level security;

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

drop policy if exists "mornings self" on public.mornings;
create policy "mornings self" on public.mornings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "plans self" on public.day_plans;
create policy "plans self" on public.day_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "journals self" on public.journals;
create policy "journals self" on public.journals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "notes self" on public.notes;
create policy "notes self" on public.notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "bible self" on public.bible_state;
create policy "bible self" on public.bible_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "app state self" on public.app_state;
create policy "app state self" on public.app_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "books self" on public.books;
create policy "books self" on public.books
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "reading log self" on public.reading_log;
create policy "reading log self" on public.reading_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "sounds read" on public.sounds;
create policy "sounds read" on public.sounds
  for select using (is_public = true or auth.uid() = user_id);

drop policy if exists "sounds write own" on public.sounds;
create policy "sounds write own" on public.sounds
  for insert with check (auth.uid() = user_id and is_public = false);

drop policy if exists "sounds update own" on public.sounds;
create policy "sounds update own" on public.sounds
  for update using (auth.uid() = user_id and is_public = false)
  with check (auth.uid() = user_id and is_public = false);

drop policy if exists "sounds delete own" on public.sounds;
create policy "sounds delete own" on public.sounds
  for delete using (auth.uid() = user_id and is_public = false);

-- ---------- new account ----------
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

-- ---------- storage ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reading', 'reading', false, 52428800, array['application/pdf'])
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sounds',
  'sounds',
  false,
  41943040,
  array['audio/mpeg','audio/mp4','audio/aac','audio/wav','audio/ogg','audio/flac','audio/webm','audio/x-m4a','audio/x-wav','application/ogg']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "reading own objects" on storage.objects;
create policy "reading own objects" on storage.objects
  for all
  using (bucket_id = 'reading' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'reading' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "sounds own objects" on storage.objects;
create policy "sounds own objects" on storage.objects
  for all
  using (bucket_id = 'sounds' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'sounds' and auth.uid()::text = (storage.foldername(name))[1]);

-- Public-domain field recordings (PDsounds via Wikimedia). Re-run is safe.
insert into public.sounds (id, user_id, title, artist, source, license, mood, source_url, is_public) values
  ('11111111-1111-4111-8111-111111111111', null, 'Birds at 5am', 'jc · PDsounds', 'wikimedia', 'Public domain', 'rise',
    'https://commons.wikimedia.org/wiki/Special:FilePath/Bird_singing.ogg', true),
  ('11111111-1111-4111-8111-111111111112', null, 'Mild morning song', 'PDsounds', 'wikimedia', 'Public domain', 'rise',
    'https://commons.wikimedia.org/wiki/Special:FilePath/Birdsong_mild_sunny_day.ogg', true),
  ('11111111-1111-4111-8111-111111111113', null, 'Garden birds', 'PDsounds', 'wikimedia', 'Public domain', 'still',
    'https://commons.wikimedia.org/wiki/Special:FilePath/Birds_singing_in_garden.ogg', true),
  ('11111111-1111-4111-8111-111111111114', null, 'Forest room', 'nille · PDsounds', 'wikimedia', 'Public domain', 'still',
    'https://commons.wikimedia.org/wiki/Special:FilePath/20090610_0_ambience.ogg', true),
  ('11111111-1111-4111-8111-111111111115', null, 'Rain on the pane', 'cori · PDsounds', 'wikimedia', 'Public domain', 'word',
    'https://commons.wikimedia.org/wiki/Special:FilePath/Rain_against_the_window.ogg', true),
  ('11111111-1111-4111-8111-111111111116', null, 'Dordogne pond', 'PDsounds', 'wikimedia', 'Public domain', 'word',
    'https://commons.wikimedia.org/wiki/Special:FilePath/Nature_sounds_ambience_in_a_Dordogne_pond.ogg', true),
  ('11111111-1111-4111-8111-111111111117', null, 'Breeze, birds, geese', 'PDsounds', 'wikimedia', 'Public domain', 'train',
    'https://commons.wikimedia.org/wiki/Special:FilePath/Breeze_birds_and_geese.ogg', true)
on conflict (id) do nothing;

-- Writes need these grants (safe to re-run).
grant usage on schema public to anon, authenticated;
grant select on table public.sounds to anon, authenticated;
grant all on table
  public.profiles,
  public.workouts,
  public.push_subscriptions,
  public.notification_prefs,
  public.mornings,
  public.day_plans,
  public.journals,
  public.notes,
  public.bible_state,
  public.app_state,
  public.books,
  public.reading_log,
  public.sounds
to authenticated;
grant all on all sequences in schema public to authenticated;

-- ALIGN timed reminders: 5 min before rise, 10 min before lights out.
-- Paste into Supabase → SQL Editor → Run. Safe to run again.
-- Rise: Sunday 4:00 (notify 3:55) · Mon–Sat 5:00 (notify 4:55)
-- Lights: Sunday midnight (notify Sat 23:50) · Mon–Sat 1:00 (notify 00:50)

alter table public.notification_prefs
  add column if not exists timezone text not null default 'Africa/Lagos';
alter table public.notification_prefs
  add column if not exists last_wake_sent date;
alter table public.notification_prefs
  add column if not exists last_lights_sent date;

create or replace function public.align_safe_local(tz text)
returns timestamp
language plpgsql
stable
as $$
begin
  return timezone(coalesce(nullif(btrim(tz), ''), 'Africa/Lagos'), now());
exception when others then
  return timezone('Africa/Lagos', now());
end;
$$;

create or replace function public.align_due_push(_secret text)
returns table (
  user_id uuid,
  endpoint text,
  p256dh text,
  auth text,
  kind text,
  morning date,
  timezone text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  expected constant text := 'align-cron-v1-sqwwjrdd';
begin
  if _secret is distinct from expected then
    raise exception 'unauthorized';
  end if;

  return query
  with loc as (
    select
      p.user_id,
      coalesce(nullif(btrim(p.timezone), ''), 'Africa/Lagos') as tz,
      p.last_wake_sent,
      p.last_lights_sent,
      public.align_safe_local(p.timezone) as local_ts
    from public.notification_prefs p
    where p.enabled is true
  ),
  stamped as (
    select
      user_id, tz, last_wake_sent, last_lights_sent,
      extract(dow from local_ts)::int as dow,
      extract(hour from local_ts)::int as hr,
      extract(minute from local_ts)::int as mn,
      (local_ts)::date as local_date,
      ((local_ts)::date + 1) as next_date
    from loc
  ),
  classified as (
    select
      s.user_id,
      s.tz,
      s.last_wake_sent,
      s.last_lights_sent,
      case
        when (s.dow = 0 and ((s.hr = 3 and s.mn >= 55) or (s.hr = 4 and s.mn < 8)))
          or (s.dow <> 0 and ((s.hr = 4 and s.mn >= 55) or (s.hr = 5 and s.mn < 8)))
          then 'wake'
        when (s.dow = 6 and s.hr = 23 and s.mn >= 50)
          or (s.dow = 0 and s.hr = 0 and s.mn < 8)
          then 'lights'
        when (s.dow <> 0 and ((s.hr = 0 and s.mn >= 50) or (s.hr = 1 and s.mn < 8)))
          then 'lights'
        else null
      end as knd,
      case
        when (s.dow = 6 and s.hr = 23 and s.mn >= 50) then s.next_date
        else s.local_date
      end as morn
    from stamped s
  ),
  due as (
    select distinct c.user_id, c.tz, c.last_wake_sent, c.last_lights_sent, c.knd, c.morn
    from classified c
    join public.push_subscriptions sub on sub.user_id = c.user_id
    where c.knd is not null
      and (
        (c.knd = 'wake' and c.last_wake_sent is distinct from c.morn)
        or (c.knd = 'lights' and c.last_lights_sent is distinct from c.morn)
      )
  ),
  marked as (
    update public.notification_prefs p
    set
      last_wake_sent = case when d.knd = 'wake' then d.morn else p.last_wake_sent end,
      last_lights_sent = case when d.knd = 'lights' then d.morn else p.last_lights_sent end,
      updated_at = now()
    from due d
    where p.user_id = d.user_id
    returning d.user_id, d.knd, d.morn, d.tz
  )
  select
    m.user_id,
    sub.endpoint,
    sub.p256dh,
    sub.auth,
    m.knd,
    m.morn,
    m.tz
  from marked m
  join public.push_subscriptions sub on sub.user_id = m.user_id;
end;
$$;

revoke all on function public.align_due_push(text) from public;
grant execute on function public.align_due_push(text) to anon, authenticated, service_role;
grant execute on function public.align_safe_local(text) to anon, authenticated, service_role;

-- Every 5 minutes: hit the Vercel sender. Enable pg_cron + pg_net
-- in Dashboard → Database → Extensions if this block notices an error.
do $cron$
declare
  j bigint;
begin
  begin
    for j in select jobid from cron.job where jobname = 'align-push' loop
      perform cron.unschedule(j);
    end loop;
  exception when undefined_table then
    raise notice 'pg_cron is not enabled. Dashboard → Database → Extensions → pg_cron.';
    return;
  when others then
    null;
  end;

  perform cron.schedule(
    'align-push',
    '*/5 * * * *',
    $job$
      select net.http_post(
        url := 'https://align-app-brown.vercel.app/api/cron-push',
        headers := '{"Content-Type":"application/json","x-cron-secret":"align-cron-v1-sqwwjrdd"}'::jsonb,
        body := '{"mode":"tick"}'::jsonb
      );
    $job$
  );
exception when others then
  raise notice 'ALIGN push cron not scheduled: % — enable pg_cron and pg_net, then re-run this file.', sqlerrm;
end
$cron$;
