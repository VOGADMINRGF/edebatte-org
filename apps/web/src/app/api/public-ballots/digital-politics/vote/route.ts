import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { VoteModel } from "@/models/votes/Vote";
import { incrementRateLimit } from "@/lib/security/rate-limit";
import {
  DIGITAL_POLITICS_BALLOT_ID,
  findDigitalPoliticsQuestion,
} from "@/features/socialPublicBallot/digitalPolitics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GUEST_COOKIE = "edb_social_ballot_guest";
const COOKIE_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;
const RATE_LIMIT_WINDOW_SECONDS = 15 * 60;
const RATE_LIMIT_MAX = 80;

const VoteSchema = z.object({
  questionId: z.string().min(1).max(80),
  choice: z.string().min(1).max(240),
  locale: z.string().trim().max(12).optional(),
});

type VotesStoreFailureReason = "configuration" | "connectivity";

function hash(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function hashedClientKey(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "0.0.0.0";
  const ua = req.headers.get("user-agent") || "unknown";
  return hash(`${ip}|${ua}`).slice(0, 32);
}

function readOrCreateGuestToken(req: NextRequest) {
  const existing = req.cookies.get(GUEST_COOKIE)?.value?.trim() ?? "";
  if (/^[A-Za-z0-9_-]{32,128}$/.test(existing)) {
    return { token: existing, isNew: false };
  }
  return { token: crypto.randomBytes(32).toString("base64url"), isNew: true };
}

function requestIsSameSite(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return false;

  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "same-site") {
    return false;
  }

  return true;
}

function classifyVotesStoreFailure(error: unknown): VotesStoreFailureReason {
  const message = error instanceof Error ? error.message : "";
  return message.startsWith("[triMongo] Missing") ? "configuration" : "connectivity";
}

function logVotesStoreFailure(operation: "health" | "write", error: unknown) {
  const reason = classifyVotesStoreFailure(error);
  const name = error instanceof Error ? error.name : "UnknownError";
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";

  console.error("[public-ballot] votes store unavailable", {
    operation,
    reason,
    name,
    code: code || undefined,
  });

  return reason;
}

function unavailableResponse(reason: VotesStoreFailureReason) {
  return NextResponse.json(
    {
      ok: false,
      error: "votes_store_unavailable",
      reason,
    },
    {
      status: 503,
      headers: { "cache-control": "no-store" },
    },
  );
}

export async function GET() {
  try {
    const Vote = await VoteModel();
    await Vote.findOne({}, { projection: { _id: 1 }, maxTimeMS: 5_000 });
    return NextResponse.json(
      { ok: true, store: "votes" },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return unavailableResponse(logVotesStoreFailure("health", error));
  }
}

export async function POST(req: NextRequest) {
  if (!requestIsSameSite(req)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const parsed = VoteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const question = findDigitalPoliticsQuestion(parsed.data.questionId);
  if (!question || !question.options.includes(parsed.data.choice)) {
    return NextResponse.json({ ok: false, error: "invalid_choice" }, { status: 400 });
  }

  const rateKey = hashedClientKey(req);
  const attempts = await incrementRateLimit(
    `public:ballot:digital-politics:${rateKey}`,
    RATE_LIMIT_WINDOW_SECONDS,
  );
  if (attempts > RATE_LIMIT_MAX) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const guest = readOrCreateGuestToken(req);
  const sessionId = hash(`${DIGITAL_POLITICS_BALLOT_ID}:${guest.token}`).slice(0, 40);
  const now = new Date();

  try {
    const Vote = await VoteModel();

    await Vote.updateOne(
      {
        qrSetId: DIGITAL_POLITICS_BALLOT_ID,
        qrQuestionId: question.id,
        sessionId,
      },
      {
        $set: {
          statementId: DIGITAL_POLITICS_BALLOT_ID,
          qrSetId: DIGITAL_POLITICS_BALLOT_ID,
          qrQuestionId: question.id,
          choice: parsed.data.choice,
          sessionId,
          locale: parsed.data.locale?.trim() || "de",
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true },
    );
  } catch (error) {
    return unavailableResponse(logVotesStoreFailure("write", error));
  }

  const response = NextResponse.json({
    ok: true,
    questionId: question.id,
    choice: parsed.data.choice,
    participationClass: "open_guest",
    consultationStatus: "open_public_consultation",
  });

  if (guest.isNew) {
    response.cookies.set({
      name: GUEST_COOKIE,
      value: guest.token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: COOKIE_MAX_AGE_SECONDS,
    });
  }

  return response;
}
