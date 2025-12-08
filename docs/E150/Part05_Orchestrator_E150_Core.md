# E150 Master Spec – Part 5: Orchestrator E150 (Core)

## 1. Zweck dieses Parts

Part 05 beschreibt den **E150-Orchestrator** als technisches Herzstück der Analyse:

- wie mehrere KI-Provider parallel genutzt werden,
- wie ihre Antworten normalisiert, geprüft und zusammengeführt werden,
- wie Fallbacks funktionieren, wenn Modelle Mist bauen,
- wie Telemetrie & Healthchecks eingebunden sind,
- wie alles an `analyzeContribution()` und die API `/api/contributions/analyze` andockt.

Ziel:  
**Eine robuste, erweiterbare, mehrsprachige Analyse-Pipeline**,  
die _immer_ ein valides `AnalyzeResult` liefert und exakt den E150-Regeln folgt.

---

## 2. Überblick: Orchestrator-Architektur

### 2.1 Grundidee

Der Orchestrator E150 hat genau eine zentrale Aufgabe:

> Aus einem Texteingang (`text`, `locale`, `maxClaims`) eine strukturierte  
> `AnalyzeResult`-Struktur machen (Claims, Notes, Questions, Knots, …) –  
> basierend auf mehreren KI-Providern.

Dazu:

1. Er kennt eine Liste konfigurierter **Provider-Profile** (OpenAI, Anthropic, Mistral, Gemini, You, …).
2. Er ruft mehrere davon **parallel** auf.
3. Er validiert jede Antwort gegen das **E150-Analyse-Schema**.
4. Er bewertet die Ergebnisse (Scoring).
5. Er bestimmt einen **Best-Kandidaten**.
6. Er gibt neben dem Best-Kandidaten optional ein **Kandidaten-Set** zurück (für Debug/Admin).

### 2.2 High-Level-Datenfluss

1. UI (z.B. `/contributions/new`) ruft:  
   `/api/contributions/analyze` (JSON oder SSE)
2. Route ruft:  
   `analyzeContribution({ text, locale, maxClaims })`
3. `analyzeContribution` ruft:  
   `orchestrateAnalyzeE150({ text, locale, maxClaims })`
4. Orchestrator:
   - baut Provider-Prompts,
   - ruft Anbieter parallel,
   - normalisiert & validated,
   - scored Kandidaten.
5. `analyzeContribution`:
   - wählt bestes Ergebnis,
   - sorgt für Fallbacks (min. 1 Claim),
   - gibt `AnalyzeResult` zurück.
6. API:
   - JSON: `{ ok: true, result }`
   - SSE: `progress` + `result` + `error`

---

## 3. Zentrale Typen (Zielbild)

### 3.1 AnalyzeInput & AnalyzeResult (vereinfachte Darstellung)

Diese Typen existieren in ähnlicher Form bereits in `@features/analyze/schemas`  
und im TS-Briefing. Codex soll daran anschließen.

