// apps/web/src/app/api/votes/user/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { votesCol } from "@core/db/triMongo";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const statementId = (url.searchParams.get("statementId") || "").trim();
  if (!statementId) {
    return NextResponse.json(
      { ok: false, error: "Missing 'statementId'." },
      { status: 400 },
    );
  }
  const votes = await votesCol("votes");
  const agg = await votes
    .aggregate([
      { $match: { statementId } },
      { $group: { _id: "$value", n: { $sum: 1 } } },
    ])
    .toArray();

  const counts: Record<string, number> = { agree: 0, neutral: 0, disagree: 0 };
  for (const g of agg) counts[g._id] = g.n;

  return NextResponse.json({ ok: true, data: { statementId, counts } });
}
