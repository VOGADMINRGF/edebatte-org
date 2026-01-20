/**
 * Zusätzliche Spezifikation (Markdown-Dokumente, NICHT importieren):
 *
 *  - docs/E150/Part00_Foundations_PII_Security.md
 *  - docs/E150/Part01_Systemvision_Mission_Governance.md
 *  - docs/E150/Part02_Roles_Levels_XP_Gamification.md
 *  - docs/E150/Part03_AccessTiers_Pricing_B2C.md
 *  - docs/E150/Part04_B2G_B2B_Models.md
 *  - docs/E150/Part05_Orchestrator_E150_Core.md
 *  - docs/E150/Part06_Consequences_Fairness.md
 *  - docs/E150/Part07_Graph_Reports_StructuredKnowledge.md
 *  - docs/E150/Part08_Eventualities_DecisionTrees.md
 *  - docs/E150/Part09_KnowledgeGraph.md
 *  - docs/E150/Part10_Community_Research_Workflow.md
 *  - docs/E150/Part11_Streams_Brennende_Buerger.md
 *  - docs/E150/Part12_Campaigns_Admin_Telemetry.md
 *  - docs/E150/Part13_I18N_A11y_Community_Social.md
 *
 * WICHTIG:
 * - Codex soll diese Dateien als konzeptionelle Referenz lesen,
 *   aber KEINEN Code daraus generieren oder importieren.
 * - Diese Datei (e150_master_codex_briefing.ts) bleibt der operative
 *   Leitfaden mit Kurzfassung, zentralen Typen und Do/Don'ts.
 */

/**

* eDebatte / eDebatte
 * E150 – Master-Briefing für Codex (VS Code)
 *
 * Zweck dieser Datei
 * ------------------
 * - SINGLE SOURCE OF TRUTH für:
 *   - E150-Standard als Gesamtlogik („was bedeutet E150 eigentlich konkret?“)
 *   - Contribution-AI (manuelle Eingaben /contributions/new)
 *   - Feeds → Statements → Vote (News-Pipeline, Batch-API)
 *   - Multi-Provider-KI-Orchestrator (parallel, gewichtet, spezialisiert)
 *   - Anforderungen an UI & API-Endpunkte
 *
 * - Codex soll:
 *   1. Diese Datei als Kontext lesen.
 *   2. Darauf basierend Code ergänzen/refaktorieren.
 *   3. Die beschriebenen Prinzipien NICHT brechen.
 *
 * WICHTIG:
 * - Diese Datei ist DOKU & Instruktion, KEIN produktiver Runtime-Code.
 * - Sie darf NICHT in app- oder feature-Code importiert werden.
 */

export {}; // damit TypeScript sie als Modul behandelt

/* ============================================================================
 * 0. Kurzdefinition E150 – in der Logik & Gesamtheit
 * ==========================================================================*/

/**
 * E150 – Kernidee
 * ---------------
 * E150 ist der minimale, aber belastbare Qualitäts-Standard für alles, was wir
 * aus Texten machen – egal ob:
 *   - manuelle Beiträge (Contributions),
 *   - automatisierte News/Feeds (RSS/Atom),
 *   - spätere Reports und Abstimmungen.
 *
 * E150 bedeutet:
 *   - E150.1: Jeder Text wird in atomare, prüfbare Statements zerlegt.
 *   - E150.2: Zu jedem Text existiert ein strukturiertes AnalyzeResult
 *             (Claims + Kontext + Fragen + Knoten).
 *   - E150.3: Alle KI-Outputs laufen durch eine Normalisierungs-/Adapter-Schicht
 *             und werden gegen ein strenges Schema geprüft.
 *   - E150.4: Der KI-Orchestrator nutzt mehrere Modelle PARALLEL und
 *             aggregiert sie zu einem robusten Ergebnis.
 *   - E150.5: Die Systemlogik ist transparent, nachvollziehbar und später
 *             erweiterbar (E200, E500 …).
 *   - E150.6: Keine Abstimmungsempfehlung – nur Strukturierung, Kontext,
 *             kritische Fragen und Konflikt-Knoten.
 */


/* ============================================================================
 * 1. Globale Datenmodelle E150 (vereinfacht)
 * ==========================================================================*/

/**
 * Zentrale Typen (vereinfachtes Zielbild)
 * ---------------------------------------
 * Diese Typen existieren in ähnlicher Form bereits in @features/analyze/schemas
 * und @features/reports/types. Codex soll daran anschließen, nicht wild neue
 * erfinden.
 */

type LanguageCode = "de" | "en" | string;

type StatementRecord = {
  id: string;
  index: number;
  text: string;
  responsibility?: string;
  topic?: string;
  quality?: {
    precision: number;   // 0–1 oder 0–100
    testability: number;
    readability: number;
  };
};

