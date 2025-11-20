#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-.}"
WEB="$ROOT/apps/web"

if command -v gsed >/dev/null 2>&1; then SED="gsed"; else SED="sed"; fi

echo ">>> VOG Phase 5: GPT-5.0 Orchestrierung + SSE + Fixes"

# A) Dependencies (nur falls nicht vorhanden)
echo " - ensure openai dependency (apps/web)…"
pnpm --filter @vog/web add openai@^4 >/dev/null

# B) .env.local vorbereiten (ohne Key zu überschreiben)
ENVFILE="$WEB/.env.local"
touch "$ENVFILE"
grep -q '^OPENAI_MODEL=' "$ENVFILE" || echo 'OPENAI_MODEL=gpt-5.0' >> "$ENVFILE"
grep -q '^OPENAI_API_KEY=' "$ENVFILE" || echo 'OPENAI_API_KEY=' >> "$ENVFILE"

# C) next.config.ts (allowedDevOrigins)
LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")"
ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
if [ -n "$LAN_IP" ]; then ORIGINS="$ORIGINS,http://$LAN_IP:3000"; fi
cat > "$WEB/next.config.ts" <<TS
import type { NextConfig } from "next";
const origins = "${ORIGINS}".split(",");
const config: NextConfig = {
  experimental: { allowedDevOrigins: origins, typedRoutes: true, externalDir: true }
};
export default config;
TS
echo " - next.config.ts updated (allowedDevOrigins)"

# D) tsconfig.json: Aliases konsolidieren + include/exclude korrekt
cat > "$WEB/tsconfig.json" <<'JSON'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true,
    "incremental": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@features/*": ["../../features/*"],
      "@core/*": ["../../core/*"],
      "@core/db/triMongo": ["src/shims/core/db/db/triMongo.ts"],
      "@packages/*": ["../../packages/*"],
      "@packages/config/*": ["src/shims/packages/config/*"],
      "@config/*": ["src/config/*"],
      "@lib/*": ["src/lib/*"],
      "@models/*": ["src/models/*"],
      "@components/*": ["src/components/*"],
      "@/ui/design/*": ["src/ui/design/*"]
    },
    "plugins": [{ "name": "next" }]
  },
  "include": [
    "next-env.d.ts",
    ".next/types/**/*.ts",
    "src/**/*",
    "../../features/**/*.ts",
    "../../features/**/*.tsx",
    "../../features/**/*.mts",
    "../../features/**/*.cts"
  ],
  "exclude": [
    "node_modules",
    ".next",
    "dist",
    "build",
    "src/_disabled/**"
  ]
}
JSON
echo " - tsconfig.json normalized"

# E) Middleware fixen (doppeltes OPTIONS + req-Name)
cat > "$WEB/src/middleware.ts" <<'TS'
import { NextResponse, type NextRequest } from "next/server";
export function middleware(req: NextRequest) {
  if (req.method === "OPTIONS") return NextResponse.next();
  if (req.nextUrl.pathname === "/statements/new") {
    const url = req.nextUrl.clone();
    url.pathname = "/contributions/new";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
TS
echo " - middleware.ts fixed"

# F) Admin-Config Shim (damit @packages/config/admin-config auflöst)
mkdir -p "$WEB/src/shims/packages/config"
cat > "$WEB/src/shims/packages/config/admin-config.ts" <<'TS'
export interface PricingConfig {
  membershipMonthlyEUR: number;
  postImmediateEUR: number;
  swipeToPostThresholds: number[];
}
export interface PipelineLimits {
  newsfeedMaxPerRun: number;
  factcheckMaxPerItemTokens: number;
  enableAutoPost: boolean;
}
export interface RegionPilot { defaultRegionKey: string; }
export interface AdminConfig { pricing: PricingConfig; limits: PipelineLimits; region: RegionPilot; }
export const adminConfig: AdminConfig = {
  pricing: {
    membershipMonthlyEUR: Number(process.env.VOG_PRICE_MEMBERSHIP ?? 5),
    postImmediateEUR: Number(process.env.VOG_PRICE_POST_IMMEDIATE ?? 1.99),
    swipeToPostThresholds: (process.env.VOG_SWIPE_THRESHOLDS ?? "100,500,1000").split(",").map(x => Number(x.trim())).filter(Boolean)
  },
  limits: {
    newsfeedMaxPerRun: Number(process.env.VOG_NEWSFEED_MAX_PER_RUN ?? 50),
    factcheckMaxPerItemTokens: Number(process.env.VOG_FACTCHECK_TOKENS ?? 4096),
    enableAutoPost: String(process.env.VOG_PIPELINE_AUTODRAFT ?? "true") === "true"
  },
  region: { defaultRegionKey: String(process.env.VOG_DEFAULT_REGION ?? "DE:BE:11000000") }
};
export default adminConfig;
TS
echo " - admin-config shim ready"

# G) LLM Helper (GPT-5.0 Analyse – JSON)
mkdir -p "$WEB/src/lib"
cat > "$WEB/src/lib/llm.ts" <<'TS'
import OpenAI from "openai";

const model = process.env.OPENAI_MODEL || "gpt-5.0"; // Fallback möglich (z.B. gpt-4o)
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type AnalyzeJSON = {
  topics: { label: string; score: number }[];
  theses: { text: string; relevance: number }[];
  statements: { text: string; rationales: string[]; uncertainty?: number }[];
  notes?: string;
};

const SYSTEM = `
Du bist ein mehrsprachiger Analyse-Agent (deutsch bevorzugt, sonst Sprache des Eingabetexts).
Ziel: Themen → Thesen → Kernaussagen mit Unsicherheit. Antworte NUR als JSON.
`;

export async function analyzeWithGpt(text: string, localeHint?: string): Promise<AnalyzeJSON> {
  const user = `Analysiere folgenden Beitrag (Sprache automatisch erkennen).
Gib JSON mit {topics:[{label,score}], theses:[{text,relevance}], statements:[{text,rationales,uncertainty?}], notes?}. 
Text:
---
${text}
---`;

  const res = await client.chat.completions.create({
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: user }
    ]
  });

  const content = res.choices[0]?.message?.content || "{}";
  try { return JSON.parse(content) as AnalyzeJSON; } catch { return { topics: [], theses: [], statements: [], notes: "parse_error" }; }
}
TS
echo " - src/lib/llm.ts written"

