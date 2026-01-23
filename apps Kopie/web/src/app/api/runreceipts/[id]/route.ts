import { NextRequest, NextResponse } from "next/server";
import { getRunReceiptById } from "@/lib/db/runReceiptsRepo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function resolveParams<T>(p: T | Promise<T>): Promise<T> {
  if (p && typeof (p as Promise<T>).then === "function") return await p;
  return p as T;
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const params = await resolveParams(ctx.params);
  const id = params?.id;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  const r = await getRunReceiptById(id);
  if (!r) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, receipt: r });
}
