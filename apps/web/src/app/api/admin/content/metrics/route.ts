export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import { coreCol } from "@core/db/triMongo";
import { evidenceClaimsCol, evidenceItemsCol, evidenceLinksCol } from "@core/evidence/db";
import { statementCandidatesCol, feedStatementsCol } from "@features/feeds/db";

const TOPIC_LIMIT = 8;

export async function GET(req: NextRequest) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const contributionsCol = await coreCol("contributions");
  const statementsCol = await coreCol("statements");
  const evidenceClaims = await evidenceClaimsCol();
  const evidenceItems = await evidenceItemsCol();
  const evidenceLinks = await evidenceLinksCol();
  const candidates = await statementCandidatesCol();
  const feedStatements = await feedStatementsCol();

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [
    contributionsTotal,
    contributions30d,
    statementsTotal,
    feedStatementsTotal,
    evidenceClaimsTotal,
    evidenceItemsTotal,
    evidenceLinksTotal,
    humanTopics,
    aiTopics,
  ] = await Promise.all([
    contributionsCol.countDocuments({}),
    contributionsCol.countDocuments({ createdAt: { $gte: since } }),
    statementsCol.countDocuments({}),
    feedStatements.countDocuments({}),
    evidenceClaims.countDocuments({}),
    evidenceItems.countDocuments({}),
    evidenceLinks.countDocuments({}),
    contributionsCol
      .aggregate([
        { $match: { "analysis.topics": { $exists: true, $ne: [] } } },
        { $unwind: "$analysis.topics" },
        {
          $group: {
            _id: "$analysis.topics",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: TOPIC_LIMIT },
      ])
      .toArray(),
    candidates
      .aggregate([
        { $match: { topic: { $exists: true, $ne: null } } },
        {
          $group: {
            _id: "$topic",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: TOPIC_LIMIT },
      ])
      .toArray(),
  ]);

  return NextResponse.json({
    ok: true,
    totals: {
      contributions: contributionsTotal,
      contributions30d,
      statements: statementsTotal,
      feedStatements: feedStatementsTotal,
      evidenceClaims: evidenceClaimsTotal,
      evidenceItems: evidenceItemsTotal,
      evidenceLinks: evidenceLinksTotal,
    },
    topics: {
      human: humanTopics.map((entry: any) => ({ topic: entry._id, count: entry.count })),
      ai: aiTopics.map((entry: any) => ({ topic: entry._id, count: entry.count })),
    },
  });
}
