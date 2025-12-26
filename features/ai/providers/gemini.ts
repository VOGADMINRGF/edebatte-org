// features/ai/providers/gemini.ts
import { withMetrics } from "../orchestrator";

const API_BASE =
  process.env.GOOGLE_GENAI_BASE_URL || "https://generativelanguage.googleapis.com";
const MODEL = process.env.GEMINI_MODEL || "gemini-1.5-pro";

export type AskArgs = {
  prompt: string;
  maxOutputTokens?: number;
  signal?: AbortSignal;
  expectJson?: boolean;
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
    const parts = data?.candidates?.[0]?.content?.parts;
    if (Array.isArray(parts)) {
      const text = parts
        .map((part: any) =>
          typeof part?.text === "string" ? part.text : null,
        )
        .filter((value): value is string => Boolean(value));
      if (text.length) return text.join("").trim();
    }
  } catch {
    // ignore
  }
  return "";
}

async function post(body: Record<string, unknown>, signal?: AbortSignal) {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GOOGLE_API_KEY or GEMINI_API_KEY");
  }

  const url = `${API_BASE}/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    signal,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || JSON.stringify(data);
    const err: any = new Error(`Gemini error ${res.status}: ${msg}`);
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

async function askGemini({
  prompt,
  maxOutputTokens = 2_000,
  signal,
  expectJson = true,
}: AskArgs): Promise<AskResult> {
  if (!prompt) throw new Error("prompt darf nicht leer sein");

  const baseBody = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `${prompt}\n\nReturn only valid JSON (RFC8259).`,
          },
        ],
      },
    ],
  };

  const genConfig: Record<string, unknown> = {
    temperature: 0.25,
    maxOutputTokens,
  };

  if (expectJson) {
    genConfig.responseMimeType = "application/json";
  }

  const body = { ...baseBody, generationConfig: genConfig };

  let data;
  try {
    data = await post(body, signal);
  } catch (err: any) {
    // Fallback: retry once without responseMimeType if Gemini rejects it
    if (expectJson && err?.status === 400) {
      const retryBody = { ...baseBody, generationConfig: { temperature: 0.25, maxOutputTokens } };
      data = await post(retryBody, signal);
    } else {
      throw err;
    }
  }

  return {
    text: extractText(data),
    raw: data,
    model: data?.model,
    tokensIn: data?.usageMetadata?.promptTokenCount,
    tokensOut: data?.usageMetadata?.candidatesTokenCount,
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

export const callGemini = withMetrics<Parameters<typeof askGemini>, AskResult>(
  "gemini",
  askGemini,
  { jsonOk },
);

export default callGemini;
