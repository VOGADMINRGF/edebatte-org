// apps/web/src/app/api/contributions/analyze/route.ts
import { NextRequest } from "next/server";
import OpenAI from "openai";
import { postprocessClaims } from "@features/analyze/postprocess";

/* ---- config ---- */
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const MODEL = (process.env.OPENAI_MODEL || "gpt-4o-mini").trim();

/* ---- helpers ---- */
const JSON_HEADERS = { "content-type": "application/json" } as const;
const ok = (data: any, status = 200) =>
  new Response(JSON.stringify({ ok: true, ...data }), { status, headers: JSON_HEADERS });
const fail = (error: string, trace: string, status = 500, extra: any = {}) =>
  new Response(JSON.stringify({ ok: false, error, trace, ...extra }), {
    status,
    headers: JSON_HEADERS,
  });

/* ---- classify → frames ---- */
function classifyKind(text: string): "policy" | "fact" | "value" | "concern" | "question" {
  const t = text.toLowerCase();
  if (/(soll(en)?|muss|wir sollten|einführen|abschaffen|umsetzen)/i.test(t)) return "policy";
  if (/(war|ist|beträgt|liegen bei|gibt es|hat sich.*(erhöht|verringert)|wurde\b)/i.test(t)) return "fact";
  if (/(richtig|falsch|gerecht|ungerecht|gut|schlecht|wünschenswert|untragbar)/i.test(t)) return "value";
  if (/(gefahr|risiko|sorge|führt zu|wird.*problematisch|belastung|nachteil)/i.test(t)) return "concern";
  if (/(\?|warum|wie|wer|wieviel|welche)/i.test(t)) return "question";
  return /(^| )soll( |$)/.test(t) ? "policy" : "fact";
}
function frameClaims(clean: any[]) {
  const frames = { facts: [] as any[], policies: [] as any[], values: [] as any[], concerns: [] as any[], questions: [] as any[] };
  for (const c of clean) {
    const kind = classifyKind(String(c?.text || ""));
    const base = {
      kind,
      text: c.text,
      sachverhalt: c.sachverhalt ?? "-",
      zeitraum: c.zeitraum ?? "-",
      ort: c.ort ?? "-",
      zustaendigkeit: c.zustaendigkeit ?? "-",
      betroffene: Array.isArray(c.betroffene) ? c.betroffene : [],
      messgroesse: c.messgroesse ?? "-",
      unsicherheiten: c.unsicherheiten ?? "-",
      sources: Array.isArray(c.sources) ? c.sources : [],
    };
    switch (kind) {
      case "policy":
        frames.policies.push({ ...base, agent: "-", action: "-", timeframe: "-" });
        break;
      case "value": frames.values.push(base); break;
      case "concern": frames.concerns.push(base); break;
      case "question": frames.questions.push(base); break;
      default: frames.facts.push(base); break;
    }
  }
  return frames;
}

/* ---- schema (entspannt, robust) ---- */
const ANALYZE_RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    outline: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          summary: { type: "string" },
          start: { type: "integer" },
          end: { type: "integer" },
        },
        required: ["id", "label", "summary"],
      },
    },
    claims: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          text: { type: "string" },
          sachverhalt: { type: "string" },
          zeitraum: { type: "string" },
          ort: { type: "string" },
          zustaendigkeit: { type: "string", enum: ["EU", "Bund", "Land", "Kommune", "-"] },
          betroffene: { type: "array", items: { type: "string" } },
          messgroesse: { type: "string" },
          unsicherheiten: { type: "string" },
          sources: { type: "array", items: { type: "string" } },
          context: { type: "array", items: { type: "string" } },
        },
        // context bewusst NICHT required -> robuster
        required: [
          "text",
          "sachverhalt",
          "zeitraum",
          "ort",
          "zustaendigkeit",
          "betroffene",
          "messgroesse",
          "unsicherheiten",
          "sources",
        ],
      },
    },
  },
  required: ["outline", "claims"],
} as const;

/* ---- prompt ---- */
const SYSTEM = (locale: "de" | "en", maxClaims: number) =>
  [
    "Du extrahierst atomare, 1-satzige Claims samt Metadaten.",
    "Vervollständige Felder; unbekannt = '-' (listen: []).",
    `maxClaims: ${maxClaims}. Sprache: ${locale}.`,
    "Antwort NUR als JSON (outline[], claims[]).",
  ].join("\n");

/* ---- route ---- */
export async function POST(req: NextRequest) {
  const trace = Math.random().toString(36).slice(2, 10);
  try {
    const body = await req.json().catch(() => null);
    const text = String(body?.text || "").slice(0, 8000);
    const maxClaims = Math.max(1, Math.min(Number(body?.maxClaims ?? 8), 20));
    const locale: "de" | "en" = body?.locale === "en" ? "en" : "de";

    if (!text.trim()) return fail("INVALID_INPUT", trace, 400);

    const resp = await openai.responses.create({
      model: MODEL,
      input: [
        { role: "system", content: SYSTEM(locale, maxClaims) },
        { role: "user", content: [{ type: "input_text", text }] },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "AnalyzeResult",
          schema: ANALYZE_RESULT_SCHEMA as any,
          strict: true,
        },
      },
    });

    const raw = (resp as any).output_text as string | undefined;
    if (!raw) return fail("NO_OUTPUT_TEXT", trace, 502);

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return fail("INVALID_JSON_FROM_MODEL", trace, 502, { raw });
    }

    const outline = Array.isArray(parsed?.outline) ? parsed.outline : [];
    const claimsIn = Array.isArray(parsed?.claims) ? parsed.claims : [];

    // ===== Post-Processing =====
    // 1) Normalize + hard-cap
    const normalized = claimsIn
      .map((cl: any) => ({
        text: String(cl?.text ?? "").trim().replace(/\s+/g, " ").replace(/\.$/, "") + ".",
        sachverhalt: cl?.sachverhalt ?? "-",
        zeitraum: cl?.zeitraum ?? "-",
        ort: cl?.ort ?? "-",
        zustaendigkeit: cl?.zustaendigkeit ?? "-",
        betroffene: Array.isArray(cl?.betroffene) ? cl.betroffene : [],
        messgroesse: cl?.messgroesse ?? "-",
        unsicherheiten: cl?.unsicherheiten ?? "-",
        sources: Array.isArray(cl?.sources) ? cl.sources : [],
      }))
      .slice(0, maxClaims);

    // 2) Dedupe + Cluster → Statements (repräsentative Vertreter)
    const { clusters, statements } = postprocessClaims(normalized, { simThresh: 0.74 });

    // 3) Frames aus repr. Statements bauen (kompakt + UI-freundlich)
    const reps = statements.map((s) => s.rep);
    const frames = frameClaims(reps);

    return ok({
      outline,
      degraded: false,
      clusters,
      statements,
      claims: reps,   // Kompatibel für bestehende UI
      frames,         // Neu: Buckets {facts, policies, values, concerns, questions}
      meta: { model: MODEL, trace },
    });
  } catch (e: any) {
    return fail(e?.message || "AI_ERROR", trace, 500);
  }
}
