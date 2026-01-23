export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ObjectId } from "@core/db/triMongo";
import { graphRepairsCol } from "@features/graphAdmin/db";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import { recordAuditEvent } from "@features/audit/recordAuditEvent";

const BodySchema = z.object({
  reason: z.string().min(3).max(300),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ ticketId: string }> },
) {
  const { ticketId } = await ctx.params;
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  if (!ObjectId.isValid(ticketId)) {
    return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const col = await graphRepairsCol();
  const ticket = await col.findOne({ _id: new ObjectId(ticketId) });
  if (!ticket) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const now = new Date();
  await col.updateOne(
    { _id: new ObjectId(ticketId) },
    {
      $set: {
        status: "rejected",
        rejectedAt: now,
        rejectedByUserId: gate._id ?? null,
        rejectReason: parsed.data.reason,
        updatedAt: now,
      },
    },
  );

  await recordAuditEvent({
    scope: "graph",
    action: "graph.repair.reject",
    actorUserId: String(gate._id),
    actorIp: getRequestIp(req),
    target: { type: "graph_repair", id: ticketId },
    before: ticket,
    after: { ...ticket, status: "rejected" },
    reason: parsed.data.reason,
  });

  return NextResponse.json({ ok: true, rejectedAt: now.toISOString() });
}

function getRequestIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}
