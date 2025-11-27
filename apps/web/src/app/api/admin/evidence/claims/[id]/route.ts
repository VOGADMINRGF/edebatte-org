import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "@core/db/triMongo";
import { getEvidenceClaimById } from "@core/evidence/query";
import { evidenceClaimsCol } from "@core/evidence/db";
import type { EvidenceClaimDoc } from "@core/evidence/types";
import { isStaffRequest } from "@/app/api/admin/feeds/utils";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!isStaffRequest(req)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const claim = await getEvidenceClaimById(id);
  if (!claim) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    claim: {
      ...claim.claim,
      _id: claim.claim._id.toHexString(),
    },
    links: claim.links ?? [],
    decisions: claim.decisions ?? [],
    evidenceItems: (claim.evidenceItems ?? []).map((item) => ({
      ...item,
      _id: item._id.toHexString(),
    })),
  });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
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
  if (typeof body.claimText === "string") updates.text = body.claimText.trim();
  if (typeof body.topicKey === "string") updates.topicKey = body.topicKey || null;
  if (typeof body.domainKey === "string") updates.domainKey = body.domainKey || null;
  if (typeof body.regionCode === "string") updates.regionCode = body.regionCode || null;
  if (typeof body.visibility === "string") updates.visibility = body.visibility;

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

  const col = await evidenceClaimsCol();
  const updateResult = await col.findOneAndUpdate(
    { _id: objectId },
    { $set: updates },
    { returnDocument: "after" },
  );
  const updatedClaim = (updateResult as { value?: EvidenceClaimDoc | null }).value;
  if (!updatedClaim) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    claim: { ...updatedClaim, _id: updatedClaim._id.toHexString() },
  });
}
