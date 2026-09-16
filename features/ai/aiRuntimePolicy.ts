import {
  getProviderModelRegistry,
  resolveProviderModel,
  resolveProviderModelForRouting,
  type AiModelRoutingMode,
  type AiModelTier,
  type CoreModelProvider,
} from "./providerModelRegistry";

export type AiCoreProviderName = CoreModelProvider;
export type AiRuntimeProviderName = AiCoreProviderName | "ari";
export type AiRuntimeMode = "test" | "development" | "preview" | "production";
export type AiRuntimeProfileName =
  | "planner"
  | "smoke"
  | "providerProbe"
  | "runtimeProbe"
  | "fullContract"
  | "fullContractLite"
  | "fullContractRepair"
  | "contributionTrace"
  | "qualityClarify";

type EnvMap = Record<string, string | undefined>;

const CORE_PROVIDER_ALLOWLIST = ["openai", "anthropic", "mistral", "gemini"] as const;
const DEFAULT_PROVIDER_ORDER: AiCoreProviderName[] = ["openai", "anthropic", "mistral", "gemini"];
const ARI_DEFAULT_MODEL = "ari-main";
const OPENAI_TRACE_DEFAULT_MODEL = "gpt-4o-mini";
const OPENAI_FAST_DEFAULT_MODEL = "gpt-4o-mini";
const CREATE_PLANNER_MAX_OUTPUT_TOKENS = 1_200;
const FULL_CONTRACT_DEFAULT_MAX_OUTPUT_TOKENS = 2_600;
const FULL_CONTRACT_LITE_MAX_OUTPUT_TOKENS = 1_200;
const FULL_CONTRACT_REPAIR_MAX_OUTPUT_TOKENS = 2_300;
const DIRECT_PROBE_MAX_OUTPUT_TOKENS = 96;
const DIRECT_RUNTIME_MAX_OUTPUT_TOKENS = 192;
const CONTRIBUTION_TRACE_MAX_OUTPUT_TOKENS = 1_200;
const QUALITY_CLARIFY_MAX_OUTPUT_TOKENS = 250;

const PROFILE_MODEL_TIERS: Readonly<Record<AiRuntimeProfileName, AiModelTier>> = {
  planner: "balanced",
  smoke: "economy",
  providerProbe: "economy",
  runtimeProbe: "economy",
  fullContract: "quality",
  fullContractLite: "balanced",
  fullContractRepair: "quality",
  contributionTrace: "balanced",
  qualityClarify: "economy",
};

const PROVIDER_ENV_PREFIX: Readonly<Record<AiCoreProviderName, string>> = {
  openai: "OPENAI",
  anthropic: "ANTHROPIC",
  mistral: "MISTRAL",
  gemini: "GEMINI",
};

const PLACEHOLDER_CREDENTIAL_VALUES = new Set([
  "__set_in_secret_manager__",
  "__optional__",
  "__optional_token__",
  "__set_for_production__",
  "changeme",
  "replace_me",
  "replace-me",
  "your_api_key",
  "your-api-key",
]);

export class AiRuntimePolicyError extends Error {
  constructor(
    message: string,
    readonly code:
      | "INVALID_PROVIDER"
      | "EMPTY_PROVIDER_ORDER"
      | "INVALID_INTEGER"
      | "INVALID_NUMBER"
      | "INVALID_BOOLEAN"
      | "INVALID_MODEL_ROUTING_MODE"
      | "OUT_OF_RANGE",
    readonly envVar?: string,
  ) {
    super(message);
    this.name = "AiRuntimePolicyError";
  }
}

export type AiRuntimeProfile = {
  timeoutMs: number;
  maxOutputTokens?: number;
  modelTier: AiModelTier;
};

