#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
APP="$ROOT/apps/web"
SRC="$APP/src"

echo "→ Root: $ROOT"

# 1) Sicherstellen: Zielordner
mkdir -p "$ROOT/features/analyze" \
         "$SRC/shims/features/analysis"

# 2) Zentrale analyzeContribution schreiben (Source of Truth)
CAT_TARGET="$ROOT/features/analyze/analyzeContribution.ts"
cp -f "$CAT_TARGET" "$CAT_TARGET.bak.$(date +%s)" 2>/dev/null || true
cat > "$CAT_TARGET" <<'TS'
import { needsClarify, clarifyForPrices } from "./clarify";
import { callOpenAIJson } from "../ai/providers";

/* =======================
 * Typen
 * ======================= */

export type Claim = {
  text: string;
  categoryMain?: string | null;
  categorySubs?: string[];
  region?: string | null;
  authority?: string | null;
  canon?: string | null;
  // v2 (optional, wenn Modell liefert)
  specificity?: number;       // 0..1
  needsClarify?: boolean;
};

type Organ = {
  level: "EU" | "Bund" | "Land" | "Kommune" | "Behörde";
  name: string;
  why: string;
};

type Trust = {
  score: number;              // 0..1
  reasons: string[];
  riskFlags: string[];
};

type Newsroom = {
  queries: string[];
  angles: string[];
  watch: string[];
};

type WeightsUpdated = {
  specificity: number;
  sources: number;
  organ_alignment: number;
  region_link: number;
  feasibility: number;
};

type ClarifyCTAFromModel = {
  title?: string;
  hint?: string;
  options?: string[];
} | null;

export type AnalyzeResult = {
  language: string | null;
  mainTopic: string | null;
  subTopics: string[];
  regionHint: string | null;
  claims: Claim[];
  organs?: Organ[];           // v2
  trust?: Trust;              // v2
  newsroom?: Newsroom;        // v2
  weightsUpdated?: WeightsUpdated; // v2
  news: any[];
  scoreHints: { baseWeight?: number; reasons?: string[] } | null;
  // Für die UI belassen wir "cta" (type:"clarify", ask[], options[], quickSources[])
  cta: any | null;
  _meta: {
    mode: "gpt" | "ari" | "error";
    errors: string[] | null;
    tookMs: number;
    gptMs?: number;
    ariMs?: number;
    gptText: string | null;
  };
};

/* =======================
 * Mini-Prompt (v2)
 * ======================= */

