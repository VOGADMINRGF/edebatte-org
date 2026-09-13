import type { CreatePlannerResult } from "@/features/create/createPlanner";
import type { NormalizedMaterialItem } from "@/features/create/materialRouting";
import {
  evaluatePublicQuestionGeneralization,
  type PublicQuestionGeneralizationResult,
} from "@/features/create/safety/publicQuestionGeneralization";
import { normalizeGermanSlug } from "@features/common/utils/textNormalization";
import {
  resolveCreateHandoffVisibilityState,
  type RegionPublicationVisibilityState,
} from "@features/region/publicationRiskLadder";
import type {
  CreateGraphMatchRecord,
  CreateGraphMatchResult,
  CreateIntelligentFollowupResult,
} from "@/features/create/intelligentFollowupContract";

export type SourceGrounding = {
  id: string;
  label: string;
  status: "source_text" | "source_excerpt" | "link_reference" | "missing";
  detail?: string;
};

export type CreateHandoffAction =
  | "submit_draft"
  | "append_to_dossier"
  | "prepare_anlassraum"
  | "prepare_participation_space"
  | "create_dossier"
  | "request_factcheck"
  | "prepare_vote"
  | "request_review";

export type CreateClaimDraft = {
  id: string;
  text: string;
  kind: "factual_claim" | "normative_claim" | "policy_claim";
  factcheckEligible: boolean;
  sourceRefs: string[];
};

export type CreateArgumentDraft = {
  id: string;
  text: string;
  stance: "pro" | "contra" | "mixed" | "unclear";
  supportsClaimIds: string[];
};

export type CreateOpenQuestionDraft = {
  id: string;
  question: string;
  requiredBeforePublish: boolean;
  generalization?: PublicQuestionGeneralizationResult;
};

export type CreateHandoffReviewState =
  | "draft"
  | "clarification_required"
  | "graph_review_required"
  | "factcheck_candidate"
  | "manual_review_required"
  | "ready_for_confirmation";

export type CreateHandoffTopicSeed = {
  topicKey: string;
  topicLabel: string;
  jurisdiction: "kommune" | "land" | "bund" | "mixed";
  themenradarSourceType: "create_intake";
};

export type CreateHandoffDraft = {
  id: string;
  source: "create";
  sourceText: string;
  plannerResult: CreatePlannerResult;
  graphMatches: CreateGraphMatchResult;
  selectedAction: CreateHandoffAction;
  claims: CreateClaimDraft[];
  arguments: CreateArgumentDraft[];
  openQuestions: CreateOpenQuestionDraft[];
  sourceGrounding: SourceGrounding[];
  topicSeed: CreateHandoffTopicSeed;
  resumeHref: string;
  reviewState: CreateHandoffReviewState;
  visibilityState?: RegionPublicationVisibilityState;
  requiresConfirmation: true;
  createdAt: string;
};

type BuildCreateHandoffDraftInput = {
  result: CreateIntelligentFollowupResult;
  selectedAction: CreateHandoffAction;
  id?: string;
  createdAt?: string;
  sourceUrls?: string[];
  materialItems?: NormalizedMaterialItem[];
};

const STORAGE_KEY = "edb_create_handoff_drafts_v1";

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ");
}

