// features/ai/providers/mistral.ts
import { withMetrics } from "../orchestrator_health";
import { resolveProviderModel } from "../providerModelRegistry";

const API_BASE = (process.env.MISTRAL_BASE_URL || "https://api.mistral.ai").replace(
  /\/+$/,
  "",
);
const MODEL = resolveProviderModel("mistral", process.env.MISTRAL_MODEL).effective;

export type AskArgs = {
  prompt: string;
  model?: string;
  maxOutputTokens?: number;
  signal?: AbortSignal;
};

export type AskResult = {
  text: string;
  raw: any;
  model?: string;
  tokensIn?: number;
  tokensOut?: number;
};

function extractText(data: any): string {
  try {
    const choice = data?.choices?.[0];
    const content = choice?.message?.content;
    if (typeof content === "string") return content.trim();
    if (Array.isArray(content) && content.length) {
      const textChunks = content
        .map((chunk: any) => chunk?.text)
        .filter((chunkText: unknown): chunkText is string => typeof chunkText === "string");
      if (textChunks.length) return textChunks.join("").trim();
    }
  } catch {
    // ignore
  }
  return "";
}

async function post(body: Record<string, unknown>, signal?: AbortSignal) {
  if (!process.env.MISTRAL_API_KEY) {
    throw new Error("MISTRAL_API_KEY fehlt");
  }

  const res = await fetch(`${API_BASE}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || JSON.stringify(data);
    const err: any = new Error(`Mistral error ${res.status}: ${msg}`);
    err.status = res.status;
    err.payload = data;
    err.code = data?.error?.code ?? data?.error?.type ?? null;
    err.meta = {
      model: typeof body?.model === "string" ? body.model : null,
      code: err.code,
      messageShort: typeof msg === "string" ? msg.slice(0, 200) : null,
    };
    throw err;
  }
  return data;
}

async function askMistral({
  prompt,
  model,
  maxOutputTokens = 2_000,
  signal,
}: AskArgs): Promise<AskResult> {
  if (!prompt) throw new Error("prompt darf nicht leer sein");

  const body = {
    model: resolveProviderModel("mistral", model ?? MODEL).effective,
    max_tokens: maxOutputTokens,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "Return strictly valid JSON (RFC8259). No Markdown, no commentary.",
      },
      { role: "user", content: prompt },
    ],
  };

  const data = await post(body, signal);
  return {
    text: extractText(data),
    raw: data,
    model: data?.model,
    tokensIn: data?.usage?.prompt_tokens,
    tokensOut: data?.usage?.completion_tokens,
  };
}

function jsonOk(result: AskResult) {
  if (!result?.text) return false;
  try {
    JSON.parse(result.text);
    return true;
  } catch {
    return false;
  }
}

export const callMistral = withMetrics<Parameters<typeof askMistral>, AskResult>(
  "mistral",
  askMistral,
  { jsonOk },
);

export default callMistral;
