import { NextRequest, NextResponse } from "next/server";

import { runScheduledOpenDataSources } from "@features/feeds/sourceScheduler";

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
    const result = await runScheduledOpenDataSources();
    // Source-level failures deliberately remain HTTP 200: provider backoff and
    // nextSuggestedPullAt are the retry authority. A platform retry must not
    // bypass those controls or create a retry storm.
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "source_scheduler_failed",
      },
      { status: 503 },
    );
  }
}
