import {
  describeProviderModel,
  getProviderModelRegistry,
  resolveProviderModel,
  type CoreModelProvider,
} from "./providerModelRegistry";

export type ProviderModelProbeResult = {
  provider: CoreModelProvider;
  configuredModel: string | null;
  effectiveModel: string;
  providerRecommendedReplacement: string | null;
  migrated: boolean;
  modelAvailable: boolean | null;
  providerReachable: boolean;
  status: "ok" | "retired_migrated" | "model_not_found" | "config_missing" | "provider_error";
  httpStatus: number | null;
  durationMs: number;
  reason: string | null;
};

type FetchLike = typeof fetch;

function configuredModelFor(provider: CoreModelProvider, env: NodeJS.ProcessEnv): string | null {
  switch (provider) {
    case "openai": return env.OPENAI_MODEL?.trim() || null;
    case "anthropic": return env.ANTHROPIC_MODEL?.trim() || null;
    case "mistral": return env.MISTRAL_MODEL?.trim() || null;
    case "gemini": return env.GEMINI_MODEL?.trim() || null;
  }
}

function credentialFor(provider: CoreModelProvider, env: NodeJS.ProcessEnv): string | null {
  switch (provider) {
    case "openai": return env.OPENAI_API_KEY?.trim() || null;
    case "anthropic": return env.ANTHROPIC_API_KEY?.trim() || null;
    case "mistral": return env.MISTRAL_API_KEY?.trim() || null;
    case "gemini": return env.GOOGLE_API_KEY?.trim() || env.GEMINI_API_KEY?.trim() || null;
  }
}

function normalizeListedModel(provider: CoreModelProvider, model: string): string {
  const trimmed = model.trim();
  return provider === "gemini" ? trimmed.replace(/^models\//, "") : trimmed;
}

function extractModelIds(provider: CoreModelProvider, payload: any): string[] {
  const raw =
    provider === "gemini"
      ? payload?.models
      : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry: any) => entry?.id ?? entry?.name ?? entry?.model)
    .filter((value: unknown): value is string => typeof value === "string")
    .map((value) => normalizeListedModel(provider, value));
}

function requestFor(provider: CoreModelProvider, key: string, env: NodeJS.ProcessEnv): { url: string; init: RequestInit } {
  switch (provider) {
    case "openai":
      return {
        url: `${(env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "")}/models`,
        init: { headers: { authorization: `Bearer ${key}` } },
      };
    case "anthropic":
      return {
        url: `${(env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/+$/, "")}/v1/models`,
        init: { headers: { "x-api-key": key, "anthropic-version": env.ANTHROPIC_VERSION || "2023-06-01" } },
      };
    case "mistral":
      return {
        url: `${(env.MISTRAL_BASE_URL || "https://api.mistral.ai").replace(/\/+$/, "")}/v1/models`,
        init: { headers: { authorization: `Bearer ${key}` } },
      };
    case "gemini":
      return {
        url: `${(env.GOOGLE_GENAI_BASE_URL || "https://generativelanguage.googleapis.com").replace(/\/+$/, "")}/v1beta/models?key=${encodeURIComponent(key)}`,
        init: {},
      };
  }
}

export async function probeProviderModelLifecycle(
  provider: CoreModelProvider,
  options: { env?: NodeJS.ProcessEnv; fetchImpl?: FetchLike; signal?: AbortSignal } = {},
): Promise<ProviderModelProbeResult> {
  const env = options.env ?? process.env;
  const fetchImpl = options.fetchImpl ?? fetch;
  const configuredModel = configuredModelFor(provider, env);
  const modelState = describeProviderModel(provider, configuredModel);
  const effectiveModel = resolveProviderModel(provider, configuredModel);
  const key = credentialFor(provider, env);
  const started = Date.now();

  if (!key) {
    return {
      provider,
      configuredModel,
      effectiveModel,
      providerRecommendedReplacement: modelState.providerRecommendedReplacement,
      migrated: modelState.migrated,
      modelAvailable: null,
      providerReachable: false,
      status: "config_missing",
      httpStatus: null,
      durationMs: Date.now() - started,
      reason: "provider credential missing",
    };
  }

  try {
    const request = requestFor(provider, key, env);
    const res = await fetchImpl(request.url, { ...request.init, signal: options.signal });
    const durationMs = Date.now() - started;
    if (!res.ok) {
      return {
        provider,
        configuredModel,
        effectiveModel,
        providerRecommendedReplacement: modelState.providerRecommendedReplacement,
        migrated: modelState.migrated,
        modelAvailable: null,
        providerReachable: false,
        status: "provider_error",
        httpStatus: res.status,
        durationMs,
        reason: `provider model catalog returned ${res.status}`,
      };
    }

    const payload = await res.json().catch(() => ({}));
    const modelIds = extractModelIds(provider, payload);
    const modelAvailable = modelIds.includes(normalizeListedModel(provider, effectiveModel));
    return {
      provider,
      configuredModel,
      effectiveModel,
      providerRecommendedReplacement: modelState.providerRecommendedReplacement,
      migrated: modelState.migrated,
      modelAvailable,
      providerReachable: true,
      status: modelAvailable
        ? modelState.migrated ? "retired_migrated" : "ok"
        : "model_not_found",
      httpStatus: res.status,
      durationMs,
      reason: modelAvailable
        ? modelState.migrated
          ? `configured retired model migrated to ${effectiveModel}`
          : null
        : `effective model ${effectiveModel} not present in provider catalog`,
    };
  } catch (error: any) {
    return {
      provider,
      configuredModel,
      effectiveModel,
      providerRecommendedReplacement: modelState.providerRecommendedReplacement,
      migrated: modelState.migrated,
      modelAvailable: null,
      providerReachable: false,
      status: "provider_error",
      httpStatus: null,
      durationMs: Date.now() - started,
      reason: error?.name === "AbortError" ? "timeout" : "provider probe failed",
    };
  }
}

export async function probeAllCoreProviderModels(
  options: { env?: NodeJS.ProcessEnv; fetchImpl?: FetchLike; signal?: AbortSignal } = {},
): Promise<ProviderModelProbeResult[]> {
  const providers = Object.keys(PROVIDER_MODEL_REGISTRY_KEYS()) as CoreModelProvider[];
  return Promise.all(providers.map((provider) => probeProviderModelLifecycle(provider, options)));
}

function PROVIDER_MODEL_REGISTRY_KEYS(): Record<CoreModelProvider, true> {
  return {
    openai: true,
    anthropic: true,
    mistral: true,
    gemini: true,
  };
}

export function preferredModelFor(provider: CoreModelProvider): string {
  return getProviderModelRegistry(provider).preferredModel;
}
