"use client";

import { useMemo, useState } from "react";
import type { AttendanceRecord, CorrectionField, CorrectionHistory, Staff } from "@/lib/types";
import { buildMonthlySummary, createEmptyRecord, getTodayKey, recordsToCsv } from "@/lib/time";
import { isSupabaseConfigured } from "@/lib/supabase";
import { generateSeedData } from "@/lib/seedData";
import { AdminPanel } from "@/components/AdminPanel";
import { AttendanceCard } from "@/components/AttendanceCard";
import { LoginPanel } from "@/components/LoginPanel";

const seedData = generateSeedData();

export function AttendanceApp() {
  const [pin, setPin] = useState("");
  const [currentStaff, setCurrentStaff] = useState<Staff | null>(null);
  const [staffList, setStaffList] = useState(seedData.staff);
  const [records, setRecords] = useState<AttendanceRecord[]>(seedData.records);
  const [correctionHistories, setCorrectionHistories] = useState<CorrectionHistory[]>(seedData.histories);
  const [message, setMessage] = useState("PINを入力してください");
  const [selectedMonth, setSelectedMonth] = useState(getTodayKey().slice(0, 7));

  const currentRecord = useMemo(() => {
    if (!currentStaff) return null;
    return records.find((record) => record.staffId === currentStaff.id && record.workDate === getTodayKey()) ?? null;
  }, [currentStaff, records]);

  const monthlySummary = useMemo(() => buildMonthlySummary(records, selectedMonth, staffList), [records, selectedMonth, staffList]);

  const login = (pinValue = pin) => {
    const normalizedPin = pinValue.trim();
    const staff = staffList.find((item) => item.pin === normalizedPin && item.isActive);

    if (!staff) {
      setMessage(`PIN「${normalizedPin || "未入力"}」は登録されていません`);
      return;
    }

    setCurrentStaff(staff);
    setPin("");
    setMessage(`${staff.name}さん、ようこそ`);
  };

  const logout = () => {
    setCurrentStaff(null);
    setMessage("ログアウトしました");
  };

  const updateTodayRecord = (updater: (record: AttendanceRecord) => AttendanceRecord) => {
    if (!currentStaff) return;

    setRecords((prev) => {
      const today = getTodayKey();
      const existing = prev.find((record) => record.staffId === currentStaff.id && record.workDate === today);
      const baseRecord = existing ?? createEmptyRecord(currentStaff);
      const updated = updater(baseRecord);

      if (existing) {
        return prev.map((record) => (record.id === existing.id ? updated : record));
      }

      return [updated, ...prev];
    });
  };

  const clockIn = () => {
    updateTodayRecord((record) => ({ ...record, clockIn: record.clockIn ?? new Date().toISOString(), status: "working" }));
    setMessage("出勤しました");
  };

  const startBreak = () => {
    updateTodayRecord((record) => ({ ...record, breakStart: new Date().toISOString(), breakEnd: null, status: "break" }));
    setMessage("休憩を開始しました");
  };

  const endBreak = () => {
    updateTodayRecord((record) => {
      const breakMinutes = record.breakStart ? Math.max(0, (Date.now() - new Date(record.breakStart).getTime()) / 60000) : 0;
      return {
        ...record,
        breakEnd: new Date().toISOString(),
        totalBreakMinutes: record.totalBreakMinutes + breakMinutes,
        status: "working",
      };
    });
    setMessage("休憩を終了しました");
  };

  const clockOut = () => {
    updateTodayRecord((record) => ({ ...record, clockOut: new Date().toISOString(), status: "finished" }));
    setMessage("退勤しました。お疲れさまでした");
  };

  const exportCsv = (staffId: string, month: string) => {
    const filteredRecords = staffId === "all" ? records.filter((r) => r.workDate.startsWith(month)) : records.filter((r) => r.staffId === staffId && r.workDate.startsWith(month));
    const csv = `\uFEFF${recordsToCsv(filteredRecords)}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance-${staffId === "all" ? "all" : staffId}-${month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const addStaff = (staff: Omit<Staff, "id" | "isActive">) => {
    const nextNumber = staffList.length + 1;
    const newStaff: Staff = {
      ...staff,
      id: `STF-${nextNumber.toString().padStart(3, "0")}`,
      isActive: true,
    };

    setStaffList((prev) => [...prev, newStaff]);
    setMessage(`${newStaff.name}さんを登録しました`);
  };

  const updateStaff = (id: string, staff: Partial<Omit<Staff, "id" | "isActive">>) => {
    setStaffList((prev) => prev.map((item) => (item.id === id ? { ...item, ...staff } : item)));
    setMessage("スタッフ情報を更新しました");
  };

  const updateAttendanceRecord = (recordId: string, values: Pick<AttendanceRecord, CorrectionField>) => {
    if (!currentStaff) return;

    setRecords((prev) =>
      prev.map((record) => {
        if (record.id !== recordId) return record;

        const fields: CorrectionField[] = ["clockIn", "clockOut", "breakStart", "breakEnd"];
        const histories: CorrectionHistory[] = fields
          .filter((field) => record[field] !== values[field])
          .map((field) => ({
            id: crypto.randomUUID(),
            recordId: record.id,
            staffId: record.staffId,
            staffName: record.staffName,
            workDate: record.workDate,
            field,
            beforeValue: record[field],
            afterValue: values[field],
            correctedBy: currentStaff.name,
            correctedAt: new Date().toISOString(),
            reason: "",
          }));

        if (histories.length > 0) {
          setCorrectionHistories((current) => [...histories, ...current]);
        }

        const totalBreakMinutes =
          values.breakStart && values.breakEnd
            ? Math.max(0, (new Date(values.breakEnd).getTime() - new Date(values.breakStart).getTime()) / 60000)
            : record.totalBreakMinutes;

        return {
          ...record,
          ...values,
          totalBreakMinutes,
          status: values.clockOut ? "finished" : record.status,
        };
      }),
    );
    setMessage("打刻を修正しました");
  };

  const createAttendanceRecord = (record: Omit<AttendanceRecord, "workMinutes" | "overtimeMinutes" | "nightMinutes">) => {
    const newRecord: AttendanceRecord = {
      ...record,
      workMinutes: 0,
      overtimeMinutes: 0,
      nightMinutes: 0,
    };
    setRecords((prev) => [newRecord, ...prev]);
    setMessage("勤務履歴を作成しました");
  };

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <header className="rounded-3xl bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-600">店舗アルバイト勤怠管理</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">小川勤怠</h1>
              <p className="mt-2 text-sm text-slate-500">iPad・スマホで使いやすいPIN打刻システム</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              <p className="font-semibold">Supabase</p>
              <p className={isSupabaseConfigured ? "text-emerald-600" : "text-amber-600"}>
                {isSupabaseConfigured ? "接続設定済み" : "未設定：ローカル表示モード"}
              </p>
            </div>
          </div>
        </header>

        {!currentStaff ? (
          <LoginPanel pin={pin} message={message} onPinChange={setPin} onLogin={login} />
        ) : (
          <section className="flex flex-col gap-5">
            <div className="rounded-3xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
              ログイン成功：{currentStaff.name}
            </div>
            <AttendanceCard
              staff={currentStaff}
              record={currentRecord}
              message={message}
              onLogout={logout}
              onClockIn={clockIn}
              onClockOut={clockOut}
              onStartBreak={startBreak}
              onEndBreak={endBreak}
            />
            <AdminPanel
              isAdmin={currentStaff.role === "admin" || currentStaff.role === "manager"}
              staffList={staffList}
              records={records}
              correctionHistories={correctionHistories}
              selectedMonth={selectedMonth}
              monthlySummary={monthlySummary}
              onMonthChange={setSelectedMonth}
              onExportCsv={exportCsv}
              onAddStaff={addStaff}
              onUpdateStaff={updateStaff}
              onUpdateRecord={updateAttendanceRecord}
              onCreateRecord={createAttendanceRecord}
            />
          </section>
        )}
      </div>
    </main>
  );
}
