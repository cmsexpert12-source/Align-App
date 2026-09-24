-- ALIGN books — PDF library, reading schedule, log.
-- Run once in SQL Editor after schema.sql (and schema-life.sql if you use the morning tables).

create table if not exists public.books (
  id uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  author text not null default '',
  filename text,
  storage_path text,
  bytes int not null default 0,
  pages int not null default 0,
  current_page int not null default 1,
  slot text not null default 'evening',
  days int[] not null default '{1,2,3,4,5,6}',
  pages_per_day int not null default 8,
  enabled boolean not null default true,
  category text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.books add column if not exists category text not null default '';

create index if not exists books_user_idx on public.books (user_id);

create table if not exists public.reading_log (
  user_id uuid not null references auth.users on delete cascade,
  book_id uuid not null references public.books on delete cascade,
  date date not null,
  from_page int,
  to_page int,
  updated_at timestamptz not null default now(),
  primary key (user_id, book_id, date)
);

alter table public.books enable row level security;
alter table public.reading_log enable row level security;

drop policy if exists "books self" on public.books;
create policy "books self" on public.books
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "reading log self" on public.reading_log;
create policy "reading log self" on public.reading_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reading', 'reading', false, 52428800, array['application/pdf'])
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "reading own objects" on storage.objects;
create policy "reading own objects" on storage.objects
  for all
  using (bucket_id = 'reading' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'reading' and auth.uid()::text = (storage.foldername(name))[1]);
