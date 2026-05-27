import { NextRequest, NextResponse } from "next/server";
import { syncToSpreadsheet } from "@/lib/googleSheets";

// 簡易的なメモリ内ロック（本番ではRedis等推奨）
const locks = new Map<string, boolean>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { summaries, month } = body as {
      summaries: { staffName: string; workDays: number; workMinutes: number; overtimeMinutes: number; nightMinutes: number }[];
      month: string;
    };

    if (!Array.isArray(summaries) || !month) {
      return NextResponse.json({ error: "summaries と month は必須です" }, { status: 400 });
    }

    // 二重反映防止
    const lockKey = `${month}`;
    if (locks.get(lockKey)) {
      return NextResponse.json({ error: "既に反映処理が実行中です。完了するまでお待ちください。" }, { status: 409 });
    }

    locks.set(lockKey, true);

    try {
      const results = await syncToSpreadsheet(summaries, month);
      return NextResponse.json({ results, month });
    } finally {
      locks.delete(lockKey);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
