import { NextResponse } from "next/server";
import { coreCol } from "@core/db/triMongo";

export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const col = await coreCol("statements");
  const doc = await col.findOne(
    { id },
    { projection: { _id: 0, stats: 1 } },
  );
  if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 });

  const s = doc.stats ?? {
    votesTotal: 0,
    votesAgree: 0,
    votesNeutral: 0,
    votesDisagree: 0,
  };
  const stats = {
    votesTotal: Number(s.votesTotal ?? 0),
    votesAgree: Number(s.votesAgree ?? 0),
    votesNeutral: Number(s.votesNeutral ?? 0),
    votesDisagree: Number(s.votesDisagree ?? 0),
  };
  return NextResponse.json({ stats }, { status: 200 });
}