function dedupeByText<T extends { text: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = normalizeText(item.text);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeQuestions(items: CreateOpenQuestionDraft[]): CreateOpenQuestionDraft[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = normalizeText(item.question);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function classifyClaimKind(text: string): CreateClaimDraft["kind"] {
  const normalized = text.toLowerCase();
  if (
    /\bethisch\b|\bmoralisch\b|\bwert\b|\bgerecht\b|\btierschutz\b|\btierwohl\b/.test(normalized) &&
    /\bproblem\b|\bschwierig\b|\bgeboten\b|\bverantwortbar\b|\bunverantwortlich\b/.test(normalized)
  ) {
    return "normative_claim";
  }
  if (
    /\bsoll\b|\bmuss\b|\bfordern\b|\bfordere\b|\bverlangen\b|\bforderung\b|\bverbesser\w*\b|\bstrengere?\b|\bvergleichbar\w*\b|\beinheitlich\b|\bzulassen\b|\bzugelassen\b|\bstandards?\b|\bregeln\b|\bimport\b|\bexport\b/.test(
      normalized,
    )
  ) {
    return /\bethisch\b|\bmoralisch\b|\bwert\b|\bgerecht\b/.test(normalized) ? "normative_claim" : "policy_claim";
  }
  return "factual_claim";
}

function isFactcheckEligible(kind: CreateClaimDraft["kind"], text: string): boolean {
  if (kind !== "factual_claim") return false;
  const normalized = text.toLowerCase();
  if (/\?/.test(text)) return false;
  if (/\bsoll\b|\bmuss\b|\bfordern\b|\bfordere\b|\bverlangen\b/.test(normalized)) return false;
  return true;
}

function buildClaimDrafts(result: CreateIntelligentFollowupResult): CreateClaimDraft[] {
  const claims = result.understanding.statements.slice(0, 5).map((statement, index) => {
    const kind = classifyClaimKind(statement.text);
    return {
      id: `claim-${index + 1}`,
      text: statement.text,
      kind,
      factcheckEligible: isFactcheckEligible(kind, statement.text),
      sourceRefs: statement.sourceExcerpt ? [`source-${index + 1}`] : [],
    };
  });
  return dedupeByText(claims);
}

function buildArgumentDrafts(result: CreateIntelligentFollowupResult, claims: CreateClaimDraft[]): CreateArgumentDraft[] {
  const primaryClaimIds = claims.slice(0, 2).map((claim) => claim.id);
  const argumentsDrafts: CreateArgumentDraft[] = [];
  const plannerSummary = result.meta?.planner?.shortSummary?.trim();
  if (plannerSummary) {
    const plannerStance = result.meta?.planner?.plannerStance;
    argumentsDrafts.push({
      id: "argument-1",
      text: plannerSummary,
      stance:
        plannerStance === "open"
          ? "unclear"
          : plannerStance === "reform_oriented"
            ? "mixed"
            : plannerStance ?? "unclear",
      supportsClaimIds: primaryClaimIds,
    });
  }
  result.understanding.statements.slice(1, 4).forEach((statement, index) => {
    argumentsDrafts.push({
      id: `argument-${argumentsDrafts.length + 1}`,
      text: statement.text,
      stance: statement.stance === "open" ? "unclear" : statement.stance,
      supportsClaimIds: primaryClaimIds,
    });
  });
  return dedupeByText(argumentsDrafts);
}

function buildOpenQuestionDrafts(result: CreateIntelligentFollowupResult): CreateOpenQuestionDraft[] {
  const plannerQuestions = result.meta?.planner
    ? [
        ...result.meta.planner.plannerOpenQuestions,
        ...result.meta.planner.openQuestions,
      ]
    : [];
  const items = [
    ...(result.understanding.openQuestion ? [result.understanding.openQuestion] : []),
    ...plannerQuestions,
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((question, index) => ({
      id: `question-${index + 1}`,
      question,
      requiredBeforePublish: true,
      generalization: evaluatePublicQuestionGeneralization({
        originalInput: result.sourceText,
        candidatePublicQuestion: question,
        actorContexts: [],
        actorExtraction: {
          status: "unverified",
          source: "create_analysis",
          independentFromCandidateProvider: false,
          evidenceRefs: result.meta?.analysis?.evidenceReferences ?? [],
        },
      }),
    }));
  return dedupeQuestions(items);
}

function buildSourceGrounding(
  result: CreateIntelligentFollowupResult,
  inputContext?: {
    sourceUrls?: string[];
    materialItems?: NormalizedMaterialItem[];
  },
): SourceGrounding[] {
  const grounding: SourceGrounding[] = [
    {
      id: "source-text",
      label: "Ausgangstext",
      status: "source_text",
      detail: result.sourceText,
    },
  ];
  result.understanding.statements.forEach((statement, index) => {
    if (!statement.sourceExcerpt) return;
    grounding.push({
      id: `source-${index + 1}`,
      label: `Quellenausschnitt ${index + 1}`,
      status: "source_excerpt",
      detail: statement.sourceExcerpt,
    });
  });
  (inputContext?.sourceUrls ?? []).forEach((sourceUrl, index) => {
    grounding.push({
      id: `link-reference-${index + 1}`,
      label: `Link ${index + 1}`,
      status: "link_reference",
      detail: sourceUrl,
    });
  });
  (inputContext?.materialItems ?? []).forEach((item, index) => {
    grounding.push({
      id: `material-reference-${index + 1}`,
      label: item.fileName ?? item.label ?? `Material ${index + 1}`,
      status: "link_reference",
      detail: item.url ?? item.kind,
    });
  });
  if (grounding.length === 1) {
    grounding.push({
      id: "source-missing",
      label: "Quellenstatus",
      status: "missing",
      detail: "Keine gesonderte Quelle mitgegeben; Review bleibt erforderlich.",
    });
  }
  return grounding;
}

function normalizeGraphMatches(graphMatches: CreateGraphMatchResult): CreateGraphMatchResult {
  const matches = graphMatches.matches.map((match): CreateGraphMatchRecord => ({
    ...match,
    requiresConfirmation: true,
  }));
  return {
    ...graphMatches,
    matches,
    requiresConfirmation: true,
  };
}

function deriveTopicJurisdiction(plannerResult: CreatePlannerResult): CreateHandoffTopicSeed["jurisdiction"] {
  const scopes = new Set(plannerResult.plannerScope);
  if (scopes.has("municipal") || scopes.has("district") || scopes.has("local")) return "kommune";
  if (scopes.has("state")) return "land";
  if (scopes.has("federal")) return "bund";
  return "mixed";
}

function buildTopicSeed(result: CreateIntelligentFollowupResult, plannerResult: CreatePlannerResult): CreateHandoffTopicSeed {
  const topicLabel = plannerResult.plannerTopic.trim() || result.understanding.topics[0]?.label?.trim() || "Öffentliches Thema";
  return {
    topicKey: normalizeGermanSlug(topicLabel, { maxLength: 64, fallback: "oeffentliches-thema" }),
    topicLabel,
    jurisdiction: deriveTopicJurisdiction(plannerResult),
    themenradarSourceType: "create_intake",
  };
}

export function buildCreateHandoffResumeHref(handoffId: string): string {
  const search = new URLSearchParams();
  search.set("resume", "create_handoff");
  search.set("handoffId", handoffId);
  return `/create?${search.toString()}`;
}

function deriveReviewState(params: {
  selectedAction: CreateHandoffAction;
  graphMatches: CreateGraphMatchResult;
  openQuestions: CreateOpenQuestionDraft[];
}): CreateHandoffReviewState {
  if (params.graphMatches.matches.some((match) => match.relation === "duplicate_risk" || match.relation === "needs_review")) {
    return "graph_review_required";
  }
  if (params.selectedAction === "request_factcheck") return "factcheck_candidate";
  if (params.selectedAction === "request_review") return "manual_review_required";
  if (params.openQuestions.length > 0) return "clarification_required";
  return "ready_for_confirmation";
}

export function buildCreateHandoffDraft(input: BuildCreateHandoffDraftInput): CreateHandoffDraft {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const plannerResult = input.result.meta?.planner;
  const graphMatches = input.result.meta?.graphMatch;
  if (!plannerResult || !graphMatches) {
    throw new Error("create_handoff_requires_planner_and_graph_meta");
  }
  const claims = buildClaimDrafts(input.result);
  const argumentsDrafts = buildArgumentDrafts(input.result, claims);
  const openQuestions = buildOpenQuestionDrafts(input.result);
  const normalizedGraphMatches = normalizeGraphMatches(graphMatches);
  const generatedId =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}`;
  const handoffId = input.id ?? `create-handoff-${generatedId}`;
  const reviewState = deriveReviewState({
    selectedAction: input.selectedAction,
    graphMatches: normalizedGraphMatches,
    openQuestions,
  });
  return {
    id: handoffId,
    source: "create",
    sourceText: input.result.sourceText,
    plannerResult,
    graphMatches: normalizedGraphMatches,
    selectedAction: input.selectedAction,
    claims,
    arguments: argumentsDrafts,
    openQuestions,
    sourceGrounding: buildSourceGrounding(input.result, {
      sourceUrls: input.sourceUrls,
      materialItems: input.materialItems,
    }),
    topicSeed: buildTopicSeed(input.result, plannerResult),
    resumeHref: buildCreateHandoffResumeHref(handoffId),
    reviewState,
    visibilityState: resolveCreateHandoffVisibilityState({
      reviewState,
    }),
    requiresConfirmation: true,
    createdAt,
  };
}

export function buildCreateFactcheckClaimPreview(draft: CreateHandoffDraft): {
  eligibleClaims: CreateClaimDraft[];
  blockedClaims: CreateClaimDraft[];
} {
  return {
    eligibleClaims: draft.claims.filter((claim) => claim.factcheckEligible),
    blockedClaims: draft.claims.filter((claim) => !claim.factcheckEligible),
  };
}

function readStore(): Record<string, CreateHandoffDraft> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, CreateHandoffDraft>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(value: Record<string, CreateHandoffDraft>) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

export function saveCreateHandoffDraft(draft: CreateHandoffDraft): void {
  if (typeof window === "undefined") return;
  const store = readStore();
  store[draft.id] = draft;
  writeStore(store);
}

export function readCreateHandoffDraft(id: string | null | undefined): CreateHandoffDraft | null {
  const normalized = String(id ?? "").trim();
  if (!normalized) return null;
  const store = readStore();
  return store[normalized] ?? null;
}

export function buildCreateHandoffTargetHref(params: {
  baseHref: string;
  handoffId: string;
  action: CreateHandoffAction;
}): string {
  const url = new URL(params.baseHref, "https://edebatte.local");
  url.searchParams.set("handoffId", params.handoffId);
  url.searchParams.set("createAction", params.action);
  return `${url.pathname}${url.search}`;
}
