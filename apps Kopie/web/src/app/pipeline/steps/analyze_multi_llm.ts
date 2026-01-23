import { orchestrateContribution } from "@features/ai/orchestrator_contrib";
import { civicSearchStrict } from "@features/search/civic";

export async function step_analyze_multi_llm(text: string, { maxClaims = 5 }: { maxClaims?: number } = {}) {
  const prompt = [
    "Analysiere den Bürgertext und gib NUR gültiges JSON (RFC8259) zurück.",
    "Schema: {",
    '  "language": "de"|"en"|null,',
    '  "mainTopic": string|null,',
    '  "subTopics": string[],',
    '  "regionHint": string|null,',
    '  "claims": [ { "text": string, "categoryMain": string|null, "categorySubs": string[], "region": string|null, "authority": string|null } ],',
    '  "news": [], "scoreHints": { "baseWeight": number, "reasons": string[] }, "cta": null',
    "}",
    "Beachte: maximal " + maxClaims + " prägnante Claims; keine Erklärtexte.",
    "Text:",
    text,
  ].join("\n");

  const { runs, best } = await orchestrateContribution(prompt, { json: true });
  let parsed: any = {};
  let parseErr: string | null = null;
  try { parsed = JSON.parse(String(best?.text || "{}")); }
  catch (e:any) { parseErr = "json-parse-failed"; parsed = {}; }

  const result = {
    language: parsed?.language ?? null,
    mainTopic: parsed?.mainTopic ?? null,
    subTopics: Array.isArray(parsed?.subTopics) ? parsed.subTopics : [],
    regionHint: parsed?.regionHint ?? null,
    claims: Array.isArray(parsed?.claims) ? parsed.claims : [],
    news: [],
    scoreHints: parsed?.scoreHints ?? null,
    cta: null,
  };

  // STRICT civic search (fallback wenn ARI später greift) — nur wenn mainTopic/claims vorhanden
  const kw = new Set<string>();
  if (typeof result.mainTopic === "string") kw.add(result.mainTopic);
  (result.subTopics||[]).forEach((s:string)=> kw.add(s));
  (result.claims||[]).slice(0,3).forEach((c:any)=>{
    String(c?.text||"").split(/[^A-Za-zÄÖÜäöüß0-9-]+/).forEach(w=>{
      if (w.length>3) kw.add(w);
    });
  });

  let civic = await civicSearchStrict({
    topic: result.mainTopic || undefined,
    region: result.regionHint || undefined,
    keywords: Array.from(kw).slice(0,12),
    limit: 10
  });

  const news = civic.ok ? civic.items : [];
  const logs: string[] = [];
  logs.push(
    civic.ok
      ? `civic:${news.length}`
      : `civic-error:${"error" in civic ? civic.error : "unknown"}`,
  );

  return {
    ...result,
    news,
    _meta: {
      mode: "multi",
      errors: parseErr ? [parseErr] : null,
      tookMs: 0,
      gptText: best?.text || null,
      runs,
      picked: best ? runs.find(r=>r.text===best.text)?.provider : null,
      logs
    } as any
  };
}
