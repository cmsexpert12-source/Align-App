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
