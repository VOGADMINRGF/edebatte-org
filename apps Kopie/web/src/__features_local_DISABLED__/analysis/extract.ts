import { analyzeContribution, type AnalyzeResult } from "@features/analyze/analyzeContribution";

/** Legacy-Wrapper: liefert nur die Claims zurück (Fallback v1/v3) */
export async function extractContributions(text: string): Promise<{ claims: AnalyzeResult["claims"] }> {
  const r = await analyzeContribution({ text: String(text ?? "") });
  return { claims: r.claims || [] };
}

export { analyzeContribution };
export type { AnalyzeResult };
