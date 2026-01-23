import { NextResponse } from "next/server";
import { mongoPing } from "@/utils/mongoPing";
import { redisPing } from "@/utils/redisPing";
import { neo4jDriver, neo4jVerify } from "@/lib/neo4j";

// Sicherstellen: Node-Runtime, keine Caches
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Check = { ok: boolean; ms?: number; info?: string; error?: string };

function time<T>(fn: () => Promise<T>) {
  const start = process.hrtime.bigint();
  return fn().then((v) => ({
    v,
    ms: Number(process.hrtime.bigint() - start) / 1_000_000,
  }));
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string) {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`${label}_timeout_${ms}ms`)),
      ms,
    );
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

async function pingMongo(): Promise<Check> {
  try {
    const { ms } = await time(() => withTimeout(mongoPing(), 800, "mongo"));
    return { ok: true, ms };
  } catch (e: any) {
    return { ok: false, error: String(e) };
  }
}

async function pingRedis(): Promise<Check> {
  try {
    const { ms } = await time(() => withTimeout(redisPing(), 500, "redis"));
    return { ok: true, ms };
  } catch (e: any) {
    return { ok: false, error: String(e) };
  }
}

async function pingNeo4j(): Promise<Check> {
  if (!neo4jDriver) return { ok: false, info: "driver_missing" };
  try {
    const { ms } = await time(() => withTimeout(neo4jVerify(), 700, "neo4j"));
    return { ok: true, ms };
  } catch (e: any) {
    return { ok: false, error: String(e) };
  }
}

export async function GET() {
  const required = await Promise.all([
    pingMongo().then((r) => ["mongo", r] as const),
    pingRedis().then((r) => ["redis", r] as const),
  ]);
  const optional = await Promise.all([
    pingNeo4j().then((r) => ["neo4j", r] as const),
  ]);

  const checks = Object.fromEntries([...required, ...optional]);
  const ok = required.every(([, r]) => r.ok);

  return NextResponse.json(
    { ok, ts: Date.now(), uptime: process.uptime(), checks },
    { status: ok ? 200 : 503 },
  );
}
