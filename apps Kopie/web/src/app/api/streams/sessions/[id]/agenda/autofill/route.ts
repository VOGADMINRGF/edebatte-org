export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { applyAutofilledAgendaToSession } from "@core/streams/agenda";
import { enforceStreamHost, requireCreatorContext } from "../../../../utils";
import { rateLimitOrThrow } from "@/utils/rateLimitHelpers";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const ctx = await requireCreatorContext(req);
  if (!ctx) {
    return NextResponse.json({ ok: false, error: "AUTH_REQUIRED" }, { status: 401 });
  }
  const gating = await enforceStreamHost(ctx);
  if (gating) return gating;

  const { id } = await context.params;
  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  const rl = await rateLimitOrThrow(
    `stream:agenda:autofill:${ctx.userId}:${id}:${ip}`,
    10,
    15 * 60 * 1000,
    {
      salt: "stream-agenda-autofill",
    },
  );
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited", retryInMs: rl.retryIn },
      { status: 429 },
    );
  }

  try {
    const { agenda } = await applyAutofilledAgendaToSession(id);
    const safeAgenda = agenda.map((item) => ({
      ...item,
      _id: item._id?.toString?.() ?? undefined,
      sessionId: item.sessionId.toString(),
    }));
    return NextResponse.json({ ok: true, sessionId: id, agenda: safeAgenda });
  } catch (err: any) {
    const message = typeof err?.message === "string" ? err.message : "unknown_error";
    if (message === "SESSION_NOT_FOUND") {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }
    if (message === "TOPIC_REQUIRED") {
      return NextResponse.json({ ok: false, error: "topic_required" }, { status: 400 });
    }
    if (message === "TOPIC_EMPTY") {
      return NextResponse.json({ ok: false, error: "topic_not_ready" }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: "autofill_failed" }, { status: 500 });
  }
}
