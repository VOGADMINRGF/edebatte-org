export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "@core/db/triMongo";
import { streamAgendaCol } from "@features/stream/db";
import { VoteModel } from "@/models/votes/Vote";
import { createHash } from "node:crypto";

function hashSession(input: string) {
  return createHash("sha256").update(input).digest("hex").slice(0, 40);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const agendaCol = await streamAgendaCol();
  const body = (await req.json().catch(() => null)) as { agendaItemId?: string; choice?: string } | null;
  const agendaItemId = body?.agendaItemId;
  const choice = String(body?.choice ?? "").trim();
  if (!agendaItemId || !choice) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  const item = await agendaCol.findOne({ _id: new ObjectId(agendaItemId), sessionId: new ObjectId(params.id) });
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
  const sessionHash = item.allowAnonymousVoting ? hashSession(`${ip}|${ua}|${params.id}`) : hashSession(userId ?? `${ip}|${ua}`);
  const Vote = await VoteModel();
  await Vote.updateOne(
    {
      streamSessionId: params.id,
      agendaItemId,
      sessionId: sessionHash,
    },
    {
      $set: {
        statementId: agendaItemId,
        streamSessionId: params.id,
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
