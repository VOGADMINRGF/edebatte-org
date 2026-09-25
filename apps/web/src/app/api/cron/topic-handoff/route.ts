import { NextRequest, NextResponse } from "next/server";
import { buildAutonomousThemenradarReadModel } from "@features/themenradar/autonomousSupply";
import { syncAutonomousTopicClusters } from "@features/research/topicHandoff";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: NextRequest) {
  const secret = String(process.env.CRON_SECRET ?? "").trim();
  return secret.length >= 16 && req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const radar = await buildAutonomousThemenradarReadModel({
      scope: { adminContext: true },
      limit: 80,
    });

    const results = await syncAutonomousTopicClusters(radar.items);

    return NextResponse.json({
      ok: true,
      generatedAt: radar.generatedAt,
      clusterCount: radar.items.length,
      handoffs: results.length,
      dossierDrafts: results.filter((entry) => entry.dossierDraftCreated).length,
      swipes: results.filter((entry) => entry.swipeReady).length,
      reviewRequired: results.filter((entry) => entry.reviewRequired).length,
      aiOrchestratorReviewed: results.filter((entry) => entry.aiOrchestratorReviewed).length,
      results,
    });
  } catch (error) {
    console.error("[/api/cron/topic-handoff] failed", error);
    return NextResponse.json(
      { ok: false, error: "topic_handoff_failed" },
      { status: 503 },
    );
  }
}
