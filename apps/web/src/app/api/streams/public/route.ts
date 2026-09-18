export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { streamSessionsCol } from "@features/stream/db";
import { resolveSessionStatus, type StreamSessionDoc } from "@features/stream/types";

function hasPlayableMedia(session: Pick<StreamSessionDoc, "playerUrl">) {
  return typeof session.playerUrl === "string" && session.playerUrl.trim().length > 0;
}

function publicStatusLabel(session: StreamSessionDoc) {
  const status = resolveSessionStatus(session);
  switch (status) {
    case "live":
      return hasPlayableMedia(session) ? "Live" : "Läuft";
    case "scheduled":
      return "Geplant";
    case "cancelled":
      return "Abgesagt";
    case "ended":
      return hasPlayableMedia(session) ? "Replay" : "Abgeschlossen";
    case "draft":
    default:
      return "Entwurf";
  }
}

export async function GET() {
  const col = await streamSessionsCol();

  // Drafts are never a public announcement. A session must be explicitly scheduled,
  // live, ended or cancelled before the public directory can expose it.
  const sessions = await col
    .find({
      visibility: "public",
      $or: [
        { status: { $in: ["scheduled", "live", "ended", "cancelled"] } },
        { isLive: true },
        { endedAt: { $exists: true, $ne: null } },
      ],
    })
    .sort({ isLive: -1, startsAt: 1, createdAt: -1 })
    .limit(50)
    .toArray();

  const items = sessions.map((session) => ({
    rawStatus: resolveSessionStatus(session),
    id: (session._id as any)?.toHexString?.() ?? "",
    slug:
      (session as any)?.slug ??
      String(session.title ?? "")
        .trim()
        .toLowerCase()
        .replace(/ä/g, "ae")
        .replace(/ö/g, "oe")
        .replace(/ü/g, "ue")
        .replace(/ß/g, "ss")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
    title: session.title,
    description: session.description ?? null,
    status: publicStatusLabel(session),
    isLive: !!session.isLive,
    hasPlayableMedia: hasPlayableMedia(session),
    topicKey: session.topicKey ?? null,
    regionCode: session.regionCode ?? null,
    startsAt: session.startsAt ? new Date(session.startsAt).toISOString() : null,
    playerUrl: session.playerUrl ?? null,
    visibility: session.visibility,
    hideViewerCount: session.hideViewerCount !== false,
    createdAt: (session.createdAt ?? new Date()).toISOString(),
  }));

  return NextResponse.json({ ok: true, sessions: items });
}
