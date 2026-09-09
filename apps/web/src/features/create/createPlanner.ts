import { callOpenAIJson } from "@features/ai";
import { callAnthropic } from "@features/ai/providers/anthropic";
import { callMistral } from "@features/ai/providers/mistral";
import { z } from "zod";
import { logAiUsage } from "@core/telemetry/aiUsage";
import type { AiErrorKind, AiPipelineName } from "@core/telemetry/aiUsageTypes";
import { getAiRuntimePolicy } from "@features/ai/aiRuntimePolicy";
import { stableHash } from "@core/utils/hash";
import type {
  CreatePlannerProviderAttemptIdentity,
  CreatePlannerValidatedProviderSource,
} from "@/features/create/createPlannerProviderContract";
import {
  CREATE_STANDARD_INTAKE_TIMEOUT_MS,
  resolveCreateIntakeTiming,
} from "@/features/create/createFastIntakeTiming";
import {
  extractCreateStructuredTopicLabels,
  isCreateFastIntakeText,
  resolveCreateIntakeIssueMode,
  type CreateIntakeIssueMode,
} from "@/features/create/createIntakeClassification";
export { isCreatePlannerProviderSource } from "@/features/create/createPlannerProviderContract";
export { isCreateFastIntakeText } from "@/features/create/createIntakeClassification";

export type CreatePlannerScope =
  | "local"
  | "district"
  | "municipal"
  | "state"
  | "federal"
  | "eu"
  | "international"
  | "unclear";
export type CreatePlannerStance =
  | "pro"
  | "contra"
  | "mixed"
  | "open"
  | "reform_oriented"
  | "unclear";
export type CreatePlannerRecommendedLane = "standard" | "create_fast_followup";
export type CreatePlannerSource =
  | "openai"
  | "anthropic"
  | "mistral"
  | "technical_fallback"
  | "heuristic_fallback";

export type CreatePlannerProviderName = "openai" | "anthropic" | "mistral" | "local_fallback" | "none";
export type CreatePlannerDegradedReason =
  | "missing_provider_key"
  | "model_not_found"
  | "provider_error"
  | "invalid_json"
  | "invalid_provider_payload"
  | "normalization_failed"
  | "quality_gate_failed"
  | "timeout"
  | "rate_limited";
export type CreatePlannerQualityStatus = "specific" | "generic" | "failed" | "needs_confirmation";
export type CreatePlannerDebug = {
  attemptedProvider: "openai" | "anthropic" | "mistral" | null;
  usedProvider: CreatePlannerProviderName;
  attemptedModel?: string | null;
  usedModel?: string | null;
  attemptNumber?: number | null;
  providerAvailable: boolean;
  providerErrorCode?: string | null;
  rawPayloadValid: boolean;
  rawTextValid: boolean;
  normalizedPayloadValid: boolean;
  qualityGatePassed: boolean;
  responseLength?: number | null;
  responseHash?: string | null;
};

export type CreatePlannerProviderPlan = {
  lane: CreatePlannerRecommendedLane;
  plannerProvider: CreatePlannerProviderName;
  plannerRole: "planner_only";
  structureProvider: "mistral";
  summaryProvider: "claude";
  researchUsed: "none";
  researchProvider: null;
  deepSearchUsed: false;
  graphMatch: "after_structure";
};

export type CreatePlannerPermissions = {
  nonMutative: true;
  canPublish: false;
  canSave: false;
  canMerge: false;
  canDeepSearch: false;
};

export type CreatePlannerResult = {
  source: CreatePlannerSource;
  plannerSource: CreatePlannerSource;
  plannerProvider: CreatePlannerProviderName;
  plannerRole: "planner_only";
  plannerTopic: string;
  plannerCore: string;
  plannerScope: CreatePlannerScope[];
  plannerStance: CreatePlannerStance;
  plannerClusters: string[];
  plannerOpenQuestions: string[];
  shortSummary: string;
  topicCandidates: string[];
  clusterCandidates: string[];
  scopeCandidates: CreatePlannerScope[];
  stance: CreatePlannerStance;
  openQuestions: string[];
  graphSearchTerms: string[];
  materialSignals: string[];
  recommendedLane: CreatePlannerRecommendedLane;
  issueMode?: CreateIntakeIssueMode;
  timingLane?: "fast" | "standard";
  inputLength?: number;
  providerPlan: CreatePlannerProviderPlan;
  permissions: CreatePlannerPermissions;
  plannerDegraded: boolean;
  degradedReason: CreatePlannerDegradedReason | null;
  plannerDegradedReason: CreatePlannerDegradedReason | null;
  qualityStatus: CreatePlannerQualityStatus;
  qualityIssues: string[];
  providerCallAttempted: boolean;
  providerCallSucceeded: boolean;
  providerAttemptCount: number;
  providerAttempts: CreatePlannerProviderAttemptIdentity[];
  plannerDebug: CreatePlannerDebug;
  runtimeMs?: number;
};

type BuildCreatePlannerInput = {
  text: string;
  locale: string;
  requestId?: string | null;
  operationId?: string | null;
  operationType?: string | null;
  dossierId?: string | null;
  userId?: string | null;
  organizationId?: string | null;
};

export type PlannerAttempt =
  | { ok: true; result: CreatePlannerResult; debug: CreatePlannerDebug }
  | {
      ok: false;
      reason: CreatePlannerDegradedReason;
      debug: CreatePlannerDebug;
    };

type PlannerAttemptBudget = {
  maxAttempts: number;
  attempts: CreatePlannerProviderAttemptIdentity[];
};

type CreatePlannerDraft = {
  plannerTopic: string;
  plannerCore: string;
  plannerScope: CreatePlannerScope[];
  plannerStance: CreatePlannerStance;
  plannerClusters: string[];
  plannerOpenQuestions: string[];
  shortSummary: string;
  topicCandidates: string[];
  clusterCandidates: string[];
  scopeCandidates: CreatePlannerScope[];
  stance: CreatePlannerStance;
  openQuestions: string[];
  graphSearchTerms: string[];
  materialSignals: string[];
  recommendedLane: CreatePlannerRecommendedLane;
};

type OpenAiPlannerPayload = {
  plannerTopic?: unknown;
  plannerCore?: unknown;
  plannerScope?: unknown;
  plannerStance?: unknown;
  plannerClusters?: unknown;
  plannerOpenQuestions?: unknown;
  shortSummary?: unknown;
  topicCandidates?: unknown;
  clusterCandidates?: unknown;
  scopeCandidates?: unknown;
  stance?: unknown;
  openQuestions?: unknown;
  graphSearchTerms?: unknown;
  materialSignals?: unknown;
  recommendedLane?: unknown;
};

const CREATE_PLANNER_USAGE_PIPELINE: AiPipelineName = "other";

const CREATE_PLANNER_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "plannerTopic",
    "plannerCore",
    "plannerScope",
    "plannerStance",
    "plannerClusters",
    "plannerOpenQuestions",
    "topicCandidates",
  ],
  properties: {
    plannerTopic: { type: "string" },
    plannerCore: { type: "string" },
    plannerScope: {
      type: "array",
      items: { type: "string", enum: ["local", "district", "municipal", "state", "federal", "eu", "international", "unclear"] },
    },
    plannerStance: {
      type: "string",
      enum: ["pro", "contra", "mixed", "open", "reform_oriented", "unclear"],
    },
    plannerClusters: { type: "array", items: { type: "string" } },
    plannerOpenQuestions: { type: "array", items: { type: "string" } },
    topicCandidates: { type: "array", items: { type: "string" } },
  },
} as const;

const PlannerPublicTextSchema = z
  .string()
  .trim()
  .min(1)
  .refine(isPublicPlannerText, "technical_public_value");
const PlannerScopeSchema = z.enum([
  "local",
  "district",
  "municipal",
  "state",
  "federal",
  "eu",
  "international",
  "unclear",
]);
const PlannerStanceSchema = z.enum([
  "pro",
  "contra",
  "mixed",
  "open",
  "reform_oriented",
  "unclear",
]);
const CreatePlannerProviderPayloadSchema = z
  .object({
    plannerTopic: PlannerPublicTextSchema,
    plannerCore: PlannerPublicTextSchema,
    plannerScope: z.array(PlannerScopeSchema),
    plannerStance: PlannerStanceSchema,
    plannerClusters: z.array(PlannerPublicTextSchema),
    plannerOpenQuestions: z.array(PlannerPublicTextSchema),
    shortSummary: PlannerPublicTextSchema.optional(),
    topicCandidates: z.array(PlannerPublicTextSchema),
    clusterCandidates: z.array(PlannerPublicTextSchema).optional(),
    scopeCandidates: z.array(PlannerScopeSchema).optional(),
    stance: PlannerStanceSchema.optional(),
    openQuestions: z.array(PlannerPublicTextSchema).optional(),
    graphSearchTerms: z.array(PlannerPublicTextSchema).optional(),
    materialSignals: z.array(PlannerPublicTextSchema).optional(),
    recommendedLane: z.enum(["standard", "create_fast_followup"]).optional(),
  })
  .strict();

const GENERIC_CORE_PATTERNS = [
  /^aussage$/i,
  /^beitrag$/i,
  /^hinweis$/i,
  /^fragestellung$/i,
  /^neues öffentliches thema strukturieren$/i,
  /^öffentliches thema mit klärungsbedarf$/i,
] as const;

const GENERIC_TOPIC_PATTERNS = [
  /öffentliches anliegen/i,
  /thema noch offen/i,
  /klärungsbedarf/i,
  /^allgemeines thema$/i,
] as const;

const GENERIC_GRAPH_TERM_PATTERNS = [/öffentliches anliegen/i, /^aussage$/i, /neues thema/i, /^beitrag$/i] as const;

const BROAD_COMMUNAL_TOPIC_RULES = [
  { label: "Wohnen", pattern: /wohnraum|wohnen|miete|mieten|zweckentfremdung|wohnungsbau|neubau/i },
  { label: "Verkehr", pattern: /verkehr|bus|bahn|radweg|radwege|auto|mobilität|mobilitaet|schulweg/i },
  { label: "Klima", pattern: /klima|klimaziel|co2|emission|generation/i },
  { label: "Bildung", pattern: /schule|schulen|bildung|sprachförderung|sprachfoerderung|digitale ausstattung|basiskompetenz/i },
  { label: "Migration/Integration", pattern: /migration|integration|zuwander/i },
  { label: "Sicherheit/Rechtsstaat", pattern: /sicherheit|rechtsstaat|regeln|regelverstöße?|regelverstoesse?|missachtet|handlungsfähig|handlungsfaehig/i },
  { label: "Gesundheit/Pflege", pattern: /gesundheit|pflege|pflegedienst/i },
  { label: "Kommunale Finanzen", pattern: /kommunale finanz|haushalt|haushalts|kosten|finanzierung/i },
  { label: "Bürgerbeteiligung", pattern: /bürgerbeteiligung|buergerbeteiligung|priorisieren|mitentscheiden|direkt priorisieren/i },
] as const;