# H) SSE-Orchestrator (M0–M7) mit Mongo-Cache
mkdir -p "$WEB/src/app/api/contributions/analyze/stream"
cat > "$WEB/src/app/api/contributions/analyze/stream/route.ts" <<'TS'
import { NextRequest } from "next/server";
import crypto from "crypto";
import { analyzeWithGpt } from "@/lib/llm";
import { coreCol } from "@core/db/triMongo";

export const dynamic = "force-dynamic";
const enc = new TextEncoder();

type Topic = { label: string; score: number };
type Thesis = { text: string; relevance: number };

const sleep = (ms:number)=> new Promise(r=>setTimeout(r,ms));
const send = (c:ReadableStreamDefaultController, event:string, data:any) => c.enqueue(enc.encode(`event:${event}\ndata:${JSON.stringify(data)}\n\n`));

export async function GET(req: NextRequest) {
  const text = (new URL(req.url).searchParams.get("text") || "").trim();
  const hash = crypto.createHash("sha256").update(text).digest("hex").slice(0,32);
  const analyses = await coreCol<any>("analyses");

  const stream = new ReadableStream({
    async start(controller) {
      send(controller, "status", { step:"intake", msg:"Vorverarbeitung…" });

      // M0 Intake/Hygiene (minimal)
      if (!text) { send(controller, "done", {}); controller.close(); return; }

      // M7 Cache-Hit?
      const cached = await analyses.findOne({ hash });
      if (cached) {
        send(controller, "status", { step:"cache", msg:"Cache-Treffer – lade Ergebnisse." });
        send(controller, "summary", cached.summary);
        send(controller, "topics", cached.topics);
        send(controller, "theses", cached.theses);
        send(controller, "statements", cached.statements);
        send(controller, "dbcheck", cached.dbcheck ?? {foundTopics:[], missingTopics:[]} );
        if (cached.news)  send(controller, "news", { items: cached.news });
        if (cached.facts) send(controller, "factcheck", { facts: cached.facts });
        send(controller, "done", {});
        controller.close();
        return;
      }

      // M1 Analyse (GPT-5.0)
      send(controller, "status", { step:"analyse", msg:"Analysiere Text (GPT-5.0) …" });
      const a = await analyzeWithGpt(text);
      const topics: Topic[] = (a.topics || []).map(t => ({ label: t.label, score: t.score }));
      const theses: Thesis[] = a.theses || [];
      const statements = a.statements || [];
      const summary = { topics: topics.length, theses: theses.length, avgRelevance: Math.round((theses.reduce((s,t)=>s+(t.relevance||0),0)/(theses.length||1))*100) };
      send(controller, "summary", summary);
      send(controller, "topics", topics);
      send(controller, "theses", theses);
      send(controller, "statements", statements);
      await sleep(80);

      // M2 Canon-Mapping (platzhalter: label->tier1=t.label, tier2=null)
      send(controller, "status", { step:"canon", msg:"Kanon-Mapping…" });
      const canon = topics.map(t=>({ topic:t.label, tier1:t.label, tier2:null, confidence: Math.min(1, t.score+0.2) }));
      send(controller, "canon", canon);
      await sleep(60);

      // M3 DB-Check (einfach: existiert Topic in knowledge?)
      send(controller, "status", { step:"db", msg:"Prüfe vorhandene Wissenseinträge…" });
      const knowledge = await coreCol<any>("knowledge");
      const found: Topic[] = [];
      const missing: Topic[] = [];
      for (const t of topics) {
        const hit = await knowledge.findOne({ $text: { $search: `"${t.label}"` } }).catch(()=>null);
        (hit ? found : missing).push(t);
      }
      const dbcheck = { foundTopics: found, missingTopics: missing };
      send(controller, "dbcheck", dbcheck);
      await sleep(60);

      // M4 News nur bei Bedarf (Stub – in Produktion echte Quelle/Serp einhängen)
      let news:any[] = [];
      if (missing.length) {
        send(controller, "status", { step:"news", msg:"Recherchiere externe Quellen…" });
        news = missing.slice(0,3).map((m,i)=>({ title:`Quelle zu ${m.label}`, url:"#", relevance: 0.6 - i*0.1 }));
        send(controller, "news", { items: news });
        await sleep(60);
      } else {
        send(controller, "status", { step:"news", msg:"Übersprungen (DB deckt Themen ab)" });
      }

      // M5 Faktencheck (Stub über Thesen)
      let facts:any[] = [];
      if (theses.length) {
        send(controller, "status", { step:"factcheck", msg:"Faktencheck relevanter Thesen…" });
        facts = theses.slice(0,3).map(t=>({ claim:t.text, verdict: Math.random()>0.5?"stützt":"widerspricht", confidence: Math.round(60+Math.random()*35) }));
        send(controller, "factcheck", { facts });
        await sleep(60);
      }

      // M6 Gates (einfach und prüfbar)
      const gates = {
        structure: Array.isArray(topics) && Array.isArray(theses) && Array.isArray(statements),
        coherence: statements.length>0,
        safety: true,
        provenance: facts.length>0 || news.length>0
      };
      send(controller, "gates", gates);

      // Persist (M7)
      await analyses.insertOne({ hash, text, summary, topics, theses, statements, dbcheck, news, facts, createdAt: new Date() }).catch(()=>{});

      send(controller, "done", {});
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive"
    }
  });
}
TS
echo " - SSE route written"

