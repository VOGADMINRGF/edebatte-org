export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "@core/db/triMongo";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import { requireAdminOrOrgRole } from "@/lib/server/auth/org";
import { editorialItemsCol, editorialRevisionsCol } from "@features/editorial/db";
import { EditorialPublishSchema } from "@features/editorial/schemas";
import { recordAuditEvent } from "@features/audit/recordAuditEvent";
import { ORG_ROLES } from "@features/org/types";
import type { EditorialRevisionDoc } from "@features/editorial/types";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }

  const parsed = EditorialPublishSchema.safeParse(await req.json().catch(() => null));
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

  if (item.status !== "ready") {
    return NextResponse.json({ ok: false, error: "not_ready" }, { status: 400 });
  }

  const revisionsCol = await editorialRevisionsCol();
  const latest = await revisionsCol
    .find({ itemId: new ObjectId(id) })
    .sort({ rev: -1 })
    .limit(1)
    .toArray();

  const nextRev = (latest[0]?.rev ?? 0) + 1;
  const content = latest[0]?.content ?? {
    headline: item.intake.title ?? null,
    summary: item.intake.summary ?? null,
    bodyMarkdown: item.intake.rawText ?? null,
    tags: [],
    topicKey: item.intake.topicKey ?? null,
    regionCode: item.intake.regionCode ?? null,
  };

  const now = new Date();
  const revision: EditorialRevisionDoc = {
    itemId: new ObjectId(id),
    rev: nextRev,
    changeNote: parsed.data.changeNote.trim(),
    content,
    createdByUserId: new ObjectId(String(actor._id)),
    createdAt: now,
  };

  await revisionsCol.insertOne(revision);

  await itemsCol.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        status: "published",
        updatedAt: now,
        "published.publishedAt": now,
        "published.publishedByUserId": new ObjectId(String(actor._id)),
        "published.publicUrl": parsed.data.publicUrl ?? item.published.publicUrl ?? null,
      },
    },
  );

  await recordAuditEvent({
    scope: "editorial",
    action: "editorial.publish",
    actorUserId: String(actor._id),
    actorIp: getRequestIp(req),
    target: { type: "editorial_item", id },
    before: item,
    after: { ...item, status: "published" },
    reason: parsed.data.changeNote,
  });

  return NextResponse.json({ ok: true, publishedAt: now.toISOString() });
}

function getRequestIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}
