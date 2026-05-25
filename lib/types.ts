export type StaffRole = "staff" | "manager" | "admin";

export type AttendanceStatus = "off" | "working" | "break" | "finished";

export type Staff = {
  id: string;
  name: string;
  kana: string;
  pin: string;
  role: StaffRole;
  hourlyWage: number;
  transportationAllowance: number;
  memo: string;
  isActive: boolean;
};

export type AttendanceRecord = {
  id: string;
  staffId: string;
  staffName: string;
  workDate: string;
  clockIn: string | null;
  clockOut: string | null;
  breakStart: string | null;
  breakEnd: string | null;
  totalBreakMinutes: number;
  status: AttendanceStatus;
  workMinutes: number;
  overtimeMinutes: number;
  nightMinutes: number;
};

export type AttendanceSummary = {
  staffId: string;
  staffName: string;
  month: string;
  workDays: number;
  workMinutes: number;
  breakMinutes: number;
  overtimeMinutes: number;
  nightMinutes: number;
  basePay: number;
  overtimePay: number;
  nightPay: number;
  transportationAllowance: number;
  totalPay: number;
};

export type CorrectionField = "clockIn" | "clockOut" | "breakStart" | "breakEnd";

export type CorrectionHistory = {
  id: string;
  recordId: string;
  staffId: string;
  staffName: string;
  workDate: string;
  field: CorrectionField;
  beforeValue: string | null;
  afterValue: string | null;
  correctedBy: string;
  correctedAt: string;
  reason: string;
};

export type Allowance = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  staffId: string;
  staffName: string;
  hourlyAddition: number;
};
