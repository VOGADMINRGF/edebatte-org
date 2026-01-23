import { NextRequest, NextResponse } from "next/server";
import { getEventualitiesByContribution } from "@core/eventualities";
import { logger } from "@core/observability/logger";
import { maskUserId } from "@core/pii/redact";
import { getStaffContext, serializeSnapshot } from "../helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { context, response } = await getStaffContext(req);
  if (response) return response;
  if (!context) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
  }

  const data = await getEventualitiesByContribution(id);
  if (!data) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  logger.info(
    {
      zone: "PII_ZONES_E150",
      action: "eventualities_item",
      contributionId: id,
      userIdMasked: maskUserId(context.userId),
    },
    "Admin viewed eventuality snapshot",
  );

  return NextResponse.json({
    ok: true,
    snapshot: serializeSnapshot(data.snapshot),
    eventualities: data.eventualities,
    decisionTrees: data.decisionTrees,
  });
}
