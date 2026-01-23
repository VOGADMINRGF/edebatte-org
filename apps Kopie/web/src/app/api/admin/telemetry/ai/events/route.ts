// apps/web/src/app/api/admin/telemetry/ai/events/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import { recentEvents, summarizeTelemetry } from "@features/ai/telemetry";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const events = recentEvents(200);
  const summary = summarizeTelemetry(events);

  return NextResponse.json({
    ok: true,
    summary,
    events,
  });
}