const EXPLICIT_OFFICEHOLDER_PATTERNS = [
  /\bamtsträger\b/i,
  /\bamtstraeger\b/i,
  /\bpolitiker\b/i,
  /\bmandatsträger\b/i,
  /\bmandatstraeger\b/i,
  /\bminister\b/i,
  /\babgeordnete?\b/i,
  /\bpolitische ämter\b/i,
  /\bpolitische aemter\b/i,
  /\bqualifikation für amt\b/i,
  /\bqualifikation fuer amt\b/i,
  /\bsanktionen für amtsträger\b/i,
  /\bsanktionen fuer amtstraeger\b/i,
] as const;

const ANIMAL_WELFARE_KEYWORDS = [
  /\btierschutz\b/i,
  /\btierhaltung\b/i,
  /\btierwohl\b/i,
  /\bhaltungsstufe\b/i,
  /\bbio[- ]?label\b/i,
  /\bfleisch\b/i,
  /\bgeflügel\b/i,
  /\bgefluegel\b/i,
  /\bfisch\b/i,
  /\bagrar\b/i,
  /\bimport\b/i,
  /\bexport\b/i,
  /\beuropa\b/i,
  /\beu\b/i,
  /\bweltweit\b/i,
  /\binternational\b/i,
  /\bethisch\b/i,
  /\bmindeststandards?\b/i,
  /\bhaltungsstandards?\b/i,
] as const;

const COMPLEX_CIVIC_CLUSTER_RULES = [
  {
    id: "rights",
    label: "Menschenwürde, Grundrechte und Verantwortung",
    patterns: [
      /würde des menschen|wuerde des menschen|menschenwürde|menschenwuerde/i,
      /grundrechte?|grundgesetz/i,
      /pflichten und rechte|verantwortung/i,
    ],
  },
  {
    id: "migration",
    label: "Migration, offene Grenzen und gesellschaftliche Regeln",
    patterns: [/grenzpolitik|offene grenzen|offene grenz/i, /migration|grenzen/i],
  },
  {
    id: "eu_industry",
    label: "Europäische Energie- und Industriepolitik",
    patterns: [/energiepolitik|industriepolitik/i, /gesamt[- ]?europa|europa/i],
  },
  {
    id: "participation",
    label: "Regionale Abstimmungen und Bürgerbeteiligung",
    patterns: [/abstimmen lassen|abstimmungen|abstimmen/i, /regionen|bürgerbeteiligung|buergerbeteiligung/i],
  },
  {
    id: "budget",
    label: "Budgetverteilung und öffentliche Prioritäten",
    patterns: [/budget|verteilen|pauschal/i, /prioritäten|prioritaeten|haushalt/i],
  },
] as const;

const QUOTA_EQUALITY_CLUSTER_RULES = [
  { label: "Gleichberechtigung", pattern: /gleichberechtigung|gleichstellung|chancengleichheit/i },
  { label: "Frauenquote", pattern: /frauenquote|geschlechterquote|geschlechterquoten/i },
  { label: "Minderheitenförderung", pattern: /minderheiten|minderheit|foerderung|förderung/i },
  { label: "wirtschaftliche Auswirkungen für Unternehmen", pattern: /wirtschaft|wirtschaftlich|unternehmen|betrieb|betriebe/i },
  { label: "Antidiskriminierung", pattern: /diskriminierung|gleichbehandlung|benachteiligung/i },
] as const;

const WORKSHOP_PARTICIPATION_TOPIC =
  "Arbeitsbedingungen und Teilhabe in Behindertenwerkstätten";
function resolveCitizenFirstSharedCore(text: string): {
  topic: string;
  aspects: string[];
} | null {
  const hasWorkshop = /behindertenwerkst(?:ä|ae)tt/i.test(text);
  const hasWage = /\bmindestlohn\b|\bentlohnung\b|\bvergütung\b|\bverguetung\b/i.test(text);
  const hasIntegration = /\bintegration\b|allgemeinen arbeitsmarkt/i.test(text);
  const hasGovernance =
    /\bkontroll|\btransparenz/i.test(text) &&
    /vorst(?:ä|ae)nd|tr(?:ä|ae)ger/i.test(text);
  if (!hasWorkshop || [hasWage, hasIntegration, hasGovernance].filter(Boolean).length < 2) return null;
  const aspects = dedupeStrings([
    hasWage ? "Faire Entlohnung / Mindestlohn" : null,
    hasIntegration ? "Integration in den allgemeinen Arbeitsmarkt" : null,
    hasGovernance ? "Kontrolle / Governance der Träger bzw. Vorstände" : null,
  ]);
  return {
    topic:
      hasWage && hasGovernance && !hasIntegration
        ? "Mindestlohn und Kontrolle in Behindertenwerkstätten"
        : WORKSHOP_PARTICIPATION_TOPIC,
    aspects,
  };
}

function dedupeStrings(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

function isPlannerScope(value: string): value is CreatePlannerScope {
  return ["local", "district", "municipal", "state", "federal", "eu", "international", "unclear"].includes(value);
}

function isPlannerStance(value: string): value is CreatePlannerStance {
  return ["pro", "contra", "mixed", "open", "reform_oriented", "unclear"].includes(value);
}

function isRecommendedLane(value: string): value is CreatePlannerRecommendedLane {
  return ["standard", "create_fast_followup"].includes(value);
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0 && isPublicPlannerText(entry));
}

const TECHNICAL_PUBLIC_VALUE_PATTERN = /\[object\s+(?:Object|Array)\]|^(?:undefined|null|nan|infinity)$/i;

function isPublicPlannerText(value: string): boolean {
  const normalized = value.trim();
  return normalized.length > 0 && !TECHNICAL_PUBLIC_VALUE_PATTERN.test(normalized);
}

function countPatternHits(text: string, patterns: readonly RegExp[]): number {
  return patterns.filter((pattern) => pattern.test(text)).length;
}

function normalizeDenseText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ");
}

function hasAnyPattern(text: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

const CREATE_FAST_INTAKE_MAX_OUTPUT_TOKENS = 400;

export function resolveCreatePlannerTimeoutMs(text?: string): number {
  const configured = getAiRuntimePolicy().plannerTimeoutMs;
  const selectedLimit = text
    ? resolveCreateIntakeTiming(text).serverTimeoutMs
    : CREATE_STANDARD_INTAKE_TIMEOUT_MS;
  return Math.min(configured, selectedLimit);
}

export function resolveCreatePlannerMaxOutputTokens(text: string): number {
  const configured = getAiRuntimePolicy().plannerMaxOutputTokens;
  return isCreateFastIntakeText(text)
    ? Math.min(configured, CREATE_FAST_INTAKE_MAX_OUTPUT_TOKENS)
    : configured;
}

function detectBroadCommunalTopicFields(text: string): string[] {
  return BROAD_COMMUNAL_TOPIC_RULES.filter((rule) => rule.pattern.test(text)).map((rule) => rule.label);
}

function isExplicitOfficeholderText(text: string): boolean {
  return EXPLICIT_OFFICEHOLDER_PATTERNS.some((pattern) => pattern.test(text));
}

function isAnimalWelfareText(text: string): boolean {
  return countPatternHits(text, ANIMAL_WELFARE_KEYWORDS) >= 4;
}

function detectComplexCivicClusters(text: string): string[] {
  return COMPLEX_CIVIC_CLUSTER_RULES.filter((rule) => rule.patterns.some((pattern) => pattern.test(text))).map((rule) => rule.label);
}

function isComplexCivicPolicyText(text: string): boolean {
  return detectComplexCivicClusters(text).length >= 4;
}

function detectQuotaEqualityClusters(text: string): string[] {
  return QUOTA_EQUALITY_CLUSTER_RULES.filter((rule) => rule.pattern.test(text)).map((rule) => rule.label);
}

function isQuotaEqualityPolicyText(text: string): boolean {
  const clusters = detectQuotaEqualityClusters(text);
  const hasQuotaSignal = /\bfrauenquote\b|\bquote\b|\bquoten\b/i.test(text);
  const hasEqualitySignal = /gleichberechtigung|gleichstellung|chancengleichheit|gleichbehandlung/i.test(text);
  const hasComparisonSignal = /minderheiten|minderheit|vergleich|andere gruppen/i.test(text);
  const hasBusinessSignal = /wirtschaft|wirtschaftlich|unternehmen|betrieb|betriebe/i.test(text);
  return clusters.length >= 3 || (hasQuotaSignal && hasEqualitySignal && (hasComparisonSignal || hasBusinessSignal));
}

function inferScopesFromText(text: string): CreatePlannerScope[] {
  const scopes = new Set<CreatePlannerScope>();
  if (/lokal|nachbarschaft|kiez|viertel|region/i.test(text)) scopes.add("local");
  if (/bezirk/i.test(text)) scopes.add("district");
  if (/kommune|kommunal|stadt|gemeinde/i.test(text)) scopes.add("municipal");
  if (/landtag|landes/i.test(text)) scopes.add("state");
  if (/bund|bundes|grundgesetz/i.test(text)) scopes.add("federal");
  if (/\beu\b|europa/i.test(text)) scopes.add("eu");
  if (/international|weltweit|global|import|export/i.test(text)) scopes.add("international");
  if (scopes.size === 0) scopes.add("unclear");
  return Array.from(scopes).slice(0, 4);
}

const NON_MUNICIPAL_LOCATION_TOKENS = new Set([
  "deutschland",
  "europa",
  "zukunft",
  "allgemein",
  "bund",
  "land",
]);

function hasExplicitMunicipalLocation(text: string): boolean {
  if (/\b\d{5}\b/.test(text)) return true;
  if (
    /\b(?:Stadt|stadt|Gemeinde|gemeinde|Kommune|kommune|Bezirk|bezirk|Ortsteil|ortsteil|Landkreis|landkreis)\s+(?:von\s+)?[A-ZÄÖÜ][\p{L}ÄÖÜäöüß-]{2,}/u.test(
      text,
    )
  ) {
    return true;
  }
  const match = text.match(
    /(?:^|[.!?]\s+|\s)(?:In|in|Aus|aus|Für|für|Bei|bei)\s+([A-ZÄÖÜ][\p{L}ÄÖÜäöüß-]{2,})/u,
  );
  if (!match?.[1]) return false;
  return !NON_MUNICIPAL_LOCATION_TOKENS.has(match[1].toLowerCase());
}

function municipalLocationQuestion(locale: string): string {
  return locale.toLowerCase().startsWith("de")
    ? "Auf welche Stadt, Gemeinde oder welchen Ortsteil bezieht sich dein Anliegen?"
    : "Which city, municipality or district does your contribution refer to?";
}

function needsMunicipalLocationQuestion(
  text: string,
  scopes: CreatePlannerScope[],
): boolean {
  return scopes.includes("municipal") && !hasExplicitMunicipalLocation(text);
}

function baseProviderPlan(
  plannerProvider: CreatePlannerProviderName,
  lane: CreatePlannerRecommendedLane,
): CreatePlannerProviderPlan {
  return {
    lane,
    plannerProvider,
    plannerRole: "planner_only",
    structureProvider: "mistral",
    summaryProvider: "claude",
    researchUsed: "none",
    researchProvider: null,
    deepSearchUsed: false,
    graphMatch: "after_structure",
  };
}

function basePermissions(): CreatePlannerPermissions {
  return {
    nonMutative: true,
    canPublish: false,
    canSave: false,
    canMerge: false,
    canDeepSearch: false,
  };
}

function summarizeText(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= 240) return normalized;
  return `${normalized.slice(0, 237).trim()}...`;
}

