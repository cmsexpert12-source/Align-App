-- ALIGN sound library — public open-source catalog + your uploads.
-- Run once in SQL Editor after schema-books.sql.

create table if not exists public.sounds (
  id uuid primary key,
  user_id uuid references auth.users on delete cascade,
  title text not null,
  artist text not null default '',
  source text not null default 'upload',
  license text not null default '',
  mood text not null default 'still',
  source_url text,
  storage_path text,
  filename text,
  mime text,
  bytes int not null default 0,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sounds_user_idx on public.sounds (user_id);
create index if not exists sounds_public_idx on public.sounds (is_public) where is_public = true;

alter table public.sounds enable row level security;

drop policy if exists "sounds read" on public.sounds;
create policy "sounds read" on public.sounds
  for select using (is_public = true or auth.uid() = user_id);

drop policy if exists "sounds write own" on public.sounds;
create policy "sounds write own" on public.sounds
  for insert with check (auth.uid() = user_id and is_public = false);

drop policy if exists "sounds update own" on public.sounds;
create policy "sounds update own" on public.sounds
  for update using (auth.uid() = user_id and is_public = false)
  with check (auth.uid() = user_id and is_public = false);

drop policy if exists "sounds delete own" on public.sounds;
create policy "sounds delete own" on public.sounds
  for delete using (auth.uid() = user_id and is_public = false);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sounds',
  'sounds',
  false,
  52428800,
  array['audio/mpeg','audio/mp4','audio/aac','audio/wav','audio/ogg','audio/flac','audio/webm','audio/x-m4a','audio/x-wav','application/ogg']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "sounds own objects" on storage.objects;
create policy "sounds own objects" on storage.objects
  for all
  using (bucket_id = 'sounds' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'sounds' and auth.uid()::text = (storage.foldername(name))[1]);

-- Public domain field recordings (PDsounds.org via Wikimedia Commons). Re-run is safe.
insert into public.sounds (id, user_id, title, artist, source, license, mood, source_url, is_public) values
  ('11111111-1111-4111-8111-111111111111', null, 'Birds at 5am', 'jc · PDsounds', 'wikimedia', 'Public domain', 'rise',
    'https://commons.wikimedia.org/wiki/Special:FilePath/Bird_singing.ogg', true),
  ('11111111-1111-4111-8111-111111111112', null, 'Mild morning song', 'PDsounds', 'wikimedia', 'Public domain', 'rise',
    'https://commons.wikimedia.org/wiki/Special:FilePath/Birdsong_mild_sunny_day.ogg', true),
  ('11111111-1111-4111-8111-111111111113', null, 'Garden birds', 'PDsounds', 'wikimedia', 'Public domain', 'still',
    'https://commons.wikimedia.org/wiki/Special:FilePath/Birds_singing_in_garden.ogg', true),
  ('11111111-1111-4111-8111-111111111114', null, 'Forest room', 'nille · PDsounds', 'wikimedia', 'Public domain', 'still',
    'https://commons.wikimedia.org/wiki/Special:FilePath/20090610_0_ambience.ogg', true),
  ('11111111-1111-4111-8111-111111111115', null, 'Rain on the pane', 'cori · PDsounds', 'wikimedia', 'Public domain', 'word',
    'https://commons.wikimedia.org/wiki/Special:FilePath/Rain_against_the_window.ogg', true),
  ('11111111-1111-4111-8111-111111111116', null, 'Dordogne pond', 'PDsounds', 'wikimedia', 'Public domain', 'word',
    'https://commons.wikimedia.org/wiki/Special:FilePath/Nature_sounds_ambience_in_a_Dordogne_pond.ogg', true),
  ('11111111-1111-4111-8111-111111111117', null, 'Breeze, birds, geese', 'PDsounds', 'wikimedia', 'Public domain', 'train',
    'https://commons.wikimedia.org/wiki/Special:FilePath/Breeze_birds_and_geese.ogg', true)
on conflict (id) do nothing;
