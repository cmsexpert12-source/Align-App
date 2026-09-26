-- ALIGN Circle — actual I’m-up and Goodnight clocks. Safe to run again.
-- Friends see when the other person rose and slept. Still not journals, notes, or affirmation.

alter table public.path_days add column if not exists wake_at timestamptz;
alter table public.path_days add column if not exists lights_at timestamptz;
