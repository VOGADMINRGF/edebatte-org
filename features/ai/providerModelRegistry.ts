export type ManagedAiProvider = "openai" | "anthropic" | "mistral" | "gemini";

export type RetiredModelRule = {
  replacement: string;
  providerRecommended: string;
  retiredAt?: string;
};

export type ProviderModelConfig = {
  preferred: string;
  fallback: string;
  verifiedAt: string;
  retired: Readonly<Record<string, RetiredModelRule>>;
};

// Single source of truth for provider model defaults and known retired model migrations.
// `preferred` is VOG's intentional default. `providerRecommended` records the upstream
// vendor's migration target and may differ from VOG's preferred model.
export const PROVIDER_MODEL_REGISTRY: Readonly<Record<ManagedAiProvider, ProviderModelConfig>> = {
  openai: {
    preferred: "gpt-5",
    fallback: "gpt-4.1-mini",
    verifiedAt: "2026-09-16",
    retired: {},
  },
  anthropic: {
    preferred: "claude-opus-5",
    fallback: "claude-sonnet-5",
    verifiedAt: "2026-09-16",
    retired: {
      "claude-opus-4-1-20250805": {
        replacement: "claude-opus-4-8",
        providerRecommended: "claude-opus-4-8",
        retiredAt: "2026-08-05",
      },
      "claude-opus-4-20250514": {
        replacement: "claude-opus-4-8",
        providerRecommended: "claude-opus-4-8",
        retiredAt: "2026-06-15",
      },
      "claude-sonnet-4-20250514": {
        replacement: "claude-sonnet-4-6",
        providerRecommended: "claude-sonnet-4-6",
        retiredAt: "2026-06-15",
      },
      "claude-3-7-sonnet": {
        replacement: "claude-sonnet-4-6",
        providerRecommended: "claude-sonnet-4-6",
        retiredAt: "2026-02-19",
      },
      "claude-3-7-sonnet-20250219": {
        replacement: "claude-sonnet-4-6",
        providerRecommended: "claude-sonnet-4-6",
        retiredAt: "2026-02-19",
      },
      "claude-3-5-sonnet-20240620": {
        replacement: "claude-sonnet-4-6",
        providerRecommended: "claude-sonnet-4-6",
        retiredAt: "2025-10-28",
      },
    },
  },
  mistral: {
    preferred: "mistral-large-latest",
    fallback: "mistral-large-latest",
    verifiedAt: "2026-09-16",
    retired: {},
  },
  gemini: {
    preferred: "gemini-3.8-flash",
    fallback: "gemini-3.6-flash",
    verifiedAt: "2026-09-16",
    retired: {
      "gemini-1.5-flash-latest": {
        replacement: "gemini-3.8-flash",
        providerRecommended: "gemini-3.8-flash",
        retiredAt: "2025-09-29",
      },
      "gemini-1.5-flash": {
        replacement: "gemini-3.8-flash",
        providerRecommended: "gemini-3.8-flash",
        retiredAt: "2025-09-29",
      },
      "gemini-2.0-flash": {
        replacement: "gemini-3.6-flash",
        providerRecommended: "gemini-3.6-flash",
        retiredAt: "2026-06-01",
      },
      "gemini-2.0-flash-001": {
        replacement: "gemini-3.6-flash",
        providerRecommended: "gemini-3.6-flash",
        retiredAt: "2026-06-01",
      },
      "gemini-2.0-flash-lite": {
        replacement: "gemini-3.5-flash-lite",
        providerRecommended: "gemini-3.1-flash-lite",
        retiredAt: "2026-06-01",
      },
      "gemini-2.0-flash-lite-001": {
        replacement: "gemini-3.5-flash-lite",
        providerRecommended: "gemini-3.1-flash-lite",
        retiredAt: "2026-06-01",
      },
    },
  },
};

export type ModelResolution = {
  configured: string;
  effective: string;
  migrated: boolean;
  providerRecommended: string | null;
  retiredAt: string | null;
};

function normalizeModelId(provider: ManagedAiProvider, modelName: string): string {
  const trimmed = modelName.trim();
  return provider === "gemini" ? trimmed.replace(/^models\//, "") : trimmed;
}

export function resolveProviderModel(
  provider: ManagedAiProvider,
  modelName?: string | null,
): ModelResolution {
  const config = PROVIDER_MODEL_REGISTRY[provider];
  const configured = normalizeModelId(provider, modelName?.trim() || config.preferred);
  const retiredRule = config.retired[configured];
  if (!retiredRule) {
    return {
      configured,
      effective: configured,
      migrated: false,
      providerRecommended: null,
      retiredAt: null,
    };
  }
  return {
    configured,
    effective: retiredRule.replacement,
    migrated: true,
    providerRecommended: retiredRule.providerRecommended,
    retiredAt: retiredRule.retiredAt ?? null,
  };
}

export function preferredProviderModel(provider: ManagedAiProvider): string {
  return PROVIDER_MODEL_REGISTRY[provider].preferred;
}

export function fallbackProviderModel(provider: ManagedAiProvider): string {
  return PROVIDER_MODEL_REGISTRY[provider].fallback;
}

export function knownRetiredModelIds(): string[] {
  return Object.values(PROVIDER_MODEL_REGISTRY).flatMap((config) => Object.keys(config.retired));
}
