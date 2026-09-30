-- ALIGN Circle — founder sees who asked. Safe to run again.
-- Run this once in Supabase SQL Editor (paste all, then Run). Then force-close ALIGN.

create table if not exists public.circle_requests (
  circle_id uuid not null references public.circles on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);
create unique index if not exists circle_requests_user_idx on public.circle_requests (user_id);
alter table public.circle_requests enable row level security;
revoke all on table public.circle_requests from public, anon;
grant select on table public.circle_requests to authenticated;
drop policy if exists "requests self or founder" on public.circle_requests;
create policy "requests self or founder" on public.circle_requests
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.circles c
      where c.id = circle_id and c.created_by = auth.uid()
    )
  );

create or replace function public.my_circle()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  rec jsonb;
begin
  if auth.uid() is null then
    return null;
  end if;
  select jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'code', c.code,
    'created_by', c.created_by,
    'founder', (c.created_by = auth.uid()),
    'requests', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', r.user_id,
          'name', coalesce(nullif(btrim(r.display_name), ''), 'ALIGN'),
          'at', r.created_at
        )
        order by r.created_at
      )
      from public.circle_requests r
      join public.circles oc on oc.id = r.circle_id
      where oc.created_by = auth.uid()
    ), '[]'::jsonb)
  )
  into rec
  from public.circles c
  join public.circle_members m on m.circle_id = c.id
  where m.user_id = auth.uid()
  limit 1;
  return rec;
end;
$$;

revoke all on function public.my_circle() from public;
grant execute on function public.my_circle() to authenticated;

create or replace function public.my_pending()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  rec jsonb;
begin
  if auth.uid() is null then
    return null;
  end if;
  select jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'created_by', c.created_by,
    'pending', true
  )
  into rec
  from public.circle_requests r
  join public.circles c on c.id = r.circle_id
  where r.user_id = auth.uid()
  limit 1;
  return rec;
end;
$$;

revoke all on function public.my_pending() from public;
grant execute on function public.my_pending() to authenticated;

create or replace function public.list_circle_requests()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  rec jsonb;
begin
  if auth.uid() is null then
    return '[]'::jsonb;
  end if;
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', r.user_id,
        'name', coalesce(nullif(btrim(r.display_name), ''), 'ALIGN'),
        'at', r.created_at
      )
      order by r.created_at
    ),
    '[]'::jsonb
  )
  into rec
  from public.circle_requests r
  join public.circles c on c.id = r.circle_id
  where c.created_by = auth.uid();
  return rec;
end;
$$;

revoke all on function public.list_circle_requests() from public;
grant execute on function public.list_circle_requests() to authenticated;

create or replace function public.approve_circle(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid;
  n int;
begin
  if auth.uid() is null then
    raise exception 'Sign in to let someone in';
  end if;
  if p_user_id is null or p_user_id = auth.uid() then
    raise exception 'Pick someone waiting';
  end if;
  select r.circle_id into cid
  from public.circle_requests r
  join public.circles c on c.id = r.circle_id
  where r.user_id = p_user_id
    and c.created_by = auth.uid()
  limit 1;
  if cid is null then
    raise exception 'No one waiting with that account';
  end if;
  if exists (select 1 from public.circle_members where user_id = p_user_id) then
    delete from public.circle_requests r
    using public.circles c
    where r.circle_id = c.id and c.created_by = auth.uid() and r.user_id = p_user_id;
    raise exception 'They already walk in a circle';
  end if;
  select count(*) into n from public.circle_members where circle_id = cid;
  if n >= 8 then
    raise exception 'This circle is full (8 people)';
  end if;
  insert into public.circle_members (circle_id, user_id)
  values (cid, p_user_id)
  on conflict do nothing;
  delete from public.circle_requests where circle_id = cid and user_id = p_user_id;
  return cid;
end;
$$;

revoke all on function public.approve_circle(uuid) from public;
grant execute on function public.approve_circle(uuid) to authenticated;

create or replace function public.deny_circle(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in to decide';
  end if;
  select r.circle_id into cid
  from public.circle_requests r
  join public.circles c on c.id = r.circle_id
  where r.user_id = p_user_id
    and c.created_by = auth.uid()
  limit 1;
  if cid is null then
    raise exception 'Only the founder can decide';
  end if;
  delete from public.circle_requests
  where circle_id = cid and user_id = p_user_id;
  return cid;
end;
$$;

revoke all on function public.deny_circle(uuid) from public;
grant execute on function public.deny_circle(uuid) to authenticated;