const MINI_PROMPT = String.raw`You are eDebatte Analyzer. Output STRICT JSON (RFC8259), no prose.
Use the MANIFEST and RUBRIC to 1) extract claims, 2) map to political organs, 3) compute trust,
4) emit an optional clarify CTA for generic price statements, 5) propose newsroom queries/angles.

MANIFEST.topics_to_organs (DE/EU):
- "Preise/Preiserhöhungen": EU-Kommission (DG COMP, DG ENER), Bund: BMWK; Behörden: Bundeskartellamt, BNetzA; Länder: Wirtschafts-/Verbraucherschutz-Min.; Kommune: Stadtrat (Tarife/ÖPNV).
- "Lebensmittelpreise": BMEL; Behörden: BLE; Statistik: Destatis; EU: DG AGRI.
- "Energie/Kraftstoff": BMWK, BMDV; BNetzA; EU: DG ENER.
- "Mieten/Nebenkosten": BMI/BMWSB; Landesbau-/Mietrecht; Kommune: Mietspiegel, Stadtwerke.
(Erweitere implizit mit gesundem Menschenverstand, aber bleib konservativ.)

RUBRIC (0..1, additiv):
- specificity (0.0..0.4) – je konkreter (Branche/Region/Preistyp), desto höher
- sources (0.0..0.2) – valide Quellen/URLs (z.B. Destatis, Behörden)
- organ_alignment (0.0..0.2) – passt Topic → zuständige Organe?
- region_link (0.0..0.1) – erkennbare Region?
- feasibility (0.0..0.1) – als Maßnahme/Abstimmung formulierbar?
Total = sum; include reasons.

CLARIFY rule:
If statement is generic about “Preiserhöhungen/Preise” without subtype (Lebensmittel, Energie, Kraftstoff, Miete, Tarife),
set needsClarify=true and propose options: ["Lebensmittelpreise","Energiepreise","Kraftstoffpreise","Mieten/Nebenkosten","ÖPNV/Telekom-Tarife"].

FEEDBACK (editorSignals): summarize patterns and adjust weights slightly (±0.05 per strong pattern).
No free-form text—return newWeights with the deltas applied.

OUTPUT schema:
{
 "language": "de"|"en"|null,
 "mainTopic": string|null,
 "subTopics": string[],
 "claims": [{
   "text": string,
   "categoryMain": string|null,
   "categorySubs": string[],
   "specificity": number,
   "needsClarify": boolean
 }],
 "organs": [{"level":"EU"|"Bund"|"Land"|"Kommune"|"Behörde","name":string,"why":string}],
 "trust": {"score": number, "reasons": string[], "riskFlags": string[]},
 "clarifyCTA": null | {"title":string,"hint":string,"options":string[]},
 "newsroom": {"queries": string[], "angles": string[], "watch": string[]},
 "scoreHints": {"baseWeight": number, "reasons": string[]},
 "weightsUpdated": {"specificity":number,"sources":number,"organ_alignment":number,"region_link":number,"feasibility":number}
}

== TEXT ==
<<<INPUT>>

== EDITOR_SIGNALS_JSON ==
<<<EDITOR>>`;

/* =======================
 * Analyzer
 * ======================= */

