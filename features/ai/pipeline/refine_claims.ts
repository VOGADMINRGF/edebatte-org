// features/ai/pipeline/refine_claims.ts
// Self-contained Refine-Pass: wählt 1 Primary-Claim, ergänzt Felder, Rest → Drafts.

const MODEL = (process.env.OPENAI_MODEL || "gpt-4o-mini").trim();
const REFINE_BUDGET_MS = Number(process.env.REFINE_BUDGET_MS ?? 20000);
const DEBUG = process.env.NODE_ENV !== "production";

type Claim = {
  text: string;
  sachverhalt: string;
  zeitraum: string;
  ort: string;
  zustaendigkeit: string;
  betroffene: string[];
  messgroesse: string;
  unsicherheiten: string;
  sources: string[];
};

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

async function openaiAsk({ prompt, maxOutputTokens = 800, signal }: AskArgs): Promise<AskResult> {
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
  const openers = ["{", "["], closers: Record<string,string> = { "{": "}", "[": "]" };
  for (const o of openers) {
    const c = closers[o]; const s = t.indexOf(o), e = t.lastIndexOf(c);
    if (s >= 0 && e > s) { try { return JSON.parse(t.slice(s, e + 1)); } catch {} }
  }
  return null;
}

function buildPromptRefine(locale: "de" | "en", claims: Claim[]) {
  const inputJson = JSON.stringify(claims);
  const schema = `
{
  "primaryIndex": number,
  "claims": [
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
  ],
  "draftIndexes": number[]
}`.trim();

  return `
You are a careful editor. Pick exactly ONE primary claim that is most concrete and policy-ready.
- Improve fields (fill "-" where unknown, arrays may be empty).
- Keep the other claims as drafts; return their indexes in "draftIndexes".
- Do NOT invent URLs. Only real ones or [].
- Output language: ${locale}.
- Return exactly this JSON shape:
${schema}

Input claims JSON:
${inputJson}`.trim();
}

export async function refineClaims(input: { locale: "de" | "en"; claims: Claim[] }) {
  // Vor-Normalisierung gegen "string | null"
  const sanitized = input.claims.map((c) => ({
    text: String(c?.text ?? "-"),
    sachverhalt: String(c?.sachverhalt ?? "-"),
    zeitraum: String(c?.zeitraum ?? "-"),
    ort: String(c?.ort ?? "-"),
    zustaendigkeit: String(c?.zustaendigkeit ?? "-"),
    betroffene: Array.isArray(c?.betroffene) ? c.betroffene.map((x) => String(x)) : [],
    messgroesse: String(c?.messgroesse ?? "-"),
    unsicherheiten: String(c?.unsicherheiten ?? "-"),
    sources: Array.isArray(c?.sources) ? c.sources.map((x) => String(x)) : [],
  }));

  const controller = new AbortController();
  const to = setTimeout(() => controller.abort("AI_TIMEOUT"), REFINE_BUDGET_MS);

  try {
    const prompt = buildPromptRefine(input.locale, sanitized);
    const { text, raw } = await openaiAsk({ prompt, maxOutputTokens: 900, signal: controller.signal });
    const parsed = extractJsonObjectOrArray(text);

    if (parsed && typeof parsed === "object") {
      const primaryIndex = Math.max(0, Math.min(Number(parsed.primaryIndex ?? 0), sanitized.length - 1));
      const outClaims: Claim[] = Array.isArray(parsed.claims)
        ? parsed.claims.map((c: any) => ({
            text: String(c?.text ?? "-"),
            sachverhalt: String(c?.sachverhalt ?? "-"),
            zeitraum: String(c?.zeitraum ?? "-"),
            ort: String(c?.ort ?? "-"),
            zustaendigkeit: String(c?.zustaendigkeit ?? "-"),
            betroffene: Array.isArray(c?.betroffene) ? c.betroffene.map((x: any) => String(x)) : [],
            messgroesse: String(c?.messgroesse ?? "-"),
            unsicherheiten: String(c?.unsicherheiten ?? "-"),
            sources: Array.isArray(c?.sources) ? c.sources.map((x: any) => String(x)) : [],
          }))
        : sanitized;

      const draftIndexes: number[] = Array.isArray(parsed.draftIndexes)
        ? parsed.draftIndexes.map((n: any) => Number(n)).filter((n: number) => n >= 0 && n < sanitized.length && n !== primaryIndex)
        : sanitized.map((_, i) => i).filter((i) => i !== primaryIndex);

      return { ok: true as const, degraded: false, primaryIndex, claims: outClaims, draftIndexes, _raw: DEBUG ? { text, raw } : undefined };
    }

    return {
      ok: true as const,
      degraded: true,
      reason: "AI_PARSE",
      primaryIndex: 0,
      claims: sanitized,
      draftIndexes: sanitized.length > 1 ? sanitized.slice(1).map((_, i) => i + 1) : [],
    };
  } catch (e: any) {
    const reason = String(e?.message || e?.name || "AI_ERROR");
    return {
      ok: true as const,
      degraded: true,
      reason,
      primaryIndex: 0,
      claims: sanitized,
      draftIndexes: sanitized.length > 1 ? sanitized.slice(1).map((_, i) => i + 1) : [],
      _err: DEBUG ? reason : undefined,
    };
  } finally {
    clearTimeout(to);
  }
}
