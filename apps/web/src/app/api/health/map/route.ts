import { coreCol } from "@core/db/triMongo";
// apps/web/src/app/api/health/map/route.ts
import { NextResponse } from "next/server";
import getDb from "@/lib/db";

export const dynamic = "force-dynamic";

function bboxToPolygon([w, s, e, n]: [number, number, number, number]) {
  return {
    type: "Polygon" as const,
    coordinates: [
      [
        [w, s],
        [e, s],
        [e, n],
        [w, n],
        [w, s],
      ],
    ],
  };
}

export async function GET() {
  const out: any = { ok: true, checks: {} };

  try {
    // � ️ PII strikt außen vor lassen: nur CORE prüfen
    const col = await coreCol("statements");

    // 1) Geo-Index vorhanden?
    // indexExists("location_2dsphere") kann je nach Name variieren → sicherer: listIndexes
    const indexes = await col.listIndexes().toArray();
    const has2dsphere = indexes.some(
      (ix: any) =>
        ix.key &&
        typeof ix.key === "object" &&
        ix.key["location"] === "2dsphere",
    );
    out.checks.geoIndex2dsphere = has2dsphere;

    // 2) Minimal-Geo-Query (keine Datenrückgabe, nur Count)
    const polygon = bboxToPolygon([13.3, 52.45, 13.6, 52.6]);
    const count = await col.countDocuments(
      {
        location: { $geoWithin: { $geometry: polygon } },
      },
      { limit: 3 },
    ); // kleine Kappe reicht für Health

    out.checks.sampleGeoQuery = { ok: true, count };

    // ✨ Optional: weitere interne Checks (z. B. Tiles/Geocoder HEAD/PING) hier ergänzen,
    // aber niemals Tokens/PII anfassen.

    return NextResponse.json(out);
  } catch (e: any) {
    out.ok = false;
    out.error = e?.message || "err";
    return NextResponse.json(out, { status: 500 });
  }
}
