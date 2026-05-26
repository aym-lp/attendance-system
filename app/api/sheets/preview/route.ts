import { NextRequest, NextResponse } from "next/server";
import { buildSyncPreview } from "@/lib/googleSheets";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { summaries } = body as {
      summaries: { staffName: string; workDays: number; workMinutes: number; overtimeMinutes: number; nightMinutes: number }[];
    };

    if (!Array.isArray(summaries)) {
      return NextResponse.json({ error: "summaries must be an array" }, { status: 400 });
    }

    const preview = await buildSyncPreview(summaries);
    return NextResponse.json({ preview });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
