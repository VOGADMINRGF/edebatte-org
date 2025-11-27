#!/usr/bin/env bash
set -euo pipefail

# LEGACY_KEEP: Pipeline-Stubs aus VPM25, aktuell nicht aktiv verdrahtet.
# Dient nur als Referenz für spätere Verkabelungen.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB="$ROOT/apps/web"

say() { printf "\n\033[1;36m%s\033[0m\n" "$*"; }

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "❌ '$1' nicht gefunden. Bitte installieren."
    exit 1
  fi
}

say "🧭 Repo: $ROOT"
test -d "$WEB" || { echo "❌ $WEB nicht gefunden"; exit 1; }

say "📦 Deps prüfen"
if command -v pnpm >/dev/null 2>&1; then PM=pnpm; else PM=npm; fi
$PM add -w zod >/dev/null 2>&1 || true

say "🧠 Schreibe features/analyze/analyzeContribution.ts (robust, modell-kompatibel)"
mkdir -p "$WEB/src/features/analyze"
cat > "$WEB/src/features/analyze/analyzeContribution.ts" <<'TS'
// apps/web/src/features/analyze/analyzeContribution.ts
import "server-only";
import { z } from "zod";

const ClaimSchema = z.object({
  text: z.string().min(6).max(2000),
  categoryMain: z.string().min(2).max(80).nullable().optional(),
  categorySubs: z.array(z.string().min(2).max(80)).max(6).default([]),
  region: z.string().min(2).max(120).nullable().optional(),
  authority: z.string().min(2).max(160).nullable().optional(),
});

const AnalyzeSchema = z.object({
  language: z.string().min(2).max(5).default("de"),
  mainTopic: z.string().min(2).max(80).nullable().optional(),
  subTopics: z.array(z.string().min(2).max(80)).max(10).default([]),
  regionHint: z.string().nullable().optional(),
  claims: z.array(ClaimSchema).min(1).max(20),
});

export type AnalyzeResult = z.infer<typeof AnalyzeSchema>;

const SYS = `
Du bist ein strenger Extraktor für bürgerliche Eingaben in VoiceOpenGov (VOG).

Ziele (hart):
- MaxClaims: 8 (lieber 5–6 präzise).
- Jede claim.text = genau EINE prüfbare Aussage (keine „und/oder“-Ketten).
- 1–2 Sätze, ≤ 180 Zeichen. Keine Slogans/Fragen/Appelle.
- Keine Duplikate (normalisiert: lowercased, ohne Satzzeichen/Stopwörter).
- categoryMain MUSS ∈ DomainKanon (Tier-1). Fehlt Match → Claim verwerfen.
- categorySubs optional (max 2), nur ∈ TopicKanon (Tier-2).
- region/authority NUR bei klarer Salienz (siehe Regel), sonst null.

DomainKanon (Tier-1, exakt benutzen):
"Verfassung & Grundrechte","Demokratie & Beteiligung","Wahlen & Parteienrecht",
"Parlamente & Verfahren","Föderalismus & Kommunen","Öffentliche Verwaltung & E-Gov",
"Transparenz & Antikorruption","Innere Sicherheit & Polizei","Justiz & Rechtsstaat",
"Außenpolitik & Diplomatie","EU-Politik","Entwicklung & Humanitäres",
"Wirtschaftspolitik","Finanzen & Steuern","Arbeit & Beschäftigung","Soziales & Grundsicherung",
"Rente & Alterssicherung","Gesundheitspolitik","Pflege","Bildung","Hochschule & Forschung",
"Digitalisierung & Netzpolitik","Datenschutz & IT-Sicherheit","Familie & Gleichstellung",
"Kinder & Jugend","Migration & Integration","Wohnen & Stadtentwicklung",
"Verkehr & Infrastruktur","Energiepolitik","Klima & Umweltschutz",
"Landwirtschaft","Verbraucherschutz","Tierschutz & Tierhaltung",
"Kultur, Medien & Sport","Handel & Außenwirtschaft","Regionalentwicklung & Ländlicher Raum",
"Bau & Planungsrecht","Kommunalpolitik","Verteidigung & Bundeswehr"

TopicKanon (Tier-2 – Auswahl, erweiterbar):
"Primärversorgung","KV","Krankenhausplanung","GVSG","Notfallversorgung","Pflegepersonal",
"Haltungsstufen","Produktsicherheit","Tiertransporte","Lieferketten","Compliance","Rückverfolgbarkeit",
"Open Data","KI-Governance","DSGVO","Plattformaufsicht/DSA","Desinformation",
"Kommunalfinanzen","Bauordnung","Wärmeplanung kommunal","Deutschlandticket",
"Erneuerbare","Wasserstoff","CO₂-Bepreisung","Kreislaufwirtschaft","Smart City", "Krisenvorsorge"
(weitere zulässig).

Zusatz-Attribute (nur wenn klar – ansonsten weglassen):
- claimType ∈ {"Fakt","Forderung","Prognose","Wertung"}
- policyInstrument ∈ {"Steuer/Abgabe","Subvention/Förderung","Verbot/Limit","Erlaubnis/Ausnahme","Transparenz/Reporting","Investition","Organisation/Prozess","Standard/Norm"}
- ballotDimension ∈ {"Budget","Gesetz/Regel","Personal/Organisation","Infrastruktur","Symbol/Resolution"}

Salienzregel für region/authority: setze nur, wenn ≥2 Signale (Ort/Institution/Ereignis/Zeit-Ort).

Qualitäts-Gate je Claim:
1) Kernaussage-Verb (ist/erhöht/senkt/verbietet/erlaubt/führt zu/fordert).
2) ≤ 180 Zeichen. 3) Kein „und/oder“. 4) categoryMain ∈ DomainKanon.
5) Keine Duplikate. 6) Keine reinen Stimmungswörter.

Ausgabe: JSON mit language, mainTopic, subTopics, regionHint, claims[].
Leeres Array, wenn keine validen Claims.
`;

