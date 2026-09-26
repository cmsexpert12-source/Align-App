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

drop policy if exists "members self leave" on public.circle_members;
create policy "members self leave" on public.circle_members
  for delete using (user_id = auth.uid());

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

-- Join by code without listing every circle.
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
  select count(*) into n from public.circle_members where circle_id = cid;
  if n >= 8 then
    raise exception 'This circle is full (8 people)';
  end if;
  insert into public.circle_members (circle_id, user_id)
  values (cid, auth.uid())
  on conflict do nothing;
  return cid;
end;
$$;

revoke all on function public.join_circle(text) from public;
grant execute on function public.join_circle(text) to authenticated;
