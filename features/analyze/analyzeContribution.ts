import { AnalyzeResultSchema, normalizeDomains } from "./schemas";
import type { AnalyzeResult, StatementRecord } from "./schemas";
import { normalizeStatementRecord } from "./normalizeClaim";
import { parseJsonLoose } from "./llmJson";
import {
  callE150Orchestrator,
  OrchestratorNoProviderError,
  OrchestratorAllFailedError,
} from "@features/ai/orchestratorE150";
import type { AiPipelineName } from "@core/telemetry/aiUsageTypes";
import { EDITORIAL_DOMAIN_GUIDE } from "./domainLabels";
export type { AnalyzeResult } from "./schemas";

export type AnalyzeInput = {
  text: string;
  locale?: string; // "de" | "en" | ...
  maxClaims?: number;
  pipeline?: AiPipelineName;
};

// Reduzierte Default-Anzahl, um JSON-Truncation zu vermeiden
const DEFAULT_MAX_CLAIMS = 10;

// --- NEU: Regeln für "kurzer Text" & Minimum Claims ---
const MIN_CLAIMS_NORMAL_TEXT = 3;
const SHORT_TEXT_MAX_CHARS = 160;
const SHORT_TEXT_MAX_WORDS = 22;

function isShortContribution(text: string): boolean {
  const t = (text ?? "").trim();
  if (!t) return true;
  const words = t.split(/\s+/).filter(Boolean).length;
  return t.length <= SHORT_TEXT_MAX_CHARS || words <= SHORT_TEXT_MAX_WORDS;
}

function requiredMinClaims(sourceText: string): number {
  return isShortContribution(sourceText) ? 1 : MIN_CLAIMS_NORMAL_TEXT;
}

// --- ÄNDERN: validateAnalyzeRaw bekommt sourceText und prüft minClaims ---
function validateAnalyzeRaw(rawText: string, sourceText: string): boolean {
  try {
    const parsed = safeParseJson(rawText);
    if (!parsed || typeof parsed !== "object") return false;

    const minClaims = requiredMinClaims(sourceText);
    const claimCount =
      Array.isArray((parsed as any)?.claims)
        ? (parsed as any).claims.filter(
            (c: any) =>
              c &&
              typeof c === "object" &&
              typeof c.text === "string" &&
              c.text.trim().length > 0,
          ).length
        : 0;

    return claimCount >= minClaims;
  } catch {
    return false;
  }
}

