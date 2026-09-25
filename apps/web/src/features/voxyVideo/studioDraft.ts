import type { VoxyVideoFormat } from "./modernCharacterContracts";
import type { VoxyEditorialStoryPlan } from "./editorialStoryPlan";

export const VOXY_STUDIO_DRAFT_VERSION = "voxy-studio-draft-v1" as const;

export const VOXY_STUDIO_DRAFT_STATUSES = [
  "draft",
  "needs_review",
  "needs_changes",
  "approved_for_render",
  "rendered",
  "approved_for_publish",
] as const;

export type VoxyStudioDraftStatus =
  (typeof VOXY_STUDIO_DRAFT_STATUSES)[number];

export const VOXY_STUDIO_SOURCE_KINDS = ["dossier", "manual_script"] as const;
export type VoxyStudioSourceKind = (typeof VOXY_STUDIO_SOURCE_KINDS)[number];

export const VOXY_STUDIO_SAFE_ZONE_PROFILES = [
  "website",
  "video",
  "marketing",
] as const;
export type VoxyStudioSafeZoneProfile =
  (typeof VOXY_STUDIO_SAFE_ZONE_PROFILES)[number];

export type VoxyStudioCaptionAdjustment = {
  cueId: string;
  startDeltaMs: number;
  endDeltaMs: number;
  textOverride: string | null;
};

export const VOXY_STUDIO_REVIEW_APPROVAL_SOURCES = ["human", "agent_council"] as const;
export type VoxyStudioReviewApprovalSource =
  (typeof VOXY_STUDIO_REVIEW_APPROVAL_SOURCES)[number];

export type VoxyStudioReviewApproval = {
  approvalSource: VoxyStudioReviewApprovalSource;
  reviewDecisionRecordId: string;
  decisionGateId: string;
  approvedByUserId: string;
  councilArtifactId: string | null;
  approvedAt: string;
  studioDraftRevision: number;
  storyPlanRevision: number;
};

export type VoxyStudioRenderBinding = {
  jobId: string;
  outputId: string;
  outputSha256: string;
  format: VoxyVideoFormat;
  studioDraftRevision: number;
  storyPlanRevision: number;
  renderedAt: string;
};

export type VoxyStudioDraftGuardrails = {
  reviewRequired: true;
  requestCannotSetApproval: true;
  noAutoRender: true;
  noAutoPublish: true;
  noUpload: true;
  noScheduling: true;
  noSocialPost: true;
};

export type VoxyStudioDraft = {
  version: typeof VOXY_STUDIO_DRAFT_VERSION;
  draftId: string;
  revision: number;
  sourceKind: VoxyStudioSourceKind;
  dossierId: string | null;
  briefingId: string;
  title: string;
  storyPlan: VoxyEditorialStoryPlan;
  selectedFormat: VoxyVideoFormat;
  safeZoneProfile: VoxyStudioSafeZoneProfile;
  captionAdjustments: VoxyStudioCaptionAdjustment[];
  status: VoxyStudioDraftStatus;
  renderApproval: VoxyStudioReviewApproval | null;
  renderBinding: VoxyStudioRenderBinding | null;
  publishApproval: VoxyStudioReviewApproval | null;
  createdByUserId: string;
  updatedByUserId: string;
  createdAt: string;
  updatedAt: string;
  guardrails: VoxyStudioDraftGuardrails;
};

export type VoxyStudioDraftEditablePatch = {
  title?: string;
  storyPlan?: VoxyEditorialStoryPlan;
  selectedFormat?: VoxyVideoFormat;
  safeZoneProfile?: VoxyStudioSafeZoneProfile;
  captionAdjustments?: VoxyStudioCaptionAdjustment[];
};

export const VOXY_STUDIO_DRAFT_GUARDRAILS: VoxyStudioDraftGuardrails = {
  reviewRequired: true,
  requestCannotSetApproval: true,
  noAutoRender: true,
  noAutoPublish: true,
  noUpload: true,
  noScheduling: true,
  noSocialPost: true,
};

const SAFE_ID = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,159}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T/;

function normalize(value: string): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function isFiniteInteger(value: number) {
  return Number.isInteger(value) && Number.isFinite(value);
}

