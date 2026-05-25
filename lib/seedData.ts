import type { Staff, AttendanceRecord, CorrectionHistory, AttendanceSummary, StaffRole, CorrectionField } from "@/lib/types";

const staffNames = [
  { name: "細田 径弘", kana: "ホソダ ミチヒロ", role: "manager" as StaffRole, hourlyWage: 0, transportationAllowance: 0 },
  { name: "和島 亜純", kana: "ワジマ アジュン", role: "staff" as StaffRole, hourlyWage: 1310, transportationAllowance: 0 },
  { name: "小野林 茜", kana: "オノバヤシ アカネ", role: "staff" as StaffRole, hourlyWage: 1207, transportationAllowance: 0 },
  { name: "樋口 凛", kana: "ヒグチ リン", role: "staff" as StaffRole, hourlyWage: 1177, transportationAllowance: 0 },
  { name: "杉本 羅希", kana: "スギモト ラキ", role: "staff" as StaffRole, hourlyWage: 1177, transportationAllowance: 0 },
  { name: "出嶋 晴翔", kana: "イズシマ ハルト", role: "staff" as StaffRole, hourlyWage: 1177, transportationAllowance: 0 },
];

export function generateSeedStaff(): Staff[] {
  return staffNames.map((staff, index) => ({
    id: `STF-${(index + 1).toString().padStart(3, "0")}`,
    name: staff.name,
    kana: staff.kana,
    pin: ["9999", "1111", "2222", "3333", "4444", "5555"][index],
    role: staff.role,
    hourlyWage: staff.hourlyWage,
    transportationAllowance: staff.transportationAllowance,
    memo: index === 0 ? "管理者" : "",
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

  const breakPattern = Math.random();
  let breakStart: Date | null = null;
  let breakEnd: Date | null = null;
  let totalBreakMinutes = 0;

  if (breakPattern < 0.3) {
    totalBreakMinutes = 30;
    breakStart = new Date(date);
    breakStart.setHours(12, 0, 0, 0);
    breakEnd = new Date(date);
    breakEnd.setHours(12, 30, 0, 0);
  } else if (breakPattern < 0.7) {
    totalBreakMinutes = 45;
    breakStart = new Date(date);
    breakStart.setHours(12, 0, 0, 0);
    breakEnd = new Date(date);
    breakEnd.setHours(12, 45, 0, 0);
  } else {
    totalBreakMinutes = 60;
    breakStart = new Date(date);
    breakStart.setHours(12, 0, 0, 0);
    breakEnd = new Date(date);
    breakEnd.setHours(13, 0, 0, 0);
  }

  const workMinutes = (baseClockOut.getTime() - baseClockIn.getTime()) / 1000 / 60 - totalBreakMinutes;

  return {
    id: crypto.randomUUID(),
    staffId,
    staffName,
    workDate: date.toISOString().split("T")[0],
    clockIn: formatTime(baseClockIn),
    clockOut: formatTime(baseClockOut),
    breakStart: breakStart ? formatTime(breakStart) : null,
    breakEnd: breakEnd ? formatTime(breakEnd) : null,
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
  const todayString = today.toISOString().split("T")[0];
  const twoMonthsAgo = new Date(today);
  twoMonthsAgo.setMonth(today.getMonth() - 2);

  for (const staff of staffList) {
    const currentDate = new Date(twoMonthsAgo);
    while (currentDate <= today) {
      const dateString = currentDate.toISOString().split("T")[0];
      // 田中太郎（店長）の本日のレコードは生成しない
      if (staff.id === "STF-001" && dateString === todayString) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }
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
