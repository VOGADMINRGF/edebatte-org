// apps/web/src/app/api/map/points/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getEvidenceRegionHeatmap } from "@features/report/evidenceAggregates";
import { getRegionName } from "@core/regions/regionTranslations";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/config/locales";
import { prisma } from "@/lib/prisma";
import { evidenceDecisionsCol } from "@core/evidence/db";
import { rateLimitFromRequest, rateLimitHeaders } from "@/utils/rateLimitHelpers";
import { resolveTimeRange, type TimeRangeKey } from "@/utils/timeRange";

const RL_LIMIT = 60;
const RL_WINDOW = 60_000;

type MapPoint = {
  id: string;
  regionCode: string;
  regionName: string;
  claimCount: number;
  decisionCount: number;
  lastUpdated?: string | null;
  location?: { type: "Point"; coordinates: [number, number] } | null;
};

interface RegionCenter {
  lat: number;
  lon: number;
}

function parseBbox(param: string | null): [number, number, number, number] | null {
  if (!param) return null;
  const nums = param.split(",").map(Number);
  if (nums.length !== 4 || nums.some(Number.isNaN)) return null;
  return [nums[0], nums[1], nums[2], nums[3]];
}

function withinBbox(location: RegionCenter, bbox: [number, number, number, number]) {
  const [w, s, e, n] = bbox;
  return location.lon >= w && location.lon <= e && location.lat >= s && location.lat <= n;
}

function extractCenter(meta: unknown): RegionCenter | null {
  if (!meta || typeof meta !== "object") return null;
  const data = meta as Record<string, any>;
  const centerCandidates = [
    data.center,
    data.centroid,
    { lat: data.centerLat, lon: data.centerLon },
    { lat: data.lat, lon: data.lon },
  ];
  for (const entry of centerCandidates) {
    if (!entry) continue;
    const lat = typeof entry.lat === "number" ? entry.lat : Array.isArray(entry) ? entry[1] : undefined;
    const lon = typeof entry.lon === "number" ? entry.lon : Array.isArray(entry) ? entry[0] : undefined;
    if (typeof lat === "number" && typeof lon === "number") return { lat, lon };
  }
  if (Array.isArray(data.bbox) && data.bbox.length === 4 && data.bbox.every((n: any) => typeof n === "number")) {
    const [w, s, e, n] = data.bbox as [number, number, number, number];
    return { lat: (s + n) / 2, lon: (w + e) / 2 };
  }
  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bbox = parseBbox(searchParams.get("bbox"));
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || 200), 1), 500);
  const localeParam = searchParams.get("locale");
  const locale = localeParam && isSupportedLocale(localeParam) ? localeParam : DEFAULT_LOCALE;
  const langFilter = searchParams.get("lang") || undefined;
  const timeRangeParam = (searchParams.get("timeRange") as TimeRangeKey | null) || "90d";
  const { dateFrom, dateTo } = resolveTimeRange(timeRangeParam);

  const rl = await rateLimitFromRequest(req, RL_LIMIT, RL_WINDOW, {
    salt: process.env.RL_SALT,
    scope: "GET:/api/map/points",
  });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many requests", retryInMs: rl.retryIn },
      { status: 429, headers: rateLimitHeaders(rl) },
    );
  }

  try {
    const heatmap = await getEvidenceRegionHeatmap({ locale: langFilter, limit, dateFrom, dateTo });
    const regionCodes = heatmap.map((entry) => entry.regionCode);

    const [decisionRows, regionRows] = await Promise.all([
      regionCodes.length
        ? (await evidenceDecisionsCol())
            .aggregate<{ _id: string | null; count: number }>([
              { $match: { regionCode: { $in: regionCodes } } },
              { $group: { _id: "$regionCode", count: { $sum: 1 } } },
            ])
            .toArray()
        : [],
      regionCodes.length
        ? prisma.region.findMany({
            where: { code: { in: regionCodes } },
            select: { code: true, name: true },
          })
        : [],
    ]);

    const decisionMap = new Map<string, number>();
    decisionRows.forEach((row) => {
      if (row._id) decisionMap.set(row._id, row.count);
    });

    const centerMap = new Map<string, RegionCenter | null>();
    const fallbackName = new Map<string, string>();
    regionRows.forEach((row) => {
      centerMap.set(row.code, null);
      fallbackName.set(row.code, row.name);
    });

    const nameEntries = await Promise.all(
      regionCodes.map((code) => getRegionName(code, locale).catch(() => null)),
    );
    const nameMap = new Map<string, string>();
    regionCodes.forEach((code, idx) => {
      const translated = nameEntries[idx];
      nameMap.set(code, translated || fallbackName.get(code) || code);
    });

    const points: MapPoint[] = heatmap.map((entry) => {
      const location = centerMap.get(entry.regionCode) ?? null;
      return {
        id: entry.regionCode,
        regionCode: entry.regionCode,
        regionName: nameMap.get(entry.regionCode) || entry.regionCode,
        claimCount: entry.claimCount,
        decisionCount: decisionMap.get(entry.regionCode) ?? 0,
        lastUpdated: entry.lastUpdated ? new Date(entry.lastUpdated).toISOString() : null,
        location: location ? { type: "Point", coordinates: [location.lon, location.lat] } : null,
      };
    });

    const filtered = bbox
        ? points.filter((p) => (p.location ? withinBbox({ lat: p.location.coordinates[1], lon: p.location.coordinates[0] }, bbox) : false))
        : points;

    return NextResponse.json({ ok: true, points: filtered });
  } catch (error) {
    console.error("/api/map/points error", error);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
