"use client";

import { useMemo, useState } from "react";
import type { AttendanceRecord, Staff } from "@/lib/types";
import { formatDateTime, formatMinutes, formatCurrency, getOvertimeMinutes, getWorkedMinutes, roundUpBreakMinutes } from "@/lib/time";

type HistoryTableProps = {
  records: AttendanceRecord[];
  staffList?: Staff[];
};

export function HistoryTable({ records, staffList = [] }: HistoryTableProps) {
  const now = useMemo(() => new Date(), []);
  const [filterStaffId, setFilterStaffId] = useState("all");
  const [filterMonth, setFilterMonth] = useState("");

  const sortedAndFilteredRecords = useMemo(() => {
    let filtered = [...records];

    if (filterStaffId !== "all") {
      filtered = filtered.filter((r) => r.staffId === filterStaffId);
    }

    if (filterMonth) {
      filtered = filtered.filter((r) => r.workDate.startsWith(filterMonth));
    }

    return filtered.sort((a, b) => new Date(b.workDate).getTime() - new Date(a.workDate).getTime());
  }, [records, filterStaffId, filterMonth]);

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

  const uniqueMonths = useMemo(() => {
    const months = new Set(records.map((r) => r.workDate.slice(0, 7)));
    return Array.from(months).sort().reverse();
  }, [records]);

  return (
    <div className="mt-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <select
          value={filterStaffId}
          onChange={(e) => setFilterStaffId(e.target.value)}
          className="h-12 rounded-2xl border border-[#d7ccc8] bg-white px-4 text-sm text-[#3e2723] outline-none focus:border-[#6d4c41]"
        >
          <option value="all">全スタッフ</option>
          {staffList.map((staff) => (
            <option key={staff.id} value={staff.id}>{staff.name}</option>
          ))}
        </select>
        <select
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="h-12 rounded-2xl border border-[#d7ccc8] bg-white px-4 text-sm text-[#3e2723] outline-none focus:border-[#6d4c41]"
        >
          <option value="">全期間</option>
          {uniqueMonths.map((month) => (
            <option key={month} value={month}>{month}</option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto">
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
            {sortedAndFilteredRecords.map((record) => {
              const pay = getDailyPay(record);
              return (
                <tr key={record.id} className="border-t border-[#d7ccc8]">
                  <td className="px-4 py-3">{record.workDate}</td>
                  <td className="px-4 py-3 font-semibold">{record.staffName}</td>
                  <td className="px-4 py-3">{formatDateTime(record.clockIn)}</td>
                  <td className="px-4 py-3">{formatDateTime(record.clockOut)}</td>
                  <td className="px-4 py-3">
                    {pay.breakError ? (
                      <span className="font-bold text-red-600">{pay.breakRounded}分（エラー）</span>
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
            {sortedAndFilteredRecords.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-[#8d6e63]">該当する勤務履歴はありません。</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
