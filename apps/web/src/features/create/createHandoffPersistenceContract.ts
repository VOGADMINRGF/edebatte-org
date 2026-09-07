import type {
  CreateArgumentDraft,
  CreateClaimDraft,
  CreateHandoffAction,
  CreateHandoffReviewState,
  CreateHandoffJurisdictionConfirmation,
  CreateHandoffTopicSeed,
  CreateOpenQuestionDraft,
  SourceGrounding,
} from "@/features/create/createHandoff";
import type { ExistingMatchUserDecision } from "@/features/create/createContributionPackageContract";
import type { CreateProductionAccessDecision } from "@/features/create/createProductionAccess";
import type { CreatePlannerResult } from "@/features/create/createPlanner";
import type { CreateInputClassification } from "@/features/create/inputClassification";
import type { CreateGraphMatchResult } from "@/features/create/intelligentFollowupContract";
import type { RequestScopeSummary } from "@/lib/server/auth/requestScope";
import type { RegionPublicationVisibilityState } from "@features/region/publicationRiskLadder";

function stableIdHash(value: string) {
  const normalized = String(value).trim();
  const seeds = [2166136261, 2166136261 ^ 0x9e3779b9, 2166136261 ^ 0x85ebca6b];
  const parts = seeds.map((seed) => {
    let hash = seed >>> 0;
    for (let index = 0; index < normalized.length; index += 1) {
      hash ^= normalized.charCodeAt(index);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    return hash.toString(16).padStart(8, "0");
  });
  return parts.join("");
}

export const PERSISTED_CREATE_HANDOFF_SCHEMA_VERSION = "create_handoff_review_item.v1";

export type PersistedCreateHandoffRecord = {
  schemaVersion: typeof PERSISTED_CREATE_HANDOFF_SCHEMA_VERSION;
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
  authorStandpoint?: string | null;
  existingMatchDecision?: ExistingMatchUserDecision | null;
  jurisdictionConfirmation?: CreateHandoffJurisdictionConfirmation | null;
  resumeHref: string;
  reviewState: CreateHandoffReviewState;
  visibilityState: RegionPublicationVisibilityState;
  requiresConfirmation: true;
  reviewRequired: true;
  noAutoPublish: true;
  noPublicOfficial: true;
  noAutomaticOfficialResponse: true;
  noAutoFinalization: true;
  intakeClassification: CreateInputClassification;
  createdByUserId: string;
  regionId: string | null;
  organizationId: string | null;
  dossierId: string | null;
  anlassraumId: string | null;
  requestScope: Pick<
    RequestScopeSummary,
    | "organizationId"
    | "organizationLabel"
    | "membershipStatus"
    | "organizationRole"
    | "roleLabel"
    | "regionIds"
    | "primaryRegionId"
    | "isOperatorMode"
    | "operatorModeLabel"
    | "sourceOfTruth"
    | "confidence"
  > | null;
  accessDecision: Pick<
    CreateProductionAccessDecision,
    | "status"
    | "reason"
    | "title"
    | "body"
    | "requiredEntitlementScopes"
    | "missingEntitlementScopes"
    | "requiredActions"
    | "missingActions"
    | "contractStatus"
    | "billingStatus"
    | "entitlementStatus"
  > | null;
  createdAt: string;
  updatedAt: string;
};

export function buildPersistedCreateHandoffSuggestedTitle(
  record: PersistedCreateHandoffRecord,
  targetType: "dossier" | "anlassraum" | "participation_space",
) {
  const topicLabel = String(record.topicSeed.topicLabel || "").trim();
  if (targetType === "dossier") {
    const matchedDossierLabel =
      record.graphMatches.matches.find((match) => match.kind === "dossier")?.label ?? "";
    return matchedDossierLabel.trim() || topicLabel || "Create-Dossier-Entwurf";
  }
  if (targetType === "participation_space") {
    return topicLabel || "Create-Beteiligungsraum";
  }
  const matchedAnlassraumLabel =
    record.graphMatches.matches.find((match) => match.kind === "anlassraum")?.label ?? "";
  return matchedAnlassraumLabel.trim() || topicLabel || "Create-Anlassraum";
}

export function buildPersistedCreateHandoffSummary(record: PersistedCreateHandoffRecord) {
  const factcheckEligibleCount = record.claims.filter((claim) => claim.factcheckEligible).length;
  const parts = [
    `${record.claims.length} Aussagen`,
    `${record.openQuestions.length} offene Fragen`,
    factcheckEligibleCount > 0 ? `${factcheckEligibleCount} Faktencheck-Kandidaten` : null,
    record.regionId ? "Regionsvorschlag vorhanden" : "Region noch offen",
    record.sourceGrounding.some((entry) => entry.id.startsWith("material-reference-"))
      ? "Materialhinweis erkannt"
      : null,
    record.sourceGrounding.some((entry) => entry.status === "link_reference")
      ? "Quellenhinweis erkannt"
      : null,
  ].filter(Boolean);
  const headline = parts.join(" · ");
  const summary = String(record.plannerResult.shortSummary || record.sourceText).trim();
  return `${headline}. ${summary}`.trim();
}

export function persistedCreateHandoffStatementId(handoffId: string) {
  return `create-handoff:${stableIdHash(String(handoffId || "")).slice(0, 18)}`;
}
