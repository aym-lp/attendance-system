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

-- 既存行を削除・更新せず、今後の重複登録だけを拒否する。
create or replace function public.prevent_duplicate_attendance_record()
returns trigger as $$
begin
  if exists (
    select 1
    from public.attendance_records
    where staff_id = new.staff_id
      and work_date = new.work_date
      and id is distinct from new.id
  ) then
    raise exception '同じスタッフ・同じ日付の勤務記録はすでに登録されています';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists attendance_records_prevent_duplicate on public.attendance_records;
create trigger attendance_records_prevent_duplicate
  before insert or update of staff_id, work_date on public.attendance_records
  for each row execute function public.prevent_duplicate_attendance_record();

-- ブラウザから選択した勤務記録を削除できるようにする。
alter table public.attendance_records enable row level security;

drop policy if exists "Allow public delete attendance_records" on public.attendance_records;
create policy "Allow public delete attendance_records" on public.attendance_records
  for delete
  using (true);
