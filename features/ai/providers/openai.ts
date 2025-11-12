// features/ai/providers/openai.ts
import { withMetrics } from "../orchestrator";

// ——— Low-level Responses API ———
const API_BASE = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/,"");
const MODEL    = process.env.OPENAI_MODEL || "gpt-5"; // falls ihr "gpt-4o-mini" wollt, hier setzen

export type AskArgs = {
  prompt: string;
  asJson?: boolean;
  maxOutputTokens?: number;
  signal?: AbortSignal;
};
export type AskResult = { text: string; raw: any };

function withJsonInstruction(s: string){
  return `${s}\n\nReturn ONLY valid JSON (RFC8259). No preamble, no Markdown, no code fences.`;
}

async function post(body:any, signal?:AbortSignal){
  const res = await fetch(`${API_BASE}/responses`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}`,
    },
    body: JSON.stringify(body),
    signal,
  });
  const data = await res.json().catch(()=> ({}));
  if(!res.ok){
    const msg = data?.error?.message || JSON.stringify(data);
    const err:any = new Error(`OpenAI error ${res.status}: ${msg}`);
    err.status = res.status; err.payload = data;
    throw err;
  }
  return data;
}

function extractText(data:any):string{
  // Responses API: bevorzugt output_text; fallback auf content-Array
  const direct = typeof data?.output_text === "string" ? data.output_text : "";
  if (direct) return direct.trim();
  try {
    const block = data?.output?.[0]?.content?.find?.((c:any)=>c?.type==="output_text");
    if (block?.text) return String(block.text).trim();
  } catch{}
  return "";
}

async function askOpenAI({ prompt, asJson=false, maxOutputTokens=1200, signal }: AskArgs): Promise<AskResult> {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY fehlt");

  const body1:any = { model: MODEL, input: asJson ? withJsonInstruction(prompt) : prompt, max_output_tokens: maxOutputTokens };
  try {
    const data = await post(body1, signal);
    return { text: extractText(data), raw: data };
  } catch (e:any) {
    const msg = String(e?.message||"");
    const isFormatErr = /text\.format|response_format/i.test(msg);
    if (!isFormatErr) throw e;

    // Retry mit text.format JSON object
    const body2:any = { ...body1, text: { format: { type: "json_object" } } };
    const data = await post(body2, signal);
    return { text: extractText(data), raw: data };
  }
}

// ——— Instrumentierte Exporte ———
// JSON-OK-Heuristik: wenn asJson angefragt war, muss parsebar sein; sonst akzeptieren wir Text
function jsonOkFrom(result: AskResult){ 
  const t = result?.text ?? "";
  if (!t) return false;
  try { JSON.parse(t); return true; } catch { return false; }
}

export const callOpenAI = withMetrics<Parameters<typeof askOpenAI>, Promise<AskResult>>(
  "openai",
  askOpenAI as any,
  { jsonOk: (r) => jsonOkFrom(r) }
);

export async function callOpenAIJson(prompt: string){
  const { text } = await callOpenAI({ prompt, asJson: true });
  return { text };
}

export default callOpenAI;
