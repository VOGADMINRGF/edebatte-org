import { resolve } from "node:path";

import {
  buildVoxyLocalCompositionInputFingerprint,
  safeVoxyLocalCompositionFailure,
  type VoxyLocalCompositionJob,
} from "../src/features/voxyVideo/localCompositionRuntime";
import {
  getVoxyLocalCompositionAudioInputRepository,
} from "../src/features/voxyVideo/localCompositionAudioAssetStore";
import { createVoxyLocalCompositionProcessExecutor } from "../src/features/voxyVideo/localCompositionProcessExecutor";
import {
  executeVoxyLocalComposition,
  recoverInterruptedVoxyLocalComposition,
  VOXY_LOCAL_COMPOSITION_RECOVERY_ORPHAN_AFTER_MS,
  type VoxyLocalCompositionRuntimeDependencies,
} from "../src/features/voxyVideo/localCompositionRuntimeService";
import { getVoxyLocalCompositionRepository } from "../src/features/voxyVideo/localCompositionRuntimeStore";
import { createVoxyRegisteredCompositionAudioResolver } from "../src/features/voxyVideo/studioRenderHandoff";
import { createVoxyStudioLocalCompositionFreshnessAuthority } from "../src/features/voxyVideo/studioLocalCompositionFreshness";

function argument(name: string): string | null {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function positiveInteger(value: string | null, fallback: number, max: number) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(max, parsed);
}

async function failQueuedJob(input: {
  job: VoxyLocalCompositionJob;
  code: string;
  message: string;
}) {
  const repository = getVoxyLocalCompositionRepository();
  const timestamp = new Date().toISOString();
  const failed: VoxyLocalCompositionJob = {
    ...input.job,
    status: "failed",
    updatedAt: timestamp,
    completedAt: timestamp,
    safeErrorCode: input.code,
    safeErrorMessage: input.message,
  };
  await repository.transitionJob({
    jobId: input.job.jobId,
    expectedStatus: "queued",
    next: failed,
  });
  return failed;
}

