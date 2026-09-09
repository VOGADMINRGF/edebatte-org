export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "@core/db/triMongo";
import { z } from "zod";
import { CREATE_MODE_VALUES, parseCreateMode, type CreateMode } from "@/features/create/intents";
import {
  evaluateCreateClaimSafety,
  type CreateClaimSafetyResult,
} from "@/features/create/safety/createClaimSafety";
import {
  evaluateCreateInputSafety,
  type CreateInputSafetyResult,
} from "@/features/create/safety/createInputSafety";
import {
  resolveRequestScopeContext,
  summarizeRequestScopeContext,
} from "@/lib/server/auth/requestScope";
import { getSessionUser } from "@/lib/server/auth/sessionUser";
import { enforceCreateMutationSecurity } from "@/features/create/createRouteSecurity";
import {
  CREATE_MAX_TEXT_LENGTH,
  CREATE_MAX_URL_LENGTH,
} from "@/features/create/createMutationSecurityContract";
import { buildCreateContributionLedgerEntry } from "@features/create/createContributionLedger";
import { createEditorialReviewRequest } from "@features/editorialReviewQueue";
import type {
  SourceSupport,
  TruthStatus,
  UserFacingVerificationLabel,
} from "@features/ai/e150/verificationContract";
import {
  buildCanonicalCreateDraftIdempotencyKey,
  CANONICAL_CREATE_DRAFT_KIND,
  getCreateContributionDraftForResumeRecord,
  saveUserScopedServerDraft,
} from "@/server/serverDrafts";

const DraftSaveSchema = z.object({
  draftId: z.string().max(160).optional(),
  packageId: z.string().min(1).max(160).optional(),
  text: z.string().max(CREATE_MAX_TEXT_LENGTH).optional(),
  textOriginal: z.string().max(CREATE_MAX_TEXT_LENGTH).optional(),
  textPrepared: z.string().max(CREATE_MAX_TEXT_LENGTH).optional(),
  evidenceInput: z.string().max(CREATE_MAX_TEXT_LENGTH).optional(),
  locale: z.string().max(10).optional(),
  source: z.string().max(160).optional(),
  createMode: z.preprocess(
    (value) => {
      if (typeof value !== "string") return value;
      const parsed = parseCreateMode(value);
      return parsed ?? value.toLowerCase().trim();
    },
    z.enum(CREATE_MODE_VALUES).optional(),
  ),
  anlassraumId: z.preprocess(
    (value) => {
      if (typeof value !== "string") return value;
      const normalized = value.trim().toLowerCase();
      return normalized || undefined;
    },
    z
      .string()
      .refine((value) => ObjectId.isValid(value), "invalid_anlassraum_id")
      .optional(),
  ),
  authorName: z.string().max(160).optional(),
  useCase: z.enum(["civic", "journalism", "agenda"]).optional(),
  sourceUrls: z.array(z.string().min(1).max(CREATE_MAX_URL_LENGTH)).max(20).optional(),
  uploadIds: z.array(z.string().min(1).max(160)).max(20).optional(),
  materialItems: z.array(z.record(z.string(), z.any())).max(20).optional(),
  analysis: z.unknown().optional(),
  manualReviewRequested: z.boolean().optional(),
});

function hasPiiOrDoxxingFindings(safety: CreateInputSafetyResult): boolean {
  return safety.findings.some(
    (finding) =>
      finding.kind === "email" ||
      finding.kind === "phone" ||
      finding.kind === "street_address" ||
      finding.kind === "postal_code" ||
      finding.kind === "doxxing",
  );
}

function withSafetyAnalysis(
  existing: unknown,
  safety: CreateInputSafetyResult,
  claimSafety: CreateClaimSafetyResult[],
): Record<string, unknown> {
  if (existing && typeof existing === "object" && !Array.isArray(existing)) {
    const existingRecord = existing as Record<string, unknown>;
    const existingSafety =
      existingRecord.safety && typeof existingRecord.safety === "object" && !Array.isArray(existingRecord.safety)
        ? (existingRecord.safety as Record<string, unknown>)
        : {};
    return {
      ...existingRecord,
      safety: {
        ...existingSafety,
        ...safety,
        claimSafety,
      },
    };
  }
  return {
    safety: {
      ...safety,
      claimSafety,
    },
  };
}

