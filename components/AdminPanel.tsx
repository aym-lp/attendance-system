"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Allowance, AttendanceRecord, AttendanceSummary, CorrectionField, CorrectionHistory, CorrectionTimeField, Staff, StaffRole } from "@/lib/types";
import { formatCurrency, formatDateTime, formatMinutes, formatWorkDateForDialog, fromDateTimeInputValue, toDateTimeInputValue } from "@/lib/time";
import { HistoryTable } from "@/components/HistoryTable";
import { AllowancePanel } from "@/components/AllowancePanel";
import { SpreadsheetSyncPanel } from "@/components/SpreadsheetSyncPanel";

const correctionFieldLabel: Record<CorrectionField, string> = {
  clockIn: "出勤時間",
  clockOut: "退勤時間",
  breakStart: "休憩開始時間",
  breakEnd: "休憩終了時間",
  dayDeletion: "勤務削除",
};

type AdminView = "menu" | "staff" | "history" | "correction" | "correctionHistory" | "monthly" | "allowance";

const adminMenuItems: Array<{ view: AdminView; label: string }> = [
  { view: "menu", label: "トップ" },
  { view: "staff", label: "スタッフ一覧" },
  { view: "history", label: "勤怠履歴一覧" },
  { view: "correction", label: "打刻修正" },
  { view: "correctionHistory", label: "打刻修正履歴" },
  { view: "monthly", label: "月次集計" },
  { view: "allowance", label: "特別手当設定" },
];

type AdminPanelProps = {
  isAdmin: boolean;
  currentStaff: Staff;
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
  onDeleteStaff: (id: string) => void;
  onUpdateRecord: (recordId: string, values: Partial<Pick<AttendanceRecord, CorrectionTimeField>>) => void;
  onCreateRecord: (record: Omit<AttendanceRecord, "workMinutes" | "overtimeMinutes" | "nightMinutes">) => void;
  onDeleteRecord: (recordId: string) => Promise<void>;
  onAddAllowance: (allowance: Omit<Allowance, "id">) => void;
  onDeleteAllowance: (id: string) => void;
};

