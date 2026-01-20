#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB_TSC="$ROOT/apps/web/tsconfig.json"

echo "🧩 eDebatte workflow: apply patches"
cd "$ROOT"

echo "📦 deps prüfen"
pnpm -w add zod openai@^4 >/dev/null

echo "🛠  tsconfig paths (@vog/config/*)"
if [ ! -f "$WEB_TSC" ]; then
  echo "✖ tsconfig nicht gefunden: $WEB_TSC" >&2
  exit 1
fi

# Nur patchen, wenn alias noch nicht drin
if ! grep -q '"@vog/config/*"' "$WEB_TSC"; then
  node -e '
    const fs = require("fs");
    const p  = process.argv[2];
    const j  = JSON.parse(fs.readFileSync(p, "utf8"));
    j.compilerOptions = j.compilerOptions || {};
    j.compilerOptions.baseUrl = j.compilerOptions.baseUrl || ".";
    j.compilerOptions.paths   = j.compilerOptions.paths   || {};
    j.compilerOptions.paths["~/*"] = j.compilerOptions.paths["~/*"] || ["src/*"];
    j.compilerOptions.paths["@vog/config/*"] = ["../../packages/config/*"];
    fs.writeFileSync(p, JSON.stringify(j, null, 2));
  ' "$WEB_TSC"
  echo "✅ tsconfig paths gesetzt"
else
  echo "ℹ️  tsconfig paths bereits vorhanden"
fi

echo "🧭 admin-config re-exports"
mkdir -p "$ROOT/apps/web/src/config"
cat > "$ROOT/apps/web/src/config/admin-config.ts" <<'TS'
export type { AdminConfig, PricingConfig, PipelineLimits, RegionPilot } from "@vog/config/admin-config";
export { adminConfig } from "@vog/config/admin-config";
export { adminConfig as default } from "@vog/config/admin-config";
TS

echo "🧠 Analyzer aktualisieren"
mkdir -p "$ROOT/apps/web/src/features/analyze"
cat > "$ROOT/apps/web/src/features/analyze/analyzeContribution.ts" <<'TS'
import { z } from "zod";

const ClaimSchema = z.object({
  text: z.string().min(6).max(2000),
  categoryMain: z.string().min(2).max(80).nullable().optional(),
  categorySubs: z.array(z.string().min(2).max(80)).max(6).default([]),
  region: z.string().min(2).max(120).nullable().optional(),
  authority: z.string().min(2).max(160).nullable().optional(),
  relevance: z.number().min(1).max(5).default(3),
  stance: z.enum(["pro","contra","neutral"]).default("neutral"),
  thesis: z.string().min(3).max(200).nullable().optional(),
  arguments: z.array(z.string().min(3).max(240)).max(5).default([]),
});

const AnalyzeSchema = z.object({
  language: z.string().min(2).max(5).default("de"),
  mainTopic: z.string().min(2).max(80).nullable().optional(),
  subTopics: z.array(z.string().min(2).max(80)).max(10).default([]),
  regionHint: z.string().nullable().optional(),
  summary: z.string().min(10).max(400).nullable().optional(),
  scope: z.enum(["kommunal","land","bund","international"]).nullable().optional(),
  scopeRegionKey: z.string().nullable().optional(),
  needsFactcheck: z.boolean().default(false),
  claims: z.array(ClaimSchema).min(1).max(20),
});
export type AnalyzeResult = z.infer<typeof AnalyzeSchema>;