function jsonSchemaForOpenAI() {
  // Chat Completions: erzwingt ein JSON-Objekt als Antwort
  return { type: "json_object" as const };
}

export async function analyzeContribution(text: string): Promise<AnalyzeResult> {
  const model = process.env.OPENAI_MODEL || "gpt-5";
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");

  const user = (text || "").slice(0, 8000);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYS },
        { role: "user", content: user },
      ],
      // Wichtig: KEIN temperature/top_p schicken (manche Modelle erlauben nur Defaults)
      response_format: jsonSchemaForOpenAI(),
    }),
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`OpenAI ${res.status}${raw ? ` – ${raw}` : ""}`);
  }

  // content herausziehen (Gateway kann content-String liefern)
  let content: unknown;
  try {
    const full = JSON.parse(raw);
    content = full?.choices?.[0]?.message?.content ?? "{}";
  } catch {
    content = raw;
  }

  // robustes JSON-Parse
  let parsed: unknown = content;
  if (typeof content === "string") {
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = null;
    }
  }

  let out: AnalyzeResult;
  const safe = AnalyzeSchema.safeParse(parsed);
  if (safe.success) {
    out = safe.data;
  } else {
    // weicher Fallback: 1 Claim mit Rohtext (damit UI nicht leer ist)
    out = {
      language: "de",
      mainTopic: null,
      subTopics: [],
      regionHint: null,
      claims: [
        { text: user, categoryMain: null, categorySubs: [], region: null, authority: null },
      ],
    };
  }

  // Normalisieren + Trimmen + Deduplizieren
  out.language = (out.language || "de").slice(0, 5);
  out.mainTopic ??= null;
  out.regionHint ??= null;
  out.subTopics ??= [];

  const seen = new Set<string>();
  out.claims = (out.claims || [])
    .map(c => ({
      text: (c.text || "").trim().replace(/\s+/g, " ").slice(0, 240),
      categoryMain: c.categoryMain ?? null,
      categorySubs: c.categorySubs ?? [],
      region: c.region ?? null,
      authority: c.authority ?? null,
    }))
    .filter(c => {
      if (!c.text) return false;
      const k = `${c.text}|${c.categoryMain ?? ""}`.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

  if (out.claims.length === 0) {
    out.claims = [{ text: user, categoryMain: null, categorySubs: [], region: null, authority: null }];
  }

  return out;
}
TS

say "🛠  API: /api/contributions/analyze"
mkdir -p "$WEB/src/app/api/contributions/analyze"
cat > "$WEB/src/app/api/contributions/analyze/route.ts" <<'TS'
import { NextResponse } from "next/server";
import { analyzeContribution } from "@/features/analyze/analyzeContribution";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ ok: false, error: "text_required" }, { status: 400 });
    }
    const result = await analyzeContribution(text);
    return NextResponse.json({ ok: true, data: result }, { status: 200 });
  } catch (err: any) {
    const msg = err?.message || "analyze_failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
TS

say "🛠  (Optional) API: /api/contributions/ingest – nimmt result entgegen (Stub)"
mkdir -p "$WEB/src/app/api/contributions/ingest"
cat > "$WEB/src/app/api/contributions/ingest/route.ts" <<'TS'
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Erwartet: { text: string, analysis: any }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body?.text || !body?.analysis) {
      return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
    }
    // TODO: hier in DB speichern + optional Factcheck-Queue anwerfen
    return NextResponse.json({ ok: true, saved: true }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "ingest_failed" }, { status: 500 });
  }
}
TS

