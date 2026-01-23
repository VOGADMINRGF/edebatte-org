// apps/web/src/app/api/health/typesense/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const host = process.env.TYPESENSE_HOST;
    const port = process.env.TYPESENSE_PORT || "8108";
    const protocol = process.env.TYPESENSE_PROTOCOL || "http";
    const apiKey = process.env.TYPESENSE_API_KEY;

    if (!host || !apiKey) {
      return NextResponse.json(
        { ok: false, error: "Missing TYPESENSE_HOST/API_KEY" },
        { status: 200 },
      );
    }

    const r = await fetch(`${protocol}://${host}:${port}/health`, {
      headers: { "X-TYPESENSE-API-KEY": apiKey },
    });
    const j = await r.json().catch(() => ({}));
    const ok =
      r.ok && (j.ok === true || j.healthy === true || j.status === "ok");
    return NextResponse.json(
      { ok, status: j || r.statusText },
      { status: 200 },
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 200 },
    );
  }
}
