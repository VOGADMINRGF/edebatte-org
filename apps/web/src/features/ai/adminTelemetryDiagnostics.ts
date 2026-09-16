import type { AiErrorKind } from "@core/telemetry/aiUsageTypes";
import { sanitizeAiLogText } from "@core/telemetry/aiLogSanitization";
import type { E150ProviderName, ProviderMatrixEntry } from "@features/ai/orchestratorE150";
import { tryGetAiRuntimePolicy } from "@features/ai/aiRuntimePolicy";
import { preferredProviderModel } from "@features/ai/providerModelRegistry";

export const PROVIDER_ORDER: readonly E150ProviderName[] = [
  "openai",
  "anthropic",
  "mistral",
  "gemini",
  "ari",
];

export type SmokeMode = "provider_probe" | "runtime_smoke" | "full_contract";
export type SmokeExecutionMode = "probe" | "runtime" | "full" | "full-lite";
export type RunCostGroup = "tiny" | "lite" | "full";
export type SmokeBudgetProfile = "probe_tiny" | "runtime_tiny" | "full_default" | "full_lite";

export type DiagnosticStatus =
  | "ok"
  | "skipped"
  | "failed"
  | "degraded"
  | "config_missing";

export type JourneyDecision =
  | "selected"
  | "skipped"
  | "fallback_not_needed"
  | "not_in_plan"
  | "disabled"
  | "config_missing";

export type ProviderReachability = "reachable" | "down" | "unknown";
export type AdapterStatus = "ok" | "failed" | "not_started";
export type ParseStatus = "ok" | "failed" | "not_started";
export type SchemaStatus = "ok" | "failed" | "not_started";
export type ContractStrictStatus = "ok" | "failed" | "blocked" | "not_started";
export type ContractRepairStatus = "ok" | "failed" | "blocked" | "not_attempted";
export type FinalContractStatus =
  | "strict_ok"
  | "built_valid"
  | "repaired_degraded"
  | "failed"
  | "blocked"
  | "not_started";
export type DraftStatus = "ok" | "failed" | "not_attempted";
export type EnvelopeBuildStatus = "ok" | "failed" | "not_attempted";
export type FinalSchemaStatus = "ok" | "failed" | "not_started";
export type ContractStrategy =
  | "json_schema"
  | "json_object_envelope"
  | "prompt_envelope"
  | "provider_native";
export type JsonObjectSupport = boolean | "prompt_only";
export type NativeStrategy =
  | "openai_responses_json_schema"
  | "mistral_response_format_json_object"
  | "gemini_response_mime_json"
  | "anthropic_prompt_envelope_only"
  | "ari_prompt_envelope_only"
  | "provider_native_unknown";

export type ProviderContractCapabilities = {
  provider: E150ProviderName;
  nativeStrategy: NativeStrategy;
  preferredContractStrategy: ContractStrategy;
  fallbackStrategy: ContractStrategy;
  supportsStrictJsonSchema: boolean;
  supportsJsonObjectMode: JsonObjectSupport;
  supportsPromptEnvelope: boolean;
  supportsRepairAttempt: boolean;
  canBeUsedAsRepairProvider: boolean;
  knownBlockers: string[];
  accountBlockedCodes: string[];
  nonRepairableErrorCodes: string[];
  diagnosticNotes: string[];
};

