export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "@core/db/triMongo";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import { requireAdminOrOrgRole } from "@/lib/server/auth/org";
import { editorialItemsCol } from "@features/editorial/db";
import { EditorialStatusChangeSchema } from "@features/editorial/schemas";
import { canTransition } from "@features/editorial/status";
import { recordAuditEvent } from "@features/audit/recordAuditEvent";
import { ORG_ROLES } from "@features/org/types";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }

  const parsed = EditorialStatusChangeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  if (!parsed.data.reason || parsed.data.reason.trim().length < 3) {
    return NextResponse.json({ ok: false, error: "missing_reason" }, { status: 400 });
  }

  if (parsed.data.status === "published") {
    return NextResponse.json({ ok: false, error: "use_publish" }, { status: 400 });
  }

  const col = await editorialItemsCol();
  const item = await col.findOne({ _id: new ObjectId(id) });
  if (!item) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const gate = item.orgId
    ? await requireAdminOrOrgRole(req, String(item.orgId), [...ORG_ROLES])
    : await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;
  const actor = "user" in gate ? gate.user : gate;

  if (!canTransition(item.status, parsed.data.status)) {
    return NextResponse.json({ ok: false, error: "invalid_transition" }, { status: 400 });
  }

  const now = new Date();
  const update: Record<string, unknown> = {
    status: parsed.data.status,
    updatedAt: now,
  };
  if (parsed.data.status === "archived") {
    update.archivedAt = now;
  } else {
    update.archivedAt = null;
  }

  await col.updateOne({ _id: new ObjectId(id) }, { $set: update });
  const after = await col.findOne({ _id: new ObjectId(id) });

  await recordAuditEvent({
    scope: "editorial",
    action: "editorial.status.change",
    actorUserId: String(actor._id),
    actorIp: getRequestIp(req),
    target: { type: "editorial_item", id },
    before: item,
    after,
    reason: parsed.data.reason,
  });

  return NextResponse.json({ ok: true, item: after });
}

function getRequestIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}
