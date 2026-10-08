-- ALIGN timed reminders, four a day in YOUR timezone:
--   wake  — 5 min before rise
--   plan  — 14:00  today's three / schedule
--   read  — 19:00  evening book
--   lights — 10 min before lights (night devotion)
-- Paste into Supabase → SQL Editor → Run. Safe to run again.
-- Restores personal-hour align_due_push(). Do not keep an old copy that takes a secret argument.
-- Cron job itself lives in sql/schema-security.sql (align_fire_push + pg_cron).
-- After that, insert your Vercel CRON_SECRET into public.align_cron_secret.

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

alter table public.notification_prefs add column if not exists sun_wake_h int not null default 4;
alter table public.notification_prefs add column if not exists sun_wake_m int not null default 0;
alter table public.notification_prefs add column if not exists wk_wake_h int not null default 5;
alter table public.notification_prefs add column if not exists wk_wake_m int not null default 0;
alter table public.notification_prefs add column if not exists sun_lights_h int not null default 0;
alter table public.notification_prefs add column if not exists sun_lights_m int not null default 0;
alter table public.notification_prefs add column if not exists wk_lights_h int not null default 1;
alter table public.notification_prefs add column if not exists wk_lights_m int not null default 0;
alter table public.notification_prefs add column if not exists last_plan_sent date;
alter table public.notification_prefs add column if not exists last_read_sent date;
alter table public.notification_prefs add column if not exists plan_h int not null default 14;
alter table public.notification_prefs add column if not exists plan_m int not null default 0;
alter table public.notification_prefs add column if not exists read_h int not null default 19;
alter table public.notification_prefs add column if not exists read_m int not null default 0;

drop function if exists public.align_due_push(text);
drop function if exists public.align_due_push();

