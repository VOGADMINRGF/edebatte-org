// core/gpt/analyzeContribution.ts
import type { AnyAnalysis } from "./schemas";
import { runOrchestratedTask } from "@features/ai/orchestrator";    // <-- relativ
import { runARI } from "../factcheck/providers/ari.provider";            // <-- relativ
import { cacheGet, cacheSet } from "@features/contribution/utils/cacheAIResponses";

type Mode = "impact" | "alternatives" | "factcheck";
type Locale = "de" | "en";

const FEATURE_AI_ARBITER =
  (process.env.FEATURE_AI_ARBITER ?? "true").toLowerCase() === "true";
const ENABLE_CACHE =
  (process.env.FEATURE_TRANSLATION_CACHE ?? "true").toLowerCase() === "true";

const ARI_ENRICH =
  (process.env.FEATURE_ARI_ENRICH ?? "true").toLowerCase() === "true";
const ARI_ENRICH_LIMIT = Number(process.env.ARI_ENRICH_LIMIT ?? 5);
const CACHE_TTL_SECONDS = Number(process.env.ANALYZE_CACHE_TTL ?? 3600);

export async function analyzeContribution(input: {
  mode: Mode;
  content: string;
  locale?: Locale;
}): Promise<AnyAnalysis> {
  const locale: Locale = input.locale ?? "de";

  const task =
    input.mode === "impact"
      ? "impact_only"
      : input.mode === "alternatives"
      ? "alternatives_only"
      : locale === "de"
      ? "factcheck_de"
      : "factcheck_en";

  const cacheKey = `analyze:v2:${task}:${locale}:${hash(input.content)}`;
  if (ENABLE_CACHE) {
    const cached = await cacheGet(cacheKey);
    if (cached) {
      try { return JSON.parse(String(cached)) as AnyAnalysis; } catch {}
    }
  }

  const res = await runOrchestratedTask(task as any, { text: input.content, locale });
  if (!res.ok) {
    throw new Error(`Analyze failed: ${res.error}${res.lastProvider ? ` [last=${res.lastProvider}]` : ""}`);
  }

  let analysis = res.parsed as AnyAnalysis;

  // ARI-Anreicherung nur für Factcheck
  if (ARI_ENRICH && analysis.type === "factcheck") {
    const items = analysis.items ?? [];
    const subset = items.slice(0, ARI_ENRICH_LIMIT);
    const enriched = await Promise.all(
      subset.map(async (it) => {
        try {
          const ari = await runARI(it.claim, locale);
          return {
            ...it,
            sources: dedupeSources([...(it.sources ?? []), ...(ari.sources ?? [])]),
            ari: { verdict: ari.verdict, confidence: ari.confidence, provider: "ARI" },
          };
        } catch { return it; }
      })
    );
    analysis = {
      ...analysis,
      items: items.map((orig, i) => (i < enriched.length ? enriched[i] : orig)),
      summary: analysis.summary ?? "Fact-check synthesized via LLM; ARI enrichment applied.",
    } as AnyAnalysis;
  }

  if (ENABLE_CACHE) {
    try { await cacheSet(cacheKey, JSON.stringify(analysis), CACHE_TTL_SECONDS); } catch {}
  }
  return analysis;
}

/* helpers */
function hash(s: string): string { let h = 0; for (let i = 0; i < s.length; i++) h = ((h<<5)-h + s.charCodeAt(i))|0; return String(h>>>0); }
function dedupeSources(sources: any[]) {
  const seen = new Set<string>(); const out: any[] = [];
  for (const s of sources ?? []) {
    const k = (s.url || s.title || JSON.stringify(s)).toLowerCase();
    if (!seen.has(k)) { seen.add(k); out.push(s); }
  }
  return out;
}