function responseMetadata(rawText?: string | null) {
  if (typeof rawText !== "string") {
    return { responseLength: null, responseHash: null };
  }
  return {
    responseLength: rawText.length,
    responseHash: stableHash(rawText),
  };
}

function normalizePlannerErrorCode(value: unknown, fallback: string) {
  const normalized = String(value ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9_.:-]/g, "_")
    .slice(0, 96);
  return normalized || fallback;
}

function createPlannerAttemptBudget(text: string): PlannerAttemptBudget {
  return {
    maxAttempts: isCreateFastIntakeText(text) ? 1 : 2,
    attempts: [],
  };
}

function reservePlannerAttempt(
  budget: PlannerAttemptBudget,
  provider: CreatePlannerValidatedProviderSource,
  model: string,
): number | null {
  if (budget.attempts.length >= budget.maxAttempts) return null;
  const attempt = budget.attempts.length + 1;
  budget.attempts.push({
    attempt,
    provider,
    model,
    status: "failed",
    resultCode: "attempt_in_progress",
    responseLength: null,
    responseHash: null,
  });
  return attempt;
}

function finishPlannerAttempt(
  budget: PlannerAttemptBudget,
  attempt: number,
  input: {
    status: CreatePlannerProviderAttemptIdentity["status"];
    resultCode: string;
    rawText?: string | null;
    model?: string;
  },
) {
  const current = budget.attempts[attempt - 1];
  if (!current || current.attempt !== attempt) {
    throw new Error("create_planner_attempt_budget_corrupt");
  }
  budget.attempts[attempt - 1] = {
    ...current,
    model: input.model?.trim() || current.model,
    status: input.status,
    resultCode: normalizePlannerErrorCode(
      input.resultCode,
      input.status === "succeeded" ? "succeeded" : "provider_error",
    ),
    ...responseMetadata(input.rawText),
  };
}

function applyPlannerAttemptBudget(
  result: CreatePlannerResult,
  budget: PlannerAttemptBudget,
): CreatePlannerResult {
  const attempts = budget.attempts.map((attempt) => ({ ...attempt }));
  const finalAttempt = attempts[attempts.length - 1] ?? null;
  return {
    ...result,
    providerCallAttempted: attempts.length > 0,
    providerAttemptCount: attempts.length,
    providerAttempts: attempts,
    plannerDebug: {
      ...result.plannerDebug,
      attemptedProvider:
        finalAttempt?.provider ?? result.plannerDebug.attemptedProvider ?? null,
      attemptedModel:
        finalAttempt?.model ?? result.plannerDebug.attemptedModel ?? null,
      attemptNumber: finalAttempt?.attempt ?? null,
      responseLength:
        finalAttempt?.responseLength ?? result.plannerDebug.responseLength ?? null,
      responseHash:
        finalAttempt?.responseHash ?? result.plannerDebug.responseHash ?? null,
    },
  };
}

function attachPlannerAttemptNumber(
  attempt: PlannerAttempt,
  attemptNumber: number,
): PlannerAttempt {
  if (attempt.ok) {
    const plannerDebug = {
      ...attempt.result.plannerDebug,
      attemptNumber,
    };
    return {
      ...attempt,
      result: {
        ...attempt.result,
        plannerDebug,
      },
      debug: plannerDebug,
    };
  }
  return {
    ...attempt,
    debug: {
      ...attempt.debug,
      attemptNumber,
    },
  };
}

function dedupeModelCandidates(candidates: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const resolved: string[] = [];
  for (const candidate of candidates) {
    const normalized = String(candidate ?? "").trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    resolved.push(normalized);
  }
  return resolved;
}

export function resolveCreatePlannerModelCandidates(): string[] {
  return dedupeModelCandidates(getAiRuntimePolicy().openai.plannerModelCandidates);
}

function isModelNotFoundError(error: unknown): boolean {
  const errorObject = error as {
    status?: number;
    message?: string;
    meta?: { code?: string; status?: number };
  } | null;
  const message = error instanceof Error ? error.message : String(errorObject?.message ?? "");
  return (
    errorObject?.status === 404 ||
    errorObject?.meta?.status === 404 ||
    errorObject?.meta?.code === "MODEL_NOT_FOUND" ||
    (/model/i.test(message) && /404|not found/i.test(message))
  );
}

function isPlannerTimeoutError(error: unknown): boolean {
  const errorObject = error as {
    name?: string;
    message?: string;
    code?: string;
    cause?: { code?: string; name?: string; message?: string } | null;
    meta?: { code?: string; status?: number; messageShort?: string } | null;
  } | null;
  const message = error instanceof Error ? error.message : String(errorObject?.message ?? "");
  const causeMessage =
    typeof errorObject?.cause?.message === "string" ? errorObject.cause.message : "";
  const combined = `${message} ${causeMessage}`.toLowerCase();
  return (
    errorObject?.name === "AbortError" ||
    errorObject?.code === "TIMEOUT" ||
    errorObject?.cause?.code === "TIMEOUT" ||
    errorObject?.meta?.code === "TIMEOUT" ||
    errorObject?.cause?.name === "AbortError" ||
    /abort|aborted|timeout/.test(combined)
  );
}

function estimateTopicSignalCount(text: string): number {
  const civic = detectComplexCivicClusters(text).length;
  const communal = detectBroadCommunalTopicFields(text).length;
  const officeholder = isExplicitOfficeholderText(text) ? 1 : 0;
  const animalWelfare = isAnimalWelfareText(text) ? 1 : 0;
  return Math.max(civic, communal, officeholder + animalWelfare);
}

function createPlannerDebug(overrides: Partial<CreatePlannerDebug>): CreatePlannerDebug {
  const rawPayloadValid = overrides.rawPayloadValid ?? overrides.rawTextValid ?? false;
  const rawTextValid = overrides.rawTextValid ?? rawPayloadValid;
  return {
    attemptedProvider: overrides.attemptedProvider ?? null,
    usedProvider: overrides.usedProvider ?? "none",
    attemptedModel: overrides.attemptedModel ?? null,
    usedModel: overrides.usedModel ?? null,
    attemptNumber: overrides.attemptNumber ?? null,
    providerAvailable: overrides.providerAvailable ?? false,
    providerErrorCode: overrides.providerErrorCode ?? null,
    rawPayloadValid,
    rawTextValid,
    normalizedPayloadValid: overrides.normalizedPayloadValid ?? false,
    qualityGatePassed: overrides.qualityGatePassed ?? false,
    responseLength: overrides.responseLength ?? null,
    responseHash: overrides.responseHash ?? null,
  };
}

function hasForeignFallbackDomains(text: string, terms: string[]): string[] {
  const combined = terms.join(" ");
  const issues: string[] = [];
  if (
    /\bamtsträger\b|\bamtstraeger\b|\bminister\b|\bpolitiker\b|\bmandatsträger\b|\bmandatstraeger\b|\bqualifikation\b|\bsanktionen\b/i.test(
      combined,
    ) &&
    !isExplicitOfficeholderText(text)
  ) {
    issues.push("foreign_officeholder_domain");
  }
  if (/\bwohnen\b/i.test(combined) && !/wohnraum|wohnen|miete|mieten|wohnungsbau/i.test(text)) issues.push("foreign_housing_domain");
  if (/\bverkehr\b/i.test(combined) && !/verkehr|bus|bahn|radweg|mobilität|mobilitaet|auto/i.test(text)) {
    issues.push("foreign_traffic_domain");
  }
  if (/\bklima\b/i.test(combined) && !/klima|co2|emission/i.test(text)) issues.push("foreign_climate_domain");
  return issues;
}

