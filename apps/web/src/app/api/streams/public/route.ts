export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { streamSessionsCol } from "@features/stream/db";
import { resolveSessionStatus } from "@features/stream/types";

function normalizePlayerUrl(value: unknown): string | null {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function publicStatusLabel(
  status: ReturnType<typeof resolveSessionStatus>,
  hasPlayer: boolean,
) {
  switch (status) {
    case "live":
      return "Live";
    case "scheduled":
      return "Geplant";
    case "cancelled":
      return "Abgesagt";
    case "ended":
      return hasPlayer ? "Replay" : "Abgeschlossen";
    case "draft":
    default:
      return null;
  }
}

function mediaStatus(
  status: ReturnType<typeof resolveSessionStatus>,
  hasPlayer: boolean,
) {
  if (!hasPlayer) return "none" as const;
  if (status === "live") return "livestream" as const;
  if (status === "ended") return "replay" as const;
  return "video_available" as const;
}

export async function GET() {
  const col = await streamSessionsCol();

  const sessions = await col
    .find({ visibility: "public" })
    .sort({ isLive: -1, startsAt: 1, createdAt: -1 })
    .limit(50)
    .toArray();

  const items = sessions.flatMap((session) => {
    const rawStatus = resolveSessionStatus(session);
    const playerUrl = normalizePlayerUrl((session as any)?.playerUrl);
    const status = publicStatusLabel(rawStatus, Boolean(playerUrl));

    // A public flag alone is never sufficient to expose an unfinished draft.
    if (!status) return [];

    return [
      {
        rawStatus,
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
        status,
        isLive: rawStatus === "live",
        topicKey: session.topicKey ?? null,
        regionCode: session.regionCode ?? null,
        startsAt: session.startsAt ? new Date(session.startsAt).toISOString() : null,
        playerUrl,
        mediaStatus: mediaStatus(rawStatus, Boolean(playerUrl)),
        hasPlayer: Boolean(playerUrl),
        visibility: session.visibility,
        hideViewerCount: (session as any)?.hideViewerCount !== false,
        createdAt: (session.createdAt ?? new Date()).toISOString(),
      },
    ];
  });

  return NextResponse.json({ ok: true, sessions: items });
}
