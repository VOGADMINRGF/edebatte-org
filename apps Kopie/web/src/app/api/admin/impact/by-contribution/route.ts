import { NextRequest, NextResponse } from "next/server";
import { getImpactSnapshotByContribution } from "@core/eventualities";
import { logger } from "@core/observability/logger";
import { maskUserId } from "@core/pii/redact";
import { getStaffContext } from "../../eventualities/helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const staff = await getStaffContext(req);
  if (staff.response) return staff.response;
  const ctx = staff.context;
  if (!ctx) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
  }

  try {
    const impact = await getImpactSnapshotByContribution(id);

    logger.info(
      {
        zone: "PII_ZONES_E150",
        action: "impact_snapshot_fetch",
        contributionId: id,
        userIdMasked: maskUserId(ctx.userId),
      },
      "Admin fetched impact snapshot",
    );

    return NextResponse.json({ ok: true, impact }, { status: 200 });
  } catch (error: any) {
    logger.error(
      {
        zone: "PII_ZONES_E150",
        action: "impact_snapshot_error",
        contributionId: id,
        userIdMasked: maskUserId(ctx.userId),
        reason: error?.message ?? String(error),
      },
      "Failed to fetch impact snapshot",
    );
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
