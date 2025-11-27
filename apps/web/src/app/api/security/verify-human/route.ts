// E200: Backend verification for HumanCheck puzzle + heuristics with rate limits.
import { createHash } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { signHumanToken } from "@/lib/security/human-token";
import { validatePuzzleAnswer } from "@/lib/security/human-puzzle";
import { incrementRateLimit } from "@/lib/security/rate-limit";

const MIN_TIME_MS = 800;
const RATE_LIMIT_MAX = 8;
const RATE_LIMIT_WINDOW = 15 * 60; // 15 minutes

function hashedClientKey(request: NextRequest, formId?: string) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  const agent = request.headers.get("user-agent")?.slice(0, 80) || "ua";
  const base = `${ip}:${agent}:${formId ?? "public"}`;
  return createHash("sha256").update(base).digest("hex");
}

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: "bad_request" }, { status: 400 });
  }

  const { honeypotValue = "", puzzleAnswer, puzzleSeed, timeToSolve, formId } = body ?? {};
  const rateKey = hashedClientKey(request, formId);
  const attempts = await incrementRateLimit(`human:${rateKey}`, RATE_LIMIT_WINDOW);
  if (attempts > RATE_LIMIT_MAX) {
    return NextResponse.json({ ok: false, code: "ratelimit" }, { status: 429 });
  }

  if (honeypotValue) {
    return NextResponse.json({ ok: false, code: "honeypot" }, { status: 400 });
  }

  if (typeof puzzleSeed !== "string" || puzzleSeed.length < 8) {
    return NextResponse.json({ ok: false, code: "puzzle" }, { status: 400 });
  }

  if (!validatePuzzleAnswer(puzzleSeed, Number(puzzleAnswer))) {
    return NextResponse.json({ ok: false, code: "puzzle" }, { status: 400 });
  }

  if (typeof timeToSolve !== "number" || timeToSolve < MIN_TIME_MS) {
    return NextResponse.json({ ok: false, code: "speed" }, { status: 400 });
  }

  const humanToken = await signHumanToken({ formId, timeToSolve, puzzleSeed });

  return NextResponse.json({ ok: true, humanToken });
}
