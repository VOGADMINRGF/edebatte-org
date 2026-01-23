// apps/web/src/utils/redisPing.ts
export async function redisPing(): Promise<"ok" | "skipped" | string> {
  const restUrl = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/+$/, "");
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const socketUrl = process.env.REDIS_URL;

  // a) Upstash REST (empfohlen für Health)
  if (restUrl && restToken) {
    try {
      // Leichter HEAD/GET – Upstash versteht /ping
      const r = await fetch(`${restUrl}/ping`, {
        headers: { Authorization: `Bearer ${restToken}` },
        cache: "no-store",
      });
      return r.ok ? "ok" : `HTTP ${r.status}`;
    } catch (e: any) {
      return e?.message ?? "fetch failed";
    }
  }

  // b) klassische Redis-URL vorhanden? Versuch mit ioredis (optional)
  if (socketUrl) {
    try {
      // dynamic import – wenn ioredis im Web-App nicht installiert ist, sauber "skipped"
      const mod = await import("ioredis").catch(() => null);
      if (!mod) return "skipped";

      const Redis = (mod as any).default;
      const redis = new Redis(socketUrl, {
        lazyConnect: true,
        connectTimeout: 1500,
        maxRetriesPerRequest: 1,
        enableAutoPipelining: false,
      });

      await redis.connect?.().catch(() => undefined); // ioredis verbindet auch auf erstes Kommando
      const pong = await redis.ping();
      redis.disconnect();
      return pong === "PONG" ? "ok" : `pong:${String(pong)}`;
    } catch (e: any) {
      return e?.message ?? "connect failed";
    }
  }

  // c) nichts konfiguriert
  return "skipped";
}