export function validateCreatePlannerQuality(
  planner: Pick<
    CreatePlannerResult,
    | "plannerCore"
    | "plannerTopic"
    | "plannerClusters"
    | "graphSearchTerms"
    | "topicCandidates"
    | "clusterCandidates"
    | "plannerScope"
    | "scopeCandidates"
  >,
  sourceText: string,
): { qualityStatus: CreatePlannerQualityStatus; qualityIssues: string[] } {
  const qualityIssues: string[] = [];
  const denseSource = normalizeDenseText(sourceText);
  const sentenceCount = sourceText
    .split(/[.!?]+/)
    .map((part) => part.trim())
    .filter(Boolean).length;
  const complexText = sourceText.trim().length > 160 && sentenceCount >= 3;
  const topicSignals = estimateTopicSignalCount(sourceText);

  if (GENERIC_CORE_PATTERNS.some((pattern) => pattern.test(planner.plannerCore.trim()))) qualityIssues.push("core_generic");
  if (GENERIC_TOPIC_PATTERNS.some((pattern) => pattern.test(planner.plannerTopic.trim()))) qualityIssues.push("topic_generic");
  if (planner.graphSearchTerms.length === 0) qualityIssues.push("graph_terms_missing");
  if (
    planner.graphSearchTerms.length > 0 &&
    planner.graphSearchTerms.every((term) => GENERIC_GRAPH_TERM_PATTERNS.some((pattern) => pattern.test(term.trim())))
  ) {
    qualityIssues.push("graph_terms_generic");
  }
  if ((complexText || topicSignals >= 3) && planner.plannerClusters.length < 3) {
    qualityIssues.push("clusters_too_few_for_complex_input");
  }
  if (
    (/\beu\b|europa|bund|bundes|grundgesetz|land|region|kommune|kommunal|stadt|gemeinde|bezirk|lokal|international|weltweit/i.test(
      sourceText,
    ) &&
      dedupeStrings([...(planner.plannerScope ?? []), ...(planner.scopeCandidates ?? [])]).every((scope) => scope === "unclear"))
  ) {
    qualityIssues.push("scope_too_unclear_for_explicit_jurisdiction");
  }
  if (
    planner.topicCandidates.length > 0 &&
    planner.topicCandidates.every((candidate) => GENERIC_TOPIC_PATTERNS.some((pattern) => pattern.test(candidate.trim())))
  ) {
    qualityIssues.push("topic_candidates_generic");
  }

  const plannerTerms = dedupeStrings([
    planner.plannerTopic,
    planner.plannerCore,
    ...planner.plannerClusters,
    ...planner.topicCandidates,
    ...planner.clusterCandidates,
    ...planner.graphSearchTerms,
  ]);
  qualityIssues.push(...hasForeignFallbackDomains(sourceText, plannerTerms));

  if (denseSource.length > 0 && planner.graphSearchTerms.some((term) => !normalizeDenseText(term))) {
    qualityIssues.push("graph_terms_empty");
  }

  if (qualityIssues.length === 0) {
    return { qualityStatus: "specific", qualityIssues: [] };
  }
  if (qualityIssues.includes("core_generic") || qualityIssues.includes("topic_generic")) {
    return {
      qualityStatus: complexText || topicSignals >= 3 ? "needs_confirmation" : "generic",
      qualityIssues,
    };
  }
  if (qualityIssues.includes("clusters_too_few_for_complex_input")) {
    return { qualityStatus: "needs_confirmation", qualityIssues };
  }
  return { qualityStatus: "generic", qualityIssues };
}

function finalizePlannerResult(params: {
  text: string;
  draft: CreatePlannerDraft;
  source: CreatePlannerSource;
  plannerProvider: CreatePlannerProviderName;
  plannerDegraded: boolean;
  degradedReason: CreatePlannerDegradedReason | null;
  providerCallAttempted: boolean;
  providerCallSucceeded: boolean;
  plannerDebug: CreatePlannerDebug;
  qualityOverride?: {
    status: CreatePlannerQualityStatus;
    issues: string[];
  };
}): CreatePlannerResult {
  const draft = params.draft;
  const structuredTopicLabels = extractCreateStructuredTopicLabels(params.text);
  const canonicalTopicCandidates = structuredTopicLabels.length >= 3
    ? structuredTopicLabels
    : dedupeStrings(draft.topicCandidates);
  const evidenceBackedScopes = inferScopesFromText(params.text);
  const canonicalTopicCount = canonicalTopicCandidates.length;
  const issueMode = resolveCreateIntakeIssueMode({
    text: params.text,
    canonicalTopicCount,
  });
  const timing = resolveCreateIntakeTiming(params.text);
  const recommendedLane = timing.lane === "standard" ? "standard" : draft.recommendedLane;
  const validatedQuality = validateCreatePlannerQuality(
    {
      plannerCore: draft.plannerCore,
      plannerTopic: draft.plannerTopic,
      plannerScope: evidenceBackedScopes,
      plannerClusters: dedupeStrings(draft.plannerClusters),
      graphSearchTerms: dedupeStrings(draft.graphSearchTerms),
      topicCandidates: canonicalTopicCandidates,
      clusterCandidates: dedupeStrings(draft.clusterCandidates),
      scopeCandidates: evidenceBackedScopes,
    },
    params.text,
  );
  const quality = params.qualityOverride
    ? {
        qualityStatus: params.qualityOverride.status,
        qualityIssues: dedupeStrings([...validatedQuality.qualityIssues, ...params.qualityOverride.issues]),
      }
    : validatedQuality;

  return {
    source: params.source,
    plannerSource: params.source,
    plannerProvider: params.plannerProvider,
    plannerRole: "planner_only",
    plannerTopic: draft.plannerTopic,
    plannerCore: draft.plannerCore,
    plannerScope: evidenceBackedScopes,
    plannerStance: draft.plannerStance,
    plannerClusters: dedupeStrings(draft.plannerClusters),
    plannerOpenQuestions: dedupeStrings(draft.plannerOpenQuestions),
    shortSummary: draft.shortSummary.trim(),
    topicCandidates: canonicalTopicCandidates,
    clusterCandidates: dedupeStrings(draft.clusterCandidates),
    scopeCandidates: evidenceBackedScopes,
    stance: draft.stance,
    openQuestions: dedupeStrings(draft.openQuestions),
    graphSearchTerms: dedupeStrings(draft.graphSearchTerms),
    materialSignals: dedupeStrings(draft.materialSignals),
    recommendedLane,
    issueMode,
    timingLane: timing.lane,
    inputLength: params.text.trim().length,
    providerPlan: baseProviderPlan(params.plannerProvider, recommendedLane),
    permissions: basePermissions(),
    plannerDegraded: params.plannerDegraded || quality.qualityStatus !== "specific",
    degradedReason:
      quality.qualityStatus === "specific" ? params.degradedReason : params.degradedReason ?? "quality_gate_failed",
    plannerDegradedReason:
      quality.qualityStatus === "specific" ? params.degradedReason : params.degradedReason ?? "quality_gate_failed",
    qualityStatus: quality.qualityStatus,
    qualityIssues: quality.qualityIssues,
    providerCallAttempted: params.providerCallAttempted,
    providerCallSucceeded: params.providerCallSucceeded,
    providerAttemptCount: params.providerCallAttempted ? 1 : 0,
    providerAttempts: [],
    plannerDebug: params.plannerDebug,
  };
}

function buildAnimalWelfarePlanner(params: {
  text: string;
  source: CreatePlannerSource;
  plannerProvider: CreatePlannerProviderName;
  plannerDegraded: boolean;
  degradedReason: CreatePlannerDegradedReason | null;
  providerCallAttempted: boolean;
  providerCallSucceeded: boolean;
  plannerDebug: CreatePlannerDebug;
}): CreatePlannerResult {
  const scopes = inferScopesFromText(params.text);
  const openQuestions = [
    "Welche Produkte, Länder, Standards und Kontrollmechanismen sind gemeint?",
    "Sollten importierte und exportierte Tierprodukte nur zugelassen werden, wenn vergleichbare Tierwohlstandards eingehalten werden?",
    "Welche Zuständigkeit liegt bei EU, Bund oder internationalen Handelsregeln?",
  ];
  const clusters = [
    "Tierwohl und Haltungsstandards",
    "Import- und Exportregeln",
    "EU-/internationale Mindeststandards",
    "Verbraucherinformation / Kennzeichnung / Bio-Label / Haltungsstufen",
    "ethische Bewertung von Tierhaltung",
  ];
  const topic = "Tierschutz, Tierhaltung und Agrarstandards";
  const core = "Forderung nach besseren Tierschutz- und Tierhaltungsstandards";

  return finalizePlannerResult({
    text: params.text,
    source: params.source,
    plannerProvider: params.plannerProvider,
    plannerDegraded: params.plannerDegraded,
    degradedReason: params.degradedReason,
    providerCallAttempted: params.providerCallAttempted,
    providerCallSucceeded: params.providerCallSucceeded,
    plannerDebug: params.plannerDebug,
    draft: {
      plannerTopic: topic,
      plannerCore: core,
      plannerScope: scopes.includes("federal") ? scopes : dedupeStrings([...scopes, "federal"]).filter(isPlannerScope),
      plannerStance: "pro",
      plannerClusters: clusters,
      plannerOpenQuestions: openQuestions,
      shortSummary:
        "Der Beitrag fordert strengere Tierwohl- und Tierhaltungsstandards für Fleisch, Geflügel und Fisch, auch entlang von Import-, Export- und EU-Regeln.",
      topicCandidates: [topic, "Tierwohl", "Import und Export", "Kennzeichnung", "Bio-Label", "Haltungsstufen", "Agrarstandards"],
      clusterCandidates: clusters,
      scopeCandidates: scopes.includes("federal") ? scopes : dedupeStrings([...scopes, "federal"]).filter(isPlannerScope),
      stance: "pro",
      openQuestions,
      graphSearchTerms: [
        "Tierwohl",
        "Tierhaltung",
        "Agrarstandards",
        "Import Export Tierprodukte",
        "EU Mindeststandards",
        "Bio-Label Haltungsstufen",
      ],
      materialSignals: [],
      recommendedLane: "create_fast_followup",
    },
  });
}

function buildOfficeholderPlanner(params: {
  text: string;
  source: CreatePlannerSource;
  plannerProvider: CreatePlannerProviderName;
  plannerDegraded: boolean;
  degradedReason: CreatePlannerDegradedReason | null;
  providerCallAttempted: boolean;
  providerCallSucceeded: boolean;
  plannerDebug: CreatePlannerDebug;
}): CreatePlannerResult {
  const scopes = inferScopesFromText(params.text);
  const topic = "Politische Ämter, Qualifikation und Verantwortung";
  const core = "Forderung nach klaren Qualifikations- und Verantwortungsregeln für politische Ämter";
  const openQuestions = [
    "Für welche Ämter sollen diese Regeln gelten?",
    "Welche Qualifikation, Kontrolle oder Sanktionen sind konkret gemeint?",
  ];
  const clusters = [
    "Qualifikation für politische Ämter",
    "Verantwortung und Transparenz",
    "Sanktionen bei Pflichtverletzungen",
  ];
  const stance = /dagegen|ablehnen|nicht/i.test(params.text) ? "contra" : "pro";

  return finalizePlannerResult({
    text: params.text,
    source: params.source,
    plannerProvider: params.plannerProvider,
    plannerDegraded: params.plannerDegraded,
    degradedReason: params.degradedReason,
    providerCallAttempted: params.providerCallAttempted,
    providerCallSucceeded: params.providerCallSucceeded,
    plannerDebug: params.plannerDebug,
    draft: {
      plannerTopic: topic,
      plannerCore: core,
      plannerScope: scopes,
      plannerStance: stance,
      plannerClusters: clusters,
      plannerOpenQuestions: openQuestions,
      shortSummary: "Der Beitrag zielt auf politische Ämter, Qualifikation und Konsequenzen bei Pflichtverletzungen.",
      topicCandidates: [topic, "Amtsträger", "Qualifikation", "Sanktionen"],
      clusterCandidates: clusters,
      scopeCandidates: scopes,
      stance,
      openQuestions,
      graphSearchTerms: ["Amtsträger", "politische Ämter", "Qualifikation", "Sanktionen"],
      materialSignals: [],
      recommendedLane: "create_fast_followup",
    },
  });
}

