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

revoke all on function public.align_due_push() from public, anon, authenticated;
grant execute on function public.align_due_push() to service_role;
grant execute on function public.align_safe_local(text) to anon, authenticated, service_role;

-- Every 5 minutes: hit the Vercel sender. Enable pg_cron + pg_net
-- in Dashboard → Database → Extensions if this block notices an error.
-- Cron job is scheduled in sql/schema-security.sql (no database GUC).
-- After that file, insert your Vercel CRON_SECRET into public.align_cron_secret.
