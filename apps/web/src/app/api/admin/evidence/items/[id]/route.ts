import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "@core/db/triMongo";
import { evidenceItemsCol, evidenceLinksCol } from "@core/evidence/db";
import { isStaffRequest } from "../../../feeds/utils";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isStaffRequest(req)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(params.id);
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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isStaffRequest(req)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

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

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(params.id);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }

  const col = await evidenceItemsCol();
  const result = await col.findOneAndUpdate({ _id: objectId }, { $set: updates }, { returnDocument: "after" });
  if (!result.value) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    item: { ...result.value, _id: result.value._id.toHexString() },
  });
}