// --- NEU: Helper zum "String picken" ---
function pickString(...vals: any[]): string | null {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

// --- NEU: typisierte Sanitizer (lösen deine TS-unknown[] Errors) ---
type NoteT = AnalyzeResult["notes"][number];
type QuestionT = AnalyzeResult["questions"][number];
type KnotT = AnalyzeResult["knots"][number];
type RespPathT = NonNullable<AnalyzeResult["responsibilityPaths"]>[number];
type EventualityT = NonNullable<AnalyzeResult["eventualities"]>[number];
type DecisionTreeT = NonNullable<AnalyzeResult["decisionTrees"]>[number];

function sanitizeNotes(input: unknown, max = 6): AnalyzeResult["notes"] {
  if (!Array.isArray(input)) return [];
  return input
    .slice(0, max)
    .map((n: any, idx): NoteT | null => {
      if (!n || typeof n !== "object") return null;
      const text = pickString(n.text, n.body, n.content, n.description);
      if (!text) return null;
      const id = pickString(n.id) ?? `note-${idx + 1}`;
      const kind = pickString(n.kind, n.title, n.heading, n.label) ?? null;
      return { id, text, ...(kind !== null ? { kind } : {}) } as NoteT;
    })
    .filter((x): x is NoteT => Boolean(x));
}

function sanitizeQuestions(input: unknown, max = 5): AnalyzeResult["questions"] {
  if (!Array.isArray(input)) return [];
  return input
    .slice(0, max)
    .map((q: any, idx): QuestionT | null => {
      if (!q || typeof q !== "object") return null;
      const text = pickString(q.text, q.body, q.content);
      if (!text) return null;
      const id = pickString(q.id) ?? `q-${idx + 1}`;
      const dimension =
        pickString(q.dimension, q.category, q.domain, q.topic, q.kind, q.type) ?? null;
      return { id, text, ...(dimension !== null ? { dimension } : {}) } as QuestionT;
    })
    .filter((x): x is QuestionT => Boolean(x));
}

function sanitizeKnots(input: unknown, max = 5): AnalyzeResult["knots"] {
  if (!Array.isArray(input)) return [];
  return input
    .slice(0, max)
    .map((k: any, idx): KnotT | null => {
      if (!k || typeof k !== "object") return null;
      const label = pickString(k.label, k.title, k.heading);
      const description = pickString(k.description, k.text, k.body, k.content);
      if (!label || !description) return null;
      const id = pickString(k.id) ?? `knot-${idx + 1}`;
      return { id, label, description } as KnotT;
    })
    .filter((x): x is KnotT => Boolean(x));
}

const RESPONSIBILITY_LEVELS = new Set([
  "municipality",
  "district",
  "state",
  "federal",
  "eu",
  "ngo",
  "private",
  "unknown",
]);

function normRespLevel(x: any) {
  if (typeof x === "string" && RESPONSIBILITY_LEVELS.has(x)) return x;
  return "unknown";
}

function sanitizeResponsibilityPaths(
  input: unknown,
  max = 8,
): AnalyzeResult["responsibilityPaths"] {
  if (!Array.isArray(input)) return [];
  return input
    .slice(0, max)
    .map((p: any, idx): RespPathT | null => {
      if (!p || typeof p !== "object") return null;

      const id = pickString(p.id) ?? `path-${idx + 1}`;
      const statementId = pickString(p.statementId, p.rootStatementId);
      if (!statementId) return null;

      const locale = pickString(p.locale) ?? "de";
      const nodesRaw = Array.isArray(p.nodes) ? p.nodes : [];
      const nodes = nodesRaw
        .filter((n: any) => n && typeof n === "object")
        .map((n: any) => ({ ...n, level: normRespLevel(n.level) }));

      return { ...p, id, statementId, locale, nodes } as RespPathT;
    })
    .filter((x): x is RespPathT => Boolean(x));
}

/* ---------- Prompt-Bausteine ---------- */

function buildSystemPrompt(locale: string = "de"): string {
  const isDe = locale.toLowerCase().startsWith("de");

  if (isDe) {
    return [
      "Antworte NUR mit dem JSON-Objekt. KEIN Markdown. KEIN zusätzlicher Text.",
      "Wiederhole NICHT den Eingabetext. Gib kein 'sourceText', keine Originalpassagen, keine Zitate zurück.",
      "Du bist eine unparteiische redaktionelle KI für eDebatte / VoiceOpenGov.",
      "Du erfüllst einen demokratischen Bildungsauftrag:",
      "- Du hilfst Bürger:innen, komplexe Themen zu verstehen, abzuwägen und fundiert zu entscheiden.",
      "- Du gibst KEINE Empfehlung, wie man abstimmen soll.",
      "",
      "WICHTIG:",
      "- Du arbeitest streng textbasiert.",
      "- Du erfindest keine Fakten und keine Inhalte, die im Text nicht angelegt sind.",
      "- Wenn du unsicher bist, lasse keine Keys weg. Gib Unsicherheit über eine Note mit kind 'Unsicherheit' oder confidence=null aus.",
      "",
      EDITORIAL_DOMAIN_GUIDE,
    ].join("\n");
  }

  return [
    "You are an impartial editorial AI for a digital public debate platform.",
    "Your role is educational:",
    "- Help citizens understand complex issues, weigh pros and cons, and decide in an informed way.",
    "- Do NOT recommend how to vote.",
    "",
    "IMPORTANT:",
    "- Work strictly text-based.",
    "- Do NOT invent facts or content that is not grounded in the input text.",
    "- If you are unsure, keep keys present but signal uncertainty via null/confidence or a note labeled 'uncertainty'.",
    "",
    EDITORIAL_DOMAIN_GUIDE,
  ].join("\n");
}

function buildUserPrompt(
  text: string,
  locale: string = "de",
  maxClaims: number = DEFAULT_MAX_CLAIMS
): string {
  const isDe = locale.toLowerCase().startsWith("de");

  if (isDe) {
    return [
      "AUFGABE:",
      "Antworte NUR mit dem JSON-Objekt. KEIN Markdown. KEIN zusätzlicher Text.",
      "Das JSON muss exakt dem unten stehenden Schema entsprechen; jede Eigenschaft ist immer vorhanden.",
      "Wenn du zu einem Feld nichts beitragen kannst, nutze null oder [] – lass Felder nicht weg.",
      "Für normale Beiträge benötigen wir mindestens 3 Claims; sehr kurze Texte (≤160 Zeichen oder ≤22 Wörter) dürfen nur 1–3 Claims enthalten.",
      "Das Feld 'sourceText' darf enthalten sein, sollte aber standardmäßig null sein, da wir den Beitrag nicht erneut wiederholen.",
      "Wiederhole NICHT den Eingabetext. Gib keine Originalpassagen oder Zitate zurück.",
      `1) Zerlege den Beitrag in maximal ${maxClaims} atomare Aussagen (Claims, hartes Limit 10). Jede Aussage:`,
      "   - ist ein einzelner, prüfbarer Satz;",
      "   - hat genau eine Kernforderung oder Behauptung;",
      "   - ist so formuliert, dass man später zustimmen oder ablehnen kann.",
      "   - ist nach Möglichkeit positiv und konstruktiv formuliert (z.B. „X sollte eingeführt werden“ statt „X wird abgelehnt“).",
      "   - vermeidet Dopplungen: eng verwandte Inhalte und Kontexte fasst du zu EINEM Claim zusammen.",
      "",
      "   Ziel: eher 3–8 gut unterscheidbare Kern-Claims statt sehr vieler ähnlicher Aussagen.",
      "",
      "2) Für jeden Claim bestimmst du zusätzlich (sofern möglich):",
      '   - title: sehr kurzer Oberbegriff (max. 6–8 Wörter), z.B. „Stufe 4 als Tierwohl-Standard“.',
      "   - topic: 1–3 Stichworte als Thema (z.B. „Tierwohl“, „Mieten“, „Migration“).",
      '   - responsibility: grobe Zuständigkeit, z.B. "EU", "Bund", "Land", "Kommune", "privat", "unbestimmt".',
      "     Wenn die Ebene unklar ist, nutze unbestimmt (Key immer vorhanden).",
      "   - stance: pro | contra | neutral (bezogen auf den Claim im Beitrag).",
      "   - importance: 1–5 (Wichtigkeit aus Sicht des Beitrags).",
      "   - domain/domains: redaktionelle Einordnung als Taxonomie-Keys (siehe Liste).",
      "",
      "   Domains: nutze Taxonomie-Keys (z.B. gesellschaft, nachbarschaft, aussenbeziehungen_eu, klima_umwelt).",
      '   Wenn mehrere passen: domains als Array (z.B. ["gesellschaft","aussenbeziehungen_nachbarlaender"]) und domain = erstes Element.',
      "",
      "3) Kontext-Notizen (mindestens 2, maximal 6):",
      "   - Erkenne thematische Abschnitte im Beitrag und fasse sie als `notes` zusammen.",
      "   - Jede Note: { id, kind, text } – kind ist ein kurzer Label wie „Faktenlage“, „Beispiel“, „Emotion“. Text ist ein prägnanter Absatz aus dem Beitrag bzw. eine saubere Paraphrase.",
      "",
      "4) Fragen zum Weiterdenken (2–5 Einträge, hartes Limit 5):",
      "   - Zeige Lücken oder Prüf-Aufgaben auf (z.B. „Welche Kosten entstehen dadurch?“).",
      "   - Jede Frage: { id, text, dimension } – dimension benennt das Themenfeld („Finanzen“, „Recht“, „Betroffene“).",
      "",
      "5) Thematische Knoten / Schwerpunkte (mindestens 1, maximal 5):",
      "   - Zeige Spannungsfelder oder harte Zielkonflikte.",
      "   - Jeder Knoten: { id, label, description } – label kurz (z.B. „Tierwohl vs. Kosten“), description mit 1–2 Sätzen.",
      "",
      "   Wichtig: Erfinde keine Inhalte – nur was im Beitrag angelegt ist.",
      "",
      "6) Eventualitäten & Entscheidungsbäume (Part08, falls im Text Hinweise enthalten sind):",
      "   - Baue für jede relevante Aussage einen DecisionTree mit den drei Optionen pro/neutral/contra.",
      "   - DecisionTree: { rootStatementId, createdAt (ISO), options: { pro, neutral?, contra } }.",
      "   - Jede Option ist ein EventualityNode: { id, statementId, label, narrative, stance, consequences[], responsibilities[], children[] }.",
      "   - Konsequenzen spiegeln regionale Tragweiten (local_short, local_long, national, global, systemic) wider; Zuständigkeiten nutzen Part06/10-Level.",
      "   - Zusätzliche What-if-Hinweise, die nicht direkt in die drei Optionen passen, gehen in `eventualities` (freistehende EventualityNodes).",
      "   - Wenn es keine Hinweise auf Eventualitäten gibt, liefere leere Arrays für decisionTrees/eventualities.",
      "",
      "7) Begrenze alle Listen strikt: claims ≤ 10, notes ≤ 6, questions ≤ 5, knots ≤ 5, consequences/responsibilities ≤ 8 Einträge.",
      "",
      "8) Gib das Ergebnis ausschließlich als JSON (keine ```-Blöcke), alle Keys vorhanden, fehlende Inhalte = null oder [].",
      "",
      '   }',
      "",
      "9) Do NOT echo the input text. Keep sourceText null unless we explicitly ask you to quote the contribution.",
      "",
      "10) Antworte NUR mit JSON – keine Erklärungen, keine Kommentare, keine Markdown-Formatierung. Beende alle Objekte und Arrays vollständig.",
      "",
      "BEITRAG:",
      text,
    ].join("\n");
  }

    return [
      "TASK:",
      "Respond ONLY with the JSON object. NO Markdown. NO extra text.",
      "Do NOT echo the input. Return EXACT JSON matching the schema below.",
      "Include every key; use null for missing values and [] for empty arrays.",
      "sourceText is allowed but keep it null unless we specifically ask you to repeat the contribution.",
      "Normal-length contributions require at least 3 claims; very short texts (≤160 characters or ≤22 words) may provide 1–3 claims.",
    `1) Split the contribution into at most ${maxClaims} atomic statements (claims, hard cap 10). Each claim:`,
    "   - is a single, verifiable sentence;",
    "   - contains exactly one actionable demand or assertion;",
    "   - can later receive a pro/neutral/contra vote;",
    "   - avoids duplicates by merging near-identical content.",
    "",
    "   Target 3–8 distinct core claims rather than dozens of small variations.",
    "",
    "2) For each claim also provide (when possible):",
    "   - title: concise label (≤8 words).",
    "   - topic: 1–3 keywords for the topic.",
    '   - responsibility: one of "EU", "Bund", "Land", "Kommune", "privat", "unbestimmt".',
    "     If unclear, use 'unclear' (key must always be present).",
    "   - stance: pro | contra | neutral (with respect to the claim as expressed in the text).",
    "   - importance: 1–5 (importance from the author/text perspective).",
    "   - domain/domains: editorial classification using taxonomy keys (see list).",
    "",
    "   Editorial domain taxonomy keys (lowercase, underscore):",
    "   gesellschaft | nachbarschaft | aussenbeziehungen_nachbarlaender | aussenbeziehungen_eu |",
    "   innenpolitik | wirtschaft | bildung | gesundheit | sicherheit | klima_umwelt | digitales |",
    "   infrastruktur | justiz | kultur_medien | sonstiges",
    "",
    "   Short definitions (important):",
    "   - gesellschaft: social cohesion, participation, welfare, equality, integration.",
    "   - nachbarschaft: immediate neighborhood / local community / housing environment.",
    "   - aussenbeziehungen_nachbarlaender: relations with specific neighboring countries (not generic EU).",
    "   - aussenbeziehungen_eu: EU institutions, EU law, EU programs/regulations.",
    "",
    '   If multiple apply: set domains as an array (e.g. ["gesellschaft","aussenbeziehungen_nachbarlaender"])',
    "   and domain as the primary domain (first element).",
    "",
    "3) Context notes (≥2, ≤6):",
    "   - { id, kind, text } with kind such as FACTS / EXAMPLE / MOTIVATION.",
    "",
    "4) Critical questions (2–5 items, hard cap 5):",
    "   - highlight gaps or checks citizens should raise; payload { id, dimension, text }.",
    "",
    "5) Knots / topic hotspots (≥1, ≤5):",
    "   - describe tensions/trade-offs in 1–2 sentences.",
    "   - stay strictly grounded in the provided text (never invent facts).",
    "",
    "6) Eventualities & Decision Trees (Part08, optional but preferred when hints exist):",
    "   - Build `decisionTrees` for each vote-relevant claim with options pro/neutral/contra.",
    "   - Each tree: { rootStatementId, createdAt (ISO string), options: { pro, neutral?, contra } }.",
    "   - Each option is an EventualityNode describing the narrative, consequences[], responsibilities[], and child branches.",
    "   - Additional what-if branches outside the triad go into `eventualities` (array of EventualityNodes).",
    "   - Use empty arrays when the source text contains no scenario information.",
    "",
    "7) Strict limits for all lists: claims ≤ 10, notes ≤ 6, questions ≤ 5, knots ≤ 5, consequences/responsibilities ≤ 8 items each.",
    "",
    "8) Return ONLY raw JSON (no markdown fences), all keys present; missing data = null or [].",
    "",
    '   }',
    "",
      "9) Do NOT echo the input text. Keep sourceText null unless we explicitly ask you to quote the contribution.",
    "",
    "10) Output must be JSON only – no commentary, no Markdown, no trailing text. Close all objects and arrays.",
    "",
    "CONTRIBUTION:",
    text,
  ].join("\n");
}

/* ---------- Hauptfunktion ---------- */

export type AnalyzeResultWithMeta = AnalyzeResult & {
  _meta?: {
    provider?: string;
    model?: string;
    durationMs?: number;
    tokensInput?: number;
    tokensOutput?: number;
    costEur?: number;
    pipeline?: AiPipelineName;
    contributionId?: string;
    eventualitiesReviewed?: boolean;
    eventualitiesReviewedAt?: string | null;
    providerMatrix?: import("@features/ai/orchestratorE150").ProviderMatrixEntry[];
    trace?: { providerUsed?: string | null; jsonCoercion?: "none" | "fence" | "braces" | "backticks" | undefined };
  };
};

export async function analyzeContribution(
  input: AnalyzeInput
): Promise<AnalyzeResultWithMeta> {
  const sourceText = input.text?.trim() ?? "";
  if (!sourceText) {
    throw new Error("analyzeContribution: input.text ist leer");
  }

  const language = (input.locale || "de").toLowerCase();
  const maxClaims =
    typeof input.maxClaims === "number" && input.maxClaims > 0
      ? Math.min(input.maxClaims, DEFAULT_MAX_CLAIMS)
      : DEFAULT_MAX_CLAIMS;

  let orchestration;
  try {
    orchestration = await callE150Orchestrator({
      systemPrompt: buildSystemPrompt(language),
      userPrompt: buildUserPrompt(sourceText, language, maxClaims),
      locale: language,
      maxClaims,
      maxTokens: 2600,
      validateRaw: (rawText: string) => validateAnalyzeRaw(rawText, sourceText),
      telemetry: {
        pipeline: input.pipeline ?? "contribution_analyze",
      },
    });
  } catch (err) {
    if (err instanceof OrchestratorNoProviderError || (err as any)?.code === "NO_ANALYZE_PROVIDER") {
      const e: any = new Error(
        "AnalyzeContribution: Kein KI-Provider konfiguriert. Bitte wende dich an das VoiceOpenGov-Team.",
      );
      e.code = "NO_ANALYZE_PROVIDER";
e.meta = (err as any)?.meta ?? null;
throw e;
    }
    if (err instanceof OrchestratorAllFailedError || (err as any)?.code === "ANALYZE_PROVIDER_FAILED") {
      const failures = (err as OrchestratorAllFailedError)?.meta?.failedProviders ?? [];
      const allBadJson = failures.length > 0 && failures.every((f) => f.errorKind === "BAD_JSON");
      const code = allBadJson ? "BAD_JSON" : "ANALYZE_PROVIDER_FAILED";
      const e: any = new Error(
        allBadJson
          ? "AnalyzeContribution: KI-Antworten waren nicht valide JSON. Bitte erneut versuchen."
          : "AnalyzeContribution: Alle verfügbaren KI-Provider haben für diese Anfrage fehlgeschlagen.",
      );
      e.code = code;
      e.meta = (err as any)?.meta ?? null;
      throw e;
    }
    throw err;
  }

  const rawText = orchestration.rawText;

  let raw: any = orchestration.best.parsed;
  let jsonCoercion: "none" | "fence" | "braces" | "backticks" | undefined = "none";
  if (!raw) {
    try {
      let cleaned = rawText.trim();

      if (cleaned.startsWith("```")) {
        const firstNewline = cleaned.indexOf("\n");
        if (firstNewline !== -1) {
          cleaned = cleaned.slice(firstNewline + 1);
        }
        const lastFence = cleaned.lastIndexOf("```");
        if (lastFence !== -1) {
          cleaned = cleaned.slice(0, lastFence);
          jsonCoercion = "fence";
        }
        cleaned = cleaned.trim();
      }

      // strict parse first
      raw = safeParseJson(cleaned);
      if (!raw) {
        const loose = parseJsonLoose(rawText);
        if (loose.ok) {
          raw = loose.value;
          if (/```/.test(rawText)) jsonCoercion = "fence";
          else if (/`/.test(rawText)) jsonCoercion = "backticks";
          else jsonCoercion = "braces";
        }
      }
    } catch (err) {
      console.error("[analyzeContribution] JSON-Parse-Fehler:", err, rawText);
      throw new Error(
        "AnalyzeContribution: KI-Antwort war kein gültiges JSON. Bitte später erneut versuchen."
      );
    }
  }

  const rawClaims: unknown[] = Array.isArray(raw?.claims)
    ? raw.claims.slice(0, maxClaims)
    : [];
  const rawNotes: unknown = raw?.notes;
  const rawQuestions: unknown = raw?.questions;
  const rawKnots: unknown = raw?.knots;
  const rawEventualities: unknown = raw?.eventualities;
  const rawDecisionTrees: unknown = raw?.decisionTrees;
  const rawConsequenceBundle = raw?.consequences;
  const rawResponsibilityPaths: unknown = raw?.responsibilityPaths;
  const rawImpactAndResponsibility = raw?.impactAndResponsibility;
  const rawReport = raw?.report;

  const normalizedRawClaims: StatementRecord[] = rawClaims
    .map((c: any, idx: number) =>
      normalizeStatementRecord(c, { fallbackId: `claim-${idx + 1}` })
    )
    .filter(
      (c: StatementRecord | null): c is StatementRecord => c !== null
    );

  const normalizedClaimsWithDomains: StatementRecord[] = normalizedRawClaims.map((c) => {
    const { domain, domains } = normalizeDomains((c as any)?.domain, (c as any)?.domains);
    return {
      ...c,
      domain,
      domains,
    } as StatementRecord;
  });

  const notes = sanitizeNotes(rawNotes, 6);
  const questions = sanitizeQuestions(rawQuestions, 5);
  const knots = sanitizeKnots(rawKnots, 5);
  const responsibilityPaths = sanitizeResponsibilityPaths(rawResponsibilityPaths, 8);
  const eventualities = sanitizeEventualities(rawEventualities);
  const decisionTrees = sanitizeDecisionTrees(rawDecisionTrees);

  let parsed = AnalyzeResultSchema.safeParse({
    mode: "E150",
    sourceText,
    language,
    claims: normalizedClaimsWithDomains,
    notes,
    questions,
    knots,
    consequences: ensureConsequenceBundle(rawConsequenceBundle),
    responsibilityPaths,
    eventualities,
    decisionTrees,
    impactAndResponsibility: ensureImpactAndResponsibility(rawImpactAndResponsibility),
    report: ensureReport(rawReport),
  } satisfies AnalyzeResult);

  if (!parsed.success) {
    // Fallback: try loose JSON extraction once more before failing
    const loose = parseJsonLoose(rawText);
    if (loose.ok) {
      const parsedRetry = AnalyzeResultSchema.safeParse({
        mode: "E150",
        sourceText,
        language,
        claims: normalizedClaimsWithDomains,
        notes,
        questions,
        knots,
        consequences: ensureConsequenceBundle(rawConsequenceBundle),
        responsibilityPaths,
        eventualities,
        decisionTrees,
        impactAndResponsibility: ensureImpactAndResponsibility(rawImpactAndResponsibility),
        report: ensureReport(rawReport),
      } satisfies AnalyzeResult);
      if (!parsedRetry.success) {
        console.error(
          "[analyzeContribution] Zod-Validierung fehlgeschlagen (retry):",
          parsedRetry.error?.message
        );
        throw new Error(
          "AnalyzeContribution: KI-Antwort entsprach nicht dem erwarteten Schema."
        );
      } else {
        parsed = parsedRetry;
        if (/```/.test(rawText)) jsonCoercion = "fence";
        else if (/`/.test(rawText)) jsonCoercion = "backticks";
        else jsonCoercion = "braces";
      }
    } else {
      console.error(
        "[analyzeContribution] Zod-Validierung fehlgeschlagen:",
        parsed.error?.message
      );
      throw new Error(
        "AnalyzeContribution: KI-Antwort entsprach nicht dem erwarteten Schema."
      );
    }
  }

  const base: AnalyzeResult = {
    ...parsed.data,
    consequences: ensureConsequenceBundle(parsed.data.consequences),
    responsibilityPaths: Array.isArray(parsed.data.responsibilityPaths)
      ? parsed.data.responsibilityPaths
      : [],
    eventualities: parsed.data.eventualities ?? [],
    decisionTrees: parsed.data.decisionTrees ?? [],
    impactAndResponsibility: parsed.data.impactAndResponsibility ?? {
      impacts: [],
      responsibleActors: [],
    },
    report: parsed.data.report,
  };

  const meta = {
    provider: orchestration.best?.provider,
    model: orchestration.best?.modelName,
    durationMs: orchestration.best?.durationMs,
    tokensInput: orchestration.best?.tokensIn ?? 0,
    tokensOutput: orchestration.best?.tokensOut ?? 0,
    costEur: orchestration.best?.costEur ?? 0,
    pipeline: input.pipeline ?? "contribution_analyze",
    providerMatrix: orchestration.meta.providerMatrix,
    trace: { providerUsed: orchestration.best?.provider ?? orchestration.best?.providerId, jsonCoercion },
  };

  return {
    ...base,
    claims: base.claims ?? [],
    notes: base.notes ?? [],
    questions: base.questions ?? [],
    knots: base.knots ?? [],
    eventualities: base.eventualities ?? [],
    decisionTrees: base.decisionTrees ?? [],
    _meta: meta,
  };
}

function sanitizeDecisionTrees(trees: unknown): AnalyzeResult["decisionTrees"] {
  if (!Array.isArray(trees)) return [];
  return trees
    .map((tree: any, idx: number) => sanitizeDecisionTree(tree, idx))
    .filter((tree): tree is DecisionTreeT => Boolean(tree));
}

function safeParseJson(payload: string): any {
  const trimmed = payload?.trim?.() ?? "";
  const sliceToBraces = () => {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return trimmed.slice(start, end + 1);
    }
    return trimmed;
  };

  try {
    return JSON.parse(trimmed);
  } catch {
    const sliced = sliceToBraces();
    try {
      return JSON.parse(sliced);
    } catch {
      throw new Error("invalid-json");
    }
  }
}

