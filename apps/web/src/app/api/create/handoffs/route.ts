import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveRequestScopeContext } from "@/lib/server/auth/requestScope";
import { summarizeRequestScopeContext } from "@/lib/server/auth/requestScope";
import type {
  CreateArgumentDraft,
  CreateClaimDraft,
  CreateHandoffAction,
  CreateHandoffDraft,
  CreateHandoffReviewState,
  CreateHandoffTopicSeed,
  CreateOpenQuestionDraft,
  SourceGrounding,
} from "@/features/create/createHandoff";
import {
  resolveCreateProductionAccessDecision,
  type CreateProductionAccessDecision,
} from "@/features/create/createProductionAccess";
import { classifyCreateHandoffDraft } from "@/features/create/inputClassification";
import { evaluatePublicQuestionGeneralization } from "@/features/create/safety/publicQuestionGeneralization";
import {
  persistCreateHandoffForReview,
  resolvePersistedCreateHandoffContext,
} from "@/features/create/persistedHandoffReviewQueue";
import {
  ensurePersistedDossierRuntimeDraft,
  getDossierRuntimeHandoffSummary,
} from "@/features/create/dossierRuntimeServer";
import type { CreatePlannerResult } from "@/features/create/createPlanner";
import type { CreateGraphMatchResult } from "@/features/create/intelligentFollowupContract";
import type { RegionPublicationVisibilityState } from "@features/region/publicationRiskLadder";
import {
  buildOrganizationDashboardReadModel,
  canEditOrganizationResource,
  canViewRegionResource,
  regionScopeFromRegionAccessContext,
} from "@features/region";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreateHandoffBodySchema = z
  .object({
    draft: z.unknown(),
    dossierId: z.string().trim().min(1).optional(),
    anlassraumId: z.string().trim().min(1).optional(),
  })
  .strict();

function unauthorized() {
  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}

function denied(error: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: false, error, ...extra }, { status: 403 });
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "").trim()).filter(Boolean);
}

function normalizeCreateHandoffAction(value: unknown): CreateHandoffAction {
  switch (value) {
    case "submit_draft":
    case "append_to_dossier":
    case "prepare_anlassraum":
    case "prepare_participation_space":
    case "create_dossier":
    case "request_factcheck":
    case "prepare_vote":
    case "request_review":
      return value;
    default:
      throw new Error("invalid_create_handoff_action");
  }
}

function normalizeCreateHandoffReviewState(value: unknown): CreateHandoffReviewState {
  switch (value) {
    case "draft":
    case "clarification_required":
    case "graph_review_required":
    case "factcheck_candidate":
    case "manual_review_required":
    case "ready_for_confirmation":
      return value;
    default:
      return "manual_review_required";
  }
}

function normalizeVisibilityState(value: unknown): RegionPublicationVisibilityState {
  switch (value) {
    case "private_draft":
    case "internal_review":
    case "public_unverified":
    case "public_reviewed":
    case "public_official":
    case "archived":
    case "blocked":
      return value;
    default:
      return "internal_review";
  }
}

function normalizeClaimDrafts(value: unknown): CreateClaimDraft[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    const claim = item as Record<string, unknown>;
    const kind: CreateClaimDraft["kind"] =
      claim.kind === "normative_claim" || claim.kind === "policy_claim"
        ? claim.kind
        : "factual_claim";
    return {
      id: String(claim.id ?? `claim-${index + 1}`),
      text: String(claim.text ?? "").trim(),
      kind,
      factcheckEligible: Boolean(claim.factcheckEligible),
      sourceRefs: normalizeStringArray(claim.sourceRefs),
    };
  }).filter((claim) => claim.text.length > 0);
}

function normalizeArgumentDrafts(value: unknown): CreateArgumentDraft[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    const argument = item as Record<string, unknown>;
    const stance: CreateArgumentDraft["stance"] =
      argument.stance === "pro" ||
      argument.stance === "contra" ||
      argument.stance === "mixed" ||
      argument.stance === "unclear"
        ? argument.stance
        : "unclear";
    return {
      id: String(argument.id ?? `argument-${index + 1}`),
      text: String(argument.text ?? "").trim(),
      stance,
      supportsClaimIds: normalizeStringArray(argument.supportsClaimIds),
    };
  }).filter((argument) => argument.text.length > 0);
}

