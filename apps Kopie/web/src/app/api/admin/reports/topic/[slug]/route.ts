import { NextRequest, NextResponse } from "next/server";
import { getStaffContext } from "../../../eventualities/helpers";
import { getTopicReportData } from "@core/graph/queries/reports";
import { logger } from "@core/observability/logger";
import { maskUserId } from "@core/pii/redact";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const staff = await getStaffContext(req);
  if (staff.response) return staff.response;
  const ctx = staff.context;
  if (!ctx) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { slug } = await params;
  const topicSlug = slug?.trim();
  if (!topicSlug) {
    return NextResponse.json({ ok: false, error: "missing_topic" }, { status: 400 });
  }

  try {
    const summary = await getTopicReportData(topicSlug);
    logger.info(
      {
        zone: "PII_ZONES_E150",
        action: "topic_report_fetch",
        topic: topicSlug,
        userIdMasked: maskUserId(ctx.userId),
      },
      "Admin fetched topic report",
    );

    return NextResponse.json({
      ok: true,
      meta: { topicSlug },
      summary,
    });
  } catch (error: any) {
    logger.error(
      {
        zone: "PII_ZONES_E150",
        action: "topic_report_error",
        topic: topicSlug,
        userIdMasked: maskUserId(ctx.userId),
        reason: error?.message ?? String(error),
      },
      "Topic report failed",
    );
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
