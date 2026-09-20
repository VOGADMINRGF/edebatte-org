import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { stableHash } from "@core/utils/hash";
import {
  resolveRequestScopeContext,
  summarizeRequestScopeContext,
} from "@/lib/server/auth/requestScope";
import { getSessionUser } from "@/lib/server/auth/sessionUser";
import {
  buildCreateHandoffDraft,
  type CreateHandoffAction,
  type CreateHandoffDraft,
} from "@/features/create/createHandoff";
import {
  resolveCreateProductionAccessDecision,
  type CreateProductionAccessDecision,
} from "@/features/create/createProductionAccess";
import { classifyCreateHandoffDraft } from "@/features/create/inputClassification";
import {
  persistCreateHandoffForReview,
  resolvePersistedCreateHandoffContext,
} from "@/features/create/persistedHandoffReviewQueue";
import {
  ensurePersistedDossierRuntimeDraft,
  getDossierRuntimeHandoffSummary,
} from "@/features/create/dossierRuntimeServer";
import { validateCreateJurisdictionConfirmation } from "@/features/create/createCitizenIntakeContextServer";
import { enforceCreateMutationSecurity } from "@/features/create/createRouteSecurity";
import { evaluatePublicQuestionGeneralization } from "@/features/create/safety/publicQuestionGeneralization";
import { bindQuestionGuardToCurrentContract } from "@/features/create/safety/questionGuardReviewPersistence";
import { resolveCanonicalCreateHandoffDraftBinding } from "@/server/createHandoffDraftBinding";
import {
  buildOrganizationDashboardReadModel,
  canEditOrganizationResource,
  canViewRegionResource,
  regionScopeFromRegionAccessContext,
} from "@features/region";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreateHandoffActionSchema = z.enum([
  "submit_draft",
  "append_to_dossier",
  "prepare_anlassraum",
  "prepare_participation_space",
  "create_dossier",
  "request_factcheck",
  "prepare_vote",
  "request_review",
]);

const CreateHandoffBodySchema = z
  .object({
    draftId: z.string().trim().min(1).max(160).optional(),
    draft: z
      .object({
        id: z.string().trim().min(1).max(240),
        sourceText: z.string().trim().min(1).max(64 * 1024),
        selectedAction: CreateHandoffActionSchema,
        createdAt: z.string().datetime().optional(),
      })
      .strict(),
    dossierId: z.string().trim().min(1).max(240).nullable().optional(),
    anlassraumId: z.string().trim().min(1).max(240).nullable().optional(),
  })
  .strict();

function unauthorized() {
  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}

function denied(error: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: false, error, ...extra }, { status: 403 });
}

function sessionUserId(sessionUser: unknown): string | null {
  if (!sessionUser || typeof sessionUser !== "object") return null;
  const id = (sessionUser as { _id?: { toHexString?: () => string } })._id;
  return id?.toHexString?.() ?? null;
}

function sessionProfileRegion(sessionUser: unknown): string | null {
  if (!sessionUser || typeof sessionUser !== "object") return null;
  const profile = (sessionUser as Record<string, unknown>).profile;
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) return null;
  const publicLocation = (profile as Record<string, unknown>).publicLocation;
  if (!publicLocation || typeof publicLocation !== "object" || Array.isArray(publicLocation)) {
    return null;
  }
  const location = publicLocation as Record<string, unknown>;
  return String(location.city ?? "").trim() || String(location.region ?? "").trim() || null;
}

function deterministicHandoffId(input: {
  userId: string;
  canonicalDraftId: string;
  payloadHash: string;
  selectedAction: CreateHandoffAction;
}) {
  return `create-handoff-${stableHash({
    scope: "create_c9_handoff",
    userId: input.userId,
    canonicalDraftId: input.canonicalDraftId,
    payloadHash: input.payloadHash,
    selectedAction: input.selectedAction,
  }).slice(0, 32)}`;
}

function buildQuestionGuardBindings(draft: CreateHandoffDraft) {
  return draft.openQuestions.map((question) => {
    const guard = bindQuestionGuardToCurrentContract(
      evaluatePublicQuestionGeneralization({
        originalInput: draft.sourceText,
        candidatePublicQuestion: question.question,
        actorContexts: [],
        actorExtraction: {
          status: "unverified",
          source: "create_analysis",
          independentFromCandidateProvider: false,
          evidenceRefs: [],
        },
      }),
    );
    return {
      questionId: question.id,
      releaseState: guard.releaseState,
      outcome: guard.outcome,
      evidenceRefs: guard.evidenceRefs.slice(0, 20),
    };
  });
}

