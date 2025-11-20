// apps/web/src/app/api/map/points/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { ObjectId } from "@core/db/triMongo";
import { NextRequest, NextResponse } from "next/server";

import { coreCol, votesCol } from "src/utils/db/triMongo";
import { rateLimitFromRequest, rateLimitHeaders } from "src/utils/rateLimitHelpers";

/** --- Rate Limit Config (aus v2) ---------------------------------------- */
const RL_LIMIT = 60;       // 60 req/min pro IP+Route
const RL_WINDOW = 60_000;  // 1 Minute

/** --- Helpers ------------------------------------------------------------ */

function parseBbox(
  param: string | null,
): [number, number, number, number] | null {
  if (!param) return null;
  const a = param.split(",").map(Number);
  if (a.length !== 4 || a.some(Number.isNaN)) return null;
  const [w, s, e, n] = a;
  return [
    Math.max(-180, w),
    Math.max(-90, s),
    Math.min(180, e),
    Math.min(90, n),
  ];
}

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

type Summary = {
  agree: number;
  neutral: number;
  disagree: number;
  requiredMajority?: number;
};

/** Aggregiert Votes für viele Statements in einem Rutsch (ObjectId ODER string). */
async function batchVotesSummary(
  statementIdsObj: ObjectId[],
  statementIdsStr: string[],
) {
  const votes = await votesCol("votes");

  const or: any[] = [];
  if (statementIdsObj.length)
    or.push({ statementId: { $in: statementIdsObj } });
  if (statementIdsStr.length)
    or.push({ statementId: { $in: statementIdsStr } });

  if (!or.length) return new Map<string, Summary>();

  const match: any = or.length === 1 ? or[0] : { $or: or };
  const pipeline: any[] = [
    { $match: match },
    {
      $group: {
        _id: { sid: "$statementId", v: "$value" },
        c: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: "$_id.sid",
        counts: {
          $push: { k: "$_id.v", v: "$c" },
        },
      },
    },
  ];

  const rows = await votes
    .aggregate(pipeline, { allowDiskUse: true })
    .toArray();
  const map = new Map<string, Summary>();

  for (const r of rows) {
    const idKey = String(r._id);
    const s: Summary = { agree: 0, neutral: 0, disagree: 0 };
    for (const { k, v } of r.counts as Array<{ k: string; v: number }>) {
      const kk = String(k).toLowerCase();
      if (kk === "agree" || kk === "yes" || kk === "pro" || kk === "for")
        s.agree += v;
      else if (
        kk === "disagree" ||
        kk === "no" ||
        kk === "contra" ||
        kk === "against"
      )
        s.disagree += v;
      else s.neutral += v;
    }
    map.set(idKey, s);
  }
  return map;
}

/** --- Clustering (optional) --------------------------------------------- */

function cellSizeDeg(zoom: number) {
  const z = Math.max(0, Math.min(22, Math.floor(zoom)));
  return 360 / Math.pow(2, z + 2);
}
type ClusterKey = string;
function keyFor(lon: number, lat: number, size: number): ClusterKey {
  const x = Math.floor((lon + 180) / size);
  const y = Math.floor((lat + 90) / size);
  return `${x}:${y}`;
}

/** --- Handler ------------------------------------------------------------ */

