import type { Allowance, AttendanceRecord, CorrectionHistory, Staff } from "@/lib/types";

const STORAGE_KEY = "attendance-app:data:v1";

type PersistedData = {
  staff: Staff[];
  records: AttendanceRecord[];
  allowances: Allowance[];
  histories: CorrectionHistory[];
};

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function loadPersistedData(): PersistedData | null {
  if (!isBrowser()) return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PersistedData> | null;
    if (!parsed) return null;

    return {
      staff: Array.isArray(parsed.staff) ? parsed.staff : [],
      records: Array.isArray(parsed.records) ? parsed.records : [],
      allowances: Array.isArray(parsed.allowances) ? parsed.allowances : [],
      histories: Array.isArray(parsed.histories) ? parsed.histories : [],
    };
  } catch (error) {
    console.warn("[localStorage] Failed to read persisted data", error);
    return null;
  }
}

export function savePersistedData(data: PersistedData) {
  if (!isBrowser()) return;

  try {
    const payload = JSON.stringify(data);
    localStorage.setItem(STORAGE_KEY, payload);
  } catch (error) {
    console.warn("[localStorage] Failed to save persisted data", error);
  }
}

export function clearPersistedData() {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("[localStorage] Failed to clear persisted data", error);
  }
}
