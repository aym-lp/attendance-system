-- 勤務記録の削除を許可し、スタッフごとの同一日重複を解消・防止する。

-- 修正履歴は勤務記録の削除後も残す。
alter table public.correction_histories
  drop constraint if exists correction_histories_record_id_fkey;

alter table public.correction_histories
  alter column record_id drop not null;

alter table public.correction_histories
  add constraint correction_histories_record_id_fkey
  foreign key (record_id)
  references public.attendance_records(id)
  on delete set null;

-- 同じスタッフ・同じ日付の勤務記録は1件だけにする。
-- 既存の重複がある場合は、先に内容を確認して個別に整理してから実行する。
create unique index if not exists attendance_records_staff_date_unique_idx
  on public.attendance_records (staff_id, work_date);

-- ブラウザから選択した勤務記録を削除できるようにする。
alter table public.attendance_records enable row level security;

drop policy if exists "Allow public delete attendance_records" on public.attendance_records;
create policy "Allow public delete attendance_records" on public.attendance_records
  for delete
  using (true);
