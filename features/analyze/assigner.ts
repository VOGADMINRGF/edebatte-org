import { KEYWORDS, type Ebene } from "./types";

export type AssignerResult = {
  proposal: Ebene | null;
  confidence: number; // 0..1
  reason?: string;
};

// für die UI/Atomicizer-Logik:
export const AUTOFILL_THRESHOLD = Number(process.env.VOG_AUTOFILL_THRESHOLD ?? 0.6);

function score(textLower: string, words: readonly string[]): number {
  let s = 0;
  for (const w of words) if (w && textLower.includes(w)) s += 1;
  return s;
}

/** Heuristische Zuständigkeitsklassifikation (deterministisch & schnell). */
export function classifyZustaendigkeit(text: string): AssignerResult {
  const t = (text || "").toLowerCase();

  const scores: { ebene: Ebene; s: number }[] = [
    { ebene: "EU" as Ebene as Ebene,      s: score(t, KEYWORDS.EU) },
    { ebene: "Bund" as Ebene as Ebene,    s: score(t, KEYWORDS.Bund) },
    { ebene: "Land" as Ebene as Ebene,    s: score(t, KEYWORDS.Land) },
    { ebene: "Kommune" as Ebene as Ebene, s: score(t, KEYWORDS.Kommune) },
  ].sort((a,b)=>b.s-a.s);
  
  const best   = scores[0];
  const second = scores[1];

  if (!best || best.s === 0) {
    return { proposal: null, confidence: 0, reason: "Keine Schlüsselwörter gefunden" };
  }

  const denom = Math.max(0.001, best.s + (second?.s ?? 0));
  const confidence = best.s / denom;
  const reason = `${best.ebene} signalisiert durch Keywords (best=${best.s}${second ? `, second=${second.s}` : ""})`;

  return { proposal: best.ebene, confidence, reason };
}
