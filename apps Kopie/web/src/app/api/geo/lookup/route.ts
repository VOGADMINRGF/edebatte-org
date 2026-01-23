// apps/web/src/app/api/geo/lookup/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || undefined;
  const center = url.searchParams.get("center") || undefined;

  if (center) {
    const [lon, lat] = center.split(",").map(Number);
    if ([lon, lat].some(Number.isNaN)) {
      return NextResponse.json(
        { ok: false, error: "invalid_center" },
        { status: 400 },
      );
    }
    return NextResponse.json({
      ok: true,
      center: [lon, lat],
      nuts: "DE300",
      ags: "11000000",
    });
  }
  if (q) {
    // Dummy: gibt Berlin zurück
    return NextResponse.json({
      ok: true,
      guess: true,
      center: [13.405, 52.52],
      nuts: "DE300",
      ags: "11000000",
    });
  }
  return NextResponse.json(
    { ok: false, error: "missing_params" },
    { status: 400 },
  );
}
