export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "@core/db/triMongo";
import { streamAgendaCol, streamSessionsCol } from "@features/stream/db";
import type { StreamOverlayItem } from "@features/stream/types";
import { resolveSessionStatus } from "@features/stream/types";
import { VoteModel } from "@/models/votes/Vote";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const sessionId = new ObjectId(id);
  const sessions = await streamSessionsCol();
  const session = await sessions.findOne({ _id: sessionId });
  if (!session) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const sessionStatus = resolveSessionStatus(session);

  if (sessionStatus !== "live") {
    return NextResponse.json({
      ok: true,
      session: {
        id: session._id?.toHexString?.(),
        title: session.title,
        description: session.description ?? null,
        isLive: false,
        status: sessionStatus,
      },
      items: [],
      updatedAt: new Date().toISOString(),
    });
  }

  const agendaCol = await streamAgendaCol();
  const liveItems = await agendaCol
    .find({ sessionId, status: "live" })
    .sort({ activeSince: -1 })
    .limit(3)
    .toArray();

  const pollItems = liveItems.filter((item) => item.kind === "poll" && item._id);
  const pollTotals = pollItems.length ? await aggregatePollTotals(pollItems.map((item) => item._id!)) : new Map();

  const overlayItems: StreamOverlayItem[] = liveItems.map((item) => ({
    id: item._id?.toHexString?.() ?? "",
    kind: item.kind,
    title: item.customQuestion || item.description || "Live-Thema",
    body: item.description ?? null,
    pollOptions: item.pollOptions ?? [],
    allowAnonymousVoting: item.allowAnonymousVoting,
    publicAttribution: item.publicAttribution,
    pollTotals: pollTotals.get(item._id?.toHexString?.() ?? "") ?? {},
  }));

  return NextResponse.json({
    ok: true,
    session: {
      id: session._id?.toHexString?.(),
      title: session.title,
      description: session.description ?? null,
      isLive: sessionStatus === "live",
      status: sessionStatus,
    },
    items: overlayItems,
    updatedAt: new Date().toISOString(),
  });
}

async function aggregatePollTotals(ids: ObjectId[]) {
  const Vote = await VoteModel();
  const rows = await Vote.aggregate([
    {
      $match: {
        agendaItemId: { $in: ids.map((id) => id.toHexString()) },
      },
    },
    {
      $group: {
        _id: { agenda: "$agendaItemId", choice: "$choice" },
        total: { $sum: 1 },
      },
    },
  ]).toArray();

  const map = new Map<string, Record<string, number>>();
  rows.forEach((row) => {
    const agendaId = row._id.agenda;
    if (!map.has(agendaId)) map.set(agendaId, {});
    map.get(agendaId)![row._id.choice ?? ""] = row.total;
  });
  return map;
}
