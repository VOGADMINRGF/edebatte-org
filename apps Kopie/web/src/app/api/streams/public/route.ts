export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { streamSessionsCol } from "@features/stream/db";
import { resolveSessionStatus } from "@features/stream/types";

export async function GET() {
  const col = await streamSessionsCol();

  const sessions = await col
    .find({ visibility: "public" })
    .sort({ isLive: -1, startsAt: 1, createdAt: -1 })
    .limit(50)
    .toArray();

  const items = sessions.map((session) => ({
    id: (session._id as any)?.toHexString?.() ?? "",
    title: session.title,
    description: session.description ?? null,
    status: resolveSessionStatus(session),
    isLive: !!session.isLive,
    topicKey: session.topicKey ?? null,
    regionCode: session.regionCode ?? null,
    startsAt: session.startsAt ? new Date(session.startsAt).toISOString() : null,
    playerUrl: (session as any)?.playerUrl ?? null,
    visibility: session.visibility,
    createdAt: (session.createdAt ?? new Date()).toISOString(),
  }));

  return NextResponse.json({ ok: true, sessions: items });
}