export type AiRuntimePolicy = {
  runtimeMode: AiRuntimeMode;
  modelRoutingMode: AiModelRoutingMode;
  providerOrder: AiCoreProviderName[];
  maxProviders: number;
  enabledProviders: AiCoreProviderName[];
  enabledRuntimeProviders: AiRuntimeProviderName[];
  defaultTimeoutMs: number;
  providerTimeoutsMs: Record<AiRuntimeProviderName, number>;
  plannerTimeoutMs: number;
  plannerMaxOutputTokens: number;
  smokeTimeoutMs: number;
  smokeMaxOutputTokens: number;
  fullContractDefaultMaxOutputTokens: number;
  fullContractLiteMaxOutputTokens: number;
  fullContractRepairMaxOutputTokens: number;
  directProbeMaxOutputTokens: number;
  directRuntimeMaxOutputTokens: number;
  contributionTraceMaxOutputTokens: number;
  qualityClarifyMaxOutputTokens: number;
  maxOutputTokens: number;
  budgetMs: number;
  orchestratorBudgetMs: number;
  telemetryBufferMax: number;
  profiles: Record<AiRuntimeProfileName, AiRuntimeProfile>;
  circuitBreaker: {
    minRequests: number;
    failRateThreshold: number;
    openMsBase: number;
    openMsMax: number;
    halfOpenMs: number;
  };
  openai: {
    apiKeyPresent: boolean;
    baseUrl: string | null;
    model: string;
    modelsByProfile: Record<AiRuntimeProfileName, string>;
    plannerModelCandidates: string[];
    smokeModelCandidates: string[];
    traceModel: string;
    fastModel: string;
  };
  anthropic: {
    apiKeyPresent: boolean;
    model: string;
    modelsByProfile: Record<AiRuntimeProfileName, string>;
    disabledExplicitly: boolean;
  };
  mistral: {
    apiKeyPresent: boolean;
    model: string;
    modelsByProfile: Record<AiRuntimeProfileName, string>;
  };
  gemini: {
    apiKeyPresent: boolean;
    model: string;
    modelsByProfile: Record<AiRuntimeProfileName, string>;
    disabledExplicitly: boolean;
  };
  ari: {
    apiKeyPresent: boolean;
    baseUrl: string | null;
    model: string;
    disabledExplicitly: boolean;
    enabled: boolean;
  };
  research: {
    searchCreditAvailable: boolean;
    deepResearchCreditAvailable: boolean;
    dossierBoostAvailable: boolean;
    premiumResearchOverride: boolean;
    gateEnabled: boolean;
    requiresConfirmation: boolean;
    requestedModel: string | null;
    effectiveModel: string | null;
    timeoutMs: number;
    deepResearchEnabled: boolean;
  };
  social: {
    distributionEnabled: boolean;
    autoPublishEnabled: false;
    realtimePublishEnabled: false;
    requireReview: true;
    scheduleEnabled: boolean;
  };
  loggingMode: "metadata_only" | "disabled";
};

function readEnv(env: EnvMap, key: string): string | undefined {
  const value = env[key];
  if (typeof value !== "string") return undefined;
  return value;
}

function hasText(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function readTrimmed(env: EnvMap, key: string): string | undefined {
  const value = readEnv(env, key);
  if (!hasText(value)) return undefined;
  return value?.trim();
}

function isPlaceholderCredentialValue(value: string | undefined): boolean {
  if (!hasText(value)) return false;
  const normalized = value!.trim().toLowerCase();
  if (PLACEHOLDER_CREDENTIAL_VALUES.has(normalized)) return true;
  if (normalized.includes("set_in_secret_manager")) return true;
  if (normalized.includes("set_for_production")) return true;
  if (normalized === "__optional__" || normalized === "__optional_token__") return true;
  return false;
}

export function hasConfiguredCredential(value: string | undefined): boolean {
  return hasText(value) && !isPlaceholderCredentialValue(value);
}

function parseBooleanishEnv(env: EnvMap, key: string, fallback: boolean): boolean {
  const raw = readEnv(env, key);
  if (!hasText(raw)) return fallback;
  const normalized = raw!.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes") return true;
  if (normalized === "0" || normalized === "false" || normalized === "no") return false;
  throw new AiRuntimePolicyError(`${key} must be a boolean`, "INVALID_BOOLEAN", key);
}

function readPositiveInteger(
  env: EnvMap,
  key: string,
  options: { defaultValue: number; min: number; max: number },
): number {
  const raw = readTrimmed(env, key);
  if (!raw) return options.defaultValue;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    throw new AiRuntimePolicyError(`${key} must be a positive integer`, "INVALID_INTEGER", key);
  }
  if (parsed < options.min || parsed > options.max) {
    throw new AiRuntimePolicyError(`${key} must be between ${options.min} and ${options.max}`, "OUT_OF_RANGE", key);
  }
  return parsed;
}

