import "server-only";

import {
  buildVoxyLocalCompositionReviewBindingHash,
  type VoxyLocalCompositionJob,
  type VoxyLocalCompositionRequest,
} from "./localCompositionRuntime";
import type { VoxyLocalCompositionFreshnessAuthority } from "./localCompositionRuntimeService";
import {
  createFailClosedDossierStudioEvidenceAuthority,
  loadVoxyStudioDossierEvidenceReviewState,
} from "./studioDossierEvidenceAuthority";
import type { VoxyStudioDraft } from "./studioDraft";
import {
  buildVoxyStudioEditorialReviewItemId,
  buildVoxyStudioEvidenceBoundRenderReviewGateId,
  createDefaultVoxyStudioEditorialReviewAuthority,
  type VoxyStudioEditorialReviewAuthority,
  type VoxyStudioEvidenceAuthority,
} from "./studioDraftService";
import {
  getVoxyStudioDraftRepository,
  type VoxyStudioDraftRepository,
} from "./studioDraftStore";
import { buildVoxyStudioPreviewReviewFlowId } from "./studioRenderHandoff";

type FreshnessPersistenceMode = "persistent_primary" | "in_memory_fallback";

export type VoxyStudioLocalCompositionFreshnessSnapshot = {
  draft: VoxyStudioDraft | null;
  draftPersistenceMode: FreshnessPersistenceMode;
  evidenceApproved: boolean;
  evidencePersistenceMode: FreshnessPersistenceMode;
  evidenceSourcePackId: string | null;
  evidenceReviewState: string | null;
  reviewPersistenceMode: FreshnessPersistenceMode;
  reviewItemId: string | null;
  reviewOperationalStatus: string | null;
  latestReadyAuditId: string | null;
  latestReadyAuditByUserId: string | null;
};

export function validateVoxyStudioLocalCompositionFreshness(input: {
  job: VoxyLocalCompositionJob;
  request: VoxyLocalCompositionRequest;
  current: VoxyStudioLocalCompositionFreshnessSnapshot;
}): string[] {
  if (input.request.renderProfile !== "editorial_v1") return [];

  const errors: string[] = [];
  const binding = input.request.editorialBinding;
  if (!binding) return ["editorial_binding_missing"];
  const draft = input.current.draft;
  if (input.current.draftPersistenceMode !== "persistent_primary") {
    errors.push("draft_persistence_not_primary");
  }
  if (!draft) return [...errors, "draft_missing"];
  const approval = draft.renderApproval;
  if (draft.status !== "approved_for_render") errors.push("draft_not_approved_for_render");
  if (!approval) errors.push("approval_missing");

  if (draft.draftId !== binding.studioDraftId || input.job.artifactId !== draft.draftId) {
    errors.push("draft_identity_changed");
  }
  if (draft.revision !== binding.studioDraftRevision) errors.push("draft_revision_changed");
  if (draft.storyPlan.storyPlanId !== binding.storyPlanId) errors.push("story_id_changed");
  if (draft.storyPlan.revision !== binding.storyPlanRevision) errors.push("story_revision_changed");
  if (input.job.briefingId !== draft.briefingId || input.request.briefingId !== draft.briefingId) {
    errors.push("briefing_changed");
  }
  if (
    input.job.scriptVersion !== `story-r${draft.storyPlan.revision}` ||
    input.request.scriptVersion !== `story-r${draft.storyPlan.revision}`
  ) {
    errors.push("script_revision_changed");
  }
  if (input.job.format !== draft.selectedFormat || input.request.format !== draft.selectedFormat) {
    errors.push("format_changed");
  }
  if (
    input.job.locale !== draft.storyPlan.outputLanguage.toLowerCase() ||
    input.request.locale.toLowerCase() !== draft.storyPlan.outputLanguage.toLowerCase()
  ) {
    errors.push("locale_changed");
  }
  if (input.job.dossierRefId !== draft.dossierId) errors.push("dossier_changed");

  if (input.current.evidencePersistenceMode !== "persistent_primary") {
    errors.push("evidence_review_not_persistent");
  }
  if (!input.current.evidenceApproved) errors.push("evidence_review_not_approved");
  if (input.current.evidenceReviewState !== "approved") errors.push("source_pack_not_approved");
  if (input.current.evidenceSourcePackId !== binding.evidenceSourcePackId) {
    errors.push("source_pack_changed");
  }

  const expectedGate = buildVoxyStudioEvidenceBoundRenderReviewGateId(
    draft,
    input.current.evidenceSourcePackId ?? "",
  );
  if (
    !approval ||
    approval.decisionGateId !== expectedGate ||
    binding.evidenceDecisionGateId !== expectedGate ||
    input.job.decisionGateId !== expectedGate
  ) {
    errors.push("decision_gate_changed");
  }
  const expectedPreviewReviewFlowId = buildVoxyStudioPreviewReviewFlowId(draft);
  if (input.job.previewReviewFlowId !== expectedPreviewReviewFlowId) {
    errors.push("preview_review_flow_changed");
  }

  if (approval) {
    if (input.job.approvalRef !== approval.reviewDecisionRecordId) errors.push("approval_ref_changed");
    if (approval.approvalSource !== binding.approvalSource) errors.push("approval_source_changed");
    if ((approval.councilArtifactId ?? null) !== (binding.councilArtifactId ?? null)) {
      errors.push("council_artifact_changed");
    }
    if (input.current.latestReadyAuditId !== approval.reviewDecisionRecordId) {
      errors.push("review_ready_audit_changed");
    }
    if (input.current.latestReadyAuditByUserId !== approval.approvedByUserId) {
      errors.push("review_actor_changed");
    }
    const currentReviewBindingHash = buildVoxyLocalCompositionReviewBindingHash({
      approvalRef: approval.reviewDecisionRecordId,
      previewReviewFlowId: expectedPreviewReviewFlowId,
      decisionGateId: expectedGate,
      dossierRefId: draft.dossierId,
    });
    if (input.job.reviewBindingHash !== currentReviewBindingHash) {
      errors.push("review_binding_hash_changed");
    }
  }

  const expectedReviewItemId = buildVoxyStudioEditorialReviewItemId(
    draft,
    input.current.evidenceSourcePackId,
  );
  if (input.current.reviewPersistenceMode !== "persistent_primary") {
    errors.push("editorial_review_not_persistent");
  }
  if (input.current.reviewItemId !== expectedReviewItemId) errors.push("review_item_changed");
  if (input.current.reviewOperationalStatus !== "ready") errors.push("review_not_ready");

  return Array.from(new Set(errors));
}

