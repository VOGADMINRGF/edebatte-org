import { NextRequest, NextResponse } from "next/server";
import { getIdentityFunnelSnapshot } from "@core/telemetry/identityEvents";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseRangeDays(value: string | null): number {
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
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  try {
    const { searchParams } = new URL(req.url);
    const rangeDays = parseRangeDays(searchParams.get("range"));
    const toDate = new Date();
    const fromDate = new Date(toDate);
    fromDate.setDate(toDate.getDate() - (rangeDays - 1));

    const snapshot = await getIdentityFunnelSnapshot(fromDate, toDate);
    return NextResponse.json({ ok: true, snapshot });
  } catch (error) {
    console.error("[api] identity funnel error", error);
    return NextResponse.json({ ok: false, error: "identity snapshot failed" }, { status: 500 });
  }
}