function revalidateJurisdiction(
  draft: CreateHandoffDraft,
  sessionUser: unknown,
): CreateHandoffDraft {
  const candidateKey = draft.jurisdictionConfirmation?.candidateKey?.trim();
  if (!candidateKey) return draft;
  const validated = validateCreateJurisdictionConfirmation({
    sourceText: draft.sourceText,
    candidateKey,
    locale: "de",
    profileRegion: sessionProfileRegion(sessionUser),
  });
  if (!validated) throw new Error("invalid_jurisdiction_confirmation");
  const currentKey = validated.jurisdictionConfirmation.candidateKey ?? "";
  const candidate = validated.jurisdictionCandidates.find(
    (entry) => `${entry.level}:${entry.label.trim().toLocaleLowerCase("de")}` === currentKey,
  );
  if (!candidate) throw new Error("invalid_jurisdiction_confirmation");
  return {
    ...draft,
    jurisdictionConfirmation: {
      candidateKey: currentKey,
      candidate: { ...candidate },
      regionId: validated.placeResolution.selectedCandidate?.id ?? null,
      regionLabel: validated.selectedRegionLabel,
      serverValidated: true,
    },
  };
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser(req).catch(() => null);
  const authenticatedUserId = sessionUser?.sessionValid ? sessionUserId(sessionUser) : null;
  if (!authenticatedUserId) return unauthorized();

  const securityFailure = await enforceCreateMutationSecurity({
    req,
    scope: "create_handoff_persistence",
    actorKey: `user:${authenticatedUserId}`,
  });
  if (securityFailure) return securityFailure;

  try {
    const body = CreateHandoffBodySchema.parse(await req.json());
    const bindingResult = await resolveCanonicalCreateHandoffDraftBinding({
      userId: authenticatedUserId,
      requestedDraftId: body.draftId ?? null,
      sourceText: body.draft.sourceText,
    });
    if (bindingResult.ok === false) {
      const status = bindingResult.error === "draft_binding_ambiguous" ? 409 : 400;
      return NextResponse.json(
        { ok: false, error: bindingResult.error },
        { status },
      );
    }
    const binding = bindingResult.binding;
    const handoffId = deterministicHandoffId({
      userId: authenticatedUserId,
      canonicalDraftId: binding.draftId,
      payloadHash: binding.payloadHash,
      selectedAction: body.draft.selectedAction,
    });
    let draft = buildCreateHandoffDraft({
      result: binding.followup,
      selectedAction: body.draft.selectedAction,
      id: handoffId,
      createdAt: binding.createdAt,
    });
    draft = revalidateJurisdiction(draft, sessionUser);
    const questionGuardBindings = buildQuestionGuardBindings(draft);

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
    if (!scopeContext || !userId || userId !== authenticatedUserId) return unauthorized();
    const accessContext = scopeContext.regionAccess;
    const scope = regionScopeFromRegionAccessContext({ accessContext });
    if (
      !scopeContext.isOperatorMode &&
      ((context.regionId &&
        !canViewRegionResource(scope, {
          regionId: context.regionId,
          organizationId: context.organizationId,
        })) ||
        (context.organizationId &&
          !canEditOrganizationResource(scope, {
            organizationId: context.organizationId,
          })))
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
      context.regionId ?? requestScope?.primaryRegionId ?? scopeContext.regionIds[0] ?? null;
    const fallbackOrganizationId =
      context.organizationId ??
      requestScope?.organizationId ??
      scopeContext.regionAccess.organization.primaryOrganizationId ??
      null;
    const record = await persistCreateHandoffForReview({
      draft,
      createdByUserId: userId,
      canonicalDraftId: binding.draftId,
      canonicalDraftBindingHash: binding.bindingHash,
      canonicalDraftPayloadHash: binding.payloadHash,
      canonicalSourceEvidenceRefs: binding.sourceEvidenceRefs,
      questionGuardBindings,
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
        ? await ensurePersistedDossierRuntimeDraft(record.id).then(() =>
            getDossierRuntimeHandoffSummary(record.id),
          )
        : null;

    return NextResponse.json({
      ok: true,
      record: {
        id: record.id,
        canonicalDraftId: record.canonicalDraftId ?? null,
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
    const status = message === "create_handoff_identity_conflict" ? 409 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