export type ProviderDiagnostic = {
  provider: E150ProviderName;
  displayName: string;
  model: string | null;
  pipeline: "provider_probe" | "orchestrator_smoke";
  mode: SmokeMode;
  stage: "provider_probe" | "runtime" | "analyze_contract";
  status: DiagnosticStatus;
  errorKind: AiErrorKind | null;
  providerErrorCode: string | null;
  httpStatus: number | null;
  errorMessage: string | null;
  reason: string | null;
  validationMode: "none" | "json_only" | "analyze_schema";
  providerStatus: ProviderReachability;
  adapterStatus: AdapterStatus;
  parseStatus: ParseStatus;
  schemaStatus: SchemaStatus;
  parseError: string | null;
  schemaError: string | null;
  schemaPath: string | null;
  rawExcerpt: string | null;
  durationMs: number | null;
  tokensIn: number | null;
  tokensOut: number | null;
  estimatedCostUsd?: number | null;
  estimatedCostEur?: number | null;
  costKnown?: boolean;
  pricingSource?: string | null;
  costReason?: string | null;
  runCostGroup?: RunCostGroup | null;
  smokeMode?: SmokeExecutionMode | null;
  budgetProfile?: SmokeBudgetProfile | null;
  fallbackUsed: boolean | null;
  fallbackReason: string | null;
  journeyDecision: JourneyDecision;
  strictStatus: ContractStrictStatus;
  strictProviderErrorCode: string | null;
  strictSchemaPath: string | null;
  repairAttempted: boolean;
  repairStatus: ContractRepairStatus;
  repairProviderErrorCode: string | null;
  repairSchemaPath: string | null;
  repairReason: string | null;
  repairUsed: boolean;
  directStrictStatus: ContractStrictStatus;
  draftStatus: DraftStatus;
  envelopeBuildStatus: EnvelopeBuildStatus;
  finalSchemaStatus: FinalSchemaStatus;
  finalContractStatus: FinalContractStatus;
  buildWarnings: string[];
  filledDefaults: string[];
  missingContainers: string[];
  normalizedEnumWarnings: string[];
  generatedIds: string[];
  nativeStrategy: NativeStrategy;
  preferredContractStrategy: ContractStrategy;
  providerStrategy: ContractStrategy;
  fallbackStrategy: ContractStrategy;
  supportsStrictJsonSchema: boolean;
  supportsJsonObjectMode: JsonObjectSupport;
  supportsPromptEnvelope: boolean;
  supportsRepairAttempt: boolean;
  canBeUsedAsRepairProvider: boolean;
  knownBlockers: string[];
  nonRepairableErrorCodes: string[];
  diagnosticNotes: string[];
  formatUsed: "json_schema" | "json_object" | null;
  didFallback: boolean | null;
  timeoutMs?: number | null;
  maxOutputTokens?: number | null;
  openaiErrorCode?: string | null;
  openaiErrorMessage?: string | null;
  selectedSmokeModel?: string | null;
  smokeModelEnvPresent?: boolean | null;
  effectiveModel?: string | null;
  openAiSmokeModelMismatch?: boolean | null;
  rootCause: string;
  nextAction: string;
};

const REPAIRABLE_CONTRACT_ERROR_CODES = new Set([
  "TOP_LEVEL_ARRAY",
  "TOP_LEVEL_STRING",
  "TOP_LEVEL_NOT_OBJECT",
  "SCHEMA_INVALID",
  "BAD_JSON",
]);

const NON_REPAIRABLE_CONTRACT_ERROR_CODES = new Set([
  "RATE_LIMIT",
  "PAYMENT_REQUIRED",
  "UNAUTHORIZED",
  "CONFIG_MISSING",
  "TIMEOUT",
  "RESOURCE_EXHAUSTED",
  "UNAVAILABLE",
  "UPSTREAM_BAD_RESPONSE",
]);

const ACCOUNT_BLOCKED_ERROR_CODES = new Set([
  "RATE_LIMIT",
  "RESOURCE_EXHAUSTED",
  "PAYMENT_REQUIRED",
  "UNAUTHORIZED",
  "INVALID_API_KEY",
  "CONFIG_MISSING",
]);

export function isRepairableContractErrorCode(code: string | null | undefined): boolean {
  if (!code) return false;
  return REPAIRABLE_CONTRACT_ERROR_CODES.has(code);
}

export function isNonRepairableContractErrorCode(code: string | null | undefined): boolean {
  if (!code) return false;
  return NON_REPAIRABLE_CONTRACT_ERROR_CODES.has(code);
}

export function isAccountBlockedErrorCode(code: string | null | undefined): boolean {
  if (!code) return false;
  return ACCOUNT_BLOCKED_ERROR_CODES.has(code);
}