function withMaterialContext(
  existing: unknown,
  materialContext: {
    sourceUrls?: string[];
    uploadIds?: string[];
    materialItems?: Record<string, unknown>[];
  },
): unknown {
  const hasMaterialContext =
    (materialContext.sourceUrls?.length ?? 0) > 0 ||
    (materialContext.uploadIds?.length ?? 0) > 0 ||
    (materialContext.materialItems?.length ?? 0) > 0;
  if (!hasMaterialContext) return existing;

  const normalizedContext = {
    sourceUrls: materialContext.sourceUrls ?? [],
    uploadIds: materialContext.uploadIds ?? [],
    materialItems: materialContext.materialItems ?? [],
  };

  if (existing && typeof existing === "object" && !Array.isArray(existing)) {
    const existingRecord = existing as Record<string, unknown>;
    const existingInputContext =
      existingRecord.inputContext &&
      typeof existingRecord.inputContext === "object" &&
      !Array.isArray(existingRecord.inputContext)
        ? (existingRecord.inputContext as Record<string, unknown>)
        : {};
    return {
      ...existingRecord,
      inputContext: {
        ...existingInputContext,
        ...normalizedContext,
      },
    };
  }

  return {
    inputContext: normalizedContext,
  };
}

function withCreateContributionLedger(
  existing: unknown,
  input: {
    draftId: string;
    packageId?: string;
    userId: string;
    sourceText: string;
    locale: string;
    createdAt: Date;
    updatedAt: Date;
  },
): unknown {
  if (!existing || typeof existing !== "object" || Array.isArray(existing)) return existing;
  const existingRecord = existing as Record<string, unknown>;
  const intelligentFollowup =
    existingRecord.intelligentFollowup &&
    typeof existingRecord.intelligentFollowup === "object" &&
    !Array.isArray(existingRecord.intelligentFollowup)
      ? (existingRecord.intelligentFollowup as Record<string, unknown>)
      : null;
  const contributionPackage = intelligentFollowup?.contributionPackage;
  if (!contributionPackage || typeof contributionPackage !== "object" || Array.isArray(contributionPackage)) {
    return existing;
  }
  const previousLedger =
    existingRecord.createContributionLedger &&
    typeof existingRecord.createContributionLedger === "object" &&
    !Array.isArray(existingRecord.createContributionLedger)
      ? (existingRecord.createContributionLedger as Record<string, unknown>)
      : null;
  const packageId = String(
    (contributionPackage as Record<string, unknown>).id ??
      input.packageId ??
      previousLedger?.packageId ??
      input.draftId,
  );

  return {
    ...existingRecord,
    createContributionLedger: buildCreateContributionLedgerEntry({
      ledgerId: String(previousLedger?.ledgerId ?? input.draftId),
      packageId,
      userId: input.userId,
      sourceText: input.sourceText,
      createdAt: String(previousLedger?.createdAt ?? input.createdAt.toISOString()),
      updatedAt: input.updatedAt.toISOString(),
      locale: input.locale,
      contributionPackage: contributionPackage as any,
      draftSaveStatus: "server_saved",
    }),
  };
}

function buildClaimSafety(analysis: unknown, locale: string): CreateClaimSafetyResult[] {
  if (!analysis || typeof analysis !== "object" || Array.isArray(analysis)) return [];
  const claims = Array.isArray((analysis as Record<string, unknown>).claims)
    ? ((analysis as Record<string, unknown>).claims as unknown[])
    : [];
  return claims
    .map((claim) => {
      const text = typeof (claim as any)?.text === "string" ? (claim as any).text : "";
      if (!text.trim()) return null;
      return evaluateCreateClaimSafety({
        claimId:
          typeof (claim as any)?.id === "string" || typeof (claim as any)?.id === "number"
            ? String((claim as any).id)
            : null,
        text,
        locale,
        sourceLanguage: locale,
        contentLanguage: locale,
      });
    })
    .filter((entry): entry is CreateClaimSafetyResult => Boolean(entry));
}

