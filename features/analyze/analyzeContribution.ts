// apps/web/src/features/analyze/analyzeContribution.ts
import { AnalyzeResultSchema } from "./schemas";
import type { AnalyzeResult, StatementRecord } from "./schemas";
import { normalizeStatementRecord } from "./normalizeClaim";
import { callE150Orchestrator } from "@features/ai/orchestratorE150";
import type { AiPipelineName } from "@core/telemetry/aiUsageTypes";

export type AnalyzeInput = {
  text: string;
  locale?: string; // "de" | "en" | ...
  maxClaims?: number;
  pipeline?: AiPipelineName;
};

// User-Wunsch: MaxClaims wieder auf 20
const DEFAULT_MAX_CLAIMS = 20;

/* ---------- Prompt-Bausteine ---------- */

function buildSystemPrompt(locale: string = "de"): string {
  const isDe = locale.toLowerCase().startsWith("de");

  if (isDe) {
    return [
      "Du bist eine unparteiische redaktionelle KI für eDebatte / VoiceOpenGov.",
      "Du erfüllst einen demokratischen Bildungsauftrag:",
      "- Du hilfst Bürger:innen, komplexe Themen zu verstehen, abzuwägen und fundiert zu entscheiden.",
      "- Du gibst KEINE Empfehlung, wie man abstimmen soll.",
      "",
      "WICHTIG:",
      "- Du arbeitest streng textbasiert.",
      "- Du erfindest keine Fakten und keine Inhalte, die im Text nicht angelegt sind.",
      "- Wenn du unsicher bist, lässt du Felder leer statt zu raten.",
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
    "- If you are unsure, leave fields empty instead of guessing.",
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
      `1) Zerlege den Beitrag in maximal ${maxClaims} atomare Aussagen (Claims). Jede Aussage:`,
      "   - ist ein einzelner, prüfbarer Satz;",
      "   - hat genau eine Kernforderung oder Behauptung;",
      "   - ist so formuliert, dass man später zustimmen oder ablehnen kann.",
      "   - ist nach Möglichkeit positiv und konstruktiv formuliert (z.B. „X sollte eingeführt werden“ statt „X wird abgelehnt“).",
      "   - vermeidet Dopplungen: eng verwandte Inhalte und Kontexte fasst du zu EINEM Claim zusammen.",
      "",
      "   Ziel: eher 3–8 gut unterscheidbare Kern-Claims statt sehr vieler ähnlicher Aussagen.",
      "",
      "2) Für jeden Claim bestimmst du zusätzlich (sofern möglich):",
      '   - title: ein sehr kurzer Oberbegriff (max. 6–8 Wörter), z.B. „Stufe 4 als Tierwohl-Standard“.',
      '   - responsibility: grobe Zuständigkeit, z.B. "EU", "Bund", "Land", "Kommune", "privat", "unbestimmt".',
      "   Wenn die Ebene unklar ist, nutze „unbestimmt“ oder lasse das Feld weg.",
      "",
      "3) Kontext-Notizen (mindestens 2, maximal 5):",
      "   - Erkenne thematische Abschnitte im Beitrag und fasse sie als `notes` zusammen.",
      "   - Jede Note: { id, kind, text } – kind ist ein kurzer Label wie „Faktenlage“, „Beispiel“, „Emotion“. Text ist ein prägnanter Absatz aus dem Beitrag bzw. eine saubere Paraphrase.",
      "",
      "4) Fragen zum Weiterdenken (2–4 Einträge):",
      "   - Zeige Lücken oder Prüf-Aufgaben auf (z.B. „Welche Kosten entstehen dadurch?“).",
      "   - Jede Frage: { id, text, dimension } – dimension benennt das Themenfeld („Finanzen“, „Recht“, „Betroffene“).",
      "",
      "5) Thematische Knoten / Schwerpunkte (mindestens 1):",
      "   - Zeige Spannungsfelder oder harte Zielkonflikte.",
      "   - Jeder Knoten: { id, label, description } – label kurz (z.B. „Tierwohl vs. Kosten“), description mit 1–2 Sätzen.",
      "",
      "   Wichtig: Erfinde nichts, bleibe streng beim Text. Wenn wirklich keine Hinweise existieren, darf ein Array leer bleiben – kennzeichne das aber nicht speziell.",
      "",
      "6) Gib das Ergebnis ausschließlich als JSON mit diesem Shape zurück (keine Markdown-Formatierung, keine ```-Blöcke):",
      "   {",
      '     "mode": "E150",',
      '     "sourceText": "...",',
      '     "language": "de",',
      '     "claims": [ { "id": "...", "title": "...", "text": "...", "responsibility": "Bund" } ],',
      '     "notes": [ { "id": "...", "kind": "Faktenlage", "text": "..." } ],',
      '     "questions": [ { "id": "...", "dimension": "Finanzen", "text": "..." } ],',
      '     "knots": [ { "id": "...", "label": "...", "description": "..." } ]',
      "   }",
      "",
      "7) Gib NUR den JSON-Text zurück – keine Erklärungen, keine Kommentare, keine Markdown-Formatierung.",
      "",
      "BEITRAG:",
      text,
    ].join("\n");
  }

  // EN-Variante analog, lasse ich der Kürze halber weg;
  // hier kannst du 1:1 an deine bisherige englische Version anlehnen
  // und ebenfalls title/responsibility beschreiben.
  return [
    "TASK:",
    `1) Split the contribution into at most ${maxClaims} atomic statements (claims). Each claim:`,
    "   - is a single, verifiable sentence;",
    "   - has exactly one core demand or assertion;",
    "   - is phrased so people could later agree or disagree.",
    "   - is phrased as a positive, constructive statement whenever possible.",
    "   - avoids duplicates: merge closely related content into ONE claim.",
    "",
    "   Aim for about 3–8 distinct core claims rather than many small variations.",
    "",
    "2) For each claim you must also provide (if possible):",
    '   - title: a very short label (max. 6–8 words).',
    '   - responsibility: one of "EU", "Bund", "Land", "Kommune", "privat", "unbestimmt" or leave it empty.',
    "",
    "3) Context notes (at least 2, up to 5):",
    "   - Highlight key sections of the text as { id, kind, text }.",
    "   - kind is a short label such as “FACTS”, “EXAMPLE”, “MOTIVATION”.",
    "",
    "4) Critical questions (2–4 entries):",
    "   - Surface gaps or checks the community should clarify.",
    "   - Shape: { id, dimension, text } where dimension is a domain like “Finance”, “Legal”, “Impact”.",
    "",
    "5) Knots / topic hotspots (at least 1):",
    "   - Describe tensions or trade-offs (label + 1–2 sentence description).",
    "   - All entries must remain grounded in the given text; leave an array empty only if there is truly no signal.",
    "",
    "6) Return ONLY raw JSON with this shape (no markdown, no ``` blocks):",
    "   {",
    '     "mode": "E150",',
    '     "sourceText": "...",',
    '     "language": "en" or "de",',
    '     "claims": [ { "id": "...", "title": "...", "text": "...", "responsibility": "Bund" } ],',
    '     "notes": [ { "id": "...", "kind": "FACTS", "text": "..." } ],',
    '     "questions": [ { "id": "...", "dimension": "Finance", "text": "..." } ],',
    '     "knots": [ { "id": "...", "label": "...", "description": "..." } ]',
    "   }",
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

  const orchestration = await callE150Orchestrator({
    systemPrompt: buildSystemPrompt(language),
    userPrompt: buildUserPrompt(sourceText, language, maxClaims),
    locale: language,
    maxClaims,
    maxTokens: 1800,
    telemetry: {
      pipeline: input.pipeline ?? "contribution_analyze",
    },
  });

  const rawText = orchestration.rawText;

  let raw: any;
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
      }
      cleaned = cleaned.trim();
    }

    raw = JSON.parse(cleaned);
  } catch (err) {
    console.error("[analyzeContribution] JSON-Parse-Fehler:", err, rawText);
    throw new Error(
      "AnalyzeContribution: KI-Antwort war kein gültiges JSON. Bitte später erneut versuchen."
    );
  }

  const rawClaims = Array.isArray(raw?.claims)
    ? raw.claims.slice(0, maxClaims)
    : [];
  const rawNotes = Array.isArray(raw?.notes) ? raw.notes : [];
  const rawQuestions = Array.isArray(raw?.questions) ? raw.questions : [];
  const rawKnots = Array.isArray(raw?.knots) ? raw.knots : [];

  const normalizedRawClaims: StatementRecord[] = rawClaims
    .map((c: any, idx: number) =>
      normalizeStatementRecord(c, { fallbackId: `claim-${idx + 1}` })
    )
    .filter(
      (c: StatementRecord | null): c is StatementRecord => c !== null
    );

  const parsed = AnalyzeResultSchema.safeParse({
    mode: "E150",
    sourceText,
    language,
    claims: normalizedRawClaims,
    notes: rawNotes,
    questions: rawQuestions,
    knots: rawKnots,
  } as any);

  if (!parsed.success) {
    console.error(
      "[analyzeContribution] Zod-Validierung fehlgeschlagen:",
      parsed.error?.message
    );
    throw new Error(
      "AnalyzeContribution: KI-Antwort entsprach nicht dem erwarteten Schema."
    );
  }

  const base: AnalyzeResult = parsed.data;

  const meta = {
    provider: orchestration.best?.provider,
    model: orchestration.best?.modelName,
    durationMs: orchestration.best?.durationMs,
    tokensInput: orchestration.best?.tokensIn ?? 0,
    tokensOutput: orchestration.best?.tokensOut ?? 0,
    costEur: orchestration.best?.costEur ?? 0,
    pipeline: input.pipeline ?? "contribution_analyze",
  };

  return {
    ...base,
    claims: base.claims ?? [],
    notes: base.notes ?? [],
    questions: base.questions ?? [],
    knots: base.knots ?? [],
    _meta: meta,
  };
}
