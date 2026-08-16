import type { Allowance, AttendanceRecord, AttendanceStatus, CorrectionField, CorrectionHistory, Staff } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

type StaffRow = {
  id: string;
  name: string;
  kana: string;
  pin: string;
  role: Staff["role"];
  hourly_wage: number;
  transportation_allowance: number;
  memo: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

type AttendanceRecordRow = {
  id: string;
  staff_id: string;
  staff_name: string;
  work_date: string;
  clock_in: string | null;
  clock_out: string | null;
  break_start: string | null;
  break_end: string | null;
  total_break_minutes: number;
  status: AttendanceStatus;
  work_minutes: number;
  overtime_minutes: number;
  night_minutes: number;
  created_at: string | null;
  updated_at: string | null;
};

type AllowanceRow = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  staff_id: string;
  staff_name: string;
  hourly_addition: number;
  created_at: string | null;
  updated_at: string | null;
};

type CorrectionHistoryRow = {
  id: string;
  record_id: string | null;
  staff_id: string;
  staff_name: string;
  work_date: string;
  field: string;
  before_value: string | null;
  after_value: string | null;
  corrected_by: string;
  corrected_at: string;
  reason: string;
  created_at: string | null;
};

const STAFF_COLUMNS = "id,name,kana,pin,role,hourly_wage,transportation_allowance,memo,is_active,created_at,updated_at";
const RECORD_COLUMNS = "id,staff_id,staff_name,work_date,clock_in,clock_out,break_start,break_end,total_break_minutes,status,work_minutes,overtime_minutes,night_minutes,created_at,updated_at";
const ALLOWANCE_COLUMNS = "id,name,start_date,end_date,staff_id,staff_name,hourly_addition,created_at,updated_at";
const CORRECTION_COLUMNS = "id,record_id,staff_id,staff_name,work_date,field,before_value,after_value,corrected_by,corrected_at,reason,created_at";

function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase が設定されていません");
  }
  return supabase;
}

function mapStaffRow(row: StaffRow): Staff {
  return {
    id: row.id,
    name: row.name,
    kana: row.kana,
    pin: row.pin,
    role: row.role,
    hourlyWage: row.hourly_wage ?? 0,
    transportationAllowance: row.transportation_allowance ?? 0,
    memo: row.memo ?? "",
    isActive: row.is_active,
  };
}

function toStaffRow(staff: Staff): Partial<StaffRow> {
  return {
    id: staff.id,
    name: staff.name,
    kana: staff.kana,
    pin: staff.pin,
    role: staff.role,
    hourly_wage: staff.hourlyWage,
    transportation_allowance: staff.transportationAllowance,
    memo: staff.memo,
    is_active: staff.isActive,
  };
}

function mapAttendanceRecordRow(row: AttendanceRecordRow): AttendanceRecord {
  return {
    id: row.id,
    staffId: row.staff_id,
    staffName: row.staff_name,
    workDate: row.work_date,
    clockIn: row.clock_in,
    clockOut: row.clock_out,
    breakStart: row.break_start,
    breakEnd: row.break_end,
    totalBreakMinutes: row.total_break_minutes ?? 0,
    status: row.status,
    workMinutes: row.work_minutes ?? 0,
    overtimeMinutes: row.overtime_minutes ?? 0,
    nightMinutes: row.night_minutes ?? 0,
  };
}

function toAttendanceRecordRow(record: AttendanceRecord): Partial<AttendanceRecordRow> {
  return {
    id: record.id,
    staff_id: record.staffId,
    staff_name: record.staffName,
    work_date: record.workDate,
    clock_in: record.clockIn,
    clock_out: record.clockOut,
    break_start: record.breakStart,
    break_end: record.breakEnd,
    total_break_minutes: record.totalBreakMinutes,
    status: record.status,
    work_minutes: record.workMinutes,
    overtime_minutes: record.overtimeMinutes,
    night_minutes: record.nightMinutes,
  };
}

function mapAllowanceRow(row: AllowanceRow): Allowance {
  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    staffId: row.staff_id,
    staffName: row.staff_name,
    hourlyAddition: row.hourly_addition ?? 0,
  };
}

function toAllowanceRow(allowance: Allowance): Partial<AllowanceRow> {
  return {
    id: allowance.id,
    name: allowance.name,
    start_date: allowance.startDate,
    end_date: allowance.endDate,
    staff_id: allowance.staffId,
    staff_name: allowance.staffName,
    hourly_addition: allowance.hourlyAddition,
  };
}

