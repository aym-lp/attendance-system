"use client";

import { useEffect, useMemo, useState } from "react";
import type { Allowance, AttendanceRecord, AttendanceSummary, CorrectionField, CorrectionHistory, Staff, StaffRole } from "@/lib/types";
import { formatCurrency, formatDateTime, formatMinutes, fromDateTimeInputValue, toDateTimeInputValue } from "@/lib/time";
import { HistoryTable } from "@/components/HistoryTable";
import { AllowancePanel } from "@/components/AllowancePanel";

const correctionFieldLabel: Record<CorrectionField, string> = {
  clockIn: "出勤時間",
  clockOut: "退勤時間",
  breakStart: "休憩開始時間",
  breakEnd: "休憩終了時間",
};

type AdminPanelProps = {
  isAdmin: boolean;
  staffList: Staff[];
  records: AttendanceRecord[];
  correctionHistories: CorrectionHistory[];
  selectedMonth: string;
  monthlySummary: AttendanceSummary[];
  allowances: Allowance[];
  onMonthChange: (value: string) => void;
  onExportCsv: (staffId: string, month: string) => void;
  onAddStaff: (staff: Omit<Staff, "id" | "isActive">) => void;
  onUpdateStaff: (id: string, staff: Partial<Omit<Staff, "id" | "isActive">>) => void;
  onUpdateRecord: (recordId: string, values: Pick<AttendanceRecord, CorrectionField>) => void;
  onCreateRecord: (record: Omit<AttendanceRecord, "workMinutes" | "overtimeMinutes" | "nightMinutes">) => void;
  onAddAllowance: (allowance: Omit<Allowance, "id">) => void;
  onDeleteAllowance: (id: string) => void;
};

