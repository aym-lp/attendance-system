import type { Allowance, AttendanceRecord, AttendanceSummary, Staff } from "@/lib/types";

const STANDARD_WORK_MINUTES = 8 * 60;

function roundDownTo15Minutes(date: Date): Date {
  const result = new Date(date);
  const minutes = result.getMinutes();
  const remainder = minutes % 15;
  result.setMinutes(minutes - remainder);
  result.setSeconds(0, 0);
  return result;
}

export function getApplicableAllowances(record: AttendanceRecord, allowances: Allowance[]): Allowance[] {
  return allowances.filter(
    (a) => a.staffId === record.staffId && record.workDate >= a.startDate && record.workDate <= a.endDate,
  );
}

export function getEffectiveHourlyWage(baseWage: number, allowances: Allowance[]): { wage: number; labels: string[] } {
  const totalAddition = allowances.reduce((sum, a) => sum + a.hourlyAddition, 0);
  return {
    wage: baseWage + totalAddition,
    labels: allowances.map((a) => `${a.name} +${a.hourlyAddition.toLocaleString()}円`),
  };
}

export function calculateRecordPayroll(record: AttendanceRecord, staff: Staff | undefined, allowances: Allowance[], now = new Date()) {
  const baseHourlyWage = staff?.hourlyWage ?? 0;
  const applicableAllowances = getApplicableAllowances(record, allowances);
  const allowanceHourlyAddition = applicableAllowances.reduce((sum, allowance) => sum + allowance.hourlyAddition, 0);
  const allowanceLabels = applicableAllowances.map((allowance) => `${allowance.name} +${allowance.hourlyAddition.toLocaleString()}円`);

  const clockOutTime = parseTime(record.clockOut);
  const referenceTime = clockOutTime ?? now;
  const workMinutes = getWorkedMinutes(record, referenceTime);
  const overtimeMinutes = getOvertimeMinutes(record, referenceTime);
  const nightMinutes = record.nightMinutes || 0;
  const baseMinutes = Math.max(0, workMinutes - overtimeMinutes);
  const allowanceMinutes = allowanceHourlyAddition > 0 ? workMinutes : 0;

  const basePay = (baseMinutes / 60) * baseHourlyWage;
  const overtimePay = (overtimeMinutes / 60) * baseHourlyWage * 1.25;
  const nightPay = (nightMinutes / 60) * baseHourlyWage * 1.35;
  const allowancePay = (workMinutes / 60) * allowanceHourlyAddition;
  const totalPay = basePay + overtimePay + nightPay + allowancePay;

  return {
    workMinutes,
    baseMinutes,
    overtimeMinutes,
    nightMinutes,
    allowanceMinutes,
    basePay,
    overtimePay,
    nightPay,
    allowancePay,
    totalPay,
    allowanceLabels,
  };
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

export function formatBreakMinutes(minutes: number) {
  const normalized = Math.max(0, Math.round(minutes));
  return `${normalized}分`;
}

/**
 * Breaks are counted only in the three payroll units agreed for this system.
 * Any non-zero break up to 30 minutes counts as 30 minutes; a longer break
 * counts as 45 minutes.
 */
export function roundUpBreakMinutes(minutes: number) {
  const normalized = Math.max(0, Number(minutes) || 0);
  if (normalized === 0) return 0;
  if (normalized <= 30) return 30;
  return 45;
}

export function getBreakIntervalMinutes(record: Pick<AttendanceRecord, "breakStart" | "breakEnd">) {
  const start = parseTime(record.breakStart);
  const end = parseTime(record.breakEnd);
  if (!start || !end) return 0;
  return Math.max(0, (end.getTime() - start.getTime()) / 60000);
}

export function getEffectiveBreakMinutes(record: AttendanceRecord): number {
  return roundUpBreakMinutes(getBreakIntervalMinutes(record));
}

export function formatWorkDateParts(value: string): { year: string; monthDay: string } {
  const [year = "", month = "", day = ""] = value.split("-");
  return {
    year,
    monthDay: month && day ? `${Number(month)}/${Number(day)}` : value,
  };
}

export function formatWorkDateForDialog(value: string) {
  const { year, monthDay } = formatWorkDateParts(value);
  return year && monthDay !== value ? `${year}/${monthDay}` : value;
}

export function getWorkedMinutes(record: AttendanceRecord, now = new Date()) {
  if (!record.clockIn) return 0;

  const rawStart = parseTime(record.clockIn);
  if (!rawStart) return 0;
  // Both clock-in and clock-out are counted at the preceding 15-minute
  // boundary. For example, 08:22–14:53 becomes 08:15–14:45.
  const start = roundDownTo15Minutes(rawStart).getTime();

  let end: number;
  if (record.clockOut) {
    const rawEnd = parseTime(record.clockOut);
    end = rawEnd ? roundDownTo15Minutes(rawEnd).getTime() : roundDownTo15Minutes(now).getTime();
  } else {
    end = roundDownTo15Minutes(now).getTime();
  }

  const gross = Math.max(0, (end - start) / 60000);

  return Math.max(0, gross - getEffectiveBreakMinutes(record));
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

export function buildMonthlySummary(records: AttendanceRecord[], month: string, staffList: Staff[] = [], allowances: Allowance[] = []): AttendanceSummary[] {
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
      allowanceMinutes: 0,
      basePay: 0,
      overtimePay: 0,
      nightPay: 0,
      allowancePay: 0,
      transportationAllowance: 0,
      totalPay: 0,
    };

    const staff = staffList.find((item) => item.id === record.staffId);
    const transportationAllowance = staff?.transportationAllowance ?? 0;
    const payroll = calculateRecordPayroll(record, staff, allowances);

    current.workDays += record.clockIn ? 1 : 0;
    current.workMinutes += payroll.workMinutes;
    current.breakMinutes += getEffectiveBreakMinutes(record);
    current.overtimeMinutes += payroll.overtimeMinutes;
    current.nightMinutes += payroll.nightMinutes;
    current.allowanceMinutes += payroll.allowanceMinutes;
    current.basePay += payroll.basePay;
    current.overtimePay += payroll.overtimePay;
    current.nightPay += payroll.nightPay;
    current.allowancePay += payroll.allowancePay;
    current.transportationAllowance += transportationAllowance;
    current.totalPay += payroll.basePay + payroll.overtimePay + payroll.nightPay + payroll.allowancePay + transportationAllowance;

    summaries.set(record.staffId, current);
  });

  return Array.from(summaries.values());
}

