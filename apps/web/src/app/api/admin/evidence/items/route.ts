import { NextRequest, NextResponse } from "next/server";
import { evidenceItemsCol } from "@core/evidence/db";
import { isStaffRequest } from "@/app/api/admin/feeds/utils";

export async function GET(req: NextRequest) {
  if (!isStaffRequest(req)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const params = req.nextUrl.searchParams;
  const page = Math.max(1, Number(params.get("page") ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(params.get("pageSize") ?? 20)));
  const offset = (page - 1) * pageSize;

  const match: Record<string, any> = {};
  const publisher = params.get("publisher");
  const sourceKind = params.get("sourceKind");
  const isActiveParam = params.get("isActive");
  const regionCode = params.get("regionCode");
  const since = params.get("since");
  const until = params.get("until");

  if (publisher) match.publisher = { $regex: new RegExp(publisher, "i") };
  if (sourceKind && sourceKind !== "all") match.sourceKind = sourceKind;
  if (regionCode && regionCode !== "all") match.regionCode = regionCode;
  if (isActiveParam === "true") match.isActive = { $ne: false };
  if (isActiveParam === "false") match.isActive = false;

  if (since || until) {
    match.publishedAt = {};
    if (since) match.publishedAt.$gte = new Date(since);
    if (until) match.publishedAt.$lte = new Date(until);
    if (!match.publishedAt.$gte) delete match.publishedAt.$gte;
    if (!match.publishedAt.$lte) delete match.publishedAt.$lte;
    if (!Object.keys(match.publishedAt).length) delete match.publishedAt;
  }

  const col = await evidenceItemsCol();
  const total = await col.countDocuments(match);
  const cursor = col.aggregate([
    { $match: match },
    { $sort: { publishedAt: -1, createdAt: -1 } },
    { $skip: offset },
    { $limit: pageSize },
    {
      $lookup: {
        from: "evidence_links",
        localField: "_id",
        foreignField: "toEvidenceId",
        as: "links",
      },
    },
    {
      $addFields: {
        linkedClaims: { $size: "$links" },
      },
    },
    { $project: { links: 0 } },
  ]);

  const items = await cursor
    .map((doc) => ({
      ...doc,
      _id: doc._id.toHexString(),
    }))
    .toArray();

  return NextResponse.json({
    ok: true,
    items,
    total,
    page,
    pageSize,
  });
}
