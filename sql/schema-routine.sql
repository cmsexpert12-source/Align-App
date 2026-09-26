-- ALIGN personal hours. Safe to run again.
-- Each account keeps its own rise / lights. Founder defaults stay 4:00 / 5:00 until they edit.

alter table public.app_state
  add column if not exists routine jsonb not null default '{}'::jsonb;

alter table public.notification_prefs
  add column if not exists sun_wake_h int not null default 4;
alter table public.notification_prefs
  add column if not exists sun_wake_m int not null default 0;
alter table public.notification_prefs
  add column if not exists wk_wake_h int not null default 5;
alter table public.notification_prefs
  add column if not exists wk_wake_m int not null default 0;
alter table public.notification_prefs
  add column if not exists sun_lights_h int not null default 0;
alter table public.notification_prefs
  add column if not exists sun_lights_m int not null default 0;
alter table public.notification_prefs
  add column if not exists wk_lights_h int not null default 1;
alter table public.notification_prefs
  add column if not exists wk_lights_m int not null default 0;

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
declare
  expected constant text := 'align-cron-v1-sqwwjrdd';
begin
  if _secret is distinct from expected then
    raise exception 'unauthorized';
  end if;

  return query
  with loc as (
    select
      p.user_id as uid,
      coalesce(nullif(btrim(p.timezone), ''), 'Africa/Lagos') as tz,
      p.last_wake_sent,
      p.last_lights_sent,
      public.align_safe_local(p.timezone) as local_ts,
      coalesce(p.sun_wake_h, 4) as sun_wake_h,
      coalesce(p.sun_wake_m, 0) as sun_wake_m,
      coalesce(p.wk_wake_h, 5) as wk_wake_h,
      coalesce(p.wk_wake_m, 0) as wk_wake_m,
      coalesce(p.sun_lights_h, 0) as sun_lights_h,
      coalesce(p.sun_lights_m, 0) as sun_lights_m,
      coalesce(p.wk_lights_h, 1) as wk_lights_h,
      coalesce(p.wk_lights_m, 0) as wk_lights_m
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
      ((loc.local_ts)::date + 1) as next_date,
      loc.sun_wake_h, loc.sun_wake_m, loc.wk_wake_h, loc.wk_wake_m,
      loc.sun_lights_h, loc.sun_lights_m, loc.wk_lights_h, loc.wk_lights_m
    from loc
  ),
  classified as (
    select
      s.uid,
      s.tz,
      s.last_wake_sent,
      s.last_lights_sent,
      case
        when s.local_mins >= s.pre_wake and s.local_mins < s.pre_wake + 8
          then 'wake'
        when s.pre_wake_tom < 0
          and s.local_mins >= (1440 + s.pre_wake_tom)
          and s.local_mins < (1440 + s.pre_wake_tom + 8)
          then 'wake'
        when s.pre_lights >= 0
          and s.local_mins >= s.pre_lights and s.local_mins < s.pre_lights + 8
          then 'lights'
        when s.pre_lights_tom < 0
          and s.local_mins >= (1440 + s.pre_lights_tom)
          and s.local_mins < (1440 + s.pre_lights_tom + 8)
          then 'lights'
        else null
      end as knd,
      case
        when s.local_mins >= s.pre_wake and s.local_mins < s.pre_wake + 8
          then s.local_date
        when s.pre_wake_tom < 0
          and s.local_mins >= (1440 + s.pre_wake_tom)
          and s.local_mins < (1440 + s.pre_wake_tom + 8)
          then s.next_date
        when s.pre_lights >= 0
          and s.local_mins >= s.pre_lights and s.local_mins < s.pre_lights + 8
          then s.local_date
        when s.pre_lights_tom < 0
          and s.local_mins >= (1440 + s.pre_lights_tom)
          and s.local_mins < (1440 + s.pre_lights_tom + 8)
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
          + (case when ((stamped.dow + 1) % 7) = 0 then stamped.sun_lights_m else stamped.wk_lights_m end) - 10) as pre_lights_tom
      from stamped
    ) s
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

revoke all on function public.align_due_push(text) from public;
grant execute on function public.align_due_push(text) to anon, authenticated, service_role;
