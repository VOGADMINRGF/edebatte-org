import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json({
    ok: true,
    skipped: true,
    reason: "ensureGraph disabled in this build",
  });
}
