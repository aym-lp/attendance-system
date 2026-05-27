-- Row Level Security policies required for the Ogawa attendance system.
-- Execute these statements after running schema.sql.

-- staff ------------------------------------------------------------
alter table public.staff enable row level security;

drop policy if exists "Allow public select staff" on public.staff;
create policy "Allow public select staff" on public.staff
  for select
  using (true);

drop policy if exists "Allow public insert staff" on public.staff;
create policy "Allow public insert staff" on public.staff
  for insert
  with check (true);

drop policy if exists "Allow public update staff" on public.staff;
create policy "Allow public update staff" on public.staff
  for update
  using (true)
  with check (true);

-- attendance_records ----------------------------------------------
alter table public.attendance_records enable row level security;

drop policy if exists "Allow public select attendance_records" on public.attendance_records;
create policy "Allow public select attendance_records" on public.attendance_records
  for select
  using (true);

drop policy if exists "Allow public insert attendance_records" on public.attendance_records;
create policy "Allow public insert attendance_records" on public.attendance_records
  for insert
  with check (true);

-- Allow updates (used for upsert via update)
drop policy if exists "Allow public update attendance_records" on public.attendance_records;
create policy "Allow public update attendance_records" on public.attendance_records
  for update
  using (true)
  with check (true);

-- allowances -------------------------------------------------------
alter table public.allowances enable row level security;

drop policy if exists "Allow public select allowances" on public.allowances;
create policy "Allow public select allowances" on public.allowances
  for select
  using (true);

drop policy if exists "Allow public insert allowances" on public.allowances;
create policy "Allow public insert allowances" on public.allowances
  for insert
  with check (true);

drop policy if exists "Allow public update allowances" on public.allowances;
create policy "Allow public update allowances" on public.allowances
  for update
  using (true)
  with check (true);

drop policy if exists "Allow public delete allowances" on public.allowances;
create policy "Allow public delete allowances" on public.allowances
  for delete
  using (true);

-- correction_histories --------------------------------------------
alter table public.correction_histories enable row level security;

drop policy if exists "Allow public select correction_histories" on public.correction_histories;
create policy "Allow public select correction_histories" on public.correction_histories
  for select
  using (true);

drop policy if exists "Allow public insert correction_histories" on public.correction_histories;
create policy "Allow public insert correction_histories" on public.correction_histories
  for insert
  with check (true);
