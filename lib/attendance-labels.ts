import type { AttendanceRecord } from "@/lib/types";

export const statusLabel: Record<AttendanceRecord["status"], string> = {
  off: "未出勤",
  working: "勤務中",
  break: "休憩中",
  finished: "退勤済み",
};
