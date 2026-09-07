import type {
  CreatePlannerResult,
  CreatePlannerScope,
} from "@/features/create/createPlanner";
import { hasValidatedCreatePlannerProviderIdentity } from "@/features/create/createPlannerProviderContract";
import type {
  CreateAnalysisState,
  CreateFollowupGraphMatchPlan,
  CreateIntelligentFollowupResult,
  CreateUnderstandingResult,
  DocumentAnalysisSummary,
  FollowupConfidence,
} from "@/features/create/intelligentFollowupContract";
import { normalizeDocumentAnalysisSummary } from "@/features/create/intelligentFollowupContract";
import type { CreateCitizenIntakeContext } from "@/features/create/createContributionPackageContract";

export type BuildCreateTechnicalFollowupInput = {
  text: string;
  analysisState: CreateAnalysisState;
  sourceType: "text" | "link" | "document";
  sourceUrl?: string | null;
  sourceLoaded: boolean;
  userMessage: string;
  generatedAt?: string;
  planner?: CreatePlannerResult | null;
  citizenContext?: CreateCitizenIntakeContext | null;
  documentAnalysis?: DocumentAnalysisSummary | null;
};

export type BuildCreateValidatedDocumentFollowupInput = {
  text: string;
  sourceUrl: string;
  documentAnalysis: DocumentAnalysisSummary;
  generatedAt?: string;
};

function normalizeConfidence(score: number): FollowupConfidence {
  if (score >= 0.74) return "high";
  if (score >= 0.44) return "medium";
  return "low";
}

function buildSourceContentHash(text: string): string {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return `create-${hash.toString(16).padStart(8, "0")}`;
}

function buildUnderstandingFromDocumentAnalysis(
  analysis: DocumentAnalysisSummary,
): CreateUnderstandingResult {
  const normalizedAnalysis = normalizeDocumentAnalysisSummary(analysis);
  const topics = normalizedAnalysis.topics.map((topic, index) => ({
    id: topic.id || `topic-${index + 1}`,
    label: topic.label,
    confidence: normalizeConfidence(index === 0 ? 0.88 : 0.6),
  }));

  return {
    summary: normalizedAnalysis.summary,
    categories: [],
    topics,
    statements: normalizedAnalysis.summary.trim()
      ? [
          {
            id: "document-summary",
            text: normalizedAnalysis.summary.trim(),
            kind: "claim",
            stance: "open",
            confidence: "medium",
          },
        ]
      : [],
    scopes: ["unclear"],
    openQuestion: null,
    confidence: "high",
  };
}

function buildEmptyUnderstanding(summary: string = ""): CreateUnderstandingResult {
  return {
    summary,
    categories: [],
    topics: [],
    statements: [],
    scopes: ["unclear"],
    openQuestion: null,
    confidence: "low",
  };
}

function mapPlannerScope(scope: CreatePlannerScope): CreateUnderstandingResult["scopes"][number] {
  if (scope === "local") return "local";
  if (scope === "district") return "district";
  if (scope === "municipal") return "municipal";
  if (scope === "state") return "state";
  if (scope === "federal") return "federal";
  if (scope === "eu") return "eu";
  if (scope === "international") return "international";
  return "unclear";
}

function dedupeLabels(labels: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const value of labels) {
    const normalized = value.trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(normalized);
  }
  return deduped;
}

