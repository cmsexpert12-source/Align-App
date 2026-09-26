-- ALIGN Circle — start a circle. Safe to run again.
-- The founder must be added as a member without a public insert-all policy.
-- Join stays code-only via join_circle.

drop policy if exists "members founder insert" on public.circle_members;
create policy "members founder insert" on public.circle_members
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.circles c
      where c.id = circle_id and c.created_by = auth.uid()
    )
  );

create or replace function public.create_circle(p_name text default 'ALIGN circle')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid;
  raw text;
  n int;
  i int;
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if auth.uid() is null then
    raise exception 'Sign in to start a circle';
  end if;
  select count(*) into n from public.circle_members where user_id = auth.uid();
  if n > 0 then
    raise exception 'Leave your circle first';
  end if;
  cid := gen_random_uuid();
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
  insert into public.circles (id, name, code, created_by)
  values (
    cid,
    left(coalesce(nullif(btrim(p_name), ''), 'ALIGN circle'), 40),
    raw,
    auth.uid()
  );
  insert into public.circle_members (circle_id, user_id)
  values (cid, auth.uid());
  return cid;
end;
$$;

revoke all on function public.create_circle(text) from public;
grant execute on function public.create_circle(text) to authenticated;
