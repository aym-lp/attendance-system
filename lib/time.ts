import type { AttendanceRecord, AttendanceSummary, Staff } from "@/lib/types";

const STANDARD_WORK_MINUTES = 8 * 60;

export function roundUpBreakMinutes(minutes: number): { rounded: number; error: boolean } {
  if (minutes <= 30) return { rounded: 30, error: false };
  if (minutes <= 45) return { rounded: 45, error: false };
  return { rounded: minutes, error: true };
}

export function getTodayKey(date = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function parseTime(value: string | null): Date | null {
  if (!value) return null;
  if (value.includes("T")) return new Date(value);
  const [hours, minutes] = value.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export function formatDateTime(value: string | null) {
  if (!value) return "--:--";

  const parsed = parseTime(value);
  if (!parsed) return "--:--";

  return new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

export function formatMinutes(minutes: number) {
  const normalized = Math.max(0, Math.round(minutes));
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${hours}時間${mins.toString().padStart(2, "0")}分`;
}

export function getWorkedMinutes(record: AttendanceRecord, now = new Date()) {
  if (!record.clockIn) return 0;

  const start = parseTime(record.clockIn)?.getTime() ?? 0;
  const end = record.clockOut ? parseTime(record.clockOut)?.getTime() ?? now.getTime() : now.getTime();
  const currentBreak = record.breakStart && !record.breakEnd ? Math.max(0, now.getTime() - (parseTime(record.breakStart)?.getTime() ?? now.getTime())) / 60000 : 0;
  const gross = Math.max(0, (end - start) / 60000);

  return Math.max(0, gross - record.totalBreakMinutes - currentBreak);
}

export function getOvertimeMinutes(record: AttendanceRecord, now = new Date()) {
  return Math.max(0, getWorkedMinutes(record, now) - STANDARD_WORK_MINUTES);
}

export function createEmptyRecord(staff: Staff, now = new Date()): AttendanceRecord {
  return {
    id: crypto.randomUUID(),
    staffId: staff.id,
    staffName: staff.name,
    workDate: getTodayKey(now),
    clockIn: null,
    clockOut: null,
    breakStart: null,
    breakEnd: null,
    totalBreakMinutes: 0,
    status: "off",
    workMinutes: 0,
    overtimeMinutes: 0,
    nightMinutes: 0,
  };
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

export function toDateTimeInputValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
}

export function fromDateTimeInputValue(value: string) {
  if (!value) return null;
  return new Date(value).toISOString();
}

export function buildMonthlySummary(records: AttendanceRecord[], month: string, staffList: Staff[] = []): AttendanceSummary[] {
  const filtered = records.filter((record) => record.workDate.startsWith(month));
  const summaries = new Map<string, AttendanceSummary>();

  filtered.forEach((record) => {
    const current = summaries.get(record.staffId) ?? {
      staffId: record.staffId,
      staffName: record.staffName,
      month,
      workDays: 0,
      workMinutes: 0,
      breakMinutes: 0,
      overtimeMinutes: 0,
      nightMinutes: 0,
      basePay: 0,
      overtimePay: 0,
      nightPay: 0,
      transportationAllowance: 0,
      totalPay: 0,
    };

    const staff = staffList.find((item) => item.id === record.staffId);
    const hourlyWage = staff?.hourlyWage ?? 0;
    const transportationAllowance = staff?.transportationAllowance ?? 0;
    const clockOutTime = parseTime(record.clockOut);
    const workMinutes = record.workMinutes || getWorkedMinutes(record, clockOutTime ?? new Date());
    const overtimeMinutes = record.overtimeMinutes || getOvertimeMinutes(record, clockOutTime ?? new Date());
    const nightMinutes = record.nightMinutes || 0;
    const baseMinutes = Math.max(0, workMinutes - overtimeMinutes);
    const basePay = (baseMinutes / 60) * hourlyWage;
    const overtimePay = (overtimeMinutes / 60) * hourlyWage * 1.25;
    const nightPay = (nightMinutes / 60) * hourlyWage * 1.35;

    current.workDays += record.clockIn ? 1 : 0;
    current.workMinutes += workMinutes;
    current.breakMinutes += record.totalBreakMinutes;
    current.overtimeMinutes += overtimeMinutes;
    current.nightMinutes += nightMinutes;
    current.basePay += basePay;
    current.overtimePay += overtimePay;
    current.nightPay += nightPay;
    current.transportationAllowance += transportationAllowance;
    current.totalPay += basePay + overtimePay + nightPay + transportationAllowance;

    summaries.set(record.staffId, current);
  });

  return Array.from(summaries.values());
}

export function recordsToCsv(records: AttendanceRecord[]) {
  const header = ["日付", "スタッフ", "出勤", "退勤", "休憩時間", "勤務時間", "残業時間", "状態"];
  const rows = records.map((record) => {
    const clockOutTime = parseTime(record.clockOut);
    return [
      record.workDate,
      record.staffName,
      formatDateTime(record.clockIn),
      formatDateTime(record.clockOut),
      formatMinutes(record.totalBreakMinutes),
      formatMinutes(getWorkedMinutes(record, clockOutTime ?? new Date())),
      formatMinutes(getOvertimeMinutes(record, clockOutTime ?? new Date())),
      record.status,
    ];
  });

  return [header, ...rows]
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
    .join("\n");
}
