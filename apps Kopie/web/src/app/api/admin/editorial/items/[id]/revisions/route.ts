export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "@core/db/triMongo";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import { requireAdminOrOrgRole } from "@/lib/server/auth/org";
import { editorialItemsCol, editorialRevisionsCol } from "@features/editorial/db";
import { ORG_ROLES } from "@features/org/types";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }

  const itemsCol = await editorialItemsCol();
  const item = await itemsCol.findOne({ _id: new ObjectId(id) });
  if (!item) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const gate = item.orgId
    ? await requireAdminOrOrgRole(req, String(item.orgId), [...ORG_ROLES])
    : await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const revisionsCol = await editorialRevisionsCol();
  const revisions = await revisionsCol
    .find({ itemId: new ObjectId(id) })
    .sort({ rev: -1 })
    .limit(30)
    .toArray();

  return NextResponse.json({
    ok: true,
    items: revisions.map((rev) => ({
      id: String(rev._id),
      rev: rev.rev,
      changeNote: rev.changeNote,
      content: rev.content,
      createdAt: rev.createdAt ? new Date(rev.createdAt).toISOString() : null,
      createdByUserId: rev.createdByUserId ? String(rev.createdByUserId) : null,
    })),
  });
}
