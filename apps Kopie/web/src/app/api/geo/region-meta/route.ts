// apps/web/src/app/api/geo/region-meta/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const nuts = url.searchParams.get("nuts") || undefined;
  const ags = url.searchParams.get("ags") || undefined;

  if (!nuts && !ags) {
    return NextResponse.json(
      { ok: false, error: "missing_region" },
      { status: 400 },
    );
  }
  return NextResponse.json({
    ok: true,
    region: {
      code: nuts || ags,
      name: "Berlin",
      level: nuts ? "NUTS2" : "AGS",
      population: 3664088,
    },
  });
}
