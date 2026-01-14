import "server-only";

// apps/web/src/utils/rateLimitHelpers.ts
import type { NextRequest } from "next/server";
import type { RateLimitResult } from "./rateLimit";
export type { RateLimitResult };

const isEdgeRuntime = () => process.env.NEXT_RUNTIME === "edge";

type RateLimitFn = (
  key: string,
  limit: number,
  windowMs: number,
  opts?: { salt?: string },
) => Promise<RateLimitResult>;

async function loadRateLimiter(): Promise<RateLimitFn | null> {
  if (isEdgeRuntime()) return null; // Edge darf kein node:crypto laden.
  try {
    const mod = await import("./rateLimit");
    return (mod as any).rateLimit ?? (mod as any).default ?? null;
  } catch {
    return null;
  }
}

function allowAll(limit: number, windowMs: number): RateLimitResult {
  const resetAt = Date.now() + windowMs;
  return { ok: true, remaining: limit, limit, resetAt, retryIn: 0 };
}

export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  // Next.js dev-fallbacks:
  // @ts-ignore
  return (req as any).ip || "0.0.0.0";
}

export async function rateLimitOrThrow(
  key: string,
  limit: number,
  windowMs: number,
  opts?: { salt?: string },
): Promise<RateLimitResult> {
  const limiter = await loadRateLimiter();
  if (!limiter) return allowAll(limit, windowMs);
  return limiter(key, limit, windowMs, opts);
}

export async function rateLimitFromRequest(
  req: NextRequest,
  limit: number,
  windowMs: number,
  opts?: { salt?: string; scope?: string }
): Promise<RateLimitResult> {
  const ip = getClientIp(req);
  const { pathname, search } = new URL(req.url);
  // Scope bindet IP + Route + Methode (keine UA-Fragmentierung)
  const scope = opts?.scope ?? `${req.method}:${pathname}`;
  const key = `${ip}:${scope}`;
  return rateLimitOrThrow(key, limit, windowMs, { salt: opts?.salt });
}

export function rateLimitHeaders(rl: RateLimitResult) {
  const h: Record<string, string> = {
    "X-RateLimit-Limit": String(rl.limit),
    "X-RateLimit-Remaining": String(rl.remaining),
    "X-RateLimit-Reset": String(Math.ceil(rl.resetAt / 1000)), // epoch-seconds
  };
  if (!rl.ok && rl.retryIn > 0) h["Retry-After"] = String(Math.ceil(rl.retryIn / 1000));
  return h;
}
