// apps/web/src/app/api/contributions/analyze/route.ts
import { NextRequest } from "next/server";
import { postprocessClaims } from "@features/analyze/postprocess";

/* ---------- helpers ---------- */
const JSON_HEADERS = { "content-type": "application/json" } as const;
function ok(data: any, status = 200) {
  return new Response(JSON.stringify({ ok: true, ...data }), { status, headers: JSON_HEADERS });
}
function err(error: string, extra: any = {}, status = 500) {
  return new Response(JSON.stringify({ ok: false, error, ...extra }), { status, headers: JSON_HEADERS });
}
function tryParse(s: string): any | null { try { return JSON.parse(s); } catch { return null; } }

/** robust JSON extraction from Responses API shapes */
function extractAnyJson(payload: any): any | null {
  if (!payload) return null;

  // 1) Structured content blocks
  const blocks = payload?.output?.[0]?.content;
  if (Array.isArray(blocks)) {
    for (const b of blocks) {
      if (b?.json) {
        const j = typeof b.json === "string" ? tryParse(b.json) : b.json;
        if (j && (Array.isArray(j) || typeof j === "object")) return j;
      }
      if (typeof b?.text === "string") {
        const t = b.text.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
        const j = tryParse(t); if (j) return j;
      }
    }
  }

  // 2) output_text (string)
  if (typeof payload?.output_text === "string") {
    const t = payload.output_text.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
    const j = tryParse(t); if (j) return j;
    const i1 = t.indexOf("{"), j1 = t.lastIndexOf("}");
    if (i1 >= 0 && j1 > i1) { const sub = tryParse(t.slice(i1, j1 + 1)); if (sub) return sub; }
    const i2 = t.indexOf("["), j2 = t.lastIndexOf("]");
    if (i2 >= 0 && j2 > i2) { const sub = tryParse(t.slice(i2, j2 + 1)); if (sub) return sub; }
  }

  // 3) last resort: search in stringified
  const s = JSON.stringify(payload ?? "");
  const i = s.indexOf("{"), j = s.lastIndexOf("}");
  if (i >= 0 && j > i) { const sub = tryParse(s.slice(i, j + 1)); if (sub) return sub; }

  return null;
}

/* ---------- config ---------- */
const OPENAI_BASE = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
const MODEL = (process.env.OPENAI_MODEL || process.env.FAST_MODEL || "gpt-4o-mini").trim();
const FAST_BUDGET_MS = Number(process.env.FAST_BUDGET_MS ?? 16000);
const MAX_CLAIMS_DEFAULT = 6;
const MAX_CLAIMS_HARD = 20;

/* ---------- JSON-Schema for claims ---------- */
const CLAIMS_JSON_SCHEMA = {
  name: "claims_payload",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      claims: {
        type: "array",
        maxItems: MAX_CLAIMS_HARD,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            text: { type: "string", minLength: 3 },
            sachverhalt: { type: "string" },
            zeitraum: { type: "string" },
            ort: { type: "string" },
            zustaendigkeit: { type: "string", enum: ["EU","Bund","Land","Kommune","-"] },
            betroffene: { type: "array", items: { type: "string" } },
            messgroesse: { type: "string" },
            unsicherheiten: { type: "string" },
            sources: { type: "array", items: { type: "string" } }
          },
          required: ["text","sachverhalt","zeitraum","ort","zustaendigkeit","betroffene","messgroesse","unsicherheiten","sources"]
        }
      }
    },
    required: ["claims"]
  },
  strict: true
} as const;

/* ---------- OpenAI Responses API helpers ---------- */
async function askJsonClaims(prompt: string, { maxOutputTokens = 1200, signal }: { maxOutputTokens?: number; signal?: AbortSignal } = {}) {
  // First try strict json_schema
  let res = await fetch(`${OPENAI_BASE}/responses`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}` },
    body: JSON.stringify({
      model: MODEL,
      input: prompt,
      text: { format: { type: "json_schema", json_schema: CLAIMS_JSON_SCHEMA } },
      max_output_tokens: maxOutputTokens,
    }),
    signal
  });

  let data = await res.json().catch(() => ({}));
  if (res.ok) {
    const parsed = extractAnyJson(data);
    if (Array.isArray(parsed?.claims) && parsed.claims.length) return { parsed, raw: data };
  }

  // Fallback: plain json_object (still robustly parsed)
  res = await fetch(`${OPENAI_BASE}/responses`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}` },
    body: JSON.stringify({
      model: MODEL,
      input: prompt,
      text: { format: { type: "json_object" } },
      max_output_tokens: maxOutputTokens,
    }),
    signal
  });

  data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || JSON.stringify(data);
    const e: any = new Error(`OpenAI error ${res.status}: ${msg}`);
    e.status = res.status; e.payload = data; throw e;
  }
  const parsed2 = extractAnyJson(data);
  return { parsed: parsed2, raw: data };
}

/* ---------- prompt & splitting ---------- */
function buildPrompt(text: string, maxClaims: number, locale: "de" | "en") {
  return `
Erzeuge ein JSON-Objekt {"claims":[{ "text":string, "sachverhalt":string, "zeitraum":string, "ort":string, "zustaendigkeit":"EU"|"Bund"|"Land"|"Kommune"|"-", "betroffene":string[], "messgroesse":string, "unsicherheiten":string, "sources":string[] }]}.
Regeln:
- Bis zu ${maxClaims} **atomare** Aussagen (je Claim genau **1 Satz**).
- Alle Felder füllen; Unbekanntes als "-" (Listen: []).
- Nur **valide JSON** (keine Erklärtexte/Markdown).
- Sprache: ${locale}.
INPUT:
${text.slice(0, 8000)}
`.trim();
}

