import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "@core/db/triMongo";
import { evidenceItemsCol, evidenceLinksCol } from "@core/evidence/db";
import type { EvidenceItemDoc } from "@core/evidence/types";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const { id } = await context.params;
  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }

  const col = await evidenceItemsCol();
  const item = await col.findOne({ _id: objectId });
  if (!item) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const linkedClaims = await (await evidenceLinksCol())
    .countDocuments({ toEvidenceId: objectId });

  return NextResponse.json({
    ok: true,
    item: { ...item, _id: item._id.toHexString(), linkedClaims },
  });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const updates: Record<string, any> = {};
  if (typeof body.shortTitle === "string") updates.shortTitle = body.shortTitle.trim();
  if (typeof body.shortSummary === "string") updates.shortSummary = body.shortSummary.trim();
  if (typeof body.quoteSnippet === "string") updates.quoteSnippet = body.quoteSnippet.trim();
  if (typeof body.licenseHint === "string") updates.licenseHint = body.licenseHint;
  if (typeof body.isActive === "boolean") updates.isActive = body.isActive;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: false, error: "no_updates" }, { status: 400 });
  }

  updates.updatedAt = new Date();

  const { id } = await context.params;
  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }

  const col = await evidenceItemsCol();
  const updateResult = await col.findOneAndUpdate(
    { _id: objectId },
    { $set: updates },
    { returnDocument: "after" },
  );
  const updatedItem = (updateResult as { value?: EvidenceItemDoc | null }).value;
  if (!updatedItem) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    item: { ...updatedItem, _id: updatedItem._id.toHexString() },
  });
}