export function buildVoxyStudioRenderReviewGateId(
  draft: Pick<VoxyStudioDraft, "draftId" | "revision" | "storyPlan">,
): string {
  return `voxy-studio-render:${draft.draftId}:r${draft.revision}:story-r${draft.storyPlan.revision}`;
}

export function buildVoxyStudioPublishReviewGateId(
  draft: Pick<VoxyStudioDraft, "draftId" | "revision" | "renderBinding">,
): string {
  if (!draft.renderBinding) throw new Error("studio_render_binding_missing");
  return `voxy-studio-publish:${draft.draftId}:r${draft.revision}:${draft.renderBinding.outputSha256.slice(0, 16)}`;
}

export function validateVoxyStudioCaptionAdjustment(
  adjustment: VoxyStudioCaptionAdjustment,
): string[] {
  const errors: string[] = [];
  if (!SAFE_ID.test(adjustment.cueId)) errors.push("caption_cue_id_invalid");
  if (!isFiniteInteger(adjustment.startDeltaMs) || Math.abs(adjustment.startDeltaMs) > 1_500) {
    errors.push("caption_start_delta_out_of_bounds");
  }
  if (!isFiniteInteger(adjustment.endDeltaMs) || Math.abs(adjustment.endDeltaMs) > 1_500) {
    errors.push("caption_end_delta_out_of_bounds");
  }
  if (
    adjustment.textOverride !== null &&
    (normalize(adjustment.textOverride).length === 0 || adjustment.textOverride.length > 240)
  ) {
    errors.push("caption_text_override_invalid");
  }
  return errors;
}

export function validateVoxyStudioDraft(draft: VoxyStudioDraft): string[] {
  const errors: string[] = [];
  if (draft.version !== VOXY_STUDIO_DRAFT_VERSION) errors.push("studio_draft_version_invalid");
  if (!SAFE_ID.test(draft.draftId)) errors.push("studio_draft_id_invalid");
  if (!isFiniteInteger(draft.revision) || draft.revision < 1) errors.push("studio_draft_revision_invalid");
  if (!VOXY_STUDIO_SOURCE_KINDS.includes(draft.sourceKind)) errors.push("studio_source_kind_invalid");
  if (!SAFE_ID.test(draft.briefingId)) errors.push("studio_briefing_id_invalid");
  if (draft.dossierId !== null && !SAFE_ID.test(draft.dossierId)) errors.push("studio_dossier_id_invalid");
  if (draft.sourceKind === "dossier" && !draft.dossierId) errors.push("dossier_source_requires_dossier_id");
  if (!normalize(draft.title)) errors.push("studio_title_missing");
  if (!VOXY_STUDIO_SAFE_ZONE_PROFILES.includes(draft.safeZoneProfile)) errors.push("studio_safe_zone_profile_invalid");
  if (!VOXY_STUDIO_DRAFT_STATUSES.includes(draft.status)) errors.push("studio_status_invalid");
  if (!SAFE_ID.test(draft.createdByUserId) || !SAFE_ID.test(draft.updatedByUserId)) {
    errors.push("studio_actor_invalid");
  }
  if (!ISO_DATE.test(draft.createdAt) || !ISO_DATE.test(draft.updatedAt)) {
    errors.push("studio_timestamp_invalid");
  }
  if (
    draft.guardrails.reviewRequired !== true ||
    draft.guardrails.requestCannotSetApproval !== true ||
    draft.guardrails.noAutoRender !== true ||
    draft.guardrails.noAutoPublish !== true ||
    draft.guardrails.noUpload !== true ||
    draft.guardrails.noScheduling !== true ||
    draft.guardrails.noSocialPost !== true
  ) {
    errors.push("studio_guardrails_broken");
  }
  const cueIds = new Set<string>();
  for (const adjustment of draft.captionAdjustments) {
    for (const error of validateVoxyStudioCaptionAdjustment(adjustment)) {
      errors.push(`${error}:${adjustment.cueId}`);
    }
    if (cueIds.has(adjustment.cueId)) errors.push(`caption_cue_duplicate:${adjustment.cueId}`);
    cueIds.add(adjustment.cueId);
  }
  if (draft.status === "approved_for_render" && !draft.renderApproval) {
    errors.push("approved_for_render_requires_review_approval");
  }
  if (["rendered", "approved_for_publish"].includes(draft.status) && !draft.renderBinding) {
    errors.push("rendered_state_requires_output_binding");
  }
  if (draft.status === "approved_for_publish" && !draft.publishApproval) {
    errors.push("approved_for_publish_requires_review_approval");
  }
  for (const approval of [draft.renderApproval, draft.publishApproval]) {
    if (!approval) continue;
    if (!VOXY_STUDIO_REVIEW_APPROVAL_SOURCES.includes(approval.approvalSource)) {
      errors.push("approval_source_invalid");
    }
    if (!SAFE_ID.test(approval.reviewDecisionRecordId)) errors.push("approval_decision_record_invalid");
    if (!normalize(approval.decisionGateId)) errors.push("approval_decision_gate_missing");
    if (!SAFE_ID.test(approval.approvedByUserId)) errors.push("approval_actor_invalid");
    if (approval.approvalSource === "agent_council") {
      if (!approval.approvedByUserId.startsWith("agent:voxy-chief-judge:")) {
        errors.push("agent_council_approval_actor_invalid");
      }
      if (!approval.councilArtifactId || !SAFE_ID.test(approval.councilArtifactId)) {
        errors.push("agent_council_approval_artifact_invalid");
      }
    } else if (approval.councilArtifactId !== null) {
      errors.push("human_approval_must_not_bind_council_artifact");
    }
    if (!ISO_DATE.test(approval.approvedAt)) errors.push("approval_timestamp_invalid");
    if (approval.studioDraftRevision !== draft.revision) errors.push("approval_studio_revision_stale");
    if (approval.storyPlanRevision !== draft.storyPlan.revision) errors.push("approval_story_revision_stale");
  }
  if (draft.renderBinding) {
    if (draft.renderBinding.studioDraftRevision !== draft.revision) errors.push("render_binding_studio_revision_stale");
    if (draft.renderBinding.storyPlanRevision !== draft.storyPlan.revision) errors.push("render_binding_story_revision_stale");
    if (draft.renderBinding.format !== draft.selectedFormat) errors.push("render_binding_format_stale");
    if (!/^[a-f0-9]{64}$/.test(draft.renderBinding.outputSha256)) errors.push("render_binding_sha_invalid");
  }
  return errors;
}

