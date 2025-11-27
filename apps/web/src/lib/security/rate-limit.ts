// E200: Pseudonymized rate-limiter for HumanCheck endpoints.
import IORedis from "ioredis";

const memoryStore = new Map<string, { count: number; expiresAt: number }>();
const DEFAULT_WINDOW_SECONDS = 15 * 60;

function getRedisClient() {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  return new IORedis(url, {
    tls: url.startsWith("rediss://") ? {} : undefined,
    maxRetriesPerRequest: 1,
  });
}

export async function incrementRateLimit(key: string, windowSeconds: number = DEFAULT_WINDOW_SECONDS) {
  const redis = getRedisClient();
  if (redis) {
    try {
      const value = await redis.multi().incr(key).expire(key, windowSeconds).exec();
      const count = Number(value?.[0]?.[1] ?? 0);
      await redis.quit();
      return count;
    } catch {
      try {
        await redis.quit();
      } catch {
        // ignore
      }
    }
  }

  const now = Date.now();
  const current = memoryStore.get(key);
  if (current && current.expiresAt > now) {
    current.count += 1;
    return current.count;
  }
  memoryStore.set(key, { count: 1, expiresAt: now + windowSeconds * 1000 });
  return 1;
}
