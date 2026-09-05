-- Add transportation settings without changing any attendance records.
-- Existing staff retain their current per-workday transportation allowance.
alter table public.staff
  add column if not exists transportation_type text not null default 'daily',
  add column if not exists monthly_transportation_allowance numeric not null default 0;

alter table public.staff
  drop constraint if exists staff_transportation_type_check;

alter table public.staff
  add constraint staff_transportation_type_check
  check (transportation_type in ('none', 'daily', 'monthly'));