export function recordsToCsv(records: AttendanceRecord[], staffList: Staff[], allowances: Allowance[]) {
  const header = ["日付", "スタッフ", "出勤", "退勤", "休憩時間", "勤務時間", "残業時間", "通常給与", "残業給与", "日給"];
  let totalRegularPay = 0;
  let totalOvertimePay = 0;
  let totalPay = 0;

  const rows = records.map((record) => {
    const clockOutTime = parseTime(record.clockOut);
    const staff = staffList.find((s) => s.id === record.staffId);
    const payroll = calculateRecordPayroll(record, staff, allowances, clockOutTime ?? new Date());
    const grossWorkMinutes = payroll.workMinutes;
    const overtimeMinutes = payroll.overtimeMinutes;
    const regularPay = payroll.basePay;
    const overtimePay = payroll.overtimePay;
    const dayPay = payroll.totalPay;

    totalRegularPay += regularPay;
    totalOvertimePay += overtimePay;
    totalPay += dayPay;

    return [
      record.workDate,
      record.staffName,
      formatDateTime(record.clockIn),
      formatDateTime(record.clockOut),
      formatBreakMinutes(getEffectiveBreakMinutes(record)),
      formatMinutes(grossWorkMinutes),
      formatMinutes(overtimeMinutes),
      formatCurrency(regularPay),
      formatCurrency(overtimePay),
      formatCurrency(dayPay),
    ];
  });

  const totalRow = ["", "", "", "", "", "", "合計", formatCurrency(totalRegularPay), formatCurrency(totalOvertimePay), formatCurrency(totalPay)];

  return [header, ...rows, totalRow]
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
    .join("\n");
}
