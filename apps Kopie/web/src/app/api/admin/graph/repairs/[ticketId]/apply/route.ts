export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "@core/db/triMongo";
import { getGraphDriver } from "@core/graph/driver";
import { graphRepairsCol } from "@features/graphAdmin/db";
import { GraphRepairApplySchema } from "@features/graphAdmin/schemas";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import { recordAuditEvent } from "@features/audit/recordAuditEvent";

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

  const parsed = GraphRepairApplySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const col = await graphRepairsCol();
  const ticket = await col.findOne({ _id: new ObjectId(ticketId) });
  if (!ticket) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  if (ticket.status !== "pending") {
    return NextResponse.json({ ok: false, error: "not_pending" }, { status: 400 });
  }

  const applied = await applyGraphRepair(ticket);
  if (!applied.ok) {
    return NextResponse.json({ ok: false, error: applied.error }, { status: applied.status ?? 500 });
  }

  const now = new Date();
  await col.updateOne(
    { _id: new ObjectId(ticketId) },
    {
      $set: {
        status: "applied",
        appliedAt: now,
        appliedByUserId: gate._id ?? null,
        updatedAt: now,
      },
    },
  );

  await recordAuditEvent({
    scope: "graph",
    action: "graph.repair.apply",
    actorUserId: String(gate._id),
    actorIp: getRequestIp(req),
    target: { type: "graph_repair", id: ticketId },
    before: ticket,
    after: { ...ticket, status: "applied" },
    reason: parsed.data.reason ?? null,
  });

  return NextResponse.json({ ok: true, appliedAt: now.toISOString() });
}

async function applyGraphRepair(ticket: any) {
  const driver = getGraphDriver();
  if (!driver) return { ok: false, error: "graph_unavailable", status: 503 } as const;

  const session = driver.session();
  try {
    if (ticket.type === "merge_suggest") {
      const aId = ticket.payload?.aId;
      const bId = ticket.payload?.bId;
      if (!aId || !bId) return { ok: false, error: "missing_payload" } as const;
      await session.run(
        `
        MATCH (a {id: $aId}), (b {id: $bId})
        MERGE (a)-[:MERGED_INTO]->(b)
        SET a.mergedInto = $bId,
            a.mergedAt = timestamp()
        `,
        { aId, bId },
      );
      return { ok: true } as const;
    }

    if (ticket.type === "relink") {
      const fromId = ticket.payload?.fromId;
      const toId = ticket.payload?.toId;
      if (!fromId || !toId) return { ok: false, error: "missing_payload" } as const;
      await session.run(
        `
        MATCH (a {id: $fromId}), (b {id: $toId})
        MERGE (a)-[:RELINKED_TO]->(b)
        SET a.relinkTo = $toId,
            a.relinkedAt = timestamp()
        `,
        { fromId, toId },
      );
      return { ok: true } as const;
    }

    return { ok: false, error: "unsupported_type" } as const;
  } catch (err: any) {
    return { ok: false, error: err?.message ?? "graph_error" } as const;
  } finally {
    await session.close();
  }
}

function getRequestIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}
