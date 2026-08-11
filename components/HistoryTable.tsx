"use client";

import { useMemo, useState } from "react";
import type { AttendanceRecord, Staff } from "@/lib/types";
import { formatDateTime, formatMinutes, formatCurrency, calculateRecordPayroll, formatBreakMinutes, formatWorkDateParts, getEffectiveBreakMinutes } from "@/lib/time";
import type { Allowance } from "@/lib/types";

type HistoryTableProps = {
  records: AttendanceRecord[];
  staffList?: Staff[];
  isAdmin?: boolean;
  allowances?: Allowance[];
};

export function HistoryTable({ records, staffList = [], isAdmin = true, allowances = [] }: HistoryTableProps) {
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

  function getDailyPay(record: AttendanceRecord): { regularPay: number; overtimePay: number; totalPay: number; breakMinutes: number; netWorkMinutes: number; overtimeMinutes: number; allowanceLabels: string[]; allowancePay: number } {
    const staff = staffList.find((s) => s.id === record.staffId);
    const payroll = calculateRecordPayroll(record, staff, allowances, now);
    const breakMinutes = getEffectiveBreakMinutes(record);
    const regularPay = payroll.basePay;
    const overtimePay = payroll.overtimePay;
    return {
      regularPay,
      overtimePay,
      totalPay: payroll.totalPay,
      breakMinutes,
      netWorkMinutes: payroll.workMinutes,
      overtimeMinutes: payroll.overtimeMinutes,
      allowanceLabels: payroll.allowanceLabels,
      allowancePay: payroll.allowancePay,
    };
  }

  const uniqueMonths = useMemo(() => {
    const months = new Set(records.map((r) => r.workDate.slice(0, 7)));
    return Array.from(months).sort().reverse();
  }, [records]);

  return (
    <div className="mt-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        {isAdmin && (
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
        )}
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
        <table className={`w-full table-auto text-left text-sm ${isAdmin ? "min-w-[1180px]" : "min-w-[620px]"}`}>
          <thead className="bg-[#d7ccc8] text-[#3e2723]">
            <tr>
              <th className="min-w-[72px] px-4 py-3 whitespace-nowrap">日付</th>
              <th className="px-4 py-3 whitespace-nowrap">スタッフ</th>
              <th className="px-4 py-3 whitespace-nowrap">出勤</th>
              <th className="px-4 py-3 whitespace-nowrap">退勤</th>
              <th className="min-w-[96px] px-4 py-3 whitespace-nowrap">休憩開始</th>
              <th className="min-w-[96px] px-4 py-3 whitespace-nowrap">休憩終了</th>
              <th className="min-w-[88px] px-4 py-3 whitespace-nowrap">休憩時間</th>
              {isAdmin && (
                <>
                  <th className="px-4 py-3 whitespace-nowrap">実働時間</th>
                  <th className="px-4 py-3 whitespace-nowrap">残業時間</th>
                  <th className="px-4 py-3 whitespace-nowrap">通常給与</th>
                  <th className="px-4 py-3 whitespace-nowrap">残業給与</th>
                  <th className="px-4 py-3 whitespace-nowrap">日給合計</th>
                  <th className="min-w-[96px] px-4 py-3 whitespace-nowrap">手当</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedAndFilteredRecords.map((record) => {
              const pay = getDailyPay(record);
              const dateParts = formatWorkDateParts(record.workDate);
              return (
                <tr key={record.id} className="border-t border-[#d7ccc8]">
                  <td className="px-4 py-3 leading-tight whitespace-nowrap">
                    <span className="block">{dateParts.year}</span>
                    <span className="block">{dateParts.monthDay}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold whitespace-nowrap">{record.staffName}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(record.clockIn)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(record.clockOut)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(record.breakStart)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(record.breakEnd)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatBreakMinutes(pay.breakMinutes)}
                  </td>
                  {isAdmin && (
                    <>
                      <td className="px-4 py-3">{formatMinutes(pay.netWorkMinutes)}</td>
                      <td className="px-4 py-3">{formatMinutes(pay.overtimeMinutes)}</td>
                      <td className="px-4 py-3">{formatCurrency(pay.regularPay)}</td>
                      <td className="px-4 py-3">{formatCurrency(pay.overtimePay)}</td>
                      <td className="px-4 py-3 font-bold">{formatCurrency(pay.totalPay)}</td>
                      <td className="px-4 py-3">
                        {pay.allowanceLabels.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {pay.allowanceLabels.map((label, i) => (
                              <span key={i} className="text-xs font-semibold text-[#6d4c41]">{label}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
            {sortedAndFilteredRecords.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 13 : 7} className="px-4 py-8 text-center text-[#8d6e63]">該当する勤務履歴はありません。</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
