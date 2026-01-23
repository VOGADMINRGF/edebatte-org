import { NextResponse } from "next/server";
import { coreCol, votesCol, piiCol } from "@core/db/triMongo";

export async function GET() {
  const out: any = { ok: true, services: [] as any[] };

  async function check(name: string, fn: () => Promise<any>) {
    try {
      await fn();
      out.services.push({ name, ok: true });
    } catch (e: any) {
      out.services.push({ name, ok: false, err: String(e?.message ?? e) });
      out.ok = false;
    }
  }

  await check("mongo:core", async () => {
    const c = await coreCol("statements");
    await c.estimatedDocumentCount();
  });
  await check("mongo:votes", async () => {
    const c = await votesCol("votes");
    await c.estimatedDocumentCount();
  });
  await check("mongo:pii", async () => {
    const c = await piiCol("tokens");
    await c.estimatedDocumentCount();
  });

  // optional Redis
  if (process.env.REDIS_URL) {
    await check("redis", async () => {
      const mod = await import("ioredis").catch(() => null);
      if (!mod) throw new Error("ioredis not installed");
      const Redis = mod.default;
      const r = new Redis(process.env.REDIS_URL as string);
      await r.ping();
      await r.quit();
    });
  }

  // optional Neo4j
  if (process.env.NEO4J_URI) {
    await check("neo4j", async () => {
      const neo4j = await import("neo4j-driver").catch(() => null);
      if (!neo4j) throw new Error("neo4j-driver not installed");
      const driver = neo4j.driver(
        process.env.NEO4J_URI as string,
        neo4j.auth.basic(
          process.env.NEO4J_USER as string,
          process.env.NEO4J_PASSWORD as string,
        ),
      );
      const sess = driver.session();
      await sess.run("RETURN 1 as ok");
      await sess.close();
      await driver.close();
    });
  }

  return NextResponse.json(out);
}
