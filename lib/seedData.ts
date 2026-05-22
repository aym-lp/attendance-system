import type { Staff, AttendanceRecord, CorrectionHistory, AttendanceSummary, StaffRole, CorrectionField } from "@/lib/types";

const staffNames = [
  { name: "田中 太郎", kana: "タナカ タロウ", role: "manager" as StaffRole, hourlyWage: 1500, transportationAllowance: 5000 },
  { name: "佐藤 花子", kana: "サトウ ハナコ", role: "staff" as StaffRole, hourlyWage: 1200, transportationAllowance: 3000 },
  { name: "鈴木 一郎", kana: "スズキ イチロウ", role: "staff" as StaffRole, hourlyWage: 1100, transportationAllowance: 2000 },
  { name: "高橋 美咲", kana: "タカハシ ミサキ", role: "staff" as StaffRole, hourlyWage: 1250, transportationAllowance: 3500 },
];

export function generateSeedStaff(): Staff[] {
  return staffNames.map((staff, index) => ({
    id: `STF-${(index + 1).toString().padStart(3, "0")}`,
    name: staff.name,
    kana: staff.kana,
    pin: index === 0 ? "9999" : Math.floor(1000 + Math.random() * 9000).toString(),
    role: staff.role,
    hourlyWage: staff.hourlyWage,
    transportationAllowance: staff.transportationAllowance,
    memo: index === 0 ? "店舗責任者" : "",
    isActive: true,
  }));
}

function formatTime(date: Date): string {
  return date.toTimeString().slice(0, 5);
}

function generateAttendanceForDay(staffId: string, staffName: string, date: Date): AttendanceRecord | null {
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return null;
  }

  const isLate = Math.random() < 0.1;
  const hasOvertime = Math.random() < 0.3;
  const hasNightShift = Math.random() < 0.15;

  const baseClockIn = new Date(date);
  baseClockIn.setHours(9, 0, 0, 0);
  if (isLate) {
    baseClockIn.setMinutes(Math.floor(Math.random() * 30) + 5);
  }

  const baseClockOut = new Date(date);
  baseClockOut.setHours(18, 0, 0, 0);
  if (hasOvertime) {
    baseClockOut.setHours(18 + Math.floor(Math.random() * 3) + 1);
  }
  if (hasNightShift) {
    baseClockOut.setHours(22 + Math.floor(Math.random() * 2));
  }

  const breakStart = new Date(date);
  breakStart.setHours(12, 0, 0, 0);

  const breakEnd = new Date(date);
  breakEnd.setHours(13, 0, 0, 0);

  const workMinutes = (baseClockOut.getTime() - baseClockIn.getTime()) / 1000 / 60 - 60;
  const totalBreakMinutes = 60;

  return {
    id: crypto.randomUUID(),
    staffId,
    staffName,
    workDate: date.toISOString().split("T")[0],
    clockIn: formatTime(baseClockIn),
    clockOut: formatTime(baseClockOut),
    breakStart: formatTime(breakStart),
    breakEnd: formatTime(breakEnd),
    totalBreakMinutes,
    status: "finished",
    workMinutes,
    overtimeMinutes: hasOvertime ? Math.floor(Math.random() * 120) + 30 : 0,
    nightMinutes: hasNightShift ? Math.floor(Math.random() * 180) + 60 : 0,
  };
}

export function generateSeedAttendanceRecords(staffList: Staff[]): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const today = new Date();
  const twoMonthsAgo = new Date(today);
  twoMonthsAgo.setMonth(today.getMonth() - 2);

  for (const staff of staffList) {
    const currentDate = new Date(twoMonthsAgo);
    while (currentDate <= today) {
      const record = generateAttendanceForDay(staff.id, staff.name, currentDate);
      if (record) {
        records.push(record);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  return records;
}

export function generateSeedCorrectionHistories(staff: Staff[], records: AttendanceRecord[]): CorrectionHistory[] {
  const histories: CorrectionHistory[] = [];
  const correctionTypes: CorrectionField[] = ["clockIn", "clockOut", "breakStart", "breakEnd"];
  const reasons = ["打刻漏れ", "退勤修正", "休憩修正", "代理修正", "時刻入力ミス"];

  for (let i = 0; i < 15; i++) {
    const randomRecord = records[Math.floor(Math.random() * records.length)];
    const randomStaff = staff[Math.floor(Math.random() * staff.length)];
    const field = correctionTypes[Math.floor(Math.random() * correctionTypes.length)];
    const reason = reasons[Math.floor(Math.random() * reasons.length)];

    const beforeValue = randomRecord[field];
    const afterValue = formatTime(new Date(new Date(`2000-01-01T${beforeValue}`).getTime() + (Math.random() > 0.5 ? 300000 : -300000)));

    histories.push({
      id: crypto.randomUUID(),
      recordId: randomRecord.id,
      staffId: randomStaff.id,
      staffName: randomStaff.name,
      workDate: randomRecord.workDate,
      field,
      beforeValue,
      afterValue,
      correctedBy: staff[0].name,
      correctedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      reason,
    });
  }

  return histories.sort((a, b) => new Date(b.correctedAt).getTime() - new Date(a.correctedAt).getTime());
}

export function generateSeedMonthlySummary(staffList: Staff[], records: AttendanceRecord[]): AttendanceSummary[] {
  const summaries: AttendanceSummary[] = [];
  const currentMonth = new Date().toISOString().slice(0, 7);

  for (const staff of staffList) {
    const staffRecords = records.filter((r) => r.staffId === staff.id && r.workDate.startsWith(currentMonth));
    const workDays = staffRecords.length;
    const workMinutes = staffRecords.reduce((sum, r) => sum + r.workMinutes, 0);
    const breakMinutes = staffRecords.reduce((sum, r) => sum + r.totalBreakMinutes, 0);
    const overtimeMinutes = staffRecords.reduce((sum, r) => sum + r.overtimeMinutes, 0);
    const nightMinutes = staffRecords.reduce((sum, r) => sum + r.nightMinutes, 0);

    const basePay = Math.floor((workMinutes / 60) * staff.hourlyWage);
    const overtimePay = Math.floor((overtimeMinutes / 60) * staff.hourlyWage * 1.25);
    const nightPay = Math.floor((nightMinutes / 60) * staff.hourlyWage * 1.35);
    const transportationAllowance = workDays * staff.transportationAllowance;
    const totalPay = basePay + overtimePay + nightPay + transportationAllowance;

    summaries.push({
      staffId: staff.id,
      staffName: staff.name,
      month: currentMonth,
      workDays,
      workMinutes,
      breakMinutes,
      overtimeMinutes,
      nightMinutes,
      basePay,
      overtimePay,
      nightPay,
      transportationAllowance,
      totalPay,
    });
  }

  return summaries;
}

export function generateSeedData() {
  const staff = generateSeedStaff();
  const records = generateSeedAttendanceRecords(staff);
  const histories = generateSeedCorrectionHistories(staff, records);
  const summaries = generateSeedMonthlySummary(staff, records);

  return { staff, records, histories, summaries };
}
