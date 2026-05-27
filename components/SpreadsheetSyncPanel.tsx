"use client";

import { useState, useCallback } from "react";
import type { AttendanceSummary } from "@/lib/types";
import { loadSyncHistory, saveSyncHistory, isMonthAlreadySynced } from "@/lib/syncHistory";

interface SyncResultItem {
  staffName: string;
  success: boolean;
  updatedCells: string[];
  error?: string;
}

interface SpreadsheetSyncPanelProps {
  month: string;
  summaries: AttendanceSummary[];
}

export function SpreadsheetSyncPanel({ month, summaries }: SpreadsheetSyncPanelProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [results, setResults] = useState<SyncResultItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "testing" | "ok" | "error">("idle");
  const [history, setHistory] = useState(() => loadSyncHistory());

  const testConnection = useCallback(async () => {
    setConnectionStatus("testing");
    setError(null);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/sheets/test");
      const data = await res.json();
      if (data.success) {
        setConnectionStatus("ok");
      } else {
        setConnectionStatus("error");
        setError(data.error || "接続テストに失敗しました");
      }
    } catch (err) {
      setConnectionStatus("error");
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const executeSync = useCallback(async () => {
    const [year, monthPart] = month.split("-");
    const label = `${year}年${parseInt(monthPart, 10)}月`;

    if (!window.confirm(`${label}を反映しますか？`)) {
      return;
    }

    setIsSyncing(true);
    setError(null);
    setStatusMessage(null);
    setResults(null);

    const payload = summaries.map((s) => ({
      staffName: s.staffName,
      workDays: s.workDays,
      workMinutes: s.workMinutes,
      overtimeMinutes: s.overtimeMinutes,
      nightMinutes: s.nightMinutes,
      allowanceMinutes: s.allowanceMinutes,
      basePay: s.basePay,
      overtimePay: s.overtimePay,
      transportationAllowance: s.transportationAllowance,
      holidayAllowance: s.allowancePay,
    }));

    try {
      const res = await fetch("/api/sheets/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summaries: payload, month }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "反映に失敗しました");
        return;
      }

      setResults(data.results);

      const hasFailure = data.results.some((r: SyncResultItem) => !r.success);
      if (hasFailure) {
        setStatusMessage(null);
        setError("一部のスタッフで反映に失敗しました。設定をご確認ください。");
      } else {
        setStatusMessage("反映完了しました");
      }

      // 履歴保存
      const entry = {
        id: crypto.randomUUID(),
        month: data.month,
        syncedAt: new Date().toISOString(),
        results: data.results,
      };
      saveSyncHistory(entry);
      setHistory(loadSyncHistory());
    } catch (err) {
      setError("反映に失敗しました。時間をおいて再度お試しください。");
      console.error("[SpreadsheetSync] sync error", err);
    } finally {
      setIsSyncing(false);
    }
  }, [month, summaries]);

  const alreadySynced = isMonthAlreadySynced(month);

  return (
    <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#6d4c41]">Googleスプレッドシート連携</p>
          <h3 className="text-lg font-bold">給与明細へ反映</h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={testConnection}
            disabled={connectionStatus === "testing"}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700"
          >
            {connectionStatus === "testing" ? "確認中..." : "接続テスト"}
          </button>
          {connectionStatus === "ok" && (
            <span className="flex items-center text-sm font-semibold text-green-600">接続OK</span>
          )}
          {connectionStatus === "error" && (
            <span className="flex items-center text-sm font-semibold text-red-600">接続失敗</span>
          )}
        </div>
      </div>

      {alreadySynced && (
        <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-2 text-sm text-amber-700">
          {month}月分は既に反映済みです。
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          onClick={executeSync}
          disabled={isSyncing}
          className="rounded-full bg-[#6d4c41] px-6 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {isSyncing ? "反映中..." : "スプレッドシートへ反映"}
        </button>
      </div>

      {statusMessage && (
        <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {statusMessage}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-bold">エラー</p>
          <p>{error}</p>
        </div>
      )}

      {results && (
        <div className="mt-5">
          <p className="mb-2 text-sm font-semibold text-[#6d4c41]">反映結果：{month}月</p>
          <div className="grid gap-3">
            {results.map((r) => (
              <div
                key={r.staffName}
                className={`rounded-2xl border px-4 py-3 ${r.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">{r.staffName}</span>
                  <span className={`text-sm font-semibold ${r.success ? "text-green-700" : "text-red-700"}`}>
                    {r.success ? "成功" : "失敗"}
                  </span>
                </div>
                {r.error && <p className="mt-1 text-xs text-red-700">反映できませんでした。設定をご確認ください。</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-sm font-semibold text-[#6d4c41]">反映履歴</p>
          <div className="max-h-48 overflow-y-auto rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-2 text-left">日時</th>
                  <th className="px-4 py-2 text-left">対象月</th>
                  <th className="px-4 py-2 text-right">成功</th>
                  <th className="px-4 py-2 text-right">失敗</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((h) => {
                  const successCount = h.results.filter((r) => r.success).length;
                  const failCount = h.results.filter((r) => !r.success).length;
                  return (
                    <tr key={h.id} className="bg-white">
                      <td className="px-4 py-2">{new Date(h.syncedAt).toLocaleString("ja-JP")}</td>
                      <td className="px-4 py-2 font-semibold">{h.month}</td>
                      <td className="px-4 py-2 text-right text-green-600">{successCount}件</td>
                      <td className="px-4 py-2 text-right text-red-600">{failCount > 0 ? `${failCount}件` : "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