function normalizeOpenQuestions(value: unknown, sourceText: string): CreateOpenQuestionDraft[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    const question = item as Record<string, unknown>;
    return {
      id: String(question.id ?? `question-${index + 1}`),
      question: String(question.question ?? "").trim(),
      requiredBeforePublish: question.requiredBeforePublish !== false,
      generalization: evaluatePublicQuestionGeneralization({
        originalInput: sourceText,
        candidatePublicQuestion: String(question.question ?? "").trim(),
        actorContexts: [],
        actorExtraction: {
          status: "unverified",
          source: "create_analysis",
          independentFromCandidateProvider: false,
          evidenceRefs: [],
        },
      }),
    };
  }).filter((question) => question.question.length > 0);
}

function normalizeSourceGrounding(value: unknown): SourceGrounding[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    const grounding = item as Record<string, unknown>;
    const status =
      grounding.status === "source_text" ||
      grounding.status === "source_excerpt" ||
      grounding.status === "link_reference" ||
      grounding.status === "missing"
        ? grounding.status
        : "missing";
    return {
      id: String(grounding.id ?? `source-${index + 1}`),
      label: String(grounding.label ?? `Quelle ${index + 1}`).trim(),
      status,
      detail: grounding.detail ? String(grounding.detail) : undefined,
    };
  });
}

function normalizePlannerResult(value: unknown): CreatePlannerResult {
  return value as CreatePlannerResult;
}

function normalizeGraphMatches(value: unknown): CreateGraphMatchResult {
  return value as CreateGraphMatchResult;
}

function normalizeTopicSeed(value: unknown): CreateHandoffTopicSeed {
  const seed = (value ?? {}) as Record<string, unknown>;
  return {
    topicKey: String(seed.topicKey ?? "oeffentliches-thema").trim() || "oeffentliches-thema",
    topicLabel: String(seed.topicLabel ?? "Öffentliches Thema").trim() || "Öffentliches Thema",
    jurisdiction:
      seed.jurisdiction === "kommune" ||
      seed.jurisdiction === "land" ||
      seed.jurisdiction === "bund" ||
      seed.jurisdiction === "mixed"
        ? seed.jurisdiction
        : "mixed",
    themenradarSourceType: "create_intake",
  };
}

