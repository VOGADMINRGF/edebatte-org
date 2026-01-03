import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { insertEditorialFeedback } from "@/lib/db/editorialFeedbackRepo";
import { rateLimitFromRequest, rateLimitHeaders } from "@/utils/rateLimitHelpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 12_000;
const MAX_PAYLOAD_CHARS = 2_000;
const FEEDBACK_RATE = { limit: 10, windowMs: 60_000 };

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

const FeedbackPayloadSchema = z
  .object({
    context: z
      .object({
        contributionId: z.string().trim().min(1).max(80).optional(),
        statementId: z.string().trim().min(1).max(80).optional(),
        url: z.string().trim().min(1).max(600).optional(),
      })
      .optional(),
    action: FeedbackActionSchema,
    ts: z.string().trim().min(8).max(40).optional(),
  })
  .strict();

const BulkSchema = z.object({ items: z.array(FeedbackPayloadSchema).min(1).max(10) }).strict();

export async function POST(req: NextRequest) {
  try {
    const contentLength = Number(req.headers.get("content-length") ?? "0");
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ ok: false, error: "payload_too_large" }, { status: 413 });
    }

    const rl = await rateLimitFromRequest(req, FEEDBACK_RATE.limit, FEEDBACK_RATE.windowMs, {
      salt: "editorial_feedback_bulk",
    });
    if (!rl.ok) {
      return NextResponse.json(
        { ok: false, error: "rate_limited", retryInMs: rl.retryIn },
        { status: 429, headers: rateLimitHeaders(rl) },
      );
    }

    const body = await req.json();
    const parsed = BulkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "invalid_payload", issues: parsed.error.issues },
        { status: 400, headers: rateLimitHeaders(rl) },
      );
    }

    for (const it of parsed.data.items) {
      if (it.action.type !== "disagree_flag") continue;
      let payloadSize = 0;
      try {
        payloadSize = JSON.stringify(it.action.payload ?? null).length;
      } catch {
        payloadSize = MAX_PAYLOAD_CHARS + 1;
      }
      if (payloadSize > MAX_PAYLOAD_CHARS) {
        return NextResponse.json(
          { ok: false, error: "payload_too_large" },
          { status: 413, headers: rateLimitHeaders(rl) },
        );
      }
    }

    const ids: string[] = [];
    for (const it of parsed.data.items) {
      const ts = it.ts ?? new Date().toISOString();
      const { id } = await insertEditorialFeedback({ ts, context: it.context, action: it.action });
      ids.push(id);
    }

    return NextResponse.json({ ok: true, ids }, { headers: rateLimitHeaders(rl) });
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
}