function readManualReviewTruthMeta(analysis: unknown) {
  type ManualReviewTruthMeta = {
    truthStatus: TruthStatus;
    sourceSupport: SourceSupport;
    sourceStatus: string;
    reviewRecommended: boolean;
    verificationLabel: UserFacingVerificationLabel;
    analysisRunId: string | null;
  };
  if (!analysis || typeof analysis !== "object" || Array.isArray(analysis)) {
    return {
      truthStatus: "draft_analysis" as const,
      sourceSupport: "none" as const,
      sourceStatus: "Analyse-Entwurf",
      reviewRecommended: true,
      verificationLabel: "analysiert" as const,
      analysisRunId: null as string | null,
    } satisfies ManualReviewTruthMeta;
  }
  const record = analysis as Record<string, unknown>;
  const truthStatus: TruthStatus =
    record.truthStatus === "draft_analysis" ||
    record.truthStatus === "source_open" ||
    record.truthStatus === "source_grounded" ||
    record.truthStatus === "review_required" ||
    record.truthStatus === "factcheck_requested" ||
    record.truthStatus === "factcheck_passed" ||
    record.truthStatus === "sealed_verified"
      ? record.truthStatus
      : "draft_analysis";
  const sourceSupport: SourceSupport =
    record.sourceSupport === "none" ||
    record.sourceSupport === "open" ||
    record.sourceSupport === "inferred" ||
    record.sourceSupport === "partial" ||
    record.sourceSupport === "sourced" ||
    record.sourceSupport === "sealed"
      ? record.sourceSupport
      : "none";
  const verificationLabel: UserFacingVerificationLabel =
    record.verificationLabel === "analysiert" ||
    record.verificationLabel === "geprueft" ||
    record.verificationLabel === "verifiziert"
      ? record.verificationLabel
      : "analysiert";
  return {
    truthStatus,
    sourceSupport,
    sourceStatus:
      typeof record.sourceStatus === "string" && record.sourceStatus.trim().length > 0
        ? record.sourceStatus.trim()
        : "Analyse-Entwurf",
    reviewRecommended: typeof record.reviewRecommended === "boolean" ? record.reviewRecommended : true,
    verificationLabel,
    analysisRunId: typeof record.runId === "string" ? record.runId : null,
  } satisfies ManualReviewTruthMeta;
}

function resolveManualReviewReason(input: {
  safetyDecision: CreateInputSafetyResult["decision"];
  sourceSupport: SourceSupport;
}) {
  if (input.safetyDecision === "moderation_required") {
    return "moderation_required" as const;
  }
  if (input.sourceSupport === "none" || input.sourceSupport === "open") {
    return "source_open" as const;
  }
  return "user_requested_review" as const;
}

async function createEditorialReviewRequestFromContributionSave(input: {
  draftId: string;
  userId: string;
  originalText: string;
  safety: CreateInputSafetyResult;
  truthMeta: ReturnType<typeof readManualReviewTruthMeta>;
}) {
  const result = await createEditorialReviewRequest({
    sourceType: "create_analysis",
    sourceId: input.draftId,
    userId: input.userId,
    originalText: input.originalText,
    analysisRunId: input.truthMeta.analysisRunId,
    truthStatus: input.truthMeta.truthStatus,
    sourceSupport: input.truthMeta.sourceSupport,
    sourceStatus: input.truthMeta.sourceStatus,
    reviewRecommended: input.truthMeta.reviewRecommended,
    verificationLabel: input.truthMeta.verificationLabel,
    moderationRequired: input.safety.decision === "moderation_required",
    reason: resolveManualReviewReason({
      safetyDecision: input.safety.decision,
      sourceSupport: input.truthMeta.sourceSupport,
    }),
  });
  return result.reviewRequest;
}

async function resolveExistingCreateDraftForSave(input: {
  draftId: string | undefined;
  userId: string;
}) {
  const draftId = String(input.draftId ?? "").trim();
  if (!draftId) {
    return {
      draft: null,
      requestedExistingDraft: false,
    };
  }

  const draft = ObjectId.isValid(draftId)
    ? await getCreateContributionDraftForResumeRecord(draftId, input.userId).catch(
        () => null,
      )
    : null;
  return {
    draft,
    requestedExistingDraft: true,
  };
}

