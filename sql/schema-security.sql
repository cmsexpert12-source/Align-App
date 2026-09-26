-- ALIGN security lock. Safe to run again.
-- 1. Push RPC is service_role only (old cron secret is burned).
-- 2. Circle join is code-only; 8 tries / 15 min.
-- 3. Unschedules the cron job that had the leaked secret.
--
-- After this file, in SQL Editor (same CRON_SECRET as Vercel, do not commit it):
--   insert into public.align_cron_secret (id, secret)
--   values (1, 'paste-vercel-CRON_SECRET')
--   on conflict (id) do update set secret = excluded.secret, updated_at = now();

-- ---------- push: no public secret ----------
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
      public.align_safe_local(p.timezone) as local_ts
    from public.notification_prefs p
    where p.enabled is true
  ),
  stamped as (
    select
      loc.uid,
      loc.tz,
      loc.last_wake_sent,
      loc.last_lights_sent,
      extract(dow from loc.local_ts)::int as dow,
      extract(hour from loc.local_ts)::int as hr,
      extract(minute from loc.local_ts)::int as mn,
      (loc.local_ts)::date as local_date,
      ((loc.local_ts)::date + 1) as next_date
    from loc
  ),
  classified as (
    select
      s.uid,
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
    select distinct c.uid as user_id, c.tz, c.last_wake_sent, c.last_lights_sent, c.knd, c.morn
    from classified c
    join public.push_subscriptions sub on sub.user_id = c.uid
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

revoke all on function public.align_due_push() from public, anon, authenticated;
grant execute on function public.align_due_push() to service_role;

-- ---------- circle: code only + slow brute force ----------
drop policy if exists "members self join" on public.circle_members;

create table if not exists public.circle_join_guard (
  user_id uuid primary key references auth.users on delete cascade,
  fails int not null default 0,
  window_start timestamptz not null default now()
);
alter table public.circle_join_guard enable row level security;
revoke all on table public.circle_join_guard from public, anon, authenticated;

create or replace function public.join_circle(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid;
  n int;
  raw text;
  g public.circle_join_guard%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Sign in to join a circle';
  end if;

  insert into public.circle_join_guard (user_id, fails, window_start)
  values (auth.uid(), 0, now())
  on conflict (user_id) do nothing;

  select * into g from public.circle_join_guard where user_id = auth.uid();
  if g.window_start < now() - interval '15 minutes' then
    update public.circle_join_guard
      set fails = 0, window_start = now()
      where user_id = auth.uid();
    g.fails := 0;
  end if;
  if g.fails >= 8 then
    raise exception 'Too many tries. Wait a few minutes.';
  end if;

  raw := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if length(raw) < 6 or length(raw) > 8 then
    update public.circle_join_guard set fails = fails + 1 where user_id = auth.uid();
    raise exception 'Enter the circle code';
  end if;
  select id into cid from public.circles where code = raw;
  if cid is null then
    update public.circle_join_guard set fails = fails + 1 where user_id = auth.uid();
    raise exception 'No circle with that code';
  end if;
  select count(*) into n from public.circle_members where circle_id = cid;
  if n >= 8 then
    raise exception 'This circle is full (8 people)';
  end if;
  insert into public.circle_members (circle_id, user_id)
  values (cid, auth.uid())
  on conflict do nothing;
  update public.circle_join_guard set fails = 0, window_start = now() where user_id = auth.uid();
  return cid;
end;
$$;

revoke all on function public.join_circle(text) from public;
grant execute on function public.join_circle(text) to authenticated;

-- ---------- cron secret: a private row, not ALTER DATABASE ----------
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

-- ---------- kill leaked cron job; schedule a job with no secret in the command ----------
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
