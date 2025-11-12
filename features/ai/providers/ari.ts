// features/ai/providers/ari.ts
import { queryAri } from "@core/ari/ariClient";

export async function callAri(prompt: string, opts: { topK?: number } = {}) {
  const r = await queryAri({ query: prompt.trim(), topK: opts.topK ?? 20, format: "json" });
  if (!r.ok) throw new Error(r.error || "ARI error");
  // Orchestrator erwartet Text -> JSON-String
  return { text: JSON.stringify({ sources: r.items }), raw: r };
}