function readUnitInterval(
  env: EnvMap,
  key: string,
  options: { defaultValue: number; min: number; max: number },
): number {
  const raw = readTrimmed(env, key);
  if (!raw) return options.defaultValue;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new AiRuntimePolicyError(`${key} must be a number`, "INVALID_NUMBER", key);
  }
  if (parsed < options.min || parsed > options.max) {
    throw new AiRuntimePolicyError(`${key} must be between ${options.min} and ${options.max}`, "OUT_OF_RANGE", key);
  }
  return parsed;
}

function dedupe(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const normalized = String(value ?? "").trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
}

function normalizeProviderOrder(env: EnvMap, maxProviders: number): AiCoreProviderName[] {
  const raw = readTrimmed(env, "AI_PROVIDER_ORDER");
  const tokens = raw ? raw.split(",").map((token) => token.trim().toLowerCase()) : DEFAULT_PROVIDER_ORDER;
  const out: AiCoreProviderName[] = [];
  const seen = new Set<string>();

  for (const token of tokens) {
    if (!token) continue;
    if (!CORE_PROVIDER_ALLOWLIST.includes(token as AiCoreProviderName)) {
      throw new AiRuntimePolicyError(`Unknown provider '${token}' in AI_PROVIDER_ORDER`, "INVALID_PROVIDER", "AI_PROVIDER_ORDER");
    }
    if (seen.has(token)) continue;
    seen.add(token);
    out.push(token as AiCoreProviderName);
  }

  if (out.length === 0) {
    throw new AiRuntimePolicyError("AI_PROVIDER_ORDER produced an empty provider list", "EMPTY_PROVIDER_ORDER", "AI_PROVIDER_ORDER");
  }

  return out.slice(0, maxProviders);
}

function resolveModelRoutingMode(env: EnvMap): AiModelRoutingMode {
  const raw = readTrimmed(env, "AI_MODEL_ROUTING_MODE")?.toLowerCase() ?? "legacy";
  if (raw === "legacy" || raw === "profiled") return raw;
  throw new AiRuntimePolicyError(
    "AI_MODEL_ROUTING_MODE must be legacy or profiled",
    "INVALID_MODEL_ROUTING_MODE",
    "AI_MODEL_ROUTING_MODE",
  );
}

function tierEnvKey(provider: AiCoreProviderName, tier: AiModelTier): string {
  return `${PROVIDER_ENV_PREFIX[provider]}_MODEL_${tier.toUpperCase()}`;
}

function buildProviderProfileModels(
  provider: AiCoreProviderName,
  env: EnvMap,
  routingMode: AiModelRoutingMode,
): Record<AiRuntimeProfileName, string> {
  const legacyConfigured = readTrimmed(env, `${PROVIDER_ENV_PREFIX[provider]}_MODEL`);
  const out = {} as Record<AiRuntimeProfileName, string>;
  for (const profileName of Object.keys(PROFILE_MODEL_TIERS) as AiRuntimeProfileName[]) {
    const tier = PROFILE_MODEL_TIERS[profileName];
    const configuredModel =
      routingMode === "profiled"
        ? readTrimmed(env, tierEnvKey(provider, tier))
        : legacyConfigured;
    out[profileName] = resolveProviderModelForRouting(provider, {
      routingMode,
      tier,
      configuredModel,
    });
  }
  return out;
}

export function resolveAiRuntimeModeFromEnv(env: EnvMap = process.env): AiRuntimeMode {
  const nodeEnv = readTrimmed(env, "NODE_ENV")?.toLowerCase() ?? "development";
  const vercelEnv = readTrimmed(env, "VERCEL_ENV")?.toLowerCase() ?? null;

  if (nodeEnv === "test") return "test";
  if (vercelEnv === "preview") return "preview";
  if (vercelEnv === "production") return "production";
  if (nodeEnv === "production") return "production";
  return "development";
}

