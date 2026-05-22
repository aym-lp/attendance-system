"use client";

import { useMemo } from "react";
import type { AttendanceRecord } from "@/lib/types";
import { statusLabel } from "@/lib/attendance-labels";
import { formatDateTime, formatMinutes, getOvertimeMinutes, getWorkedMinutes } from "@/lib/time";

type HistoryTableProps = {
  records: AttendanceRecord[];
};

export function HistoryTable({ records }: HistoryTableProps) {
  const now = useMemo(() => new Date(), []);

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-slate-50 text-slate-500">
          <tr>
            <th className="px-4 py-3">日付</th>
            <th className="px-4 py-3">スタッフ</th>
            <th className="px-4 py-3">出勤</th>
            <th className="px-4 py-3">退勤</th>
            <th className="px-4 py-3">勤務</th>
            <th className="px-4 py-3">残業</th>
            <th className="px-4 py-3">状態</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id} className="border-t border-slate-100">
              <td className="px-4 py-3">{record.workDate}</td>
              <td className="px-4 py-3 font-semibold">{record.staffName}</td>
              <td className="px-4 py-3">{formatDateTime(record.clockIn)}</td>
              <td className="px-4 py-3">{formatDateTime(record.clockOut)}</td>
              <td className="px-4 py-3">{formatMinutes(getWorkedMinutes(record, record.clockOut ? new Date(record.clockOut) : now))}</td>
              <td className="px-4 py-3">{formatMinutes(getOvertimeMinutes(record, record.clockOut ? new Date(record.clockOut) : now))}</td>
              <td className="px-4 py-3">{statusLabel[record.status]}</td>
            </tr>
          ))}
          {records.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-slate-500">勤務履歴はまだありません。</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
