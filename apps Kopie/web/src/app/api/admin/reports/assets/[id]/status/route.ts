export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "@core/db/triMongo";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import { requireAdminOrOrgRole } from "@/lib/server/auth/org";
import { reportAssetsCol } from "@features/reportsAssets/db";
import { ReportAssetStatusChangeSchema } from "@features/reportsAssets/schemas";
import { recordAuditEvent } from "@features/audit/recordAuditEvent";
import { ORG_ROLES } from "@features/org/types";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }

  const parsed = ReportAssetStatusChangeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  if (!parsed.data.reason || parsed.data.reason.trim().length < 3) {
    return NextResponse.json({ ok: false, error: "missing_reason" }, { status: 400 });
  }

  const assetsCol = await reportAssetsCol();
  const asset = await assetsCol.findOne({ _id: new ObjectId(id) });
  if (!asset) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const gate = asset.orgId
    ? await requireAdminOrOrgRole(req, String(asset.orgId), [...ORG_ROLES])
    : await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;
  const actor = "user" in gate ? gate.user : gate;

  const now = new Date();
  const update: Record<string, unknown> = {
    status: parsed.data.status,
    updatedAt: now,
  };
  if (parsed.data.status !== "published") {
    update.publishedAt = null;
    update.publishedByUserId = null;
  }

  await assetsCol.updateOne({ _id: new ObjectId(id) }, { $set: update });
  const after = await assetsCol.findOne({ _id: new ObjectId(id) });

  await recordAuditEvent({
    scope: "report",
    action: "report.asset.status",
    actorUserId: String(actor._id),
    actorIp: getRequestIp(req),
    target: { type: "report_asset", id },
    before: asset,
    after,
    reason: parsed.data.reason,
  });

  return NextResponse.json({ ok: true, asset: after });
}

function getRequestIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}