type NoteSection = {
  id: string;
  title: string;
  body: string;
};

type QuestionCard = {
  id: string;
  label: string;
  category: string;
  body: string;
};

type KnotCard = {
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
  notes: NoteSection[];
  questions: QuestionCard[];
  knots: KnotCard[];
};


/* ============================================================================
 * 2. KI-Orchestrator – parallel, gewichtet, spezialisiert
 * ==========================================================================*/

/**
 * Ziel: orchestrateAnalyzeE150()
 * ------------------------------
 * - Eine zentrale Funktion, die MEHRERE Provider parallel nutzt, z.B.:
 *   - OpenAI, Anthropic, Mistral, Gemini, You.com ARI …
 * - Liefert IMMER genau EIN Aggregat:
 *   -> ein `AnalyzeResult` im E150-Standard.
 */

type AiProviderId = "openai" | "anthropic" | "mistral" | "gemini" | "you" | string;

type ProviderRole =
  | "structure"  // stark in Strukturierung / Claims
  | "context"    // stark in Kontext / Notes
  | "questions"  // stark in kritischen Fragen
  | "knots"      // stark in Konflikten / Widersprüchen
  | "mixed";     // allround

type ProviderProfile = {
  id: AiProviderId;
  role: ProviderRole;
  baseWeight: number;     // Grundgewicht, z.B. 1.0
  langBias?: LanguageCode[];
  timeoutMs?: number;
  maxTokens?: number;
};

type AnalyzeInput = {
  text: string;
  locale?: LanguageCode;
  maxClaims?: number;
};

type AnalyzeCandidate = {
  providerId: AiProviderId;
  profile: ProviderProfile;
  raw: any;
  normalized: AnalyzeResult | null;
  score: number; // aus Health + Fit + evtl. heuristischer Qualitätsbewertung
};

type OrchestrateAnalyzeResult = {
  candidates: AnalyzeCandidate[];
  best: AnalyzeCandidate | null;
};

//
// Signatur, an der Codex sich orientieren soll:
//

async function orchestrateAnalyzeE150(
  input: AnalyzeInput
): Promise<OrchestrateAnalyzeResult> {
  // HINWEIS AN CODEX:
  // - Implementierung gehört NICHT in diese Datei, sondern z.B. nach:
  //   @features/ai/orchestratorE150.ts
  // - Provider sollen parallel aufgerufen werden (Promise.all / race + Timeout).
  // - Jeder Provider liefert ein „lockeres“ JSON, das dann
  //   über die Adapter-Schicht in AnalyzeResult gegossen wird.
  // - Die resultierenden AnalyzeCandidate-Objekte werden nach `score` gerankt.
  // - Der beste Kandidat (best) wird im Normalfall genutzt.
  throw new Error("Nur Instruktion – hier NICHT implementieren.");
}


/* ============================================================================
 * 3. Adapter / Normalisierung – analyzeContribution()
 * ==========================================================================*/

/**
 * analyzeContribution()
 * ---------------------
 * - Nimmt Roh-Text von Nutzer:innen entgegen.
 * - Ruft orchestrateAnalyzeE150() auf.
 * - Sorgt dafür, dass IMMER ein valides AnalyzeResult zurückkommt.
 * - Claims-Fallback: Notfalls genau 1 Fallback-Claim.
 *
 * Datei-Vorschlag:
 *   - @features/analyze/analyzeContribution.ts
 */

async function analyzeContribution(input: AnalyzeInput): Promise<AnalyzeResult> {
  const { text, locale = "de", maxClaims = 20 } = input;

  const orchestration = await orchestrateAnalyzeE150({
    text,
    locale,
    maxClaims,
  });

  const best = orchestration.best;
  const raw = best?.normalized ?? null;

  // Fallback Claims
  const claimsRaw: any[] = Array.isArray(raw?.claims) ? raw!.claims : [];
  const claims: StatementRecord[] = claimsRaw as StatementRecord[];

  const claimsFinal =
    claims.length > 0 ? claims : [buildFallbackClaim(text, locale)];

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

  // HINWEIS AN CODEX:
  // - In der echten Datei AnalyzeResultSchema.parse/safeParse nutzen.
  // - Bei Schema-Fehlern Fallback-Struktur bilden (min. 1 Claim).
  return result;
}

/**
 * buildFallbackClaim()
 * --------------------
 * - Heuristische Erzeugung eines Claims, falls Modell versagt.
 * - Steht schon in anderen Files – Codex soll die bestehende Variante nutzen.
 */
function buildFallbackClaim(text: string, locale: LanguageCode): StatementRecord {
  return {
    id: "fallback-claim",
    index: 0,
    text: text.trim(),
  };
}


/* ============================================================================
 * 4. Contribution-AI – /contributions/new + API /contributions/analyze
 * ==========================================================================*/

