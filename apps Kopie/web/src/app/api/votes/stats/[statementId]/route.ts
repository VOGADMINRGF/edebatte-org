import { NextResponse } from "next/server";
import { getVoteStats, getVoteTimeseries } from "@/lib/vote/stats";

export const dynamic = "force-dynamic";

export async function GET(
  _: Request,
  context: { params: Promise<{ statementId: string }> },
) {
  const { statementId } = await context.params;
  const [stats, timeseries] = await Promise.all([
    getVoteStats(statementId),
    getVoteTimeseries(statementId, 60),
  ]);
  return NextResponse.json({ ok: true, stats, timeseries });
}