function mapCorrectionHistoryRow(row: CorrectionHistoryRow): CorrectionHistory {
  return {
    id: row.id,
    recordId: row.record_id,
    staffId: row.staff_id,
    staffName: row.staff_name,
    workDate: row.work_date,
    field: row.field as CorrectionField,
    beforeValue: row.before_value,
    afterValue: row.after_value,
    correctedBy: row.corrected_by,
    correctedAt: row.corrected_at,
    reason: row.reason,
  };
}

function toCorrectionHistoryRow(history: CorrectionHistory): Partial<CorrectionHistoryRow> {
  return {
    id: history.id,
    record_id: history.recordId,
    staff_id: history.staffId,
    staff_name: history.staffName,
    work_date: history.workDate,
    field: history.field,
    before_value: history.beforeValue,
    after_value: history.afterValue,
    corrected_by: history.correctedBy,
    corrected_at: history.correctedAt,
    reason: history.reason,
  };
}

export async function fetchStaffList(): Promise<Staff[]> {
  const client = requireSupabase();
  const { data, error } = await client.from("staff").select(STAFF_COLUMNS).order("created_at", { ascending: true });
  if (error) {
    throw new Error(`スタッフ情報の取得に失敗しました: ${error.message}`);
  }
  return (data ?? []).map(mapStaffRow);
}

export async function fetchAttendanceRecords(): Promise<AttendanceRecord[]> {
  const client = requireSupabase();
  const { data, error } = await client.from("attendance_records").select(RECORD_COLUMNS).order("work_date", { ascending: false }).order("created_at", { ascending: false });
  if (error) {
    throw new Error(`勤務記録の取得に失敗しました: ${error.message}`);
  }
  return (data ?? []).map(mapAttendanceRecordRow);
}

export async function fetchAllowances(): Promise<Allowance[]> {
  const client = requireSupabase();
  const { data, error } = await client.from("allowances").select(ALLOWANCE_COLUMNS).order("start_date", { ascending: false });
  if (error) {
    throw new Error(`特別手当の取得に失敗しました: ${error.message}`);
  }
  return (data ?? []).map(mapAllowanceRow);
}

export async function fetchCorrectionHistories(): Promise<CorrectionHistory[]> {
  const client = requireSupabase();
  const { data, error } = await client.from("correction_histories").select(CORRECTION_COLUMNS).order("corrected_at", { ascending: false });
  if (error) {
    throw new Error(`修正履歴の取得に失敗しました: ${error.message}`);
  }
  return (data ?? []).map(mapCorrectionHistoryRow);
}

export async function fetchAttendanceSnapshot() {
  const [staff, records, allowances, histories] = await Promise.all([fetchStaffList(), fetchAttendanceRecords(), fetchAllowances(), fetchCorrectionHistories()]);
  return { staff, records, allowances, histories };
}

export async function upsertAttendanceRecord(record: AttendanceRecord): Promise<AttendanceRecord> {
  const client = requireSupabase();
  const payload = toAttendanceRecordRow(record);
  const { data, error } = await client
    .from("attendance_records")
    .upsert(payload, { onConflict: "id" })
    .select(RECORD_COLUMNS)
    .single();
  if (error || !data) {
    throw new Error(`勤務記録の保存に失敗しました: ${error?.message ?? "未知のエラー"}`);
  }
  return mapAttendanceRecordRow(data);
}

/**
 * Records a staff member's break end without replacing the rest of the
 * attendance row. The guards make this a one-time transition: an already
 * recorded break end (including one entered by an administrator) is never
 * overwritten by the normal time-clock flow.
 */
export async function completeAttendanceBreak(record: AttendanceRecord, breakEnd: string, totalBreakMinutes: number): Promise<AttendanceRecord> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("attendance_records")
    .update({
      break_end: breakEnd,
      total_break_minutes: totalBreakMinutes,
      status: "working",
    })
    .eq("id", record.id)
    .eq("staff_id", record.staffId)
    .eq("work_date", record.workDate)
    .eq("status", "break")
    .is("break_end", null)
    .select(RECORD_COLUMNS)
    .maybeSingle();

  if (error) {
    throw new Error(`休憩終了時刻の保存に失敗しました: ${error.message}`);
  }
  if (!data) {
    throw new Error("休憩終了時刻はすでに保存済みか、対象の勤務記録が見つかりません");
  }
  return mapAttendanceRecordRow(data);
}

export async function upsertStaff(staff: Staff): Promise<Staff> {
  console.log("[upsertStaff] before insert - staff:", staff);
  const client = requireSupabase();
  const payload = toStaffRow(staff);
  console.log("[upsertStaff] payload:", payload);
  const { data, error } = await client.from("staff").upsert(payload, { onConflict: "id" }).select(STAFF_COLUMNS).single();
  console.log("[upsertStaff] after insert - data:", data);
  console.log("[upsertStaff] after insert - error:", error);
  if (error || !data) {
    throw new Error(`スタッフ情報の保存に失敗しました: ${error?.message ?? "未知のエラー"}`);
  }
  return mapStaffRow(data);
}