export function getProviderContractCapabilities(provider: E150ProviderName): ProviderContractCapabilities {
  // Capabilities are intentionally derived only from adapter behavior implemented in this repo.
  switch (provider) {
    case "openai":
      return {
        provider,
        nativeStrategy: "openai_responses_json_schema",
        preferredContractStrategy: "json_schema",
        fallbackStrategy: "json_object_envelope",
        supportsStrictJsonSchema: true,
        supportsJsonObjectMode: true,
        supportsPromptEnvelope: true,
        supportsRepairAttempt: true,
        canBeUsedAsRepairProvider: true,
        knownBlockers: ["TIMEOUT", "RATE_LIMIT", "UNAUTHORIZED", "PAYMENT_REQUIRED"],
        accountBlockedCodes: ["RATE_LIMIT", "UNAUTHORIZED", "INVALID_API_KEY", "PAYMENT_REQUIRED"],
        nonRepairableErrorCodes: ["TIMEOUT", "RATE_LIMIT", "UNAUTHORIZED", "PAYMENT_REQUIRED"],
        diagnosticNotes: [
          "Adapter nutzt OpenAI Responses API mit json_schema und json_object Fallback.",
          "formatUsed/didFallback koennen aus Adapter-Metadaten transportiert werden.",
          "TIMEOUT/OPENAI_EMPTY_OUTPUT bleiben runtime/contract blocker.",
        ],
      };
    case "anthropic":
      return {
        provider,
        nativeStrategy: "provider_native_unknown",
        preferredContractStrategy: "prompt_envelope",
        fallbackStrategy: "prompt_envelope",
        supportsStrictJsonSchema: false,
        supportsJsonObjectMode: "prompt_only",
        supportsPromptEnvelope: true,
        supportsRepairAttempt: true,
        canBeUsedAsRepairProvider: true,
        knownBlockers: ["TIMEOUT", "RATE_LIMIT", "UNAUTHORIZED"],
        accountBlockedCodes: ["RATE_LIMIT", "UNAUTHORIZED", "INVALID_API_KEY"],
        nonRepairableErrorCodes: ["TIMEOUT", "RATE_LIMIT", "UNAUTHORIZED"],
        diagnosticNotes: [
          "Aktueller Adapter implementiert keinen nativen Tool-use/JSON-Schema Contract-Pfad.",
          "TODO: Anthropic tool-use / structured-output nativ evaluieren und nur bei Adapter-Implementierung aktivieren.",
        ],
      };
    case "mistral":
      return {
        provider,
        nativeStrategy: "mistral_response_format_json_object",
        preferredContractStrategy: "json_object_envelope",
        fallbackStrategy: "prompt_envelope",
        supportsStrictJsonSchema: false,
        supportsJsonObjectMode: true,
        supportsPromptEnvelope: true,
        supportsRepairAttempt: true,
        canBeUsedAsRepairProvider: true,
        knownBlockers: ["TIMEOUT", "RATE_LIMIT", "UNAUTHORIZED"],
        accountBlockedCodes: ["RATE_LIMIT", "UNAUTHORIZED", "INVALID_API_KEY"],
        nonRepairableErrorCodes: ["TIMEOUT", "RATE_LIMIT", "UNAUTHORIZED"],
        diagnosticNotes: [
          "Adapter setzt response_format=json_object.",
          "TODO: nativen JSON-Schema-Pfad erst nach belegbarer Adapter-Implementierung markieren.",
        ],
      };
    case "gemini":
      return {
        provider,
        nativeStrategy: "gemini_response_mime_json",
        preferredContractStrategy: "json_object_envelope",
        fallbackStrategy: "prompt_envelope",
        supportsStrictJsonSchema: false,
        supportsJsonObjectMode: true,
        supportsPromptEnvelope: true,
        supportsRepairAttempt: true,
        canBeUsedAsRepairProvider: true,
        knownBlockers: ["RATE_LIMIT", "RESOURCE_EXHAUSTED", "UNAUTHORIZED", "TIMEOUT", "UNAVAILABLE"],
        accountBlockedCodes: ["RATE_LIMIT", "RESOURCE_EXHAUSTED", "UNAUTHORIZED", "INVALID_API_KEY"],
        nonRepairableErrorCodes: ["TIMEOUT", "RATE_LIMIT", "RESOURCE_EXHAUSTED", "UNAUTHORIZED", "UNAVAILABLE"],
        diagnosticNotes: [
          "Adapter nutzt responseMimeType=application/json mit 400-Fallback ohne responseMimeType.",
          "Bei 429/503/RESOURCE_EXHAUSTED/UNAVAILABLE bleibt Provider blocked/non-repairable.",
        ],
      };
    case "ari":
      return {
        provider,
        nativeStrategy: "ari_prompt_envelope_only",
        preferredContractStrategy: "prompt_envelope",
        fallbackStrategy: "prompt_envelope",
        supportsStrictJsonSchema: false,
        supportsJsonObjectMode: "prompt_only",
        supportsPromptEnvelope: true,
        supportsRepairAttempt: true,
        canBeUsedAsRepairProvider: false,
        knownBlockers: ["PAYMENT_REQUIRED", "UNAUTHORIZED", "CONFIG_MISSING", "TIMEOUT"],
        accountBlockedCodes: ["PAYMENT_REQUIRED", "UNAUTHORIZED", "INVALID_API_KEY", "CONFIG_MISSING"],
        nonRepairableErrorCodes: ["TIMEOUT", "PAYMENT_REQUIRED", "UNAUTHORIZED", "CONFIG_MISSING"],
        diagnosticNotes: [
          "ARI bleibt bei 402/PAYMENT_REQUIRED blocked und non-repairable.",
          "TODO: ARI perspektivisch als arbiter/router/research/verification layer evaluieren.",
        ],
      };
    default:
      return {
        provider,
        nativeStrategy: "anthropic_prompt_envelope_only",
        preferredContractStrategy: "provider_native",
        fallbackStrategy: "prompt_envelope",
        supportsStrictJsonSchema: false,
        supportsJsonObjectMode: "prompt_only",
        supportsPromptEnvelope: true,
        supportsRepairAttempt: false,
        canBeUsedAsRepairProvider: false,
        knownBlockers: [],
        accountBlockedCodes: [],
        nonRepairableErrorCodes: [],
        diagnosticNotes: [],
      };
  }
}

