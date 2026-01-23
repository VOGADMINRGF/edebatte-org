import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { translateBatchOpenAI } from "@/lib/i18n/translateOpenAI";
import { rateLimitFromRequest, rateLimitHeaders } from "@/utils/rateLimitHelpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 24_000;
const MAX_TOTAL_CHARS = 16_000;
const TRANSLATE_RATE = { limit: 20, windowMs: 60_000 };

const BodySchema = z
  .object({
    srcLang: z.string().trim().min(2).max(10),
    tgtLang: z.string().trim().min(2).max(10),
    items: z
      .array(
        z
          .object({
            key: z.string().trim().min(1).max(80),
            text: z.string().trim().min(1).max(8000),
          })
          .strict(),
      )
      .min(1)
      .max(40),
  })
  .strict();

export async function POST(req: NextRequest) {
  try {
    const contentLength = Number(req.headers.get("content-length") ?? "0");
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ ok: false, error: "payload_too_large" }, { status: 413 });
    }

    const rl = await rateLimitFromRequest(req, TRANSLATE_RATE.limit, TRANSLATE_RATE.windowMs, {
      salt: "i18n_translate",
    });
    if (!rl.ok) {
      return NextResponse.json(
        { ok: false, error: "rate_limited", retryInMs: rl.retryIn },
        { status: 429, headers: rateLimitHeaders(rl) },
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "bad_input" }, { status: 400, headers: rateLimitHeaders(rl) });
    }

    const { srcLang, tgtLang, items } = parsed.data;
    const totalChars = items.reduce((sum, item) => sum + item.text.length, 0);
    if (totalChars > MAX_TOTAL_CHARS) {
      return NextResponse.json({ ok: false, error: "payload_too_large" }, { status: 413, headers: rateLimitHeaders(rl) });
    }

    const translations = await translateBatchOpenAI({ srcLang, tgtLang, items });
    return NextResponse.json({ ok: true, translations }, { headers: rateLimitHeaders(rl) });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "server_error", message: err?.message ?? String(err) },
      { status: 500 },
    );
  }
}
