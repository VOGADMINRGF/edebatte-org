export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getGraphDriver } from "@core/graph/driver";
import { evidenceItemsCol, evidenceLinksCol } from "@core/evidence/db";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";

export async function GET(req: NextRequest) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const windowDays = Math.max(1, Number(req.nextUrl.searchParams.get("windowDays") ?? 30));

  const driver = getGraphDriver();
  if (!driver) {
    return NextResponse.json({ ok: false, error: "graph_unavailable" }, { status: 503 });
  }

  const session = driver.session();
  try {
    const result = await session.run(
      `
      CALL { MATCH (n) RETURN count(n) AS nodes }
      CALL { MATCH ()-[r]->() RETURN count(r) AS edges }
      CALL { MATCH (n) WHERE size((n)--()) = 0 RETURN count(n) AS orphans }
      CALL {
        MATCH (s:Statement)
        WITH s.text AS text, count(*) AS c
        WHERE text IS NOT NULL AND c > 1
        RETURN sum(c) AS duplicatesSuggested
      }
      CALL {
        MATCH (p:ResponsibilityPath)
        WHERE NOT (p)-[:HAS_STEP]->()
        RETURN count(p) AS brokenPaths
      }
      RETURN nodes, edges, orphans, duplicatesSuggested, brokenPaths
      `,
    );

    const record = result.records[0];
    const nodes = Number(record?.get("nodes") ?? 0);
    const edges = Number(record?.get("edges") ?? 0);
    const orphans = Number(record?.get("orphans") ?? 0);
    const duplicatesSuggested = Number(record?.get("duplicatesSuggested") ?? 0);
    const brokenPaths = Number(record?.get("brokenPaths") ?? 0);

    const unlinkedEvidence = await countUnlinkedEvidence();

    return NextResponse.json({
      ok: true,
      summary: {
        nodes,
        edges,
        orphans,
        duplicatesSuggested,
        brokenPaths,
        unlinkedEvidence,
        lastSyncAt: await lastEvidenceLinkAt(),
      },
      _meta: {
        generatedAt: new Date().toISOString(),
        windowDays,
        source: "graph",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "graph_error" }, { status: 500 });
  } finally {
    await session.close();
  }
}

async function countUnlinkedEvidence() {
  const items = await evidenceItemsCol();
  const result = await items
    .aggregate([
      {
        $lookup: {
          from: "evidence_links",
          localField: "_id",
          foreignField: "toEvidenceId",
          as: "links",
        },
      },
      { $match: { links: { $size: 0 } } },
      { $count: "count" },
    ])
    .toArray();

  return result[0]?.count ?? 0;
}

async function lastEvidenceLinkAt() {
  const links = await evidenceLinksCol();
  const latest = await links.find({}).sort({ createdAt: -1 }).limit(1).toArray();
  const entry = latest[0] as any;
  return entry?.createdAt ? new Date(entry.createdAt).toISOString() : null;
}