async function main() {
  const webRoot = resolve(import.meta.dirname, "..");
  const audioRoot =
    argument("audio-root") ?? process.env.VOXY_LOCAL_COMPOSITION_AUDIO_ROOT?.trim() ?? null;
  const outputRoot =
    argument("output-root") ?? process.env.VOXY_LOCAL_COMPOSITION_OUTPUT_ROOT?.trim() ?? null;
  const limit = positiveInteger(argument("limit"), 1, 10);
  const recoveryOrphanAfterMs = positiveInteger(
    argument("recovery-orphan-after-ms"),
    VOXY_LOCAL_COMPOSITION_RECOVERY_ORPHAN_AFTER_MS,
    24 * 60 * 60 * 1_000,
  );
  if (!audioRoot) throw new Error("voxy_local_composition_worker_audio_root_required");
  if (!outputRoot) throw new Error("voxy_local_composition_worker_output_root_required");

  const repository = getVoxyLocalCompositionRepository();
  const audioRepository = getVoxyLocalCompositionAudioInputRepository();
  const persistence = repository.getPersistenceState();
  const audioPersistence = audioRepository.getPersistenceState();
  if (
    persistence.mode !== "persistent_primary" ||
    persistence.productionTruth !== true ||
    persistence.restartReconstructable !== true ||
    audioPersistence.mode !== "persistent_primary" ||
    audioPersistence.productionTruth !== true
  ) {
    throw new Error("voxy_local_composition_worker_persistent_primary_required");
  }

  const deps: VoxyLocalCompositionRuntimeDependencies = {
    repository,
    approvalAuthority: {
      async resolveApproval() {
        throw new Error("voxy_local_composition_worker_must_not_reapprove_queued_job");
      },
    },
    freshnessAuthority: createVoxyStudioLocalCompositionFreshnessAuthority(),
    audioResolver: createVoxyRegisteredCompositionAudioResolver({
      repository: audioRepository,
      trustedAudioRoot: audioRoot,
      requirePersistentPrimary: true,
    }),
    executor: createVoxyLocalCompositionProcessExecutor({
      webRoot,
      outputRoot,
      timeoutMs: positiveInteger(
        argument("timeout-ms"),
        3_600_000,
        14_400_000,
      ),
    }),
  };

  const results: Array<Record<string, unknown>> = [];

  const rendered = await repository.listJobsByStatus("rendered", limit);
  for (const job of rendered) {
    const recovered = await recoverInterruptedVoxyLocalComposition({
      jobId: job.jobId,
      repository,
      orphanAfterMs: recoveryOrphanAfterMs,
    });
    results.push({
      jobId: recovered.jobId,
      outputId: recovered.outputId,
      renderProfile: recovered.renderProfile,
      durationMs: recovered.durationMs ?? null,
      status: recovered.status,
      safeErrorCode: recovered.safeErrorCode,
      recovery: "rendered_finalize",
    });
  }

  const rendering = await repository.listJobsByStatus("rendering", limit);
  for (const job of rendering) {
    const recovered = await recoverInterruptedVoxyLocalComposition({
      jobId: job.jobId,
      repository,
      orphanAfterMs: recoveryOrphanAfterMs,
    });
    if (recovered.status !== "queued") {
      results.push({
        jobId: recovered.jobId,
        outputId: recovered.outputId,
        renderProfile: recovered.renderProfile,
        durationMs: recovered.durationMs ?? null,
        status: recovered.status,
        safeErrorCode: recovered.safeErrorCode,
        recovery: recovered.status === "rendering" ? "active_lease_preserved" : "recovery_terminal",
      });
    }
  }

  const queued = await repository.listJobsByStatus("queued", limit);
  for (const job of queued) {
    const request = await repository.getRequestSnapshot(job.jobId);
    if (!request) {
      const failed = await failQueuedJob({
        job,
        code: "request_snapshot_missing",
        message: "Persisted composition request snapshot is missing.",
      });
      results.push({
        jobId: failed.jobId,
        status: failed.status,
        safeErrorCode: failed.safeErrorCode,
      });
      continue;
    }
    if (buildVoxyLocalCompositionInputFingerprint(request) !== job.inputFingerprint) {
      const failed = await failQueuedJob({
        job,
        code: "request_snapshot_revision_mismatch",
        message: "Persisted composition request no longer matches the queued revision.",
      });
      results.push({
        jobId: failed.jobId,
        status: failed.status,
        safeErrorCode: failed.safeErrorCode,
      });
      continue;
    }

    try {
      const completed = await executeVoxyLocalComposition({
        jobId: job.jobId,
        request,
        deps,
      });
      results.push({
        jobId: completed.jobId,
        outputId: completed.outputId,
        renderProfile: completed.renderProfile,
        durationMs: completed.durationMs ?? null,
        status: completed.status,
        safeErrorCode: completed.safeErrorCode,
      });
    } catch (error) {
      const failure = safeVoxyLocalCompositionFailure(error);
      results.push({
        jobId: job.jobId,
        status: "worker_exception",
        safeErrorCode: failure.code,
        safeErrorMessage: failure.message,
      });
    }
  }

  console.log(
    JSON.stringify({
      ok: true,
      processed: results.length,
      queuedAtStart: queued.length,
      renderingInspected: rendering.length,
      renderedInspected: rendered.length,
      recoveryOrphanAfterMs,
      persistence,
      audioPersistence,
      results,
      uploadTriggered: false,
      publishTriggered: false,
      schedulingTriggered: false,
      socialPostTriggered: false,
    }),
  );
}

main().catch((error: unknown) => {
  console.error(
    `VOXY_LOCAL_COMPOSITION_QUEUE_WORKER_FAILED:${
      error instanceof Error ? error.message : "unknown"
    }`,
  );
  process.exitCode = 1;
});