function StaffDetailPanel({ staff, onUpdateStaff, onDeleteStaff }: { staff: Staff; onUpdateStaff: AdminPanelProps["onUpdateStaff"]; onDeleteStaff: AdminPanelProps["onDeleteStaff"] }) {
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
          <div className="flex gap-2">
            <button onClick={() => setIsEditing(true)} className="min-h-12 flex-1 rounded-2xl bg-[#6d4c41] px-6 font-bold text-white">編集</button>
            <button onClick={() => onDeleteStaff(staff.id)} className="min-h-12 flex-1 rounded-2xl bg-red-600 px-6 font-bold text-white">削除</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminPanel({ isAdmin, currentStaff, staffList, records, correctionHistories, selectedMonth, monthlySummary, allowances, onMonthChange, onExportCsv, onAddStaff, onUpdateStaff, onDeleteStaff, onUpdateRecord, onCreateRecord, onDeleteRecord, onAddAllowance, onDeleteAllowance }: AdminPanelProps) {
  const [currentView, setCurrentView] = useState<AdminView>("menu");
  const [historyStaffId, setHistoryStaffId] = useState("all");
  const [historyMonth, setHistoryMonth] = useState(selectedMonth);
  const [showStaffRegistration, setShowStaffRegistration] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [selectedSummary, setSelectedSummary] = useState<AttendanceSummary | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigateTo = (view: AdminView) => {
    setCurrentView(view);
    setIsMobileMenuOpen(false);
  };

  const uniqueMonths = useMemo(() => {
    const months = new Set(records.map((r) => r.workDate.slice(0, 7)));
    return Array.from(months).sort().reverse();
  }, [records]);

  const filteredHistories = useMemo(() => {
    return correctionHistories
      .filter((history) => historyStaffId === "all" || history.staffId === historyStaffId)
      .filter((history) => !historyMonth || history.workDate.startsWith(historyMonth))
      .sort((a, b) => new Date(b.correctedAt).getTime() - new Date(a.correctedAt).getTime());
  }, [correctionHistories, historyMonth, historyStaffId]);

  if (!isAdmin) {
    const myHistories = correctionHistories.filter((h) => h.staffId === currentStaff.id);
    return (
      <div className="space-y-5">
        <div className="rounded-3xl bg-white p-6 shadow-sm dark:bg-slate-900 sm:p-8">
          <h2 className="text-2xl font-bold">勤務履歴</h2>
          <HistoryTable records={records} staffList={staffList} isAdmin={isAdmin} allowances={allowances} />
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-sm dark:bg-slate-900 sm:p-8">
          <h2 className="text-2xl font-bold">打刻修正</h2>
          <AttendanceCorrectionPanel
            staffList={staffList}
            records={records}
            currentStaffId={currentStaff.id}
            onUpdateRecord={onUpdateRecord}
            onCreateRecord={onCreateRecord}
            onDeleteRecord={onDeleteRecord}
          />
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-sm dark:bg-slate-900 sm:p-8">
          <h2 className="text-2xl font-bold">打刻修正履歴</h2>
          <CorrectionHistoryTable histories={myHistories} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="relative lg:hidden">
        <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm">
          <p className="font-bold text-[#6d4c41]">メニュー</p>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((current) => !current)}
            aria-expanded={isMobileMenuOpen}
            aria-label="メニューを開く"
            className="rounded-xl border border-[#d7ccc8] px-3 py-2 text-xl font-bold text-[#6d4c41] shadow-sm"
          >
            ☰
          </button>
        </div>
        {isMobileMenuOpen && (
          <nav className="absolute inset-x-0 top-full z-40 mt-2 rounded-2xl border border-[#d7ccc8] bg-white p-2 shadow-lg" aria-label="管理メニュー">
            {adminMenuItems.map((item) => (
              <button
                key={item.view}
                type="button"
                onClick={() => navigateTo(item.view)}
                className={`min-h-11 w-full rounded-xl px-4 text-left text-sm font-bold transition-colors ${currentView === item.view ? "bg-[#6d4c41] text-white" : "text-[#6d4c41] hover:bg-[#efebe9]"}`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        )}
      </div>
      <div className={currentView === "menu" ? "" : "lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start lg:gap-5"}>
        {currentView !== "menu" && (
          <aside className="sticky top-20 hidden rounded-3xl bg-white p-3 shadow-sm lg:block">
            <nav className="space-y-1" aria-label="管理メニュー">
              {adminMenuItems.map((item) => (
                <button
                  key={item.view}
                  type="button"
                  onClick={() => navigateTo(item.view)}
                  className={`min-h-11 w-full rounded-xl px-4 text-left text-sm font-bold transition-colors ${currentView === item.view ? "bg-[#6d4c41] text-white shadow-sm" : "text-[#6d4c41] hover:bg-[#efebe9]"}`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>
        )}
        <div className="min-w-0">
      {currentView === "menu" && (
        <div className="hidden gap-3 lg:grid lg:grid-cols-3">
          {isAdmin && (
            <>
              <MenuButton label="スタッフ一覧" onClick={() => setCurrentView("staff")} />
              <MenuButton label="勤務履歴一覧" onClick={() => setCurrentView("history")} />
              <MenuButton label="打刻修正" onClick={() => setCurrentView("correction")} />
              <MenuButton label="打刻修正履歴" onClick={() => setCurrentView("correctionHistory")} />
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
              <button key={staff.id} onClick={() => setSelectedStaff(staff)} className="rounded-2xl border border-[#d7ccc8] bg-white p-4 text-left text-[#6d4c41] shadow-sm transition-colors hover:border-[#a1887f] hover:bg-[#efebe9] active:scale-[0.99] dark:border-slate-700 dark:bg-slate-900 dark:hover:border-[#a1887f] dark:hover:bg-slate-800">
                <p className="font-bold">{staff.name}</p>
              </button>
            ))}
          </div>
          <button onClick={() => setCurrentView("menu")} className="mt-6 text-sm font-semibold text-[#6d4c41]">← メニューに戻る</button>
        </div>
      )}

      {currentView === "history" && (
        <div className="rounded-3xl bg-white p-6 shadow-sm dark:bg-slate-900 sm:p-8">
          <button onClick={() => setCurrentView("menu")} className="mb-4 text-sm font-semibold text-[#6d4c41]">← メニューに戻る</button>
          <h2 className="text-2xl font-bold">勤務履歴一覧</h2>
          <HistoryTable records={records} staffList={staffList} isAdmin={isAdmin} allowances={allowances} />
          <button onClick={() => setCurrentView("menu")} className="mt-6 text-sm font-semibold text-[#6d4c41]">← メニューに戻る</button>
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
          <button onClick={() => setCurrentView("menu")} className="mt-6 text-sm font-semibold text-[#6d4c41]">← メニューに戻る</button>
        </div>
      )}

      {currentView === "correction" && (
        <div className="rounded-3xl bg-white p-6 shadow-sm dark:bg-slate-900 sm:p-8">
          <button onClick={() => setCurrentView("menu")} className="mb-4 text-sm font-semibold text-[#6d4c41]">← メニューに戻る</button>
          <h2 className="text-2xl font-bold">打刻修正</h2>
          <AttendanceCorrectionPanel staffList={staffList} records={records} onUpdateRecord={onUpdateRecord} onCreateRecord={onCreateRecord} onDeleteRecord={onDeleteRecord} />
          <button onClick={() => setCurrentView("menu")} className="mt-6 text-sm font-semibold text-[#6d4c41]">← メニューに戻る</button>
        </div>
      )}

      {currentView === "correctionHistory" && (
        <div className="rounded-3xl bg-white p-6 shadow-sm dark:bg-slate-900 sm:p-8">
          <button onClick={() => setCurrentView("menu")} className="mb-4 text-sm font-semibold text-[#6d4c41]">← メニューに戻る</button>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
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
          <button onClick={() => setCurrentView("menu")} className="mt-6 text-sm font-semibold text-[#6d4c41]">← メニューに戻る</button>
        </div>
      )}

      {currentView === "monthly" && (
        <div className="rounded-3xl bg-white p-6 shadow-sm dark:bg-slate-900 sm:p-8">
          <button onClick={() => setCurrentView("menu")} className="mb-4 text-sm font-semibold text-[#6d4c41]">← メニューに戻る</button>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#6d4c41]">給与設定</p>
              <h2 className="text-2xl font-bold">月次集計</h2>
            </div>
            <select
              value={selectedMonth}
              onChange={(event) => onMonthChange(event.target.value)}
              className="h-12 rounded-2xl border border-[#d7ccc8] bg-white px-4 text-sm font-semibold text-[#3e2723] outline-none focus:border-[#6d4c41] dark:border-slate-700 dark:bg-slate-950"
            >
              {uniqueMonths.map((month) => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {[...monthlySummary].sort((a, b) => {
              const indexA = staffList.findIndex((s) => s.id === a.staffId);
              const indexB = staffList.findIndex((s) => s.id === b.staffId);
              return indexA - indexB;
            }).map((summary) => (
              <button key={summary.staffId} onClick={() => setSelectedSummary(summary)} className="rounded-2xl border border-[#d7ccc8] bg-white p-4 text-left text-[#6d4c41] shadow-sm transition-colors hover:border-[#a1887f] hover:bg-[#efebe9] active:scale-[0.99] dark:border-slate-700 dark:bg-slate-900 dark:hover:border-[#a1887f] dark:hover:bg-slate-800">
                <p className="font-bold">{summary.staffName}</p>
                <p className="mt-1 text-sm text-slate-500">合計支給額：{formatCurrency(summary.totalPay)}</p>
              </button>
            ))}
            {monthlySummary.length === 0 && <p className="text-sm text-slate-500">対象月の勤務データはまだありません。</p>}
          </div>
          {monthlySummary.length > 0 && (
            <SpreadsheetSyncPanel month={selectedMonth} summaries={monthlySummary} />
          )}
          <button onClick={() => setCurrentView("menu")} className="mt-6 text-sm font-semibold text-[#6d4c41]">← メニューに戻る</button>
        </div>
      )}
        </div>
      </div>

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
            <StaffDetailPanel staff={selectedStaff} onUpdateStaff={onUpdateStaff} onDeleteStaff={onDeleteStaff} />
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
                <p className="text-sm text-slate-500">特別手当</p>
                <p className="font-bold">{formatCurrency(selectedSummary.allowancePay)}</p>
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
    console.log("[StaffRegistrationPanel] submit が呼ばれました");
    console.log("[StaffRegistrationPanel] 入力値:", { name, kana, pin, role, hourlyWage, transportationAllowance, memo });

    if (!name.trim() || !kana.trim()) {
      setError("氏名とフリガナを入力してください");
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setError("PINコードは4桁数字で入力してください");
      return;
    }

    const staffData = {
      name: name.trim(),
      kana: kana.trim(),
      pin,
      role,
      hourlyWage: Number(hourlyWage) || 0,
      transportationAllowance: Number(transportationAllowance) || 0,
      memo: memo.trim(),
    };

    console.log("[StaffRegistrationPanel] onAddStaff を呼び出します:", staffData);
    onAddStaff(staffData);

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

function AttendanceCorrectionPanel({ staffList, records, currentStaffId, onUpdateRecord, onCreateRecord, onDeleteRecord }: { staffList: Staff[]; records: AttendanceRecord[]; currentStaffId?: string; onUpdateRecord: AdminPanelProps["onUpdateRecord"]; onCreateRecord: AdminPanelProps["onCreateRecord"]; onDeleteRecord: AdminPanelProps["onDeleteRecord"] }) {
  const isSelfMode = !!currentStaffId;
  const [selectedStaffId, setSelectedStaffId] = useState(isSelfMode ? currentStaffId : "");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedRecordId, setSelectedRecordId] = useState("");
  const [selectedField, setSelectedField] = useState<CorrectionTimeField | null>(null);
  const [values, setValues] = useState({ clockIn: "", clockOut: "", breakStart: "", breakEnd: "" });

  const staffRecords = selectedStaffId && selectedDate ? records.filter((r) => r.staffId === selectedStaffId && r.workDate === selectedDate) : [];
  const targetRecord = staffRecords.find((r) => r.id === selectedRecordId) ?? staffRecords[0];

  const toTimeValue = (timeStr: string | null): string => {
    if (!timeStr) return "";
    if (timeStr.includes("T")) {
      const d = new Date(timeStr);
      const h = String(d.getHours()).padStart(2, "0");
      const m = String(d.getMinutes()).padStart(2, "0");
      return `${h}:${m}`;
    }
    return timeStr;
  };

  const toDateTimeValue = (date: string, time: string): string | null => {
    if (!date || !time) return null;
    return fromDateTimeInputValue(`${date}T${time}`);
  };

  const loadRecord = (recordId: string) => {
    setSelectedRecordId(recordId);
    setSelectedField(null);
    const record = staffRecords.find((item) => item.id === recordId);
    setValues({
      clockIn: toTimeValue(record?.clockIn ?? null),
      clockOut: toTimeValue(record?.clockOut ?? null),
      breakStart: toTimeValue(record?.breakStart ?? null),
      breakEnd: toTimeValue(record?.breakEnd ?? null),
    });
  };

  const deleteSelectedRecord = async () => {
    if (!selectedRecordId || !targetRecord) return;
    const dialogDate = formatWorkDateForDialog(selectedDate);
    if (!confirm(`${dialogDate}の選択した勤務データを削除しますか？\nこの操作は元に戻せません。`)) return;
    try {
      await onDeleteRecord(targetRecord.id);
      setSelectedRecordId("");
      setSelectedField(null);
      setValues({ clockIn: "", clockOut: "", breakStart: "", breakEnd: "" });
    } catch {
      // 保存または削除に失敗した場合は、選択状態を維持して再操作できるようにする。
    }
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
        clockIn: toDateTimeValue(selectedDate, values.clockIn),
        clockOut: toDateTimeValue(selectedDate, values.clockOut),
        breakStart: toDateTimeValue(selectedDate, values.breakStart),
        breakEnd: toDateTimeValue(selectedDate, values.breakEnd),
        totalBreakMinutes: 0,
        status: "finished" as const,
      };
      onCreateRecord(newRecord);
      setSelectedDate("");
      setValues({ clockIn: "", clockOut: "", breakStart: "", breakEnd: "" });
      return;
    }
    if (!targetRecord) return;

    // 修正対象フィールドのみを更新（部分的なPATCH）
    const updateData: Partial<Pick<AttendanceRecord, CorrectionTimeField>> = {};
    if (selectedField === "clockIn" || values.clockIn) {
      updateData.clockIn = toDateTimeValue(targetRecord.workDate, values.clockIn);
    }
    if (selectedField === "clockOut" || values.clockOut) {
      updateData.clockOut = toDateTimeValue(targetRecord.workDate, values.clockOut);
    }
    if (selectedField === "breakStart" || values.breakStart) {
      updateData.breakStart = toDateTimeValue(targetRecord.workDate, values.breakStart);
    }
    if (selectedField === "breakEnd" || values.breakEnd) {
      updateData.breakEnd = toDateTimeValue(targetRecord.workDate, values.breakEnd);
    }

    onUpdateRecord(targetRecord.id, updateData);
    setSelectedRecordId("");
    setSelectedField(null);
  };

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm dark:bg-slate-900 sm:p-8">
      <div className="mt-4 space-y-4">
        {!isSelfMode && (
          <div>
            <p className="mb-2 text-sm font-semibold">スタッフを選択</p>
            <select value={selectedStaffId} onChange={(event) => {
              setSelectedStaffId(event.target.value);
              setSelectedDate("");
              setSelectedRecordId("");
              setSelectedField(null);
            }} className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-950">
              <option value="">スタッフを選択</option>
              {staffList.map((staff) => <option key={staff.id} value={staff.id}>{staff.name}</option>)}
            </select>
          </div>
        )}
        {selectedStaffId && (
          <div>
            <p className="mb-2 text-sm font-semibold">日付を選択</p>
            <DatePickerInput value={selectedDate} onChange={(value) => {
              setSelectedDate(value);
              setSelectedRecordId("");
              setSelectedField(null);
            }} />
          </div>
        )}
        {selectedStaffId && selectedDate && (
          <div>
            {staffRecords.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                <p className="font-bold">勤務履歴がありません</p>
                <p className="mt-2 text-sm text-slate-500">出勤・退勤・休憩時間を入力してください</p>
                <div className="mt-4 space-y-3">
                  <TimeInput label="出勤時間" value={values.clockIn} onChange={(value) => setValues((prev) => ({ ...prev, clockIn: value }))} />
                  <TimeInput label="退勤時間" value={values.clockOut} onChange={(value) => setValues((prev) => ({ ...prev, clockOut: value }))} />
                  <TimeInput label="休憩開始" value={values.breakStart} onChange={(value) => setValues((prev) => ({ ...prev, breakStart: value }))} />
                  <TimeInput label="休憩終了" value={values.breakEnd} onChange={(value) => setValues((prev) => ({ ...prev, breakEnd: value }))} />
                </div>
                <button onClick={submit} className="mt-4 min-h-14 w-full rounded-2xl bg-[#8d6e63] px-6 font-bold text-white">打刻を修正</button>
              </div>
            ) : (
              <div>
                <p className="mb-2 text-sm font-semibold">履歴を選択</p>
                <select value={selectedRecordId} onChange={(event) => loadRecord(event.target.value)} className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-950">
                  <option value="">履歴を選択</option>
                  {staffRecords.map((record) => <option key={record.id} value={record.id}>{record.workDate}（出勤 {formatDateTime(record.clockIn)}）</option>)}
                </select>
                {targetRecord && (
                  <div className="mt-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-bold">{targetRecord.staffName} - {targetRecord.workDate}</p>
                    </div>
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
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {(["clockIn", "clockOut", "breakStart", "breakEnd"] as CorrectionTimeField[]).map((field) => (
                        <button
                          key={field}
                          onClick={() => setSelectedField((current) => current === field ? null : field)}
                          className={`min-h-12 rounded-2xl border px-3 text-sm font-bold shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6d4c41] ${selectedField === field ? "border-[#6d4c41] bg-[#6d4c41] text-white shadow-md" : "border-slate-200 bg-white text-slate-700 hover:border-[#a1887f] hover:bg-[#efebe9] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-[#a1887f] dark:hover:bg-slate-700"}`}
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
                    <TimeInput label="" value={values[selectedField]} onChange={(value) => setValues((prev) => ({ ...prev, [selectedField]: value }))} />
                  </div>
                )}
                {selectedField && (
                  <button onClick={submit} className="mt-4 min-h-14 w-full rounded-2xl bg-[#8d6e63] px-6 font-bold text-white">打刻を修正</button>
                )}
                {!isSelfMode && selectedRecordId && targetRecord && !selectedField && (
                  <button onClick={deleteSelectedRecord} className="mt-4 min-h-12 w-full rounded-2xl bg-red-700 px-4 py-2 text-sm font-bold text-white">選択した勤務を削除</button>
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
        <thead className="bg-[#d7ccc8] text-[#3e2723]">
          <tr><th className="whitespace-nowrap px-4 py-3">スタッフ名</th><th className="whitespace-nowrap px-4 py-3">修正対象日</th><th className="whitespace-nowrap px-4 py-3">修正項目</th><th className="whitespace-nowrap px-4 py-3">修正前時刻</th><th className="whitespace-nowrap px-4 py-3">修正後時刻</th><th className="whitespace-nowrap px-4 py-3">修正者</th><th className="whitespace-nowrap px-4 py-3">修正日時</th></tr>
        </thead>
        <tbody>
          {histories.map((history) => (
            <tr key={history.id} className="border-t border-slate-100 dark:border-slate-800">
              <td className="px-4 py-3 font-semibold">{history.staffName}</td>
              <td className="px-4 py-3">{history.workDate}</td>
              <td className="px-4 py-3">
                {history.field === "dayDeletion" ? <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">勤務削除</span> : correctionFieldLabel[history.field]}
              </td>
              <td className="px-4 py-3">{history.field === "dayDeletion" ? <DeletedAttendanceValues value={history.beforeValue} /> : formatDateTime(history.beforeValue)}</td>
              <td className="px-4 py-3">{history.field === "dayDeletion" ? "—" : formatDateTime(history.afterValue)}</td>
              <td className="px-4 py-3">{history.correctedBy}</td>
              <td className="px-4 py-3">{new Intl.DateTimeFormat("ja-JP", { dateStyle: "short", timeStyle: "short" }).format(new Date(history.correctedAt))}</td>
            </tr>
          ))}
          {histories.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">打刻修正履歴はまだありません。</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function DeletedAttendanceValues({ value }: { value: string | null }) {
  let details: Record<string, string | null> | null = null;
  try {
    details = JSON.parse(value ?? "{}") as Record<string, string | null>;
  } catch {
    // 既存の非JSON形式の履歴も表示できるよう、そのままフォールバックする。
  }

  if (!details) return <span>{value ?? "—"}</span>;

  return (
    <div className="space-y-1 whitespace-nowrap text-xs">
      <p>出勤：{formatDateTime(details.clockIn ?? null)}</p>
      <p>退勤：{formatDateTime(details.clockOut ?? null)}</p>
      <p>休憩開始：{formatDateTime(details.breakStart ?? null)}</p>
      <p>休憩終了：{formatDateTime(details.breakEnd ?? null)}</p>
    </div>
  );
}

function Input({ label, value, onChange, inputMode }: { label: string; value: string; onChange: (value: string) => void; inputMode?: "numeric" }) {
  return <label className="text-sm font-semibold">{label}<input value={value} onChange={(event) => onChange(event.target.value)} inputMode={inputMode} className="mt-1 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-950" /></label>;
}

function DateTimeInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="text-sm font-semibold">{label}<input type="datetime-local" value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-950" /></label>;
}

function TimeInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [inputValue, setInputValue] = useState(value ? value.replace(":", ":") : "");

  useEffect(() => {
    setInputValue(value ? value.replace(":", ":") : "");
  }, [value]);

  const handleChange = (text: string) => {
    const normalized = text.replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0));
    const digits = normalized.replace(/\D/g, "");
    let formatted = "";
    if (digits.length >= 4) {
      formatted = `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
    } else if (digits.length >= 2) {
      formatted = `${digits.slice(0, 2)}${digits.length > 2 ? ":" + digits.slice(2) : ""}`;
    } else {
      formatted = digits;
    }
    setInputValue(formatted);
    if (digits.length >= 4) {
      const h = digits.slice(0, 2);
      const m = digits.slice(2, 4);
      const hh = Math.min(23, Number(h));
      const mm = Math.min(59, Number(m));
      onChange(`${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
    }
  };

  return (
    <label className="flex flex-col gap-1 text-sm font-semibold">
      {label}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="HH:MM（例：0830）"
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-[#6d4c41] dark:border-slate-700 dark:bg-slate-950"
      />
    </label>
  );
}

function DatePickerInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => value ? new Date(value + "T00:00:00") : new Date());
  const [inputValue, setInputValue] = useState(() => value ? value.replace(/-/g, "/") : "");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      setInputValue(value.replace(/-/g, "/"));
      setViewDate(new Date(value + "T00:00:00"));
    } else {
      setInputValue("");
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (text: string) => {
    const digits = text.replace(/\D/g, "");
    let formatted = "";
    if (digits.length >= 8) {
      formatted = `${digits.slice(0, 4)}/${digits.slice(4, 6)}/${digits.slice(6, 8)}`;
    } else if (digits.length >= 6) {
      formatted = `${digits.slice(0, 4)}/${digits.slice(4, 6)}${digits.length > 6 ? "/" + digits.slice(6) : ""}`;
    } else if (digits.length >= 4) {
      formatted = `${digits.slice(0, 4)}${digits.length > 4 ? "/" + digits.slice(4) : ""}`;
    } else {
      formatted = digits;
    }
    setInputValue(formatted);
    if (digits.length === 8) {
      const y = digits.slice(0, 4);
      const m = digits.slice(4, 6);
      const d = digits.slice(6, 8);
      const dateStr = `${y}-${m}-${d}`;
      if (!isNaN(new Date(dateStr + "T00:00:00").getTime())) {
        onChange(dateStr);
        setViewDate(new Date(dateStr + "T00:00:00"));
      }
    } else if (digits.length < 8) {
      onChange("");
    }
  };

  const selectDate = (year: number, month: number, day: number) => {
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const dateStr = `${year}-${mm}-${dd}`;
    onChange(dateStr);
    setOpen(false);
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const weekDays = ["日", "月", "火", "水", "木", "金", "土"];
  const days: number[] = [];
  for (let i = 0; i < firstDay; i++) days.push(0);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const selectedDay = value ? Number(value.slice(8, 10)) : 0;
  const selectedMonth = value ? Number(value.slice(5, 7)) - 1 : -1;
  const selectedYear = value ? Number(value.slice(0, 4)) : 0;

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center justify-center rounded-l-2xl border border-r-0 border-slate-200 bg-[#faf8f5] px-3 text-lg text-[#6d4c41] dark:border-slate-700 dark:bg-slate-800"
          title="カレンダー"
        >
          📅
        </button>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="YYYY/MM/DD"
          className="min-h-12 w-full rounded-r-2xl border border-[#a1887f] bg-[#fffdfb] px-4 text-sm font-semibold text-[#6d4c41] shadow-sm outline-none transition-colors hover:border-[#6d4c41] hover:bg-[#efebe9] focus:border-[#6d4c41] focus:ring-2 focus:ring-[#d7ccc8] dark:border-slate-700 dark:bg-slate-950"
        />
      </div>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-2xl border border-[#d7ccc8] bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={prevMonth} className="rounded-lg px-2 py-1 text-sm font-bold text-[#6d4c41] hover:bg-[#faf8f5]">←</button>
            <span className="text-sm font-bold text-[#3e2723]">{year}年 {month + 1}月</span>
            <button type="button" onClick={nextMonth} className="rounded-lg px-2 py-1 text-sm font-bold text-[#6d4c41] hover:bg-[#faf8f5]">→</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500">
            {weekDays.map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {days.map((day, index) => (
              day === 0 ? <div key={`empty-${index}`} /> : (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDate(year, month, day)}
                  className={`h-8 w-8 rounded-full text-sm ${
                    day === selectedDay && month === selectedMonth && year === selectedYear
                      ? "bg-[#6d4c41] font-bold text-white"
                      : "text-[#6d4c41] hover:bg-[#efebe9]"
                  }`}
                >
                  {day}
                </button>
              )
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MenuButton({ icon, label, onClick }: { icon?: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="min-h-16 rounded-2xl border border-[#d7ccc8] bg-white px-5 py-3 text-left text-[#6d4c41] shadow-sm transition-colors hover:border-[#a1887f] hover:bg-[#efebe9] active:scale-[0.98]">
      <p className="text-base font-bold">{label}</p>
    </button>
  );
}

function roleLabel(role: StaffRole) {
  if (role === "admin") return "管理者";
  if (role === "manager") return "店長";
  return "スタッフ";
}