export async function updateStaffFields(id: string, patch: Partial<Omit<Staff, "id">>): Promise<Staff> {
  const client = requireSupabase();
  const payload: Partial<StaffRow> = {};
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.kana !== undefined) payload.kana = patch.kana;
  if (patch.pin !== undefined) payload.pin = patch.pin;
  if (patch.role !== undefined) payload.role = patch.role;
  if (patch.hourlyWage !== undefined) payload.hourly_wage = patch.hourlyWage;
  if (patch.transportationAllowance !== undefined) payload.transportation_allowance = patch.transportationAllowance;
  if (patch.memo !== undefined) payload.memo = patch.memo;
  if (patch.isActive !== undefined) payload.is_active = patch.isActive;

  if (Object.keys(payload).length === 0) {
    const { data, error } = await client.from("staff").select(STAFF_COLUMNS).eq("id", id).single();
    if (error || !data) {
      throw new Error(`スタッフ情報の取得に失敗しました: ${error?.message ?? "未知のエラー"}`);
    }
    return mapStaffRow(data);
  }

  const { data, error } = await client.from("staff").update(payload).eq("id", id).select(STAFF_COLUMNS).single();
  if (error || !data) {
    throw new Error(`スタッフ情報の更新に失敗しました: ${error?.message ?? "未知のエラー"}`);
  }
  return mapStaffRow(data);
}

export async function insertAllowance(allowance: Allowance): Promise<Allowance> {
  const client = requireSupabase();
  const payload = toAllowanceRow(allowance);
  const { data, error } = await client.from("allowances").upsert(payload, { onConflict: "id" }).select(ALLOWANCE_COLUMNS).single();
  if (error || !data) {
    throw new Error(`特別手当の保存に失敗しました: ${error?.message ?? "未知のエラー"}`);
  }
  return mapAllowanceRow(data);
}

export async function deleteAllowance(id: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("allowances").delete().eq("id", id);
  if (error) {
    throw new Error(`特別手当の削除に失敗しました: ${error.message}`);
  }
}

export async function deleteStaff(id: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("staff").delete().eq("id", id);
  if (error) {
    throw new Error(`スタッフの削除に失敗しました: ${error.message}`);
  }
}

export async function deleteAttendanceRecord(id: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("attendance_records").delete().eq("id", id);
  if (error) {
    throw new Error(`勤怠記録の削除に失敗しました: ${error.message}`);
  }
}

export async function deleteAttendanceRecordsByStaffDate(staffId: string, workDate: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from("attendance_records")
    .delete()
    .eq("staff_id", staffId)
    .eq("work_date", workDate);
  if (error) {
    throw new Error(`指定日の勤怠記録の削除に失敗しました: ${error.message}`);
  }
}

export async function insertCorrectionHistories(histories: CorrectionHistory[]): Promise<CorrectionHistory[]> {
  if (histories.length === 0) return [];
  const client = requireSupabase();
  const payload = histories.map(toCorrectionHistoryRow);
  const { data, error } = await client
    .from("correction_histories")
    .insert(payload)
    .select(CORRECTION_COLUMNS);
  if (error || !data) {
    throw new Error(`修正履歴の保存に失敗しました: ${error?.message ?? "未知のエラー"}`);
  }
  return data.map(mapCorrectionHistoryRow);
}

export type AttendanceRealtimeHandlers = {
  onStaffChange?: () => void;
  onRecordsChange?: () => void;
  onAllowancesChange?: () => void;
  onCorrectionsChange?: () => void;
};

export function subscribeToAttendanceData(handlers: AttendanceRealtimeHandlers): () => void {
  const client = requireSupabase();
  const channel = client
    .channel("attendance-sync")
    .on("postgres_changes", { event: "*", schema: "public", table: "staff" }, () => handlers.onStaffChange?.())
    .on("postgres_changes", { event: "*", schema: "public", table: "attendance_records" }, () => handlers.onRecordsChange?.())
    .on("postgres_changes", { event: "*", schema: "public", table: "allowances" }, () => handlers.onAllowancesChange?.())
    .on("postgres_changes", { event: "*", schema: "public", table: "correction_histories" }, () => handlers.onCorrectionsChange?.())
    .subscribe();

  return () => {
    client.removeChannel(channel as RealtimeChannel);
  };
}