function buildGraphMatchPlan(planner?: CreatePlannerResult | null): CreateFollowupGraphMatchPlan {
  const graphAllowed =
    planner?.qualityStatus === "specific" &&
    planner.plannerDegraded === false &&
    hasValidatedCreatePlannerProviderIdentity(planner);
  if (!graphAllowed || !planner) {
    return {
      stage: "after_structure",
      prepared: false,
      requiresConfirmation: true,
      searchTerms: [],
      matches: [],
      matchedTopics: [],
      matchedDossiers: [],
      matchedClaims: [],
      matchedAnlassraeume: [],
      matchedVotes: [],
      shouldCreateNewTopic: false,
    };
  }

  return {
    stage: "after_structure",
    prepared: planner.graphSearchTerms.length > 0,
    requiresConfirmation: true,
    searchTerms: planner.graphSearchTerms,
    matches: planner.graphSearchTerms.slice(0, 5).map((term, index) => ({
      id: `graph-match-${index + 1}`,
      kind: index === 0 ? "topic" : "claim",
      label: term,
      relation: index === 0 ? "new" : "related",
      requiresConfirmation: true,
    })),
    matchedTopics: [],
    matchedDossiers: [],
    matchedClaims: [],
    matchedAnlassraeume: [],
    matchedVotes: [],
    shouldCreateNewTopic: true,
  };
}

export function buildCreateTechnicalFollowup(
  input: BuildCreateTechnicalFollowupInput,
): CreateIntelligentFollowupResult {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const planner = input.planner ?? null;
  const documentAnalysis = input.documentAnalysis
    ? normalizeDocumentAnalysisSummary(input.documentAnalysis)
    : null;

  return {
    understanding: buildEmptyUnderstanding(input.userMessage),
    suggestions: [],
    sourceText: input.text.trim(),
    generatedAt,
    meta: {
      planner,
      citizenContext: input.citizenContext ?? null,
      graphMatch: buildGraphMatchPlan(planner),
      researchUsed: "none",
      researchProvider: null,
      deepSearchUsed: false,
      analysis: {
        state: input.analysisState,
        analysisId: `analysis-${generatedAt}`,
        sourceType: input.sourceType,
        sourceUrl: input.sourceUrl ?? null,
        sourceContentHash: buildSourceContentHash(input.text),
        analyzedAt: generatedAt,
        orchestrationRunId: `orchestration-${generatedAt}`,
        schemaVersion: "create_followup.v2",
        validationStatus:
          input.analysisState === "analysis_validated" || input.analysisState === "result_ready"
            ? "validated"
            : input.analysisState === "ai_failed" || input.analysisState === "fetch_failed"
              ? "failed"
              : "not_started",
        evidenceReferences: input.sourceUrl ? [input.sourceUrl] : [],
        confidence: null,
        sourceLoaded: input.sourceLoaded,
        userMessage: input.userMessage,
      },
      documentAnalysis,
    },
    degraded:
      input.analysisState !== "analysis_validated" &&
      input.analysisState !== "result_ready",
    degradedReason:
      input.analysisState === "fetch_failed"
        ? "fetch_failed"
        : input.analysisState === "ai_failed"
          ? "ai_failed"
          : null,
  };
}

export function buildCreateValidatedDocumentFollowup(
  input: BuildCreateValidatedDocumentFollowupInput,
): CreateIntelligentFollowupResult {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const documentAnalysis = normalizeDocumentAnalysisSummary(input.documentAnalysis);
  const understanding = buildUnderstandingFromDocumentAnalysis(documentAnalysis);

  return {
    understanding,
    suggestions: [],
    sourceText: input.text.trim(),
    generatedAt,
    meta: {
      planner: null,
      graphMatch: buildGraphMatchPlan(null),
      researchUsed: "none",
      researchProvider: null,
      deepSearchUsed: false,
      analysis: {
        state: "result_ready",
        analysisId: `analysis-${generatedAt}`,
        sourceType: "document",
        sourceUrl: input.sourceUrl,
        sourceContentHash: buildSourceContentHash(input.text),
        analyzedAt: generatedAt,
        orchestrationRunId: `orchestration-${generatedAt}`,
        schemaVersion: "create_followup.v2",
        validationStatus: "validated",
        evidenceReferences: [input.sourceUrl],
        confidence: 0.82,
        sourceLoaded: true,
        userMessage: null,
      },
      documentAnalysis,
    },
    degraded: false,
    degradedReason: null,
  };
}
