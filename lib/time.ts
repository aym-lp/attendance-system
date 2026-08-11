import type { Allowance, AttendanceRecord, AttendanceSummary, Staff } from "@/lib/types";

const STANDARD_WORK_MINUTES = 8 * 60;

export function roundUpBreakMinutes(minutes: number): { rounded: number; error: boolean } {
  if (minutes === 0) return { rounded: 0, error: false };
  if (minutes <= 30) return { rounded: 30, error: false };
  if (minutes <= 45) return { rounded: 45, error: false };
  return { rounded: minutes, error: true };
}

function roundUpTo15Minutes(date: Date): Date {
  const result = new Date(date);
  const minutes = result.getMinutes();
  const remainder = minutes % 15;
  if (remainder === 0) return result;
  result.setMinutes(minutes + (15 - remainder));
  result.setSeconds(0, 0);
  return result;
}

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
  const { rounded: roundedBreakMinutes } = roundUpBreakMinutes(record.totalBreakMinutes);
  const workMinutes = record.workMinutes || getWorkedMinutesWithRoundedBreak(record, referenceTime, roundedBreakMinutes);
  const overtimeMinutes = record.overtimeMinutes || getOvertimeMinutesWithRoundedBreak(record, referenceTime, roundedBreakMinutes);
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

export function getWorkedMinutes(record: AttendanceRecord, now = new Date()) {
  if (!record.clockIn) return 0;

  const rawStart = parseTime(record.clockIn);
  if (!rawStart) return 0;
  const start = roundUpTo15Minutes(rawStart).getTime();

  let end: number;
  if (record.clockOut) {
    const rawEnd = parseTime(record.clockOut);
    end = rawEnd ? roundDownTo15Minutes(rawEnd).getTime() : now.getTime();
  } else {
    end = now.getTime();
  }

  const currentBreak = record.breakStart && !record.breakEnd ? Math.max(0, now.getTime() - (parseTime(record.breakStart)?.getTime() ?? now.getTime())) / 60000 : 0;
  const gross = Math.max(0, (end - start) / 60000);

  return Math.max(0, gross - record.totalBreakMinutes - currentBreak);
}

export function getWorkedMinutesWithRoundedBreak(record: AttendanceRecord, now = new Date(), roundedBreakMinutes: number) {
  if (!record.clockIn) return 0;

  const rawStart = parseTime(record.clockIn);
  if (!rawStart) return 0;
  const start = roundUpTo15Minutes(rawStart).getTime();

  let end: number;
  if (record.clockOut) {
    const rawEnd = parseTime(record.clockOut);
    end = rawEnd ? roundDownTo15Minutes(rawEnd).getTime() : now.getTime();
  } else {
    end = now.getTime();
  }

  const currentBreak = record.breakStart && !record.breakEnd ? Math.max(0, now.getTime() - (parseTime(record.breakStart)?.getTime() ?? now.getTime())) / 60000 : 0;
  const gross = Math.max(0, (end - start) / 60000);

  return Math.max(0, gross - roundedBreakMinutes - currentBreak);
}

export function getOvertimeMinutes(record: AttendanceRecord, now = new Date()) {
  return Math.max(0, getWorkedMinutes(record, now) - STANDARD_WORK_MINUTES);
}

export function getOvertimeMinutesWithRoundedBreak(record: AttendanceRecord, now = new Date(), roundedBreakMinutes: number) {
  return Math.max(0, getWorkedMinutesWithRoundedBreak(record, now, roundedBreakMinutes) - STANDARD_WORK_MINUTES);
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
    current.breakMinutes += record.totalBreakMinutes;
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
      formatMinutes(record.totalBreakMinutes),
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
