import type {
  VoxyLocalCompositionApprovalSnapshot,
  VoxyLocalCompositionAudioAsset,
  VoxyLocalCompositionExecutionResult,
  VoxyLocalCompositionJob,
  VoxyLocalCompositionQueueResult,
  VoxyLocalCompositionRequest,
} from "@/features/voxyVideo/localCompositionRuntime";
import {
  buildQueuedVoxyLocalCompositionJob,
  buildVoxyLocalCompositionInputFingerprint,
  resolveVoxyLocalCompositionDurationMs,
  safeVoxyLocalCompositionFailure,
  validateVoxyLocalCompositionAudioAsset,
  validateVoxyLocalCompositionOutput,
  validateVoxyLocalCompositionRequest,
} from "@/features/voxyVideo/localCompositionRuntime";
import type { VoxyLocalCompositionRepository } from "@/features/voxyVideo/localCompositionRuntimeStore";

export type VoxyLocalCompositionApprovalAuthority = {
  resolveApproval(input: {
    requestedByUserId: string;
    artifactId: string;
    briefingId: string;
    scriptVersion: string;
  }): Promise<VoxyLocalCompositionApprovalSnapshot>;
};

export type VoxyLocalCompositionAudioResolver = {
  resolveAudioAsset(audioAssetId: string): Promise<VoxyLocalCompositionAudioAsset>;
};

export type VoxyLocalCompositionExecutor = {
  execute(input: {
    job: VoxyLocalCompositionJob;
    request: VoxyLocalCompositionRequest;
    audioAsset: VoxyLocalCompositionAudioAsset;
  }): Promise<VoxyLocalCompositionExecutionResult>;
};

export type VoxyLocalCompositionRuntimeDependencies = {
  repository: VoxyLocalCompositionRepository;
  approvalAuthority: VoxyLocalCompositionApprovalAuthority;
  audioResolver: VoxyLocalCompositionAudioResolver;
  executor: VoxyLocalCompositionExecutor;
  now?: () => string;
};

function now(deps: VoxyLocalCompositionRuntimeDependencies) {
  return deps.now?.() ?? new Date().toISOString();
}

export async function queueVoxyLocalComposition(
  request: VoxyLocalCompositionRequest,
  deps: VoxyLocalCompositionRuntimeDependencies,
): Promise<VoxyLocalCompositionQueueResult> {
  const errors = validateVoxyLocalCompositionRequest(request);
  if (errors.length) {
    return { ok: false, status: "invalid_request", job: null, errors };
  }

  const approval = await deps.approvalAuthority.resolveApproval({
    requestedByUserId: request.requestedByUserId,
    artifactId: request.artifactId,
    briefingId: request.briefingId,
    scriptVersion: request.scriptVersion,
  });
  if (
    !approval.approved ||
    !approval.approvalRef?.trim() ||
    !approval.previewReviewFlowId?.trim() ||
    !approval.decisionGateId?.trim()
  ) {
    return {
      ok: false,
      status: "blocked_by_missing_approval",
      job: null,
      errors: ["trusted_render_approval_or_review_binding_missing"],
    };
  }

  let candidate: VoxyLocalCompositionJob;
  try {
    candidate = buildQueuedVoxyLocalCompositionJob({
      request,
      approval,
      now: now(deps),
    });
  } catch {
    return {
      ok: false,
      status: "blocked_by_missing_approval",
      job: null,
      errors: ["trusted_render_approval_or_review_binding_invalid"],
    };
  }
  const existing = await deps.repository.createOrGetJob(candidate);
  if (
    existing.inputFingerprint !== candidate.inputFingerprint ||
    existing.reviewBindingHash !== candidate.reviewBindingHash
  ) {
    return {
      ok: false,
      status: "idempotency_conflict",
      job: null,
      errors: ["composition_identity_reused_with_changed_input_or_review_binding"],
    };
  }
  return {
    ok: true,
    status: existing.status === "queued" ? "queued" : "existing",
    job: existing,
  };
}

