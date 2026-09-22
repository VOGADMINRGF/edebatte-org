export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";

import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import { resolveVoxyEditorialAudioEnvelopeFrameAmplitude } from "@/features/voxyVideo/editorialAudioMotion.server";
import {
  loadVoxyEditorialCompositionEmbeddedAssets,
  resolveVoxyEditorialCompositionRepositoryRoot,
} from "@/features/voxyVideo/editorialCompositionAssets.server";
import { renderVoxyEditorialCompositionFrameHtml } from "@/features/voxyVideo/editorialCompositionHtml";
import { getVoxyLocalCompositionAudioInputRepository } from "@/features/voxyVideo/localCompositionAudioAssetStore";
import { VOXY_VIDEO_FORMATS } from "@/features/voxyVideo/modernCharacterContracts";
import {
  createFailClosedDossierStudioEvidenceAuthority,
  loadVoxyStudioDossierEvidenceReviewState,
} from "@/features/voxyVideo/studioDossierEvidenceAuthority";
import { getVoxyStudioDraftRepository } from "@/features/voxyVideo/studioDraftStore";
import { buildVoxyStudioEditorialTimelineSnapshot } from "@/features/voxyVideo/studioRenderHandoff";

const QuerySchema = z
  .object({
    audioAssetId: z.string().trim().min(1).max(160),
    format: z.enum(VOXY_VIDEO_FORMATS),
    atMs: z.coerce.number().int().nonnegative().max(1_800_000).default(0),
  })
  .strict();

const FPS = 24;

function htmlHeaders() {
  return new Headers({
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": [
      "default-src 'none'",
      "img-src data:",
      "style-src 'unsafe-inline'",
      "font-src data:",
      "media-src 'none'",
      "connect-src 'none'",
      "script-src 'none'",
      "object-src 'none'",
      "base-uri 'none'",
      "form-action 'none'",
      "frame-ancestors 'self'",
    ].join("; "),
  });
}

function assertLocalOnlyPreviewHtml(html: string) {
  if (/<(?:script|iframe|object|embed)\b/i.test(html)) {
    throw new Error("voxy_studio_frame_preview_active_content_forbidden");
  }
  if (/\b(?:src|href)\s*=\s*["']https?:/i.test(html)) {
    throw new Error("voxy_studio_frame_preview_external_resource_forbidden");
  }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ draftId: string }> },
) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const query = QuerySchema.safeParse({
    audioAssetId: req.nextUrl.searchParams.get("audioAssetId"),
    format: req.nextUrl.searchParams.get("format"),
    atMs: req.nextUrl.searchParams.get("atMs") ?? 0,
  });
  if (!query.success) {
    return new Response("Invalid preview request", { status: 400 });
  }

  try {
    const { draftId: rawDraftId } = await context.params;
    const draftId = decodeURIComponent(String(rawDraftId ?? "").trim());
    const draftRepository = getVoxyStudioDraftRepository();
    const draft = await draftRepository.getDraft(draftId);
    if (!draft) return new Response("Draft not found", { status: 404 });
    if (!draft.dossierId) {
      return new Response("Evidence dossier binding missing", { status: 409 });
    }

    const evidenceAuthority = createFailClosedDossierStudioEvidenceAuthority();
    const [evidence, evidenceReview] = await Promise.all([
      evidenceAuthority.resolveEvidenceContext(draft),
      loadVoxyStudioDossierEvidenceReviewState(draft.dossierId),
    ]);
    if (!evidenceReview.approved) {
      return new Response("Evidence snapshot not approved", { status: 409 });
    }
    const expectedSourcePackId = `voxy-studio-dossier:${draft.dossierId}:${evidenceReview.snapshot.fingerprint.slice(0, 40)}`;
    if (evidence.sourcePack.sourcePackId !== expectedSourcePackId) {
      return new Response("Evidence snapshot binding mismatch", { status: 409 });
    }

    const audioRepository = getVoxyLocalCompositionAudioInputRepository();
    const audioPersistence = audioRepository.getPersistenceState();
    if (
      audioPersistence.mode !== "persistent_primary" ||
      audioPersistence.productionTruth !== true ||
      audioPersistence.restartReconstructable !== true ||
      audioPersistence.deploymentReconstructable !== true
    ) {
      return new Response("Audio registry unavailable", { status: 503 });
    }
    const audioInput = await audioRepository.getByAssetId(query.data.audioAssetId);
    if (!audioInput) return new Response("Audio input not found", { status: 404 });

    const snapshot = buildVoxyStudioEditorialTimelineSnapshot({
      draft,
      audioInput,
      evidenceSourcePackId: evidence.sourcePack.sourcePackId,
      evidenceSources: evidenceReview.snapshot.sources,
    });
    if (query.data.atMs >= snapshot.timeline.durationMs) {
      return new Response("Preview time outside timeline", { status: 416 });
    }
    if (!audioInput.motionEnvelope) {
      return new Response("Audio motion envelope missing", { status: 409 });
    }

    const frameIndex = Math.floor((query.data.atMs * FPS) / 1_000);
    const amplitude = resolveVoxyEditorialAudioEnvelopeFrameAmplitude({
      envelope: audioInput.motionEnvelope,
      sourceSha256: audioInput.sha256,
      durationMs: audioInput.durationMs,
      frameIndex,
    });

    const repositoryRoot = await resolveVoxyEditorialCompositionRepositoryRoot();
    const assets = await loadVoxyEditorialCompositionEmbeddedAssets(repositoryRoot);
    const html = renderVoxyEditorialCompositionFrameHtml({
      plan: snapshot.renderStoryPlan,
      timeline: snapshot.timeline,
      captions: snapshot.captionCues,
      assets,
      format: query.data.format,
      frameIndex,
      amplitude,
    });
    assertLocalOnlyPreviewHtml(html);

    const headers = htmlHeaders();
    headers.set("X-Voxy-Preview-Frame", String(frameIndex));
    headers.set("X-Voxy-Preview-Audio-Amplitude", String(amplitude));
    headers.set("X-Voxy-Preview-Audio-Sha256", audioInput.sha256);
    headers.set("X-Voxy-Preview-Duration-Ms", String(snapshot.timeline.durationMs));
    headers.set("X-Voxy-Preview-Draft-Revision", String(draft.revision));
    headers.set("X-Voxy-Preview-Story-Revision", String(draft.storyPlan.revision));
    return new Response(html, { status: 200, headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "voxy_studio_frame_preview_failed";
    if (
      message.includes("missing") ||
      message.includes("mismatch") ||
      message.includes("invalid")
    ) {
      return new Response("Preview binding unavailable", { status: 409 });
    }
    return new Response("Preview unavailable", { status: 500 });
  }
}
