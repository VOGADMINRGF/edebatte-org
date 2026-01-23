import { NextRequest, NextResponse } from "next/server";
import { emitStreamEvent } from "@/services/core/stream";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || !body.type)
    return NextResponse.json({ error: "type required" }, { status: 400 });

  const { created, idempotencyKey } = await emitStreamEvent(body);
  return NextResponse.json({ ok: true, created, idempotencyKey });
}