export function applyVoxyStudioDraftEdit(input: {
  draft: VoxyStudioDraft;
  patch: VoxyStudioDraftEditablePatch;
  updatedByUserId: string;
  updatedAt: string;
}): VoxyStudioDraft {
  if (!SAFE_ID.test(input.updatedByUserId)) throw new Error("studio_editor_actor_invalid");
  if (!ISO_DATE.test(input.updatedAt)) throw new Error("studio_editor_timestamp_invalid");
  const keys = Object.keys(input.patch);
  if (keys.length === 0) throw new Error("studio_patch_empty");
  if (input.patch.title !== undefined && !normalize(input.patch.title)) {
    throw new Error("studio_title_missing");
  }
  if (
    input.patch.storyPlan &&
    input.patch.storyPlan.revision !== input.draft.storyPlan.revision + 1
  ) {
    throw new Error("story_plan_revision_must_increment_exactly_once");
  }
  for (const adjustment of input.patch.captionAdjustments ?? []) {
    const errors = validateVoxyStudioCaptionAdjustment(adjustment);
    if (errors.length) throw new Error(`studio_caption_adjustment_invalid:${errors.join(",")}`);
  }

  const next: VoxyStudioDraft = {
    ...input.draft,
    title: input.patch.title?.trim() ?? input.draft.title,
    storyPlan: input.patch.storyPlan ?? input.draft.storyPlan,
    selectedFormat: input.patch.selectedFormat ?? input.draft.selectedFormat,
    safeZoneProfile: input.patch.safeZoneProfile ?? input.draft.safeZoneProfile,
    captionAdjustments: input.patch.captionAdjustments ?? input.draft.captionAdjustments,
    revision: input.draft.revision + 1,
    status: input.draft.status === "draft" ? "draft" : "needs_review",
    renderApproval: null,
    renderBinding: null,
    publishApproval: null,
    updatedByUserId: input.updatedByUserId,
    updatedAt: input.updatedAt,
    guardrails: VOXY_STUDIO_DRAFT_GUARDRAILS,
  };
  const errors = validateVoxyStudioDraft(next);
  if (errors.length) throw new Error(`studio_draft_invalid_after_edit:${errors.join(",")}`);
  return next;
}
