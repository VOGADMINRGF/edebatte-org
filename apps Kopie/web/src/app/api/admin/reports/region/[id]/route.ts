import { NextRequest, NextResponse } from "next/server";
import { getStaffContext } from "../../../eventualities/helpers";
import { getRegionReportData } from "@core/graph/queries/reports";
import { logger } from "@core/observability/logger";
import { maskUserId } from "@core/pii/redact";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await getStaffContext(req);
  if (staff.response) return staff.response;
  const ctx = staff.context;
  if (!ctx) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const regionId = id?.trim();
  if (!regionId) {
    return NextResponse.json({ ok: false, error: "missing_region" }, { status: 400 });
  }

  try {
    const summary = await getRegionReportData(regionId);
    logger.info(
      {
        zone: "PII_ZONES_E150",
        action: "region_report_fetch",
        regionId,
        userIdMasked: maskUserId(ctx.userId),
      },
      "Admin fetched region report",
    );

    return NextResponse.json({
      ok: true,
      meta: { regionId },
      summary,
    });
  } catch (error: any) {
    logger.error(
      {
        zone: "PII_ZONES_E150",
        action: "region_report_error",
        regionId,
        userIdMasked: maskUserId(ctx.userId),
        reason: error?.message ?? String(error),
      },
      "Region report failed",
    );
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