function hasProviderCredential(env: EnvMap, provider: AiRuntimeProviderName): boolean {
  switch (provider) {
    case "openai":
      return hasConfiguredCredential(readEnv(env, "OPENAI_API_KEY"));
    case "anthropic":
      return hasConfiguredCredential(readEnv(env, "ANTHROPIC_API_KEY"));
    case "mistral":
      return hasConfiguredCredential(readEnv(env, "MISTRAL_API_KEY"));
    case "gemini":
      return hasConfiguredCredential(readEnv(env, "GEMINI_API_KEY")) || hasConfiguredCredential(readEnv(env, "GOOGLE_API_KEY"));
    case "ari":
      return hasConfiguredCredential(readEnv(env, "ARI_API_KEY")) || hasConfiguredCredential(readEnv(env, "YOUCOM_ARI_API_KEY"));
    default:
      return false;
  }
}

function isProviderExplicitlyDisabled(env: EnvMap, provider: AiRuntimeProviderName): boolean {
  switch (provider) {
    case "anthropic":
      return parseBooleanishEnv(env, "ANTHROPIC_DISABLED", false);
    case "gemini":
      return parseBooleanishEnv(env, "GEMINI_DISABLED", false);
    case "ari":
      return parseBooleanishEnv(env, "ARI_DISABLED", false);
    default:
      return false;
  }
}

function enabledProviders(providerOrder: AiCoreProviderName[], env: EnvMap): AiCoreProviderName[] {
  return providerOrder.filter(
    (provider) => hasProviderCredential(env, provider) && !isProviderExplicitlyDisabled(env, provider),
  );
}

function enabledRuntimeProviders(policy: AiRuntimePolicy): AiRuntimeProviderName[] {
  const runtimeProviders: AiRuntimeProviderName[] = [...policy.enabledProviders];
  if (policy.ari.enabled) runtimeProviders.push("ari");
  return runtimeProviders;
}

function resolveAriBaseUrl(env: EnvMap): string | null {
  return (
    readTrimmed(env, "ARI_BASE_URL") ??
    readTrimmed(env, "ARI_URL") ??
    readTrimmed(env, "ARI_API_URL") ??
    readTrimmed(env, "YOUCOM_ARI_API_URL") ??
    null
  );
}

function buildProfiles(params: {
  plannerTimeoutMs: number;
  plannerMaxOutputTokens: number;
  smokeTimeoutMs: number;
  smokeMaxOutputTokens: number;
  contributionTraceTimeoutMs: number;
  contributionTraceMaxOutputTokens: number;
  qualityClarifyTimeoutMs: number;
  qualityClarifyMaxOutputTokens: number;
}): Record<AiRuntimeProfileName, AiRuntimeProfile> {
  return {
    planner: {
      timeoutMs: params.plannerTimeoutMs,
      maxOutputTokens: params.plannerMaxOutputTokens,
      modelTier: PROFILE_MODEL_TIERS.planner,
    },
    smoke: {
      timeoutMs: params.smokeTimeoutMs,
      maxOutputTokens: params.smokeMaxOutputTokens,
      modelTier: PROFILE_MODEL_TIERS.smoke,
    },
    providerProbe: {
      timeoutMs: params.smokeTimeoutMs,
      maxOutputTokens: DIRECT_PROBE_MAX_OUTPUT_TOKENS,
      modelTier: PROFILE_MODEL_TIERS.providerProbe,
    },
    runtimeProbe: {
      timeoutMs: params.smokeTimeoutMs,
      maxOutputTokens: DIRECT_RUNTIME_MAX_OUTPUT_TOKENS,
      modelTier: PROFILE_MODEL_TIERS.runtimeProbe,
    },
    fullContract: {
      timeoutMs: params.smokeTimeoutMs,
      maxOutputTokens: FULL_CONTRACT_DEFAULT_MAX_OUTPUT_TOKENS,
      modelTier: PROFILE_MODEL_TIERS.fullContract,
    },
    fullContractLite: {
      timeoutMs: params.smokeTimeoutMs,
      maxOutputTokens: FULL_CONTRACT_LITE_MAX_OUTPUT_TOKENS,
      modelTier: PROFILE_MODEL_TIERS.fullContractLite,
    },
    fullContractRepair: {
      timeoutMs: params.smokeTimeoutMs,
      maxOutputTokens: FULL_CONTRACT_REPAIR_MAX_OUTPUT_TOKENS,
      modelTier: PROFILE_MODEL_TIERS.fullContractRepair,
    },
    contributionTrace: {
      timeoutMs: params.contributionTraceTimeoutMs,
      maxOutputTokens: params.contributionTraceMaxOutputTokens,
      modelTier: PROFILE_MODEL_TIERS.contributionTrace,
    },
    qualityClarify: {
      timeoutMs: params.qualityClarifyTimeoutMs,
      maxOutputTokens: params.qualityClarifyMaxOutputTokens,
      modelTier: PROFILE_MODEL_TIERS.qualityClarify,
    },
  };
}

