"use client";

import { useState, useCallback } from "react";
import type { AttendanceSummary } from "@/lib/types";
import { formatCurrency } from "@/lib/time";
import { loadSyncHistory, saveSyncHistory, isMonthAlreadySynced } from "@/lib/syncHistory";

interface SyncField {
  key: string;
  cell: string;
  currentValue: string | null;
  newValue: string;
}

interface SyncPreviewItem {
  staffName: string;
  fields: SyncField[];
}

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
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [preview, setPreview] = useState<SyncPreviewItem[] | null>(null);
  const [results, setResults] = useState<SyncResultItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "testing" | "ok" | "error">("idle");
  const [history, setHistory] = useState(() => loadSyncHistory());

  const fieldLabels: Record<string, string> = {
    workDays: "勤務日数",
    workHours: "出勤時間（時間）",
    overtimeHours: "残業時間（時間）",
    holidayHours: "年末年始時間（時間）",
  };

  const testConnection = useCallback(async () => {
    setConnectionStatus("testing");
    setError(null);
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

  const fetchPreview = useCallback(async () => {
    setIsPreviewLoading(true);
    setError(null);
    setPreview(null);
    setResults(null);

    const payload = summaries.map((s) => ({
      staffName: s.staffName,
      workDays: s.workDays,
      workMinutes: s.workMinutes,
      overtimeMinutes: s.overtimeMinutes,
      nightMinutes: s.nightMinutes,
    }));

    try {
      const res = await fetch("/api/sheets/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summaries: payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "プレビュー取得に失敗しました");
        return;
      }
      setPreview(data.preview);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsPreviewLoading(false);
    }
  }, [summaries]);

  const executeSync = useCallback(async () => {
    if (!window.confirm(`${month}月分のデータをスプレッドシートに反映しますか？\n※ 既存の値が上書きされます。`)) {
      return;
    }

    setIsSyncing(true);
    setError(null);

    const payload = summaries.map((s) => ({
      staffName: s.staffName,
      workDays: s.workDays,
      workMinutes: s.workMinutes,
      overtimeMinutes: s.overtimeMinutes,
      nightMinutes: s.nightMinutes,
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
      setError(err instanceof Error ? err.message : String(err));
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
          onClick={fetchPreview}
          disabled={isPreviewLoading}
          className="rounded-full bg-[#6d4c41] px-6 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {isPreviewLoading ? "プレビュー取得中..." : "プレビューを表示"}
        </button>
        <button
          onClick={executeSync}
          disabled={isSyncing || !preview}
          className="rounded-full bg-[#d84315] px-6 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {isSyncing ? "反映中..." : "スプレッドシートへ反映"}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-bold">エラー</p>
          <p>{error}</p>
        </div>
      )}

      {preview && !results && (
        <div className="mt-5">
          <p className="mb-2 text-sm font-semibold text-[#6d4c41]">反映プレビュー：{month}月</p>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">スタッフ</th>
                  <th className="px-4 py-3 text-left">項目</th>
                  <th className="px-4 py-3 text-right">セル</th>
                  <th className="px-4 py-3 text-right">現在の値</th>
                  <th className="px-4 py-3 text-right">→ 新しい値</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preview.map((item) =>
                  item.fields.map((field, fIdx) => (
                    <tr key={`${item.staffName}-${field.key}`} className={fIdx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                      {fIdx === 0 && (
                        <td rowSpan={item.fields.length} className="px-4 py-3 font-bold align-top">
                          {item.staffName}
                        </td>
                      )}
                      <td className="px-4 py-3">{fieldLabels[field.key] || field.key}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-slate-500">{field.cell}</td>
                      <td className="px-4 py-3 text-right text-slate-500">{field.currentValue ?? "(空)"}</td>
                      <td className="px-4 py-3 text-right font-bold text-[#d84315]">{field.newValue}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
                {r.success && (
                  <p className="mt-1 text-xs text-green-700">更新セル: {r.updatedCells.join(", ")}</p>
                )}
                {r.error && <p className="mt-1 text-xs text-red-700">{r.error}</p>}
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
