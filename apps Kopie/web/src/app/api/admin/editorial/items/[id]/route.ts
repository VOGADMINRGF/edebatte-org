export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "@core/db/triMongo";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import { requireAdminOrOrgRole } from "@/lib/server/auth/org";
import { editorialItemsCol } from "@features/editorial/db";
import { EditorialItemPatchSchema } from "@features/editorial/schemas";
import { recordAuditEvent } from "@features/audit/recordAuditEvent";
import { ORG_ROLES } from "@features/org/types";
import type { EditorialItemDoc } from "@features/editorial/types";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }

  const col = await editorialItemsCol();
  const item = await col.findOne({ _id: new ObjectId(id) });
  if (!item) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const gate = item.orgId
    ? await requireAdminOrOrgRole(req, String(item.orgId), [...ORG_ROLES])
    : await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  return NextResponse.json({ ok: true, item: serializeItem(item) });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }

  const col = await editorialItemsCol();
  const item = await col.findOne({ _id: new ObjectId(id) });
  if (!item) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const gate = item.orgId
    ? await requireAdminOrOrgRole(req, String(item.orgId), [...ORG_ROLES])
    : await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;
  const actor = "user" in gate ? gate.user : gate;

  const parsed = EditorialItemPatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.intake?.topicKey !== undefined) {
    update["intake.topicKey"] = parsed.data.intake.topicKey;
  }
  if (parsed.data.intake?.regionCode !== undefined) {
    update["intake.regionCode"] = parsed.data.intake.regionCode;
  }
  if (parsed.data.flags?.needsPIIRedaction !== undefined) {
    update["flags.needsPIIRedaction"] = parsed.data.flags.needsPIIRedaction;
  }
  if (parsed.data.flags?.conflictLikely !== undefined) {
    update["flags.conflictLikely"] = parsed.data.flags.conflictLikely;
  }
  if (parsed.data.flags?.duplicateOf !== undefined) {
    update["flags.duplicateOf"] = parsed.data.flags.duplicateOf && ObjectId.isValid(parsed.data.flags.duplicateOf)
      ? new ObjectId(parsed.data.flags.duplicateOf)
      : null;
  }

  await col.updateOne({ _id: new ObjectId(id) }, { $set: update });
  const after = await col.findOne({ _id: new ObjectId(id) });

  await recordAuditEvent({
    scope: "editorial",
    action: "editorial.update",
    actorUserId: String(actor._id),
    actorIp: getRequestIp(req),
    target: { type: "editorial_item", id },
    before: item,
    after,
  });

  return NextResponse.json({ ok: true, item: after ? serializeItem(after) : null });
}

function serializeItem(item: EditorialItemDoc) {
  return {
    id: item._id ? String(item._id) : undefined,
    orgId: item.orgId ? String(item.orgId) : null,
    intake: {
      ...item.intake,
      receivedAt: item.intake.receivedAt ? new Date(item.intake.receivedAt).toISOString() : null,
    },
    status: item.status,
    assignment: {
      ownerUserId: item.assignment.ownerUserId ? String(item.assignment.ownerUserId) : null,
      dueAt: item.assignment.dueAt ? new Date(item.assignment.dueAt).toISOString() : null,
      slaHours: item.assignment.slaHours ?? null,
    },
    flags: {
      ...item.flags,
      duplicateOf: item.flags.duplicateOf ? String(item.flags.duplicateOf) : null,
    },
    createdBy: {
      ...item.createdBy,
      userId: item.createdBy.userId ? String(item.createdBy.userId) : null,
    },
    published: {
      ...item.published,
      publishedAt: item.published.publishedAt ? new Date(item.published.publishedAt).toISOString() : null,
      publishedByUserId: item.published.publishedByUserId
        ? String(item.published.publishedByUserId)
        : null,
    },
    createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : null,
    updatedAt: item.updatedAt ? new Date(item.updatedAt).toISOString() : null,
    archivedAt: item.archivedAt ? new Date(item.archivedAt).toISOString() : null,
  };
}

function getRequestIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}
