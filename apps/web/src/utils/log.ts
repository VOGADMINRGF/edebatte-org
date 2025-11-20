// apps/web/src/utils/log.ts
// V2: Mongo + Redis (Upstash bevorzugt, TCP Fallback) + sichere Helper ohne leere catch-Blöcke.
import { coreCol } from "@core/db/triMongo";

/** Sicheres JSON.stringify ohne leeren catch – liefert Fallback-String. */
export function safeJson(obj: unknown): string {
  try {
    return JSON.stringify(obj);
  } catch {
    /* stringify failed: ignore */
    return "[unserializable]";
  }
}

/** Safe console-Logging ohne leeren catch (für ESLint: no-empty). */
export function safeLog(...args: unknown[]): void {
  try {
    // Ersetze bei Bedarf durch pino/bunyan etc.
    console.log(...args);
  } catch {
    /* logging failed: ignore */
  }
}

export async function logError(msg: string, ctx?: any): Promise<void> {
  // 1) Mongo (persist) – Kontext vorsichtshalber serialisieren/deserialisieren
  try {
    const col = await coreCol("error_logs");
    let safeCtx: any = {};
    try {
      safeCtx = JSON.parse(safeJson(ctx ?? {}));
    } catch {
      /* parse failed: ignore */
      safeCtx = { note: "[unserializable ctx]" };
    }
    await col.insertOne({ ts: new Date(), lvl: "error", msg, ctx: safeCtx });
  } catch {
    /* mongo insert failed: ignore */
  }

  // 2) Redis Ring-Buffer (Upstash → TCP Fallback)
  try {
    const entry = safeJson({
      ts: Date.now(),
      lvl: "error",
      msg,
      ctx: ctx ?? {},
    });

    // Upstash HTTP
    if (
      process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN
    ) {
      const { Redis } = await import("@upstash/redis");
      const r = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      });
      await r.lpush("errors:last", entry);
      await r.ltrim("errors:last", 0, 9999);
      return;
    }

    // node-redis TCP
    if (process.env.REDIS_URL || process.env.REDIS_SOCKET) {
      const { createClient } = await import("redis");
      const c = createClient({
        url: process.env.REDIS_URL || process.env.REDIS_SOCKET || undefined,
      });
      // @ts-ignore
      c.on?.("error", () => {
        /* swallow */
      });
      await c.connect();
      await c.lPush("errors:last", entry);
      await c.lTrim("errors:last", 0, 9999);
      await c.quit();
    }
  } catch {
    /* redis logging failed: ignore */
  }
}

// Expliziter No-Op für frühere leere Blöcke
export function noop(): void {
  void 0;
}