export async function executeVoxyLocalComposition(input: {
  jobId: string;
  request: VoxyLocalCompositionRequest;
  deps: VoxyLocalCompositionRuntimeDependencies;
}): Promise<VoxyLocalCompositionJob> {
  const { deps, request } = input;
  const current = await deps.repository.getJob(input.jobId);
  if (!current) throw new Error("voxy_local_composition_job_missing");
  if (current.inputFingerprint !== buildVoxyLocalCompositionInputFingerprint(request)) {
    throw new Error("voxy_local_composition_request_revision_mismatch");
  }
  const expectedDurationMs = resolveVoxyLocalCompositionDurationMs(request);
  if (current.durationMs !== undefined && current.durationMs !== expectedDurationMs) {
    throw new Error("voxy_local_composition_duration_revision_mismatch");
  }
  if (current.status === "review_ready" || current.status === "rendered") return current;
  if (current.status !== "queued") {
    throw new Error(`voxy_local_composition_job_not_queued:${current.status}`);
  }

  const rendering: VoxyLocalCompositionJob = {
    ...current,
    durationMs: current.durationMs ?? expectedDurationMs,
    status: "rendering",
    startedAt: now(deps),
    updatedAt: now(deps),
    safeErrorCode: null,
    safeErrorMessage: null,
  };
  const acquired = await deps.repository.transitionJob({
    jobId: current.jobId,
    expectedStatus: "queued",
    next: rendering,
  });
  if (!acquired) {
    return (await deps.repository.getJob(current.jobId)) ?? current;
  }

  try {
    const audioAsset = await deps.audioResolver.resolveAudioAsset(current.audioAssetId);
    const audioErrors = validateVoxyLocalCompositionAudioAsset(audioAsset, {
      expectedDurationMs,
    });
    if (audioAsset.assetId !== current.audioAssetId) audioErrors.push("audio_asset_identity_mismatch");
    if (audioErrors.length) {
      throw new Error(`voxy_local_composition_audio_invalid:${audioErrors.join(",")}`);
    }

    const execution = await deps.executor.execute({
      job: rendering,
      request,
      audioAsset,
    });
    if (
      execution.externalRequestCount !== 0 ||
      execution.ffmpegShellInterpolationUsed !== false ||
      execution.lipSyncUsed !== false ||
      execution.externalAvatarProviderUsed !== false
    ) {
      throw new Error("voxy_local_composition_execution_guard_failed");
    }
    const outputErrors = validateVoxyLocalCompositionOutput({
      job: rendering,
      output: execution.output,
    });
    if (outputErrors.length) {
      throw new Error(`voxy_local_composition_output_invalid:${outputErrors.join(",")}`);
    }

    const persistedOutput = await deps.repository.saveOutput(execution.output);
    if (
      persistedOutput.inputFingerprint !== rendering.inputFingerprint ||
      persistedOutput.reviewBindingHash !== rendering.reviewBindingHash ||
      persistedOutput.jobId !== rendering.jobId
    ) {
      throw new Error("voxy_local_composition_output_persistence_conflict");
    }

    const rendered: VoxyLocalCompositionJob = {
      ...rendering,
      status: "rendered",
      completedAt: now(deps),
      updatedAt: now(deps),
    };
    const markedRendered = await deps.repository.transitionJob({
      jobId: rendering.jobId,
      expectedStatus: "rendering",
      next: rendered,
    });
    if (!markedRendered) throw new Error("voxy_local_composition_rendered_transition_lost");

    const reviewReady: VoxyLocalCompositionJob = {
      ...rendered,
      status: "review_ready",
      updatedAt: now(deps),
    };
    const markedReviewReady = await deps.repository.transitionJob({
      jobId: rendered.jobId,
      expectedStatus: "rendered",
      next: reviewReady,
    });
    if (!markedReviewReady) throw new Error("voxy_local_composition_review_ready_transition_lost");
    return reviewReady;
  } catch (error) {
    const failure = safeVoxyLocalCompositionFailure(error);
    const latest = (await deps.repository.getJob(rendering.jobId)) ?? rendering;
    if (latest.status === "rendering") {
      const failed: VoxyLocalCompositionJob = {
        ...latest,
        status: "failed",
        updatedAt: now(deps),
        completedAt: now(deps),
        safeErrorCode: failure.code,
        safeErrorMessage: failure.message,
      };
      await deps.repository.transitionJob({
        jobId: latest.jobId,
        expectedStatus: "rendering",
        next: failed,
      });
      return failed;
    }
    return latest;
  }
}

export async function retryVoxyLocalComposition(input: {
  jobId: string;
  repository: VoxyLocalCompositionRepository;
  now?: string;
}): Promise<VoxyLocalCompositionJob> {
  const current = await input.repository.getJob(input.jobId);
  if (!current) throw new Error("voxy_local_composition_job_missing");
  if (current.status !== "failed") {
    throw new Error(`voxy_local_composition_retry_not_allowed:${current.status}`);
  }
  const next: VoxyLocalCompositionJob = {
    ...current,
    status: "queued",
    attempt: current.attempt + 1,
    updatedAt: input.now ?? new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    safeErrorCode: null,
    safeErrorMessage: null,
  };
  const updated = await input.repository.transitionJob({
    jobId: current.jobId,
    expectedStatus: "failed",
    next,
  });
  return updated ? next : ((await input.repository.getJob(current.jobId)) ?? current);
}
