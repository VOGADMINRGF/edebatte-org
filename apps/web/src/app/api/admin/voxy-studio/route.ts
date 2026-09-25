export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { buildVoxyEditorialScriptVersion } from "@/features/voxyVideo/editorialLanguageVariant";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SUPPORTED_LOCALES } from "@/config/locales";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import { validateVoxyEditorialStoryPlan } from "@/features/voxyVideo/editorialStoryPlan";
import { getVoxyLocalCompositionAudioInputRepository } from "@/features/voxyVideo/localCompositionAudioAssetStore";
import { VOXY_VIDEO_FORMATS } from "@/features/voxyVideo/modernCharacterContracts";
import {
  createFailClosedDossierStudioEvidenceAuthority,
  loadFailClosedDossierStudioEvidenceContext,
  loadVoxyStudioDossierEvidenceReviewState,
} from "@/features/voxyVideo/studioDossierEvidenceAuthority";
import {
  buildVoxyStudioEditorialReviewItemId,
  buildVoxyStudioEvidenceBoundRenderReviewGateId,
  createDefaultVoxyStudioServiceDependencies,
  createVoxyStudioDraft,
} from "@/features/voxyVideo/studioDraftService";
import { VOXY_STUDIO_SAFE_ZONE_PROFILES } from "@/features/voxyVideo/studioDraft";
import { getVoxyStudioDraftRepository } from "@/features/voxyVideo/studioDraftStore";
import {
  evaluateVoxyStudioAllFormatLayoutSafety,
  mergeVoxyStudioAllFormatLayoutSafetyIntoValidation,
} from "@/features/voxyVideo/studioLayoutSafety";
import { buildVoxyStudioLocaleReviewMatrices } from "@/features/voxyVideo/studioLocaleReviewMatrix";
import { buildVoxyStudioProductionContext } from "@/features/voxyVideo/studioProductionContext";
import { buildVoxyStudioStoryPlanFromDossier } from "@/features/voxyVideo/studioStoryPlanBuilder";
import { getReviewQueueOperationsRepository } from "@features/reviewQueueOperations";
import { getDossierStudioWorkspaceRepo } from "@features/dossier/server/studioPersistence";

const CreateSchema = z
  .object({
    clientRequestId: z.string().trim().min(1).max(160),
    dossierId: z.string().trim().min(1).max(160),
    briefingId: z.string().trim().min(1).max(160),
    title: z.string().trim().min(1).max(240),
    locale: z.enum(SUPPORTED_LOCALES),
    selectedFormat: z.enum(VOXY_VIDEO_FORMATS),
    safeZoneProfile: z.enum(VOXY_STUDIO_SAFE_ZONE_PROFILES),
  })
  .strict();

function parseLimit(req: NextRequest) {
  const raw = Number(req.nextUrl.searchParams.get("limit") ?? "30");
  return Number.isFinite(raw) ? Math.max(1, Math.min(100, Math.trunc(raw))) : 30;
}

function studioRuntimeState() {
  return {
    editorialLongformRenderEnabled: true,
    reason: "manual_persistent_audio_bound_editorial_v1_queue_available",
    manualQueueOnly: true,
    requiresRegisteredAudioAsset: true,
    requiresPersistentPrimary: true,
    humanPreviewReviewRequiredAfterRender: true,
    autoRender: false as const,
    autoPublish: false as const,
  };
}

