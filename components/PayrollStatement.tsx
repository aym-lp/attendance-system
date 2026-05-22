"use client";

import type { AttendanceSummary } from "@/lib/types";
import { formatCurrency, formatMinutes } from "@/lib/time";

type PayrollStatementProps = {
  summary: AttendanceSummary;
  onClose: () => void;
};

export function PayrollStatement({ summary, onClose }: PayrollStatementProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 print:bg-white print:static">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-8 shadow-lg dark:bg-slate-900 sm:p-10 print:rounded-none print:shadow-none print:max-w-none print:p-0">
        <div className="flex items-center justify-between print:hidden">
          <h2 className="text-2xl font-bold">給与明細</h2>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white">印刷</button>
            <button onClick={onClose} className="rounded-2xl bg-slate-200 px-5 py-3 font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-300">閉じる</button>
          </div>
        </div>

        <div className="mt-6 space-y-6 print:mt-0">
          <div className="border-b-2 border-slate-200 pb-4 dark:border-slate-700">
            <h1 className="text-3xl font-bold">給与明細書</h1>
            <p className="mt-2 text-sm text-slate-500">対象月：{summary.month}</p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-6 dark:bg-slate-800 print:bg-white print:p-0">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500">氏名</p>
                <p className="text-xl font-bold">{summary.staffName}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">スタッフID</p>
                <p className="text-xl font-bold">{summary.staffId}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-6 dark:bg-slate-800 print:bg-white print:p-0">
            <h3 className="text-lg font-bold">勤務実績</h3>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500">勤務日数</p>
                <p className="text-xl font-bold">{summary.workDays}日</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">総勤務時間</p>
                <p className="text-xl font-bold">{formatMinutes(summary.workMinutes)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">残業時間</p>
                <p className="text-xl font-bold">{formatMinutes(summary.overtimeMinutes)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">深夜時間</p>
                <p className="text-xl font-bold">{formatMinutes(summary.nightMinutes)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-6 dark:bg-slate-800 print:bg-white print:p-0">
            <h3 className="text-lg font-bold">支給明細</h3>
            <div className="mt-4 space-y-3">
              <div className="flex justify-between">
                <p className="text-slate-600">基本賃金</p>
                <p className="font-bold">{formatCurrency(summary.basePay)}</p>
              </div>
              <div className="flex justify-between">
                <p className="text-slate-600">時間外手当（25%増）</p>
                <p className="font-bold">{formatCurrency(summary.overtimePay)}</p>
              </div>
              <div className="flex justify-between">
                <p className="text-slate-600">深夜手当（35%増）</p>
                <p className="font-bold">{formatCurrency(summary.nightPay)}</p>
              </div>
              <div className="flex justify-between">
                <p className="text-slate-600">交通費</p>
                <p className="font-bold">{formatCurrency(summary.transportationAllowance)}</p>
              </div>
              <div className="border-t-2 border-slate-200 pt-3 dark:border-slate-700">
                <div className="flex justify-between">
                  <p className="text-lg font-bold">合計支給額</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary.totalPay)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center text-sm text-slate-500 print:mt-4">
            <p>この明細書は自動生成されています。</p>
            <p className="mt-1">発行日：{new Date().toLocaleDateString("ja-JP")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
