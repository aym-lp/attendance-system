import type { Staff, AttendanceRecord, CorrectionHistory, AttendanceSummary, StaffRole } from "@/lib/types";

const staffNames = [
  { name: "細田 径弘", kana: "ホソダ ミチヒロ", role: "manager" as StaffRole, hourlyWage: 0, transportationAllowance: 0 },
  { name: "和島 亜純", kana: "ワジマ アジュン", role: "staff" as StaffRole, hourlyWage: 1310, transportationAllowance: 530 },
  { name: "小野林 茜", kana: "オノバヤシ アカネ", role: "staff" as StaffRole, hourlyWage: 1207, transportationAllowance: 0 },
  { name: "樋口 凛", kana: "ヒグチ リン", role: "staff" as StaffRole, hourlyWage: 1177, transportationAllowance: 0 },
  { name: "杉本 羅希", kana: "スギモト ラキ", role: "staff" as StaffRole, hourlyWage: 1177, transportationAllowance: 0 },
];

export function generateSeedStaff(): Staff[] {
  return staffNames.map((staff, index) => ({
    id: `STF-${(index + 1).toString().padStart(3, "0")}`,
    name: staff.name,
    kana: staff.kana,
    pin: ["9999", "1111", "2222", "3333", "4444"][index],
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

function createSpecificRecord(staffId: string, staffName: string, dateStr: string, clockInStr: string, clockOutStr: string, breakMinutes: number): AttendanceRecord {
  const date = new Date(dateStr + "T00:00:00");
  const [inHour, inMin] = clockInStr.split(":").map(Number);
  const [outHour, outMin] = clockOutStr.split(":").map(Number);

  const clockIn = new Date(date);
  clockIn.setHours(inHour, inMin, 0, 0);

  const clockOut = new Date(date);
  clockOut.setHours(outHour, outMin, 0, 0);

  const rawMinutes = (clockOut.getTime() - clockIn.getTime()) / 1000 / 60;
  const workMinutes = Math.max(0, rawMinutes - breakMinutes);

  let breakStart: string | null = null;
  let breakEnd: string | null = null;

  if (breakMinutes > 0) {
    const bs = new Date(date);
    bs.setHours(12, 0, 0, 0);
    breakStart = formatTime(bs);
    const be = new Date(date);
    be.setHours(12, breakMinutes, 0, 0);
    breakEnd = formatTime(be);
  }

  return {
    id: crypto.randomUUID(),
    staffId,
    staffName,
    workDate: dateStr,
    clockIn: formatTime(clockIn),
    clockOut: formatTime(clockOut),
    breakStart,
    breakEnd,
    totalBreakMinutes: breakMinutes,
    status: "finished",
    workMinutes,
    overtimeMinutes: workMinutes > 8 * 60 ? Math.floor(workMinutes - 8 * 60) : 0,
    nightMinutes: 0,
  };
}

export function generateSeedAttendanceRecords(staffList: Staff[]): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];

  const wajima = staffList.find((s) => s.name === "和島 亜純");
  const onobayashi = staffList.find((s) => s.name === "小野林 茜");
  const higuchi = staffList.find((s) => s.name === "樋口 凛");
  const sugimoto = staffList.find((s) => s.name === "杉本 羅希");

  if (wajima) {
    const data: [string, string, string, number][] = [
      ["2026-01-02", "08:30", "16:00", 30],
      ["2026-04-02", "08:30", "14:30", 30],
      ["2026-04-04", "08:30", "16:00", 45],
      ["2026-04-05", "11:30", "18:00", 30],
      ["2026-04-06", "08:30", "14:30", 30],
      ["2026-04-07", "08:30", "14:00", 30],
      ["2026-04-09", "09:00", "18:00", 45],
      ["2026-04-10", "11:30", "18:00", 30],
      ["2026-04-11", "12:00", "18:30", 30],
      ["2026-04-13", "09:00", "18:00", 45],
      ["2026-04-14", "08:30", "14:00", 30],
      ["2026-04-15", "08:30", "16:00", 45],
      ["2026-04-18", "09:00", "18:15", 45],
      ["2026-04-19", "12:00", "18:00", 30],
      ["2026-04-20", "09:00", "18:15", 45],
      ["2026-04-21", "11:00", "18:00", 45],
      ["2026-04-22", "08:30", "14:00", 30],
      ["2026-04-24", "09:00", "18:00", 45],
      ["2026-04-25", "08:30", "17:15", 45],
      ["2026-04-28", "08:30", "14:30", 30],
      ["2026-04-29", "08:30", "16:15", 45],
      ["2026-04-30", "12:00", "18:15", 30],
    ];
    records.push(...data.map(([date, cin, cout, brk]) => createSpecificRecord(wajima.id, wajima.name, date, cin, cout, brk)));
  }

  if (onobayashi) {
    const data: [string, string, string, number][] = [
      ["2026-04-01", "08:30", "14:00", 30],
      ["2026-04-02", "09:00", "18:00", 45],
      ["2026-04-03", "12:00", "18:00", 30],
      ["2026-04-05", "08:30", "16:00", 45],
      ["2026-04-07", "12:00", "18:00", 30],
      ["2026-04-08", "11:30", "20:15", 30],
      ["2026-04-11", "09:00", "18:30", 45],
      ["2026-04-12", "08:30", "16:15", 45],
      ["2026-04-13", "08:30", "18:00", 45],
      ["2026-04-14", "12:00", "18:00", 30],
      ["2026-04-15", "11:00", "18:00", 45],
      ["2026-04-16", "08:30", "18:15", 45],
      ["2026-04-17", "09:00", "18:00", 45],
      ["2026-04-22", "12:00", "18:00", 30],
      ["2026-04-23", "09:00", "18:00", 45],
      ["2026-04-24", "08:30", "18:00", 45],
      ["2026-04-25", "10:00", "18:00", 45],
      ["2026-04-27", "09:00", "18:00", 45],
      ["2026-04-28", "12:00", "18:00", 30],
    ];
    records.push(...data.map(([date, cin, cout, brk]) => createSpecificRecord(onobayashi.id, onobayashi.name, date, cin, cout, brk)));
  }

  if (higuchi) {
    const data: [string, string, string, number][] = [
      ["2026-04-02", "12:00", "18:00", 30],
      ["2026-04-03", "08:30", "14:00", 30],
      ["2026-04-10", "08:30", "12:00", 0],
      ["2026-04-11", "08:30", "15:00", 30],
      ["2026-04-18", "08:30", "16:00", 45],
      ["2026-04-19", "14:00", "18:00", 0],
      ["2026-04-26", "08:30", "16:00", 45],
      ["2026-04-29", "12:00", "18:00", 30],
    ];
    records.push(...data.map(([date, cin, cout, brk]) => createSpecificRecord(higuchi.id, higuchi.name, date, cin, cout, brk)));
  }

  if (sugimoto) {
    const data: [string, string, string, number][] = [
      ["2026-04-01", "12:00", "18:00", 30],
      ["2026-04-04", "12:00", "18:00", 30],
      ["2026-04-06", "12:00", "18:00", 30],
      ["2026-04-08", "08:30", "12:00", 0],
      ["2026-04-12", "12:00", "18:00", 30],
      ["2026-04-18", "12:00", "18:15", 30],
      ["2026-04-19", "08:30", "14:00", 30],
      ["2026-04-21", "08:30", "11:00", 0],
      ["2026-04-26", "11:00", "18:00", 30],
      ["2026-04-30", "08:30", "15:15", 30],
    ];
    records.push(...data.map(([date, cin, cout, brk]) => createSpecificRecord(sugimoto.id, sugimoto.name, date, cin, cout, brk)));
  }

  return records;
}

export function generateSeedCorrectionHistories(): CorrectionHistory[] {
  return [];
}

export function generateSeedMonthlySummary(staffList: Staff[], records: AttendanceRecord[]): AttendanceSummary[] {
  const summaries: AttendanceSummary[] = [];
  const months = [...new Set(records.map((r) => r.workDate.slice(0, 7)))].sort();

  for (const month of months) {
    for (const staff of staffList) {
      const staffRecords = records.filter((r) => r.staffId === staff.id && r.workDate.startsWith(month));
      if (staffRecords.length === 0) continue;

      const workDays = staffRecords.length;
      const workMinutes = staffRecords.reduce((sum, r) => sum + r.workMinutes, 0);
      const breakMinutes = staffRecords.reduce((sum, r) => sum + r.totalBreakMinutes, 0);
      const overtimeMinutes = staffRecords.reduce((sum, r) => sum + r.overtimeMinutes, 0);
      const nightMinutes = staffRecords.reduce((sum, r) => sum + r.nightMinutes, 0);

      const basePay = Math.floor((workMinutes / 60) * staff.hourlyWage);
      const overtimePay = Math.floor((overtimeMinutes / 60) * staff.hourlyWage * 1.25);
      const nightPay = Math.floor((nightMinutes / 60) * staff.hourlyWage * 1.35);
      const transportationAllowance = workDays * staff.transportationAllowance;
      const allowancePay = 0;
      const totalPay = basePay + overtimePay + nightPay + allowancePay + transportationAllowance;

      summaries.push({
        staffId: staff.id,
        staffName: staff.name,
        month,
        workDays,
        workMinutes,
        breakMinutes,
        overtimeMinutes,
        nightMinutes,
        allowanceMinutes: 0,
        basePay,
        overtimePay,
        nightPay,
        allowancePay,
        transportationAllowance,
        totalPay,
      });
    }
  }

  return summaries;
}

export function generateSeedData() {
  const staff = generateSeedStaff();
  const records = generateSeedAttendanceRecords(staff);
  const histories = generateSeedCorrectionHistories();
  const summaries = generateSeedMonthlySummary(staff, records);

  const wajima = staff.find((s) => s.name === "和島 亜純");

  const allowances = wajima ? [
    {
      id: crypto.randomUUID(),
      name: "正月手当",
      startDate: "2026-01-02",
      endDate: "2026-01-03",
      staffId: wajima.id,
      staffName: wajima.name,
      hourlyAddition: 500,
    },
  ] : [];

  return { staff, records, histories, summaries, allowances };
}