function sanitizeDecisionTree(tree: any, idx: number): DecisionTreeT | null {
  if (!tree || typeof tree !== "object") return null;

  const rootStatementId = pickString(tree.rootStatementId);
  if (!rootStatementId) return null;

  const createdAt = pickString(tree.createdAt) ?? new Date().toISOString();
  const options = tree.options ?? {};

  const pro = sanitizeEventualityNode(options.pro, `dt-${idx + 1}-pro`, rootStatementId);
  const contra = sanitizeEventualityNode(options.contra, `dt-${idx + 1}-contra`, rootStatementId);
  const neutral = options.neutral
    ? sanitizeEventualityNode(options.neutral, `dt-${idx + 1}-neutral`, rootStatementId)
    : null;

  if (!pro || !contra) return null;

  return {
    ...tree,
    rootStatementId,
    createdAt,
    options: {
      pro,
      contra,
      ...(neutral ? { neutral } : {}),
    },
  } as DecisionTreeT;
}

function sanitizeEventualities(nodes: unknown): AnalyzeResult["eventualities"] {
  if (!Array.isArray(nodes)) return [];
  return nodes
    .map((node, idx) => sanitizeEventualityNode(node as any, `ev-${idx + 1}`))
    .filter((x): x is EventualityT => Boolean(x));
}

