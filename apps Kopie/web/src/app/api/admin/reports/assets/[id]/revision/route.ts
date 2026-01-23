export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "@core/db/triMongo";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import { requireAdminOrOrgRole } from "@/lib/server/auth/org";
import { reportAssetsCol, reportRevisionsCol } from "@features/reportsAssets/db";
import { ReportRevisionSchema } from "@features/reportsAssets/schemas";
import { recordAuditEvent } from "@features/audit/recordAuditEvent";
import { ORG_ROLES } from "@features/org/types";
import type { ReportRevisionDoc } from "@features/reportsAssets/types";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }

  const parsed = ReportRevisionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const assetsCol = await reportAssetsCol();
  const asset = await assetsCol.findOne({ _id: new ObjectId(id) });
  if (!asset) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const gate = asset.orgId
    ? await requireAdminOrOrgRole(req, String(asset.orgId), [...ORG_ROLES])
    : await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;
  const actor = "user" in gate ? gate.user : gate;

  const revisionsCol = await reportRevisionsCol();
  const latest = await revisionsCol
    .find({ assetId: new ObjectId(id) })
    .sort({ rev: -1 })
    .limit(1)
    .toArray();

  const nextRev = (latest[0]?.rev ?? 0) + 1;
  const now = new Date();
  const revDoc: ReportRevisionDoc = {
    assetId: new ObjectId(id),
    rev: nextRev,
    changeNote: parsed.data.changeNote.trim(),
    content: {
      headline: parsed.data.content.headline ?? null,
      bodyMarkdown: parsed.data.content.bodyMarkdown ?? null,
      summary: parsed.data.content.summary ?? null,
      tags: parsed.data.content.tags ?? [],
      topicKey: parsed.data.content.topicKey ?? null,
      regionCode: parsed.data.content.regionCode ?? null,
    },
    createdByUserId: new ObjectId(String(actor._id)),
    createdAt: now,
  };

  const insert = await revisionsCol.insertOne(revDoc);
  await assetsCol.updateOne(
    { _id: new ObjectId(id) },
    { $set: { currentRev: nextRev, updatedAt: now } },
  );

  await recordAuditEvent({
    scope: "report",
    action: "report.revision.create",
    actorUserId: String(actor._id),
    actorIp: getRequestIp(req),
    target: { type: "report_revision", id: String(insert.insertedId) },
    after: { ...revDoc, _id: String(insert.insertedId) },
    reason: parsed.data.changeNote,
  });

  return NextResponse.json({ ok: true, revisionId: String(insert.insertedId), rev: nextRev });
}

function getRequestIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}
