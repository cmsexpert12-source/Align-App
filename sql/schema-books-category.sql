-- ALIGN book shelves. Safe to run again.
alter table public.books add column if not exists category text not null default '';
