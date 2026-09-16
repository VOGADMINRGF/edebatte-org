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

export type ProviderModelLifecycleHealth = "healthy" | "degraded" | "blocked";

type FetchLike = typeof fetch;
type ProbeOptions = {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: FetchLike;
  signal?: AbortSignal;
  /** Explicit model to verify, used by profiled routing health checks. */
  configuredModelOverride?: string | null;
};

type ProviderModelLookup = {
  provider: CoreModelProvider;
  effectiveModel: string;
  credentialPresent: boolean;
  providerReachable: boolean;
  modelAvailable: boolean | null;
  httpStatus: number | null;
  durationMs: number;
  reason: string | null;
};

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

function normalizeModel(provider: CoreModelProvider, model: string): string {
  const trimmed = model.trim();
  return provider === "gemini" ? trimmed.replace(/^models\//, "") : trimmed;
}

function requestForModel(
  provider: CoreModelProvider,
  key: string,
  effectiveModel: string,
  env: NodeJS.ProcessEnv,
): { url: string; init: RequestInit } {
  const model = encodeURIComponent(normalizeModel(provider, effectiveModel));
  switch (provider) {
    case "openai":
      return {
        url: `${(env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "")}/models/${model}`,
        init: { method: "GET", headers: { authorization: `Bearer ${key}` } },
      };
    case "anthropic":
      return {
        url: `${(env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/+$/, "")}/v1/models/${model}`,
        init: {
          method: "GET",
          headers: {
            "x-api-key": key,
            "anthropic-version": env.ANTHROPIC_VERSION || "2023-06-01",
          },
        },
      };
    case "mistral":
      return {
        url: `${(env.MISTRAL_BASE_URL || "https://api.mistral.ai").replace(/\/+$/, "")}/v1/models/${model}`,
        init: { method: "GET", headers: { authorization: `Bearer ${key}` } },
      };
    case "gemini":
      return {
        url: `${(env.GOOGLE_GENAI_BASE_URL || "https://generativelanguage.googleapis.com").replace(/\/+$/, "")}/v1beta/models/${model}`,
        init: { method: "GET", headers: { "x-goog-api-key": key } },
      };
  }
}

async function fetchProviderModel(
  provider: CoreModelProvider,
  effectiveModel: string,
  options: Pick<ProbeOptions, "env" | "fetchImpl" | "signal"> = {},
): Promise<ProviderModelLookup> {
  const env = options.env ?? process.env;
  const fetchImpl = options.fetchImpl ?? fetch;
  const key = credentialFor(provider, env);
  const started = Date.now();

  if (!key) {
    return {
      provider,
      effectiveModel,
      credentialPresent: false,
      providerReachable: false,
      modelAvailable: null,
      httpStatus: null,
      durationMs: Date.now() - started,
      reason: "provider credential missing",
    };
  }

  try {
    const request = requestForModel(provider, key, effectiveModel, env);
    const res = await fetchImpl(request.url, { ...request.init, signal: options.signal });
    const durationMs = Date.now() - started;

    if (res.status === 404) {
      return {
        provider,
        effectiveModel,
        credentialPresent: true,
        providerReachable: true,
        modelAvailable: false,
        httpStatus: res.status,
        durationMs,
        reason: `effective model ${effectiveModel} not found by provider`,
      };
    }

    if (!res.ok) {
      return {
        provider,
        effectiveModel,
        credentialPresent: true,
        providerReachable: false,
        modelAvailable: null,
        httpStatus: res.status,
        durationMs,
        reason: `provider model lookup returned ${res.status}`,
      };
    }

    return {
      provider,
      effectiveModel,
      credentialPresent: true,
      providerReachable: true,
      modelAvailable: true,
      httpStatus: res.status,
      durationMs,
      reason: null,
    };
  } catch (error: any) {
    return {
      provider,
      effectiveModel,
      credentialPresent: true,
      providerReachable: false,
      modelAvailable: null,
      httpStatus: null,
      durationMs: Date.now() - started,
      reason: error?.name === "AbortError" ? "timeout" : "provider probe failed",
    };
  }
}

function evaluateProviderModelLifecycle(
  provider: CoreModelProvider,
  configuredModel: string | null,
  lookup: ProviderModelLookup,
): ProviderModelProbeResult {
  const modelState = describeProviderModel(provider, configuredModel);
  const effectiveModel = resolveProviderModel(provider, configuredModel);

  if (!lookup.credentialPresent) {
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
      durationMs: lookup.durationMs,
      reason: lookup.reason ?? "provider credential missing",
    };
  }

  if (!lookup.providerReachable || lookup.modelAvailable === null) {
    return {
      provider,
      configuredModel,
      effectiveModel,
      providerRecommendedReplacement: modelState.providerRecommendedReplacement,
      migrated: modelState.migrated,
      modelAvailable: null,
      providerReachable: false,
      status: "provider_error",
      httpStatus: lookup.httpStatus,
      durationMs: lookup.durationMs,
      reason: lookup.reason ?? "provider probe failed",
    };
  }

  if (!lookup.modelAvailable) {
    return {
      provider,
      configuredModel,
      effectiveModel,
      providerRecommendedReplacement: modelState.providerRecommendedReplacement,
      migrated: modelState.migrated,
      modelAvailable: false,
      providerReachable: true,
      status: "model_not_found",
      httpStatus: lookup.httpStatus,
      durationMs: lookup.durationMs,
      reason: lookup.reason ?? `effective model ${effectiveModel} not found by provider`,
    };
  }

  return {
    provider,
    configuredModel,
    effectiveModel,
    providerRecommendedReplacement: modelState.providerRecommendedReplacement,
    migrated: modelState.migrated,
    modelAvailable: true,
    providerReachable: true,
    status: modelState.migrated ? "retired_migrated" : "ok",
    httpStatus: lookup.httpStatus,
    durationMs: lookup.durationMs,
    reason: modelState.migrated
      ? `configured retired model migrated to ${effectiveModel}`
      : null,
  };
}

