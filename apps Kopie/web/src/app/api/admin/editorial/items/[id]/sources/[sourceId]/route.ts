export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "@core/db/triMongo";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import { requireAdminOrOrgRole } from "@/lib/server/auth/org";
import { editorialItemsCol, evidenceSourcesCol } from "@features/editorial/db";
import { EvidenceSourcePatchSchema } from "@features/editorial/schemas";
import { recordAuditEvent } from "@features/audit/recordAuditEvent";
import { ORG_ROLES } from "@features/org/types";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; sourceId: string }> },
) {
  const { id, sourceId } = await ctx.params;
  if (!ObjectId.isValid(id) || !ObjectId.isValid(sourceId)) {
    return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }

  const parsed = EvidenceSourcePatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
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

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.title !== undefined) update.title = parsed.data.title;
  if (parsed.data.publisher !== undefined) update.publisher = parsed.data.publisher;
  if (parsed.data.publishedAt !== undefined) {
    update.publishedAt = parsed.data.publishedAt ? new Date(parsed.data.publishedAt) : null;
  }
  if (parsed.data.quote !== undefined) update.quote = parsed.data.quote;
  if (parsed.data.reliability !== undefined) update.reliability = parsed.data.reliability;
  if (parsed.data.biasTag !== undefined) update.biasTag = parsed.data.biasTag;
  if (parsed.data.disabledAt !== undefined) {
    update.disabledAt = parsed.data.disabledAt ? new Date(parsed.data.disabledAt) : null;
  }

  await sourcesCol.updateOne({ _id: new ObjectId(sourceId) }, { $set: update });
  const after = await sourcesCol.findOne({ _id: new ObjectId(sourceId) });

  await recordAuditEvent({
    scope: "editorial",
    action: "editorial.source.update",
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
