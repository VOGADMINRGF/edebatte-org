// features/ai/providers/anthropic.ts
import { withMetrics } from "../orchestrator_health";
import type { AiErrorKind } from "@core/telemetry/aiUsageTypes";
import {
  getProviderFallbackModel,
  resolveProviderModel,
} from "@features/ai/providerModelRegistry";
import { probeProviderModelLifecycle } from "@features/ai/providerModelLifecycleProbe";

const API_BASE = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(
  /\/+$/,
  "",
);

export function resolveAnthropicModelName(modelName?: string): string {
  return resolveProviderModel("anthropic", modelName);
}

const MODEL = resolveAnthropicModelName(process.env.ANTHROPIC_MODEL);
const FALLBACK_MODEL = process.env.ANTHROPIC_MODEL_FALLBACK?.trim()
  ? resolveAnthropicModelName(process.env.ANTHROPIC_MODEL_FALLBACK)
  : getProviderFallbackModel("anthropic");
const VERSION = process.env.ANTHROPIC_VERSION || "2023-06-01";

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
    const first = data?.content?.[0];
    if (typeof first?.text === "string") return first.text.trim();
    const nested = first?.content?.[0]?.text;
    if (typeof nested === "string") return nested.trim();
  } catch {
    // ignore
  }
  return "";
}

async function post(body: Record<string, unknown>, signal?: AbortSignal) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY fehlt");
  }

  const res = await fetch(`${API_BASE}/v1/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "anthropic-version": VERSION,
      "x-api-key": process.env.ANTHROPIC_API_KEY,
    },
    body: JSON.stringify(body),
    signal,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || JSON.stringify(data);
    const err: any = new Error(`Anthropic error ${res.status}: ${msg}`);
    err.status = res.status;
    err.payload = data;
    err.code = data?.error?.type ?? data?.error?.code ?? null;
    err.meta = {
      model: typeof body?.model === "string" ? body.model : null,
      code: err.code,
      messageShort: typeof msg === "string" ? msg.slice(0, 200) : null,
    };
    throw err;
  }
  return data;
}

async function askAnthropic({
  prompt,
  model,
  maxOutputTokens = 2_200,
  signal,
}: AskArgs): Promise<AskResult> {
  if (!prompt) throw new Error("prompt darf nicht leer sein");

  const buildBody = (modelName: string) => ({
    model: modelName,
    max_tokens: maxOutputTokens,
    system:
      "Return strictly valid JSON (RFC8259). No explanations, no Markdown, no code fences.",
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  let selectedModel = resolveAnthropicModelName(model ?? MODEL);
  let data;
  try {
    data = await post(buildBody(selectedModel), signal);
  } catch (err: any) {
    const resolvedFallbackModel = resolveAnthropicModelName(FALLBACK_MODEL);
    const canFallbackModel =
      err?.status === 404 &&
      resolvedFallbackModel.length > 0 &&
      resolvedFallbackModel !== selectedModel;
    if (!canFallbackModel) throw err;
    selectedModel = resolvedFallbackModel;
    data = await post(buildBody(selectedModel), signal);
  }

  return {
    text: extractText(data),
    raw: data,
    model: data?.model ?? selectedModel,
    tokensIn: data?.usage?.input_tokens,
    tokensOut: data?.usage?.output_tokens,
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

export const callAnthropic = withMetrics<Parameters<typeof askAnthropic>, AskResult>(
  "anthropic",
  askAnthropic,
  { jsonOk },
);

export default callAnthropic;

export async function anthropicProbe({ signal }: { signal?: AbortSignal } = {}): Promise<{
  ok: boolean;
  errorKind?: AiErrorKind;
  status?: number;
  durationMs: number;
}> {
  const result = await probeProviderModelLifecycle("anthropic", { signal });
  if (result.status === "ok" || result.status === "retired_migrated") {
    return { ok: true, status: result.httpStatus ?? undefined, durationMs: result.durationMs };
  }

  let errorKind: AiErrorKind = "INTERNAL";
  if (result.status === "model_not_found") errorKind = "MODEL_NOT_FOUND";
  else if (result.status === "config_missing") errorKind = "UNAUTHORIZED";
  else if (result.reason === "timeout") errorKind = "TIMEOUT";
  else if (result.httpStatus === 401 || result.httpStatus === 403) errorKind = "UNAUTHORIZED";
  else if (result.httpStatus === 429) errorKind = "RATE_LIMIT";

  return {
    ok: false,
    errorKind,
    status: result.httpStatus ?? undefined,
    durationMs: result.durationMs,
  };
}
