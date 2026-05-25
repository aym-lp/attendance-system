"use client";

import { useState } from "react";
import type { Allowance, Staff } from "@/lib/types";

type AllowancePanelProps = {
  allowances: Allowance[];
  staffList: Staff[];
  onAddAllowance: (allowance: Omit<Allowance, "id">) => void;
  onDeleteAllowance: (id: string) => void;
};

export function AllowancePanel({ allowances, staffList, onAddAllowance, onDeleteAllowance }: AllowancePanelProps) {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [staffId, setStaffId] = useState("");
  const [hourlyAddition, setHourlyAddition] = useState("");
  const [error, setError] = useState("");

  const activeStaff = staffList.filter((s) => s.isActive);

  const save = () => {
    if (!name.trim() || !startDate || !endDate || !staffId || !hourlyAddition) {
      setError("全項目を入力してください");
      return;
    }
    if (Number(hourlyAddition) <= 0) {
      setError("加算金額は1円以上を入力してください");
      return;
    }
    if (startDate > endDate) {
      setError("開始日は終了日より前にしてください");
      return;
    }
    const staff = staffList.find((s) => s.id === staffId);
    onAddAllowance({
      name: name.trim(),
      startDate,
      endDate,
      staffId,
      staffName: staff?.name ?? "",
      hourlyAddition: Number(hourlyAddition),
    });
    setName("");
    setStartDate("");
    setEndDate("");
    setStaffId("");
    setHourlyAddition("");
    setError("");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#d7ccc8] bg-white p-5">
        <h3 className="text-lg font-bold text-[#3e2723]">特別手当を登録</h3>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-semibold text-[#3e2723]">
            手当名
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：正月手当"
              className="h-12 rounded-2xl border border-[#d7ccc8] bg-white px-4 text-sm outline-none focus:border-[#6d4c41]"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-[#3e2723]">
            対象スタッフ
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="h-12 rounded-2xl border border-[#d7ccc8] bg-white px-4 text-sm outline-none focus:border-[#6d4c41]"
            >
              <option value="">選択してください</option>
              {activeStaff.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-[#3e2723]">
            開始日
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-12 rounded-2xl border border-[#d7ccc8] bg-white px-4 text-sm outline-none focus:border-[#6d4c41]"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-[#3e2723]">
            終了日
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-12 rounded-2xl border border-[#d7ccc8] bg-white px-4 text-sm outline-none focus:border-[#6d4c41]"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-[#3e2723]">
            時給加算額（円）
            <input
              type="number"
              value={hourlyAddition}
              onChange={(e) => setHourlyAddition(e.target.value)}
              placeholder="例：500"
              min={1}
              className="h-12 rounded-2xl border border-[#d7ccc8] bg-white px-4 text-sm outline-none focus:border-[#6d4c41]"
            />
          </label>
        </div>
        <button
          onClick={save}
          className="mt-4 h-12 rounded-2xl bg-[#6d4c41] px-6 font-bold text-white"
        >
          登録
        </button>
      </div>

      <div className="rounded-2xl border border-[#d7ccc8] bg-white p-5">
        <h3 className="text-lg font-bold text-[#3e2723]">登録済み手当一覧</h3>
        {allowances.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">特別手当はまだ登録されていません。</p>
        ) : (
          <div className="mt-4 space-y-2">
            {allowances.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-xl border border-[#d7ccc8] p-4">
                <div>
                  <p className="font-bold text-[#3e2723]">{a.name}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {a.staffName} · {a.startDate} 〜 {a.endDate} · 時給+{a.hourlyAddition.toLocaleString()}円
                  </p>
                </div>
                <button
                  onClick={() => onDeleteAllowance(a.id)}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
