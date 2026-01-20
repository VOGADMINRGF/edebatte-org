#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
echo "🧩 eDebatte Analyze Repair – start in: $ROOT"

# 0) Zielordner sicherstellen
mkdir -p "$ROOT/features/analyze"
mkdir -p "$ROOT/features/_internal"
mkdir -p "$ROOT/apps/web/src/app/api/contributions/analyze"

# 1) Optional: ZIPs einspielen, falls im Repo-Verzeichnis vorhanden
copy_zip () {
  local zipname="$1"; local dest="$2"
  if [ -f "$ROOT/$zipname" ]; then
    echo "📦 Entpacke $zipname → $dest"
    mkdir -p "$dest"
    unzip -o -q "$ROOT/$zipname" -d "$ROOT"
  else
    echo "ℹ️ $zipname nicht gefunden – überspringe."
  fi
}
copy_zip "prompts.zip" "$ROOT/features/prompts"
copy_zip "ai.zip"      "$ROOT/features/ai"
copy_zip "factcheck.zip" "$ROOT/features/factcheck"
# gpt.zip lassen wir aus – wir liefern eine kompatible, selbsttragende analyzeContribution.ts

# 2) Self-contained Analyze-Core schreiben (keine externen utils nötig)
TARGET_ANALYZE="$ROOT/features/analyze/analyzeContribution.ts"
cat > "$TARGET_ANALYZE" <<'TS'
// features/analyze/analyzeContribution.ts
/*  eDebatte Analyze v3 – GPT-first, ARI Fallback
    - OpenAI Responses API (input_text + text.format=json_object)
    - forceFallback → ARI
    - Zusätzliche Felder: pulse (quellen/aktualität grob), scoreHints (0.4/1.0/1.2/1.4)
    - Keine env-Änderung, keine externen utils nötig
*/

type Claim = {
  text: string;
  categoryMain: string|null;
  categorySubs: string[];
  region: string|null;
  authority: string|null;
  relevance?: number|null;
};

type AnalyzeOut = {
  language: string;
  mainTopic: string|null;
  subTopics: string[];
  regionHint: string|null;
  claims: Claim[];
  pulse?: { approxSources?: number; recency?: "fresh"|"mixed"|"stale" };
  scoreHints?: { baseWeight: 0.4|1.0|1.2|1.4; reasons: string[] };
  _meta?: Record<string, any>;
};

type Options = {
  model?: string;        // e.g. "gpt-5"
  maxClaims?: number;    // default 3
  forceFallback?: boolean; // forces ARI path
};

const OPENAI_BASE = process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1";
const OPENAI_KEY  = process.env.OPENAI_API_KEY || process.env.OPENAI_APIKEY || process.env.OPENAI || "";
const ARI_URL     = process.env.ARI_API_URL || process.env.ARI_ENDPOINT || "";

function hardCoerce(text: string): AnalyzeOut {
  const trimmed = (text || "").trim();
  const claims: Claim[] = trimmed ? [{
    text: trimmed.slice(0, 180),
    categoryMain: null, categorySubs: [], region: null, authority: null
  }] : [];
  return { language: "de", mainTopic: null, subTopics: [], regionHint: null, claims };
}

function clip<T>(arr: T[], n?: number): T[] {
  if (!Array.isArray(arr)) return [];
  if (!n || n <= 0) return arr;
  return arr.slice(0, n);
}

function scoreHintsFromText(t: string): AnalyzeOut["scoreHints"] {
  // sehr grob:
  const len = (t||"").length;
  const hasNumbers = /\d/.test(t);
  const hasEntities = /[A-ZÄÖÜ][a-zäöü]+/.test(t);
  const reasons: string[] = [];
  let base: 0.4|1.0|1.2|1.4 = 1.0;

  if (len < 40 && !hasNumbers) { base = 0.4; reasons.push("zu allgemein / sehr kurz"); }
  if (len >= 120 && (hasNumbers || hasEntities)) { base = 1.2; reasons.push("mehr Spezifität/Belege erkennbar"); }

  // Platzhalter: Systemrelevante Berufsgruppen → 1.4 (echte Prüfung später über Profile/Badges)
  if (/\b(Pflege|Pfleger|Krankenschwester|Krankenpfleger|Rettung|Feuerwehr|Lehrkraft|Arzt|Ärztin)\b/i.test(t)) {
    base = 1.4; reasons.push("systemrelevante Rolle (heuristisch erkannt)");
  }
  return { baseWeight: base, reasons };
}

