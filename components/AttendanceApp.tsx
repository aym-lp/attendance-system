"use client";

import { useEffect, useMemo, useState } from "react";
import type { Allowance, AttendanceRecord, CorrectionField, CorrectionHistory, Staff } from "@/lib/types";
import { buildMonthlySummary, createEmptyRecord, getTodayKey, recordsToCsv } from "@/lib/time";
import { isSupabaseConfigured } from "@/lib/supabase";
import { generateSeedData } from "@/lib/seedData";
import { AdminPanel } from "@/components/AdminPanel";
import { AttendanceCard } from "@/components/AttendanceCard";
import { LoginPanel } from "@/components/LoginPanel";

const seedData = generateSeedData();
const seedMonths = Array.from(new Set(seedData.records.map((record) => record.workDate.slice(0, 7)))).sort().reverse();

export function AttendanceApp() {
  const [pin, setPin] = useState("");
  const [currentStaff, setCurrentStaff] = useState<Staff | null>(null);
  const [staffList, setStaffList] = useState(seedData.staff);
  const [records, setRecords] = useState<AttendanceRecord[]>(seedData.records);
  const [correctionHistories, setCorrectionHistories] = useState<CorrectionHistory[]>(seedData.histories);
  const [allowances, setAllowances] = useState<Allowance[]>(seedData.allowances ?? []);
  const [message, setMessage] = useState("PINを入力してください");
  const [selectedMonth, setSelectedMonth] = useState(() => seedMonths[0] ?? getTodayKey().slice(0, 7));

  const availableMonths = useMemo(() => {
    const months = new Set(records.map((record) => record.workDate.slice(0, 7)));
    return Array.from(months).sort().reverse();
  }, [records]);

  useEffect(() => {
    if (availableMonths.length === 0) return;
    if (!availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth]);

  const currentRecord = useMemo(() => {
    if (!currentStaff) return null;
    return records.find((record) => record.staffId === currentStaff.id && record.workDate === getTodayKey()) ?? null;
  }, [currentStaff, records]);

  const displayRecords = useMemo(() => {
    if (!currentStaff) return records;
    if (currentStaff.role === "manager" || currentStaff.role === "admin") return records;
    return records.filter((record) => record.staffId === currentStaff.id);
  }, [records, currentStaff]);

  const monthlySummary = useMemo(() => buildMonthlySummary(displayRecords, selectedMonth, staffList), [displayRecords, selectedMonth, staffList]);

  const login = (pinValue = pin) => {
    const normalizedPin = pinValue.trim();
    const staff = staffList.find((item) => item.pin === normalizedPin && item.isActive);

    if (!staff) {
      setMessage(`PIN「${normalizedPin || "未入力"}」は登録されていません`);
      return;
    }

    setCurrentStaff(staff);
    setPin("");
    setMessage("");
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
    const csv = `\uFEFF${recordsToCsv(filteredRecords, staffList, allowances)}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const staffName = staffId === "all" ? "全スタッフ" : (staffList.find((s) => s.id === staffId)?.name ?? staffId);
    link.download = `${staffName}-${month}.csv`;
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
          .filter((field) => values[field] !== null && values[field] !== undefined && values[field] !== "")
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
    <main className="min-h-screen bg-[#faf8f5] text-[#3e2723]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        {!currentStaff ? (
          <LoginPanel pin={pin} message={message} onPinChange={setPin} onLogin={login} />
        ) : (
          <section className="flex flex-col gap-5">
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
              currentStaff={currentStaff}
              staffList={staffList}
              records={displayRecords}
              correctionHistories={correctionHistories}
              selectedMonth={selectedMonth}
              monthlySummary={monthlySummary}
              allowances={allowances}
              onMonthChange={setSelectedMonth}
              onExportCsv={exportCsv}
              onAddStaff={addStaff}
              onUpdateStaff={updateStaff}
              onUpdateRecord={updateAttendanceRecord}
              onCreateRecord={createAttendanceRecord}
              onAddAllowance={(a) => { setAllowances((prev) => [...prev, { ...a, id: crypto.randomUUID() }]); setMessage(`手当「${a.name}」を登録しました`); }}
              onDeleteAllowance={(id) => { setAllowances((prev) => prev.filter((x) => x.id !== id)); setMessage("手当を削除しました"); }}
            />
          </section>
        )}
      </div>
    </main>
  );
}