export async function GET(req: NextRequest) {
  // ---- Rate Limit vorschalten (aus v2)
  const rl = await rateLimitFromRequest(req, RL_LIMIT, RL_WINDOW, {
    salt: process.env.RL_SALT,
    scope: "GET:/api/map/points",
  });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many requests", retryInMs: rl.retryIn },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  try {
    const { searchParams } = new URL(req.url);

    const bbox = parseBbox(searchParams.get("bbox"));
    const limit = Math.min(
      Math.max(Number(searchParams.get("limit") || 200), 1),
      1000,
    );
    const tags = (searchParams.get("tags") || "")
      .split(",")
      .map((s: any) => s.trim())
      .filter(Boolean);
    const status = searchParams.get("status") || undefined;

    // Sprache: in der Collection heißt das Feld "language"
    const lang = searchParams.get("lang") || undefined;

    // Regionale Filter auf regionScope
    const region = searchParams.get("region") || undefined;
    const regionMode = (searchParams.get("regionMode") || "contains") as
      | "contains"
      | "overlaps";

    // Cluster-Option
    const doCluster = searchParams.get("cluster") === "true";
    const zoom = Number(searchParams.get("zoom") || 6);

    // Wenn freshVotes=true, zählen wir live aus votes (Batch-Aggregation).
    const freshVotes = searchParams.get("freshVotes") === "true";

    const stmts = await coreCol("statements");

    // Query auf Statements
    const q: any = {
      location: { $exists: true },
      "location.type": "Point",
    };
    if (bbox) q.location = { $geoWithin: { $geometry: bboxToPolygon(bbox) } };
    if (tags.length) q.tags = { $in: tags };
    if (status) q.status = status;
    if (lang) q.language = lang; // <<< Korrektur: language statt lang
    if (region) {
      // regionScope = [{ code: "DE-BE", ... }, ...]
      if (regionMode === "contains") {
        q["regionScope.code"] = region;
      } else {
        // overlaps: Präfix-Match (vereinfachte Hierarchie-Heuristik)
        q["regionScope.code"] = { $regex: `^${region}` };
      }
    }

    // Projektion – nur Kartenrelevantes + ids + votes
    const projection = {
      title: 1,
      category: 1,
      tags: 1,
      status: 1,
      language: 1, // <<< statt lang
      location: 1,
      votes: 1,
      id: 1,
    };

    const items = await stmts.find(q, { projection }).limit(limit).toArray();

    // Optional: live Votes aus votes-Collection ziehen (batch, kein N+1)
    let liveMap: Map<string, Summary> | null = null;
    if (freshVotes && items.length) {
      const idsObj = items
        .map((s: any) => s?._id)
        .filter((x: any): x is ObjectId => !!x);
      const idsStr = items
        .map((s: any) => s?.id)
        .filter((x: any): x is string => typeof x === "string" && x.length > 0);
      liveMap = await batchVotesSummary(idsObj, idsStr);
    }

    // Features bauen
    const features = items.map((s: any) => {
      const keyObj = s?._id ? String(s._id) : null;
      const keyStr = typeof s?.id === "string" ? s.id : null;

      const agg: Summary =
        (liveMap && (liveMap.get(keyObj || "") || liveMap.get(keyStr || ""))) ||
        (s.votes ?? { agree: 0, neutral: 0, disagree: 0 });

      const votes: Summary = {
        agree: Number(agg.agree) || 0,
        neutral: Number(agg.neutral) || 0,
        disagree: Number(agg.disagree) || 0,
        requiredMajority: Number(s?.votes?.requiredMajority) || 50,
      };

      return {
        type: "Feature" as const,
        geometry: s.location,
        properties: {
          id: String(s._id ?? s.id),
          title: s.title,
          category: s.category,
          tags: s.tags ?? [],
          status: s.status ?? null,
          language: s.language ?? null, // <<< konsistent
          votes,
        },
      };
    });

    // Antwortpayload bauen (mit/ohne Clustering)
    let payload:
      | {
          type: "FeatureCollection";
          features: any[];
          count: number;
          clustered?: boolean;
          zoom?: number;
          freshVotes: boolean;
          query: { region?: string; regionMode: "contains" | "overlaps" };
        }
      | {
          type: "FeatureCollection";
          features: any[];
          count: number;
          freshVotes: boolean;
          query: { region?: string; regionMode: "contains" | "overlaps" };
        };

    if (doCluster) {
      const size = cellSizeDeg(zoom);
      const bucket = new Map<
        ClusterKey,
        {
          lon: number;
          lat: number;
          n: number;
          votes: { agree: number; neutral: number; disagree: number };
        }
      >();

      for (const f of features) {
        const [lon, lat] = (f.geometry as any).coordinates as [number, number];
        const k = keyFor(lon, lat, size);
        const b = bucket.get(k) || {
          lon: 0,
          lat: 0,
          n: 0,
          votes: { agree: 0, neutral: 0, disagree: 0 },
        };
        b.lon += lon;
        b.lat += lat;
        b.n += 1;
        b.votes.agree += f.properties.votes.agree;
        b.votes.neutral += f.properties.votes.neutral;
        b.votes.disagree += f.properties.votes.disagree;
        bucket.set(k, b);
      }

      const clusters = Array.from(bucket.values()).map((b: any) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [b.lon / b.n, b.lat / b.n],
        },
        properties: { cluster: true, count: b.n, votes: b.votes },
      }));

      payload = {
        type: "FeatureCollection",
        features: clusters,
        count: clusters.length,
        clustered: true,
        zoom,
        freshVotes,
        query: { region, regionMode },
      };
    } else {
      payload = {
        type: "FeatureCollection",
        features,
        count: features.length,
        freshVotes,
        query: { region, regionMode },
      };
    }

    // Rate-Limit-Header am Erfolg anfügen (aus v2)
    const res = NextResponse.json(payload);
    const headers = rateLimitHeaders(rl);
    for (const [k, v] of Object.entries(headers)) res.headers.set(k, String(v));
    return res;
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "err" },
      { status: 500 },
    );
  }
}
