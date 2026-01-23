export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "@core/db/triMongo";
import { orgsCol } from "@features/org/db";
import { OrgPatchSchema } from "@features/org/schemas";
import { recordAuditEvent } from "@features/audit/recordAuditEvent";
import { requireAdminOrOrgRole } from "@/lib/server/auth/org";
import type { OrgDoc } from "@features/org/types";

export async function GET(req: NextRequest, ctx: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await ctx.params;
  const gate = await requireAdminOrOrgRole(req, orgId, []);
  if (gate instanceof Response) return gate;

  if (!ObjectId.isValid(orgId)) {
    return NextResponse.json({ ok: false, error: "invalid_org" }, { status: 400 });
  }

  const col = await orgsCol();
  const doc = await col.findOne({ _id: new ObjectId(orgId) });
  if (!doc) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  return NextResponse.json({ ok: true, item: mapOrg(doc) });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await ctx.params;
  const gate = await requireAdminOrOrgRole(req, orgId, ["org_admin"]);
  if (gate instanceof Response) return gate;

  if (!ObjectId.isValid(orgId)) {
    return NextResponse.json({ ok: false, error: "invalid_org" }, { status: 400 });
  }

  const parsed = OrgPatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const patch = parsed.data;
  const update: Record<string, unknown> = {};
  if (typeof patch.name === "string") update.name = patch.name.trim();
  if (patch.archivedAt !== undefined) {
    update.archivedAt = patch.archivedAt ? new Date(patch.archivedAt) : null;
  }
  if (!Object.keys(update).length) {
    return NextResponse.json({ ok: false, error: "no_changes" }, { status: 400 });
  }
  update.updatedAt = new Date();

  const col = await orgsCol();
  const before = await col.findOne({ _id: new ObjectId(orgId) });
  if (!before) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  await col.updateOne({ _id: new ObjectId(orgId) }, { $set: update });
  const after = await col.findOne({ _id: new ObjectId(orgId) });

  await recordAuditEvent({
    scope: "org",
    action: "org.update",
    actorUserId: String(gate.user._id),
    actorIp: getRequestIp(req),
    target: { type: "org", id: orgId },
    before,
    after,
  });

  return NextResponse.json({ ok: true, item: after ? mapOrg(after) : null });
}

function mapOrg(doc: OrgDoc) {
  return {
    id: doc._id ? String(doc._id) : undefined,
    slug: doc.slug,
    name: doc.name,
    archivedAt: doc.archivedAt ? doc.archivedAt.toISOString() : null,
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : null,
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : null,
  };
}

function getRequestIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}