/**
 * API: /api/contributions/analyze
 * -------------------------------
 * Datei:
 *   - apps/web/src/app/api/contributions/analyze/route.ts
 *
 * Anforderungen:
 *   - runtime = "nodejs"
 *   - dynamic = "force-dynamic"
 *   - MAX_CLAIMS = 20
 *
 * Request-Body:
 *   { text: string; locale?: string; stream?: boolean }
 *
 * Modus 1 – JSON:
 *   - Wenn KEIN SSE angefragt:
 *     -> `{ ok: true, result: AnalyzeResult }` oder `{ ok: false, error: string }`
 *
 * Modus 2 – SSE (Fast-Max):
 *   - Wenn Accept: text/event-stream ODER body.stream === true:
 *     - `event: progress`   data: { stage, pct }
 *     - `event: result`     data: { result: AnalyzeResult }
 *     - `event: error`      data: { reason }
 *
 * Implementierung:
 *   - nutzt analyzeContribution() intern.
 *   - ruft optional deriveContextNotes / deriveCriticalQuestions / deriveKnots,
 *     wenn diese nicht schon von der KI befüllt wurden.
 */


/**
 * Frontend: /contributions/new
 * ----------------------------
 * Datei:
 *   - apps/web/src/app/contributions/new/page.tsx
 *
 * Ziele:
 *   - Textfeld (mit DEFAULT_TEXT als Beispiel).
 *   - Button „Analysieren“ → startet SSE-Analyse.
 *   - Live-Feedback via Textmarker-Animation:
 *     - CSS-Klasse `.marker-mask` mit `--marker-pct`.
 *   - Darstellung der Ergebnisse:
 *     - StatementCards (Claims)
 *     - Notes / Questions / Knots
 *   - ViewMode: "level1" | "level2"
 *
 * ViewMode:
 *   - level1: Komfort-Ansicht, weniger Overload:
 *       - Claims + reduzierte Auswahl an Notizen/Fragen/Knoten.
 *   - level2: Mehr Fakten:
 *       - ALLE Notes/Questions/Knots sichtbar, ggf. mehr Meta-Daten.
 *
 * WICHTIG:
 *   - Level 2 darf NICHT „leer“ sein – es ist die detailliertere Ansicht.
 *   - Keine erneuten Claims-Rückfrage-Dialoge einbauen (wurden bewusst entfernt).
 *
 * Layout Desktop:
 *   - Mitte: Textfeld mit Marker-Overlay.
 *   - Links: Notes/Context (NoteSection-Cards).
 *   - Rechts: Questions + Knots.
 *   - Unten: StatementCards + Mini-Zusammenfassung („X Claims, Y Fragen, Z Knoten“).
 *
 * Layout Mobile:
 *   - Fokus auf Textfeld + StatementCards.
 *   - Notes/Questions/Knots als Chips/Akkordeons reduziert („Kontext (3)“ etc.).
 */


/* ============================================================================
 * 5. Feeds → Statement Candidates → Vote – News-Pipeline
 * ==========================================================================*/

/**
 * Ziel:
 * -----
 * - Automatisierte Verarbeitung von Newsfeeds (RSS/Atom usw.).
 * - Zielkette: "News → Statement → Vote".
 * - Konform zu E150:
 *   - Jede relevante Meldung wird in Statements/Claims übersetzt.
 *   - Es gibt Kontext, Fragen, Knoten.
 *   - Daraus entstehen „StatementCandidates“ für spätere Umfragen/Abstimmungen.
 *
 * WICHTIG:
 *  - Keine Drittanbieter-Dienste, die laufende Kosten erzeugen.
 *  - Alles über unsere API + Orchestrator + Cron/Script (z.B. GitHub Action).
 */


/**
 * Datenmodelle Feeds (vereinfacht)
 * --------------------------------
 * Diese Typen sind Orientierung für Prisma/DB und Typen in @features/feeds.
 */

type FeedSource = {
  id: string;
  name: string;              // z.B. "Reuters", "AP", "dpa"
  url: string;               // RSS/Atom-URL
  language: LanguageCode;
  region?: string;           // EU, DE, global, ...
  trustScore: number;        // 0–1, manuell konfiguriert
  isActive: boolean;
};

type FeedItem = {
  id: string;
  sourceId: string;
  guid: string;              // Feed-spezifische ID
  url: string;               // Canonical URL der Meldung
  canonicalHash: string;     // Hash(url) zur Deduplizierung
  title: string;
  summary?: string;
  content?: string;
  publishedAt: string;       // ISO
  language: LanguageCode;
  topicHint?: string;        // grobe Rubrik (Politik, Klima, Wirtschaft …)
  processedAt?: string;      // wann E150-Analyse lief
};

