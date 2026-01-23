export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "@core/db/triMongo";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import { requireAdminOrOrgRole } from "@/lib/server/auth/org";
import { editorialItemsCol, evidenceSourcesCol } from "@features/editorial/db";
import { recordAuditEvent } from "@features/audit/recordAuditEvent";
import { ORG_ROLES } from "@features/org/types";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; sourceId: string }> },
) {
  const { id, sourceId } = await ctx.params;
  if (!ObjectId.isValid(id) || !ObjectId.isValid(sourceId)) {
    return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }

  const itemsCol = await editorialItemsCol();
  const item = await itemsCol.findOne({ _id: new ObjectId(id) });
  if (!item) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const gate = item.orgId
    ? await requireAdminOrOrgRole(req, String(item.orgId), [...ORG_ROLES])
    : await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;
  const actor = "user" in gate ? gate.user : gate;

  const sourcesCol = await evidenceSourcesCol();
  const before = await sourcesCol.findOne({ _id: new ObjectId(sourceId) });
  if (!before) return NextResponse.json({ ok: false, error: "source_not_found" }, { status: 404 });

  const now = new Date();
  await sourcesCol.updateOne(
    { _id: new ObjectId(sourceId) },
    { $set: { disabledAt: now, updatedAt: now } },
  );
  const after = await sourcesCol.findOne({ _id: new ObjectId(sourceId) });

  await recordAuditEvent({
    scope: "editorial",
    action: "editorial.source.remove",
    actorUserId: String(actor._id),
    actorIp: getRequestIp(req),
    target: { type: "evidence_source", id: sourceId },
    before,
    after,
  });

  return NextResponse.json({ ok: true, item: after });
}

function getRequestIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}