function buildBroadCommunalPlanner(params: {
  text: string;
  source: CreatePlannerSource;
  plannerProvider: CreatePlannerProviderName;
  plannerDegraded: boolean;
  degradedReason: CreatePlannerDegradedReason | null;
  providerCallAttempted: boolean;
  providerCallSucceeded: boolean;
  plannerDebug: CreatePlannerDebug;
}): CreatePlannerResult {
  const fields = detectBroadCommunalTopicFields(params.text);
  const topic = "Mehrere kommunale Themen";
  const core = "Mehrere kommunale Themen gemeinsam strukturieren";
  const openQuestions = ["Welche Bereiche sollen zuerst bearbeitet werden – und wer ist zuständig?"];

  return finalizePlannerResult({
    text: params.text,
    source: params.source,
    plannerProvider: params.plannerProvider,
    plannerDegraded: params.plannerDegraded,
    degradedReason: params.degradedReason,
    providerCallAttempted: params.providerCallAttempted,
    providerCallSucceeded: params.providerCallSucceeded,
    plannerDebug: params.plannerDebug,
    draft: {
      plannerTopic: topic,
      plannerCore: core,
      plannerScope: inferScopesFromText(params.text),
      plannerStance: "open",
      plannerClusters: fields.slice(0, 6),
      plannerOpenQuestions: openQuestions,
      shortSummary: `Der Beitrag bündelt mehrere kommunale Bedarfspunkte: ${fields.slice(0, 6).join(", ")}.`,
      topicCandidates: [topic, ...fields],
      clusterCandidates: fields,
      scopeCandidates: inferScopesFromText(params.text),
      stance: "open",
      openQuestions,
      graphSearchTerms: [topic, ...fields],
      materialSignals: [],
      recommendedLane: "create_fast_followup",
    },
  });
}

function buildComplexCivicPlanner(params: {
  text: string;
  source: CreatePlannerSource;
  plannerProvider: CreatePlannerProviderName;
  plannerDegraded: boolean;
  degradedReason: CreatePlannerDegradedReason | null;
  providerCallAttempted: boolean;
  providerCallSucceeded: boolean;
  plannerDebug: CreatePlannerDebug;
}): CreatePlannerResult {
  const clusters = detectComplexCivicClusters(params.text);
  const scopes = inferScopesFromText(params.text);
  const mergedScopes = dedupeStrings([
    ...scopes,
    "federal",
    /\beu\b|europa/i.test(params.text) ? "eu" : null,
    /region/i.test(params.text) ? "local" : null,
  ]).filter(isPlannerScope);
  const openQuestion =
    "Welcher Teil soll zuerst bearbeitet werden: Grundrechte, Migration, Energiepolitik, regionale Abstimmung oder Budgetverteilung?";

  return finalizePlannerResult({
    text: params.text,
    source: params.source,
    plannerProvider: params.plannerProvider,
    plannerDegraded: params.plannerDegraded,
    degradedReason: params.degradedReason,
    providerCallAttempted: params.providerCallAttempted,
    providerCallSucceeded: params.providerCallSucceeded,
    plannerDebug: params.plannerDebug,
    draft: {
      plannerTopic: "Grundrechte, gesellschaftliche Pflichten und demokratische Priorisierung",
      plannerCore:
        "Zielkonflikt zwischen Menschenwürde, Grundrechten, gesellschaftlicher Verantwortung, Migration, europäischer Politik, regionaler Beteiligung und Budgetprioritäten.",
      plannerScope: mergedScopes,
      plannerStance: "reform_oriented",
      plannerClusters: clusters,
      plannerOpenQuestions: [openQuestion],
      shortSummary:
        "Der Beitrag verbindet Grundrechte, offene Grenzen, europäische Politik, regionale Beteiligung und Budgetfragen zu einem reformorientierten Mehrthemenkonflikt.",
      topicCandidates: [
        "Grundrechte, gesellschaftliche Pflichten und demokratische Priorisierung",
        "Menschenwürde",
        "Grundrechte",
        "Migration",
        "offene Grenzen",
        "Energiepolitik Europa",
        "Industriepolitik Europa",
        "regionale Abstimmungen",
        "Budgetpriorisierung",
      ],
      clusterCandidates: clusters,
      scopeCandidates: mergedScopes,
      stance: "reform_oriented",
      openQuestions: [openQuestion],
      graphSearchTerms: [
        "Menschenwürde",
        "Grundrechte",
        "gesellschaftliche Pflichten",
        "offene Grenzen",
        "Migration",
        "EU Energiepolitik",
        "Industriepolitik Europa",
        "regionale Abstimmungen",
        "Bürgerbeteiligung",
        "Budgetpriorisierung",
      ],
      materialSignals: [],
      recommendedLane: "create_fast_followup",
    },
  });
}

// technical fallback only, not canonical domain mapping
function buildQuotaEqualityPlanner(params: {
  text: string;
  source: CreatePlannerSource;
  plannerProvider: CreatePlannerProviderName;
  plannerDegraded: boolean;
  degradedReason: CreatePlannerDegradedReason | null;
  providerCallAttempted: boolean;
  providerCallSucceeded: boolean;
  plannerDebug: CreatePlannerDebug;
}): CreatePlannerResult {
  const detectedClusters = detectQuotaEqualityClusters(params.text);
  const clusters = dedupeStrings([
    "Gleichberechtigung",
    "Frauenquote",
    "Minderheitenförderung",
    "wirtschaftliche Auswirkungen für Unternehmen",
    ...detectedClusters,
  ]).slice(0, 5);
  const scopes = dedupeStrings(["federal", ...inferScopesFromText(params.text)]).filter(isPlannerScope);
  const supportsEquality = /gleichberechtigung|gleichstellung|chancengleichheit/i.test(params.text);
  const rejectsQuota =
    /(gegen|kritik|nicht richtig|nicht sinnvoll|ungerecht|ablehn)/i.test(params.text) &&
    /\bquote\b|\bquoten\b|\bfrauenquote\b/i.test(params.text);
  const stance: CreatePlannerStance = supportsEquality && rejectsQuota ? "mixed" : rejectsQuota ? "contra" : "open";
  const openQuestions = [
    "Geht es um gesetzliche Quoten, Unternehmensquoten oder Förderprogramme?",
    "Welche Minderheiten oder Gruppen sollen verglichen werden?",
    "Soll daraus ein Claim, eine Frage oder ein Dossier entstehen?",
  ];

  return finalizePlannerResult({
    text: params.text,
    source: params.source,
    plannerProvider: params.plannerProvider,
    plannerDegraded: params.plannerDegraded,
    degradedReason: params.degradedReason,
    providerCallAttempted: params.providerCallAttempted,
    providerCallSucceeded: params.providerCallSucceeded,
    plannerDebug: params.plannerDebug,
    qualityOverride: {
      status: "needs_confirmation",
      issues: ["technical_fallback_only"],
    },
    draft: {
      plannerTopic: "Gleichberechtigung, Antidiskriminierung und Quotenregelungen",
      plannerCore: "Kritik an verbindlichen Quotenregelungen bei gleichzeitigem Wunsch nach Gleichberechtigung",
      plannerScope: scopes,
      plannerStance: stance,
      plannerClusters: clusters,
      plannerOpenQuestions: openQuestions,
      shortSummary:
        "Der Beitrag kritisiert verbindliche Quotenregelungen, befürwortet aber Gleichberechtigung und will Fairness, Vergleichbarkeit mit anderen Minderheiten und wirtschaftliche Folgen für Unternehmen prüfen.",
      topicCandidates: [
        "Gleichberechtigung, Antidiskriminierung und Quotenregelungen",
        "Gleichberechtigung",
        "Frauenquote",
        "Minderheitenförderung",
        "wirtschaftliche Auswirkungen für Unternehmen",
      ],
      clusterCandidates: clusters,
      scopeCandidates: scopes,
      stance,
      openQuestions,
      graphSearchTerms: [
        "Gleichberechtigung",
        "Frauenquote",
        "Minderheitenförderung",
        "Quotenregelungen Unternehmen",
        "Fairness Quotenregelungen",
      ],
      materialSignals: [],
      recommendedLane: "create_fast_followup",
    },
  });
}

function buildNeutralPlanner(params: {
  text: string;
  source: CreatePlannerSource;
  plannerProvider: CreatePlannerProviderName;
  plannerDegraded: boolean;
  degradedReason: CreatePlannerDegradedReason | null;
  providerCallAttempted: boolean;
  providerCallSucceeded: boolean;
  plannerDebug: CreatePlannerDebug;
}): CreatePlannerResult {
  const normalized = params.text.replace(/\s+/g, " ").trim();
  const scopes = inferScopesFromText(params.text);
  const summary = normalized.length > 220 ? `${normalized.slice(0, 217).trim()}...` : normalized;
  const openQuestions = ["Was genau soll geklärt, verändert oder vorbereitet werden?"];
  const stance =
    /dagegen|ablehnen|nicht sinnvoll/i.test(params.text)
      ? "contra"
      : /soll|muss|fordern|fordere|verlangen/i.test(params.text)
        ? "pro"
        : "open";

  return finalizePlannerResult({
    text: params.text,
    source: params.source,
    plannerProvider: params.plannerProvider,
    plannerDegraded: params.plannerDegraded,
    degradedReason: params.degradedReason,
    providerCallAttempted: params.providerCallAttempted,
    providerCallSucceeded: params.providerCallSucceeded,
    plannerDebug: params.plannerDebug,
    draft: {
      plannerTopic: "Öffentliches Anliegen mit Klärungsbedarf",
      plannerCore: "Neues öffentliches Thema strukturieren",
      plannerScope: scopes,
      plannerStance: stance,
      plannerClusters: [],
      plannerOpenQuestions: openQuestions,
      shortSummary: summary || "Ein neues öffentliches Anliegen soll eingeordnet werden.",
      topicCandidates: ["Öffentliches Anliegen mit Klärungsbedarf"],
      clusterCandidates: [],
      scopeCandidates: scopes,
      stance,
      openQuestions,
      graphSearchTerms: [],
      materialSignals: [],
      recommendedLane: "standard",
    },
  });
}

