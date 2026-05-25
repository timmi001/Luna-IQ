-- Persist menstrual cycle anchor on the user profile (source of truth for Luna IQ).
alter table public.profiles
  add column if not exists last_period_date date,
  add column if not exists cycle_length integer not null default 28;

comment on column public.profiles.last_period_date is 'First day of the user''s most recently logged period (YYYY-MM-DD).';
comment on column public.profiles.cycle_length is 'Average cycle length in days; phase/day are computed client-side from last_period_date.';
