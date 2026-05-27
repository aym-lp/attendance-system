import "server-only";

function getAppsScriptUrl(): string {
  const value =
    process.env.GOOGLE_APPS_SCRIPT_WEB_APP_URL ??
    process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_WEB_APP_URL ??
    "";
  return value.trim();
}

function getAppsScriptToken(): string {
  const value =
    process.env.GOOGLE_APPS_SCRIPT_WEB_APP_TOKEN ??
    process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_WEB_APP_TOKEN ??
    "";
  return value.trim();
}

// スプレッドシート構造定義：スタッフ名セルを基準に各データセルの相対位置
const STAFF_LAYOUT = {
  "和島亜純": {
    nameCell: "A5",
    workDays: "B6",
    workHours: "C6",
    overtimeHours: "D6",
    holidayHours: "E6",
    basePay: "B8",
    overtimePay: "C8",
    transportationAllowance: "D8",
    holidayAllowance: "E8",
  },
  "和島 亜純": {
    nameCell: "A5",
    workDays: "B6",
    workHours: "C6",
    overtimeHours: "D6",
    holidayHours: "E6",
    basePay: "B8",
    overtimePay: "C8",
    transportationAllowance: "D8",
    holidayAllowance: "E8",
  },
  "小野林茜": {
    nameCell: "A21",
    workDays: "B21",
    workHours: "C21",
    overtimeHours: "D21",
    holidayHours: "E21",
    basePay: "B23",
    overtimePay: "C23",
    transportationAllowance: "D23",
    holidayAllowance: "E23",
  },
  "小野林 茜": {
    nameCell: "A21",
    workDays: "B21",
    workHours: "C21",
    overtimeHours: "D21",
    holidayHours: "E21",
    basePay: "B23",
    overtimePay: "C23",
    transportationAllowance: "D23",
    holidayAllowance: "E23",
  },
  "樋口凛": {
    nameCell: "A35",
    workDays: "B35",
    workHours: "C35",
    overtimeHours: "D35",
    holidayHours: "E35",
    basePay: "B37",
    overtimePay: "C37",
    transportationAllowance: "D37",
    holidayAllowance: "E37",
  },
  "樋口 凛": {
    nameCell: "A35",
    workDays: "B35",
    workHours: "C35",
    overtimeHours: "D35",
    holidayHours: "E35",
    basePay: "B37",
    overtimePay: "C37",
    transportationAllowance: "D37",
    holidayAllowance: "E37",
  },
  "杉本羅希": {
    nameCell: "A50",
    workDays: "B50",
    workHours: "C50",
    overtimeHours: "D50",
    holidayHours: "E50",
    basePay: "B52",
    overtimePay: "C52",
    transportationAllowance: "D52",
    holidayAllowance: "E52",
  },
  "杉本 羅希": {
    nameCell: "A50",
    workDays: "B50",
    workHours: "C50",
    overtimeHours: "D50",
    holidayHours: "E50",
    basePay: "B52",
    overtimePay: "C52",
    transportationAllowance: "D52",
    holidayAllowance: "E52",
  },
  "出嶋晴翔": {
    nameCell: "A65",
    workDays: "B65",
    workHours: "C65",
    overtimeHours: "D65",
    holidayHours: "E65",
    basePay: "B67",
    overtimePay: "C67",
    transportationAllowance: "D67",
    holidayAllowance: "E67",
  },
  "出嶋 晴翔": {
    nameCell: "A65",
    workDays: "B65",
    workHours: "C65",
    overtimeHours: "D65",
    holidayHours: "E65",
    basePay: "B67",
    overtimePay: "C67",
    transportationAllowance: "D67",
    holidayAllowance: "E67",
  },
} as const;

export type StaffSpreadsheetLayout = typeof STAFF_LAYOUT;
export type SyncField =
  | "workDays"
  | "workHours"
  | "overtimeHours"
  | "holidayHours"
  | "basePay"
  | "overtimePay"
  | "transportationAllowance"
  | "holidayAllowance";

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
  allowanceMinutes: number;
  basePay: number;
  overtimePay: number;
  transportationAllowance: number;
  holidayAllowance: number;
}

const FIELD_ORDER: SyncField[] = ["workDays", "workHours", "overtimeHours", "holidayHours", "basePay", "overtimePay", "transportationAllowance", "holidayAllowance"];

function minutesToTimeString(minutes: number): string {
  const safeMinutes = Number.isFinite(minutes) ? Math.max(0, Math.round(minutes)) : 0;
  const hours = Math.floor(safeMinutes / 60);
  const rest = safeMinutes % 60;
  return `${hours}:${rest.toString().padStart(2, "0")}`;
}

function ensureScriptUrl(url: string) {
  if (!url) {
    throw new Error("Google Apps Script Web App の URL が .env.local に設定されていません (GOOGLE_APPS_SCRIPT_WEB_APP_URL)。");
  }
}

async function callAppsScript<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  const url = getAppsScriptUrl();
  const token = getAppsScriptToken();

  ensureScriptUrl(url);

  if (process.env.NODE_ENV !== "production") {
    console.log("[googleSheets] APP_SCRIPT_URL loaded:", url ? "set" : "missing");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    redirect: "follow",
    body: JSON.stringify({ action, token: token || undefined, payload }),
  });

  const text = await response.text();

  let data: any;
  try {
    const isJson = response.headers.get("content-type")?.includes("application/json");
    data = isJson && text ? JSON.parse(text) : text ? JSON.parse(text) : {};
  } catch (error) {
    const snippet = text.length > 200 ? `${text.slice(0, 200)}...` : text;
    throw new Error(`Google Apps Script の応答をJSONとして解析できませんでした。Web App の公開設定（誰でもアクセス可能）とレスポンス内容を確認してください。受信データ: ${snippet}`);
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
        { key: "workHours", cell: layout.workHours, newValue: minutesToTimeString(summary.workMinutes) },
        { key: "overtimeHours", cell: layout.overtimeHours, newValue: minutesToTimeString(summary.overtimeMinutes) },
        { key: "holidayHours", cell: layout.holidayHours, newValue: minutesToTimeString(summary.allowanceMinutes) },
        { key: "basePay", cell: layout.basePay, newValue: String(summary.basePay) },
        { key: "overtimePay", cell: layout.overtimePay, newValue: String(summary.overtimePay) },
        { key: "transportationAllowance", cell: layout.transportationAllowance, newValue: String(summary.transportationAllowance) },
        { key: "holidayAllowance", cell: layout.holidayAllowance, newValue: String(summary.holidayAllowance) },
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

export { getAppsScriptUrl };
