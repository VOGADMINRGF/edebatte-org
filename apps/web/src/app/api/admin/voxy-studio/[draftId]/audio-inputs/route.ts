export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import { getVoxyLocalCompositionAudioInputRepository } from "@/features/voxyVideo/localCompositionAudioAssetStore";
import { getVoxyStudioDraftRepository } from "@/features/voxyVideo/studioDraftStore";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ draftId: string }> },
) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  try {
    const { draftId: rawDraftId } = await context.params;
    const draftId = decodeURIComponent(String(rawDraftId ?? "").trim());
    const studioRepository = getVoxyStudioDraftRepository();
    const draft = await studioRepository.getDraft(draftId);
    if (!draft) {
      return NextResponse.json({ ok: false, error: "voxy_studio_draft_missing" }, { status: 404 });
    }

    const audioRepository = getVoxyLocalCompositionAudioInputRepository();
    const persistence = audioRepository.getPersistenceState();
    const inputs = await audioRepository.listForBinding({
      artifactId: draft.draftId,
      briefingId: draft.briefingId,
      scriptVersion: `story-r${draft.storyPlan.revision}`,
      locale: draft.storyPlan.outputLanguage,
      limit: 20,
    });

    return NextResponse.json({
      ok: true,
      draftId: draft.draftId,
      revision: draft.revision,
      storyPlanRevision: draft.storyPlan.revision,
      persistence,
      usableForProduction:
        persistence.mode === "persistent_primary" &&
        persistence.productionTruth === true &&
        persistence.restartReconstructable === true &&
        persistence.deploymentReconstructable === true,
      inputs: inputs.map((input) => ({
        assetId: input.assetId,
        storyPlanId: input.storyPlanId,
        storyPlanRevision: input.storyPlanRevision,
        locale: input.locale,
        voiceProfileId: input.voiceProfileId,
        voiceUsageApproved: input.voiceUsageApproved,
        fallbackLocale: input.fallbackLocale,
        sha256: input.sha256,
        durationMs: input.durationMs,
        timelineVersion: input.timelineVersion,
        motionEnvelopeReady: Boolean(input.motionEnvelope),
        chapterTimings: input.chapterTimings.map((timing) => ({ ...timing })),
        captionCues: input.captionCues.map((cue) => ({ ...cue })),
        approvalRef: input.approvalRef,
        approvedByUserId: input.approvedByUserId,
        approvedAt: input.approvedAt,
        reviewRequired: input.reviewRequired,
        externalProviderUsed: input.externalProviderUsed,
        autoRender: input.autoRender,
        autoPublish: input.autoPublish,
      })),
      exposesStoragePath: false,
      exposesAudioBytes: false,
      exposesMotionEnvelope: false,
      allowsFreeFilePath: false,
      autoRender: false,
      autoPublish: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "voxy_studio_audio_inputs_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
