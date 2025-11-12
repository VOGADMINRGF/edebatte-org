import { ask as askOpenAI } from "./providers/openai";

export async function callOpenAIJson(prompt: string) {
  const full = `${prompt}\n\nGib NUR gültiges JSON (RFC8259) zurück.`;
  const { text } = await askOpenAI({ prompt: full, asJson: true });
  return { text };
}

// Platzhalter – ARI/YOUCOM
export async function youcomResearch(_args: any) {
  throw new Error("ARI not configured (YOUCOM_ARI_API_KEY missing)");
}
export async function youcomSearch(_args: any) {
  throw new Error("ARI search not configured");
}
export function extractNewsFromSearch(){ return []; }
