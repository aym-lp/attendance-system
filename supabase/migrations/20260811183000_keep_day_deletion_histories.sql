-- 勤務記録を削除しても、その削除履歴は correction_histories に残す。
alter table public.correction_histories
  drop constraint if exists correction_histories_record_id_fkey;

alter table public.correction_histories
  alter column record_id drop not null;

alter table public.correction_histories
  add constraint correction_histories_record_id_fkey
  foreign key (record_id)
  references public.attendance_records(id)
  on delete set null;
