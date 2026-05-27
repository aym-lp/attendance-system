const APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_WEB_APP_URL ?? "";
const APPS_SCRIPT_TOKEN = process.env.GOOGLE_APPS_SCRIPT_WEB_APP_TOKEN ?? "";

// スプレッドシート構造定義：スタッフ名セルを基準に各データセルの相対位置
const STAFF_LAYOUT = {
  "和島亜純": { nameCell: "A5", workDays: "B5", workHours: "C5", overtimeHours: "D5", holidayHours: "E5" },
  "和島 亜純": { nameCell: "A5", workDays: "B5", workHours: "C5", overtimeHours: "D5", holidayHours: "E5" },
  "小野林茜": { nameCell: "A21", workDays: "B21", workHours: "C21", overtimeHours: "D21", holidayHours: "E21" },
  "小野林 茜": { nameCell: "A21", workDays: "B21", workHours: "C21", overtimeHours: "D21", holidayHours: "E21" },
  "樋口凛": { nameCell: "A35", workDays: "B35", workHours: "C35", overtimeHours: "D35", holidayHours: "E35" },
  "樋口 凛": { nameCell: "A35", workDays: "B35", workHours: "C35", overtimeHours: "D35", holidayHours: "E35" },
  "杉本羅希": { nameCell: "A50", workDays: "B50", workHours: "C50", overtimeHours: "D50", holidayHours: "E50" },
  "杉本 羅希": { nameCell: "A50", workDays: "B50", workHours: "C50", overtimeHours: "D50", holidayHours: "E50" },
} as const;

export type StaffSpreadsheetLayout = typeof STAFF_LAYOUT;
export type SyncField = "workDays" | "workHours" | "overtimeHours" | "holidayHours";

export interface SyncPreviewField {
  key: SyncField;
  cell: string;
  currentValue: string | null;
  newValue: string;
}

export interface SyncPreview {
  staffName: string;
  fields: SyncPreviewField[];
}

export interface SyncResult {
  staffName: string;
  success: boolean;
  updatedCells: string[];
  error?: string;
}

interface SyncSummary {
  staffName: string;
  workDays: number;
  workMinutes: number;
  overtimeMinutes: number;
  nightMinutes: number;
}

const FIELD_ORDER: SyncField[] = ["workDays", "workHours", "overtimeHours", "holidayHours"];

function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

function ensureScriptUrl() {
  if (!APPS_SCRIPT_URL) {
    throw new Error("Google Apps Script Web App の URL が .env.local に設定されていません (GOOGLE_APPS_SCRIPT_WEB_APP_URL)。");
  }
}

async function callAppsScript<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  ensureScriptUrl();

  const response = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, token: APPS_SCRIPT_TOKEN || undefined, payload }),
  });

  const text = await response.text();

  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (error) {
    throw new Error(`Google Apps Script の応答をJSONとして解析できませんでした: ${text}`);
  }

  if (!response.ok || data?.success === false) {
    const reason = data?.error ?? `Google Apps Script がエラーを返しました (status: ${response.status})`;
    throw new Error(typeof reason === "string" ? reason : JSON.stringify(reason));
  }

  return data as T;
}

function findLayout(staffName: string) {
  const key = Object.keys(STAFF_LAYOUT).find((k) => k.replace(/\s/g, "") === staffName.replace(/\s/g, ""));
  return key ? STAFF_LAYOUT[key as keyof typeof STAFF_LAYOUT] : null;
}

function buildSyncItems(summaries: SyncSummary[]) {
  return summaries
    .map((summary) => {
      const layout = findLayout(summary.staffName);
      if (!layout) return null;

      const fields: { key: SyncField; cell: string; newValue: string }[] = [
        { key: "workDays", cell: layout.workDays, newValue: String(summary.workDays) },
        { key: "workHours", cell: layout.workHours, newValue: String(minutesToHours(summary.workMinutes)) },
        { key: "overtimeHours", cell: layout.overtimeHours, newValue: String(minutesToHours(summary.overtimeMinutes)) },
        { key: "holidayHours", cell: layout.holidayHours, newValue: String(minutesToHours(summary.nightMinutes)) },
      ];

      return {
        staffName: summary.staffName,
        fields,
      };
    })
    .filter((item): item is { staffName: string; fields: { key: SyncField; cell: string; newValue: string }[] } => item !== null);
}

export async function readStaffNames(): Promise<string[]> {
  const data = await callAppsScript<{ success: true; staffNames?: string[] }>("test", {});
  return data.staffNames ?? [];
}

export async function buildSyncPreview(summaries: SyncSummary[]): Promise<SyncPreview[]> {
  const items = buildSyncItems(summaries);
  if (items.length === 0) return [];

  const data = await callAppsScript<{ success: true; preview: SyncPreview[] }>("preview", { items });

  return data.preview.map((entry) => ({
    staffName: entry.staffName,
    fields: entry.fields
      .filter((field) => FIELD_ORDER.includes(field.key as SyncField))
      .map((field) => ({
        key: field.key as SyncField,
        cell: field.cell,
        currentValue: field.currentValue ?? null,
        newValue: field.newValue,
      })),
  }));
}

export async function syncToSpreadsheet(summaries: SyncSummary[], month: string): Promise<SyncResult[]> {
  const items = buildSyncItems(summaries);
  if (items.length === 0) {
    return summaries.map((summary) => ({
      staffName: summary.staffName,
      success: false,
      updatedCells: [],
      error: "スプレッドシート上の配置が見つかりません",
    }));
  }

  const data = await callAppsScript<{ success: true; results: SyncResult[] }>("sync", { month, items });

  return data.results.map((result) => ({
    staffName: result.staffName,
    success: result.success,
    updatedCells: result.updatedCells,
    error: result.error,
  }));
}

export function getLayoutForStaff(staffName: string) {
  return findLayout(staffName);
}

export { APPS_SCRIPT_URL };
