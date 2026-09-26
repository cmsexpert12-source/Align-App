-- ALIGN — 50 MB upload cap per account (books + your audio, not the public sound library).
-- Paste into Supabase → SQL Editor → Run. Safe to run again.

create or replace function public.align_account_bytes(uid uuid)
returns bigint
language sql
stable
as $$
  select coalesce((select sum(bytes)::bigint from public.books where user_id = uid), 0)
       + coalesce((select sum(bytes)::bigint from public.sounds where user_id = uid and coalesce(is_public, false) = false), 0);
$$;

create or replace function public.align_guard_quota()
returns trigger
language plpgsql
as $$
declare
  used bigint;
  uid uuid;
  incoming int;
begin
  uid := new.user_id;
  if uid is null then
    return new;
  end if;
  incoming := coalesce(new.bytes, 0);
  used := public.align_account_bytes(uid);
  if tg_op = 'UPDATE' then
    used := used - coalesce(old.bytes, 0);
  end if;
  if used + incoming > 52428800 then
    raise exception 'ALIGN account storage is 50 MB';
  end if;
  return new;
end;
$$;

drop trigger if exists books_quota on public.books;
create trigger books_quota
  before insert or update of bytes on public.books
  for each row execute function public.align_guard_quota();

drop trigger if exists sounds_quota on public.sounds;
create trigger sounds_quota
  before insert or update of bytes on public.sounds
  for each row execute function public.align_guard_quota();