export function providerDisplayName(provider: E150ProviderName): string {
  switch (provider) {
    case "openai":
      return "GPT / OpenAI";
    case "anthropic":
      return "Anthropic";
    case "mistral":
      return "Mistral";
    case "gemini":
      return "Gemini";
    case "ari":
      return "ARI";
    default:
      return provider;
  }
}

export function defaultModelForProvider(provider: E150ProviderName): string {
  const policyResult = tryGetAiRuntimePolicy();
  const policy = policyResult.ok ? policyResult.policy : null;
  switch (provider) {
    case "openai":
      return policy?.openai.model ?? preferredProviderModel("openai");
    case "anthropic":
      return policy?.anthropic.model ?? preferredProviderModel("anthropic");
    case "mistral":
      return policy?.mistral.model ?? preferredProviderModel("mistral");
    case "gemini":
      return policy?.gemini.model ?? preferredProviderModel("gemini");
    case "ari":
      return process.env.ARI_MODEL ?? "ari-main";
    default:
      return "unknown";
  }
}

export function sortProviderDiagnostics(rows: ProviderDiagnostic[]): ProviderDiagnostic[] {
  return [...rows].sort((left, right) => {
    const leftIndex = PROVIDER_ORDER.indexOf(left.provider);
    const rightIndex = PROVIDER_ORDER.indexOf(right.provider);
    return (leftIndex >= 0 ? leftIndex : 99) - (rightIndex >= 0 ? rightIndex : 99);
  });
}

