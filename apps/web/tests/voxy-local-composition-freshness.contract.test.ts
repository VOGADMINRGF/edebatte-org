import { describe, expect, it } from "vitest";

import {
  buildVoxyLocalCompositionReviewBindingHash,
  type VoxyLocalCompositionJob,
  type VoxyLocalCompositionRequest,
} from "@/features/voxyVideo/localCompositionRuntime";
import type { VoxyStudioDraft } from "@/features/voxyVideo/studioDraft";
import {
  buildVoxyStudioEditorialReviewItemId,
  buildVoxyStudioEvidenceBoundRenderReviewGateId,
} from "@/features/voxyVideo/studioDraftService";
import {
  type VoxyStudioLocalCompositionFreshnessSnapshot,
  validateVoxyStudioLocalCompositionFreshness,
} from "@/features/voxyVideo/studioLocalCompositionFreshness";
import { buildVoxyStudioPreviewReviewFlowId } from "@/features/voxyVideo/studioRenderHandoff";

function fixture() {
  const sourcePackId = "voxy-studio-dossier:dossier-1:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const draft = {
    draftId: "artifact-1",
    revision: 1,
    dossierId: "dossier-1",
    briefingId: "briefing-1",
    selectedFormat: "16:9",
    status: "approved_for_render",
    storyPlan: { storyPlanId: "story-plan-1", revision: 3, outputLanguage: "de" },
  } as VoxyStudioDraft;
  const decisionGateId = buildVoxyStudioEvidenceBoundRenderReviewGateId(draft, sourcePackId);
  const approval = {
    approvalSource: "human" as const,
    reviewDecisionRecordId: "approval-1",
    decisionGateId,
    approvedByUserId: "reviewer-1",
    councilArtifactId: null,
    approvedAt: "2026-09-24T08:00:00.000Z",
    studioDraftRevision: 1,
    storyPlanRevision: 3,
  };
  draft.renderApproval = approval;
  const request = {
    requestedByUserId: "user-1",
    artifactId: draft.draftId,
    briefingId: draft.briefingId,
    scriptVersion: "story-r3",
    locale: "de",
    format: "16:9",
    renderProfile: "editorial_v1",
    editorialBinding: {
      studioDraftId: draft.draftId,
      studioDraftRevision: 1,
      storyPlanId: "story-plan-1",
      storyPlanRevision: 3,
      evidenceSourcePackId: sourcePackId,
      evidenceDecisionGateId: decisionGateId,
      approvalSource: "human",
      councilArtifactId: null,
      finalCanonId: "VOXY-V3.10.5-HUMAN-FINAL",
    },
  } as VoxyLocalCompositionRequest;
  const previewReviewFlowId = buildVoxyStudioPreviewReviewFlowId(draft);
  const reviewBindingHash = buildVoxyLocalCompositionReviewBindingHash({
    approvalRef: approval.reviewDecisionRecordId,
    previewReviewFlowId,
    decisionGateId,
    dossierRefId: draft.dossierId,
  });
  const job = {
    artifactId: draft.draftId,
    briefingId: draft.briefingId,
    scriptVersion: "story-r3",
    format: "16:9",
    locale: "de",
    dossierRefId: draft.dossierId,
    decisionGateId,
    approvalRef: approval.reviewDecisionRecordId,
    previewReviewFlowId,
    reviewBindingHash,
  } as VoxyLocalCompositionJob;
  const current: VoxyStudioLocalCompositionFreshnessSnapshot = {
    draft,
    draftPersistenceMode: "persistent_primary",
    evidenceApproved: true,
    evidencePersistenceMode: "persistent_primary",
    evidenceSourcePackId: sourcePackId,
    evidenceReviewState: "approved",
    reviewPersistenceMode: "persistent_primary",
    reviewItemId: buildVoxyStudioEditorialReviewItemId(draft, sourcePackId),
    reviewOperationalStatus: "ready",
    latestReadyAuditId: approval.reviewDecisionRecordId,
    latestReadyAuditByUserId: approval.approvedByUserId,
  };
  return { job, request, current };
}

describe("VOXY-RENDER-APPROVAL-FRESHNESS-01", () => {
  it("accepts unchanged persisted authority bindings", () => {
    expect(validateVoxyStudioLocalCompositionFreshness(fixture())).toEqual([]);
  });

  it("rejects a removed render approval", () => {
    const input = fixture();
    input.current.draft = { ...input.current.draft!, renderApproval: null };
    expect(validateVoxyStudioLocalCompositionFreshness(input)).toContain("approval_missing");
  });

  it("rejects a changed evidence SourcePack", () => {
    const input = fixture();
    input.current.evidenceSourcePackId =
      "voxy-studio-dossier:dossier-1:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    expect(validateVoxyStudioLocalCompositionFreshness(input)).toContain("source_pack_changed");
  });

  it("rejects a changed decision gate", () => {
    const input = fixture();
    input.job = { ...input.job, decisionGateId: "stale-decision-gate" };
    expect(validateVoxyStudioLocalCompositionFreshness(input)).toContain("decision_gate_changed");
  });

  it("rejects a changed review approval reference", () => {
    const input = fixture();
    input.current.latestReadyAuditId = "approval-2";
    expect(validateVoxyStudioLocalCompositionFreshness(input)).toContain("review_ready_audit_changed");
  });

  it("rejects changed draft and story revisions", () => {
    const input = fixture();
    input.current.draft = {
      ...input.current.draft!,
      revision: 2,
      storyPlan: { ...input.current.draft!.storyPlan, revision: 4 },
    };
    const errors = validateVoxyStudioLocalCompositionFreshness(input);
    expect(errors).toContain("draft_revision_changed");
    expect(errors).toContain("story_revision_changed");
  });

  it("rejects a revoked or non-ready editorial review", () => {
    const input = fixture();
    input.current.reviewOperationalStatus = "blocked";
    expect(validateVoxyStudioLocalCompositionFreshness(input)).toContain("review_not_ready");
  });
});
