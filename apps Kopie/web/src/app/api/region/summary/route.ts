import { NextRequest, NextResponse } from "next/server";
import { getRegionSummaryWithFallback } from "@/lib/region/summary";

export const runtime = "nodejs";

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const regionCode = url.searchParams.get("regionCode")?.trim() ?? "";
  const limitRaw = Number(url.searchParams.get("limit") ?? 5);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(20, limitRaw)) : 5;

  if (!regionCode) {
    return NextResponse.json(
      { ok: false, error: "region_required" },
      { status: 400, headers: JSON_HEADERS },
    );
  }

  const { summary, requestedRegionKey, usedRegionKey, fallbackUsed, fallbackChain } =
    await getRegionSummaryWithFallback({ regionCode, limit });
  if (!summary.regionKey) {
    return NextResponse.json(
      { ok: false, error: "invalid_region" },
      { status: 400, headers: JSON_HEADERS },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      ...summary,
      requestedRegionKey,
      usedRegionKey,
      fallbackUsed,
      fallbackChain,
    },
    { headers: JSON_HEADERS },
  );
}