export async function POST(req: NextRequest) {
  const requestStartedAt = Date.now();
  const sessionUser = await getSessionUser(req).catch(() => null);
  const userId = sessionUser?._id?.toHexString?.() ?? null;
  if (!sessionUser || !sessionUser.sessionValid || !userId) {
    return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });
  }
  const securityFailure = await enforceCreateMutationSecurity({
    req,
    scope: "create_save",
    actorKey: `user:${userId}`,
  });
  if (securityFailure) return securityFailure;
  const accessMs = Date.now() - requestStartedAt;

  let body: z.infer<typeof DraftSaveSchema>;
  try {
    body = DraftSaveSchema.parse(await req.json());
  } catch (err: any) {
    const issue = err?.issues?.[0];
    const message =
      issue?.path?.[0] === "createMode"
        ? "invalid_create_mode"
        : issue?.path?.[0] === "anlassraumId"
          ? "invalid_anlassraum_id"
          : issue?.message ?? "invalid_body";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }

  const now = new Date();
  const existingDraftState = await resolveExistingCreateDraftForSave({
    draftId: body.draftId,
    userId,
  });
  if (
    existingDraftState.requestedExistingDraft &&
    (!existingDraftState.draft ||
      existingDraftState.draft.storage !== "drafts" ||
      existingDraftState.draft.status !== "draft" ||
      existingDraftState.draft.userId !== userId)
  ) {
    return NextResponse.json(
      { ok: false, error: "CREATE_REQUEST_NOT_ALLOWED" },
      { status: 403 },
    );
  }
  const existingDraft = existingDraftState.draft;
  const contextStartedAt = Date.now();
  const requestScope = summarizeRequestScopeContext(
    await resolveRequestScopeContext(req).catch(() => null),
  );
  const contextMs = Date.now() - contextStartedAt;
  const normalizedText =
    body.textPrepared?.trim() ||
    body.textOriginal?.trim() ||
    body.text?.trim() ||
    existingDraft?.text?.trim() ||
    "";
  const textOriginal =
    body.textOriginal?.trim() ||
    body.text?.trim() ||
    existingDraft?.textOriginal?.trim() ||
    normalizedText;
  const textPrepared =
    body.textPrepared?.trim() ||
    body.text?.trim() ||
    existingDraft?.textPrepared?.trim() ||
    normalizedText;
  const normalizedCreateMode: CreateMode =
    body.createMode ??
    existingDraft?.createMode ??
    ((body.source ?? existingDraft?.source) === "statement_new" ? "manual" : "source");
  const normalizedAnlassraumId = body.anlassraumId
    ? new ObjectId(body.anlassraumId).toHexString()
    : (existingDraft?.anlassraumId ?? null);
  const normalizedLocale = body.locale ?? existingDraft?.locale ?? "de";
  const normalizedSource = body.source ?? existingDraft?.source ?? null;
  const normalizedAuthorName = body.authorName ?? existingDraft?.authorName ?? null;
  const normalizedUseCase = body.useCase ?? existingDraft?.useCase ?? null;
  const normalizedEvidenceInput = body.evidenceInput ?? existingDraft?.evidenceInput ?? null;

  if (!normalizedText) {
    return NextResponse.json({ ok: false, error: "empty_text" }, { status: 422 });
  }

  const safety = evaluateCreateInputSafety({
    text: normalizedText,
    locale: normalizedLocale,
    routeStage: "save",
    draftId: body.draftId ?? null,
  });

  if (safety.decision === "blocked") {
    return NextResponse.json(
      { ok: false, error: "create_input_blocked", safety },
      { status: 422 },
    );
  }

  const textToPersist = hasPiiOrDoxxingFindings(safety) ? safety.redactedText : normalizedText;
  const analysisWithMaterial = withMaterialContext(body.analysis ?? existingDraft?.analysis, {
    sourceUrls: body.sourceUrls,
    uploadIds: body.uploadIds,
    materialItems: body.materialItems as Record<string, unknown>[] | undefined,
  });
  const claimSafety = buildClaimSafety(analysisWithMaterial, normalizedLocale);
  const baseAnalysisWithSafety = withSafetyAnalysis(analysisWithMaterial, safety, claimSafety);
  const manualReviewTruthMeta = readManualReviewTruthMeta(baseAnalysisWithSafety);
  const packageId = body.packageId?.trim() || undefined;
  const idempotencyKey = buildCanonicalCreateDraftIdempotencyKey({
    userId,
    source: normalizedSource,
    text: textToPersist,
    textOriginal,
    textPrepared,
    evidenceInput: normalizedEvidenceInput,
    locale: normalizedLocale,
    createMode: normalizedCreateMode,
    anlassraumId: normalizedAnlassraumId,
    authorName: normalizedAuthorName,
    useCase: normalizedUseCase,
    packageId,
    sourceUrls: body.sourceUrls,
    uploadIds: body.uploadIds,
    materialItems: body.materialItems as unknown[] | undefined,
    analysis: body.analysis ?? null,
    manualReviewRequested: body.manualReviewRequested === true,
  });

  const saveStartedAt = Date.now();
  const initialSave = await saveUserScopedServerDraft({
    userId,
    route: "/api/create/save",
    kind: CANONICAL_CREATE_DRAFT_KIND,
    draftId: body.draftId,
    locale: normalizedLocale,
    source: normalizedSource,
    text: textToPersist,
    textOriginal,
    textPrepared,
    evidenceInput: normalizedEvidenceInput,
    createMode: normalizedCreateMode,
    anlassraumId: normalizedAnlassraumId,
    authorName: normalizedAuthorName,
    useCase: normalizedUseCase,
    analysis: baseAnalysisWithSafety,
    packageId,
    idempotencyKey,
  });

  if (initialSave.ok === false) {
    const status =
      initialSave.error === "draft_not_found"
        ? 404
        : initialSave.error === "draft_finalized"
          ? 409
          : initialSave.error === "idempotency_conflict"
          ? 409
          : 400;
    const error =
      initialSave.error === "draft_not_found"
        ? "draft_not_found"
        : initialSave.error === "draft_finalized"
          ? "draft_finalized"
          : initialSave.error === "idempotency_conflict"
            ? "idempotency_conflict"
          : "invalid_draft";
    return NextResponse.json({ ok: false, error }, { status });
  }

  const analysisWithLedger = withCreateContributionLedger(baseAnalysisWithSafety, {
    draftId: initialSave.draftId,
    packageId,
    userId,
    sourceText: textToPersist,
    locale: normalizedLocale,
    createdAt: initialSave.createdAt,
    updatedAt: initialSave.updatedAt,
  });

  let finalSave = initialSave;
  if (analysisWithLedger !== baseAnalysisWithSafety) {
    const ledgerSave = await saveUserScopedServerDraft({
      userId,
      route: "/api/create/save",
      kind: CANONICAL_CREATE_DRAFT_KIND,
      draftId: initialSave.draftId,
      locale: normalizedLocale,
      source: normalizedSource,
      text: textToPersist,
      textOriginal,
      textPrepared,
      evidenceInput: normalizedEvidenceInput,
      createMode: normalizedCreateMode,
      anlassraumId: normalizedAnlassraumId,
      authorName: normalizedAuthorName,
      useCase: normalizedUseCase,
      analysis: analysisWithLedger,
      packageId,
      idempotencyKey,
    });
    if (ledgerSave.ok === false) {
      const status =
        ledgerSave.error === "draft_not_found"
          ? 404
          : ledgerSave.error === "draft_finalized"
            ? 409
            : ledgerSave.error === "idempotency_conflict"
            ? 409
            : 400;
      const error =
        ledgerSave.error === "draft_not_found"
          ? "draft_not_found"
          : ledgerSave.error === "draft_finalized"
            ? "draft_finalized"
            : ledgerSave.error === "idempotency_conflict"
              ? "idempotency_conflict"
            : "invalid_draft";
      return NextResponse.json({ ok: false, error }, { status });
    }
    finalSave = ledgerSave;
  }

  const responseBody: Record<string, unknown> = {
    ok: true,
    draftId: finalSave.draftId,
    createMode: normalizedCreateMode,
    anlassraumId: normalizedAnlassraumId,
    updatedAt: finalSave.updatedAt.toISOString(),
    safety,
    requestScope,
    timings: {
      accessMs,
      contextMs,
      saveMs: Date.now() - saveStartedAt,
      totalMs: Date.now() - requestStartedAt,
    },
  };

  if (body.manualReviewRequested) {
    responseBody.reviewRequest = await createEditorialReviewRequestFromContributionSave({
      draftId: finalSave.draftId,
      userId,
      originalText: textToPersist,
      safety,
      truthMeta: manualReviewTruthMeta,
    });
  }

  return NextResponse.json(responseBody);
}