function sanitizeEventualityNode(
  node: any,
  fallbackId?: string,
  fallbackStatementId?: string,
): EventualityT | null {
  if (!node || typeof node !== "object") return null;

  const id = pickString(node.id) ?? fallbackId ?? null;
  const statementId = pickString(node.statementId) ?? fallbackStatementId ?? null;
  if (!id || !statementId) return null;

  const label = pickString(node.label, node.title) ?? "Eventualität";
  const narrative = pickString(node.narrative, node.text, node.body, node.content) ?? "";

  const stance =
    node.stance === "pro" || node.stance === "neutral" || node.stance === "contra"
      ? node.stance
      : null;

  const consequences = Array.isArray(node.consequences)
    ? node.consequences.filter((c: unknown) => c && typeof c === "object")
    : [];
  const responsibilities = Array.isArray(node.responsibilities)
    ? node.responsibilities.filter((r: unknown) => r && typeof r === "object")
    : [];

  const childrenRaw: unknown[] = Array.isArray(node.children) ? node.children : [];
  const children = childrenRaw
    .map((child: unknown, i: number) =>
      sanitizeEventualityNode(child as any, `${id}-c${i + 1}`, statementId),
    )
    .filter((child: EventualityT | null): child is EventualityT => Boolean(child));

  return {
    ...node,
    id,
    statementId,
    label,
    narrative,
    stance,
    consequences,
    responsibilities,
    children,
  } as EventualityT;
}

