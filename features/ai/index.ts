/**
 * Zentraler Zugriff auf GPT/ARI Provider.
 * Hinweis: Wir nutzen hier Chat Completions. Für Responses API bitte separat umstellen.
 */
import { callOpenAI } from "./providers/openai";

export async function callOpenAIJson(prompt: string, maxOutputTokens = 1200) {
  const { text } = await callOpenAI(
    `${prompt}\n\nGib NUR gültiges JSON (RFC8259) zurück.`,
    { forceJsonMode: true, maxOutputTokens }
  );
  return { text };
}

// Platzhalter – ARI
export async function youcomResearch(_args: any) {
  throw new Error("ARI not configured (YOUCOM_ARI_API_KEY missing)");
}
export async function youcomSearch(_args: any) {
  throw new Error("ARI search not configured");
}
export function extractNewsFromSearch() { return []; }