async function callOpenAIResponses(prompt: string, modelHint?: string) {
  if (!OPENAI_KEY) throw new Error("OPENAI_API_KEY missing");

  const model = (modelHint || process.env.OPENAI_MODEL || "gpt-5").toString();

  const body: any = {
    model,
    input: [
      {
        role: "user",
        // Responses API verlangt "input_text"
        content: [{ type: "input_text", text: "format: json\n\n" + prompt }]
      }
    ],
    // JSON-Mode korrekt setzen – als Objekt, nicht als String
    text: { format: { type: "json_object" } },
    temperature: 0
  };

  const res = await fetch(`${OPENAI_BASE}/responses`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const data = await res.json().catch(()=> ({}));
  if (!res.ok) {
    throw new Error(`OpenAI ${res.status} – ${JSON.stringify(data)}`);
  }
  // Responses API: output_text ist oft direkt vorhanden
  const raw = data?.output_text ?? data?.output?.[0]?.content?.[0]?.text ?? "";
  return typeof raw === "string" ? raw : JSON.stringify(raw);
}

async function runGPT(text: string, maxClaims=3, modelHint?: string): Promise<AnalyzeOut> {
  // Du kannst hier optional deine prompt-Dateien einbinden;
  // minimaler, eingebetteter Prompt, robust für JSON-Mode:
  const prompt = `
Du bist ein Extraktor. Liefere ausschließlich ein JSON-Objekt:
{
  "language": "<de|en|...>",
  "mainTopic": "<string|null>",
  "subTopics": ["<string>", "..."],
  "regionHint": "<string|null>",
  "claims": [{
    "text": "<string>",
    "categoryMain": "<string|null>",
    "categorySubs": ["<string>", "..."],
    "region": "<string|null>",
    "authority": "<string|null>"
  }]
}

Regeln:
- max. ${maxClaims} Claims
- KEIN Markdown, KEIN Kommentar, NUR JSON.
- Wenn unklar: Felder null/[].
- Sprache automatisch erkennen.
Text:
"""${text.slice(0, 8000)}"""
`.trim();

  const raw = await callOpenAIResponses(prompt, modelHint);
  let parsed: any;
  try { parsed = JSON.parse(raw); } catch { parsed = null; }
  const base = parsed && typeof parsed === "object" ? parsed : hardCoerce(text);

  const out: AnalyzeOut = {
    language: base.language ?? "de",
    mainTopic: base.mainTopic ?? null,
    subTopics: Array.isArray(base.subTopics) ? base.subTopics : [],
    regionHint: base.regionHint ?? null,
    claims: clip(Array.isArray(base.claims) ? base.claims : hardCoerce(text).claims, maxClaims),
    _meta: { mode: "gpt" }
  };

  // Zusatz: Pulse (grob) & score hints
  out.pulse = { approxSources: undefined, recency: undefined }; // ARI kann das vertiefen
  out.scoreHints = scoreHintsFromText(text);
  return out;
}

async function runARI(text: string, gptError?: any, maxClaims=3): Promise<AnalyzeOut> {
  if (!ARI_URL) throw new Error("ARI_API_URL missing");
  const res = await fetch(ARI_URL, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({ task: "analyze_contribution", text, maxClaims })
  });
  const data = await res.json().catch(()=> ({}));

  // Erwartete Struktur optional – hart absichern:
  const safe = {
    language: data.language ?? "de",
    mainTopic: data.mainTopic ?? null,
    subTopics: Array.isArray(data.subTopics) ? data.subTopics : [],
    regionHint: data.regionHint ?? null,
    claims: clip(Array.isArray(data.claims) ? data.claims : hardCoerce(text).claims, maxClaims),
    pulse: data.pulse ?? undefined,
    scoreHints: data.scoreHints ?? scoreHintsFromText(text),
    _meta: { mode: "ari", gptError: gptError ? String(gptError) : undefined }
  } as AnalyzeOut;

  return safe;
}

export async function analyzeContribution(text: string, opts: Options = {}): Promise<AnalyzeOut> {
  const clean = String(text || "").trim();
  const maxClaims = (opts.maxClaims ?? 3) | 0;

  if (!clean) return hardCoerce("");

  if (opts.forceFallback) {
    // explizit ARI
    try {
      return await runARI(clean, undefined, maxClaims);
    } catch (e2) {
      const f = hardCoerce(clean);
      f._meta = { mode: "fallback", ariError: String((e2 as any)?.message || e2) };
      return f;
    }
  }

  try {
    return await runGPT(clean, maxClaims, opts.model);
  } catch (e1) {
    try {
      return await runARI(clean, e1, maxClaims);
    } catch (e2) {
      const f = hardCoerce(clean);
      f._meta = { mode: "fallback", gptError: String((e1 as any)?.message || e1), ariError: String((e2 as any)?.message || e2) };
      return f;
    }
  }
}

export default analyzeContribution;
TS

echo "✅ geschrieben: $TARGET_ANALYZE"

# 3) API-Route (fehlerfrei & ohne lose Klammern)
TARGET_ROUTE="$ROOT/apps/web/src/app/api/contributions/analyze/route.ts"
cat > "$TARGET_ROUTE" <<'TS'
// apps/web/src/app/api/contributions/analyze/route.ts
import { NextResponse } from "next/server";
import { analyzeContribution } from "../../../../../../features/analyze/analyzeContribution";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(()=> ({}));
    const { text = "", maxClaims = 3, model, forceFallback = false } = body || {};
    const result = await analyzeContribution(String(text || ""), { model, maxClaims, forceFallback: !!forceFallback });
    return NextResponse.json(result);
  } catch (e:any) {
    const msg = String(e?.message ?? e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
TS

echo "✅ geschrieben: $TARGET_ROUTE"

# 4) Aufräumen: .bak & doppelte Altdateien im src-Baum (nur Quellordner, keine node_modules)
echo "🧹 Aufräumen .bak/.BAK im apps/web/src & features"
find "$ROOT/apps/web/src" "$ROOT/features" -type f \( -name "*.bak" -o -name "*.BAK" -o -name "*.old" \) -print -delete || true

# 5) Quick-Typecheck
if command -v pnpm >/dev/null 2>&1; then
  echo "🔎 Typecheck @vog/web …"
  pnpm --filter @vog/web run typecheck || true
else
  echo "ℹ️ pnpm nicht gefunden – überspringe Typecheck."
fi

echo "✔️ Fertig. Starte dev neu und teste z.B.:
curl -sS -X POST http://127.0.0.1:3000/api/contributions/analyze \\
  -H 'content-type: application/json' \\
  -d '{\"text\":\"Kommunen fordern mehr Mittel für Katastrophenschutz in NRW.\",\"maxClaims\":3}' | jq .
"