# I) Fallback-POST (nur Ergebnis, kein Stream)
mkdir -p "$WEB/src/app/api/contributions/analyze"
cat > "$WEB/src/app/api/contributions/analyze/route.ts" <<'TS'
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { analyzeWithGpt } from "@/lib/llm";
import { coreCol } from "@core/db/triMongo";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(()=>({}));
  const text: string = String(body.text || "").trim();
  if (!text) return NextResponse.json({ error: "missing text" }, { status: 400 });

  const hash = crypto.createHash("sha256").update(text).digest("hex").slice(0,32);
  const analyses = await coreCol<any>("analyses");
  const cached = await analyses.findOne({ hash }).catch(()=>null);
  if (cached) return NextResponse.json(cached);

  const a = await analyzeWithGpt(text);
  const topics = a.topics || [];
  const theses = a.theses || [];
  const statements = a.statements || [];
  const summary = { topics: topics.length, theses: theses.length, avgRelevance: Math.round((theses.reduce((s,t)=>s+(t.relevance||0),0)/(theses.length||1))*100) };

  const doc = { hash, text, summary, topics, theses, statements, createdAt: new Date() };
  await analyses.insertOne(doc).catch(()=>{});
  return NextResponse.json(doc);
}
TS
echo " - POST analyze route written"

# J) Pages ohne next/dynamic (falls noch alt)
for P in "$WEB/src/app/contributions/analyze/page.tsx" "$WEB/src/app/contributions/new/page.tsx"; do
  mkdir -p "$(dirname "$P")"
  cat > "$P" <<'TSX'
import { Suspense } from "react";
import AnalyzeUI from "@/components/analyze/AnalyzeUI";
export const dynamic = "force-dynamic";
export default function Page(){ return <Suspense fallback={<div className="p-6">UI lädt…</div>}><AnalyzeUI/></Suspense>; }
TSX
done
echo " - pages wired to AnalyzeUI"

echo ">>> Phase 5 done. Next steps:"
echo "  pnpm --filter @vog/web run typecheck"
echo "  pnpm --filter @vog/web run dev"