function buildHeuristicPlanner(params: {
  text: string;
  plannerProvider: CreatePlannerProviderName;
  plannerDegraded: boolean;
  degradedReason: CreatePlannerDegradedReason | null;
  providerCallAttempted: boolean;
  providerCallSucceeded: boolean;
  plannerDebug: CreatePlannerDebug;
}): CreatePlannerResult {
  return finalizePlannerResult({
    text: params.text,
    source: "technical_fallback",
    plannerProvider: params.plannerProvider,
    plannerDegraded: true,
    degradedReason: params.degradedReason,
    providerCallAttempted: params.providerCallAttempted,
    providerCallSucceeded: params.providerCallSucceeded,
    plannerDebug: params.plannerDebug,
    qualityOverride: {
      status: "failed",
      issues: ["technical_fallback_only"],
    },
    draft: {
      plannerTopic: "Analyse noch nicht validiert",
      plannerCore: "Es liegt noch kein validierter KI-Run vor.",
      plannerScope: ["unclear"],
      plannerStance: "unclear",
      plannerClusters: [],
      plannerOpenQuestions: [],
      shortSummary: "Es liegt noch kein validierter KI-Run vor.",
      topicCandidates: [],
      clusterCandidates: [],
      scopeCandidates: ["unclear"],
      stance: "unclear",
      openQuestions: [],
      graphSearchTerms: [],
      materialSignals: [],
      recommendedLane: "standard",
    },
  });
}

function normalizeProviderPlannerPayload(
  rawPayload: unknown,
  text: string,
  model: string,
  locale: string,
  provider: Extract<CreatePlannerProviderName, "openai" | "anthropic" | "mistral">,
  rawText?: string,
): PlannerAttempt {
  const metadata = responseMetadata(rawText);
  const payloadResult = CreatePlannerProviderPayloadSchema.safeParse(rawPayload);
  if (!payloadResult.success) {
    const firstIssue = payloadResult.error.issues[0];
    const issuePath = firstIssue?.path.join("_") || "root";
    return {
      ok: false,
      reason: "invalid_provider_payload",
      debug: createPlannerDebug({
        attemptedProvider: provider,
        usedProvider: "local_fallback",
        attemptedModel: model,
        providerAvailable: true,
        providerErrorCode: normalizePlannerErrorCode(
          `contract_violation_${issuePath}`,
          "invalid_provider_payload",
        ),
        rawPayloadValid: true,
        rawTextValid: true,
        normalizedPayloadValid: false,
        qualityGatePassed: false,
        ...metadata,
      }),
    };
  }
  const payload = payloadResult.data;
  const citizenFirstSharedCore = resolveCitizenFirstSharedCore(text);
  const structuredTopicLabels = extractCreateStructuredTopicLabels(text);
  const hasStructuredTopicPackage = structuredTopicLabels.length >= 3;
  const plannerTopic = citizenFirstSharedCore?.topic ?? (
    hasStructuredTopicPackage
      ? `Vorschlagspaket mit ${structuredTopicLabels.length} Themenbereichen`
      : payload.plannerTopic
  );
  const plannerCore = payload.plannerCore;

  // Jurisdiction is input evidence, not a provider inference. Reliable bound
  // context can be added at the caller later; without it, text is the authority.
  const resolvedPlannerScope = inferScopesFromText(text);
  const plannerStanceRaw = payload.plannerStance;
  const explicitProStance = /\bich\s+bin\s+f(?:ü|ue)r\b|\bich\s+unterst(?:ü|ue)tze\b/i.test(text);
  const explicitContraStance = /\bich\s+bin\s+(?:dagegen|gegen)\b|\bich\s+lehne\b/i.test(text);
  const plannerStance =
    (plannerStanceRaw === "open" || plannerStanceRaw === "unclear") && explicitProStance && !explicitContraStance
      ? "pro"
      : plannerStanceRaw;
  const recommendedLaneRaw = payload.recommendedLane;
  const recommendedLane = isRecommendedLane(recommendedLaneRaw) ? recommendedLaneRaw : "create_fast_followup";
  const plannerClusters = citizenFirstSharedCore?.aspects ?? asStringArray(payload.plannerClusters);
  const providerTopicCandidates = dedupeStrings(asStringArray(payload.topicCandidates));
  const topicCandidates = hasStructuredTopicPackage
    ? structuredTopicLabels
    : citizenFirstSharedCore
      ? [citizenFirstSharedCore.topic]
      : providerTopicCandidates.length > 0
        ? providerTopicCandidates
        : [plannerTopic];
  const clusterCandidates = dedupeStrings([...plannerClusters, ...asStringArray(payload.clusterCandidates)]);
  const scopeCandidates = resolvedPlannerScope;
  const locationQuestion = needsMunicipalLocationQuestion(text, scopeCandidates)
    ? municipalLocationQuestion(locale)
    : null;
  const plannerOpenQuestions = dedupeStrings([
    ...asStringArray(payload.plannerOpenQuestions),
    ...asStringArray(payload.openQuestions),
    locationQuestion,
  ]);
  const graphSearchTerms = dedupeStrings([
    ...asStringArray(payload.graphSearchTerms),
    ...plannerClusters,
    plannerTopic,
  ]);
  const materialSignals = asStringArray(payload.materialSignals);
  const shortSummary = payload.shortSummary || plannerCore || summarizeText(text);

  const result = finalizePlannerResult({
    text,
    source: provider,
    plannerProvider: provider,
    plannerDegraded: false,
    degradedReason: null,
    providerCallAttempted: true,
    providerCallSucceeded: true,
    plannerDebug: {
      ...createPlannerDebug({
        attemptedProvider: provider,
        usedProvider: provider,
        attemptedModel: model,
        usedModel: model,
        providerAvailable: true,
        rawPayloadValid: true,
        rawTextValid: true,
        normalizedPayloadValid: true,
        qualityGatePassed: true,
        ...metadata,
      }),
    },
    draft: {
      plannerTopic,
      plannerCore,
      plannerScope: resolvedPlannerScope,
      plannerStance,
      plannerClusters,
      plannerOpenQuestions,
      shortSummary,
      topicCandidates,
      clusterCandidates,
      scopeCandidates,
      stance: plannerStance,
      openQuestions: plannerOpenQuestions,
      graphSearchTerms,
      materialSignals,
      recommendedLane,
    },
  });
  if (result.qualityStatus !== "specific") {
    return {
      ok: false,
      reason: "quality_gate_failed",
      debug: createPlannerDebug({
        attemptedProvider: provider,
        usedProvider: "local_fallback",
        attemptedModel: model,
        providerAvailable: true,
        providerErrorCode: "quality_gate_failed",
        rawPayloadValid: true,
        rawTextValid: true,
        normalizedPayloadValid: true,
        qualityGatePassed: false,
        ...metadata,
      }),
    };
  }
  return {
    ok: true,
    result,
    debug: result.plannerDebug,
  };
}

