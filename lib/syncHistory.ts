export interface SyncHistoryEntry {
  id: string;
  month: string;
  syncedAt: string;
  results: { staffName: string; success: boolean; updatedCells: string[]; error?: string }[];
}

const STORAGE_KEY = "attendance_sync_history";

export function loadSyncHistory(): SyncHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSyncHistory(entry: SyncHistoryEntry): void {
  if (typeof window === "undefined") return;
  const history = loadSyncHistory();
  history.unshift(entry);
  // 最新50件のみ保持
  if (history.length > 50) history.pop();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function isMonthAlreadySynced(month: string): boolean {
  const history = loadSyncHistory();
  return history.some((h) => h.month === month && h.results.some((r) => r.success));
}
