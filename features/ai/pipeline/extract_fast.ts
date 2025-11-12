// features/ai/pipeline/extract_fast.ts
// Self-contained "fast extractor" ohne externe Provider-Imports.

const MODEL = (process.env.OPENAI_MODEL || "gpt-4o-mini").trim();
const FAST_BUDGET_MS = Number(process.env.FAST_BUDGET_MS ?? 4000);
const DEBUG = process.env.NODE_ENV !== "production";

type AskArgs = { prompt: string; maxOutputTokens?: number; signal?: AbortSignal };
type AskResult = { text: string; raw: any };

function extractTextFromResponses(data: any): string {
  const direct = typeof data?.output_text === "string" ? data.output_text : "";
  if (direct) return direct.trim();
  try {
    const blk = data?.output?.[0]?.content?.find?.((c: any) => c?.type === "output_text");
    if (blk?.text) return String(blk.text).trim();
  } catch {}
  return "";
}

async function openaiAsk({ prompt, maxOutputTokens = 700, signal }: AskArgs): Promise<AskResult> {
  const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  const res = await fetch(`${base}/responses`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}`,
    },
    body: JSON.stringify({
      model: MODEL,
      input: `${prompt}\n\nReturn ONLY valid JSON (RFC8259). No prose, no Markdown.`,
      max_output_tokens: maxOutputTokens,
    }),
    signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || JSON.stringify(data);
    const err: any = new Error(`OpenAI error ${res.status}: ${msg}`);
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return { text: extractTextFromResponses(data), raw: data };
}

function extractJsonObjectOrArray(text: string): any | null {
  if (!text) return null;
  const t = text.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
  try { return JSON.parse(t); } catch {}
  const openers = ["[", "{"], closers: Record<string,string> = { "[": "]", "{": "}" };
  for (const o of openers) {
    const c = closers[o]; const s = t.indexOf(o), e = t.lastIndexOf(c);
    if (s >= 0 && e > s) { try { return JSON.parse(t.slice(s, e + 1)); } catch {} }
  }
  return null;
}

function buildPrompt(text: string, maxClaims: number, locale: "de" | "en") {
  const schema = `
[
  {
    "text": string,
    "sachverhalt": string,
    "zeitraum": string,
    "ort": string,
    "zustaendigkeit": "EU"|"Bund"|"Land"|"Kommune",
    "betroffene": string[],
    "messgroesse": string,
    "unsicherheiten": string,
    "sources": string[]
  }
]`.trim();

  return `
Extract up to ${maxClaims} **atomic** policy claims from the input.
Each claim must be **one sentence** and fill the fields exactly as in this JSON schema (no extra keys):
${schema}

Rules:
- Exactly one sentence per claim (start uppercase, clean grammar).
- Merge near-duplicates; prefer the clearer one.
- Unknown fields: use "-" (empty array for lists).
- "zustaendigkeit" must be EU/Bund/Land/Kommune (most plausible).
- "sources": only real URLs or [].
- Output language: ${locale}.
- **Return JSON only. No prose, code fences, or Markdown.**

Input:
${text}`.trim();
}

function quickFallback(text: string, maxClaims: number) {
  const parts = String(text)
    .split(/[\.\!\?;\n]+/g)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length >= 8)
    .slice(0, maxClaims);

  return parts.map((p) => ({
    text: p.endsWith(".") ? p : `${p}.`,
    sachverhalt: "-",
    zeitraum: "-",
    ort: "-",
    zustaendigkeit: "-" as const,
    betroffene: [] as string[],
    messgroesse: "-",
    unsicherheiten: "-",
    sources: [] as string[],
  }));
}

export async function extractFast(input: { text: string; maxClaims: number; locale: "de" | "en" }) {
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort("AI_TIMEOUT"), FAST_BUDGET_MS);

  try {
    const prompt = buildPrompt(input.text, input.maxClaims, input.locale);
    const { text: out, raw } = await openaiAsk({ prompt, maxOutputTokens: 700, signal: controller.signal });
    const parsed = extractJsonObjectOrArray(out);
    if (Array.isArray(parsed) && parsed.length) {
      // Normalisierung: Nulls → "-"
      const claims = parsed.map((c: any) => ({
        text: String(c?.text ?? "-"),
        sachverhalt: String(c?.sachverhalt ?? "-"),
        zeitraum: String(c?.zeitraum ?? "-"),
        ort: String(c?.ort ?? "-"),
        zustaendigkeit: (c?.zustaendigkeit ?? "-") as string,
        betroffene: Array.isArray(c?.betroffene) ? c.betroffene.map((x: any) => String(x)) : [],
        messgroesse: String(c?.messgroesse ?? "-"),
        unsicherheiten: String(c?.unsicherheiten ?? "-"),
        sources: Array.isArray(c?.sources) ? c.sources.map((x: any) => String(x)) : [],
      }));
      return { ok: true as const, degraded: false, claims, _raw: DEBUG ? { out, raw } : undefined };
    }
    return { ok: true as const, degraded: true, reason: "AI_PARSE", claims: quickFallback(input.text, input.maxClaims) };
  } catch (e: any) {
    const reason = String(e?.message || e?.name || "AI_ERROR");
    return { ok: true as const, degraded: true, reason, claims: quickFallback(input.text, input.maxClaims), _err: DEBUG ? reason : undefined };
  } finally {
    clearTimeout(to);
  }
}
