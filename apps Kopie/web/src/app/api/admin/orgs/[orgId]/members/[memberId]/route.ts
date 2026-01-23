export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "@core/db/triMongo";
import { orgMembershipsCol } from "@features/org/db";
import { OrgMemberPatchSchema } from "@features/org/schemas";
import { requireAdminOrOrgRole } from "@/lib/server/auth/org";
import { recordAuditEvent } from "@features/audit/recordAuditEvent";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ orgId: string; memberId: string }> },
) {
  const { orgId, memberId } = await ctx.params;
  const gate = await requireAdminOrOrgRole(req, orgId, ["org_admin"]);
  if (gate instanceof Response) return gate;

  if (!ObjectId.isValid(orgId) || !ObjectId.isValid(memberId)) {
    return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }

  const parsed = OrgMemberPatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.role) update.role = parsed.data.role;
  if (parsed.data.status) {
    update.status = parsed.data.status;
    update.disabledAt = parsed.data.status === "disabled" ? new Date() : null;
  }

  const memberships = await orgMembershipsCol();
  const before = await memberships.findOne({ _id: new ObjectId(memberId) });
  if (!before) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  await memberships.updateOne({ _id: new ObjectId(memberId) }, { $set: update });
  const after = await memberships.findOne({ _id: new ObjectId(memberId) });

  await recordAuditEvent({
    scope: "org",
    action: "org.member.update",
    actorUserId: String(gate.user._id),
    actorIp: getRequestIp(req),
    target: { type: "org_membership", id: memberId },
    before,
    after,
  });

  return NextResponse.json({ ok: true, item: after });
}

function getRequestIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}