export async function analyzeContribution(
  text: string,
  opts: {
    maxClaims?: number;
    context?: { editorSignals?: any };
    debug?: boolean;
    // optionaler Hook für zukünftige ARI/Suche (siehe unten)
    searchFn?: (queries: string[]) => Promise<{ news?: any[] }>;
  } = {}
): Promise<AnalyzeResult> {
  const t0 = Date.now();
  const errs: string[] = [];
  const maxClaims = Math.max(1, Number(opts.maxClaims ?? 5));

  let outText = "";
  let gptMs = 0;

  // Prompt mit Editor-Signalen füllen
  const prompt = MINI_PROMPT
    .replace("<<<INPUT>>>", text)
    .replace("<<<EDITOR>>>", JSON.stringify(opts?.context?.editorSignals ?? {}));

  let parsed: any = {};
  try {
    const tCall0 = Date.now();
    const { text: t } = await callOpenAIJson(prompt, 1600);
    gptMs = Date.now() - tCall0;
    outText = String(t || "");
    parsed = JSON.parse(outText || "{}");
  } catch (e: any) {
    errs.push("GPT JSON parse failed: " + String(e?.message || e));
    parsed = {};
  }

  // 🧹 Claims normalisieren (DE: „opinion“ → „Meinung“)
  const claims: Claim[] = Array.isArray(parsed?.claims)
    ? (parsed.claims as any[])
        .slice(0, maxClaims)
        .map((c): Claim => {
          const rawCat = c?.categoryMain ?? null;
          const catDE =
            rawCat && String(rawCat).toLowerCase() === "opinion" ? "Meinung" : rawCat;
          return {
            text: String(c?.text || "").trim(),
            categoryMain: catDE,
            categorySubs: Array.isArray(c?.categorySubs) ? c.categorySubs : [],
            region: c?.region ?? null,
            authority: c?.authority ?? null,
            canon: c?.canon ?? null,
            specificity: typeof c?.specificity === "number" ? c.specificity : undefined,
            needsClarify: Boolean(c?.needsClarify),
          };
        })
        .filter((c) => c.text)
    : [];

  // (Optional) Heuristik: „Preiserhöhung“ → Wirtschaft/Preise
  if (/preiserh[oö]hung/i.test(claims?.[0]?.text || "")) {
    claims[0] = {
      ...claims[0],
      categoryMain: "Wirtschaft",
      categorySubs: Array.from(new Set([...(claims[0].categorySubs || []), "Preise", "Tarife"])),
    };
  }

  // v2-Felder übernehmen, mit defensivem Fallback
  const organs = Array.isArray(parsed?.organs) ? parsed.organs : [];
  const trust = parsed?.trust && typeof parsed.trust === "object"
    ? {
        score: clamp01(Number(parsed.trust.score ?? 0)),
        reasons: Array.isArray(parsed.trust.reasons) ? parsed.trust.reasons : [],
        riskFlags: Array.isArray(parsed.trust.riskFlags) ? parsed.trust.riskFlags : [],
      }
    : undefined;

  const newsroom = {
    queries: Array.isArray(parsed?.newsroom?.queries) ? parsed.newsroom.queries : [],
    angles: Array.isArray(parsed?.newsroom?.angles) ? parsed.newsroom.angles : [],
    watch: Array.isArray(parsed?.newsroom?.watch) ? parsed.newsroom.watch : [],
  };

  const weightsUpdated =
    parsed?.weightsUpdated && typeof parsed.weightsUpdated === "object"
      ? {
          specificity: Number(parsed.weightsUpdated.specificity ?? 0),
          sources: Number(parsed.weightsUpdated.sources ?? 0),
          organ_alignment: Number(parsed.weightsUpdated.organ_alignment ?? 0),
          region_link: Number(parsed.weightsUpdated.region_link ?? 0),
          feasibility: Number(parsed.weightsUpdated.feasibility ?? 0),
        }
      : undefined;

  // Klassische Felder (Kompatibilität zu v1)
  const language = parsed?.language ?? null;
  const mainTopic = parsed?.mainTopic ?? null;
  const subTopics = Array.isArray(parsed?.subTopics) ? parsed.subTopics : [];
  const regionHint = parsed?.regionHint ?? null;

  // scoreHints: vom Modell übernehmen oder aus trust ableiten
  let scoreHints =
    parsed?.scoreHints && typeof parsed.scoreHints === "object"
      ? parsed.scoreHints
      : null;

  if (!scoreHints && trust) {
    scoreHints = {
      baseWeight: Math.round(clamp01(trust.score) * 5 * 10) / 10,
      reasons: trust.reasons || [],
    };
  }

  // News-Array
  let news: any[] = Array.isArray(parsed?.news) ? parsed.news : [];

  // Clarify-CTA
  let cta: any = null;
  const clarifyFromModel: ClarifyCTAFromModel = parsed?.clarifyCTA ?? null;
  if (clarifyFromModel && Array.isArray(clarifyFromModel.options) && clarifyFromModel.options.length) {
    const pricesPreset = clarifyForPrices?.() || { ask: [], options: [], quickSources: [] };
    cta = {
      type: "clarify",
      ask: [
        clarifyFromModel.title || "Bitte präzisieren: Welche Preise genau?",
        clarifyFromModel.hint || "Konkreter = bessere Zuordnung, Faktencheck, Quellen.",
        ...(pricesPreset.ask || []),
      ].filter(Boolean),
      options: clarifyFromModel.options.map((label: string, i: number) => ({ key: `opt${i + 1}`, label })),
      quickSources: pricesPreset.quickSources || [],
    };
  } else {
    const first = claims?.[0];
    if (first && needsClarify?.({ text: first.text, categoryMain: first.categoryMain, region: first.region })) {
      cta = { type: "clarify", ...(clarifyForPrices?.() || {}) };
    }
  }

  const resultBase = {
    language,
    mainTopic,
    subTopics,
    regionHint,
    claims,
    organs,
    trust,
    newsroom,
    weightsUpdated,
    news,
    scoreHints,
    cta,
  };

  // Optional: ARI/Suche
  let ariMs: number | undefined;
  if ((resultBase as any) && Array.isArray(newsroom.queries) && newsroom.queries.length && (typeof (opts as any).searchFn === "function")) {
    const tAri0 = Date.now();
    try {
      const res = await (opts as any).searchFn(newsroom.queries);
      if (res?.news?.length) {
        (resultBase as any).news = res.news;
      }
      ariMs = Date.now() - tAri0;
    } catch (e: any) {}
  }

  const meta = {
    mode: (ariMs ? "ari" : (errs.length ? "error" : "gpt")) as "gpt"|"ari"|"error",
    errors: errs.length ? errs : null,
    tookMs: Date.now() - t0,
    gptMs,
    ariMs,
    gptText: (opts as any)?.debug ? outText ?? null : null,
  };

  return { ...(resultBase as any), _meta: meta };
}

