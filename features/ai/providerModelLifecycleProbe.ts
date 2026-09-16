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

export type ProviderModelCatalogSnapshot = {
  provider: CoreModelProvider;
  credentialPresent: boolean;
  providerReachable: boolean;
  httpStatus: number | null;
  durationMs: number;
  modelIds: string[] | null;
  reason: string | null;
};

type FetchLike = typeof fetch;
type CatalogProbeOptions = {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: FetchLike;
  signal?: AbortSignal;
};
type ProbeOptions = CatalogProbeOptions & {
  /** Explicit model to verify, used by profiled routing health checks. */
  configuredModelOverride?: string | null;
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

  const values: string[] = [];
  for (const entry of raw) {
    const primary = [entry?.id, entry?.name, entry?.model, entry?.baseModelId, entry?.root];
    for (const value of primary) {
      if (typeof value === "string" && value.trim()) values.push(value);
    }
    if (Array.isArray(entry?.aliases)) {
      for (const alias of entry.aliases) {
        if (typeof alias === "string" && alias.trim()) values.push(alias);
      }
    }
  }

  return Array.from(new Set(values.map((value) => normalizeListedModel(provider, value))));
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
        url: `${(env.GOOGLE_GENAI_BASE_URL || "https://generativelanguage.googleapis.com").replace(/\/+$/, "")}/v1beta/models?pageSize=1000&key=${encodeURIComponent(key)}`,
        init: {},
      };
  }
}

export async function fetchProviderModelCatalog(
  provider: CoreModelProvider,
  options: CatalogProbeOptions = {},
): Promise<ProviderModelCatalogSnapshot> {
  const env = options.env ?? process.env;
  const fetchImpl = options.fetchImpl ?? fetch;
  const key = credentialFor(provider, env);
  const started = Date.now();

  if (!key) {
    return {
      provider,
      credentialPresent: false,
      providerReachable: false,
      httpStatus: null,
      durationMs: Date.now() - started,
      modelIds: null,
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
        credentialPresent: true,
        providerReachable: false,
        httpStatus: res.status,
        durationMs,
        modelIds: null,
        reason: `provider model catalog returned ${res.status}`,
      };
    }

    const payload = await res.json().catch(() => ({}));
    return {
      provider,
      credentialPresent: true,
      providerReachable: true,
      httpStatus: res.status,
      durationMs,
      modelIds: extractModelIds(provider, payload),
      reason: null,
    };
  } catch (error: any) {
    return {
      provider,
      credentialPresent: true,
      providerReachable: false,
      httpStatus: null,
      durationMs: Date.now() - started,
      modelIds: null,
      reason: error?.name === "AbortError" ? "timeout" : "provider probe failed",
    };
  }
}

export function evaluateProviderModelLifecycle(
  provider: CoreModelProvider,
  configuredModel: string | null,
  catalog: ProviderModelCatalogSnapshot,
): ProviderModelProbeResult {
  const modelState = describeProviderModel(provider, configuredModel);
  const effectiveModel = resolveProviderModel(provider, configuredModel);

  if (!catalog.credentialPresent) {
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
      durationMs: catalog.durationMs,
      reason: catalog.reason ?? "provider credential missing",
    };
  }

  if (!catalog.providerReachable || catalog.modelIds === null) {
    return {
      provider,
      configuredModel,
      effectiveModel,
      providerRecommendedReplacement: modelState.providerRecommendedReplacement,
      migrated: modelState.migrated,
      modelAvailable: null,
      providerReachable: false,
      status: "provider_error",
      httpStatus: catalog.httpStatus,
      durationMs: catalog.durationMs,
      reason: catalog.reason ?? "provider probe failed",
    };
  }

  const modelAvailable = catalog.modelIds.includes(normalizeListedModel(provider, effectiveModel));
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
    httpStatus: catalog.httpStatus,
    durationMs: catalog.durationMs,
    reason: modelAvailable
      ? modelState.migrated
        ? `configured retired model migrated to ${effectiveModel}`
        : null
      : `effective model ${effectiveModel} not present in provider catalog`,
  };
}

export async function probeProviderModelsLifecycle(
  provider: CoreModelProvider,
  configuredModels: readonly (string | null | undefined)[],
  options: CatalogProbeOptions = {},
): Promise<ProviderModelProbeResult[]> {
  if (configuredModels.length === 0) return [];
  const env = options.env ?? process.env;
  const catalog = await fetchProviderModelCatalog(provider, options);
  return configuredModels.map((override) => {
    const configuredModel = override !== undefined
      ? override?.trim() || null
      : configuredModelFor(provider, env);
    return evaluateProviderModelLifecycle(provider, configuredModel, catalog);
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
