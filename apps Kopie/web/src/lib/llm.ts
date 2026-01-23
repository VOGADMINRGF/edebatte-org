// apps/web/src/lib/llm.ts
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-2024-08-06";

/* ---------- robuste JSON-Extraktion ---------- */
function tryParse(s: string): any | null { try { return JSON.parse(s); } catch { return null; } }
function extractAnyJson(payload: any): any | null {
  if (!payload) return null;
  if (typeof payload?.output_text === "string") { const x = extractAnyJson(payload.output_text); if (x) return x; }
  const blocks = payload?.output?.[0]?.content;
  if (Array.isArray(blocks)) for (const b of blocks) {
    if (b?.json) {
      const j = typeof b.json === "string" ? tryParse(b.json) : b.json;
      if (j && (Array.isArray(j) || typeof j === "object")) return j;
    }
    if (typeof b?.text === "string") { const j = extractAnyJson(b.text); if (j) return j; }
    if (typeof b?.output_text === "string") { const j = extractAnyJson(b.output_text); if (j) return j; }
  }
  if (typeof payload === "string") {
    const t = payload.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
    const direct = tryParse(t); if (direct) return direct;
    const i1 = t.indexOf("{"), j1 = t.lastIndexOf("}"); if (i1 >= 0 && j1 > i1) { const sub = tryParse(t.slice(i1, j1 + 1)); if (sub) return sub; }
    const i2 = t.indexOf("["), j2 = t.lastIndexOf("]"); if (i2 >= 0 && j2 > i2) { const sub = tryParse(t.slice(i2, j2 + 1)); if (sub) return sub; }
  }
  const s = JSON.stringify(payload ?? "");
  const i = s.indexOf("{"), j = s.lastIndexOf("}"); if (i >= 0 && j > i) { const sub = tryParse(s.slice(i, j + 1)); if (sub) return sub; }
  return null;
}

/* ---------- Schema wie in analyze/route ---------- */
const ANALYZE_RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    ok: { type: "boolean" },
    degraded: { type: "boolean" },
    reason: { type: ["string", "null"] },
    outline: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" }, label: { type: "string" },
          start: { type: "integer" }, end: { type: "integer" },
          summary: { type: "string" },
        },
        required: ["id", "label", "summary"], // start/end bewusst optional
      },
    },
    claims: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          text: { type: "string" }, sachverhalt: { type: "string" },
          zeitraum: { type: "string" }, ort: { type: "string" },
          zustaendigkeit: { type: "string", enum: ["EU","Bund","Land","Kommune","-"] },
          betroffene: { type: "array", items: { type: "string" } },
          messgroesse: { type: "string" }, unsicherheiten: { type: "string" },
          sources: { type: "array", items: { type: "string" } },
          context: { type: "array", items: { type: "string" } },
        },
        required: ["text","sachverhalt","zeitraum","ort","zustaendigkeit","betroffene","messgroesse","unsicherheiten","sources"],
      },
    },
    meta: { type: "object", additionalProperties: true },
  },
  required: ["outline","claims"],
} as const;

/* ---------- Public API ---------- */
export async function analyzeWithGptJSON(text: string): Promise<{
  topics: Array<{ topic: string; score: number }>;
  theses: Array<{ text: string; relevance: number; domain: string }>;
  statements: Array<{ text: string }>;
}> {
  const system =
    `Du extrahierst atomare Kernaussagen und eine thematische Gliederung (outline). ` +
    `Antwort ausschließlich als JSON gemäß Schema.`;

  const prompt = `${system}\n\n<<<TEXT>>>\n${String(text).slice(0, 8000)}\n<<<END>>>`;

  const resp = await openai.responses.create({
    model: MODEL,
    input: [{ role: "user", content: [{ type: "input_text", text: prompt }] }],
    text: { format: { type: "json_schema", name: "AnalyzeResult", schema: ANALYZE_RESULT_SCHEMA as any, strict: true } },
  });

  const parsed = extractAnyJson(resp);
  const outline = Array.isArray(parsed?.outline) ? parsed.outline : [];
  const claims  = Array.isArray(parsed?.claims)  ? parsed.claims  : [];

  // Map auf Pipeline-Shape:
  const topics = outline.map((o: any) => ({ topic: String(o.label || o.summary || o.id || "Thema"), score: 1 }));
  const theses = claims.map((c: any) => ({
    text: String(c.text || "").trim(),
    relevance: 0.8, // heuristischer Default; kann später modellbasiert werden
    domain: String(c.zustaendigkeit || "Allgemein"),
  }));
  const statements = claims.map((c: any) => ({ text: String(c.text || "").trim() }));

  return { topics, theses, statements };
}
