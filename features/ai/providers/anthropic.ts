// features/ai/providers/anthropic.ts
import { withMetrics } from "../orchestrator_health";
import type { AiErrorKind } from "@core/telemetry/aiUsageTypes";
import {
  fallbackProviderModel,
  resolveProviderModel,
} from "../providerModelRegistry";

const API_BASE = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(
  /\/+$/,
  "",
);
const configuredModel = process.env.ANTHROPIC_MODEL?.trim() || null;
const MODEL_RESOLUTION = resolveProviderModel("anthropic", configuredModel);
const MODEL = MODEL_RESOLUTION.effective;
const FALLBACK_MODEL = resolveProviderModel(
  "anthropic",
  process.env.ANTHROPIC_MODEL_FALLBACK?.trim() || fallbackProviderModel("anthropic"),
).effective;
const VERSION = process.env.ANTHROPIC_VERSION || "2023-06-01";

export function resolveAnthropicModelName(modelName?: string): string {
  return resolveProviderModel("anthropic", modelName).effective;
}

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
  configuredModel: string;
  effectiveModel: string;
  modelMigrated: boolean;
}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1_800);
  const started = Date.now();
  const resolution = resolveProviderModel("anthropic", process.env.ANTHROPIC_MODEL);

  try {
    const res = await fetch(`${API_BASE}/v1/models?limit=100`, {
      method: "GET",
      headers: {
        "anthropic-version": VERSION,
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
      },
      signal: signal ?? controller.signal,
    });

    const durationMs = Date.now() - started;
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      const modelIds = new Set(
        (Array.isArray(data?.data) ? data.data : [])
          .map((entry: any) => (typeof entry?.id === "string" ? entry.id : null))
          .filter((id: string | null): id is string => Boolean(id)),
      );
      if (modelIds.has(resolution.effective)) {
        return {
          ok: true,
          durationMs,
          configuredModel: resolution.configured,
          effectiveModel: resolution.effective,
          modelMigrated: resolution.migrated,
        };
      }
      return {
        ok: false,
        errorKind: "MODEL_NOT_FOUND",
        status: 404,
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
    const errorKind: AiErrorKind = err?.name === "AbortError" ? "TIMEOUT" : "INTERNAL";
    return {
      ok: false,
      errorKind,
      durationMs,
      configuredModel: resolution.configured,
      effectiveModel: resolution.effective,
      modelMigrated: resolution.migrated,
    };
  } finally {
    clearTimeout(timeout);
  }
}
