export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "@core/db/triMongo";
import { streamAgendaCol, streamSessionsCol } from "@features/stream/db";
import { VoteModel } from "@/models/votes/Vote";
import { createHash } from "node:crypto";
import { resolveSessionStatus } from "@features/stream/types";

function hashSession(input: string) {
  return createHash("sha256").update(input).digest("hex").slice(0, 40);
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const agendaCol = await streamAgendaCol();
  const sessionCol = await streamSessionsCol();
  const body = (await req.json().catch(() => null)) as { agendaItemId?: string; choice?: string } | null;
  const agendaItemId = body?.agendaItemId;
  const choice = String(body?.choice ?? "").trim();
  if (!agendaItemId || !choice) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  const session = await sessionCol.findOne({ _id: new ObjectId(id) });
  const sessionStatus = session ? resolveSessionStatus(session) : "ended";
  if (!session || sessionStatus !== "live") {
    return NextResponse.json({ ok: false, error: "session_not_live" }, { status: 400 });
  }

  const item = await agendaCol.findOne({ _id: new ObjectId(agendaItemId), sessionId: new ObjectId(id) });
  if (!item || item.kind !== "poll") {
    return NextResponse.json({ ok: false, error: "poll_not_found" }, { status: 404 });
  }
  if (item.status !== "live") {
    return NextResponse.json({ ok: false, error: "poll_not_live" }, { status: 400 });
  }
  const options = item.pollOptions ?? [];
  if (!options.includes(choice)) {
    return NextResponse.json({ ok: false, error: "invalid_option" }, { status: 400 });
  }

  const userId = req.cookies.get("u_id")?.value ?? null;
  if (item.publicAttribution === "public" && !userId) {
    return NextResponse.json({ ok: false, error: "login_required" }, { status: 401 });
  }

  const ip = req.headers.get("x-forwarded-for") ?? "0.0.0.0";
  const ua = req.headers.get("user-agent") ?? "unknown";
  const sessionHash = item.allowAnonymousVoting ? hashSession(`${ip}|${ua}|${id}`) : hashSession(userId ?? `${ip}|${ua}`);
  const Vote = await VoteModel();
  await Vote.updateOne(
    {
      streamSessionId: id,
      agendaItemId,
      sessionId: sessionHash,
    },
    {
      $set: {
        statementId: agendaItemId,
        streamSessionId: id,
        agendaItemId,
        sessionId: sessionHash,
        choice,
        userHash: userId ? hashSession(userId) : undefined,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );

  return NextResponse.json({ ok: true });
}