say "🖥️  Review-UI: /contributions/analyze mit Ladezustand & Claim-Liste"
mkdir -p "$WEB/src/app/contributions/analyze"
cat > "$WEB/src/app/contributions/analyze/page.tsx" <<'TS'
"use client";
import { useState } from "react";

type Claim = {
  text: string;
  categoryMain: string | null;
  categorySubs: string[];
  region: string | null;
  authority: string | null;
};

type Analysis = {
  language: string;
  mainTopic: string | null;
  subTopics: string[];
  regionHint: string | null;
  claims: Claim[];
};

export default function AnalyzePage() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  async function run() {
    setError(null);
    setAnalysis(null);
    setLoading(true);
    try {
      const r = await fetch("/api/contributions/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "unexpected");
      setAnalysis(j.data);
    } catch (e: any) {
      setError(e?.message || "Unerwartete Antwort");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 1000, margin: "24px auto", padding: 16 }}>
      <a href="/" style={{ fontWeight: 700 }}>VoiceOpenGov</a>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Dein Text…"
        rows={10}
        style={{ width: "100%", marginTop: 12 }}
      />
      <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={run} disabled={loading || !text.trim()}>
          {loading ? "Analysiere …" : "Analysieren"}
        </button>
        {loading && <span style={{ fontStyle: "italic" }}>Bitte warten…</span>}
      </div>

      {error && <p style={{ color: "#b00020", marginTop: 12 }}>✖ {error}</p>}

      {analysis && (
        <section style={{ marginTop: 24 }}>
          <div style={{ marginBottom: 12 }}>
            <strong>Sprache:</strong> {analysis.language ?? "—"} •{" "}
            <strong>Hauptthema:</strong> {analysis.mainTopic ?? "—"} •{" "}
            <strong>Subthemen:</strong> {analysis.subTopics?.join(", ") || "—"} •{" "}
            <strong>Region-Hinweis:</strong> {analysis.regionHint ?? "—"}
          </div>

          {analysis.claims?.map((c, i) => (
            <div key={i} style={{ border: "1px solid #ddd", padding: 12, marginBottom: 8 }}>
              <div style={{ fontWeight: 700 }}>Aussage {i + 1}</div>
              <div style={{ marginTop: 4 }}>{c.text}</div>
              <div style={{ fontSize: 13, opacity: 0.8, marginTop: 6 }}>
                <strong>Thema:</strong> {c.categoryMain ?? "—"}
                {c.categorySubs?.length ? <> • <strong>Sub:</strong> {c.categorySubs.join(", ")}</> : null}
                {" • "}<strong>Region:</strong> {c.region ?? "—"}
                {" • "}<strong>Amt:</strong> {c.authority ?? "—"}
              </div>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
TS

say "✅ Fertig. Hinweise:"
cat <<'NOTE'

2) Dev neu starten:
   cd apps/web
   pnpm dev

3) Test:
   http://localhost:3000/contributions/analyze
   – Text einfügen, 'Analysieren' klicken (Button zeigt 'Analysiere …').

4) Optionaler nächster Schritt:
   - In /api/contributions/ingest die Speicherung + Factcheck-Queue einhängen
     (du hast bereits /api/factcheck/* Endpunkte – hier einfach aufrufen).

NOTE
