// apps/web/src/lib/redis.ts
/**
 * Server-only Redis helper.
 * - Upstash HTTP for KV + publish
 * - TCP (node-redis) fallback for subscribe (Upstash HTTP has no stable subscribe)
 */

export const VOTE_CH_PREFIX = "votes";
export const voteChannel = (statementId: string) =>
  `${VOTE_CH_PREFIX}:${statementId}`;

const isUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN;

// --- Upstash HTTP (serverless-friendly) ---
type UpstashRedis = import("@upstash/redis").Redis;
let httpClient: UpstashRedis | null = null;

async function getHttp(): Promise<UpstashRedis> {
  if (!httpClient) {
    const { Redis } = await import("@upstash/redis");
    httpClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return httpClient;
}

// --- TCP (node-redis) ---
let tcpClient: any | null = null;

async function getTcp(): Promise<any> {
  if (!tcpClient) {
    const { createClient } = await import("redis");
    tcpClient = createClient({
      url: process.env.REDIS_URL || process.env.REDIS_SOCKET || undefined,
    });
    // optional event emitter
    tcpClient.on?.("error", (_: unknown) => {
      void _;
    });
    await tcpClient.connect();
  }
  return tcpClient;
}

/* ----------------------------- KV API ----------------------------- */

export async function kvGet<T = string>(key: string): Promise<T | null> {
  if (isUpstash) return (await getHttp()).get<T | null>(key);
  const c = await getTcp();
  const v = await c.get(key);
  return (v as any) ?? null;
}

export async function kvSet(
  key: string,
  value: unknown,
  ttlSeconds?: number,
): Promise<void> {
  if (isUpstash) {
    const http = await getHttp();
    if (ttlSeconds) await http.set(key, value as any, { ex: ttlSeconds });
    else await http.set(key, value as any);
    return;
  }
  const c = await getTcp();
  if (ttlSeconds) await c.set(key, JSON.stringify(value), { EX: ttlSeconds });
  else await c.set(key, JSON.stringify(value));
}

export async function kvDel(key: string): Promise<void> {
  if (isUpstash) {
    await (await getHttp()).del(key);
    return;
  }
  const c = await getTcp();
  await c.del(key);
}

/* ---------------------------- Pub/Sub ----------------------------- */

export async function redisPublish(
  channel: string,
  message: unknown,
): Promise<void> {
  const payload =
    typeof message === "string" ? message : JSON.stringify(message);
  if (isUpstash) {
    await (await getHttp()).publish(channel, payload);
    return;
  }
  const c = await getTcp();
  await c.publish(channel, payload);
}

/**
 * Subscribe to a channel. Returns an async `unsubscribe` function.
 * Upstash HTTP has no stable subscribe → use node-redis subscriber.
 */
export async function redisSubscribe(
  channel: string,
  onMessage: (msg: string) => void,
): Promise<() => Promise<void>> {
  // TCP subscriber (node-redis)
  const { createClient } = await import("redis");
  const sub: any = createClient({
    url: process.env.REDIS_URL || process.env.REDIS_SOCKET || undefined,
  });
  sub.on?.("error", (_: unknown) => {
    void _;
  });

  await sub.connect();
  await sub.subscribe(channel, (msg: string) => {
    try {
      onMessage(msg);
    } catch (e) {
      // keep silent but avoid empty block warnings
      void e;
    }
  });

  return async () => {
    try {
      await sub.unsubscribe(channel);
    } catch (e) {
      void e;
    } finally {
      try {
        await sub.quit();
      } catch (e) {
        void e;
      }
    }
  };
}
