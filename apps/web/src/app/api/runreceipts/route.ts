import { NextRequest, NextResponse } from "next/server";
import { upsertRunReceipt, listRunReceipts } from "@/lib/db/runReceiptsRepo";
import { RunReceiptSchema } from "@features/analyze/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 24_000;

export async function POST(req: NextRequest) {
  try {
    const contentLength = Number(req.headers.get("content-length") ?? "0");
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ ok: false, error: "payload_too_large" }, { status: 413 });
    }

    const raw = await req.json().catch(() => null);
    const normalized =
      raw && typeof raw === "object" && !Array.isArray(raw)
        ? ({ ...(raw as any), id: (raw as any).id ?? (raw as any).runId } as any)
        : raw;

    const parsed = RunReceiptSchema.safeParse(normalized);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "invalid_payload", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const { id } = await upsertRunReceipt(parsed.data);
    return NextResponse.json({ ok: true, id });
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Number(url.searchParams.get("limit") ?? "25");
    const items = await listRunReceipts(limit);
    return NextResponse.json({ ok: true, items });
  } catch {
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
