export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { coreCol } from "@core/db/triMongo";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limitParam = Number(url.searchParams.get("limit") ?? "20");
  const limit = clamp(Number.isFinite(limitParam) ? limitParam : 20, 1, 100);
  const from = url.searchParams.get("from")
    ? new Date(String(url.searchParams.get("from")))
    : null;
  const to = url.searchParams.get("to")
    ? new Date(String(url.searchParams.get("to")))
    : null;

  const q: any = {};
  if (from || to) {
    q.startAt = {};
    if (from) q.startAt.$gte = from;
    if (to) q.startAt.$lte = to;
  }

  const events = await (await coreCol("events"))
    .find(q)
    .sort({ startAt: 1 })
    .limit(limit)
    .toArray();

  return NextResponse.json({
    ok: true,
    data: events.map((e: any) => ({ ...e, id: String(e._id) })),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const now = new Date();
  const doc = {
    title: String(body?.title ?? "")
      .trim()
      .slice(0, 200),
    description: body?.description
      ? String(body.description).slice(0, 4000)
      : undefined,
    startAt: new Date(body?.startAt ?? now),
    endAt: body?.endAt ? new Date(body.endAt) : undefined,
    tags: Array.isArray(body?.tags)
      ? body.tags.slice(0, 20).map(String)
      : undefined,
    organizationId: body?.organizationId
      ? String(body.organizationId)
      : undefined,
    location:
      body?.location && Array.isArray(body.location?.coordinates)
        ? {
            type: "Point",
            coordinates: [
              Number(body.location.coordinates[0]),
              Number(body.location.coordinates[1]),
            ] as [number, number],
          }
        : undefined,
    createdAt: now,
    updatedAt: now,
  };
  if (!doc.title)
    return NextResponse.json({ error: "title required" }, { status: 400 });

  const col = await coreCol("events");
  const ins = await col.insertOne(doc);
  return NextResponse.json(
    { ok: true, id: String(ins.insertedId) },
    { status: 201 },
  );
}