export async function GET(req: NextRequest) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const repository = getVoxyStudioDraftRepository();
  const reviewRepository = getReviewQueueOperationsRepository();
  const audioRepository = getVoxyLocalCompositionAudioInputRepository();
  const workspaceRepository = getDossierStudioWorkspaceRepo();
  const dossierId = req.nextUrl.searchParams.get("dossierId")?.trim() || null;
  const drafts = await repository.listDrafts({ dossierId, limit: parseLimit(req) });

  const [items, audioEntries] = await Promise.all([
    Promise.all(
      drafts.map(async (draft) => {
        const [evidence, evidenceReview, workspace] = await Promise.all([
          loadFailClosedDossierStudioEvidenceContext(draft.dossierId),
          draft.dossierId
            ? loadVoxyStudioDossierEvidenceReviewState(draft.dossierId)
            : Promise.resolve(null),
          draft.dossierId
            ? workspaceRepository.getDossierStudioWorkspace(draft.dossierId)
            : Promise.resolve(null),
        ]);
        const layoutSafety = evaluateVoxyStudioAllFormatLayoutSafety(draft);
        const validation = mergeVoxyStudioAllFormatLayoutSafetyIntoValidation({
          draft,
          validation: validateVoxyEditorialStoryPlan(draft.storyPlan, evidence),
        });
        const reviewItemId = buildVoxyStudioEditorialReviewItemId(
          draft,
          evidence.sourcePack.sourcePackId,
        );
        const decisionGateId = buildVoxyStudioEvidenceBoundRenderReviewGateId(
          draft,
          evidence.sourcePack.sourcePackId,
        );
        const [reviewRecord, reviewAuditEvents] = await Promise.all([
          reviewRepository.getRecord(reviewItemId),
          reviewRepository.listAuditEvents(reviewItemId),
        ]);
        return {
          draft,
          validation,
          layoutSafety,
          evidenceReview,
          productionContext: buildVoxyStudioProductionContext(workspace),
          evidenceSourcePackId: evidence.sourcePack.sourcePackId,
          reviewItemId,
          decisionGateId,
          approvalEvidenceStale:
            draft.status === "approved_for_render" &&
            draft.renderApproval?.decisionGateId !== decisionGateId,
          reviewRecord,
          reviewAuditEvents: reviewAuditEvents.slice(0, 10),
        };
      }),
    ),
    Promise.all(
      drafts.map(async (draft) => [
        draft.draftId,
        await audioRepository.listForBinding({
          artifactId: draft.draftId,
          briefingId: draft.briefingId,
          scriptVersion: buildVoxyEditorialScriptVersion(draft.storyPlan),
          locale: draft.storyPlan.outputLanguage.toLowerCase(),
          limit: 20,
        }),
      ] as const),
    ),
  ]);
  const audioInputsByDraftId = Object.fromEntries(audioEntries);
  const approvalCurrentByDraftId = Object.fromEntries(
    items.map((item) => [
      item.draft.draftId,
      item.evidenceReview?.approved === true &&
        item.draft.renderApproval?.decisionGateId === item.decisionGateId,
    ]),
  );
  const localeReviewMatrices = buildVoxyStudioLocaleReviewMatrices({
    drafts,
    audioInputsByDraftId,
    approvalCurrentByDraftId,
  });

  return NextResponse.json({
    ok: true,
    items,
    localeReviewMatrices,
    persistence: {
      drafts: repository.getPersistenceState(),
      editorialReview: reviewRepository.getPersistenceState(),
      audioInputs: audioRepository.getPersistenceState(),
    },
    runtime: studioRuntimeState(),
  });
}

export async function POST(req: NextRequest) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;
  const parsed = CreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_voxy_studio_create_command" },
      { status: 400 },
    );
  }

  const userId = gate?._id?.toHexString?.() ?? "";
  if (!userId) {
    return NextResponse.json({ ok: false, error: "admin_user_id_missing" }, { status: 400 });
  }

  try {
    const evidence = await loadFailClosedDossierStudioEvidenceContext(parsed.data.dossierId);
    const storyPlan = buildVoxyStudioStoryPlanFromDossier({
      dossierId: parsed.data.dossierId,
      briefingId: parsed.data.briefingId,
      title: parsed.data.title,
      locale: parsed.data.locale,
      evidence,
    });
    const deps = createDefaultVoxyStudioServiceDependencies({
      evidenceAuthority: createFailClosedDossierStudioEvidenceAuthority(),
    });
    const draft = await createVoxyStudioDraft(
      {
        clientRequestId: parsed.data.clientRequestId,
        sourceKind: "dossier",
        dossierId: parsed.data.dossierId,
        briefingId: parsed.data.briefingId,
        title: parsed.data.title,
        storyPlan,
        selectedFormat: parsed.data.selectedFormat,
        safeZoneProfile: parsed.data.safeZoneProfile,
        createdByUserId: userId,
      },
      deps,
    );
    const layoutSafety = evaluateVoxyStudioAllFormatLayoutSafety(draft);
    const validation = mergeVoxyStudioAllFormatLayoutSafetyIntoValidation({
      draft,
      validation: validateVoxyEditorialStoryPlan(draft.storyPlan, evidence),
    });
    const evidenceReview = await loadVoxyStudioDossierEvidenceReviewState(parsed.data.dossierId);
    const reviewItemId = buildVoxyStudioEditorialReviewItemId(
      draft,
      evidence.sourcePack.sourcePackId,
    );
    const decisionGateId = buildVoxyStudioEvidenceBoundRenderReviewGateId(
      draft,
      evidence.sourcePack.sourcePackId,
    );

    return NextResponse.json(
      {
        ok: true,
        draft,
        validation,
        layoutSafety,
        evidenceReview,
        evidenceSourcePackId: evidence.sourcePack.sourcePackId,
        reviewItemId,
        decisionGateId,
        renderApprovalBlocked: !validation.renderEligible,
        runtime: studioRuntimeState(),
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "voxy_studio_create_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
