// features/ai/providers/gemini.ts
import type { AiErrorKind } from "@core/telemetry/aiUsageTypes";
import { withMetrics } from "../orchestrator_health";
import {
  fallbackProviderModel,
  resolveProviderModel,
} from "../providerModelRegistry";

const API_BASE =
  process.env.GOOGLE_GENAI_BASE_URL || "https://generativelanguage.googleapis.com";
const MODEL = resolveProviderModel("gemini", process.env.GEMINI_MODEL).effective;
const FALLBACK_MODEL = resolveProviderModel(
  "gemini",
  process.env.GEMINI_MODEL_FALLBACK?.trim() || fallbackProviderModel("gemini"),
).effective;

export function resolveGeminiModelName(modelName?: string): string {
  return resolveProviderModel("gemini", modelName).effective;
}

export type AskArgs = {
  prompt: string;
  model?: string;
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

function normalizeModelName(modelName: string): string {
  return resolveGeminiModelName(modelName);
}

async function post(
  body: Record<string, unknown>,
  signal: AbortSignal | undefined,
  modelName: string,
) {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GOOGLE_API_KEY or GEMINI_API_KEY");
  }

  const resolvedModel = normalizeModelName(modelName);
  const url = `${API_BASE}/v1beta/models/${resolvedModel}:generateContent?key=${apiKey}`;
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
    err.code =
      data?.error?.status ??
      (typeof data?.error?.code === "string" ? data.error.code : null) ??
      null;
    err.meta = {
      model: resolvedModel,
      code: err.code,
      messageShort: typeof msg === "string" ? msg.slice(0, 200) : null,
    };
    throw err;
  }
  return data;
}

async function askGemini({
  prompt,
  model,
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
  } as const;

  const requestModel = async (modelName: string) => {
    const generationConfig: Record<string, unknown> = {
      temperature: 0.25,
      maxOutputTokens,
    };
    if (expectJson) {
      generationConfig.responseMimeType = "application/json";
    }
    try {
      return await post({ ...baseBody, generationConfig }, signal, modelName);
    } catch (err: any) {
      if (expectJson && err?.status === 400) {
        return post(
          {
            ...baseBody,
            generationConfig: {
              temperature: 0.25,
              maxOutputTokens,
            },
          },
          signal,
          modelName,
        );
      }
      throw err;
    }
  };

  let selectedModel = resolveGeminiModelName(model ?? MODEL);
  let data;
  try {
    data = await requestModel(selectedModel);
  } catch (err: any) {
    const resolvedFallbackModel = resolveGeminiModelName(FALLBACK_MODEL);
    const canFallbackModel =
      err?.status === 404 &&
      resolvedFallbackModel.length > 0 &&
      normalizeModelName(resolvedFallbackModel) !== normalizeModelName(selectedModel);
    if (!canFallbackModel) throw err;
    selectedModel = resolvedFallbackModel;
    data = await requestModel(selectedModel);
  }

  return {
    text: extractText(data),
    raw: data,
    model: data?.model ?? normalizeModelName(selectedModel),
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

export async function geminiProbe({ signal }: { signal?: AbortSignal } = {}): Promise<{
  ok: boolean;
  errorKind?: AiErrorKind;
  status?: number;
  durationMs: number;
  configuredModel: string;
  effectiveModel: string;
  modelMigrated: boolean;
}> {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1_800);
  const started = Date.now();
  const resolution = resolveProviderModel("gemini", process.env.GEMINI_MODEL);

  try {
    const res = await fetch(
      `${API_BASE}/v1beta/models/${encodeURIComponent(resolution.effective)}?key=${encodeURIComponent(apiKey)}`,
      { method: "GET", signal: signal ?? controller.signal },
    );
    const durationMs = Date.now() - started;
    if (res.ok) {
      return {
        ok: true,
        durationMs,
        configuredModel: resolution.configured,
        effectiveModel: resolution.effective,
        modelMigrated: resolution.migrated,
      };
    }

    let errorKind: AiErrorKind = "INTERNAL";
    if (res.status === 401 || res.status === 403) errorKind = "UNAUTHORIZED";
    else if (res.status === 404) errorKind = "MODEL_NOT_FOUND";
    else if (res.status === 429) errorKind = "RATE_LIMIT";
    else if (res.status === 503) errorKind = "UNAVAILABLE";

    return {
      ok: false,
      errorKind,
      status: res.status,
      durationMs,
      configuredModel: resolution.configured,
      effectiveModel: resolution.effective,
      modelMigrated: resolution.migrated,
    };
  } catch (err: any) {
    const durationMs = Date.now() - started;
    return {
      ok: false,
      errorKind: err?.name === "AbortError" ? "TIMEOUT" : "INTERNAL",
      durationMs,
      configuredModel: resolution.configured,
      effectiveModel: resolution.effective,
      modelMigrated: resolution.migrated,
    };
  } finally {
    clearTimeout(timeout);
  }
}
