// features/analyze/atomicizer.ts
import { z } from "zod";
import { AtomicItemZ } from "./schemas";
import type { AtomicItem, ClarifyHint } from "./types";

export async function atomicize(input: {
  text: string;
  maxClaims?: number;
  locale?: "de" | "en";
}): Promise<{ ok: true; items: AtomicItem[]; needs: string[]; clarify: ClarifyHint[] }> {
  const text = String(input.text || "");
  const maxClaims = Math.max(1, Math.min(input.maxClaims ?? 6, 20));

  const sentences = text
    .split(/[\.\!\?;\n]+/g)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length >= 12) // verhindert A/B/C-Fragmente
    .slice(0, maxClaims);

  const items: AtomicItem[] = sentences.map((s) => ({
    text: s.endsWith(".") ? s : `${s}.`,
    sachverhalt: "-",
    zeitraum: "-",
    ort: "-",
    zustaendigkeit: "-",
    betroffene: [],
    messgroesse: "-",
    unsicherheiten: "-",
    sources: [],
  }));

  return {
    ok: true as const,
    items: z.array(AtomicItemZ).parse(items),
    needs: [],
    clarify: [],
  };
}