function normalizeMessage(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function sanitizeDiagnosticText(value: unknown): string | null {
  const message = normalizeMessage(value);
  if (!message) return null;
  if (/^[A-Za-z0-9_.-]{2,120}$/.test(message)) return message;
  const lowered = message.toLowerCase();
  if (lowered.includes("openai_empty_output")) return "OPENAI_EMPTY_OUTPUT";
  if (lowered.includes("model") && lowered.includes("not found")) return "MODEL_NOT_FOUND";
  if (lowered.includes("timeout") || lowered.includes("timed out") || lowered.includes("aborted")) return "TIMEOUT";
  if (lowered.includes("rate limit") || lowered.includes("429")) return "RATE_LIMIT";
  if (lowered.includes("unauthorized") || lowered.includes("forbidden") || lowered.includes("401") || lowered.includes("403")) {
    return "UNAUTHORIZED";
  }
  if (lowered.includes("payment required") || lowered.includes("402")) return "PAYMENT_REQUIRED";
  if (lowered.includes("invalid api key") || lowered.includes("api key fehlt") || lowered.includes("missing api key")) {
    return "INVALID_API_KEY";
  }
  if (lowered.includes("schema")) return "SCHEMA_INVALID";
  if (lowered.includes("json") || lowered.includes("parse")) return "BAD_JSON";
  if (
    lowered.includes("missing ") &&
    (lowered.includes("api_key") ||
      lowered.includes("base_url") ||
      lowered.includes("api_url") ||
      lowered.includes("ari_url"))
  ) {
    return "CONFIG_MISSING";
  }
  if (lowered.includes("config")) return "CONFIG_MISSING";
  if (lowered.includes("resource_exhausted")) return "RESOURCE_EXHAUSTED";
  if (lowered.includes("unavailable")) return "UNAVAILABLE";
  return "provider_error";
}

export function sanitizeRawExcerpt(value: unknown, max = 500): string | null {
  void value;
  void max;
  return null;
}

export function extractProviderErrorCode(error: unknown): string | null {
  const err = error as Record<string, any>;
  if (typeof err?.code === "string" && err.code) return err.code;
  if (typeof err?.meta?.code === "string" && err.meta.code) return err.meta.code;
  if (typeof err?.meta?.type === "string" && err.meta.type) return err.meta.type;
  if (typeof err?.payload?.error?.code === "string" && err.payload.error.code) {
    return err.payload.error.code;
  }
  if (typeof err?.payload?.error?.status === "string" && err.payload.error.status) {
    return err.payload.error.status;
  }
  return null;
}

export function mapErrorToKind(error: unknown): AiErrorKind {
  if (!error) return "UNKNOWN";
  if ((error as any)?.errorKind === "CANCELLED") return "CANCELLED";

  const message =
    normalizeMessage((error as any)?.message) ||
    (typeof error === "string" ? error : "");
  const status =
    typeof (error as any)?.status === "number"
      ? (error as any).status
      : typeof (error as any)?.httpStatus === "number"
        ? (error as any).httpStatus
        : null;

  if ((error as any)?.name === "AbortError" || /timed out|timeout/i.test(message)) {
    return "TIMEOUT";
  }
  if (status === 402 || /payment required|free trial.*ended|credit/i.test(message)) {
    return "UNKNOWN";
  }
  if (status === 404 || (/model/i.test(message) && /404/.test(message))) return "MODEL_NOT_FOUND";
  if (status === 429) return "RATE_LIMIT";
  if (status === 401 || status === 403 || /unauthorized|forbidden|invalid token/i.test(message)) {
    return "UNAUTHORIZED";
  }
  if (
    status === 400 && /api key|token/i.test(message) ||
    /api key|invalid api key|invalid_api_key/i.test(message)
  ) {
    return "INVALID_API_KEY";
  }
  if (/json|schema|parse|zod/i.test(message)) return "BAD_JSON";
  return status ? "INTERNAL" : "UNKNOWN";
}

export function resolveJourneyDecision(
  entryState: ProviderMatrixEntry["state"] | "probe",
  reason: string | null,
): JourneyDecision {
  const reasonText = normalizeMessage(reason).toLowerCase();
  if (entryState === "probe") return "selected";
  if (entryState === "skipped") {
    if (reasonText.includes("not_in_journey_plan")) return "not_in_plan";
    if (reasonText.includes("fallback_not_needed")) return "fallback_not_needed";
    return "skipped";
  }
  if (entryState === "disabled") {
    if (looksConfigMissing(reason)) return "config_missing";
    return "disabled";
  }
  return "selected";
}

export function looksConfigMissing(reason: string | null | undefined): boolean {
  const text = normalizeMessage(reason).toLowerCase();
  if (!text) return false;
  return (
    text.includes("api key fehlt") ||
    text.includes("ungultig") ||
    text.includes("ungueltig") ||
    text.includes("basis-url fehlt") ||
    text.includes("config") ||
    text.includes("missing") ||
    text.includes("disabled_by_env")
  );
}

export function deriveProviderStatus(kind: AiErrorKind | null, status: DiagnosticStatus): ProviderReachability {
  if (status === "ok") return "reachable";
  if (!kind) return "unknown";
  if (kind === "TIMEOUT" || kind === "INTERNAL" || kind === "RATE_LIMIT") return "unknown";
  if (kind === "BAD_JSON") return "reachable";
  if (kind === "MODEL_NOT_FOUND" || kind === "UNAUTHORIZED" || kind === "INVALID_API_KEY") return "down";
  return "unknown";
}

export function deriveRootCause(row: Pick<
  ProviderDiagnostic,
  | "status"
  | "journeyDecision"
  | "errorKind"
  | "parseStatus"
  | "schemaStatus"
  | "providerErrorCode"
  | "providerStatus"
  | "finalContractStatus"
>): string {
  if (row.finalContractStatus === "strict_ok") return "STRICT_OK";
  if (row.finalContractStatus === "built_valid") return "BUILT_VALID";
  if (row.finalContractStatus === "repaired_degraded") return "REPAIRED_DEGRADED";
  if (row.providerErrorCode === "PAYMENT_REQUIRED" || row.providerErrorCode === "CONFIG_MISSING_COST_APPROVAL") {
    return "PAYMENT_REQUIRED";
  }
  if (row.providerErrorCode === "TIMEOUT" || row.errorKind === "TIMEOUT") return "TIMEOUT";
  if (row.journeyDecision === "fallback_not_needed") return "FALLBACK_NOT_NEEDED";
  if (row.status === "skipped") return "SKIPPED";
  if (row.journeyDecision === "disabled") return "DISABLED";
  if (row.finalContractStatus === "blocked") return "BLOCKED";
  if (row.status === "ok") return "OK";
  if (row.status === "config_missing" || row.journeyDecision === "config_missing") return "CONFIG_MISSING";
  if (row.journeyDecision === "not_in_plan") return "NOT_IN_JOURNEY_PLAN";
  if (row.errorKind === "MODEL_NOT_FOUND") return "MODEL_NOT_FOUND";
  if (row.providerErrorCode === "OPENAI_EMPTY_OUTPUT") return "OPENAI_EMPTY_OUTPUT";
  if (row.errorKind === "BAD_JSON" && row.parseStatus === "failed") return "BAD_JSON";
  if (row.schemaStatus === "failed") return "SCHEMA_FAILED";
  if (row.errorKind === "UNAUTHORIZED" || row.errorKind === "INVALID_API_KEY") return "AUTH_FAILED";
  if (row.providerStatus === "down") return "PROVIDER_DOWN";
  return "RUNTIME_FAILED";
}

export function deriveNextAction(row: Pick<
  ProviderDiagnostic,
  | "provider"
  | "status"
  | "journeyDecision"
  | "errorKind"
  | "providerStatus"
  | "parseStatus"
  | "schemaStatus"
  | "providerErrorCode"
  | "finalContractStatus"
  | "openAiSmokeModelMismatch"
>): string {
  if (row.provider === "openai" && row.openAiSmokeModelMismatch) {
    return "OPENAI_SMOKE_MODEL prüfen; Direct Contract sollte Smoke-Profil nutzen.";
  }
  if (row.providerErrorCode === "PAYMENT_REQUIRED" || row.providerErrorCode === "CONFIG_MISSING_COST_APPROVAL") {
    return "Billing-/Credit-Gate prüfen; Provider ist kostenbedingt blockiert.";
  }
  if (row.providerErrorCode === "TIMEOUT" || row.errorKind === "TIMEOUT") {
    return "Contract verkleinern, Timeout erhöhen oder Provider-Latenz prüfen.";
  }
  if (row.finalContractStatus === "strict_ok") return "Keine Aktion";
  if (row.finalContractStatus === "built_valid") {
    return "Direkter Strict-Contract fehlt; deterministischer Envelope ist nutzbar, Provider-Strict-Pfad nachhaerten.";
  }
  if (row.finalContractStatus === "repaired_degraded") {
    return "Nur repaired/degraded nutzbar; strict Contract auf Providerseite nachhaerten.";
  }
  if (row.finalContractStatus === "blocked") {
    return "Account-/Quota-/Billing-/Auth-Blocker pruefen.";
  }
  if (row.status === "ok") return "Keine Aktion";
  if (row.journeyDecision === "fallback_not_needed") {
    return "Kein Providerfehler; der Journey-Fallback wurde in diesem Lauf bewusst nicht gebraucht.";
  }
  if (row.status === "skipped") {
    return "Kein Providerfehler; dieser Pfad wurde in diesem Lauf nicht ausgefuehrt.";
  }
  if (row.status === "config_missing" || row.journeyDecision === "config_missing") {
    return "ENV pruefen.";
  }
  if (row.journeyDecision === "not_in_plan") {
    return "Provider ist nicht Teil dieses Orchestrator-Plans; Direktprobe nutzen.";
  }
  if (row.errorKind === "MODEL_NOT_FOUND") {
    return "Modellname/Fallback aktualisieren.";
  }
  if (row.providerErrorCode === "OPENAI_EMPTY_OUTPUT") {
    return "Reasoning/output format pruefen.";
  }
  if (row.errorKind === "BAD_JSON" && row.providerStatus === "reachable") {
    return "Provider erreichbar; Analyze-/JSON-Contract pruefen.";
  }
  if (row.parseStatus === "failed") {
    return "JSON-Parser und Adapter-Output pruefen.";
  }
  if (row.schemaStatus === "failed") {
    return "Schema-Contract und Pflichtfelder pruefen.";
  }
  if (row.errorKind === "UNAUTHORIZED" || row.errorKind === "INVALID_API_KEY") {
    return "API-Key/Berechtigung pruefen.";
  }
  return "Adapter-/Runtime-Logs pruefen.";
}