function StaffDetailPanel({ staff, onUpdateStaff }: { staff: Staff; onUpdateStaff: AdminPanelProps["onUpdateStaff"] }) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(staff.name);
  const [kana, setKana] = useState(staff.kana);
  const [pin, setPin] = useState(staff.pin);
  const [role, setRole] = useState<StaffRole>(staff.role);
  const [hourlyWage, setHourlyWage] = useState(staff.hourlyWage.toString());
  const [transportationAllowance, setTransportationAllowance] = useState(staff.transportationAllowance.toString());
  const [memo, setMemo] = useState(staff.memo);
  const [error, setError] = useState("");

  // staffが更新されたらstateを同期
  useEffect(() => {
    setName(staff.name);
    setKana(staff.kana);
    setPin(staff.pin);
    setRole(staff.role);
    setHourlyWage(staff.hourlyWage.toString());
    setTransportationAllowance(staff.transportationAllowance.toString());
    setMemo(staff.memo);
  }, [staff]);

  const save = () => {
    if (!name.trim() || !kana.trim()) {
      setError("氏名とフリガナを入力してください");
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setError("PINコードは4桁数字で入力してください");
      return;
    }

    onUpdateStaff(staff.id, {
      name: name.trim(),
      kana: kana.trim(),
      pin,
      role,
      hourlyWage: Number(hourlyWage) || 0,
      transportationAllowance: Number(transportationAllowance) || 0,
      memo: memo.trim(),
    });
    setIsEditing(false);
    setError("");
  };

  const cancel = () => {
    setName(staff.name);
    setKana(staff.kana);
    setPin(staff.pin);
    setRole(staff.role);
    setHourlyWage(staff.hourlyWage.toString());
    setTransportationAllowance(staff.transportationAllowance.toString());
    setMemo(staff.memo);
    setIsEditing(false);
    setError("");
  };

  return (
    <div className="space-y-4">
      {isEditing ? (
        <div className="space-y-3">
          <Input label="氏名" value={name} onChange={setName} />
          <Input label="フリガナ" value={kana} onChange={setKana} />
          <Input label="PINコード（4桁）" value={pin} onChange={(value) => setPin(value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" />
          <label className="text-sm font-semibold">役職<select value={role} onChange={(event) => setRole(event.target.value as StaffRole)} className="mt-1 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-950"><option value="admin">管理者</option><option value="manager">店長</option><option value="staff">スタッフ</option></select></label>
          <Input label="時給" value={hourlyWage} onChange={setHourlyWage} inputMode="numeric" />
          <Input label="交通費" value={transportationAllowance} onChange={setTransportationAllowance} inputMode="numeric" />
          <label className="text-sm font-semibold">メモ欄<textarea value={memo} onChange={(event) => setMemo(event.target.value)} className="mt-1 min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950" /></label>
          {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
          <div className="flex gap-2">
            <button onClick={save} className="min-h-12 flex-1 rounded-2xl bg-[#6d4c41] px-6 font-bold text-white">保存</button>
            <button onClick={cancel} className="min-h-12 flex-1 rounded-2xl bg-slate-200 px-6 font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-300">キャンセル</button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
            <p className="text-sm text-slate-500">氏名</p>
            <p className="font-bold">{staff.name}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
            <p className="text-sm text-slate-500">役職</p>
            <p className="font-bold">{roleLabel(staff.role)}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
            <p className="text-sm text-slate-500">時給</p>
            <p className="font-bold">{formatCurrency(staff.hourlyWage)}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
            <p className="text-sm text-slate-500">交通費</p>
            <p className="font-bold">{formatCurrency(staff.transportationAllowance)}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
            <p className="text-sm text-slate-500">PINコード</p>
            <p className="font-bold">{staff.pin}</p>
          </div>
          {staff.memo && (
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
              <p className="text-sm text-slate-500">メモ</p>
              <p className="font-bold">{staff.memo}</p>
            </div>
          )}
          <button onClick={() => setIsEditing(true)} className="min-h-12 w-full rounded-2xl bg-amber-500 px-6 font-bold text-white">編集</button>
        </div>
      )}
    </div>
  );
}

export function AdminPanel({ isAdmin, staffList, records, correctionHistories, selectedMonth, monthlySummary, allowances, onMonthChange, onExportCsv, onAddStaff, onUpdateStaff, onUpdateRecord, onCreateRecord, onAddAllowance, onDeleteAllowance }: AdminPanelProps) {
  const [currentView, setCurrentView] = useState<"menu" | "staff" | "history" | "correction" | "correctionHistory" | "monthly" | "allowance">("menu");
  const [historyStaffId, setHistoryStaffId] = useState("all");
  const [historyMonth, setHistoryMonth] = useState(selectedMonth);
  const [showStaffRegistration, setShowStaffRegistration] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [selectedSummary, setSelectedSummary] = useState<AttendanceSummary | null>(null);

  const filteredHistories = useMemo(() => {
    return correctionHistories
      .filter((history) => historyStaffId === "all" || history.staffId === historyStaffId)
      .filter((history) => !historyMonth || history.workDate.startsWith(historyMonth))
      .sort((a, b) => new Date(b.correctedAt).getTime() - new Date(a.correctedAt).getTime());
  }, [correctionHistories, historyMonth, historyStaffId]);

  if (!isAdmin) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-sm dark:bg-slate-900 sm:p-8">
        <h2 className="text-2xl font-bold">勤務履歴</h2>
        <HistoryTable records={records} staffList={staffList} isAdmin={isAdmin} allowances={allowances} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {currentView === "menu" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {isAdmin && (
            <>
              <MenuButton label="スタッフ一覧" onClick={() => setCurrentView("staff")} />
              <MenuButton label="勤務履歴一覧" onClick={() => setCurrentView("history")} />
              <MenuButton label="打刻修正" onClick={() => setCurrentView("correction")} />
              <MenuButton label="修正履歴" onClick={() => setCurrentView("correctionHistory")} />
              <MenuButton label="月次集計" onClick={() => setCurrentView("monthly")} />
              <MenuButton label="特別手当設定" onClick={() => setCurrentView("allowance")} />
            </>
          )}
          {!isAdmin && (
            <MenuButton label="勤務履歴一覧" onClick={() => setCurrentView("history")} />
          )}
        </div>
      )}

      {currentView === "staff" && (
        <div className="rounded-3xl bg-white p-6 shadow-sm dark:bg-slate-900 sm:p-8">
          <button onClick={() => setCurrentView("menu")} className="mb-4 text-sm font-semibold text-[#6d4c41]">← メニューに戻る</button>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-bold">スタッフ一覧</h2>
            <button onClick={() => setShowStaffRegistration(true)} className="rounded-2xl bg-[#6d4c41] px-5 py-3 font-bold text-white">スタッフ登録</button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {[...staffList].sort((a, b) => {
              const roleOrder = { manager: 0, admin: 1, staff: 2 };
              return (roleOrder[a.role] ?? 2) - (roleOrder[b.role] ?? 2);
            }).map((staff) => (
              <button key={staff.id} onClick={() => setSelectedStaff(staff)} className="rounded-2xl border border-slate-200 p-4 text-left hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                <p className="font-bold">{staff.name}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {currentView === "history" && (
        <div className="rounded-3xl bg-white p-6 shadow-sm dark:bg-slate-900 sm:p-8">
          <button onClick={() => setCurrentView("menu")} className="mb-4 text-sm font-semibold text-[#6d4c41]">← メニューに戻る</button>
          <h2 className="text-2xl font-bold">勤務履歴一覧</h2>
          <HistoryTable records={records} staffList={staffList} isAdmin={isAdmin} allowances={allowances} />
        </div>
      )}

      {currentView === "allowance" && (
        <div className="rounded-3xl bg-white p-6 shadow-sm dark:bg-slate-900 sm:p-8">
          <button onClick={() => setCurrentView("menu")} className="mb-4 text-sm font-semibold text-[#6d4c41]">← メニューに戻る</button>
          <h2 className="text-2xl font-bold">特別手当設定</h2>
          <AllowancePanel
            allowances={allowances}
            staffList={staffList}
            onAddAllowance={onAddAllowance}
            onDeleteAllowance={onDeleteAllowance}
          />
        </div>
      )}

      {currentView === "correction" && (
        <div className="rounded-3xl bg-white p-6 shadow-sm dark:bg-slate-900 sm:p-8">
          <button onClick={() => setCurrentView("menu")} className="mb-4 text-sm font-semibold text-[#6d4c41]">← メニューに戻る</button>
          <AttendanceCorrectionPanel staffList={staffList} records={records} onUpdateRecord={onUpdateRecord} onCreateRecord={onCreateRecord} />
        </div>
      )}

      {currentView === "correctionHistory" && (
        <div className="rounded-3xl bg-white p-6 shadow-sm dark:bg-slate-900 sm:p-8">
          <button onClick={() => setCurrentView("menu")} className="mb-4 text-sm font-semibold text-[#6d4c41]">← メニューに戻る</button>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#6d4c41]">削除不可・新しい順</p>
              <h2 className="text-2xl font-bold">打刻修正履歴</h2>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select value={historyStaffId} onChange={(event) => setHistoryStaffId(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950">
                <option value="all">全スタッフ</option>
                {staffList.map((staff) => <option key={staff.id} value={staff.id}>{staff.name}</option>)}
              </select>
              <input type="month" value={historyMonth} onChange={(event) => setHistoryMonth(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950" />
            </div>
          </div>
          <CorrectionHistoryTable histories={filteredHistories} />
        </div>
      )}

      {currentView === "monthly" && (
        <div className="rounded-3xl bg-white p-6 shadow-sm dark:bg-slate-900 sm:p-8">
          <button onClick={() => setCurrentView("menu")} className="mb-4 text-sm font-semibold text-[#6d4c41]">← メニューに戻る</button>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#6d4c41]">給与設定</p>
              <h2 className="text-2xl font-bold">月次集計</h2>
              <p className="mt-1 text-sm text-slate-500">月末締め固定 / 支払日25日固定 / 全スタッフ共通</p>
            </div>
            <input type="month" value={selectedMonth} onChange={(event) => onMonthChange(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold dark:border-slate-700 dark:bg-slate-950" />
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {monthlySummary.map((summary) => (
              <button key={summary.staffId} onClick={() => setSelectedSummary(summary)} className="rounded-2xl border border-slate-200 p-4 text-left hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                <p className="font-bold">{summary.staffName}</p>
                <p className="mt-1 text-sm text-slate-500">合計支給額：{formatCurrency(summary.totalPay)}</p>
              </button>
            ))}
            {monthlySummary.length === 0 && <p className="text-sm text-slate-500">対象月の勤務データはまだありません。</p>}
          </div>
        </div>
      )}

      {showStaffRegistration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-lg dark:bg-slate-900 sm:p-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">スタッフ登録</h2>
              <button onClick={() => setShowStaffRegistration(false)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">✕</button>
            </div>
            <StaffRegistrationPanel onAddStaff={onAddStaff} onClose={() => setShowStaffRegistration(false)} />
          </div>
        </div>
      )}

      {selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-lg dark:bg-slate-900 sm:p-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">スタッフ詳細</h2>
              <button onClick={() => setSelectedStaff(null)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">✕</button>
            </div>
            <StaffDetailPanel staff={selectedStaff} onUpdateStaff={onUpdateStaff} />
          </div>
        </div>
      )}

      {selectedSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-lg dark:bg-slate-900 sm:p-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">{selectedSummary.staffName} - {selectedSummary.month} 月次集計</h2>
              <button onClick={() => setSelectedSummary(null)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">✕</button>
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                <p className="text-sm text-slate-500">勤務日数</p>
                <p className="font-bold">{selectedSummary.workDays}日</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                <p className="text-sm text-slate-500">総勤務時間</p>
                <p className="font-bold">{formatMinutes(selectedSummary.workMinutes)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                <p className="text-sm text-slate-500">残業時間</p>
                <p className="font-bold">{formatMinutes(selectedSummary.overtimeMinutes)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                <p className="text-sm text-slate-500">基本賃金</p>
                <p className="font-bold">{formatCurrency(selectedSummary.basePay)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                <p className="text-sm text-slate-500">時間外賃金</p>
                <p className="font-bold">{formatCurrency(selectedSummary.overtimePay)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                <p className="text-sm text-slate-500">交通費</p>
                <p className="font-bold">{formatCurrency(selectedSummary.transportationAllowance)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                <p className="text-sm text-slate-500">合計支給額</p>
                <p className="text-2xl font-bold text-[#6d4c41]">{formatCurrency(selectedSummary.totalPay)}</p>
              </div>
              <button onClick={() => onExportCsv(selectedSummary.staffId, selectedSummary.month)} className="min-h-14 w-full rounded-2xl bg-[#6d4c41] px-6 font-bold text-white">CSV出力</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StaffRegistrationPanel({ onAddStaff, onClose }: { onAddStaff: AdminPanelProps["onAddStaff"]; onClose: () => void }) {
  const [name, setName] = useState("");
  const [kana, setKana] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState<StaffRole>("staff");
  const [hourlyWage, setHourlyWage] = useState("1200");
  const [transportationAllowance, setTransportationAllowance] = useState("0");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (!name.trim() || !kana.trim()) {
      setError("氏名とフリガナを入力してください");
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setError("PINコードは4桁数字で入力してください");
      return;
    }

    onAddStaff({
      name: name.trim(),
      kana: kana.trim(),
      pin,
      role,
      hourlyWage: Number(hourlyWage) || 0,
      transportationAllowance: Number(transportationAllowance) || 0,
      memo: memo.trim(),
    });
    setName("");
    setKana("");
    setPin("");
    setRole("staff");
    setHourlyWage("1200");
    setTransportationAllowance("0");
    setMemo("");
    setError("");
    onClose();
  };

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm dark:bg-slate-900 sm:p-8">
      <h2 className="text-2xl font-bold">スタッフ登録</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Input label="氏名" value={name} onChange={setName} />
        <Input label="フリガナ" value={kana} onChange={setKana} />
        <Input label="PINコード（4桁）" value={pin} onChange={(value) => setPin(value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" />
        <label className="text-sm font-semibold">権限<select value={role} onChange={(event) => setRole(event.target.value as StaffRole)} className="mt-1 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-950"><option value="admin">管理者</option><option value="manager">店長</option><option value="staff">スタッフ</option></select></label>
        <Input label="時給" value={hourlyWage} onChange={setHourlyWage} inputMode="numeric" />
        <Input label="交通費設定" value={transportationAllowance} onChange={setTransportationAllowance} inputMode="numeric" />
        <label className="text-sm font-semibold md:col-span-2">メモ欄<textarea value={memo} onChange={(event) => setMemo(event.target.value)} className="mt-1 min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950" /></label>
      </div>
      {error && <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
      <button onClick={submit} className="mt-4 min-h-14 rounded-2xl bg-[#6d4c41] px-6 font-bold text-white">スタッフを登録</button>
    </section>
  );
}

function AttendanceCorrectionPanel({ staffList, records, onUpdateRecord, onCreateRecord }: { staffList: Staff[]; records: AttendanceRecord[]; onUpdateRecord: AdminPanelProps["onUpdateRecord"]; onCreateRecord: AdminPanelProps["onCreateRecord"] }) {
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedRecordId, setSelectedRecordId] = useState("");
  const [selectedField, setSelectedField] = useState<CorrectionField | null>(null);
  const [values, setValues] = useState({ clockIn: "", clockOut: "", breakStart: "", breakEnd: "" });

  const staffRecords = selectedStaffId && selectedDate ? records.filter((r) => r.staffId === selectedStaffId && r.workDate === selectedDate) : [];
  const targetRecord = staffRecords.find((r) => r.id === selectedRecordId) ?? staffRecords[0];

  const loadRecord = (recordId: string) => {
    setSelectedRecordId(recordId);
    const record = staffRecords.find((item) => item.id === recordId);
    setValues({
      clockIn: toDateTimeInputValue(record?.clockIn ?? null),
      clockOut: toDateTimeInputValue(record?.clockOut ?? null),
      breakStart: toDateTimeInputValue(record?.breakStart ?? null),
      breakEnd: toDateTimeInputValue(record?.breakEnd ?? null),
    });
  };

  const submit = () => {
    if (staffRecords.length === 0) {
      const staff = staffList.find((s) => s.id === selectedStaffId);
      if (!staff) return;
      const newRecord = {
        id: crypto.randomUUID(),
        staffId: staff.id,
        staffName: staff.name,
        workDate: selectedDate,
        clockIn: fromDateTimeInputValue(values.clockIn),
        clockOut: fromDateTimeInputValue(values.clockOut),
        breakStart: fromDateTimeInputValue(values.breakStart),
        breakEnd: fromDateTimeInputValue(values.breakEnd),
        totalBreakMinutes: 0,
        status: "finished" as const,
      };
      onCreateRecord(newRecord);
      setSelectedDate("");
      setValues({ clockIn: "", clockOut: "", breakStart: "", breakEnd: "" });
      return;
    }
    if (!targetRecord) return;
    onUpdateRecord(targetRecord.id, {
      clockIn: fromDateTimeInputValue(values.clockIn),
      clockOut: fromDateTimeInputValue(values.clockOut),
      breakStart: fromDateTimeInputValue(values.breakStart),
      breakEnd: fromDateTimeInputValue(values.breakEnd),
    });
    setSelectedRecordId("");
    setSelectedField(null);
  };

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm dark:bg-slate-900 sm:p-8">
      <h2 className="text-2xl font-bold">打刻修正</h2>
      <div className="mt-4 space-y-4">
        <div>
          <p className="mb-2 text-sm font-semibold">スタッフを選択</p>
          <select value={selectedStaffId} onChange={(event) => setSelectedStaffId(event.target.value)} className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-950">
            <option value="">スタッフを選択</option>
            {staffList.map((staff) => <option key={staff.id} value={staff.id}>{staff.name}</option>)}
          </select>
        </div>
        {selectedStaffId && (
          <div>
            <p className="mb-2 text-sm font-semibold">日付を選択</p>
            <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-950" />
          </div>
        )}
        {selectedStaffId && selectedDate && (
          <div>
            {staffRecords.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                <p className="font-bold">勤務履歴がありません</p>
                <p className="mt-2 text-sm text-slate-500">出勤・退勤・休憩時間を入力してください</p>
                <div className="mt-4 space-y-3">
                  <DateTimeInput label="出勤時間" value={values.clockIn} onChange={(value) => setValues((prev) => ({ ...prev, clockIn: value }))} />
                  <DateTimeInput label="退勤時間" value={values.clockOut} onChange={(value) => setValues((prev) => ({ ...prev, clockOut: value }))} />
                  <DateTimeInput label="休憩開始" value={values.breakStart} onChange={(value) => setValues((prev) => ({ ...prev, breakStart: value }))} />
                  <DateTimeInput label="休憩終了" value={values.breakEnd} onChange={(value) => setValues((prev) => ({ ...prev, breakEnd: value }))} />
                </div>
                <button onClick={submit} className="mt-4 min-h-14 w-full rounded-2xl bg-[#8d6e63] px-6 font-bold text-white">打刻を修正</button>
              </div>
            ) : (
              <div>
                <p className="mb-2 text-sm font-semibold">履歴を選択</p>
                <select value={selectedRecordId} onChange={(event) => loadRecord(event.target.value)} className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-950">
                  <option value="">履歴を選択</option>
                  {staffRecords.map((record) => <option key={record.id} value={record.id}>{record.workDate}</option>)}
                </select>
                {targetRecord && (
                  <div className="mt-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                    <p className="font-bold">{targetRecord.staffName} - {targetRecord.workDate}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                      <p>出勤：{formatDateTime(targetRecord.clockIn)}</p>
                      <p>退勤：{formatDateTime(targetRecord.clockOut)}</p>
                      <p>休憩開始：{formatDateTime(targetRecord.breakStart)}</p>
                      <p>休憩終了：{formatDateTime(targetRecord.breakEnd)}</p>
                    </div>
                  </div>
                )}
                {targetRecord && (
                  <div className="mt-4">
                    <p className="mb-2 text-sm font-semibold">修正箇所を選択</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {(["clockIn", "clockOut", "breakStart", "breakEnd"] as CorrectionField[]).map((field) => (
                        <button
                          key={field}
                          onClick={() => setSelectedField(field)}
                          className={`min-h-12 rounded-2xl px-4 font-semibold ${selectedField === field ? "bg-[#6d4c41] text-white" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}
                        >
                          {correctionFieldLabel[field]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {selectedField && (
                  <div className="mt-4">
                    <p className="mb-2 text-sm font-semibold">修正時刻を選択</p>
                    <DateTimeInput label="" value={values[selectedField]} onChange={(value) => setValues((prev) => ({ ...prev, [selectedField]: value }))} />
                  </div>
                )}
                {selectedField && (
                  <button onClick={submit} className="mt-4 min-h-14 w-full rounded-2xl bg-[#8d6e63] px-6 font-bold text-white">打刻を修正</button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function CorrectionHistoryTable({ histories }: { histories: CorrectionHistory[] }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[1000px] text-left text-sm">
        <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
          <tr><th className="px-4 py-3">スタッフ名</th><th className="px-4 py-3">修正対象日</th><th className="px-4 py-3">修正項目</th><th className="px-4 py-3">修正前時刻</th><th className="px-4 py-3">修正後時刻</th><th className="px-4 py-3">修正理由</th><th className="px-4 py-3">修正者</th><th className="px-4 py-3">修正日時</th></tr>
        </thead>
        <tbody>
          {histories.map((history) => (
            <tr key={history.id} className="border-t border-slate-100 dark:border-slate-800">
              <td className="px-4 py-3 font-semibold">{history.staffName}</td>
              <td className="px-4 py-3">{history.workDate}</td>
              <td className="px-4 py-3">{correctionFieldLabel[history.field]}</td>
              <td className="px-4 py-3">{formatDateTime(history.beforeValue)}</td>
              <td className="px-4 py-3">{formatDateTime(history.afterValue)}</td>
              <td className="px-4 py-3">{history.reason}</td>
              <td className="px-4 py-3">{history.correctedBy}</td>
              <td className="px-4 py-3">{new Intl.DateTimeFormat("ja-JP", { dateStyle: "short", timeStyle: "short" }).format(new Date(history.correctedAt))}</td>
            </tr>
          ))}
          {histories.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">修正履歴はまだありません。</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function Input({ label, value, onChange, inputMode }: { label: string; value: string; onChange: (value: string) => void; inputMode?: "numeric" }) {
  return <label className="text-sm font-semibold">{label}<input value={value} onChange={(event) => onChange(event.target.value)} inputMode={inputMode} className="mt-1 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-950" /></label>;
}

function DateTimeInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="text-sm font-semibold">{label}<input type="datetime-local" value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-950" /></label>;
}

function MenuButton({ icon, label, onClick }: { icon?: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="min-h-16 rounded-2xl border border-[#d7ccc8] bg-white px-5 py-3 text-left shadow-sm hover:bg-[#faf8f5] active:scale-[0.98]">
      <p className="text-base font-bold text-[#3e2723]">{label}</p>
    </button>
  );
}

function roleLabel(role: StaffRole) {
  if (role === "admin") return "管理者";
  if (role === "manager") return "店長";
  return "スタッフ";
}
