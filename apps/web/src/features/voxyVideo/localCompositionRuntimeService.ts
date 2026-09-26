import type {
  VoxyLocalCompositionApprovalSnapshot,
  VoxyLocalCompositionAudioAsset,
  VoxyLocalCompositionExecutionResult,
  VoxyLocalCompositionJob,
  VoxyLocalCompositionOutput,
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

export const VOXY_LOCAL_COMPOSITION_RECOVERY_ORPHAN_AFTER_MS = 5 * 60 * 60 * 1_000;

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

export type VoxyLocalCompositionFreshnessAuthority = {
  assertCurrent(input: {
    job: VoxyLocalCompositionJob;
    request: VoxyLocalCompositionRequest;
  }): Promise<void>;
};

export type VoxyLocalCompositionRuntimeDependencies = {
  repository: VoxyLocalCompositionRepository;
  approvalAuthority: VoxyLocalCompositionApprovalAuthority;
  freshnessAuthority?: VoxyLocalCompositionFreshnessAuthority;
  audioResolver: VoxyLocalCompositionAudioResolver;
  executor: VoxyLocalCompositionExecutor;
  now?: () => string;
};

function now(deps: VoxyLocalCompositionRuntimeDependencies) {
  return deps.now?.() ?? new Date().toISOString();
}

function isExpectedCompositionIdentityConflict(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return [
    "voxy_local_composition_request_snapshot_immutable_conflict",
    "voxy_local_composition_request_snapshot_binding_mismatch",
  ].includes(error.message);
}

function outputPersistenceSignature(output: VoxyLocalCompositionOutput): string {
  return JSON.stringify({
    outputId: output.outputId,
    jobId: output.jobId,
    identityKey: output.identityKey,
    inputFingerprint: output.inputFingerprint,
    reviewBindingHash: output.reviewBindingHash,
    timelineHash: output.timelineHash,
    format: output.format,
    renderProfile: output.renderProfile,
    locale: output.locale,
    previewReviewFlowId: output.previewReviewFlowId,
    decisionGateId: output.decisionGateId,
    dossierRefId: output.dossierRefId,
    masterMp4: output.masterMp4,
    previewWebm: output.previewWebm,
    captionsVtt: output.captionsVtt,
    captionsSrt: output.captionsSrt,
    createdAt: output.createdAt,
    reviewStatus: output.reviewStatus,
    reviewRequired: output.reviewRequired,
    publicAsset: output.publicAsset,
    uploaded: output.uploaded,
    scheduled: output.scheduled,
    socialPosted: output.socialPosted,
    published: output.published,
  });
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

  let existing: VoxyLocalCompositionJob;
  try {
    existing = await deps.repository.createOrGetJob(candidate, request);
  } catch (error) {
    if (isExpectedCompositionIdentityConflict(error)) {
      return {
        ok: false,
        status: "idempotency_conflict",
        job: null,
        errors: ["composition_identity_reused_with_changed_input_or_review_binding"],
      };
    }
    throw error;
  }

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
    if (request.renderProfile === "editorial_v1") {
      if (!deps.freshnessAuthority) {
        throw new Error("voxy_local_composition_freshness_authority_missing");
      }
      await deps.freshnessAuthority.assertCurrent({
        job: rendering,
        request,
      });
    }

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
      persistedOutput.jobId !== rendering.jobId ||
      outputPersistenceSignature(persistedOutput) !== outputPersistenceSignature(execution.output)
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
    const failed: VoxyLocalCompositionJob = {
      ...rendering,
      status: "failed",
      updatedAt: now(deps),
      completedAt: now(deps),
      safeErrorCode: failure.code,
      safeErrorMessage: failure.message,
    };
    const markedFailed = await deps.repository.transitionJob({
      jobId: rendering.jobId,
      expectedStatus: "rendering",
      next: failed,
    });
    if (markedFailed) return failed;
    return (await deps.repository.getJob(rendering.jobId)) ?? rendering;
  }
}

export async function recoverInterruptedVoxyLocalComposition(input: {
  jobId: string;
  repository: VoxyLocalCompositionRepository;
  now?: string;
  orphanAfterMs?: number;
}): Promise<VoxyLocalCompositionJob> {
  const current = await input.repository.getJob(input.jobId);
  if (!current) throw new Error("voxy_local_composition_job_missing");
  if (current.status === "review_ready" || current.status === "queued" || current.status === "failed") {
    return current;
  }

  const recoveredAt = input.now ?? new Date().toISOString();

  if (current.status === "rendered") {
    const output = await input.repository.getOutput(current.outputId);
    const outputErrors = output
      ? validateVoxyLocalCompositionOutput({ job: current, output })
      : ["output_missing"];
    if (outputErrors.length > 0) {
      const failure = safeVoxyLocalCompositionFailure(
        new Error(`voxy_local_composition_recovery_output_invalid:${outputErrors.join(",")}`),
      );
      const failed: VoxyLocalCompositionJob = {
        ...current,
        status: "failed",
        updatedAt: recoveredAt,
        completedAt: recoveredAt,
        safeErrorCode: failure.code,
        safeErrorMessage: failure.message,
      };
      const markedFailed = await input.repository.transitionJob({
        jobId: current.jobId,
        expectedStatus: "rendered",
        next: failed,
      });
      return markedFailed
        ? failed
        : ((await input.repository.getJob(current.jobId)) ?? current);
    }

    const queued: VoxyLocalCompositionJob = {
      ...current,
      status: "queued",
      attempt: current.attempt + 1,
      updatedAt: recoveredAt,
      startedAt: null,
      completedAt: null,
      safeErrorCode: null,
      safeErrorMessage: null,
    };
    const recovered = await input.repository.transitionJob({
      jobId: current.jobId,
      expectedStatus: "rendered",
      next: queued,
    });
    return recovered ? queued : ((await input.repository.getJob(current.jobId)) ?? current);
  }

  const nowMs = Date.parse(recoveredAt);
  const lastUpdateMs = Date.parse(current.updatedAt);
  const orphanAfterMs = Math.max(
    1,
    Math.trunc(input.orphanAfterMs ?? VOXY_LOCAL_COMPOSITION_RECOVERY_ORPHAN_AFTER_MS),
  );
  if (
    !Number.isFinite(nowMs) ||
    !Number.isFinite(lastUpdateMs) ||
    nowMs < lastUpdateMs ||
    nowMs - lastUpdateMs < orphanAfterMs
  ) {
    return current;
  }

  const queued: VoxyLocalCompositionJob = {
    ...current,
    status: "queued",
    attempt: current.attempt + 1,
    updatedAt: recoveredAt,
    startedAt: null,
    completedAt: null,
    safeErrorCode: null,
    safeErrorMessage: null,
  };
  const recovered = await input.repository.transitionJob({
    jobId: current.jobId,
    expectedStatus: "rendering",
    next: queued,
  });
  return recovered ? queued : ((await input.repository.getJob(current.jobId)) ?? current);
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
