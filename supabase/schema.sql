-- Supabase schema for the Ogawa attendance system
-- Execute via the Supabase SQL editor or CLI.
-- Enable the `uuid-ossp` or `pgcrypto` extension if not already enabled.

create extension if not exists "pgcrypto";

create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kana text not null,
  pin text not null unique,
  role text not null default 'staff',
  hourly_wage numeric not null default 0,
  transportation_allowance numeric not null default 0,
  memo text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff(id) on delete cascade,
  staff_name text not null,
  work_date text not null,
  clock_in timestamptz,
  clock_out timestamptz,
  break_start timestamptz,
  break_end timestamptz,
  total_break_minutes integer not null default 0,
  status text not null default 'off',
  work_minutes integer not null default 0,
  overtime_minutes integer not null default 0,
  night_minutes integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists attendance_records_staff_date_idx on public.attendance_records (staff_id, work_date);
create index if not exists attendance_records_date_idx on public.attendance_records (work_date);

create table if not exists public.allowances (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date text not null,
  end_date text not null,
  staff_id uuid not null references public.staff(id) on delete cascade,
  staff_name text not null,
  hourly_addition numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists allowances_staff_idx on public.allowances (staff_id, start_date, end_date);

create table if not exists public.correction_histories (
  id uuid primary key default gen_random_uuid(),
  record_id uuid references public.attendance_records(id) on delete set null,
  staff_id uuid not null references public.staff(id) on delete cascade,
  staff_name text not null,
  work_date text not null,
  field text not null,
  before_value text,
  after_value text,
  corrected_by text not null,
  corrected_at timestamptz not null default now(),
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists correction_histories_staff_idx on public.correction_histories (staff_id, work_date);
create index if not exists correction_histories_record_idx on public.correction_histories (record_id);

-- Keep updated_at in sync
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger staff_updated_at before update on public.staff
  for each row execute function public.set_updated_at();

create trigger attendance_records_updated_at before update on public.attendance_records
  for each row execute function public.set_updated_at();

create trigger allowances_updated_at before update on public.allowances
  for each row execute function public.set_updated_at();

-- Enable realtime for the tables from Supabase dashboard: Database > Replication > Realtime
