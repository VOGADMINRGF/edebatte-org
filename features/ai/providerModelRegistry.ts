export type CoreModelProvider = "openai" | "anthropic" | "mistral" | "gemini";
export type ModelLifecycleState = "active" | "retired" | "unknown";
export type AiModelTier = "economy" | "balanced" | "quality";
export type AiModelRoutingMode = "legacy" | "profiled";

export type ProviderModelRegistryEntry = {
  provider: CoreModelProvider;
  /** Legacy/default model. Kept stable unless an intentional migration is approved. */
  preferredModel: string;
  fallbackModel: string;
  /** Models used only when AI_MODEL_ROUTING_MODE=profiled and no explicit provider model override is set. */
  routingModels: Readonly<Record<AiModelTier, string>>;
  retiredReplacements: Readonly<Record<string, string>>;
  providerRecommendedReplacements: Readonly<Record<string, string>>;
};

export const PROVIDER_MODEL_REGISTRY: Readonly<Record<CoreModelProvider, ProviderModelRegistryEntry>> = {
  openai: {
    provider: "openai",
    preferredModel: "gpt-5",
    fallbackModel: "gpt-4.1-mini",
    routingModels: {
      economy: "gpt-5.6-luna",
      balanced: "gpt-5.6-terra",
      quality: "gpt-5.6-sol",
    },
    retiredReplacements: {},
    providerRecommendedReplacements: {},
  },
  anthropic: {
    provider: "anthropic",
    preferredModel: "claude-opus-5",
    fallbackModel: "claude-sonnet-5",
    routingModels: {
      economy: "claude-haiku-4-5-20251001",
      balanced: "claude-sonnet-5",
      quality: "claude-opus-5",
    },
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
    routingModels: {
      economy: "mistral-small-latest",
      balanced: "mistral-medium-latest",
      quality: "mistral-large-latest",
    },
    retiredReplacements: {},
    providerRecommendedReplacements: {},
  },
  gemini: {
    provider: "gemini",
    preferredModel: "gemini-3.8-flash",
    fallbackModel: "gemini-3.6-flash",
    routingModels: {
      economy: "gemini-3.5-flash-lite",
      balanced: "gemini-3.6-flash",
      quality: "gemini-3.8-flash",
    },
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

export function getProviderTierModel(provider: CoreModelProvider, tier: AiModelTier): string {
  return getProviderModelRegistry(provider).routingModels[tier];
}

export function resolveProviderModelForRouting(
  provider: CoreModelProvider,
  options: {
    routingMode: AiModelRoutingMode;
    tier: AiModelTier;
    configuredModel?: string | null;
  },
): string {
  const explicit = options.configuredModel?.trim();
  if (explicit) return resolveProviderModel(provider, explicit);
  if (options.routingMode === "profiled") {
    return resolveProviderModel(provider, getProviderTierModel(provider, options.tier));
  }
  return resolveProviderModel(provider);
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
    !normalized ||
    normalized === registry.preferredModel ||
    normalized === registry.fallbackModel ||
    Object.values(registry.routingModels).includes(normalized);
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
