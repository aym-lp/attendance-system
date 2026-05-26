import { google } from "googleapis";

const SHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "";
const SHEET_NAME = process.env.GOOGLE_SHEETS_SHEET_NAME || "Sheet1";

// スプレッドシート構造定義：スタッフ名セルを基準に各データセルの相対位置
const STAFF_LAYOUT = {
  "和島亜純": { nameCell: "A5", workDays: "B5", workHours: "C5", overtimeHours: "D5", holidayHours: "E5", basePay: "B8", overtimePay: "C8", transportPay: "D8", holidayPay: "E9" },
  "和島 亜純": { nameCell: "A5", workDays: "B5", workHours: "C5", overtimeHours: "D5", holidayHours: "E5", basePay: "B8", overtimePay: "C8", transportPay: "D8", holidayPay: "E9" },
  "小野林茜": { nameCell: "A21", workDays: "B21", workHours: "C21", overtimeHours: "D21", holidayHours: "E21", basePay: "B23", overtimePay: "C23", transportPay: "D23", holidayPay: "E23" },
  "小野林 茜": { nameCell: "A21", workDays: "B21", workHours: "C21", overtimeHours: "D21", holidayHours: "E21", basePay: "B23", overtimePay: "C23", transportPay: "D23", holidayPay: "E23" },
  "樋口凛": { nameCell: "A35", workDays: "B35", workHours: "C35", overtimeHours: "D35", holidayHours: "E35", basePay: "B37", overtimePay: "C37", transportPay: "D37", holidayPay: "E37" },
  "樋口 凛": { nameCell: "A35", workDays: "B35", workHours: "C35", overtimeHours: "D35", holidayHours: "E35", basePay: "B37", overtimePay: "C37", transportPay: "D37", holidayPay: "E37" },
  "杉本羅希": { nameCell: "A50", workDays: "B50", workHours: "C50", overtimeHours: "D50", holidayHours: "E50", basePay: "B52", overtimePay: "C52", transportPay: "D52", holidayPay: "E52" },
  "杉本 羅希": { nameCell: "A50", workDays: "B50", workHours: "C50", overtimeHours: "D50", holidayHours: "E50", basePay: "B52", overtimePay: "C52", transportPay: "D52", holidayPay: "E52" },
} as const;

export type StaffSpreadsheetLayout = typeof STAFF_LAYOUT;
export type SyncField = "workDays" | "workHours" | "overtimeHours" | "holidayHours";

export interface SyncPreview {
  staffName: string;
  fields: { key: SyncField; cell: string; currentValue: string | null; newValue: string }[];
}

export interface SyncResult {
  staffName: string;
  success: boolean;
  updatedCells: string[];
  error?: string;
}

function getAuth() {
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error("Google Sheets API 認証情報が設定されていません。GOOGLE_SHEETS_CLIENT_EMAIL と GOOGLE_SHEETS_PRIVATE_KEY を .env.local に設定してください。");
  }

  return new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function getSheetsClient() {
  const auth = getAuth();
  return google.sheets({ version: "v4", auth });
}

function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

export async function readStaffNames(): Promise<string[]> {
  const sheets = getSheetsClient();
  const nameCells = Object.values(STAFF_LAYOUT).map((l) => l.nameCell);
  const uniqueCells = [...new Set(nameCells)];

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!${uniqueCells.join(",")}`,
  });

  return (response.data.values?.flat() ?? []).filter(Boolean) as string[];
}

export async function buildSyncPreview(
  summaries: { staffName: string; workDays: number; workMinutes: number; overtimeMinutes: number; nightMinutes: number }[]
): Promise<SyncPreview[]> {
  const sheets = getSheetsClient();
  const previews: SyncPreview[] = [];

  // すべての対象セルを一括取得
  const allCells: string[] = [];
  for (const summary of summaries) {
    const layout = findLayout(summary.staffName);
    if (layout) {
      allCells.push(layout.workDays, layout.workHours, layout.overtimeHours, layout.holidayHours);
    }
  }

  if (allCells.length === 0) return [];

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!${allCells.join(",")}`,
    valueRenderOption: "UNFORMATTED_VALUE",
  });

  const flatValues = response.data.values?.flat() ?? [];
  let valueIndex = 0;

  for (const summary of summaries) {
    const layout = findLayout(summary.staffName);
    if (!layout) continue;

    const fields: SyncPreview["fields"] = [];

    const mappings: { key: SyncField; cell: string; value: number }[] = [
      { key: "workDays", cell: layout.workDays, value: summary.workDays },
      { key: "workHours", cell: layout.workHours, value: minutesToHours(summary.workMinutes) },
      { key: "overtimeHours", cell: layout.overtimeHours, value: minutesToHours(summary.overtimeMinutes) },
      { key: "holidayHours", cell: layout.holidayHours, value: minutesToHours(summary.nightMinutes) },
    ];

    for (const m of mappings) {
      const currentValue = flatValues[valueIndex] !== undefined ? String(flatValues[valueIndex]) : null;
      valueIndex++;
      fields.push({
        key: m.key,
        cell: m.cell,
        currentValue,
        newValue: String(m.value),
      });
    }

    previews.push({ staffName: summary.staffName, fields });
  }

  return previews;
}

export async function syncToSpreadsheet(
  summaries: { staffName: string; workDays: number; workMinutes: number; overtimeMinutes: number; nightMinutes: number }[]
): Promise<SyncResult[]> {
  const sheets = getSheetsClient();
  const results: SyncResult[] = [];

  for (const summary of summaries) {
    const layout = findLayout(summary.staffName);
    if (!layout) {
      results.push({
        staffName: summary.staffName,
        success: false,
        updatedCells: [],
        error: "スプレッドシート上の配置が見つかりません",
      });
      continue;
    }

    try {
      const values = [
        [summary.workDays],
        [minutesToHours(summary.workMinutes)],
        [minutesToHours(summary.overtimeMinutes)],
        [minutesToHours(summary.nightMinutes)],
      ];

      const ranges = [
        { range: `${SHEET_NAME}!${layout.workDays}`, values: [[summary.workDays]] },
        { range: `${SHEET_NAME}!${layout.workHours}`, values: [[minutesToHours(summary.workMinutes)]] },
        { range: `${SHEET_NAME}!${layout.overtimeHours}`, values: [[minutesToHours(summary.overtimeMinutes)]] },
        { range: `${SHEET_NAME}!${layout.holidayHours}`, values: [[minutesToHours(summary.nightMinutes)]] },
      ];

      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: {
          valueInputOption: "USER_ENTERED",
          data: ranges,
        },
      });

      results.push({
        staffName: summary.staffName,
        success: true,
        updatedCells: [layout.workDays, layout.workHours, layout.overtimeHours, layout.holidayHours],
      });
    } catch (err) {
      results.push({
        staffName: summary.staffName,
        success: false,
        updatedCells: [],
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
}

function findLayout(staffName: string) {
  // 全角スペースありなし両方で検索
  const key = Object.keys(STAFF_LAYOUT).find((k) =>
    k.replace(/\s/g, "") === staffName.replace(/\s/g, "")
  );
  return key ? STAFF_LAYOUT[key as keyof typeof STAFF_LAYOUT] : null;
}

export function getLayoutForStaff(staffName: string) {
  return findLayout(staffName);
}

export { SHEET_ID, SHEET_NAME };