export function getAiRuntimePolicyFromEnv(env: EnvMap = process.env): AiRuntimePolicy {
  const maxProviders = readPositiveInteger(env, "AI_MAX_PROVIDERS", {
    defaultValue: 4,
    min: 1,
    max: CORE_PROVIDER_ALLOWLIST.length,
  });
  const providerOrder = normalizeProviderOrder(env, maxProviders);
  const modelRoutingMode = resolveModelRoutingMode(env);
  const ariModel = readTrimmed(env, "ARI_MODEL") ?? ARI_DEFAULT_MODEL;
  const defaultTimeoutMs = readPositiveInteger(env, "OPENAI_TIMEOUT_MS", {
    defaultValue: 18_000,
    min: 600,
    max: 60_000,
  });
  const smokeTimeoutMs = readPositiveInteger(env, "OPENAI_SMOKE_TIMEOUT_MS", {
    defaultValue: 30_000,
    min: 600,
    max: 45_000,
  });
  const smokeMaxOutputTokens = readPositiveInteger(env, "OPENAI_SMOKE_MAX_OUTPUT_TOKENS", {
    defaultValue: 2_200,
    min: 1,
    max: FULL_CONTRACT_DEFAULT_MAX_OUTPUT_TOKENS,
  });
  const plannerTimeoutMs = readPositiveInteger(env, "CREATE_PLANNER_TIMEOUT_MS", {
    defaultValue: 10_000,
    min: 600,
    max: 10_000,
  });
  const budgetMs = readPositiveInteger(env, "AI_BUDGET_MS_DEFAULT", {
    defaultValue: 35_000,
    min: 1_000,
    max: 120_000,
  });
  const orchestratorBudgetMs = readPositiveInteger(env, "E150_ANALYZE_BUDGET_MS", {
    defaultValue: budgetMs,
    min: 1_000,
    max: 120_000,
  });
  const telemetryBufferMax = readPositiveInteger(env, "AI_TELEMETRY_BUFFER_MAX", {
    defaultValue: 1_000,
    min: 1,
    max: 10_000,
  });
  const circuitMinRequests = readPositiveInteger(env, "AI_CIRCUIT_MIN_REQUESTS", {
    defaultValue: 12,
    min: 1,
    max: 1_000,
  });
  const circuitOpenMsBase = readPositiveInteger(env, "AI_CIRCUIT_OPEN_MS_BASE", {
    defaultValue: 8_000,
    min: 500,
    max: 120_000,
  });
  const circuitOpenMsMax = readPositiveInteger(env, "AI_CIRCUIT_OPEN_MS_MAX", {
    defaultValue: 120_000,
    min: circuitOpenMsBase,
    max: 120_000,
  });
  const circuitHalfOpenMs = readPositiveInteger(env, "AI_CIRCUIT_HALFOPEN_MS", {
    defaultValue: 4_000,
    min: 250,
    max: 60_000,
  });
  const circuitFailRateThreshold = readUnitInterval(env, "AI_CIRCUIT_FAIL_RATE_THRESHOLD", {
    defaultValue: 0.35,
    min: 0.01,
    max: 1,
  });

  const researchGateEnabled =
    parseBooleanishEnv(env, "E150_DEEPSEARCH_ENABLED", false) ||
    parseBooleanishEnv(env, "OPENAI_DEEP_RESEARCH_ENABLED", false);
  const deepResearchCreditAvailable = parseBooleanishEnv(env, "DEEP_RESEARCH_CREDIT_AVAILABLE", false);
  const premiumResearchOverride = parseBooleanishEnv(env, "PREMIUM_RESEARCH_OVERRIDE", false);
  const requestedDeepResearchModel =
    readTrimmed(env, "OPENAI_DEEPSEARCH_MODEL") ?? readTrimmed(env, "OPENAI_DEEP_RESEARCH_MODEL") ?? null;
  const researchTimeoutMs = readPositiveInteger(env, "OPENAI_DEEP_RESEARCH_TIMEOUT_MS", {
    defaultValue: 60_000,
    min: 1_000,
    max: 60_000,
  });
  const contributionTraceTimeoutMs = readPositiveInteger(env, "CONTRIBUTION_TRACE_TIMEOUT_MS", {
    defaultValue: 20_000,
    min: 600,
    max: 60_000,
  });
  const qualityClarifyTimeoutMs = readPositiveInteger(env, "QUALITY_CLARIFY_TIMEOUT_MS", {
    defaultValue: 1_500,
    min: 250,
    max: 10_000,
  });

  const profiles = buildProfiles({
    plannerTimeoutMs,
    plannerMaxOutputTokens: CREATE_PLANNER_MAX_OUTPUT_TOKENS,
    smokeTimeoutMs,
    smokeMaxOutputTokens,
    contributionTraceTimeoutMs,
    contributionTraceMaxOutputTokens: CONTRIBUTION_TRACE_MAX_OUTPUT_TOKENS,
    qualityClarifyTimeoutMs,
    qualityClarifyMaxOutputTokens: QUALITY_CLARIFY_MAX_OUTPUT_TOKENS,
  });

  const openaiModelsByProfile = buildProviderProfileModels("openai", env, modelRoutingMode);
  const anthropicModelsByProfile = buildProviderProfileModels("anthropic", env, modelRoutingMode);
  const mistralModelsByProfile = buildProviderProfileModels("mistral", env, modelRoutingMode);
  const geminiModelsByProfile = buildProviderProfileModels("gemini", env, modelRoutingMode);

  const openaiModel = openaiModelsByProfile.fullContract;
  const anthropicModel = anthropicModelsByProfile.fullContract;
  const mistralModel = mistralModelsByProfile.fullContract;
  const geminiModel = geminiModelsByProfile.fullContract;

  const policy: AiRuntimePolicy = {
    runtimeMode: resolveAiRuntimeModeFromEnv(env),
    modelRoutingMode,
    providerOrder,
    maxProviders,
    enabledProviders: enabledProviders(providerOrder, env),
    enabledRuntimeProviders: [],
    defaultTimeoutMs,
    providerTimeoutsMs: {
      openai: defaultTimeoutMs,
      anthropic: readPositiveInteger(env, "ANTHROPIC_TIMEOUT_MS", { defaultValue: 22_000, min: 600, max: 60_000 }),
      mistral: readPositiveInteger(env, "MISTRAL_TIMEOUT_MS", { defaultValue: 18_000, min: 600, max: 60_000 }),
      gemini: readPositiveInteger(env, "GEMINI_TIMEOUT_MS", { defaultValue: 18_000, min: 600, max: 60_000 }),
      ari: readPositiveInteger(env, "ARI_TIMEOUT_MS", { defaultValue: 25_000, min: 600, max: 60_000 }),
    },
    plannerTimeoutMs,
    plannerMaxOutputTokens: CREATE_PLANNER_MAX_OUTPUT_TOKENS,
    smokeTimeoutMs,
    smokeMaxOutputTokens,
    fullContractDefaultMaxOutputTokens: FULL_CONTRACT_DEFAULT_MAX_OUTPUT_TOKENS,
    fullContractLiteMaxOutputTokens: FULL_CONTRACT_LITE_MAX_OUTPUT_TOKENS,
    fullContractRepairMaxOutputTokens: FULL_CONTRACT_REPAIR_MAX_OUTPUT_TOKENS,
    directProbeMaxOutputTokens: DIRECT_PROBE_MAX_OUTPUT_TOKENS,
    directRuntimeMaxOutputTokens: DIRECT_RUNTIME_MAX_OUTPUT_TOKENS,
    contributionTraceMaxOutputTokens: CONTRIBUTION_TRACE_MAX_OUTPUT_TOKENS,
    qualityClarifyMaxOutputTokens: QUALITY_CLARIFY_MAX_OUTPUT_TOKENS,
    maxOutputTokens: FULL_CONTRACT_DEFAULT_MAX_OUTPUT_TOKENS,
    budgetMs,
    orchestratorBudgetMs,
    telemetryBufferMax,
    profiles,
    circuitBreaker: {
      minRequests: circuitMinRequests,
      failRateThreshold: circuitFailRateThreshold,
      openMsBase: circuitOpenMsBase,
      openMsMax: circuitOpenMsMax,
      halfOpenMs: circuitHalfOpenMs,
    },
    openai: {
      apiKeyPresent: hasProviderCredential(env, "openai"),
      baseUrl: readTrimmed(env, "OPENAI_BASE_URL") ?? null,
      model: openaiModel,
      modelsByProfile: openaiModelsByProfile,
      plannerModelCandidates: dedupe([
        readTrimmed(env, "OPENAI_PLANNER_MODEL"),
        openaiModelsByProfile.planner,
        openaiModel,
      ]),
      smokeModelCandidates: dedupe([
        readTrimmed(env, "OPENAI_SMOKE_MODEL"),
        openaiModelsByProfile.smoke,
        openaiModel,
        getProviderModelRegistry("openai").preferredModel,
      ]),
      traceModel:
        readTrimmed(env, "OPENAI_TRACE_MODEL") ??
        (modelRoutingMode === "profiled" ? openaiModelsByProfile.contributionTrace : OPENAI_TRACE_DEFAULT_MODEL),
      fastModel:
        readTrimmed(env, "OPENAI_FAST_MODEL") ??
        (modelRoutingMode === "profiled" ? openaiModelsByProfile.qualityClarify : openaiModel ?? OPENAI_FAST_DEFAULT_MODEL),
    },
    anthropic: {
      apiKeyPresent: hasProviderCredential(env, "anthropic"),
      model: anthropicModel,
      modelsByProfile: anthropicModelsByProfile,
      disabledExplicitly: isProviderExplicitlyDisabled(env, "anthropic"),
    },
    mistral: {
      apiKeyPresent: hasProviderCredential(env, "mistral"),
      model: mistralModel,
      modelsByProfile: mistralModelsByProfile,
    },
    gemini: {
      apiKeyPresent: hasProviderCredential(env, "gemini"),
      model: geminiModel,
      modelsByProfile: geminiModelsByProfile,
      disabledExplicitly: isProviderExplicitlyDisabled(env, "gemini"),
    },
    ari: {
      apiKeyPresent: hasProviderCredential(env, "ari"),
      baseUrl: resolveAriBaseUrl(env),
      model: ariModel,
      disabledExplicitly: isProviderExplicitlyDisabled(env, "ari"),
      enabled: false,
    },
    research: {
      searchCreditAvailable: parseBooleanishEnv(env, "SEARCH_CREDIT_AVAILABLE", false),
      deepResearchCreditAvailable,
      dossierBoostAvailable: parseBooleanishEnv(env, "DOSSIER_BOOST_AVAILABLE", false),
      premiumResearchOverride,
      gateEnabled: researchGateEnabled,
      requiresConfirmation: parseBooleanishEnv(env, "E150_DEEPSEARCH_REQUIRE_CONFIRMATION", true),
      requestedModel: requestedDeepResearchModel,
      effectiveModel:
        researchGateEnabled && hasProviderCredential(env, "openai") && requestedDeepResearchModel
          ? requestedDeepResearchModel
          : null,
      timeoutMs: researchTimeoutMs,
      deepResearchEnabled:
        researchGateEnabled &&
        hasProviderCredential(env, "openai") &&
        Boolean(requestedDeepResearchModel) &&
        (deepResearchCreditAvailable || premiumResearchOverride),
    },
    social: {
      distributionEnabled: parseBooleanishEnv(env, "SOCIAL_DISTRIBUTION_ENABLED", false),
      autoPublishEnabled: false,
      realtimePublishEnabled: false,
      requireReview: true,
      scheduleEnabled: parseBooleanishEnv(env, "SOCIAL_SCHEDULE_ENABLED", true),
    },
    loggingMode: "metadata_only",
  };

  if (policy.openai.plannerModelCandidates.length === 0) {
    policy.openai.plannerModelCandidates.push(getProviderModelRegistry("openai").preferredModel);
  }
  if (policy.openai.smokeModelCandidates.length === 0) {
    policy.openai.smokeModelCandidates.push(getProviderModelRegistry("openai").preferredModel);
  }

  policy.ari.enabled =
    !policy.ari.disabledExplicitly &&
    policy.ari.apiKeyPresent &&
    Boolean(policy.ari.baseUrl);
  policy.enabledRuntimeProviders = enabledRuntimeProviders(policy);

  return policy;
}