async function tryOpenAiPlannerWithModel(
  input: BuildCreatePlannerInput,
  model: string,
  budget: PlannerAttemptBudget,
): Promise<PlannerAttempt> {
  const policy = getAiRuntimePolicy();
  if (!policy.openai.apiKeyPresent) {
    return {
      ok: false,
      reason: "missing_provider_key",
      debug: createPlannerDebug({
        attemptedProvider: "openai",
        usedProvider: "local_fallback",
        attemptedModel: model,
        providerAvailable: false,
        providerErrorCode: "missing_provider_key",
        rawPayloadValid: false,
        rawTextValid: false,
        normalizedPayloadValid: false,
        qualityGatePassed: false,
      }),
    };
  }
  const attemptNumber = reservePlannerAttempt(budget, "openai", model);
  if (!attemptNumber) {
    return {
      ok: false,
      reason: "provider_error",
      debug: createPlannerDebug({
        attemptedProvider: "openai",
        usedProvider: "local_fallback",
        attemptedModel: model,
        providerAvailable: true,
        providerErrorCode: "attempt_budget_exhausted",
        rawPayloadValid: false,
        rawTextValid: false,
        normalizedPayloadValid: false,
        qualityGatePassed: false,
      }),
    };
  }

  const system = [
    "Du bist planner_only für den ersten nicht-mutativen /create-Follow-up-Schritt in E150.",
    "Strukturiere den Beitrag fachlich, ohne Fakten zu erfinden und ohne mutative Aktionen.",
    "Unterscheide eigenständige Hauptthemen von Aspekten, Maßnahmen oder Unterpunkten eines gemeinsamen Anliegens.",
    "Nutze keine generischen Platzhalter wie 'Aussage' oder 'Öffentliches Anliegen', wenn ein konkretes Thema erkennbar ist.",
    "Amtsträger, Qualifikation oder Sanktionen nur bei expliziten Hinweisen auf Amtsträger, Politiker, Mandatsträger, Minister, Abgeordnete oder politische Ämter.",
    "Gib strikt JSON zurück.",
  ].join("\n");

  const user = [
    "Analysiere den folgenden Beitrag als planner_only.",
    "Liefere genau die vom JSON-Schema verlangten Felder.",
    "Regeln:",
    "- Keine Veröffentlichung, kein Speichern, kein Mergen, kein DeepSearch, kein Faktencheck, keine Quellenbehauptungen.",
    "- 'Öffentliches Anliegen' ist nur erlaubt, wenn absolut kein Thema erkennbar ist.",
    "- 'Aussage' ist nie ausreichend als plannerCore bei längeren politischen Texten.",
    "- Bei mehreren Politikfeldern müssen mindestens 3 Cluster entstehen.",
    "- topicCandidates enthält ausschließlich fachlich eigenständige Hauptthemen; niemals Aspekte oder Maßnahmen als zusätzliche Themen zählen.",
    "- Wenn ein gemeinsamer Kern mehrere Aspekte verbindet, liefere genau einen topicCandidate gleich plannerTopic und führe die Aspekte in plannerClusters.",
    "- plannerClusters enthält wenige verständliche Aspekte oder Unterpunkte des Hauptanliegens und erhöht niemals die Themenzahl.",
    "- Nur wenn der Text tatsächlich mehrere voneinander unabhängige Anliegen enthält, darf topicCandidates mehrere Einträge enthalten; niemals auf drei Themen begrenzen.",
    "- Nummerierte Themenblöcke, Abschnittsüberschriften und wiederholte 'Unterthemen:' sind starke Signale für mehrere eigenständige Hauptthemen.",
    "- Bei einem strukturierten Vorschlagspaket bleibt jeder ausdrücklich benannte Themenblock ein eigener topicCandidate.",
    "- Ein nur von dir gebildeter Sammelbegriff oder ein synthetisches Oberthema darf die Zahl der topicCandidates nicht erhöhen.",
    "- Wenn plannerTopic selbst ausdrücklich als eigenständiges Thema im Text vorkommt, bleibt es dagegen als topicCandidate erhalten.",
    "- Bei kommunalem Scope ohne ausdrücklich benannte Stadt, Gemeinde oder Ortsteil muss plannerOpenQuestions eine Ortsrückfrage enthalten.",
    "- Scope/Jurisdiktion nur aus expliziten Hinweisen im Text ableiten; ohne belastbaren Hinweis ausschließlich unclear verwenden.",
    "- Formuliere die offene Rückfrage als Auswahlfrage, wenn mehrere Themen konkurrieren.",
    "",
    `Locale: ${input.locale}`,
    "",
    "TEXT:",
    input.text,
  ].join("\n");

  try {
    const timeoutMs = resolveCreatePlannerTimeoutMs(input.text);
    const response = await callOpenAIJson({
      system,
      user,
      model,
      temperature: 0.2,
      max_tokens: resolveCreatePlannerMaxOutputTokens(input.text),
      timeoutMs,
      allowJsonFormatFallback: false,
      response_format: {
        name: "create_planner_result",
        schema: CREATE_PLANNER_JSON_SCHEMA,
        strict: true,
      },
    });
    const { text } = response;
    const actualModel = response.model?.trim() || model;
    if (
      (response.formatUsed && response.formatUsed !== "json_schema") ||
      response.didFallback === true
    ) {
      finishPlannerAttempt(budget, attemptNumber, {
        status: "failed",
        resultCode: "invalid_provider_payload",
        rawText: text,
      });
      return attachPlannerAttemptNumber({
        ok: false,
        reason: "invalid_provider_payload",
        debug: createPlannerDebug({
          attemptedProvider: "openai",
          usedProvider: "local_fallback",
          attemptedModel: model,
          providerAvailable: true,
          providerErrorCode: "strict_schema_not_enforced",
          rawPayloadValid: false,
          rawTextValid: typeof text === "string" && text.length > 0,
          normalizedPayloadValid: false,
          qualityGatePassed: false,
          ...responseMetadata(text),
        }),
      }, attemptNumber);
    }
    let parsed: OpenAiPlannerPayload;
    try {
      parsed = JSON.parse(text) as OpenAiPlannerPayload;
    } catch {
      finishPlannerAttempt(budget, attemptNumber, {
        status: "failed",
        resultCode: "invalid_json",
        rawText: text,
      });
      return attachPlannerAttemptNumber({
        ok: false,
        reason: "invalid_json",
        debug: createPlannerDebug({
          attemptedProvider: "openai",
          usedProvider: "local_fallback",
          attemptedModel: model,
          providerAvailable: true,
          providerErrorCode: "invalid_json",
          rawPayloadValid: false,
          rawTextValid: false,
          normalizedPayloadValid: false,
          qualityGatePassed: false,
          ...responseMetadata(text),
        }),
      }, attemptNumber);
    }
    const normalized = normalizeProviderPlannerPayload(
      parsed,
      input.text,
      actualModel,
      input.locale,
      "openai",
      text,
    );
    const normalizedFailure =
      "reason" in normalized ? normalized.reason : null;
    finishPlannerAttempt(budget, attemptNumber, {
      status: normalized.ok
        ? "succeeded"
        : normalizedFailure === "quality_gate_failed"
          ? "quality_failed"
          : "failed",
      resultCode: normalized.ok
        ? "succeeded"
        : (normalizedFailure ?? "provider_error"),
      rawText: text,
      model: actualModel,
    });
    return attachPlannerAttemptNumber(normalized, attemptNumber);
  } catch (error) {
    const errorObject = error as { message?: string; meta?: { code?: string; messageShort?: string } } | null;
    const message = error instanceof Error ? error.message : "unknown_provider_error";
    if (isPlannerTimeoutError(error)) {
      finishPlannerAttempt(budget, attemptNumber, {
        status: "failed",
        resultCode: "timeout",
      });
      return attachPlannerAttemptNumber({
        ok: false,
        reason: "timeout",
        debug: createPlannerDebug({
          attemptedProvider: "openai",
          usedProvider: "local_fallback",
          attemptedModel: model,
          providerAvailable: true,
          providerErrorCode: normalizePlannerErrorCode(
            errorObject?.meta?.code,
            "TIMEOUT",
          ),
          rawPayloadValid: false,
          rawTextValid: false,
          normalizedPayloadValid: false,
          qualityGatePassed: false,
        }),
      }, attemptNumber);
    }
    if (isModelNotFoundError(error)) {
      finishPlannerAttempt(budget, attemptNumber, {
        status: "failed",
        resultCode: "model_not_found",
      });
      return attachPlannerAttemptNumber({
        ok: false,
        reason: "model_not_found",
        debug: createPlannerDebug({
          attemptedProvider: "openai",
          usedProvider: "local_fallback",
          attemptedModel: model,
          providerAvailable: true,
          providerErrorCode: "MODEL_NOT_FOUND",
          rawPayloadValid: false,
          rawTextValid: false,
          normalizedPayloadValid: false,
          qualityGatePassed: false,
        }),
      }, attemptNumber);
    }
    if (/rate.?limit|429/i.test(message)) {
      finishPlannerAttempt(budget, attemptNumber, {
        status: "failed",
        resultCode: "rate_limited",
      });
      return attachPlannerAttemptNumber({
        ok: false,
        reason: "rate_limited",
        debug: createPlannerDebug({
          attemptedProvider: "openai",
          usedProvider: "local_fallback",
          attemptedModel: model,
          providerAvailable: true,
          providerErrorCode: normalizePlannerErrorCode(
            errorObject?.meta?.code,
            "rate_limited",
          ),
          rawPayloadValid: false,
          rawTextValid: false,
          normalizedPayloadValid: false,
          qualityGatePassed: false,
        }),
      }, attemptNumber);
    }
    finishPlannerAttempt(budget, attemptNumber, {
      status: "failed",
      resultCode: "provider_error",
    });
    return attachPlannerAttemptNumber({
      ok: false,
      reason: "provider_error",
      debug: createPlannerDebug({
        attemptedProvider: "openai",
        usedProvider: "local_fallback",
        attemptedModel: model,
        providerAvailable: true,
        providerErrorCode: normalizePlannerErrorCode(
          errorObject?.meta?.code,
          "provider_error",
        ),
        rawPayloadValid: false,
        rawTextValid: false,
        normalizedPayloadValid: false,
        qualityGatePassed: false,
      }),
    }, attemptNumber);
  }
}

async function tryOpenAiPlanner(
  input: BuildCreatePlannerInput,
  budget: PlannerAttemptBudget,
): Promise<PlannerAttempt> {
  const models = resolveCreatePlannerModelCandidates();
  if (models.length === 0) {
    return {
      ok: false,
      reason: "provider_error",
      debug: createPlannerDebug({
        attemptedProvider: "openai",
        usedProvider: "local_fallback",
        providerAvailable: getAiRuntimePolicy().openai.apiKeyPresent,
        providerErrorCode: "planner_model_missing",
        rawPayloadValid: false,
        rawTextValid: false,
        normalizedPayloadValid: false,
        qualityGatePassed: false,
      }),
    };
  }

  let lastAttempt: PlannerAttempt | null = null;
  for (const [index, model] of models.entries()) {
    if (budget.attempts.length >= budget.maxAttempts) break;
    const attempt = await tryOpenAiPlannerWithModel(input, model, budget);
    if (attempt.ok) return attempt;
    const failedAttempt = attempt as Extract<PlannerAttempt, { ok: false }>;
    lastAttempt = failedAttempt;
    if (failedAttempt.reason !== "model_not_found" || index >= models.length - 1) {
      return failedAttempt;
    }
  }

  return lastAttempt ?? {
    ok: false,
    reason: "provider_error",
    debug: createPlannerDebug({
      attemptedProvider: "openai",
      usedProvider: "local_fallback",
      providerAvailable: getAiRuntimePolicy().openai.apiKeyPresent,
      providerErrorCode: "openai_model_unavailable",
      rawPayloadValid: false,
      rawTextValid: false,
      normalizedPayloadValid: false,
      qualityGatePassed: false,
    }),
  };
}

type CreatePlannerFallbackProvider = "anthropic" | "mistral";

function resolveCreatePlannerFallbackProvider(): CreatePlannerFallbackProvider | null {
  const policy = getAiRuntimePolicy();
  for (const provider of policy.providerOrder) {
    if (
      provider === "anthropic" &&
      policy.enabledProviders.includes("anthropic") &&
      policy.anthropic.apiKeyPresent &&
      !policy.anthropic.disabledExplicitly
    ) {
      return "anthropic";
    }
    if (
      provider === "mistral" &&
      policy.enabledProviders.includes("mistral") &&
      policy.mistral.apiKeyPresent
    ) {
      return "mistral";
    }
  }
  return null;
}

function buildFallbackPlannerPrompt(input: BuildCreatePlannerInput) {
  return [
    "Du bist planner_only für den ersten nicht-mutativen /create-Follow-up-Schritt in E150.",
    "Strukturiere den Beitrag fachlich, ohne Fakten zu erfinden und ohne mutative Aktionen.",
    "Gib ausschließlich ein valides JSON-Objekt zurück.",
    "Pflichtfelder:",
    "plannerTopic, plannerCore, plannerScope, plannerStance, plannerClusters, plannerOpenQuestions, shortSummary, topicCandidates, clusterCandidates, scopeCandidates, openQuestions, graphSearchTerms, materialSignals, recommendedLane.",
    "Keine Veröffentlichung, kein Speichern, kein Mergen, kein DeepSearch und keine Quellenbehauptungen.",
    "topicCandidates enthält nur eigenständige Hauptthemen, plannerClusters nur Aspekte oder Unterpunkte.",
    "Bei einem gemeinsamen Kern mit mehreren Maßnahmen: genau ein topicCandidate gleich plannerTopic.",
    "Nummerierte Themenblöcke und Abschnittsüberschriften bleiben als eigenständige topicCandidates erhalten.",
    "Scope/Jurisdiktion nur aus expliziten Texthinweisen ableiten; sonst ausschließlich unclear.",
    "Bei mehreren Politikfeldern müssen mindestens 3 Cluster entstehen.",
    "recommendedLane ist standard oder create_fast_followup.",
    `Locale: ${input.locale}`,
    "",
    "TEXT:",
    input.text,
  ].join("\n");
}