type StatementCandidate = {
  id: string;
  feedItemId: string;
  priorityScore: number;     // Wichtigkeit / Relevanz 0–1
  analyze: AnalyzeResult;    // E150-Analyse des FeedItem-Texts
  // optional: Cluster-Info, Region, etc.
};


/**
 * API: /api/feeds/batch
 * ---------------------
 * Datei-Vorschlag:
 *   - apps/web/src/app/api/feeds/batch/route.ts
 *
 * Zweck:
 *   - Nimmt EINE oder mehrere Feeds / FeedItems entgegen,
 *     ruft Contribution-AI/Orchestrator und liefert StatementCandidates zurück.
 *
 * Möglicher Request-Body:
 *   {
 *     apiKey: string;             // interner Schlüssel (später: multi-tenant)
 *     sources?: string[];         // IDs oder URLs von FeedSources
 *     items?: {
 *       sourceId: string;
 *       url: string;
 *       title: string;
 *       summary?: string;
 *       content?: string;
 *       publishedAt?: string;
 *       language?: string;
 *       topicHint?: string;
 *     }[];
 *     maxItemsPerSource?: number; // Hardcap, z.B. 50
 *     maxClaimsPerItem?: number;  // Hardcap, z.B. 10–20
 *   }
 *
 * Verhalten:
 *   1. Falls `items` nicht mitgegeben:
 *      - Feeds von `sources` abrufen (RSS/Atom-Parsing).
 *   2. Für jeden FeedItem:
 *      - canonicalHash aus URL berechnen.
 *      - Prüfen, ob der Hash schon existiert → Deduplizierung.
 *   3. Für jedes neue/aktualisierte Item:
 *      - Text zusammensetzen (Titel + Summary + Content).
 *      - analyzeContribution({ text, locale, maxClaims }) aufrufen.
 *      - StatementCandidate-Objekt bauen.
 *      - optional: in DB speichern.
 *   4. Response:
 *      {
 *        ok: true;
 *        processedCount: number;
 *        candidates: StatementCandidate[];
 *      }
 *
 * Anforderungen für E150:
 *   - Jede Meldung bekommt:
 *     - Claims, Notes, Questions, Knots.
 *   - priorityScore:
 *     - Kann von Codex so vorbereitet werden, dass wir später Ranking-Regeln
 *       (z.B. trustScore der Quelle + Topic/Region + Aktualität) implementieren.
 *
 * Cron / Scheduling (ohne teuren Dienst):
 * ---------------------------------------
 *   - EINFACHHEIT:
 *     - Wir setzen auf:
 *       - externen Cron (z.B. GitHub Action / Systemd-Job / einfache CLI),
 *       - der 1–2x am Tag / Stunde `/api/feeds/batch` aufruft.
 *   - Der Server selbst braucht KEIN dauerlaufendes Worker-System.
 */


/* ============================================================================
 * 6. E150 als „Nummernsystem“ für spätere Doku
 * ==========================================================================*/

/**
 * Nummerierung E150.x
 * -------------------
 * Um im Projektordner & Doku später sauber referenzieren zu können:
 *
 *   - E150.0 – Kernprinzipien
 *   - E150.1 – Contribution-AI & AnalyzeResult
 *   - E150.2 – KI-Orchestrator (parallel, gewichtet, spezialisiert)
 *   - E150.3 – Feeds → StatementCandidates (News → Statement → Vote)
 *   - E150.4 – UI /contributions/new (Textmarker, Level 1/2, Layout)
 *   - E150.5 – API-Layer (Analyze JSON/SSE, Feeds-Batch)
 *   - E150.6 – Fallback-Mechanismen & Robustheit
 *   - E150.7 – spätere Erweiterungen (Reports, Graph-Sync, E200 …)
 *
 * Codex soll diese Nummern NICHT als Codekonstanten nutzen, aber kann sie in
 * Kommentaren referenzieren, z.B.:
 *
 *   // E150.3: Feeds-Batch verknüpft News mit StatementCandidates.
 */


/* ============================================================================
 * 7. Do / Don’t – was Codex tun darf
 * ==========================================================================*/

/**
 * Codex SOLL:
 * -----------
 * - Multi-Provider-Orchestrator implementieren (parallel).
 * - Adapter-Schicht robust bauen (AnalyzeResult immer gültig).
 * - Contribution-API + UI mit E150-Standard verheiraten.
 * - Feeds-Batch-API so anlegen, dass:
 *   - Deduplizierung über canonicalHash funktioniert,
 *   - StatementCandidates direkt E150-kompatibel sind.
 *
 * Codex DARF NICHT:
 * -----------------
 * - E150 auf „nur Claims“ reduzieren.
 * - Notes/Questions/Knots weglassen oder per Default verschwinden lassen.
 * - Orchestrator wieder auf „ein Provider reicht schon“ zurückstutzen.
 * - Teure externe Cron-/Worker-Services erzwingen.
 */