function ensureConsequenceBundle(value: unknown): AnalyzeResult["consequences"] {
  const v = value && typeof value === "object" ? (value as any) : {};

  const consequences = Array.isArray(v.consequences) ? v.consequences : [];
  const responsibilities = Array.isArray(v.responsibilities) ? v.responsibilities : [];

  return {
    consequences: consequences.slice(0, 8),
    responsibilities: responsibilities.slice(0, 8),
  };
}

function ensureImpactAndResponsibility(value: unknown): AnalyzeResult["impactAndResponsibility"] {
  const v = value && typeof value === "object" ? (value as any) : {};

  const impacts = Array.isArray(v.impacts) ? v.impacts : [];
  const responsibleActors = Array.isArray(v.responsibleActors) ? v.responsibleActors : [];

  return {
    impacts: impacts.slice(0, 12),
    responsibleActors: responsibleActors.slice(0, 12),
  };
}

function ensureReport(value: unknown): AnalyzeResult["report"] {
  const v = value && typeof value === "object" ? (value as any) : {};
  const facts = v.facts && typeof v.facts === "object" ? (v.facts as any) : {};

  return {
    summary: typeof v.summary === "string" ? v.summary : null,
    keyConflicts: Array.isArray(v.keyConflicts) ? v.keyConflicts.slice(0, 12) : [],
    facts: {
      local: Array.isArray(facts.local) ? facts.local.slice(0, 12) : [],
      international: Array.isArray(facts.international) ? facts.international.slice(0, 12) : [],
    },
    openQuestions: Array.isArray(v.openQuestions) ? v.openQuestions.slice(0, 12) : [],
    takeaways: Array.isArray(v.takeaways) ? v.takeaways.slice(0, 12) : [],
  };
}