async function tryFallbackPlanner(
  input: BuildCreatePlannerInput,
  provider: CreatePlannerFallbackProvider,
  budget: PlannerAttemptBudget,
): Promise<PlannerAttempt> {
  const policy = getAiRuntimePolicy();
  const model =
    provider === "anthropic" ? policy.anthropic.model : policy.mistral.model;
  const controller = new AbortController();
  const timeoutMs = Math.min(
    resolveCreatePlannerTimeoutMs(input.text),
    policy.providerTimeoutsMs[provider],
  );
  const attemptNumber = reservePlannerAttempt(budget, provider, model);
  if (!attemptNumber) {
    return {
      ok: false,
      reason: "provider_error",
      debug: createPlannerDebug({
        attemptedProvider: provider,
        usedProvider: "local_fallback",
        attemptedModel: model,
        providerAvailable: true,
        providerErrorCode: "attempt_budget_exhausted",
        rawPayloadValid: false,
        rawTextValid: false,
        normalizedPayloadValid: false,
        qualityGatePassed: false,
      }),
    };
  }
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response =
      provider === "anthropic"
        ? await callAnthropic({
            prompt: buildFallbackPlannerPrompt(input),
            model,
            maxOutputTokens: resolveCreatePlannerMaxOutputTokens(input.text),
            signal: controller.signal,
          })
        : await callMistral({
            prompt: buildFallbackPlannerPrompt(input),
            model,
            maxOutputTokens: resolveCreatePlannerMaxOutputTokens(input.text),
            signal: controller.signal,
          });
    let parsed: OpenAiPlannerPayload;
    try {
      parsed = JSON.parse(response.text) as OpenAiPlannerPayload;
    } catch {
      finishPlannerAttempt(budget, attemptNumber, {
        status: "failed",
        resultCode: "invalid_json",
        rawText: response.text,
      });
      return attachPlannerAttemptNumber({
        ok: false,
        reason: "invalid_json",
        debug: createPlannerDebug({
          attemptedProvider: provider,
          usedProvider: "local_fallback",
          attemptedModel: model,
          providerAvailable: true,
          providerErrorCode: "invalid_json",
          rawPayloadValid: false,
          rawTextValid: false,
          normalizedPayloadValid: false,
          qualityGatePassed: false,
          ...responseMetadata(response.text),
        }),
      }, attemptNumber);
    }
    const actualModel = response.model?.trim() || model;
    const normalized = normalizeProviderPlannerPayload(
      parsed,
      input.text,
      actualModel,
      input.locale,
      provider,
      response.text,
    );
    const normalizedFailure =
      "reason" in normalized ? normalized.reason : null;
    finishPlannerAttempt(budget, attemptNumber, {
      status: normalized.ok
        ? "succeeded"
        : normalizedFailure === "quality_gate_failed"
          ? "quality_failed"
          : "failed",
      resultCode: normalized.ok
        ? "succeeded"
        : (normalizedFailure ?? "provider_error"),
      rawText: response.text,
      model: actualModel,
    });
    return attachPlannerAttemptNumber(normalized, attemptNumber);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "unknown_provider_error";
    const errorObject = error as {
      code?: string;
      status?: number;
      meta?: { code?: string };
    } | null;
    const reason: CreatePlannerDegradedReason = isPlannerTimeoutError(error)
      ? "timeout"
      : errorObject?.status === 429 || /rate.?limit|429/i.test(message)
        ? "rate_limited"
        : isModelNotFoundError(error)
          ? "model_not_found"
          : "provider_error";
    finishPlannerAttempt(budget, attemptNumber, {
      status: "failed",
      resultCode: reason,
    });
    return attachPlannerAttemptNumber({
      ok: false,
      reason,
      debug: createPlannerDebug({
        attemptedProvider: provider,
        usedProvider: "local_fallback",
        attemptedModel: model,
        providerAvailable: true,
        providerErrorCode: normalizePlannerErrorCode(
          errorObject?.meta?.code ?? errorObject?.code,
          reason === "timeout" ? "TIMEOUT" : reason,
        ),
        rawPayloadValid: false,
        rawTextValid: false,
        normalizedPayloadValid: false,
        qualityGatePassed: false,
      }),
    }, attemptNumber);
  } finally {
    clearTimeout(timeout);
  }
}

function mapPlannerAttemptToUsageOutcome(
  attempt: PlannerAttempt,
): { success: boolean; errorKind: AiErrorKind | null } {
  if ("reason" in attempt) {
    switch (attempt.reason) {
      case "quality_gate_failed":
        return { success: true, errorKind: null };
      case "model_not_found":
        return { success: false, errorKind: "MODEL_NOT_FOUND" };
      case "invalid_json":
      case "invalid_provider_payload":
        return { success: false, errorKind: "BAD_JSON" };
      case "timeout":
        return { success: false, errorKind: "TIMEOUT" };
      case "rate_limited":
        return { success: false, errorKind: "RATE_LIMIT" };
      case "provider_error":
      case "normalization_failed":
        return { success: false, errorKind: "INTERNAL" };
      default:
        return { success: false, errorKind: null };
    }
  }

  return { success: true, errorKind: null };
}

async function recordCreatePlannerAiUsage(params: {
  input: BuildCreatePlannerInput;
  attempt: PlannerAttempt;
  durationMs: number;
}) {
  const provider = params.attempt.debug.attemptedProvider;
  if (
    !params.attempt.debug.providerAvailable ||
    (provider !== "openai" && provider !== "anthropic" && provider !== "mistral")
  ) {
    return;
  }
  const outcome = mapPlannerAttemptToUsageOutcome(params.attempt);
  const usageModel =
    (params.attempt.ok
      ? params.attempt.result.plannerDebug.usedModel
      : params.attempt.debug.usedModel ?? params.attempt.debug.attemptedModel) ??
    (provider === "openai"
      ? resolveCreatePlannerModelCandidates()[0]
      : provider === "anthropic"
        ? getAiRuntimePolicy().anthropic.model
        : getAiRuntimePolicy().mistral.model) ??
    "unknown";
  await logAiUsage({
    createdAt: new Date(),
    provider,
    model: usageModel,
    pipeline: CREATE_PLANNER_USAGE_PIPELINE,
    operationId: params.input.operationId ?? params.input.requestId ?? null,
    operationType: params.input.operationType ?? "create_intelligent_followup_planner",
    requestId: params.input.requestId ?? null,
    dossierId: params.input.dossierId ?? null,
    organizationId: params.input.organizationId ?? null,
    userId: params.input.userId ?? null,
    locale: params.input.locale ?? null,
    tokensInput: 0,
    tokensOutput: 0,
    costEur: 0,
    durationMs: params.durationMs,
    success: outcome.success,
    errorKind: outcome.errorKind,
    strictJson: true,
    rawError: null,
  });
}

async function buildCreatePlannerResult(input: BuildCreatePlannerInput): Promise<CreatePlannerResult> {
  const text = input.text.trim();
  const budget = createPlannerAttemptBudget(text);
  const startedAt = Date.now();
  const openAiResult = await tryOpenAiPlanner({
    ...input,
    text,
  }, budget);
  void recordCreatePlannerAiUsage({
    input,
    attempt: openAiResult,
    durationMs: Date.now() - startedAt,
  }).catch(() => {});
  if (openAiResult.ok) {
    return applyPlannerAttemptBudget(openAiResult.result, budget);
  }
  if (!openAiResult.ok) {
    const plannerFailure = openAiResult as Extract<PlannerAttempt, { ok: false }>;
    const fallbackProvider = resolveCreatePlannerFallbackProvider();
    const providerContractFailed =
      plannerFailure.reason === "invalid_json" ||
      plannerFailure.reason === "invalid_provider_payload";
    if (
      fallbackProvider &&
      !providerContractFailed &&
      budget.attempts.length < budget.maxAttempts
    ) {
      const fallbackStartedAt = Date.now();
      const fallbackResult = await tryFallbackPlanner(
        { ...input, text },
        fallbackProvider,
        budget,
      );
      void recordCreatePlannerAiUsage({
        input,
        attempt: fallbackResult,
        durationMs: Date.now() - fallbackStartedAt,
      }).catch(() => {});
      if (fallbackResult.ok) {
        return applyPlannerAttemptBudget(fallbackResult.result, budget);
      }
      const fallbackFailure = fallbackResult as Extract<
        PlannerAttempt,
        { ok: false }
      >;
      return applyPlannerAttemptBudget({
        ...buildHeuristicPlanner({
          text,
          plannerProvider: "local_fallback",
          plannerDegraded: true,
          degradedReason: fallbackFailure.reason,
          providerCallAttempted: true,
          providerCallSucceeded: false,
          plannerDebug: fallbackFailure.debug,
        }),
      }, budget);
    }
    return applyPlannerAttemptBudget({
      ...buildHeuristicPlanner({
      text,
      plannerProvider: "local_fallback",
      plannerDegraded: true,
      degradedReason: plannerFailure.reason,
      providerCallAttempted: plannerFailure.reason !== "missing_provider_key",
      providerCallSucceeded: false,
      plannerDebug: plannerFailure.debug,
      }),
    }, budget);
  }

  return applyPlannerAttemptBudget(buildNeutralPlanner({
    text,
    source: "technical_fallback",
    plannerProvider: "local_fallback",
    plannerDegraded: true,
    degradedReason: "normalization_failed",
    providerCallAttempted: true,
    providerCallSucceeded: false,
    plannerDebug: {
      ...createPlannerDebug({
        attemptedProvider: "openai",
        usedProvider: "local_fallback",
        providerAvailable: getAiRuntimePolicy().openai.apiKeyPresent,
        providerErrorCode: "planner_attempt_unreachable_state",
        rawPayloadValid: false,
        rawTextValid: false,
        normalizedPayloadValid: false,
        qualityGatePassed: false,
      }),
    },
  }), budget);
}

export async function buildCreatePlanner(input: BuildCreatePlannerInput): Promise<CreatePlannerResult> {
  const startedAt = Date.now();
  const result = await buildCreatePlannerResult(input);
  return {
    ...result,
    runtimeMs: Date.now() - startedAt,
  };
}
