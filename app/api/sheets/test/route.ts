import { NextResponse } from "next/server";
import { readStaffNames } from "@/lib/googleSheets";

export async function GET() {
  try {
    const names = await readStaffNames();
    return NextResponse.json({ success: true, staffNames: names });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