export async function probeProviderModelsLifecycle(
  provider: CoreModelProvider,
  configuredModels: readonly (string | null | undefined)[],
  options: Pick<ProbeOptions, "env" | "fetchImpl" | "signal"> = {},
): Promise<ProviderModelProbeResult[]> {
  if (configuredModels.length === 0) return [];
  const env = options.env ?? process.env;
  const configured = configuredModels.map((override) =>
    override !== undefined
      ? override?.trim() || null
      : configuredModelFor(provider, env),
  );
  const effectiveModels = configured.map((model) => resolveProviderModel(provider, model));
  const uniqueEffectiveModels = Array.from(new Set(effectiveModels));
  const lookups = await Promise.all(
    uniqueEffectiveModels.map(async (effectiveModel) => [
      effectiveModel,
      await fetchProviderModel(provider, effectiveModel, options),
    ] as const),
  );
  const lookupByModel = new Map(lookups);

  return configured.map((configuredModel, index) => {
    const effectiveModel = effectiveModels[index]!;
    const lookup = lookupByModel.get(effectiveModel);
    if (!lookup) throw new Error(`provider model lookup missing for ${provider}:${effectiveModel}`);
    return evaluateProviderModelLifecycle(provider, configuredModel, lookup);
  });
}

export async function probeProviderModelLifecycle(
  provider: CoreModelProvider,
  options: ProbeOptions = {},
): Promise<ProviderModelProbeResult> {
  const results = await probeProviderModelsLifecycle(
    provider,
    [options.configuredModelOverride],
    options,
  );
  return results[0]!;
}

export async function probeAllCoreProviderModels(
  options: ProbeOptions = {},
): Promise<ProviderModelProbeResult[]> {
  const providers = Object.keys(PROVIDER_MODEL_REGISTRY_KEYS()) as CoreModelProvider[];
  return Promise.all(providers.map((provider) => probeProviderModelLifecycle(provider, options)));
}

export function deriveProviderModelLifecycleHealth(
  results: readonly ProviderModelProbeResult[],
): ProviderModelLifecycleHealth {
  if (results.some((entry) => entry.status === "model_not_found" || entry.status === "provider_error")) {
    return "blocked";
  }
  if (results.some((entry) => entry.status === "config_missing")) return "degraded";
  return "healthy";
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
