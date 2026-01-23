export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { graphRepairsCol } from "@features/graphAdmin/db";
import { GraphMergeSuggestSchema } from "@features/graphAdmin/schemas";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import { recordAuditEvent } from "@features/audit/recordAuditEvent";

export async function POST(req: NextRequest) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const parsed = GraphMergeSuggestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const now = new Date();
  const col = await graphRepairsCol();
  const insert = await col.insertOne({
    type: "merge_suggest",
    status: "pending",
    payload: {
      aId: parsed.data.aId,
      bId: parsed.data.bId,
      reason: parsed.data.reason ?? null,
    },
    createdByUserId: gate._id ?? null,
    createdAt: now,
    updatedAt: now,
  });

  await recordAuditEvent({
    scope: "graph",
    action: "graph.repair.merge_suggest",
    actorUserId: String(gate._id),
    actorIp: getRequestIp(req),
    target: { type: "graph_repair", id: String(insert.insertedId) },
    after: { id: String(insert.insertedId), type: "merge_suggest" },
    reason: parsed.data.reason ?? null,
  });

  return NextResponse.json({ ok: true, ticketId: String(insert.insertedId) });
}

function getRequestIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}
