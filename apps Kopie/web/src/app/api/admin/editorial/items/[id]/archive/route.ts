export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ObjectId } from "@core/db/triMongo";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import { requireAdminOrOrgRole } from "@/lib/server/auth/org";
import { editorialItemsCol } from "@features/editorial/db";
import { recordAuditEvent } from "@features/audit/recordAuditEvent";
import { ORG_ROLES } from "@features/org/types";

const BodySchema = z.object({
  reason: z.string().min(3).max(300),
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const col = await editorialItemsCol();
  const item = await col.findOne({ _id: new ObjectId(id) });
  if (!item) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const gate = item.orgId
    ? await requireAdminOrOrgRole(req, String(item.orgId), [...ORG_ROLES])
    : await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;
  const actor = "user" in gate ? gate.user : gate;

  const now = new Date();
  await col.updateOne(
    { _id: new ObjectId(id) },
    { $set: { status: "archived", archivedAt: now, updatedAt: now } },
  );
  const after = await col.findOne({ _id: new ObjectId(id) });

  await recordAuditEvent({
    scope: "editorial",
    action: "editorial.archive",
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