create or replace function public.align_due_push()
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
#variable_conflict use_column
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'unauthorized';
  end if;

  return query
  with loc as (
    select
      p.user_id as uid,
      coalesce(nullif(btrim(p.timezone), ''), 'Africa/Lagos') as tz,
      p.last_wake_sent,
      p.last_lights_sent,
      p.last_plan_sent,
      p.last_read_sent,
      public.align_safe_local(p.timezone) as local_ts,
      coalesce(p.sun_wake_h, 4) as sun_wake_h,
      coalesce(p.sun_wake_m, 0) as sun_wake_m,
      coalesce(p.wk_wake_h, 5) as wk_wake_h,
      coalesce(p.wk_wake_m, 0) as wk_wake_m,
      coalesce(p.sun_lights_h, 0) as sun_lights_h,
      coalesce(p.sun_lights_m, 0) as sun_lights_m,
      coalesce(p.wk_lights_h, 1) as wk_lights_h,
      coalesce(p.wk_lights_m, 0) as wk_lights_m,
      coalesce(p.plan_h, 14) as plan_h,
      coalesce(p.plan_m, 0) as plan_m,
      coalesce(p.read_h, 19) as read_h,
      coalesce(p.read_m, 0) as read_m
    from public.notification_prefs p
    where p.enabled is true
  ),
  stamped as (
    select
      loc.uid,
      loc.tz,
      loc.last_wake_sent,
      loc.last_lights_sent,
      loc.last_plan_sent,
      loc.last_read_sent,
      extract(dow from loc.local_ts)::int as dow,
      extract(hour from loc.local_ts)::int as hr,
      extract(minute from loc.local_ts)::int as mn,
      (loc.local_ts)::date as local_date,
      ((loc.local_ts)::date + 1) as next_date,
      loc.sun_wake_h, loc.sun_wake_m, loc.wk_wake_h, loc.wk_wake_m,
      loc.sun_lights_h, loc.sun_lights_m, loc.wk_lights_h, loc.wk_lights_m,
      loc.plan_h, loc.plan_m, loc.read_h, loc.read_m
    from loc
  ),
  classified as (
    select
      s.uid,
      s.tz,
      s.last_wake_sent,
      s.last_lights_sent,
      s.last_plan_sent,
      s.last_read_sent,
      case
        when s.local_mins >= s.pre_wake and s.local_mins < s.pre_wake + 20
          then 'wake'
        when s.pre_wake_tom < 0
          and s.local_mins >= (1440 + s.pre_wake_tom)
          and s.local_mins < (1440 + s.pre_wake_tom + 20)
          then 'wake'
        when s.pre_lights >= 0
          and s.local_mins >= s.pre_lights and s.local_mins < s.pre_lights + 20
          then 'lights'
        when s.pre_lights_tom < 0
          and s.local_mins >= (1440 + s.pre_lights_tom)
          and s.local_mins < (1440 + s.pre_lights_tom + 20)
          then 'lights'
        when s.local_mins >= s.plan_mins and s.local_mins < s.plan_mins + 20
          then 'plan'
        when s.local_mins >= s.read_mins and s.local_mins < s.read_mins + 20
          then 'read'
        else null
      end as knd,
      case
        when s.local_mins >= s.pre_wake and s.local_mins < s.pre_wake + 20
          then s.local_date
        when s.pre_wake_tom < 0
          and s.local_mins >= (1440 + s.pre_wake_tom)
          and s.local_mins < (1440 + s.pre_wake_tom + 20)
          then s.next_date
        when s.pre_lights >= 0
          and s.local_mins >= s.pre_lights and s.local_mins < s.pre_lights + 20
          then s.local_date
        when s.pre_lights_tom < 0
          and s.local_mins >= (1440 + s.pre_lights_tom)
          and s.local_mins < (1440 + s.pre_lights_tom + 20)
          then s.next_date
        else s.local_date
      end as morn
    from (
      select
        stamped.*,
        (stamped.hr * 60 + stamped.mn) as local_mins,
        ((case when stamped.dow = 0 then stamped.sun_wake_h else stamped.wk_wake_h end) * 60
          + (case when stamped.dow = 0 then stamped.sun_wake_m else stamped.wk_wake_m end) - 5) as pre_wake,
        ((case when ((stamped.dow + 1) % 7) = 0 then stamped.sun_wake_h else stamped.wk_wake_h end) * 60
          + (case when ((stamped.dow + 1) % 7) = 0 then stamped.sun_wake_m else stamped.wk_wake_m end) - 5) as pre_wake_tom,
        ((case when stamped.dow = 0 then stamped.sun_lights_h else stamped.wk_lights_h end) * 60
          + (case when stamped.dow = 0 then stamped.sun_lights_m else stamped.wk_lights_m end) - 10) as pre_lights,
        ((case when ((stamped.dow + 1) % 7) = 0 then stamped.sun_lights_h else stamped.wk_lights_h end) * 60
          + (case when ((stamped.dow + 1) % 7) = 0 then stamped.sun_lights_m else stamped.wk_lights_m end) - 10) as pre_lights_tom,
        (stamped.plan_h * 60 + stamped.plan_m) as plan_mins,
        (stamped.read_h * 60 + stamped.read_m) as read_mins
      from stamped
    ) s
  ),
  due as (
    select distinct c.uid as user_id, c.tz, c.last_wake_sent, c.last_lights_sent, c.last_plan_sent, c.last_read_sent, c.knd, c.morn
    from classified c
    join public.push_subscriptions sub on sub.user_id = c.uid
    where c.knd is not null
      and (
        (c.knd = 'wake' and c.last_wake_sent is distinct from c.morn)
        or (c.knd = 'lights' and c.last_lights_sent is distinct from c.morn)
        or (c.knd = 'plan' and c.last_plan_sent is distinct from c.morn)
        or (c.knd = 'read' and c.last_read_sent is distinct from c.morn)
      )
  ),
  marked as (
    update public.notification_prefs p
    set
      last_wake_sent = case when d.knd = 'wake' then d.morn else p.last_wake_sent end,
      last_lights_sent = case when d.knd = 'lights' then d.morn else p.last_lights_sent end,
      last_plan_sent = case when d.knd = 'plan' then d.morn else p.last_plan_sent end,
      last_read_sent = case when d.knd = 'read' then d.morn else p.last_read_sent end,
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

revoke all on function public.align_due_push() from public, anon, authenticated;
grant execute on function public.align_due_push() to service_role;

grant execute on function public.align_safe_local(text) to anon, authenticated, service_role;

-- Postgres must ping Vercel every 5 minutes. Enable pg_cron + pg_net in
-- Dashboard → Database → Extensions if the notices below say they are missing.
-- Then insert the same CRON_SECRET as Vercel (do not commit it):
--   insert into public.align_cron_secret (id, secret)
--   values (1, 'paste-vercel-CRON_SECRET')
--   on conflict (id) do update set secret = excluded.secret, updated_at = now();

do $ext$
begin
  begin
    execute 'create extension if not exists pg_cron';
  exception when others then
    raise notice 'pg_cron: %', sqlerrm;
  end;
  begin
    execute 'create extension if not exists pg_net';
  exception when others then
    raise notice 'pg_net: %', sqlerrm;
  end;
end
$ext$;

create table if not exists public.align_cron_secret (
  id int primary key default 1 check (id = 1),
  secret text not null,
  updated_at timestamptz not null default now()
);
alter table public.align_cron_secret enable row level security;
revoke all on table public.align_cron_secret from public, anon, authenticated;

create or replace function public.align_fire_push()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s text;
begin
  select btrim(secret) into s from public.align_cron_secret where id = 1;
  if s is null or s = '' or s = 'align-cron-v1-sqwwjrdd' then
    return;
  end if;
  perform net.http_post(
    url := 'https://align-app-brown.vercel.app/api/cron-push',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', s),
    body := '{"mode":"tick"}'::jsonb
  );
end;
$$;

revoke all on function public.align_fire_push() from public, anon, authenticated;

do $cron$
declare
  j bigint;
begin
  begin
    for j in select jobid from cron.job where jobname = 'align-push' loop
      perform cron.unschedule(j);
    end loop;
  exception when undefined_table then
    raise notice 'pg_cron is not enabled.';
    return;
  when others then
    null;
  end;

  perform cron.schedule(
    'align-push',
    '*/5 * * * *',
    $job$select public.align_fire_push();$job$
  );
exception when others then
  raise notice 'ALIGN push cron not scheduled: %', sqlerrm;
end
$cron$;
