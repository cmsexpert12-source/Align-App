-- ALIGN Circle — schedule counts + book progress. Safe to run again.
-- Friends see how many tasks are scheduled and how many are done — not the words.
-- Still not journals, notes, or affirmation.

alter table public.path_days add column if not exists sched jsonb not null default '[]'::jsonb;
alter table public.path_days add column if not exists sched_done int not null default 0;
alter table public.path_days add column if not exists sched_total int not null default 0;
alter table public.path_days add column if not exists book_title text not null default '';
alter table public.path_days add column if not exists book_page int not null default 0;
alter table public.path_days add column if not exists book_pages int not null default 0;
alter table public.path_days add column if not exists read_ms int not null default 0;

update public.path_days set sched = '[]'::jsonb
  where sched is not null and sched <> '[]'::jsonb;
