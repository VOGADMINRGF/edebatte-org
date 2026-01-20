// tools/reperatur/26-e200-realize-now.mjs
import fs from "fs";
import path from "path";

const repo = process.cwd();
const web = path.join(repo, "apps", "web");
const src = path.join(web, "src");
const ensureDir = (p) => fs.mkdirSync(p, { recursive: true });
const write = (p, s) => { ensureDir(path.dirname(p)); fs.writeFileSync(p, s, "utf8"); console.log("✓ write", path.relative(repo, p)); };
const exists = (p) => fs.existsSync(p);

// ---------- A) Echte Utility-Module statt Ambient ----------

// A1) BodySchema (echtes Modul mit Zod, plus kompatible parse/safeParse-Signatur)
write(path.join(src, "lib/validation/body.ts"), `
import { z } from "zod";

/** Für generische Bodies: object mit beliebigen Keys; Routen können schärfer typisieren. */
export const AnyBody = z.record(z.any());

/** Kompatibles API zu deinem bisherigen "BodySchema" (parse/safeParse). */
export const BodySchema = {
  parse:<T=unknown>(x:any):T => AnyBody.parse(x) as unknown as T,
  safeParse:<T=unknown>(x:any) => {
    const r = AnyBody.safeParse(x);
    return r.success ? { success:true, data: r.data as unknown as T } : { success:false, error:r.error };
  }
};
export type BodyOf<T> = T;
`);

// A2) Rollen & Guards (echtes Modul)
write(path.join(src, "lib/auth/roles.ts"), `
export type Role = "guest"|"user"|"editor"|"admin" | (string & {});
export const ADMIN_ROLES = new Set<Role>(["admin","editor"]);

export function isPublic(pathname: string): boolean {
  return pathname === "/" || pathname.startsWith("/faq") || pathname.startsWith("/about");
}
export function isVerifiedPath(pathname: string): boolean {
  return pathname.startsWith("/dashboard") || pathname.startsWith("/editor");
}
export function isLocationOnboarding(pathname: string): boolean {
  return pathname.startsWith("/onboarding/location");
}
`);

// ---------- B) AI: generateImage (real, mit Fallback) ----------
write(path.join(src, "shims", "features", "utils", "ai", "generateImage.ts"), `
// Realer OpenAI-Aufruf (Images). Fallback: Platzhalter-Asset.
type GenOpts = { prompt: string; fallbackText?: string; aspectRatio?: "16:9"|"1:1"|"9:16" };
export default async function generateVOGImage({ prompt, fallbackText="eDebatte", aspectRatio="16:9" }: GenOpts): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return "/dummy/vog-default.jpg";
  try {
    const size = aspectRatio==="1:1" ? "1024x1024" : aspectRatio==="9:16" ? "1024x1792" : "1792x1024";
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type":"application/json", "Authorization": \`Bearer \${key}\` },
      body: JSON.stringify({ model: "gpt-image-1", prompt: \`\${prompt}\\nWasserzeichen: \${fallbackText}\`, size })
    });
    const json:any = await res.json();
    const b64 = json?.data?.[0]?.b64_json;
    if (!b64) return "/dummy/vog-default.jpg";
    // data URL zurückgeben – oder später in /public/ persistieren
    return \`data:image/png;base64,\${b64}\`;
  } catch {
    return "/dummy/vog-default.jpg";
  }
}
export const youQuery = async (_: any)=>({ ok:false });
`);

// ---------- C) Auth: echte NextAuth Credentials-Route (dev-fähig; optional Prisma) ----------
write(path.join(src, "app", "api", "auth", "[...nextauth]", "route.ts"), `
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

const creds = Credentials({
  name: "Credentials",
  credentials: {
    email: { label: "E-Mail", type: "text" },
    password: { label: "Passwort", type: "password" }
  },
  async authorize(creds) {
    const email = (creds?.email||"").toString().toLowerCase().trim();
    const pw = (creds?.password||"").toString();
    // DEV-Minimum: akzeptiere eine definierte Dev-User-Kombi via ENV (oder Demo)
    const devUser = process.env.NEXTAUTH_DEV_USER || "dev@edebatte.org";
    const devPass = process.env.NEXTAUTH_DEV_PASS || "devpass";
    if (process.env.NEXTAUTH_DEV_ALLOW === "1" && email === devUser && pw === devPass) {
      return { id: "dev-1", name: "Developer", email };
    }
    // TODO: Falls Prisma konfiguriert: hier echte Nutzerprüfung (bcrypt + prisma.user.findUnique)
    return null;
  }
});

const handler = NextAuth({
  providers: [creds],
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
});
export const GET = handler;
export const POST = handler;
`);

