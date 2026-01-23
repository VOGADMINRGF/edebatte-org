import { performance } from "perf_hooks";

import { mongoPing } from "@/utils/mongoPing";
import { redisPing } from "@/utils/redisPing";
import { neo4jPing } from "@/utils/neo4jClient";
import {
  pingOpenAI,
  pingAnthropic,
  pingMistral,
  pingAriSearch,
} from "@/utils/aiPing";

export type Row = {
  name: string;
  ok: boolean;
  ms: number;
  error?: string;
  skipped?: boolean;
};
type MaybeRow = boolean | Omit<Row, "ms">;

function withTimeout<T>(p: Promise<T>, ms = 8000) {
  return Promise.race([
    p,
    new Promise<never>((_, rej) =>
      setTimeout(() => rej(new Error(`timeout ${ms}ms`)), ms),
    ),
  ]);
}

async function timed(name: string, fn: () => Promise<any>): Promise<Row> {
  const t0 = performance.now();
  try {
    const r = await withTimeout(fn());
    const ms = Math.round(performance.now() - t0);
    if (typeof r === "object" && r !== null && "ok" in r) {
      return { ...(r as Omit<Row, "ms">), ms };
    }
    return { name, ok: !!r, ms };
  } catch (e: any) {
    return {
      name,
      ok: false,
      ms: Math.round(performance.now() - t0),
      error: e?.message ?? String(e),
    };
  }
}

/**
 * Zentrale Health-Matrix (ohne Gemini, nur ARI:search).
 */
export async function runSystemMatrix(): Promise<Row[]> {
  return Promise.all<Row>([
    // Mongo (von dir ggf. getrennt konfigurierbar)
    timed("mongo:core", () => mongoPing("core")),
    timed("mongo:votes", () => mongoPing("votes")),
    timed("mongo:pii", () => mongoPing("pii")),

    // Redis – liefert "ok" | "skipped" | Fehlermeldung
    timed("redis", async () => {
      const r = await redisPing();
      if (r === "ok") return { name: "redis", ok: true };
      if (r === "skipped") return { name: "redis", ok: true, skipped: true };
      return {
        name: "redis",
        ok: false,
        error: typeof r === "string" ? r : "unknown",
      };
    }),

    // Neo4j (Bolt)
    timed("neo4j:bolt", async () => ({
      name: "neo4j:bolt",
      ok: await neo4jPing(),
    })),

    // AI – alle pings sind "kostenfrei" (listen/health)
    timed("ai:openai", () => pingOpenAI()),
    timed("ai:anthropic", () => pingAnthropic()),
    timed("ai:mistral", () => pingMistral()),
    timed("ai:ari:search", () => pingAriSearch()),
  ]);
}
