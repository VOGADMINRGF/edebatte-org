import { NextRequest, NextResponse } from "next/server";
import { analyzePendingStatementCandidates } from "@features/feeds/analyzePending";
import { requireAdminOrEditor } from "../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const gate = await requireAdminOrEditor(request);
  if (gate) return gate;

  let limit: number | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    if (body && typeof body.limit === "number" && Number.isFinite(body.limit)) {
      limit = Math.max(1, Math.min(50, Math.floor(body.limit)));
    }
  } catch {
    // ignore body parse errors
  }

  try {
    const result = await analyzePendingStatementCandidates({
      limit,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error: any) {
    console.error("[/api/feeds/analyze-pending] error", error);
    return NextResponse.json(
      {
        ok: false,
        error: "analyze_pending_failed",
      },
      { status: 500 },
    );
  }
}
