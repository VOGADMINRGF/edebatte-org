import { NextRequest, NextResponse } from "next/server";
import { logger } from "@core/observability/logger";
import { maskUserId } from "@core/pii/redact";
import { listEventualitySnapshots } from "@core/eventualities";
import { getStaffContext, serializeSnapshot } from "../helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { context, response } = await getStaffContext(req);
  if (response) return response;
  if (!context) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const snapshots = await listEventualitySnapshots(200);

  logger.info(
    {
      zone: "PII_ZONES_E150",
      action: "eventualities_list",
      userIdMasked: maskUserId(context.userId),
    },
    "Admin fetched eventuality snapshots",
  );

  return NextResponse.json({
    ok: true,
    items: snapshots.map(serializeSnapshot),
  });
}
