export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "@core/db/triMongo";
import {
  streamAgendaCol,
  streamSessionsCol,
} from "@features/stream/db";
import type {
  StreamAgendaItemDoc,
  StreamAgendaKind,
  StreamAttributionMode,
  StreamSessionStatus,
} from "@features/stream/types";
import { resolveSessionStatus } from "@features/stream/types";
import { enforceStreamHost, requireCreatorContext } from "../../../utils";
import { rateLimitOrThrow } from "@/utils/rateLimitHelpers";

async function loadSession(sessionId: string) {
  const col = await streamSessionsCol();
  return col.findOne({ _id: new ObjectId(sessionId) });
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const ctx = await requireCreatorContext(req);
  if (!ctx) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const session = await loadSession(id);
  if (!session) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  if (!ctx.isStaff && session.creatorId !== ctx.userId) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const status = resolveSessionStatus(session);
  const sessionWithStatus = { ...session, status };

  const agendaCol = await streamAgendaCol();
  const items = await agendaCol
    .find({ sessionId: new ObjectId(id) })
    .sort({ createdAt: 1 })
    .toArray();

  return NextResponse.json({
    ok: true,
    session: {
      ...sessionWithStatus,
      _id: (session._id as ObjectId)?.toHexString?.(),
    },
    items: items.map((item) => ({
      ...item,
      _id: item._id?.toHexString(),
      sessionId: item.sessionId.toHexString(),
    })),
  });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const ctx = await requireCreatorContext(req);
  if (!ctx) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const gating = await enforceStreamHost(ctx);
  if (gating) return gating;
  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  const rl = await rateLimitOrThrow(`stream:agenda:add:${ctx.userId}:${ip}`, 30, 60 * 60 * 1000, {
    salt: "stream-agenda",
  });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited", retryInMs: rl.retryIn },
      { status: 429 },
    );
  }

  const { id } = await context.params;
  const session = await loadSession(id);
  if (!session) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  if (!ctx.isStaff && session.creatorId !== ctx.userId) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const status = resolveSessionStatus(session);
  if (status === "ended" || status === "cancelled") {
    return NextResponse.json({ ok: false, error: "session_closed" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as Partial<StreamAgendaItemDoc> | null;
  const kind = String(body?.kind ?? "").trim() as StreamAgendaKind;
  if (!["statement", "question", "poll", "info"].includes(kind)) {
    return NextResponse.json({ ok: false, error: "invalid_kind" }, { status: 400 });
  }

  const agendaCol = await streamAgendaCol();
  const now = new Date();
  const doc: StreamAgendaItemDoc = {
    sessionId: new ObjectId(id),
    creatorId: ctx.userId,
    kind,
    status: "queued",
    statementId: body?.statementId ?? null,
    evidenceClaimId: body?.evidenceClaimId ? new ObjectId(body.evidenceClaimId as any) : null,
    reportId: body?.reportId ?? null,
    customQuestion: body?.customQuestion ?? null,
    description: body?.description ?? null,
    pollOptions: Array.isArray(body?.pollOptions)
      ? (body!.pollOptions!.map((opt: any) => String(opt)).filter(Boolean) as string[])
      : [],
    allowAnonymousVoting: body?.allowAnonymousVoting ?? true,
    publicAttribution: (body?.publicAttribution as StreamAttributionMode) ?? "hidden",
    createdAt: now,
    updatedAt: now,
  };

  const result = await agendaCol.insertOne(doc);
  return NextResponse.json({ ok: true, itemId: result.insertedId.toHexString() });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const ctx = await requireCreatorContext(req);
  if (!ctx) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const gating = await enforceStreamHost(ctx);
  if (gating) return gating;
  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  const rl = await rateLimitOrThrow(`stream:agenda:update:${ctx.userId}:${ip}`, 60, 60 * 60 * 1000, {
    salt: "stream-agenda",
  });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited", retryInMs: rl.retryIn },
      { status: 429 },
    );
  }
  const { id } = await context.params;
  const session = await loadSession(id);
  if (!session) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  if (!ctx.isStaff && session.creatorId !== ctx.userId) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as { itemId?: string; action?: string } | null;
  const itemId = body?.itemId;
  if (!itemId) return NextResponse.json({ ok: false, error: "item_required" }, { status: 400 });

  const action = (body?.action as "go_live" | "skip" | "archive" | "end_session") ?? "archive";
  const agendaCol = await streamAgendaCol();
  const now = new Date();

  if (action === "end_session") {
    const sessions = await streamSessionsCol();
    await sessions.updateOne(
      { _id: new ObjectId(id) },
      { $set: { isLive: false, status: "ended" as StreamSessionStatus, endedAt: now, updatedAt: now } },
    );
    await agendaCol.updateMany(
      { sessionId: new ObjectId(id), status: "live" },
      { $set: { status: "archived", archivedAt: now, updatedAt: now } },
    );
  } else if (action === "go_live") {
    await agendaCol.updateMany(
      { sessionId: new ObjectId(id), status: "live" },
      { $set: { status: "archived", archivedAt: now } },
    );
    await agendaCol.updateOne(
      { _id: new ObjectId(itemId) },
      { $set: { status: "live", activeSince: now, updatedAt: now } },
    );
    const sessions = await streamSessionsCol();
    await sessions.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          isLive: true,
          status: "live" as StreamSessionStatus,
          updatedAt: now,
          startedAt: session.startedAt ?? now,
        },
      },
    );
  } else if (action === "skip") {
    await agendaCol.updateOne(
      { _id: new ObjectId(itemId) },
      { $set: { status: "skipped", archivedAt: now, updatedAt: now } },
    );
  } else {
    await agendaCol.updateOne(
      { _id: new ObjectId(itemId) },
      { $set: { status: "archived", archivedAt: now, updatedAt: now } },
    );
  }

  return NextResponse.json({ ok: true });
}
