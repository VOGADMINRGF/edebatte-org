import { NextRequest, NextResponse } from "next/server";
import { isBerlinDigestHour, sendDailyOperatorDigest } from "@/features/operator/operatorNotifications";
import { buildAutonomousThemenradarReadModel } from "@features/themenradar/autonomousSupply";
import { syncAutonomousTopicClusters } from "@features/research/topicHandoff";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: NextRequest) {
  const secret = String(process.env.CRON_SECRET ?? "").trim();
  return secret.length >= 16 && req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!isBerlinDigestHour()) return NextResponse.json({ ok: true, skipped: "outside_berlin_18h_window" });

  const digest = await sendDailyOperatorDigest();

  let topicHandoff: Record<string, unknown> = {
    ok: false,
    error: "topic_handoff_not_run",
  };

  try {
    const radar = await buildAutonomousThemenradarReadModel({
      scope: { adminContext: true },
      limit: 80,
    });
    const results = await syncAutonomousTopicClusters(radar.items);
    topicHandoff = {
      ok: true,
      clusterCount: radar.items.length,
      handoffs: results.length,
      dossierDrafts: results.filter((entry) => entry.dossierDraftCreated).length,
      swipes: results.filter((entry) => entry.swipeReady).length,
      reviewRequired: results.filter((entry) => entry.reviewRequired).length,
      aiOrchestratorReviewed: results.filter((entry) => entry.aiOrchestratorReviewed).length,
    };
  } catch (error) {
    console.error("[/api/cron/operator-digest] topic handoff failed", error);
    topicHandoff = {
      ok: false,
      error: "topic_handoff_failed",
    };
  }

  return NextResponse.json({
    ok: digest.ok && topicHandoff.ok === true,
    digest,
    topicHandoff,
  }, { status: digest.ok && topicHandoff.ok === true ? 200 : 503 });
}