function normalizeCreateHandoffDraft(value: unknown): CreateHandoffDraft {
  const draft = (value ?? {}) as Record<string, unknown>;
  const id = String(draft.id ?? "").trim();
  const sourceText = String(draft.sourceText ?? "").trim();
  const resumeHref = String(draft.resumeHref ?? "").trim();
  if (!id || !sourceText || !resumeHref) {
    throw new Error("invalid_create_handoff_draft");
  }
  return {
    id,
    source: "create",
    sourceText,
    plannerResult: normalizePlannerResult(draft.plannerResult),
    graphMatches: normalizeGraphMatches(draft.graphMatches),
    selectedAction: normalizeCreateHandoffAction(draft.selectedAction),
    claims: normalizeClaimDrafts(draft.claims),
    arguments: normalizeArgumentDrafts(draft.arguments),
    openQuestions: normalizeOpenQuestions(draft.openQuestions, sourceText),
    sourceGrounding: normalizeSourceGrounding(draft.sourceGrounding),
    topicSeed: normalizeTopicSeed(draft.topicSeed),
    resumeHref,
    reviewState: normalizeCreateHandoffReviewState(draft.reviewState),
    visibilityState: normalizeVisibilityState(draft.visibilityState),
    requiresConfirmation: true,
    createdAt: String(draft.createdAt ?? new Date().toISOString()),
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = CreateHandoffBodySchema.parse(await req.json());
    const draft = normalizeCreateHandoffDraft(body.draft);
    const intakeClassification = classifyCreateHandoffDraft(draft);
    const context = await resolvePersistedCreateHandoffContext({
      draft,
      dossierId: body.dossierId ?? null,
      anlassraumId: body.anlassraumId ?? null,
    });
    const scopeContext = await resolveRequestScopeContext(req, {
      regionId: context.regionId,
      allowOperatorFallback: false,
    });
    const userId = scopeContext?.actorId ?? null;
    if (!scopeContext || !userId) return unauthorized();
    const accessContext = scopeContext.regionAccess;
    const scope = regionScopeFromRegionAccessContext({ accessContext });
    if (
      !scopeContext.isOperatorMode &&
      ((
        context.regionId &&
        !canViewRegionResource(scope, {
          regionId: context.regionId,
          organizationId: context.organizationId,
        })
      ) || (
        context.organizationId &&
        !canEditOrganizationResource(scope, {
          organizationId: context.organizationId,
        })
      ))
    ) {
      return denied("create_handoff_scope_forbidden");
    }
    const requestScope = summarizeRequestScopeContext(scopeContext);
    let accessDecision: CreateProductionAccessDecision | null = null;
    if (!scopeContext.isOperatorMode) {
      const dashboardReadModel = await buildOrganizationDashboardReadModel({
        userId,
        roles: scopeContext.actor.roles,
        isAdmin: scopeContext.isOperatorMode,
        actorRole:
          scopeContext.organizationRole ??
          scopeContext.actor.governanceRole ??
          scopeContext.user.role ??
          null,
      });
      accessDecision = resolveCreateProductionAccessDecision({
        requestScope,
        dashboardReadModel,
        action: draft.selectedAction,
      });
      if (accessDecision.status !== "allowed") {
        return denied("create_handoff_not_productively_available", {
          requestScope,
          accessDecision,
        });
      }
    }
    const fallbackRegionId =
      context.regionId ??
      requestScope?.primaryRegionId ??
      scopeContext.regionIds[0] ??
      null;
    const fallbackOrganizationId =
      context.organizationId ??
      requestScope?.organizationId ??
      scopeContext.regionAccess.organization.primaryOrganizationId ??
      null;
    const record = await persistCreateHandoffForReview({
      draft,
      createdByUserId: userId,
      regionId: fallbackRegionId,
      organizationId: fallbackOrganizationId,
      dossierId: context.dossierId,
      anlassraumId: context.anlassraumId,
      intakeClassification,
      requestScope: requestScope
        ? {
            organizationId: requestScope.organizationId,
            organizationLabel: requestScope.organizationLabel,
            membershipStatus: requestScope.membershipStatus,
            organizationRole: requestScope.organizationRole,
            roleLabel: requestScope.roleLabel,
            regionIds: requestScope.regionIds,
            primaryRegionId: requestScope.primaryRegionId,
            isOperatorMode: requestScope.isOperatorMode,
            operatorModeLabel: requestScope.operatorModeLabel,
            sourceOfTruth: requestScope.sourceOfTruth,
            confidence: requestScope.confidence,
          }
        : null,
      accessDecision: accessDecision
        ? {
            status: accessDecision.status,
            reason: accessDecision.reason,
            title: accessDecision.title,
            body: accessDecision.body,
            requiredEntitlementScopes: accessDecision.requiredEntitlementScopes,
            missingEntitlementScopes: accessDecision.missingEntitlementScopes,
            requiredActions: accessDecision.requiredActions,
            missingActions: accessDecision.missingActions,
            contractStatus: accessDecision.contractStatus,
            billingStatus: accessDecision.billingStatus,
            entitlementStatus: accessDecision.entitlementStatus,
          }
        : null,
    });
    const dossierRuntime =
      record.selectedAction === "create_dossier"
        ? await ensurePersistedDossierRuntimeDraft(record.id)
            .then(() => getDossierRuntimeHandoffSummary(record.id))
        : null;

    return NextResponse.json({
      ok: true,
      record: {
        id: record.id,
        regionId: record.regionId,
        organizationId: record.organizationId,
        dossierId: record.dossierId,
        anlassraumId: record.anlassraumId,
        reviewState: record.reviewState,
        intakeClassification: record.intakeClassification,
      },
      dossierRuntime,
      requestScope,
      accessDecision,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "create_handoff_persist_failed";
    const status =
      message === "invalid_create_handoff_draft" || message === "invalid_create_handoff_action"
        ? 400
        : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
