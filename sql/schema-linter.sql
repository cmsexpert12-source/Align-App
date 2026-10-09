-- ALIGN linter lock. Safe to run again in Supabase → SQL Editor.
-- Fixes: mutable search_path, anon execute on definer RPCs, pg_net in public.
-- Circle RPCs stay executable for signed-in users only (that warning is expected).
-- Enable Auth → Leaked password protection in the dashboard (not SQL).

-- ---------- search_path ----------
do $p$
begin
  begin execute 'alter function public.align_safe_local(text) set search_path = public'; exception when undefined_function then null; end;
  begin execute 'alter function public.align_account_bytes(uuid) set search_path = public'; exception when undefined_function then null; end;
  begin execute 'alter function public.align_guard_quota() set search_path = public'; exception when undefined_function then null; end;
end
$p$;

create or replace function public.align_safe_local(tz text)
returns timestamp
language plpgsql
stable
set search_path = public
as $$
begin
  return timezone(coalesce(nullif(btrim(tz), ''), 'Africa/Lagos'), now());
exception when others then
  return timezone('Africa/Lagos', now());
end;
$$;

create or replace function public.align_account_bytes(uid uuid)
returns bigint
language sql
stable
set search_path = public
as $$
  select coalesce((select sum(bytes)::bigint from public.books where user_id = uid), 0)
       + coalesce((select sum(bytes)::bigint from public.sounds where user_id = uid and coalesce(is_public, false) = false), 0);
$$;

create or replace function public.align_guard_quota()
returns trigger
language plpgsql
set search_path = public
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

-- ---------- execute: nobody anonymous; triggers keep working as owner ----------
do $g$
declare
  f text;
  sigs text[] := array[
    'public.align_safe_local(text)',
    'public.align_account_bytes(uuid)',
    'public.align_guard_quota()',
    'public.align_due_push()',
    'public.align_fire_push()',
    'public.handle_new_user()',
    'public.rls_auto_enable()',
    'public.shares_circle(uuid)',
    'public.join_circle(text)',
    'public.approve_circle(uuid)',
    'public.deny_circle(uuid)',
    'public.cancel_circle_request()',
    'public.create_circle(text)',
    'public.my_circle()',
    'public.my_pending()',
    'public.list_circle_requests()',
    'public.ensure_circle_code()'
  ];
begin
  foreach f in array sigs loop
    begin
      execute 'revoke all on function ' || f || ' from public, anon, authenticated';
    exception when undefined_function then
      null;
    end;
  end loop;
end
$g$;

grant execute on function public.join_circle(text) to authenticated;
grant execute on function public.approve_circle(uuid) to authenticated;
grant execute on function public.deny_circle(uuid) to authenticated;
grant execute on function public.cancel_circle_request() to authenticated;
grant execute on function public.create_circle(text) to authenticated;
grant execute on function public.my_circle() to authenticated;
grant execute on function public.my_pending() to authenticated;
grant execute on function public.list_circle_requests() to authenticated;
grant execute on function public.ensure_circle_code() to authenticated;
grant execute on function public.shares_circle(uuid) to authenticated;

grant execute on function public.align_due_push() to service_role;

-- ---------- pg_net out of public ----------
do $e$
begin
  begin
    execute 'create schema if not exists extensions';
  exception when others then
    null;
  end;
  begin
    execute 'alter extension pg_net set schema extensions';
  exception when others then
    raise notice 'pg_net stay: %', sqlerrm;
  end;
end
$e$;
