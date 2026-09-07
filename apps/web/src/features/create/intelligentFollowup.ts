import type { CreateIntent } from "@/features/create/intentFlows";
import { buildCreateConnectionSuggestions } from "@/features/create/createConnectionSuggestions";
import {
  buildCreatePlanner,
  type CreatePlannerResult,
  type CreatePlannerScope,
  type CreatePlannerStance,
} from "@/features/create/createPlanner";
import {
  hasValidatedCreatePlannerProviderIdentity,
} from "@/features/create/createPlannerProviderContract";
import {
  buildCreateTechnicalFollowup,
} from "@/features/create/intelligentFollowupResults";
import type {
  CreateFollowupGraphMatchPlan,
  CreateIntelligentFollowupResult,
  CreateUnderstandingStatementKind,
  CreateUnderstandingResult,
  FollowupConfidence,
} from "@/features/create/intelligentFollowupContract";
import { buildOfficialRegionsFromDirectory } from "@features/region/directory";
import { resolveCreateCitizenIntakeContext } from "@/features/create/createCitizenIntakeContext";

type BuildCreateIntelligentFollowupInput = {
  text: string;
  locale: string;
  intent?: CreateIntent;
  userId?: string | null;
  requestId?: string | null;
  operationId?: string | null;
  operationType?: string | null;
  organizationId?: string | null;
  anlassraumId?: string | null;
  dossierId?: string | null;
  maxSuggestions?: number;
};

const MAX_UNDERSTANDING_TOPICS = 14;

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

