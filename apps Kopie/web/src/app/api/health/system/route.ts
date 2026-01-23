// apps/web/src/app/api/health/system/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Badge = "green" | "yellow" | "red" | "grey";
const badge = (ok?: boolean, pending = false): Badge =>
  pending ? "yellow" : ok === true ? "green" : ok === false ? "red" : "grey";

// ---- helpers ---------------------------------------------------------------

async function fetchJSON<T = any>(
  input: RequestInfo | URL,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  const { timeoutMs = 4000, ...rest } = init;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort("timeout"), timeoutMs);
  try {
    const r = await fetch(input, {
      ...rest,
      cache: "no-store",
      signal: ctrl.signal,
    });
    // falls Non-200: trotzdem versuchen JSON zu parsen für error-info
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(`HTTP ${r.status}`), { data });
    return data as T;
  } finally {
    clearTimeout(timer);
  }
}

function msSince(t0: number) {
  return Date.now() - t0;
}

// ---- checks ---------------------------------------------------------------

async function checkPrisma(base: URL) {
  try {
    const t0 = Date.now();
    const j = await fetchJSON<any>(new URL("/api/health/prisma", base));
    const systems = [
      {
        name: "MongoDB",
        detail: "Core (Mongoose ping)",
        status: badge(j?.services?.core?.ok),
        latency: j?.services?.core?.latency,
        error: j?.services?.core?.error,
      },
      {
        name: "Postgres",
        detail: "Web (Prisma SELECT 1)",
        status: badge(j?.services?.web?.ok),
        latency: j?.services?.web?.latency,
        error: j?.services?.web?.error,
      },
    ];
    return { systems, latency: msSince(t0) };
  } catch (e: any) {
    // Fallback: beide rot markieren
    return {
      systems: [
        {
          name: "MongoDB",
          detail: "Core (Mongoose ping)",
          status: "red" as Badge,
          error: e?.message || "prisma_fetch_failed",
        },
        {
          name: "Postgres",
          detail: "Web (Prisma SELECT 1)",
          status: "red" as Badge,
          error: e?.message || "prisma_fetch_failed",
        },
      ],
      latency: undefined,
    };
  }
}

async function checkStreams(base: URL) {
  try {
    const t0 = Date.now();
    const j = await fetchJSON<any>(new URL("/api/health/streams", base));
    return {
      system: {
        name: "Streams",
        detail: "Events & Idempotenz",
        status: badge(j?.ok),
        extra: j?.counts,
        latency: msSince(t0),
      },
    };
  } catch (e: any) {
    return {
      system: {
        name: "Streams",
        detail: "Events & Idempotenz",
        status: "red" as Badge,
        error: e?.message || "streams_fetch_failed",
      },
    };
  }
}

async function checkARI() {
  if (!process.env.ARI_HEALTH_URL) {
    return {
      system: { name: "ARI", detail: "HEAD 200", status: "grey" as Badge },
    };
  }
  const t0 = Date.now();
  try {
    const r = await fetch(process.env.ARI_HEALTH_URL, {
      method: "HEAD",
      cache: "no-store",
    });
    return {
      system: {
        name: "ARI",
        detail: "HEAD 200",
        status: badge(r.ok),
        latency: msSince(t0),
      },
    };
  } catch (e: any) {
    return {
      system: {
        name: "ARI",
        detail: "HEAD 200",
        status: "red" as Badge,
        error: e?.message || "ari_head_failed",
      },
    };
  }
}

// 🔎 NEU: Map-Stack (intern auf deine /api/health/map)
async function checkMapStack(base: URL) {
  try {
    const t0 = Date.now();
    const j = await fetchJSON<any>(new URL("/api/health/map", base), {
      timeoutMs: 3500,
    });
    return {
      system: {
        name: "map:stack",
        detail: "Karten/Tiles reachable",
        status: j?.ok ? ("green" as Badge) : ("yellow" as Badge),
        latency: msSince(t0),
        extra: j, // enthält detailierte checks (tile, geocoder, style, cdn, etc.)
      },
    };
  } catch (e: any) {
    return {
      system: {
        name: "map:stack",
        status: "red" as Badge,
        error: e?.message || "map_fetch_failed",
      },
    };
  }
}

// ---- handler --------------------------------------------------------------

export async function GET(request: Request) {
  const base = new URL(request.url);

  const [prismaRes, streamsRes, ariRes, mapRes] = await Promise.all([
    checkPrisma(base),
    checkStreams(base),
    checkARI(),
    checkMapStack(base),
  ]);

  const systems = [
    ...prismaRes.systems,
    streamsRes.system,
    ariRes.system,
    mapRes.system, // ← die neue Map-Kachel
  ];

  const overall = systems.every(
    (s) => s.status === "green" || s.status === "grey",
  );
  return NextResponse.json(
    {
      ok: overall,
      systems,
      ts: new Date().toISOString(),
    },
    { status: overall ? 200 : 503 },
  );
}
