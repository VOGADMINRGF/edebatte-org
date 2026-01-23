// apps/web/src/utils/rateLimiter.ts
import { createClient } from "redis";

type RLResult = {
  ok: boolean;
  remaining: number;
  resetSec: number;
  retryAfterSec?: number;
};

let redis: ReturnType<typeof createClient> | null = null;
if (process.env.REDIS_URL) {
  redis = createClient({ url: process.env.REDIS_URL });
  redis.connect().catch(() => {
    redis = null;
  });
}

// Fixed-Window: key = rl:{bucket}:{ip}
export async function rateLimit(
  ip: string,
  bucket: string,
  limitPerWindow: number,
  windowSec: number,
): Promise<RLResult> {
  const now = Math.floor(Date.now() / 1000);
  const resetSec = now + windowSec;

  if (redis) {
    const key = `rl:${bucket}:${ip}`;
    const c = await redis.incr(key);
    if (c === 1) await redis.expire(key, windowSec);
    const remaining = Math.max(0, limitPerWindow - c);
    if (c > limitPerWindow) {
      const ttl = await redis.ttl(key);
      return {
        ok: false,
        remaining: 0,
        resetSec: now + (ttl > 0 ? ttl : windowSec),
        retryAfterSec: ttl,
      };
    }
    return { ok: true, remaining, resetSec };
  }

  // Memory Fallback (dev only)
  const g = global as any;
  g.__rl ||= new Map<string, { count: number; resetAt: number }>();
  const key = `${bucket}:${ip}`;
  const b = g.__rl.get(key);
  const until = Date.now() + windowSec * 1000;
  if (!b || Date.now() > b.resetAt) {
    g.__rl.set(key, { count: 1, resetAt: until });
    return { ok: true, remaining: limitPerWindow - 1, resetSec };
  }
  b.count++;
  const remaining = Math.max(0, limitPerWindow - b.count);
  if (b.count > limitPerWindow) {
    return {
      ok: false,
      remaining: 0,
      resetSec,
      retryAfterSec: Math.ceil((b.resetAt - Date.now()) / 1000),
    };
  }
  return { ok: true, remaining, resetSec };
}
