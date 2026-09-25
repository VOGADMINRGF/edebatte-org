import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { recordSwipeVote, removeSwipeVotesForStatement } from "@/features/swipes/service";
import type { SwipeVotePayload } from "@/features/swipes/types";
import { readSession } from "@/utils/session";
import { normalizeAccessTier } from "@/config/accessTiers";
import { getFeaturesWithOverrides } from "@/lib/server/access/featureOverrides";

const SWIPES_SEEN_COOKIE = "edb_swipes_seen";
const MAX_SEEN_IDS = 80;

function readSeenIds(raw?: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(-MAX_SEEN_IDS);
}

function writeSeenCookie(res: ReturnType<typeof NextResponse.json>, ids: string[]) {
  res.cookies.set(SWIPES_SEEN_COOKIE, ids.slice(-MAX_SEEN_IDS).join(","), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("u_id")?.value;
  const session = userId ? await readSession() : null;

  if (userId) {
    const tier = normalizeAccessTier(session?.accessTier ?? null);
    const { effectiveMatrix } = await getFeaturesWithOverrides();
    const featureSet = effectiveMatrix[tier];
    if (!featureSet.canSwipe) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
  }

  const body = (await req.json().catch(() => ({}))) as Omit<SwipeVotePayload, "userId" | "source">;

  if (!body.statementId || !body.decision) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }

  const anonCookie = cookieStore.get("edb_anon")?.value;
  const anonId =
    anonCookie || (typeof crypto !== "undefined" && "randomUUID" in crypto ? `anon_${crypto.randomUUID()}` : null);

  const payload: SwipeVotePayload = {
    ...body,
    userId: userId || anonId || "anon",
    source: "swipes",
  };

  await recordSwipeVote(payload);

  const res = NextResponse.json({ ok: true });
  if (!userId && !anonCookie && anonId) {
    res.cookies.set("edb_anon", anonId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  const seenIds = readSeenIds(cookieStore.get(SWIPES_SEEN_COOKIE)?.value);
  const nextSeenIds = [...seenIds.filter((id) => id !== body.statementId), body.statementId];
  writeSeenCookie(res, nextSeenIds);
  return res;
}

export async function DELETE(req: NextRequest) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("u_id")?.value ?? cookieStore.get("edb_anon")?.value;
  const body = (await req.json().catch(() => ({}))) as { statementId?: string };

  if (!body.statementId) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }

  if (userId) {
    await removeSwipeVotesForStatement(userId, body.statementId);
  }

  const res = NextResponse.json({ ok: true });
  const seenIds = readSeenIds(cookieStore.get(SWIPES_SEEN_COOKIE)?.value).filter(
    (id) => id !== body.statementId,
  );
  writeSeenCookie(res, seenIds);
  return res;
}
