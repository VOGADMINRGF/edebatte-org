export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { coreCol, ObjectId } from "@core/db/triMongo";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import type { AuditEventDoc } from "@features/audit/types";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }

  const col = await coreCol<AuditEventDoc>("audit_events");
  const doc = await col.findOne({ _id: new ObjectId(id) });
  if (!doc) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  return NextResponse.json({
    ok: true,
    item: {
      id: String(doc._id),
      at: doc.at ? doc.at.toISOString() : null,
      scope: doc.scope,
      action: doc.action,
      target: doc.target,
      actor: {
        userId: doc.actor?.userId ? String(doc.actor.userId) : null,
        ipHash: doc.actor?.ipHash ?? null,
      },
      reason: doc.reason ?? null,
      before: doc.before ?? null,
      after: doc.after ?? null,
    },
  });
}
