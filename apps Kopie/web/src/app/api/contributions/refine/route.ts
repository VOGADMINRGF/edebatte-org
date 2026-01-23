import { NextRequest } from "next/server";

/* -------------------- JSON helpers -------------------- */
function jsonOk(data: any, status = 200) {
  return new Response(JSON.stringify({ ok: true, ...data }), {
    status,
    headers: { "content-type": "application/json" },
  });
}
function jsonErr(error: string, extra: any = {}, status = 500) {
  return new Response(JSON.stringify({ ok: false, error, ...extra }), {
    status,
    headers: { "content-type": "application/json" },
  });
}
const isArray = (x: any): x is any[] => Array.isArray(x);

/* -------------------- Config -------------------- */
const REFINE_BUDGET_MS = Number(process.env.REFINE_BUDGET_MS ?? 20000);
const MODEL = (process.env.OPENAI_MODEL || "gpt-4o-mini").trim();

/* -------------------- OpenAI: chat/completions + json_object -------------------- */
type AskArgs = { prompt: string; maxOutputTokens?: number; signal?: AbortSignal };
type AskResult = { text: string; raw: any };

async function openaiAsk({ prompt, maxOutputTokens = 1000, signal }: AskArgs): Promise<AskResult> {
  const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: "Du erzeugst ausschließlich gültiges JSON, exakt wie angefordert." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: maxOutputTokens,
    }),
    signal,
  });

  const raw = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = raw?.error?.message || JSON.stringify(raw);
    const err: any = new Error(`OpenAI error ${res.status}: ${msg}`);
    err.status = res.status;
    err.payload = raw;
    throw err;
  }
  const text = String(raw?.choices?.[0]?.message?.content ?? "").trim();
  return { text, raw };
}

/* -------------------- Prompt -------------------- */
function buildRefinePrompt(inputClaims: any[], locale: "de" | "en") {
  return `
Refine und normalisiere die vorläufigen Claims.
Ziele:
- Einheitlicher, neutraler Ton; **je Claim 1 sauberer Satz**, Sprache ${locale} (B1/B2).
- Fehlende Felder: "-" (Listen: []).
- Nahe Duplikate entfernen (klarste Variante behalten).
- **Genau EINEN** Claim als "primary" auswählen (zentralster, höchster Signalgehalt). Rest in "draftIndexes".

Gib **nur** JSON mit exakt dieser Struktur zurück:
{
  "primaryIndex": number,
  "claims": [
    {
      "text": string,
      "sachverhalt": string,
      "zeitraum": string,
      "ort": string,
      "zustaendigkeit": "EU"|"Bund"|"Land"|"Kommune"|"-",
      "betroffene": string[],
      "messgroesse": string,
      "unsicherheiten": string,
      "sources": string[]
    }
  ],
  "draftIndexes": number[]
}

INPUT_CLAIMS (JSON):
${JSON.stringify(inputClaims).replace(/</g, "\\u003c")}
`.trim();
}

/* -------------------- Coercion (defensiv) -------------------- */
function asArray(x: any): any[] { return Array.isArray(x) ? x : []; }
function coerceOutput(x: any) {
  const n0 = Number(x?.primaryIndex ?? 0);
  const claims = asArray(x?.claims).map((c) => ({
    text: String(c?.text ?? "-"),
    sachverhalt: String(c?.sachverhalt ?? "-"),
    zeitraum: String(c?.zeitraum ?? "-"),
    ort: String(c?.ort ?? "-"),
    zustaendigkeit: ["EU","Bund","Land","Kommune"].includes(String(c?.zustaendigkeit)) ? String(c?.zustaendigkeit) : "-",
    betroffene: asArray(c?.betroffene).map(String),
    messgroesse: String(c?.messgroesse ?? "-"),
    unsicherheiten: String(c?.unsicherheiten ?? "-"),
    sources: asArray(c?.sources).map(String),
  }));
  const draftIndexes = asArray(x?.draftIndexes).map((i) => Number(i)).filter(Number.isFinite);
  const primaryIndex = Math.max(0, Math.min(n0, Math.max(0, claims.length - 1)));
  return { primaryIndex, claims, draftIndexes };
}

export const dynamic = "force-dynamic";

/* -------------------- POST -------------------- */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const claims = isArray(body?.claims) ? body!.claims : null;
    const locale: "de" | "en" = body?.locale === "en" ? "en" : "de";
    if (!claims || claims.length === 0) return jsonErr("INVALID_PAYLOAD", { hint: "claims[]" }, 400);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort("AI_TIMEOUT"), REFINE_BUDGET_MS);

    let outText = "";
    try {
      const prompt = buildRefinePrompt(claims, locale);
      const { text } = await openaiAsk({ prompt, maxOutputTokens: 1000, signal: controller.signal });
      outText = text;
    } finally {
      clearTimeout(timer);
    }

    let parsed: any = null;
    try { parsed = JSON.parse(outText); } catch {}

    if (!parsed || typeof parsed !== "object") {
      // Degrade: Input beibehalten, primary=0, Rest als Drafts
      const drafts = claims.length > 1 ? [...Array(claims.length).keys()].slice(1) : [];
      return jsonOk({ degraded: true, reason: "AI_PARSE", primaryIndex: 0, claims, draftIndexes: drafts });
    }

    const norm = coerceOutput(parsed);
    return jsonOk({ degraded: false, ...norm });
  } catch (e: any) {
    const msg = String(e?.message || "INTERNAL_ERROR");
    const degraded = /AI_TIMEOUT|AbortError/i.test(msg);
    const base = { primaryIndex: 0, claims: [], draftIndexes: [] as number[] };
    return jsonOk({ degraded, reason: degraded ? "AI_TIMEOUT" : msg, ...base });
  }
}
