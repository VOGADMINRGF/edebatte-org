export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "@core/db/triMongo";
import { streamSessionsCol } from "@features/stream/db";
import type { StreamSessionDoc, StreamVisibility } from "@features/stream/types";
import { resolveSessionStatus } from "@features/stream/types";
import { requireCreatorContext } from "../utils";

export async function GET(req: NextRequest) {
  const ctx = await requireCreatorContext(req);
  if (!ctx) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const col = await streamSessionsCol();
  const filter = ctx.isStaff ? {} : { creatorId: ctx.userId };
  const sessions = await col
    .find(filter)
    .sort({ updatedAt: -1 })
    .limit(50)
    .toArray();

  return NextResponse.json({
    ok: true,
    sessions: sessions.map((session) => ({
      ...session,
      status: resolveSessionStatus(session),
      _id: (session._id as ObjectId)?.toHexString?.() ?? "",
    })),
  });
}

export async function POST(req: NextRequest) {
  const ctx = await requireCreatorContext(req);
  if (!ctx) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as Partial<StreamSessionDoc> | null;
  const title = String(body?.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ ok: false, error: "TITLE_REQUIRED" }, { status: 400 });
  }

  const now = new Date();
  const doc: StreamSessionDoc = {
    creatorId: ctx.userId,
    title,
    description: body?.description ?? null,
    regionCode: body?.regionCode ?? null,
    topicKey: body?.topicKey ?? null,
    isLive: false,
    visibility: (body?.visibility as StreamVisibility) ?? "unlisted",
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };

  const col = await streamSessionsCol();
  const result = await col.insertOne(doc);

  return NextResponse.json({
    ok: true,
    sessionId: result.insertedId.toHexString(),
  });
}
