export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ObjectId, coreCol } from "@core/db/triMongo";
import { streamSessionsCol } from "@features/stream/db";
import type {
  StreamSessionDoc,
  StreamSessionStatus,
  StreamVisibility,
} from "@features/stream/types";
import { resolveSessionStatus } from "@features/stream/types";
import { enforceStreamHost, requireCreatorContext } from "../utils";
import { TOPIC_CHOICES } from "@features/interests/topics";
import { applyAutofilledAgendaToSession } from "@core/streams/agenda";
import { rateLimitOrThrow } from "@/utils/rateLimitHelpers";

const CreateSessionBodySchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  regionCode: z.string().nullable().optional(),
  topicKey: z.string().nullable().optional(),
  startsAt: z.string().nullable().optional(),
  playerUrl: z.string().nullable().optional(),
  visibility: z.enum(["public", "unlisted"]).optional(),
  autofillAgenda: z.boolean().optional(),
});

const TRUSTED_EMBED_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
  "player.vimeo.com",
  "player.twitch.tv",
]);

function slugify(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizePlayerUrl(value: unknown): string | null | undefined {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    const localDev = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    if (parsed.protocol !== "https:" && !(localDev && parsed.protocol === "http:")) {
      return undefined;
    }
    if (parsed.username || parsed.password) return undefined;

    const host = parsed.hostname.toLowerCase();
    const looksLikeKnownEmbed =
      parsed.pathname.includes("youtube.com/embed") ||
      parsed.pathname.includes("player.vimeo.com") ||
      parsed.pathname.includes("player.twitch.tv") ||
      parsed.search.includes("youtube.com/embed") ||
      parsed.search.includes("player.vimeo.com") ||
      parsed.search.includes("player.twitch.tv");

    // The public viewer recognizes known embeds by string pattern. Reject host-confusion
    // payloads that could otherwise smuggle those markers through an unrelated HTTPS host.
    if (looksLikeKnownEmbed && !TRUSTED_EMBED_HOSTS.has(host)) return undefined;

    return parsed.toString();
  } catch {
    return undefined;
  }
}

async function isTopicRegistered(topicKey: string): Promise<boolean> {
  if (TOPIC_CHOICES.some((t) => t.key === topicKey)) return true;
  const col = await coreCol("statements");
  const match = await col.findOne(
    { $or: [{ category: topicKey }, { topic: topicKey }] },
    { projection: { _id: 1 } },
  );
  return Boolean(match);
}

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
  const gating = await enforceStreamHost(ctx);
  if (gating) return gating;

  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  const rl = await rateLimitOrThrow(`stream:create:${ctx.userId}:${ip}`, 10, 60 * 60 * 1000, {
    salt: "stream-session",
  });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited", retryInMs: rl.retryIn },
      { status: 429 },
    );
  }

  const rawBody = await req.json().catch(() => null);
  const parsedBody = CreateSessionBodySchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return NextResponse.json({ ok: false, error: "bad_input" }, { status: 400 });
  }
  const body = parsedBody.data;

  const title = String(body.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ ok: false, error: "TITLE_REQUIRED" }, { status: 400 });
  }
  const topicKey = typeof body.topicKey === "string" ? body.topicKey.trim() || null : null;
  const regionCode = typeof body.regionCode === "string" ? body.regionCode.trim() || null : null;
  const startsAtIso = typeof body.startsAt === "string" ? body.startsAt.trim() : null;
  const startsAt = startsAtIso ? new Date(startsAtIso) : null;
  const parsedStartsAt = startsAt && !isNaN(startsAt.getTime()) ? startsAt : null;
  const playerUrl = normalizePlayerUrl(body.playerUrl);
  if (playerUrl === undefined) {
    return NextResponse.json({ ok: false, error: "unsafe_player_url" }, { status: 400 });
  }

  const visibility: StreamVisibility =
    body.visibility === "public" || body.visibility === "unlisted" ? body.visibility : "unlisted";
  const status: StreamSessionStatus =
    parsedStartsAt && parsedStartsAt > new Date() ? "scheduled" : "draft";

  if (visibility === "public" && status === "draft") {
    return NextResponse.json(
      { ok: false, error: "public_requires_schedule" },
      { status: 400 },
    );
  }

  if (topicKey && !(await isTopicRegistered(topicKey))) {
    return NextResponse.json(
      { ok: false, error: "topic_not_registered" },
      { status: 400 },
    );
  }

  const now = new Date();
  const doc: StreamSessionDoc = {
    creatorId: ctx.userId,
    slug: slugify(title) || null,
    title,
    description: body?.description ?? null,
    regionCode,
    topicKey,
    startsAt: parsedStartsAt,
    playerUrl,
    isLive: false,
    visibility,
    status,
    createdAt: now,
    updatedAt: now,
  };

  const col = await streamSessionsCol();
  const result = await col.insertOne(doc);
  const sessionId = result.insertedId.toHexString();

  let autofillError: string | null = null;
  if (body.autofillAgenda) {
    try {
      await applyAutofilledAgendaToSession(sessionId);
    } catch (err: any) {
      const message = typeof err?.message === "string" ? err.message : "autofill_failed";
      autofillError =
        message === "TOPIC_REQUIRED"
          ? "topic_required"
          : message === "TOPIC_EMPTY"
            ? "topic_not_ready"
            : "autofill_failed";
    }
  }

  return NextResponse.json({
    ok: true,
    sessionId,
    autofillError,
  });
}