export function createVoxyStudioLocalCompositionFreshnessAuthority(input?: {
  draftRepository?: VoxyStudioDraftRepository;
  evidenceAuthority?: VoxyStudioEvidenceAuthority;
  editorialReviewAuthority?: VoxyStudioEditorialReviewAuthority;
  loadEvidenceReviewState?: typeof loadVoxyStudioDossierEvidenceReviewState;
}): VoxyLocalCompositionFreshnessAuthority {
  const draftRepository = input?.draftRepository ?? getVoxyStudioDraftRepository();
  const evidenceAuthority = input?.evidenceAuthority ?? createFailClosedDossierStudioEvidenceAuthority();
  const editorialReviewAuthority =
    input?.editorialReviewAuthority ?? createDefaultVoxyStudioEditorialReviewAuthority();
  const loadEvidenceReviewState = input?.loadEvidenceReviewState ?? loadVoxyStudioDossierEvidenceReviewState;

  return {
    async assertCurrent({ job, request }) {
      if (request.renderProfile !== "editorial_v1") return;
      try {
        const draft = await draftRepository.getDraft(request.artifactId);
        if (!draft) throw new Error("voxy_local_composition_freshness_stale:draft_missing");
        if (!draft.dossierId) throw new Error("voxy_local_composition_freshness_stale:dossier_missing");

        const [evidence, evidenceReview] = await Promise.all([
          evidenceAuthority.resolveEvidenceContext(draft),
          loadEvidenceReviewState(draft.dossierId),
        ]);
        const expectedSourcePackId =
          `voxy-studio-dossier:${draft.dossierId}:${evidenceReview.snapshot.fingerprint.slice(0, 40)}`;
        if (evidence.sourcePack.sourcePackId !== expectedSourcePackId) {
          throw new Error("voxy_local_composition_freshness_stale:evidence_snapshot_race");
        }

        const reviewItemId = buildVoxyStudioEditorialReviewItemId(draft, evidence.sourcePack.sourcePackId);
        const decisionGateId = buildVoxyStudioEvidenceBoundRenderReviewGateId(
          draft,
          evidence.sourcePack.sourcePackId,
        );
        const review = await editorialReviewAuthority.resolveEditorialReview({
          draft,
          reviewItemId,
          decisionGateId,
        });
        const latestReadyAudit = review.auditEvents.find(
          (event) =>
            event.itemId === reviewItemId &&
            event.action === "mark_ready" &&
            event.nextOperationalStatus === "ready",
        );

        const errors = validateVoxyStudioLocalCompositionFreshness({
          job,
          request,
          current: {
            draft,
            draftPersistenceMode: draftRepository.getPersistenceState().mode,
            evidenceApproved: evidenceReview.approved,
            evidencePersistenceMode: evidenceReview.persistence.mode,
            evidenceSourcePackId: evidence.sourcePack.sourcePackId,
            evidenceReviewState: evidence.sourcePack.reviewState,
            reviewPersistenceMode: review.persistenceMode,
            reviewItemId: review.record?.itemId ?? null,
            reviewOperationalStatus: review.record?.operationalStatus ?? null,
            latestReadyAuditId: latestReadyAudit?.id ?? null,
            latestReadyAuditByUserId: latestReadyAudit?.byUserId ?? null,
          },
        });
        if (errors.length) {
          throw new Error(`voxy_local_composition_freshness_stale:${errors.join(",")}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message.startsWith("voxy_local_composition_freshness_stale:")) throw error;
        throw new Error("voxy_local_composition_freshness_stale:authority_resolution_failed");
      }
    },
  };
}
