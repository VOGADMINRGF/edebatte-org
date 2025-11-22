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
} from "@features/stream/types";
import { requireCreatorContext } from "../../../utils";

async function loadSession(sessionId: string) {
  const col = await streamSessionsCol();
  return col.findOne({ _id: new ObjectId(sessionId) });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireCreatorContext(req);
  if (!ctx) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const session = await loadSession(params.id);
  if (!session) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  if (!ctx.isStaff && session.creatorId !== ctx.userId) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const agendaCol = await streamAgendaCol();
  const items = await agendaCol
    .find({ sessionId: new ObjectId(params.id) })
    .sort({ createdAt: 1 })
    .toArray();

  return NextResponse.json({
    ok: true,
    session: {
      ...session,
      _id: (session._id as ObjectId)?.toHexString?.(),
    },
    items: items.map((item) => ({
      ...item,
      _id: item._id?.toHexString(),
      sessionId: item.sessionId.toHexString(),
    })),
  });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireCreatorContext(req);
  if (!ctx) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const session = await loadSession(params.id);
  if (!session) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  if (!ctx.isStaff && session.creatorId !== ctx.userId) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Partial<StreamAgendaItemDoc> | null;
  const kind = String(body?.kind ?? "").trim() as StreamAgendaKind;
  if (!["statement", "question", "poll", "info"].includes(kind)) {
    return NextResponse.json({ ok: false, error: "invalid_kind" }, { status: 400 });
  }

  const agendaCol = await streamAgendaCol();
  const now = new Date();
  const doc: StreamAgendaItemDoc = {
    sessionId: new ObjectId(params.id),
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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireCreatorContext(req);
  if (!ctx) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const session = await loadSession(params.id);
  if (!session) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  if (!ctx.isStaff && session.creatorId !== ctx.userId) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as { itemId?: string; action?: string } | null;
  const itemId = body?.itemId;
  if (!itemId) return NextResponse.json({ ok: false, error: "item_required" }, { status: 400 });

  const action = body?.action ?? "archive";
  const agendaCol = await streamAgendaCol();
  const now = new Date();

  if (action === "go_live") {
    await agendaCol.updateMany(
      { sessionId: new ObjectId(params.id), status: "live" },
      { $set: { status: "archived", archivedAt: now } },
    );
    await agendaCol.updateOne(
      { _id: new ObjectId(itemId) },
      { $set: { status: "live", activeSince: now, updatedAt: now } },
    );
    const sessions = await streamSessionsCol();
    await sessions.updateOne(
      { _id: new ObjectId(params.id) },
      { $set: { isLive: true, updatedAt: now, startedAt: session.startedAt ?? now } },
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
