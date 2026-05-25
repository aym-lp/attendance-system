"use client";

import type { AttendanceRecord, Staff } from "@/lib/types";
import { statusLabel } from "@/lib/attendance-labels";
import { formatDateTime } from "@/lib/time";

type AttendanceCardProps = {
  staff: Staff;
  record: AttendanceRecord | null;
  message: string;
  onLogout: () => void;
  onClockIn: () => void;
  onClockOut: () => void;
  onStartBreak: () => void;
  onEndBreak: () => void;
};

export function AttendanceCard({ staff, record, message, onLogout, onClockIn, onClockOut, onStartBreak, onEndBreak }: AttendanceCardProps) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr_1fr] xl:items-stretch">
        <div className="flex min-h-40 flex-col justify-between rounded-3xl border border-[#d7ccc8] p-5">
          <div>
            <p className="text-sm font-semibold text-[#8d6e63]">ログイン中</p>
            <h2 className="mt-1 text-3xl font-bold text-[#3e2723]">{staff.name}</h2>
            <p className="mt-2 text-sm text-[#8d6e63]">{staff.role === "admin" ? "管理者" : "スタッフ"}</p>
          </div>
          <button onClick={onLogout} className="mt-4 rounded-full border border-[#d7ccc8] px-4 py-2 text-sm font-semibold text-[#6d4c41]">ログアウト</button>
        </div>

        <div className="min-h-40 rounded-3xl bg-[#d7ccc8] p-5">
          <p className="text-sm font-semibold text-[#6d4c41]">本日の状態</p>
          <p className="mt-2 text-4xl font-bold text-[#3e2723]">{statusLabel[record?.status ?? "off"]}</p>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <Info label="出勤" value={formatDateTime(record?.clockIn ?? null)} />
            <Info label="退勤" value={formatDateTime(record?.clockOut ?? null)} />
            <Info label="休憩開始" value={formatDateTime(record?.breakStart ?? null)} />
            <Info label="休憩終了" value={formatDateTime(record?.breakEnd ?? null)} />
          </div>
        </div>

        <div className="grid min-h-40 grid-cols-2 gap-3">
          <ActionButton label="出勤" onClick={onClockIn} disabled={record?.status === "working" || record?.status === "break" || record?.status === "finished"} tone="green" />
          <ActionButton label="退勤" onClick={onClockOut} disabled={!record?.clockIn || record?.status === "finished"} tone="red" />
          <ActionButton label="休憩開始" onClick={onStartBreak} disabled={record?.status !== "working"} tone="orange" />
          <ActionButton label="休憩終了" onClick={onEndBreak} disabled={record?.status !== "break"} tone="blue" />
        </div>
      </div>
      <p className="mt-4 rounded-2xl bg-[#d7ccc8] px-4 py-3 text-sm font-medium text-[#3e2723]">{message}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

function ActionButton({ label, onClick, disabled, tone }: { label: string; onClick: () => void; disabled?: boolean; tone: "green" | "red" | "orange" | "blue" }) {
  const tones = {
    green: "bg-emerald-600 text-white",
    red: "bg-red-600 text-white",
    orange: "bg-orange-500 text-white",
    blue: "bg-blue-600 text-white",
  };

  return (
    <button onClick={onClick} disabled={disabled} className={`min-h-16 rounded-2xl px-4 text-lg font-bold shadow-sm active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 ${tones[tone]}`}>
      {label}
    </button>
  );
}
