import { env } from "@/utils/env";
import neo4j from "neo4j-driver";
import type { Driver } from "neo4j-driver";
let driver: Driver | null = null;

export function getNeo4jDriver(): Driver {
  if (!driver) {
    driver = neo4j.driver(String(env.NEO4J_URI), neo4j.auth.basic(env.NEO4J_USER, env.NEO4J_PASS), {
      disableLosslessIntegers: true,
    });
  }
  return driver!;
}

export async function neo4jPing() {
  try {
    const s = getNeo4jDriver().session();
    const r = await s.run("RETURN 1 AS ok");
    await s.close();
    return { name: "neo4j:bolt", ok: r.records?.[0]?.get("ok") === 1 };
  } catch (e: any) {
    return { name: "neo4j:bolt", ok: false, error: e?.message ?? String(e) };
  }
}
