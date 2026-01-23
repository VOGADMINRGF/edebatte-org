// apps/web/src/lib/contribution/extractStatements.ts
import type {
  AnalyzedStatement,
  Polarity,
  StatementType,
} from "@/types/contribution";

export type ExtractOpts = { max?: number; minChars?: number };

/**
 * Heuristik-Extraktor aus Rohtext (Sätze/Zeilen).
 * - Splittet an Zeilenumbrüchen und Satzende (. ! ?)
 * - trimmt, dedupliziert (case-insensitive)
 * - filtert zu kurze Segmente
 * - deckelt auf `max`
 */
export function extractStatementsFromText(
  text: string,
  opts: ExtractOpts = {},
): { text: string }[] {
  const max = Number.isFinite(opts.max) ? (opts.max as number) : 10;
  const min = Number.isFinite(opts.minChars) ? (opts.minChars as number) : 12;

  const parts = text
    .split(/\r?\n|(?<=[.!?])\s+/g)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => s.length >= min);

  const out: { text: string }[] = [];
  const seen = new Set<string>();

  for (const p of parts) {
    const k = p.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ text: p });
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Kompatibilitäts-Variante:
 * Nimmt eine typische GPT-Listen-Antwort (Zeilen) und liefert reine Strings.
 */
export async function extractStatements(
  gptResponse: string,
): Promise<string[]> {
  return gptResponse
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 10);
}

/**
 * Optionaler Helper:
 * Upcast von {text}[] zu AnalyzedStatement[] mit Defaults.
 * So kannst du bei Bedarf schnell auf dein strengeres Typmodell gehen.
 */
export function upcastToAnalyzedStatements(
  items: { text: string }[],
  defaults?: { type?: StatementType; polarity?: Polarity },
): AnalyzedStatement[] {
  const type: StatementType = defaults?.type ?? "frei";
  const polarity: Polarity = defaults?.polarity ?? "mittel";
  return items.map((s) => ({ text: s.text, type, polarity }));
}
