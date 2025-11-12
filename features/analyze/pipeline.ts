// features/analyze/pipeline.ts
import type { AtomicItem, ClarifyHint } from "./types";
import { atomicize } from "./atomicizer";

export async function analyzeText(params: {
  text: string;
  cmd?: "atomicize" | "orchestrate";
  maxClaims?: number;
  locale?: "de" | "en";
}): Promise<
  | { ok: true; items: AtomicItem[]; needs: string[]; clarify: ClarifyHint[] }
  | { ok: false; error: string }
> {
  const { text, maxClaims, locale } = params;
  if (!text || !text.trim()) return { ok: false, error: "missing_text" };
  // aktuell nur Atomicize – Orchestrator kommt später
  return atomicize({ text, maxClaims, locale });
}
