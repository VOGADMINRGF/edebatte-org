export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

function resolveAriBaseUrl() {
  const raw =
    process.env.ARI_BASE_URL ||
    process.env.ARI_URL ||
    process.env.ARI_API_URL ||
    process.env.YOUCOM_ARI_API_URL ||
    "";
  return raw.replace(/\/+$/, "");
}

function resolveAriApiKey() {
  return process.env.ARI_API_KEY || process.env.YOUCOM_ARI_API_KEY || "";
}

export async function GET() {
  const base = resolveAriBaseUrl();
  const key = resolveAriApiKey();

  if (!base) {
    return NextResponse.json(
      {
        name: "ai:ari",
        ok: false,
        error:
          "ARI base URL missing (checked ARI_BASE_URL, ARI_URL, ARI_API_URL, YOUCOM_ARI_API_URL)",
      },
      { status: 500 },
    );
  }

  if (!key) {
    return NextResponse.json(
      {
        name: "ai:ari",
        ok: false,
        error: "ARI API key missing (checked ARI_API_KEY, YOUCOM_ARI_API_KEY)",
      },
      { status: 500 },
    );
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${key}`,
  };

  // Try a few common endpoints (keep lightweight)
  const paths = ["/v1/models", "/models", "/health", "/"];

  for (const p of paths) {
    try {
      const res = await fetch(`${base}${p}`, { headers, cache: "no-store" });
      if (res.ok) {
        return NextResponse.json(
          { name: "ai:ari", ok: true, status: res.status, pathTried: p },
          { status: 200 },
        );
      }
    } catch {
      // continue
    }
  }

  return NextResponse.json(
    {
      name: "ai:ari",
      ok: false,
      error: `ARI not reachable at ${base} (tried ${paths.join(", ")})`,
    },
    { status: 500 },
  );
}
