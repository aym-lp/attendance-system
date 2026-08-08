-- attendance_records テーブル作成SQL
-- 勤怠履歴を保存するテーブル

-- テーブル作成
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  staff_name TEXT NOT NULL,
  work_date DATE NOT NULL,
  clock_in TIMESTAMP WITH TIME ZONE,
  clock_out TIMESTAMP WITH TIME ZONE,
  break_start TIMESTAMP WITH TIME ZONE,
  break_end TIMESTAMP WITH TIME ZONE,
  total_break_minutes INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'working', -- 'working', 'on_break', 'finished'
  work_minutes INTEGER DEFAULT 0,
  overtime_minutes INTEGER DEFAULT 0,
  night_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_attendance_records_staff_id ON attendance_records(staff_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_work_date ON attendance_records(work_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_records_staff_date ON attendance_records(staff_id, work_date);

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER IF NOT EXISTS update_attendance_records_updated_at 
  BEFORE UPDATE ON attendance_records 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) 有効化
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- すべての認証済みユーザーが読み取り可能
CREATE POLICY "認証済みユーザーは勤怠記録を読み取り可能"
  ON attendance_records FOR SELECT
  TO authenticated
  USING (true);

-- すべての認証済みユーザーが挿入可能
CREATE POLICY "認証済みユーザーは勤怠記録を挿入可能"
  ON attendance_records FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- すべての認証済みユーザーが更新可能
CREATE POLICY "認証済みユーザーは勤怠記録を更新可能"
  ON attendance_records FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- すべての認証済みユーザーが削除可能
CREATE POLICY "認証済みユーザーは勤怠記録を削除可能"
  ON attendance_records FOR DELETE
  TO authenticated
  USING (true);

-- Realtime 機能有効化
ALTER PUBLICATION supabase_realtime ADD TABLE attendance_records;