function inferStatementKind(text: string): CreateUnderstandingStatementKind {
  const normalized = text.toLowerCase();
  if (/\?/.test(text)) return "question";
  if (/https?:\/\/|www\./.test(normalized) || /quelle|bericht|dokument|studie/.test(normalized)) return "source";
  if (/soll|muss|fordern|fordere|verlangen/.test(normalized)) return "demand";
  if (/option|variante|alternativ|lösung|loesung/.test(normalized)) return "option";
  if (/widerspruch|dagegen|kritik|zweifel/.test(normalized)) return "objection";
  if (/hinweis|beobachtung|erfahrung/.test(normalized)) return "hint";
  if (/weil|daher|deshalb|darum/.test(normalized)) return "argument";
  return "claim";
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

function mapPlannerStanceToUnderstanding(
  stance: CreatePlannerStance,
): CreateUnderstandingResult["statements"][number]["stance"] {
  if (stance === "pro") return "pro";
  if (stance === "contra") return "contra";
  if (stance === "mixed") return "mixed";
  if (stance === "reform_oriented") return "pro";
  if (stance === "open") return "open";
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

function buildUnderstandingFromPlanner(planner: CreatePlannerResult): CreateUnderstandingResult {
  const providerTopicLabels = dedupeLabels(planner.topicCandidates);
  const topicLabels = providerTopicLabels.length > 0
    ? providerTopicLabels
    : [planner.plannerTopic];
  const normalizedTopicLabels = new Set(
    topicLabels.map((label) => label.trim().toLowerCase()),
  );
  const aspects = dedupeLabels([
    ...planner.plannerClusters,
    ...planner.clusterCandidates,
  ]).filter((label) => !normalizedTopicLabels.has(label.trim().toLowerCase()));
  const scopes = dedupeLabels([
    ...planner.plannerScope,
    ...planner.scopeCandidates,
  ])
    .map((scope) => mapPlannerScope(scope as CreatePlannerScope))
    .filter(Boolean) as CreateUnderstandingResult["scopes"];
  const statementText = planner.plannerCore.trim();
  const statementKind = inferStatementKind(statementText);

  return {
    summary: planner.shortSummary.trim(),
    categories: [
      {
        id: statementKind,
        label:
          statementKind === "question"
            ? "Frage"
            : statementKind === "demand"
              ? "Forderung"
              : statementKind === "source"
                ? "Quelle"
                : statementKind === "option"
                  ? "Option"
                  : statementKind === "objection"
                    ? "Widerspruch"
                    : statementKind === "hint"
                      ? "Hinweis"
                      : statementKind === "argument"
                        ? "Argument"
                        : "Aussage",
        confidence: "high",
      },
    ],
    topics: topicLabels.slice(0, MAX_UNDERSTANDING_TOPICS).map((label, index) => ({
      id: `topic-${index + 1}`,
      label,
      confidence: index === 0 ? "high" : "medium",
    })),
    aspects,
    statements: statementText
      ? [
          {
            id: "planner-core",
            text: statementText,
            kind: statementKind,
            stance: mapPlannerStanceToUnderstanding(planner.plannerStance),
            confidence: "high",
          },
        ]
      : [],
    scopes: scopes.length > 0 ? scopes : ["unclear"],
    openQuestion: planner.plannerOpenQuestions[0] ?? planner.openQuestions[0] ?? null,
    confidence: "high",
  };
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
    prepared: false,
    requiresConfirmation: true,
    searchTerms: [],
    matches: [],
    matchedTopics: [],
    matchedDossiers: [],
    matchedClaims: [],
    matchedAnlassraeume: [],
    matchedVotes: [],
    shouldCreateNewTopic: true,
  };
}

function resolveTextAnalysisFailureMessage(
  planner: CreatePlannerResult,
  locale: string,
): string {
  const isEnglish = locale.trim().toLowerCase().startsWith("en");
  if (planner.degradedReason === "missing_provider_key") {
    return isEnglish
      ? "The AI analysis is currently unavailable. No topics or summaries were generated."
      : "Die KI-Analyse ist derzeit nicht verfügbar. Es wurden keine Themen oder Zusammenfassungen erzeugt.";
  }
  return isEnglish
    ? "The AI analysis could not be completed. No topics were derived."
    : "Die KI-Analyse konnte noch nicht durchgeführt werden. Es wurden deshalb keine Themen abgeleitet.";
}

export async function buildCreateIntelligentFollowup(
  input: BuildCreateIntelligentFollowupInput,
): Promise<CreateIntelligentFollowupResult> {
  const text = input.text.trim();
  const generatedAt = new Date().toISOString();
  const planner = await buildCreatePlanner({
    text,
    locale: input.locale,
    requestId: input.requestId ?? null,
    operationId: input.operationId ?? null,
    operationType: input.operationType ?? null,
    dossierId: input.dossierId ?? null,
    userId: input.userId ?? null,
    organizationId: input.organizationId ?? null,
  });

  if (
    !hasValidatedCreatePlannerProviderIdentity(planner) ||
    planner.qualityStatus !== "specific" ||
    planner.plannerDegraded
  ) {
    return buildCreateTechnicalFollowup({
      text,
      analysisState: "ai_failed",
      sourceType: "text",
      sourceLoaded: true,
      userMessage: resolveTextAnalysisFailureMessage(planner, input.locale),
      generatedAt,
      planner,
    });
  }

  // The bounded AI planner remains the first semantic pass. Deterministic
  // directory/jurisdiction logic validates its successful result afterwards;
  // provider failure must not masquerade as a precise heuristic assignment.
  const citizenContext = resolveCreateCitizenIntakeContext({
    text,
    locale: input.locale,
    directoryEntries: buildOfficialRegionsFromDirectory()
      .filter((region) => Boolean(region.officialDirectoryEntry))
      .map((region) => ({
        id: region.id,
        municipalityName: region.name,
        state: region.federalState,
        country: region.country,
        registryId: region.officialDirectoryEntry?.ags ?? region.officialDirectoryEntry?.ars ?? null,
        authorityName: region.officialBody?.label ?? null,
      })),
  });

  const plannerUnderstanding = buildUnderstandingFromPlanner(planner);
  const understanding = citizenContext.clarificationQuestion
    ? {
        ...plannerUnderstanding,
        openQuestion: citizenContext.clarificationQuestion,
      }
    : plannerUnderstanding;
  const suggestions = buildCreateConnectionSuggestions({
    text,
    intent: input.intent,
    understanding,
    planner,
    anlassraumId: input.anlassraumId,
    dossierId: input.dossierId,
    maxSuggestions: input.maxSuggestions,
  });

  return {
    understanding,
    suggestions,
    sourceText: text,
    generatedAt,
    meta: {
      planner,
      citizenContext,
      graphMatch: buildGraphMatchPlan(planner),
      researchUsed: "none",
      researchProvider: null,
      deepSearchUsed: false,
      analysis: {
        state: "result_ready",
        analysisId: `analysis-${generatedAt}`,
        sourceType: "text",
        sourceUrl: null,
        sourceContentHash: buildSourceContentHash(text),
        analyzedAt: generatedAt,
        orchestrationRunId: `orchestration-${generatedAt}`,
        schemaVersion: "create_followup.v2",
        validationStatus: "validated",
        evidenceReferences: [],
        confidence:
          understanding.confidence === "high"
            ? 0.88
            : understanding.confidence === "medium"
              ? 0.62
              : 0.38,
        sourceLoaded: true,
        userMessage: null,
      },
    },
    degraded: false,
    degradedReason: null,
  };
}
