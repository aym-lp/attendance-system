"use client";

import { useMemo } from "react";
import type { AttendanceRecord, Staff } from "@/lib/types";
import { formatDateTime, formatMinutes, formatCurrency, getOvertimeMinutes, getWorkedMinutes, roundUpBreakMinutes } from "@/lib/time";

type HistoryTableProps = {
  records: AttendanceRecord[];
  staffList?: Staff[];
};

export function HistoryTable({ records, staffList = [] }: HistoryTableProps) {
  const now = useMemo(() => new Date(), []);

  function getDailyPay(record: AttendanceRecord): { regularPay: number; overtimePay: number; totalPay: number; breakRounded: number; breakError: boolean; netWorkMinutes: number; overtimeMinutes: number } {
    const staff = staffList.find((s) => s.id === record.staffId);
    const hourlyWage = staff?.hourlyWage ?? 0;
    const clockOutTime = record.clockOut ? new Date(record.clockOut) : now;
    const grossWorkMinutes = getWorkedMinutes(record, clockOutTime);
    const { rounded: breakRounded, error: breakError } = roundUpBreakMinutes(record.totalBreakMinutes);
    const netWorkMinutes = Math.max(0, grossWorkMinutes);
    const overtimeMinutes = getOvertimeMinutes(record, clockOutTime);
    const regularMinutes = Math.max(0, netWorkMinutes - overtimeMinutes);
    const regularPay = (regularMinutes / 60) * hourlyWage;
    const overtimePay = (overtimeMinutes / 60) * hourlyWage * 1.25;
    return { regularPay, overtimePay, totalPay: regularPay + overtimePay, breakRounded, breakError, netWorkMinutes, overtimeMinutes };
  }

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[960px] text-left text-sm">
        <thead className="bg-[#d7ccc8] text-[#3e2723]">
          <tr>
            <th className="px-4 py-3">日付</th>
            <th className="px-4 py-3">スタッフ</th>
            <th className="px-4 py-3">出勤</th>
            <th className="px-4 py-3">退勤</th>
            <th className="px-4 py-3">休憩時間</th>
            <th className="px-4 py-3">実働時間</th>
            <th className="px-4 py-3">残業時間</th>
            <th className="px-4 py-3">通常給与</th>
            <th className="px-4 py-3">残業給与</th>
            <th className="px-4 py-3">日給合計</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => {
            const pay = getDailyPay(record);
            return (
              <tr key={record.id} className="border-t border-[#d7ccc8]">
                <td className="px-4 py-3">{record.workDate}</td>
                <td className="px-4 py-3 font-semibold">{record.staffName}</td>
                <td className="px-4 py-3">{formatDateTime(record.clockIn)}</td>
                <td className="px-4 py-3">{formatDateTime(record.clockOut)}</td>
                <td className="px-4 py-3">
                  {pay.breakError ? (
                    <span className="text-red-600 font-bold">{pay.breakRounded}分（エラー）</span>
                  ) : (
                    formatMinutes(pay.breakRounded)
                  )}
                </td>
                <td className="px-4 py-3">{formatMinutes(pay.netWorkMinutes)}</td>
                <td className="px-4 py-3">{formatMinutes(pay.overtimeMinutes)}</td>
                <td className="px-4 py-3">{formatCurrency(pay.regularPay)}</td>
                <td className="px-4 py-3">{formatCurrency(pay.overtimePay)}</td>
                <td className="px-4 py-3 font-bold">{formatCurrency(pay.totalPay)}</td>
              </tr>
            );
          })}
          {records.length === 0 && (
            <tr>
              <td colSpan={10} className="px-4 py-8 text-center text-[#8d6e63]">勤務履歴はまだありません。</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
