import { NextRequest, NextResponse } from "next/server";
import { getAiUsageSnapshot } from "@core/telemetry/aiUsageSnapshot";
import { isStaffRequest } from "@/app/api/admin/feeds/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseRange(value: string | null): number {
  switch (value) {
    case "7":
    case "week":
      return 7;
    case "90":
    case "quarter":
      return 90;
    case "30":
    case "month":
    default:
      return 30;
  }
}

export async function GET(req: NextRequest) {
  if (!isStaffRequest(req)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const rangeDays = parseRange(searchParams.get("range"));
    const region = searchParams.get("region");
    const snapshot = await getAiUsageSnapshot(rangeDays, region);

    return NextResponse.json({ ok: true, snapshot });
  } catch (error) {
    console.error("[api] ai usage snapshot", error);
    return NextResponse.json({ ok: false, error: "usage snapshot failed" }, { status: 500 });
  }
}
