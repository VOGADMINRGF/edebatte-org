import { VOXY_FINAL_CANON } from "./finalCanon";
import {
  buildVoxyLocalCompositionInputFingerprint,
  validateVoxyLocalCompositionOutput,
  type VoxyLocalCompositionJob,
  type VoxyLocalCompositionOutput,
  type VoxyLocalCompositionRequest,
} from "./localCompositionRuntime";
import type { VoxyStudioDraft } from "./studioDraft";

export function validateVoxyStudioEditorialRenderCandidate(input: {
  job: VoxyLocalCompositionJob;
  output: VoxyLocalCompositionOutput;
}): string[] {
  const errors: string[] = [];
  if (input.job.renderProfile !== "editorial_v1") {
    errors.push("studio_render_requires_editorial_v1_job");
  }
  if (input.output.renderProfile !== "editorial_v1") {
    errors.push("studio_render_requires_editorial_v1_output");
  }
  for (const error of validateVoxyLocalCompositionOutput(input)) {
    errors.push(`studio_render_output_invalid:${error}`);
  }
  return Array.from(new Set(errors));
}

export function assertVoxyStudioEditorialRenderCandidate(input: {
  job: VoxyLocalCompositionJob;
  output: VoxyLocalCompositionOutput;
}): void {
  const errors = validateVoxyStudioEditorialRenderCandidate(input);
  if (errors.length) {
    throw new Error(`voxy_studio_editorial_render_candidate_invalid:${errors.join(",")}`);
  }
}

export function validateVoxyStudioImmutableEditorialBinding(input: {
  draft: Pick<VoxyStudioDraft, "draftId" | "revision" | "storyPlan" | "renderApproval">;
  evidenceSourcePackId: string;
  currentDecisionGateId: string;
  request: VoxyLocalCompositionRequest | null;
  job: VoxyLocalCompositionJob;
  output: VoxyLocalCompositionOutput;
}): string[] {
  const errors = validateVoxyStudioEditorialRenderCandidate({
    job: input.job,
    output: input.output,
  });
  const request = input.request;
  if (!request || request.renderProfile !== "editorial_v1") {
    errors.push("studio_render_request_snapshot_missing");
    return Array.from(new Set(errors));
  }
  const requestFingerprint = buildVoxyLocalCompositionInputFingerprint(request);
  if (
    requestFingerprint !== input.job.inputFingerprint ||
    requestFingerprint !== input.output.inputFingerprint
  ) {
    errors.push("studio_render_request_fingerprint_mismatch");
  }
  const binding = request.editorialBinding;
  if (!binding) {
    errors.push("studio_render_editorial_binding_missing");
  } else {
    if (
      binding.studioDraftId !== input.draft.draftId ||
      binding.studioDraftRevision !== input.draft.revision
    ) {
      errors.push("studio_render_draft_revision_binding_mismatch");
    }
    if (
      binding.storyPlanId !== input.draft.storyPlan.storyPlanId ||
      binding.storyPlanRevision !== input.draft.storyPlan.revision
    ) {
      errors.push("studio_render_story_revision_binding_mismatch");
    }
    if (binding.evidenceSourcePackId !== input.evidenceSourcePackId) {
      errors.push("studio_render_evidence_source_pack_binding_mismatch");
    }
    if (binding.evidenceDecisionGateId !== input.currentDecisionGateId) {
      errors.push("studio_render_evidence_gate_binding_mismatch");
    }
    if (!input.draft.renderApproval) {
      errors.push("studio_render_current_approval_missing");
    } else {
      if (binding.approvalSource !== input.draft.renderApproval.approvalSource) {
        errors.push("studio_render_approval_source_binding_mismatch");
      }
      if (binding.councilArtifactId !== input.draft.renderApproval.councilArtifactId) {
        errors.push("studio_render_council_artifact_binding_mismatch");
      }
    }
    if (binding.finalCanonId !== VOXY_FINAL_CANON.canonId) {
      errors.push("studio_render_final_canon_binding_mismatch");
    }
  }
  if (
    input.job.decisionGateId !== input.currentDecisionGateId ||
    input.output.decisionGateId !== input.currentDecisionGateId
  ) {
    errors.push("studio_render_output_evidence_gate_mismatch");
  }
  return Array.from(new Set(errors));
}

export function assertVoxyStudioImmutableEditorialBinding(input: {
  draft: Pick<VoxyStudioDraft, "draftId" | "revision" | "storyPlan" | "renderApproval">;
  evidenceSourcePackId: string;
  currentDecisionGateId: string;
  request: VoxyLocalCompositionRequest | null;
  job: VoxyLocalCompositionJob;
  output: VoxyLocalCompositionOutput;
}): void {
  const errors = validateVoxyStudioImmutableEditorialBinding(input);
  if (errors.length) {
    throw new Error(`voxy_studio_immutable_render_binding_invalid:${errors.join(",")}`);
  }
}
