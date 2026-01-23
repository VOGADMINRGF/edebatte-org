import "server-only";

// apps/web/src/utils/rateLimit.ts  — E150 unified
// Runtime-safe hashing + deterministic fixed-window + useful return shape

type Bucket = { count: number; resetAt: number };
const store = new Map<string, Bucket>();

// simple hygiene to avoid unbounded growth
const MAX_KEYS = 50_000;
let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 10_000) return; // max alle 10s
  lastSweep = now;
  for (const [k, b] of store) if (b.resetAt <= now) store.delete(k);
  if (store.size > MAX_KEYS) {
    // naive LRU-approx: delete oldest resetAt first
    const arr = [...store.entries()].sort(
      (a, b) => a[1].resetAt - b[1].resetAt,
    );
    for (let i = 0; i < arr.length - MAX_KEYS; i++) store.delete(arr[i][0]);
  }
}

// runtime-agnostisches Hashing (PII-Schutz)
async function hashKey(key: string, salt = ""): Promise<string> {
  const data = new TextEncoder().encode(salt + key);
  // WebCrypto verfügbar?
  if (typeof crypto !== "undefined" && "subtle" in crypto) {
    const buf = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(buf)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Node-Fallback

  // @ts-ignore
  const { createHash } = await import("crypto");
  return createHash("sha256").update(data).digest("hex");
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  limit: number;
  resetAt: number; // ms epoch
  retryIn: number; // ms
};

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  opts?: { salt?: string },
): Promise<RateLimitResult> {
  const now = Date.now();
  sweep(now);

  // globales Fenster (deterministisch)
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const resetAt = windowStart + windowMs;

  const k = await hashKey(key, opts?.salt ?? "");
  let bucket = store.get(k);

  if (!bucket || bucket.resetAt !== resetAt) {
    bucket = { count: 0, resetAt };
    store.set(k, bucket);
  }

  if (bucket.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      limit,
      resetAt: bucket.resetAt,
      retryIn: Math.max(0, bucket.resetAt - now),
    };
  }

  bucket.count++;
  const remaining = Math.max(0, limit - bucket.count);
  return { ok: true, remaining, limit, resetAt: bucket.resetAt, retryIn: 0 };
}
