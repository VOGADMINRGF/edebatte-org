import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Erwartet: { text: string, analysis: any }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body?.text || !body?.analysis) {
      return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
    }
    // TODO: hier in DB speichern + optional Factcheck-Queue anwerfen
    return NextResponse.json({ ok: true, saved: true }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "ingest_failed" }, { status: 500 });
  }
}