/* =======================
 * Helpers
 * ======================= */

function clamp01(x: number) {
  if (Number.isNaN(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}
TS
echo "  ✓ wrote: features/analyze/analyzeContribution.ts"

# 3) Shim an der Web-App: alte Imports kompatibel machen
SHIM="$SRC/shims/features/analysis/extract.ts"
mkdir -p "$(dirname "$SHIM")"
cat > "$SHIM" <<'TS'
// shim: web-app ruft "@/features/analysis/extract" auf.
// Wir leiten das auf den zentralen Baum "/features" um.
export { analyzeContribution } from "@features/analyze/analyzeContribution";
export type { AnalyzeResult, Claim } from "@features/analyze/analyzeContribution";
TS
echo "  ✓ wrote: apps/web/src/shims/features/analysis/extract.ts"

# 4) Alias @features/* → ./features/* in tsconfig.base.json eintragen/mergen
TSB="$ROOT/tsconfig.base.json"
node - <<'NODE'
const fs=require('fs');
const p=process.argv[1];
const f=process.argv[2];
const j=JSON.parse(fs.readFileSync(f,'utf8'));
j.compilerOptions=j.compilerOptions||{};
j.compilerOptions.baseUrl=j.compilerOptions.baseUrl||'.';
j.compilerOptions.paths=j.compilerOptions.paths||{};
j.compilerOptions.paths['@features/*']=['features/*'];
fs.writeFileSync(f,JSON.stringify(j,null,2));
console.log('  ✓ updated paths in',f);
NODE node "$TSB"

# 5) Optional auch in apps/web/tsconfig.json sicherheitshalber setzen
TSW="$APP/tsconfig.json"
node - <<'NODE'
const fs=require('fs');
const f=process.argv[2];
const j=JSON.parse(fs.readFileSync(f,'utf8'));
j.compilerOptions=j.compilerOptions||{};
j.compilerOptions.paths=j.compilerOptions.paths||{};
j.compilerOptions.paths['@features/*']=j.compilerOptions.paths['@features/*']||['../../features/*'];
fs.writeFileSync(f,JSON.stringify(j,null,2));
console.log('  ✓ ensured paths in',f);
NODE node "$TSW"

# 6) Problematische Importe in der Web-App umlenken:
#    "@/features/..."  → "@/shims/features/..."
#    (dadurch bleibt "@/" alias auf src erhalten)
echo "  → rewriting '@/features/…' imports to '@/shims/features/…'"
find "$SRC" -type f -name "*.ts*" -print0 \
  | xargs -0 perl -pi -e 's#from\s+\"@/features/#from "@/shims/features/#g'

# 7) Dubletten parken (falls vorhanden)
for F in \
  "$ROOT/core/gpt/analyzeContribution.ts" \
  "$APP/src/lib/contribution/analyzeContribution.ts" \
  "$ROOT/features/analyze/analyzeContribution.ts.bak" ; do
  if [ -f "$F" ]; then
    mv "$F" "$F.legacy.$(date +%s)" && echo "  • parked legacy: $F"
  fi
done

# 8) Next-Cache leeren (sicher)
rm -rf "$APP/.next" 2>/dev/null || true
echo "✓ Done. Bitte neu starten: pnpm -F @vog/web dev"
