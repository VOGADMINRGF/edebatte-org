import type { NextRequest } from "next/server";
import type { RateLimitResult } from "./rateLimitHelpers";
import { rateLimitFromRequest } from "./rateLimitHelpers";

const DISABLE_RATE_LIMIT = process.env.VOG_DISABLE_RATE_LIMIT === "1";

export async function rateLimitPublic(
  req: NextRequest,
  limit: number,
  windowMs: number,
  scope: string,
): Promise<RateLimitResult> {
  if (DISABLE_RATE_LIMIT) {
    const resetAt = Date.now() + windowMs;
    return { ok: true, remaining: limit, limit, resetAt, retryIn: 0 };
  }
  const pathname = new URL(req.url).pathname;
  const scoped = `${scope}:${pathname}`;
  return rateLimitFromRequest(req, limit, windowMs, { salt: "public", scope: scoped });
}
