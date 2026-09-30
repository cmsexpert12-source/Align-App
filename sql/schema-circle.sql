-- ALIGN Circle — invite-only consistency. Safe to run again.
-- Friends see path done / streak. Not journals, notes, books, or affirmation.

create table if not exists public.circles (
  id uuid primary key,
  name text not null default 'ALIGN circle',
  code text not null unique,
  created_by uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.circle_members (
  circle_id uuid not null references public.circles on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);

create index if not exists circle_members_user_idx on public.circle_members (user_id);

create table if not exists public.circle_requests (
  circle_id uuid not null references public.circles on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);
create unique index if not exists circle_requests_user_idx on public.circle_requests (user_id);

create table if not exists public.path_days (
  user_id uuid not null references auth.users on delete cascade,
  date date not null,
  done int not null default 0,
  total int not null default 12,
  go boolean not null default false,
  path_done boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create index if not exists path_days_date_idx on public.path_days (date desc);

alter table public.circles enable row level security;
alter table public.circle_members enable row level security;
alter table public.circle_requests enable row level security;
alter table public.path_days enable row level security;

create or replace function public.shares_circle(other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.circle_members a
    join public.circle_members b on a.circle_id = b.circle_id
    where a.user_id = auth.uid() and b.user_id = other
  );
$$;

revoke all on function public.shares_circle(uuid) from public;
grant execute on function public.shares_circle(uuid) to authenticated;

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

drop policy if exists "circles owner write" on public.circles;
create policy "circles owner write" on public.circles
  for insert with check (created_by = auth.uid());

drop policy if exists "circles owner update" on public.circles;
create policy "circles owner update" on public.circles
  for update using (created_by = auth.uid()) with check (created_by = auth.uid());

drop policy if exists "members self read" on public.circle_members;
create policy "members self read" on public.circle_members
  for select using (user_id = auth.uid() or public.shares_circle(user_id));

drop policy if exists "members self join" on public.circle_members;

drop policy if exists "members founder insert" on public.circle_members;
create policy "members founder insert" on public.circle_members
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.circles c
      where c.id = circle_id and c.created_by = auth.uid()
    )
  );

drop policy if exists "members self leave" on public.circle_members;
create policy "members self leave" on public.circle_members
  for delete using (user_id = auth.uid());

drop policy if exists "requests self or founder" on public.circle_requests;
create policy "requests self or founder" on public.circle_requests
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.circles c
      where c.id = circle_id and c.created_by = auth.uid()
    )
  );

drop policy if exists "path_days self" on public.path_days;
create policy "path_days self" on public.path_days
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "path_days circle read" on public.path_days;
create policy "path_days circle read" on public.path_days
  for select using (public.shares_circle(user_id));

drop policy if exists "profiles circle read" on public.profiles;
create policy "profiles circle read" on public.profiles
  for select using (public.shares_circle(id));

grant all on table public.circles, public.circle_members, public.path_days to authenticated;
grant select on table public.circle_requests to authenticated;

-- Join by code asks the founder. They are not a member until approve_circle.
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
  nm text;
begin
  if auth.uid() is null then
    raise exception 'Sign in to join a circle';
  end if;
  raw := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if length(raw) < 6 or length(raw) > 8 then
    raise exception 'Enter the circle code';
  end if;
  select id into cid from public.circles where code = raw;
  if cid is null then
    raise exception 'No circle with that code';
  end if;
  if exists (select 1 from public.circle_members where circle_id = cid and user_id = auth.uid()) then
    return cid;
  end if;
  if exists (select 1 from public.circle_members where user_id = auth.uid()) then
    raise exception 'Leave your circle first';
  end if;
  if exists (select 1 from public.circle_requests where circle_id = cid and user_id = auth.uid()) then
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

-- Invite code read/fill (also in schema-circle-code.sql)
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
