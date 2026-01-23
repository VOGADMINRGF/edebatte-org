export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "@core/db/triMongo";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import { requireAdminOrOrgRole } from "@/lib/server/auth/org";
import { reportAssetsCol, reportRevisionsCol } from "@features/reportsAssets/db";
import { ORG_ROLES } from "@features/org/types";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }

  const assetsCol = await reportAssetsCol();
  const asset = await assetsCol.findOne({ _id: new ObjectId(id) });
  if (!asset) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const gate = asset.orgId
    ? await requireAdminOrOrgRole(req, String(asset.orgId), [...ORG_ROLES])
    : await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const revisionsCol = await reportRevisionsCol();
  const revisions = await revisionsCol
    .find({ assetId: new ObjectId(id) })
    .sort({ rev: -1 })
    .limit(25)
    .toArray();

  return NextResponse.json({
    ok: true,
    asset: {
      id: String(asset._id),
      orgId: asset.orgId ? String(asset.orgId) : null,
      kind: asset.kind,
      status: asset.status,
      key: asset.key,
      currentRev: asset.currentRev,
      createdAt: asset.createdAt ? asset.createdAt.toISOString() : null,
      updatedAt: asset.updatedAt ? asset.updatedAt.toISOString() : null,
      publishedAt: asset.publishedAt ? asset.publishedAt.toISOString() : null,
    },
    revisions: revisions.map((rev) => ({
      id: String(rev._id),
      rev: rev.rev,
      changeNote: rev.changeNote,
      content: rev.content,
      createdAt: rev.createdAt ? rev.createdAt.toISOString() : null,
      createdByUserId: rev.createdByUserId ? String(rev.createdByUserId) : null,
    })),
  });
}