function chunkParagraphs(t: string): string[] {
  const paras = String(t).split(/\n{2,}/g).map(s => s.trim()).filter(Boolean);
  const out: string[] = [];
  for (const p of paras) {
    const sentences = p.split(/(?<=[\.\!\?])\s+/g).map(s => s.trim()).filter(s => s.length >= 8);
    let buf = "";
    for (const s of sentences) {
      if ((buf + " " + s).length < 900) buf = buf ? buf + " " + s : s;
      else { if (buf) out.push(buf); buf = s; }
    }
    if (buf) out.push(buf);
  }
  return out.length ? out : [t];
}

/* ---------- Quick Fallback (Tweaked) ---------- */
function quickFallback(text: string, maxClaims: number) {
  const parts = String(text)
    .split(/[\.\!\?;\n]+/g)
    .map(s => s.replace(/\s+/g, " ").trim())
    .filter(s => s.length >= 12) // ⬅️ Mini-Tweak: verhindert A/B/C-Fragmente
    .slice(0, maxClaims);

  return parts.map(p => ({
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

export const dynamic = "force-dynamic";

/* ---------- POST ---------- */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body?.text || typeof body.text !== "string") return err("INVALID_JSON", {}, 400);

    const text = String(body.text).trim();
    const maxClaims = Math.max(1, Math.min(Number(body.maxClaims ?? MAX_CLAIMS_DEFAULT), MAX_CLAIMS_HARD));
    const locale: "de" | "en" = body?.locale === "en" ? "en" : "de";

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort("AI_TIMEOUT"), FAST_BUDGET_MS);

    let claims: any[] = [];
    let anyModelOk = false;
    let reason: "AI_TIMEOUT" | "AI_PARSE" | "AI_ERROR" | undefined;

    try {
      const chunks = chunkParagraphs(text);
      for (const c of chunks) {
        if (claims.length >= maxClaims) break;
        const { parsed } = await askJsonClaims(buildPrompt(c, maxClaims - claims.length, locale), { maxOutputTokens: 1200, signal: controller.signal });
        const arr = Array.isArray(parsed?.claims) ? parsed.claims : (Array.isArray(parsed) ? parsed : []);
        if (Array.isArray(arr) && arr.length) {
          for (const cl of arr) {
            const t = String(cl?.text ?? "").trim();
            if (!t) continue;
            claims.push({
              text: t.endsWith(".") ? t : `${t}.`,
              sachverhalt: cl?.sachverhalt ?? "-",
              zeitraum: cl?.zeitraum ?? "-",
              ort: cl?.ort ?? "-",
              zustaendigkeit: cl?.zustaendigkeit ?? "-",
              betroffene: Array.isArray(cl?.betroffene) ? cl.betroffene : [],
              messgroesse: cl?.messgroesse ?? "-",
              unsicherheiten: cl?.unsicherheiten ?? "-",
              sources: Array.isArray(cl?.sources) ? cl.sources : [],
            });
            if (claims.length >= maxClaims) break;
          }
          anyModelOk = true;
        }
      }

      if (claims.length === 0) {
        const { parsed } = await askJsonClaims(buildPrompt(text, maxClaims, locale), { maxOutputTokens: 1200, signal: controller.signal });
        const arr = Array.isArray(parsed?.claims) ? parsed.claims : (Array.isArray(parsed) ? parsed : []);
        if (Array.isArray(arr) && arr.length) {
          claims = arr.slice(0, maxClaims).map((cl: any) => ({
            text: String(cl?.text ?? "").trim().replace(/\s+/g, " ").replace(/\.$/, "") + ".",
            sachverhalt: cl?.sachverhalt ?? "-",
            zeitraum: cl?.zeitraum ?? "-",
            ort: cl?.ort ?? "-",
            zustaendigkeit: cl?.zustaendigkeit ?? "-",
            betroffene: Array.isArray(cl?.betroffene) ? cl.betroffene : [],
            messgroesse: cl?.messgroesse ?? "-",
            unsicherheiten: cl?.unsicherheiten ?? "-",
            sources: Array.isArray(cl?.sources) ? cl.sources : [],
          }));
          anyModelOk = true;
        } else {
          reason = "AI_PARSE";
        }
      }
    } catch (e: any) {
      reason = /AI_TIMEOUT|AbortError/.test(String(e?.message)) ? "AI_TIMEOUT" : "AI_ERROR";
    } finally {
      clearTimeout(timer);
    }

    // 3) Ergebnis / Fallback + Post-Processing
    if (claims.length > 0) {
      // Erst HARD cap, dann postprocess (cluster + gates)
      const capped = claims.slice(0, maxClaims);
      const { clusters, statements } = postprocessClaims(capped, { simThresh: 0.74 });

      return ok({
        degraded: !anyModelOk,
        clusters,         // für UI: vollständige Gruppen inkl. Aspekte
        statements,       // sofort „statement-tauglich“
        claims: statements.map((s: any) => s.rep), // backward-compat: best-of
      });
    }

    // Fallback (garantiert ≥1 Claim)
    const fb = quickFallback(text, maxClaims);
    const { clusters, statements } = postprocessClaims(fb, { simThresh: 0.78 });
    return ok({
      degraded: true,
      reason: reason ?? "AI_PARSE",
      budgetMs: FAST_BUDGET_MS,
      clusters,
      statements,
      claims: statements.map((s: any) => s.rep),
    });
  } catch (e: any) {
    return err(e?.message || "INTERNAL_ERROR");
  }
}
