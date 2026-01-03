import { NextRequest, NextResponse } from "next/server";
import { insertEditorialFeedback, listEditorialFeedback } from "@/lib/db/editorialFeedbackRepo";
import { z } from "zod";
import { rateLimitFromRequest, rateLimitHeaders } from "@/utils/rateLimitHelpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 8_000;
const MAX_PAYLOAD_CHARS = 2_000;
const FEEDBACK_RATE = { limit: 30, windowMs: 60_000 };
const FEEDBACK_GET_RATE = { limit: 120, windowMs: 60_000 };

const ShortText = z.string().trim().min(1).max(600);
const ClaimText = z.string().trim().min(1).max(800);

const FeedbackActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("mark_evidence_sufficient"), claim: ClaimText, note: ShortText.optional() }).strict(),
  z.object({ type: z.literal("mark_evidence_insufficient"), claim: ClaimText, note: ShortText.optional() }).strict(),
  z
    .object({
      type: z.literal("disagree_flag"),
      flagKind: z.enum(["agency", "euphemism", "power"]),
      payload: z.unknown(),
      note: ShortText.optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("add_missing_voice"),
      voice: z.string().trim().min(1).max(120),
      note: ShortText.optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("confirm_flag"),
      flagKind: z.enum(["agency", "euphemism", "power"]),
      key: z.string().trim().min(1).max(120),
      note: ShortText.optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("reject_flag"),
      flagKind: z.enum(["agency", "euphemism", "power"]),
      key: z.string().trim().min(1).max(120),
      note: ShortText.optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("attach_context_pack"),
      packId: z.string().trim().min(1).max(120),
      note: ShortText.optional(),
    })
    .strict(),
]);

const FeedbackSchema = z
  .object({
    context: z
      .object({
        contributionId: z.string().trim().min(1).max(80).optional(),
        statementId: z.string().trim().min(1).max(80).optional(),
        url: z.string().trim().min(1).max(600).optional(),
      })
      .strict()
      .optional(),
    action: FeedbackActionSchema,
    ts: z.string().trim().min(8).max(40).optional(),
  })
  .strict();

export async function POST(req: NextRequest) {
  try {
    const contentLength = Number(req.headers.get("content-length") ?? "0");
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ ok: false, error: "payload_too_large" }, { status: 413 });
    }

    const rl = await rateLimitFromRequest(req, FEEDBACK_RATE.limit, FEEDBACK_RATE.windowMs, {
      salt: "editorial_feedback",
    });
    if (!rl.ok) {
      return NextResponse.json(
        { ok: false, error: "rate_limited", retryInMs: rl.retryIn },
        { status: 429, headers: rateLimitHeaders(rl) },
      );
    }

    const body = await req.json();
    const parsed = FeedbackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "invalid_payload", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    if (parsed.data.action.type === "disagree_flag") {
      let payloadSize = 0;
      try {
        payloadSize = JSON.stringify(parsed.data.action.payload ?? null).length;
      } catch {
        payloadSize = MAX_PAYLOAD_CHARS + 1;
      }
      if (payloadSize > MAX_PAYLOAD_CHARS) {
        return NextResponse.json({ ok: false, error: "payload_too_large" }, { status: 413 });
      }
    }

    const ts = parsed.data.ts ?? new Date().toISOString();
    const { id } = await insertEditorialFeedback({
      ts,
      context: parsed.data.context,
      action: parsed.data.action,
    });
    return NextResponse.json({ ok: true, id }, { headers: rateLimitHeaders(rl) });
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const rl = await rateLimitFromRequest(req, FEEDBACK_GET_RATE.limit, FEEDBACK_GET_RATE.windowMs, {
      salt: "editorial_feedback_get",
    });
    if (!rl.ok) {
      return NextResponse.json(
        { ok: false, error: "rate_limited", retryInMs: rl.retryIn },
        { status: 429, headers: rateLimitHeaders(rl) },
      );
    }

    const url = new URL(req.url);
    const contributionId = url.searchParams.get("contributionId") ?? undefined;
    const statementId = url.searchParams.get("statementId") ?? undefined;
    const limit = Number(url.searchParams.get("limit") ?? "25");
    const items = await listEditorialFeedback({ contributionId, statementId, limit });
    return NextResponse.json({ ok: true, items }, { headers: rateLimitHeaders(rl) });
  } catch {
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
