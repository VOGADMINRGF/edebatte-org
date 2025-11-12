import type { ProviderOutput } from "../types";
import { FACTCHECK_MODE } from "../policy.factcheck";
import { getDomain } from "../trust";

/**
 * ARI-Provider (stabil + typisiert)
 * - Live: POST an ARI-Endpoint (env: ARI_API_URL / ARI_API_KEY, optional ARI_TIMEOUT_MS)
 * - Mock: heuristische Antwort, wenn FACTCHECK_MODE !== "live"
 */
export async function runARI(claim: string, language?: string): Promise<ProviderOutput> {
  // --- MOCK-MODUS ------------------------------------------------------------
  if (FACTCHECK_MODE !== "live") {
    const trueHint  = /\b(daten|studie|bericht|offiziell|statistik|gesetz)\b/i.test(claim);
    const falseHint = /\b(gerücht|hörensagen|angeblich|man sagt)\b/i.test(claim);

    const verdict = trueHint ? "true" : falseHint ? "false" : "disputed";
    const confidence = trueHint || falseHint ? 0.88 : 0.72;

    const urls = ["https://example.org/report/123", "https://example.net/data/456"];
    const sources = await Promise.all(
      urls.map(async (url) => ({ url, domain: await getDomain(url) }))
    );

    return { provider: "ARI", verdict, confidence, sources, raw: { mock: true }, costTokens: 1200 };
  }

  // --- LIVE-MODUS ------------------------------------------------------------
  const endpoint = process.env.ARI_API_URL || process.env.ARI_ENDPOINT;
  const apiKey   = process.env.ARI_API_KEY;
  if (!endpoint || !apiKey) {
    // Fallback: „disputed“ statt harter Crash – verhindert 500er in der Pipeline
    return {
      provider: "ARI",
      verdict: "disputed",
      confidence: 0.0,
      sources: [],
      raw: { error: "ARI not configured", endpoint: !!endpoint, apiKey: !!apiKey },
      costTokens: 0,
    };
  }

  // Timeout-Guard (default 18s; via ARI_TIMEOUT_MS übersteuerbar)
  const timeoutMs = Number(process.env.ARI_TIMEOUT_MS ?? 18_000);
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: claim, language }),
    });

    if (!res.ok) {
      // weiches Fehlerbild
      return {
        provider: "ARI",
        verdict: "disputed",
        confidence: 0.0,
        sources: [],
        raw: { status: res.status, statusText: res.statusText },
        costTokens: 0,
      };
    }

    // TS 5.9: Response.json() ist 'unknown' -> bewusst typisieren
    const data = (await res.json().catch(() => null)) as any;

    // flexibles Mapping: manche ARI-Varianten liefern `sources: string[]`,
    // andere `items: {url:string}[]` – wir unterstützen beide.
    const sourceUrls: string[] = Array.isArray(data?.sources)
      ? (data.sources as string[])
      : Array.isArray(data?.items)
      ? (data.items.map((it: any) => it?.url).filter(Boolean) as string[])
      : [];

    const sources = await Promise.all(
      sourceUrls.map(async (url) => ({ url, domain: await getDomain(url) }))
    );

    const verdict: ProviderOutput["verdict"] =
      data?.verdict === "true" || data?.verdict === "false" || data?.verdict === "disputed"
        ? data.verdict
        : "disputed";

    const confidence = typeof data?.confidence === "number" ? data.confidence : 0.0;
    const costTokens = typeof data?.tokens === "number" ? data.tokens : 0;

    return { provider: "ARI", verdict, confidence, sources, raw: data, costTokens };
  } catch (err: any) {
    // Timeout/Netzfehler -> defensiv zurückgeben
    return {
      provider: "ARI",
      verdict: "disputed",
      confidence: 0.0,
      sources: [],
      raw: { error: err?.message ?? String(err) },
      costTokens: 0,
    };
  } finally {
    clearTimeout(t);
  }
}
