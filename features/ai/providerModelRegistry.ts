export type CoreModelProvider = "openai" | "anthropic" | "mistral" | "gemini";
export type ModelLifecycleState = "active" | "retired" | "unknown";

export type ProviderModelRegistryEntry = {
  provider: CoreModelProvider;
  preferredModel: string;
  fallbackModel: string;
  retiredReplacements: Readonly<Record<string, string>>;
  providerRecommendedReplacements: Readonly<Record<string, string>>;
};

export const PROVIDER_MODEL_REGISTRY: Readonly<Record<CoreModelProvider, ProviderModelRegistryEntry>> = {
  openai: {
    provider: "openai",
    preferredModel: "gpt-5",
    fallbackModel: "gpt-4.1-mini",
    retiredReplacements: {},
    providerRecommendedReplacements: {},
  },
  anthropic: {
    provider: "anthropic",
    preferredModel: "claude-opus-5",
    fallbackModel: "claude-sonnet-5",
    retiredReplacements: {
      "claude-opus-4-1-20250805": "claude-opus-5",
      "claude-opus-4-20250514": "claude-opus-5",
      "claude-sonnet-4-20250514": "claude-sonnet-5",
      "claude-3-7-sonnet": "claude-sonnet-5",
      "claude-3-7-sonnet-20250219": "claude-sonnet-5",
      "claude-3-5-sonnet-20240620": "claude-sonnet-5",
    },
    providerRecommendedReplacements: {
      "claude-opus-4-1-20250805": "claude-opus-4-8",
      "claude-opus-4-20250514": "claude-opus-4-8",
      "claude-sonnet-4-20250514": "claude-sonnet-4-6",
      "claude-3-7-sonnet-20250219": "claude-sonnet-4-6",
      "claude-3-5-sonnet-20240620": "claude-sonnet-4-6",
    },
  },
  mistral: {
    provider: "mistral",
    preferredModel: "mistral-large-latest",
    fallbackModel: "mistral-large-latest",
    retiredReplacements: {},
    providerRecommendedReplacements: {},
  },
  gemini: {
    provider: "gemini",
    preferredModel: "gemini-3.8-flash",
    fallbackModel: "gemini-3.6-flash",
    retiredReplacements: {
      "gemini-1.5-flash-latest": "gemini-3.8-flash",
      "gemini-1.5-flash": "gemini-3.8-flash",
      "gemini-2.0-flash": "gemini-3.8-flash",
      "gemini-2.0-flash-lite": "gemini-3.6-flash",
      "gemini-2.5-flash": "gemini-3.8-flash",
    },
    providerRecommendedReplacements: {},
  },
} as const;

function normalizeModelId(provider: CoreModelProvider, model: string): string {
  const trimmed = model.trim();
  return provider === "gemini" ? trimmed.replace(/^models\//, "") : trimmed;
}

export function getProviderModelRegistry(provider: CoreModelProvider): ProviderModelRegistryEntry {
  return PROVIDER_MODEL_REGISTRY[provider];
}

export function resolveProviderModel(provider: CoreModelProvider, configuredModel?: string | null): string {
  const registry = getProviderModelRegistry(provider);
  const normalized = configuredModel ? normalizeModelId(provider, configuredModel) : "";
  if (!normalized) return registry.preferredModel;
  return registry.retiredReplacements[normalized] ?? normalized;
}

export function getProviderFallbackModel(provider: CoreModelProvider): string {
  return getProviderModelRegistry(provider).fallbackModel;
}

export function describeProviderModel(
  provider: CoreModelProvider,
  configuredModel?: string | null,
): {
  configuredModel: string | null;
  effectiveModel: string;
  lifecycle: ModelLifecycleState;
  migrated: boolean;
  providerRecommendedReplacement: string | null;
} {
  const registry = getProviderModelRegistry(provider);
  const normalized = configuredModel ? normalizeModelId(provider, configuredModel) : null;
  const effectiveModel = resolveProviderModel(provider, normalized);
  const retired = Boolean(normalized && registry.retiredReplacements[normalized]);
  const registryManagedActive =
    !normalized || normalized === registry.preferredModel || normalized === registry.fallbackModel;
  return {
    configuredModel: normalized,
    effectiveModel,
    lifecycle: retired ? "retired" : registryManagedActive ? "active" : "unknown",
    migrated: retired,
    providerRecommendedReplacement:
      normalized && registry.providerRecommendedReplacements[normalized]
        ? registry.providerRecommendedReplacements[normalized]
        : null,
  };
}

export function isKnownRetiredProviderModel(provider: CoreModelProvider, model: string): boolean {
  const normalized = normalizeModelId(provider, model);
  return Boolean(getProviderModelRegistry(provider).retiredReplacements[normalized]);
}