export function getAiRuntimePolicy(): AiRuntimePolicy {
  return getAiRuntimePolicyFromEnv(process.env);
}

export function getAiRuntimeProfile(
  profileName: AiRuntimeProfileName,
  policy = getAiRuntimePolicy(),
): AiRuntimeProfile {
  return policy.profiles[profileName];
}

export function resolveAiRuntimeModel(
  provider: AiCoreProviderName,
  profileName: AiRuntimeProfileName,
  policy = getAiRuntimePolicy(),
): string {
  switch (provider) {
    case "openai":
      return policy.openai.modelsByProfile[profileName];
    case "anthropic":
      return policy.anthropic.modelsByProfile[profileName];
    case "mistral":
      return policy.mistral.modelsByProfile[profileName];
    case "gemini":
      return policy.gemini.modelsByProfile[profileName];
  }
}

export function isAiRuntimeProviderEnabled(
  provider: AiRuntimeProviderName,
  policy = getAiRuntimePolicy(),
): boolean {
  return policy.enabledRuntimeProviders.includes(provider);
}

export function resolveAiRuntimeProviderMissingReason(
  provider: AiRuntimeProviderName,
  policy = getAiRuntimePolicy(),
): string | null {
  if (isAiRuntimeProviderEnabled(provider, policy)) return null;
  switch (provider) {
    case "openai":
      return "missing OPENAI_API_KEY";
    case "anthropic":
      return policy.anthropic.disabledExplicitly ? "ANTHROPIC_DISABLED=1" : "missing ANTHROPIC_API_KEY";
    case "mistral":
      return "missing MISTRAL_API_KEY";
    case "gemini":
      return policy.gemini.disabledExplicitly ? "GEMINI_DISABLED=1" : "missing GEMINI_API_KEY / GOOGLE_API_KEY";
    case "ari":
      if (policy.ari.disabledExplicitly) return "ARI_DISABLED=1";
      if (!policy.ari.baseUrl) return "missing ARI_BASE_URL / ARI_URL / ARI_API_URL / YOUCOM_ARI_API_URL";
      if (!policy.ari.apiKeyPresent) return "missing ARI_API_KEY / YOUCOM_ARI_API_KEY";
      return "ari unavailable";
    default:
      return "unsupported provider";
  }
}

export function tryGetAiRuntimePolicyFromEnv(
  env: EnvMap = process.env,
): { ok: true; policy: AiRuntimePolicy } | { ok: false; error: AiRuntimePolicyError } {
  try {
    return { ok: true, policy: getAiRuntimePolicyFromEnv(env) };
  } catch (error) {
    if (error instanceof AiRuntimePolicyError) {
      return { ok: false, error };
    }
    throw error;
  }
}

export function tryGetAiRuntimePolicy() {
  return tryGetAiRuntimePolicyFromEnv(process.env);
}
