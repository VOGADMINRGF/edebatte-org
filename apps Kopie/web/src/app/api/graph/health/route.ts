import { NextResponse } from "next/server";
import { getGraphDriver } from "@core/graph";
import { logger } from "@/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const driver = getGraphDriver();
  if (!driver) {
    return NextResponse.json({ ok: false, error: "graph_disabled" }, { status: 503 });
  }

  const session = driver.session();
  try {
    const nodesResult = await session.run("MATCH (n) RETURN count(n) AS nodes");
    const relsResult = await session.run("MATCH ()-[r]->() RETURN count(r) AS relationships");
    const nodes = Number(nodesResult.records?.[0]?.get("nodes") ?? 0);
    const relationships = Number(relsResult.records?.[0]?.get("relationships") ?? 0);
    return NextResponse.json({
      ok: true,
      nodes,
      relationships,
    });
  } catch (err: any) {
    logger.error({ msg: "graph.health.failed", err: err?.message });
    return NextResponse.json({ ok: false, error: "graph_unavailable" }, { status: 500 });
  } finally {
    await session.close().catch(() => {});
  }
}
