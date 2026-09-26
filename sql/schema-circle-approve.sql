-- ALIGN Circle — founder must approve a join. Safe to run again.
-- After this, a code asks to join. The founder lets them in.
-- Pending people do not see path, schedule, book, or clocks.

create table if not exists public.circle_join_guard (
  user_id uuid primary key references auth.users on delete cascade,
  fails int not null default 0,
  window_start timestamptz not null default now()
);
alter table public.circle_join_guard enable row level security;
revoke all on table public.circle_join_guard from public, anon, authenticated;

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

drop policy if exists "circles member read" on public.circles;
create policy "circles member read" on public.circles
  for select using (
    created_by = auth.uid()
    or exists (
      select 1 from public.circle_members m
      where m.circle_id = circles.id and m.user_id = auth.uid()
    )
    or exists (
      select 1 from public.circle_requests r
      where r.circle_id = circles.id and r.user_id = auth.uid()
    )
  );

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
  nm text;
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

  if exists (select 1 from public.circle_members where circle_id = cid and user_id = auth.uid()) then
    update public.circle_join_guard set fails = 0, window_start = now() where user_id = auth.uid();
    return cid;
  end if;
  if exists (select 1 from public.circle_members where user_id = auth.uid()) then
    raise exception 'Leave your circle first';
  end if;
  if exists (select 1 from public.circle_requests where circle_id = cid and user_id = auth.uid()) then
    update public.circle_join_guard set fails = 0, window_start = now() where user_id = auth.uid();
    return cid;
  end if;
  if exists (select 1 from public.circle_requests where user_id = auth.uid()) then
    raise exception 'Cancel your request first';
  end if;

  select count(*) into n from public.circle_members where circle_id = cid;
  if n >= 8 then
    raise exception 'This circle is full (8 people)';
  end if;

  select display_name into nm from public.profiles where id = auth.uid();
  nm := left(coalesce(nullif(btrim(nm), ''), 'ALIGN'), 40);

  insert into public.circle_requests (circle_id, user_id, display_name)
  values (cid, auth.uid(), nm)
  on conflict do nothing;

  update public.circle_join_guard set fails = 0, window_start = now() where user_id = auth.uid();
  return cid;
end;
$$;

revoke all on function public.join_circle(text) from public;
grant execute on function public.join_circle(text) to authenticated;

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
  select id into cid from public.circles where created_by = auth.uid();
  if cid is null then
    raise exception 'Only the founder can let someone in';
  end if;
  if not exists (
    select 1 from public.circle_requests
    where circle_id = cid and user_id = p_user_id
  ) then
    raise exception 'No one waiting with that account';
  end if;
  if exists (select 1 from public.circle_members where user_id = p_user_id) then
    delete from public.circle_requests where circle_id = cid and user_id = p_user_id;
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
  select id into cid from public.circles where created_by = auth.uid();
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

create or replace function public.cancel_circle_request()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in to cancel';
  end if;
  delete from public.circle_requests where user_id = auth.uid();
  return true;
end;
$$;

revoke all on function public.cancel_circle_request() from public;
grant execute on function public.cancel_circle_request() to authenticated;

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
  select count(*) into n from public.circle_requests where user_id = auth.uid();
  if n > 0 then
    raise exception 'Cancel your request first';
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