const SYS = `
Du bist ein strenger Extraktor für eDebatte (eDebatte).
Ziele (hart):
- MaxClaims ≤ 8 (lieber 5–6 präzise).
- Jede claim.text = genau EINE prüfbare Aussage (keine „und/oder“-Ketten), 1–2 Sätze, ≤180 Zeichen.
- Keine Duplikate (normalisiert).
- categoryMain MUSS im DomainKanon liegen; categorySubs (max 2) aus TopicKanon.
- scope ∈ {kommunal, land, bund, international}. scopeRegionKey nur bei klar erkennbarer Region.
- needsFactcheck = true bei unklaren/kausalen/unbelegten Behauptungen.
DomainKanon (Tier-1):
"Verfassung & Grundrechte","Demokratie & Beteiligung","Wahlen & Parteienrecht","Parlamente & Verfahren","Föderalismus & Kommunen","Öffentliche Verwaltung & E-Gov","Transparenz & Antikorruption","Innere Sicherheit & Polizei","Justiz & Rechtsstaat","Außenpolitik & Diplomatie","EU-Politik","Entwicklung & Humanitäres","Wirtschaftspolitik","Finanzen & Steuern","Arbeit & Beschäftigung","Soziales & Grundsicherung","Rente & Alterssicherung","Gesundheitspolitik","Pflege","Bildung","Hochschule & Forschung","Digitalisierung & Netzpolitik","Datenschutz & IT-Sicherheit","Familie & Gleichstellung","Kinder & Jugend","Migration & Integration","Wohnen & Stadtentwicklung","Verkehr & Infrastruktur","Energiepolitik","Klima & Umweltschutz","Landwirtschaft","Verbraucherschutz","Tierschutz & Tierhaltung","Kultur, Medien & Sport","Handel & Außenwirtschaft","Regionalentwicklung & Ländlicher Raum","Bau & Planungsrecht","Kommunalpolitik","Verteidigung & Bundeswehr"
TopicKanon (Tier-2 – Auswahl):
"Primärversorgung","KV","GVSG","Notfallversorgung","Haltungsstufen","Produktsicherheit","Lieferketten","Open Data","KI-Governance","DSGVO","Radwege","Deutschlandticket","Erneuerbare","CO₂-Bepreisung","Kreislaufwirtschaft","Pflegepersonal","Lehrkräftemangel","Digitale Identität","Krypto-Regulierung","Plattformaufsicht/DSA","Zivilschutz","Katastrophenschutz","Klimaanpassung","Biodiversität","Mietrecht","Sozialer Wohnungsbau","Bauordnung","Smart City","Geldwäschebekämpfung","Medienkompetenz digital","Obdachlosigkeit","Fachkräfteeinwanderung","Rüstungsbeschaffung"
Zusatz je Claim:
- relevance 1–5, stance pro/contra/neutral, thesis (≤120), arguments[] (max 5).
Qualitäts-Gate je Claim:
1) Verbkern (ist/erhöht/senkt/verbietet/erlaubt/führt zu/fordert)
2) ≤180 Zeichen
3) kein „und/oder“
4) categoryMain ∈ DomainKanon
5) keine Duplikate
6) kein reiner Appell
Ausgabe: NUR JSON { language, mainTopic, subTopics, regionHint, summary, scope, scopeRegionKey, needsFactcheck, claims[] }.
`;

function jsonSchemaForOpenAI() { return { type: "json_object" as const }; }

export async function analyzeContribution(text: string): Promise<AnalyzeResult> {
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");
  const user = text.slice(0, 8000);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: SYS }, { role: "user", content: user }],
      response_format: jsonSchemaForOpenAI(),
    }),
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(`OpenAI ${res.status}${raw ? ` – ${raw}` : ""}`);

  let content: unknown; try { const full=JSON.parse(raw); content = full?.choices?.[0]?.message?.content ?? "{}"; } catch { content = raw; }
  let parsed: unknown = content; if (typeof content==="string") { try { parsed = JSON.parse(content); } catch { parsed = null; } }

  const safe = AnalyzeSchema.safeParse(parsed);
  let out: AnalyzeResult;
  if (safe.success) out = safe.data;
  else out = { language:"de", mainTopic:null, subTopics:[], regionHint:null, summary:null, scope:null, scopeRegionKey:null, needsFactcheck:false, claims:[{ text:user, categoryMain:null, categorySubs:[], region:null, authority:null, relevance:3, stance:"neutral", thesis:null, arguments:[] }] };

  out.language = (out.language || "de").slice(0,5);
  out.mainTopic ??= null; out.regionHint ??= null; out.summary ??= null; out.scope ??= null; out.scopeRegionKey ??= null;

  const seen = new Set<string>();
  out.claims = (out.claims||[]).map(c=>({
    text: (c.text||"").trim().replace(/\s+/g," ").slice(0,240),
    categoryMain: c.categoryMain ?? null,
    categorySubs: c.categorySubs ?? [],
    region: c.region ?? null,
    authority: c.authority ?? null,
    relevance: Math.min(5, Math.max(1, Number(c.relevance ?? 3))),
    stance: c.stance ?? "neutral",
    thesis: c.thesis ?? null,
    arguments: c.arguments ?? [],
  })).filter(c=>{
    if (!c.text) return false;
    const k = `${c.text}|${c.categoryMain ?? ""}`.toLowerCase();
    if (seen.has(k)) return false; seen.add(k); return true;
  });

  if (out.claims.length===0) out.claims=[{ text:user, categoryMain:null, categorySubs:[], region:null, authority:null, relevance:3, stance:"neutral", thesis:null, arguments:[] }];
  return out;
}
TS

echo "🔧 route /api/statements: Analyzer-Aufruf vereinheitlichen"
STATEMENTS="$ROOT/apps/web/src/app/api/statements/route.ts"
if [ -f "$STATEMENTS" ]; then
  sed -i '' 's/analyzeContribution(text, *\[.*\])/analyzeContribution(text)/g' "$STATEMENTS" || true
  sed -i '' 's/analysis\.categories/analysis\.subTopics/g' "$STATEMENTS" || true
fi

echo "🚪 Startseite → /contributions/new"
mkdir -p "$ROOT/apps/web/src/app"
cat > "$ROOT/apps/web/src/app/page.tsx" <<'TSX'
export default function Page() {
  if (typeof window !== "undefined") window.location.href = "/contributions/new";
  return null;
}
TSX

echo "✅ Done. Bitte Dev-Server neu starten."
