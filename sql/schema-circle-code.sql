-- ALIGN Circle — founder always gets the invite code. Safe to run again.
-- create_circle already stores a code; this lets the app read it even when
-- table RLS hides the circles row, and fills a code if one is missing.

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
    'created_by', c.created_by
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

create or replace function public.list_circle_requests()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  cid uuid;
  rec jsonb;
begin
  if auth.uid() is null then
    return '[]'::jsonb;
  end if;
  select id into cid from public.circles where created_by = auth.uid() limit 1;
  if cid is null then
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
  where r.circle_id = cid;
  return rec;
end;
$$;

revoke all on function public.list_circle_requests() from public;
grant execute on function public.list_circle_requests() to authenticated;

create or replace function public.ensure_circle_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid;
  raw text;
  cur text;
  i int;
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if auth.uid() is null then
    raise exception 'Sign in to start a circle';
  end if;

  select c.id, c.code into cid, cur
  from public.circles c
  where c.created_by = auth.uid()
  limit 1;

  if cid is null then
    select m.circle_id into cid
    from public.circle_members m
    where m.user_id = auth.uid()
    limit 1;
  end if;
  if cid is null then
    raise exception 'Start a circle first';
  end if;

  select code into cur from public.circles where id = cid;
  if length(coalesce(cur, '')) >= 6 then
    return cur;
  end if;

  if not exists (select 1 from public.circles c where c.id = cid and c.created_by = auth.uid()) then
    raise exception 'Only the founder can make a code';
  end if;

  raw := '';
  for i in 1..8 loop
    raw := raw || substr(alphabet, 1 + floor(random() * 32)::int, 1);
  end loop;
  while exists (select 1 from public.circles where code = raw) loop
    raw := '';
    for i in 1..8 loop
      raw := raw || substr(alphabet, 1 + floor(random() * 32)::int, 1);
    end loop;
  end loop;

  update public.circles set code = raw where id = cid;
  return raw;
end;
$$;

revoke all on function public.ensure_circle_code() from public;
grant execute on function public.ensure_circle_code() to authenticated;