// ---------- D) Health-Routen: echt prüfen ----------
write(path.join(src, "app", "api", "health", "route.ts"), `
import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({ ok: true, ts: Date.now(), env: process.env.NEXT_PUBLIC_APP_ENV || "dev" });
}
`);
write(path.join(src, "app", "api", "health", "mongo", "route.ts"), `
import { NextResponse } from "next/server";
import { coreCol } from "@core/db/triMongo";
export async function GET() {
  try {
    const col = await coreCol("_health");
    await col.insertOne?.({ _t: Date.now(), ok: true }).catch(()=>{});
    const ping = await col.findOne?.({});
    return NextResponse.json({ ok: true, ping: !!ping });
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
`);
write(path.join(src, "app", "api", "health", "prisma", "route.ts"), `
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export async function GET() {
  try {
    const now = await prisma.$queryRaw\`SELECT NOW()\`;
    return NextResponse.json({ ok: true, now });
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
`);
write(path.join(src, "app", "api", "health", "redis", "route.ts"), `
import { NextResponse } from "next/server";
export async function GET() {
  // Upstash REST (falls Keys fehlen, liefern wir ok:false)
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return NextResponse.json({ ok:false, reason:"missing upstash env" }, { status: 200 });
  try {
    const res = await fetch(url + "/GET/health-key", { headers: { Authorization: \`Bearer \${token}\` } });
    return NextResponse.json({ ok: res.ok, status: res.status });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || String(e) }, { status: 500 });
  }
}
`);
write(path.join(src, "app", "api", "health", "gpt", "route.ts"), `
import { NextResponse } from "next/server";
export async function GET() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ ok:false, reason:"no OPENAI_API_KEY" });
  try {
    const res = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: \`Bearer \${key}\` } });
    return NextResponse.json({ ok: res.ok, status: res.status });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || String(e) }, { status: 500 });
  }
}
`);

// ---------- E) Graph-Seed: echt – Neo4j wenn da, sonst Prisma-Adjacency ----------
write(path.join(src, "app", "api", "admin", "graph", "seed", "route.ts"), `
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function seedPrismaAdjacency() {
  // minimal: 2 Topics + Relation in adjacency table (falls du schon ein Modell hast, passe hier an)
  const t1 = await prisma.topic.upsert({ where:{ slug:"energie" }, update:{}, create:{ slug:"energie", title:"Energie" }});
  const t2 = await prisma.topic.upsert({ where:{ slug:"klima" }, update:{}, create:{ slug:"klima", title:"Klima" }});
  // Beispielhafte Relation (TopicRelation: { fromId, toId, kind })
  await prisma.topicRelation.upsert({
    where: { fromId_toId_kind: { fromId: t1.id, toId: t2.id, kind: "RELATES" } },
    update: {},
    create: { fromId: t1.id, toId: t2.id, kind: "RELATES" }
  });
  return { ok:true, mode:"prisma", nodes:[t1.id,t2.id] };
}

async function seedNeo4j() {
  const neo4j = await import("neo4j-driver");
  const url = process.env.NEO4J_URI, user = process.env.NEO4J_USER, pass = process.env.NEO4J_PASSWORD;
  if (!url || !user || !pass) return null;
  const driver = neo4j.driver(String(url), neo4j.auth.basic(user, pass));
  const session = driver.session();
  try {
    await session.run("MERGE (:Topic {slug:$s, title:'Energie'})", { s:"energie" });
    await session.run("MERGE (:Topic {slug:$s, title:'Klima'})", { s:"klima" });
    await session.run("MATCH (a:Topic {slug:'energie'}),(b:Topic {slug:'klima'}) MERGE (a)-[:RELATES]->(b)");
    return { ok:true, mode:"neo4j" };
  } finally {
    await session.close(); await driver.close();
  }
}

export async function POST() {
  try {
    const neo = await seedNeo4j();
    if (neo) return NextResponse.json(neo);
    const prismaAdj = await seedPrismaAdjacency();
    return NextResponse.json(prismaAdj);
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || String(e) }, { status: 500 });
  }
}
`);

// ---------- F) BodySchema-Import auto einfügen, falls im Code verwendet ----------
function addImportIfUsesSymbol(relPath, symbol, importFrom) {
  const f = path.join(web, relPath);
  if (!exists(f)) return;
  let s = fs.readFileSync(f, "utf8");
  if (!new RegExp(`\\b${symbol}\\b`).test(s)) return;
  if (new RegExp(`from\\s+["']${importFrom}["']`).test(s)) return;
  s = `import { ${symbol} } from "${importFrom}";\n` + s;
  fs.writeFileSync(f, s, "utf8");
  console.log("✓ import+", relPath, "←", symbol);
}

// scan api routes for BodySchema usage
const walk = (d, arr=[]) => { for (const e of fs.readdirSync(d, { withFileTypes:true })) { const p=path.join(d,e.name); e.isDirectory()?walk(p,arr):arr.push(p); } return arr; };
const apiFiles = walk(path.join(src, "app", "api")).filter(f=>/\.(ts|tsx)$/.test(f));
for (const f of apiFiles) {
  const rel = path.relative(web, f);
  const s = fs.readFileSync(f,"utf8");
  if (/\bBodySchema\b/.test(s)) addImportIfUsesSymbol(rel, "BodySchema", "@/lib/validation/body");
}

// ---------- G) NextAuth .env Hinweise (nur informative Ausgabe) ----------
console.log("ℹ️  NextAuth läuft mit Credentials. Für Dev-Login ENV setzen:");
console.log("    NEXTAUTH_DEV_ALLOW=1  NEXTAUTH_DEV_USER=dev@edebatte.org  NEXTAUTH_DEV_PASS=devpass");
console.log("    production: NEXTAUTH_SECRET, (optional) Prisma Adapter konfigurieren.");

// ---------- H) Done ----------
console.log("→ Jetzt: pnpm run e200");
