// apps/web/src/server/services.ts
import { mongoPing } from "@/utils/mongoPing";
import { redisPing } from "@/utils/redisPing";
import { neo4jPing } from "@/utils/neo4jClient";
import {
  pingOpenAI,
  pingAnthropic,
  pingMistral,
  pingAriSearch,
} from "@/utils/aiPing";

export type Service = {
  id: string; // stable key
  label: string; // UI Titel
  group: "db" | "ai" | "queue" | "other";
  ping: () => Promise<{
    ok: boolean;
    error?: string;
    skipped?: boolean;
    ms?: number;
  }>;
  enabled?: boolean; // feature toggle
};

export const SERVICES: any[] = [
  {
    id: "mongo:core",
    label: "mongo:core",
    group: "db",
    ping: () => mongoPing("core").then((ok) => ({ ok })),
  },
  {
    id: "mongo:votes",
    label: "mongo:votes",
    group: "db",
    ping: () => mongoPing("votes").then((ok) => ({ ok })),
  },
  {
    id: "mongo:pii",
    label: "mongo:pii",
    group: "db",
    ping: () => mongoPing("pii").then((ok) => ({ ok })),
  },
  {
    id: "redis",
    label: "redis",
    group: "db",
    ping: async () => {
      const r = await redisPing();
      if (r === "ok") return { ok: true };
      if (r === "skipped") return { ok: true, skipped: true };
      return { ok: false, error: String(r) };
    },
  },
  {
    id: "neo4j:bolt",
    label: "neo4j:bolt",
    group: "db",
    ping: async () => ({ ok: await neo4jPing() }),
  },
  { id: "ai:openai", label: "ai:openai", group: "ai", ping: pingOpenAI },
  {
    id: "ai:anthropic",
    label: "ai:anthropic",
    group: "ai",
    ping: pingAnthropic,
  },
  { id: "ai:mistral", label: "ai:mistral", group: "ai", ping: pingMistral },
  {
    id: "ai:ari:search",
    label: "ai:ari:search",
    group: "ai",
    ping: pingAriSearch,
  },
].filter((s: any) => s?.enabled ?? true);