```ts
type LanguageCode = "de" | "en" | string;

type AnalyzeInput = {
  text: string;
  locale?: LanguageCode;
  maxClaims?: number; // üblicherweise 20
};

type StatementRecord = {
  id: string;
  index: number;
  text: string;
  responsibility?: string;
  topic?: string;
  quality?: {
    precision: number;   // 0–1 oder 0–100, aber einheitlich in Schema
    testability: number;
    readability: number;
  };
};

type NoteRecord = {
  id: string;
  title: string;
  body: string;
};

type QuestionRecord = {
  id: string;
  label: string;
  category: string;
  body: string;
};

type KnotRecord = {
  id: string;
  title: string;
  category: string;
  body: string;
};

type AnalyzeResult = {
  mode: "E150";
  sourceText: string;
  language: LanguageCode;
  claims: StatementRecord[];
  notes: NoteRecord[];
  questions: QuestionRecord[];
  knots: KnotRecord[];
  // spätere Erweiterungen (Eventualitäten, Consequences etc.) in Part06/Part08
};
3.2 Orchestrator-spezifische Typen
ts
Code kopieren
type AiProviderId = "openai" | "anthropic" | "mistral" | "gemini" | "you" | string;

type ProviderRole =
  | "structure"   // stark in Claims
  | "context"     // stark in Notes
  | "questions"   // stark in Questions
  | "knots"       // stark in Knots
  | "mixed";      // Allrounder

type ProviderProfile = {
  id: AiProviderId;
  role: ProviderRole;
  baseWeight: number;      // Grundgewicht, z.B. 1.0
  langBias?: LanguageCode[];
  timeoutMs?: number;      // Provider-spezifisches Timeout
  maxTokens?: number;      // Sicherheitslimit
};

type AnalyzeCandidate = {
  providerId: AiProviderId;
  profile: ProviderProfile;
  raw: unknown;                 // original Provider-Response
  normalized: AnalyzeResult | null;
  score: number;                // Score 0–1 oder 0–100
  errors?: string[];            // Validation / Normalization / Timeout
};

type OrchestrateAnalyzeResult = {
  input: AnalyzeInput;
  candidates: AnalyzeCandidate[];
  best: AnalyzeCandidate | null;
};
4. Provider-Config & Health
4.1 Provider-Konfiguration
Provider werden zentral konfiguriert, z.B. in:

features/ai/config/providers.ts (oder ähnlich)

Beispiel:

ts
Code kopieren
const PROVIDERS: ProviderProfile[] = [
  {
    id: "openai",
    role: "mixed",
    baseWeight: 1.0,
    langBias: ["de", "en"],
    timeoutMs: 140_000,
  },
  {
    id: "anthropic",
    role: "structure",
    baseWeight: 1.1,
    langBias: ["en", "de"],
    timeoutMs: 140_000,
  },
  {
    id: "mistral",
    role: "questions",
    baseWeight: 0.9,
    langBias: ["de"],
    timeoutMs: 120_000,
  },
  // ...
];
Regeln:

Kein Provider darf ein Hard Single Point of Failure sein.

Provider können temporär deaktiviert werden (Health-Status, Circuit-Breaker).

locale-spezifische Gewichtung über langBias.

4.2 Health & Circuit-Breaker
Über features/ai/telemetry.ts und features/ai/orchestratorE150.ts
wird ein Health-Status pro Provider geführt:

Erfolgsquote,

Fehlerrate (z.B. JSON-Fehler),

Latenzen (p50, p95),

Zustand: open | half_open | closed

Orchestrator nutzt den Health-Status zur Provider-Auswahl & Score-Berechnung.

5. Prompting & Normalisierung
5.1 Prompt-Struktur (Konzept)
Alle Provider erhalten semantisch ähnliche Prompts:

Input-Text (oder verkürzt, falls lang),

Schema-Beschreibung (E150: Claims, Notes, Questions, Knots),

klare Instruktion:

nicht interpretieren,

keine Empfehlungen,

nur Strukturierung und kritische Fragen.

Codex:

soll für alle Provider eine Adapter-Schicht bauen,

Prompt-Details pro Provider in eigener Datei halten
(z.B. provider_openai.ts, provider_anthropic.ts).

5.2 JSON-Normalisierung
Die Provider schicken „lockere“ JSON-Strukturen, z.B.:

json
Code kopieren
{
  "mode": "E150",
  "language": "de",
  "claims": [...],
  "notes": [...],
  "questions": [...],
  "knots": [...]
}
Adapter-Schicht:

validiert das JSON gegen AnalyzeResultSchema,

konvertiert Typen (z.B. Strings → Zahlen),

repariert einfache Fehler (z.B. fehlende mode → "E150"),

bei schweren Fehlern: normalized = null, errors.push("Invalid JSON").

6. Scoring & Aggregation
6.1 Score-Komponenten
Der Score eines Kandidaten entsteht aus:

baseWeight (vorgesehene Stärke des Providers),

healthScore (0–1, basierend auf Telemetrie),

fitScore (z.B. wie gut maxClaims eingehalten sind, wie konsistent das Schema ist),

qualityScore (simple Heuristiken, z.B. Anzahl Claims > 0, keine leeren Felder).

Beispiel:

ts
Code kopieren
score = baseWeight * healthScore * fitScore * qualityScore;
6.2 Best-Kandidat
Regeln:

nur Kandidaten mit normalized != null können „best“ werden,

der Kandidat mit höchstem Score wird als best gewählt,

falls alle normalized == null:
→ best = null → Fallback auf buildFallbackClaim() in analyzeContribution().

7. Fehler- & Fallback-Strategien
7.1 Arten von Fehlern
Timeout (Provider antwortet nicht rechtzeitig),

HTTP-Fehler,

JSON-Parse-Fehler,

Schema-Validierung schlägt fehl,

logische Fehler (z.B. claims == []).

Jeder Fehler wird:

im Candidate als errors vermerkt,

im Telemetry-Modul registriert,

ggf. im Logger (PII-censiert) protokolliert.

7.2 Fallback bei fehlendem Best-Kandidaten
Wenn best === null oder best.normalized === null:

Orchestrator gibt Kandidaten zurück (für Admin-Analyse),

analyzeContribution():

ruft buildFallbackClaim(text, locale) auf,

baut ein AnalyzeResult mit genau einem Claim,

leere Arrays für Notes, Questions, Knots.

7.3 Fallback bei unvollständigen Feldern
analyzeContribution() soll:

wenn result.claims leer ist → Fallback-Claim,

wenn result.notes leer ist → ggf. deriveContextNotes(result) (oder leeres Array, je nach aktuellem E150-Stand),

wenn result.questions leer ist → deriveCriticalQuestions(result) oder leer,

wenn result.knots leer ist → deriveKnots(result) oder leer.

Hinweis:
Der aktuelle Stand setzt stärker auf „keine zusätzliche Heuristik“ – d.h. derive*() geben meist einfach result.* zurück, wenn vorhanden.
Part06/Part08 können später neue Logiken einführen.

8. Integration mit analyzeContribution & API
8.1 analyzeContribution()
analyzeContribution() ist der Hauptadapter für die App:

ts
Code kopieren
async function analyzeContribution(input: AnalyzeInput): Promise<AnalyzeResult> {
  const { text, locale = "de", maxClaims = 20 } = input;

  const orchestration = await orchestrateAnalyzeE150({ text, locale, maxClaims });
  const best = orchestration.best;
  const raw = best?.normalized ?? null;

  const claimsRaw = Array.isArray(raw?.claims) ? raw!.claims : [];
  const claims = claimsRaw as StatementRecord[];

  const claimsFinal = claims.length > 0 ? claims : [buildFallbackClaim(text, locale)];

  const notes = Array.isArray(raw?.notes) ? raw!.notes : [];
  const questions = Array.isArray(raw?.questions) ? raw!.questions : [];
  const knots = Array.isArray(raw?.knots) ? raw!.knots : [];

  const result: AnalyzeResult = {
    mode: "E150",
    sourceText: raw?.sourceText ?? text,
    language: raw?.language ?? locale,
    claims: claimsFinal,
    notes,
    questions,
    knots,
  };

  // Schema-Validation (z.B. AnalyzeResultSchema.parse)
  // Bei Fehlern: Fallback-Struktur erneut bauen und loggen.

  return result;
}
8.2 API /api/contributions/analyze
Bereits vorhanden in:

apps/web/src/app/api/contributions/analyze/route.ts

Anforderungen:

runtime = "nodejs"

dynamic = "force-dynamic"

JSON + SSE-Unterstützung

JSON-Mode:

Request-Body:

json
Code kopieren
{ "text": "…", "locale": "de", "maxClaims": 20 }
Response:

json
Code kopieren
{ "ok": true, "result": AnalyzeResult }
SSE-Mode:

Accept: text/event-stream oder body.stream === true

Events:

progress (z.B. { stage: "analyzing", pct: 35 })

result ({ result: AnalyzeResult })

error ({ reason: string })

Orchestrator wird im SSE-Modus ganz normal aufgerufen;
nur die UI erhält Zwischenstände.

8.3 Smoketests Orchestrator & Swipe

- `pnpm smoke:analyze`
  - Test 1: `POST /api/contributions/analyze` mit `{ test: "ping" }` – erwartet `{ ok: true, result: { ping: "pong" } }`.
  - Test 2: ungültige Eingabe (leer) → `400` plus `errorCode` `BAD_INPUT` (oder `INVALID_JSON`).
  - Optional (`E150_SMOKE_FULL=1`): realer Analyzer-Call mit Beispieltext; meldet Claim-Anzahl oder degradierte Fehlercodes (`NO_ANALYZE_PROVIDER`, `MISSING_ENV`, …).

- `pnpm smoke:swipe`
  - Prüft `GET /api/swipeStatements` auf Erreichbarkeit und gültiges JSON.
  - Gibt nur eine Info aus, wenn der Feed leer ist; HTTP- oder JSON-Fehler → Exit-Code 1.

9. Telemetrie & Admin-Dashboards
9.1 Telemetrie-Ziele
Über features/ai/telemetry.ts und die Admin-API /api/admin/telemetry/ai/events:

Fehlerquellen identifizieren,

Latenzen pro Provider sehen,

Schema-Fehlerquoten beobachten,

Fallback-Häufigkeit überwachen.

9.2 Datenpunkte
ProviderId

Dauer (ms)

Erfolg/Fehler

Grund des Fehlers (Timeout, JSON, Schema)

Anzahl Claims, Notes, Questions, Knots im Ergebnis

ob Fallback genutzt wurde

9.3 Dashboards
/admin/telemetry/ai/dashboard zeigt:

Graphen pro Provider,

Erfolgskurven,

Fallback-Heatmap,

zuletzt fehlerhafte Calls (ohne PII).

10. Sicherheit & PII im Orchestrator
10.1 Keine PII an Provider
Vor dem Senden an KI-Provider:

keine E-Mail, Telefonnummer, IBAN,

kein vollständiger Name + Adresse,

idealerweise: Personen in Texten anonymisieren oder generisch halten (z.B. „Bürgermeister“ statt „Max Mustermann“), wo möglich.

10.2 Logging über Redaction
Alle Logs aus dem Orchestrator:

laufen über core/observability/logger.ts und apps/web/src/utils/logger.ts,

PII werden über core/pii/redact.ts maskiert,

es werden nie Roh-Prompts mit Klarnamen in Logs geschrieben.

11. Konfigurierbarkeit & Erweiterbarkeit
11.1 Konfigurierbare Parameter
Provider-Liste & Profile

maxClaims (Default: 20)

Timeouts pro Provider

Scoring-Gewichte

Telemetrie-Schwellen für Circuit-Breaker

Alles in zentralen Config-Files, nicht verteilt über den Code.

11.2 Erweiterungen (E200+)
Später:

Ensemble-Logik mit Claim-Merging (Provider kombinieren),

linguistische Qualitätschecks,

direkte Graph-Anbindung (Claims automatisch in Knoten umwandeln),

per-User „Language Preference“ & Locale-Kaskaden.

12. Anforderungen an Codex (Part 5)
Codex MUSS:

orchestrateAnalyzeE150() als zentrale Orchestrator-Funktion implementieren und pflegen.

Provider-Profile und -Config strikt trennen (keine Hardcodierung in der Orchestrator-Logik).

die Adapter-Schicht pro Provider so bauen, dass alle Ergebnisse in AnalyzeResult landen.

Schema-Validierung konsequent nutzen, um fehlerhafte Antworten auszufiltern.

Fallback-Mechanismen robust implementieren (mindestens 1 Claim).

Telemetrie-Hooks einbauen, damit das Admin-Dashboard aussagekräftig ist.

PII-Schutz (Part00) konsequent beachten – kein Leak in Logs oder Provider-Calls.

SSE-Integration nicht brechen (Progress-Events müssen verlässlich ablaufen).

keine „Quick Hacks“ einbauen, die E150 zu „nur Claims“ reduzieren.

den Orchestrator so strukturieren, dass später E200/E500-Erweiterungen möglich sind, ohne alles neu zu schreiben.

Part05 ist damit der technische Kern von E150.
Part06 (Consequences & Fairness) und Part08 (Eventualitäten & Konsens) bauen darauf auf, um die Analyse nicht nur strukturiert, sondern auch gesellschaftlich klug auswertbar zu machen.

Membership-/Haushaltsfluss (Kurz):
- Wizard (/mitglied-werden → /mitglied-antrag) erzeugt MembershipApplication (Order) mit PaymentInfo (bank_transfer) und optionaler eDebatte-Vorbestellung; user.membership-Snapshot spiegelt Status/Rhythmus/Household/PaymentInfo.
- Admin-Aktionen: mark-paid → active; cancel → household_locked; Dunning-Script (Reminder 1/2/final) nutzt firstDueAt/dunningLevel.
- /account zeigt Status-Badge + Zahlungsinfos; kein PII-Leak (IBAN nur masked).
