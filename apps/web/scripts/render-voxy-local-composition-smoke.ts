import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import {
  buildQueuedVoxyLocalCompositionJob,
  validateVoxyLocalCompositionOutput,
  type VoxyLocalCompositionExecutionResult,
  type VoxyLocalCompositionRequest,
} from "../src/features/voxyVideo/localCompositionRuntime";

function argument(name: string): string | null {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function run(binary: string, args: string[], cwd: string): string {
  const result = spawnSync(binary, args, {
    cwd,
    encoding: "utf8",
    shell: false,
    timeout: 180_000,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    throw new Error(`${binary}_failed:${result.error?.message ?? result.stderr.trim()}`);
  }
  return result.stdout.trim();
}

async function sha256(path: string) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

async function main() {
  const webRoot = resolve(import.meta.dirname, "..");
  const outputRoot = resolve(
    webRoot,
    argument("output-root") ?? "../../../artifacts/voxy-local-composition-runtime-smoke",
  );
  await rm(outputRoot, { recursive: true, force: true });
  const audioRoot = join(outputRoot, "_input");
  await mkdir(audioRoot, { recursive: true });
  const audioPath = join(audioRoot, "approved-fixture.wav");
  run(
    "ffmpeg",
    [
      "-y",
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=220:sample_rate=48000:duration=8",
      "-ac",
      "1",
      "-c:a",
      "pcm_s16le",
      audioPath,
    ],
    webRoot,
  );

  const request: VoxyLocalCompositionRequest = {
    requestedByUserId: "ci-reviewer",
    artifactId: "ci-artifact-568",
    briefingId: "ci-briefing-568",
    scriptVersion: "v1",
    locale: "de-DE",
    format: "16:9",
    renderProfile: "local_review_v1",
    timelineVersion: "fixture-v3",
    audioAssetId: "ci-approved-audio-568",
    sceneContent: [
      {
        id: "opening",
        kicker: "KURZUPDATE",
        headline: "Was hat sich verändert?",
        detail: "Der lokale Composition-Worker rendert revisionsgebunden.",
        sourceIds: [],
      },
      {
        id: "explanation",
        kicker: "QUELLENSTAND",
        headline: "Welche Quelle trägt die Aussage?",
        detail: "Die Quelle bleibt im Render sichtbar und reviewpflichtig.",
        sourceIds: ["source-1"],
      },
      {
        id: "contrast",
        kicker: "GEGENPOSITION",
        headline: "Welche Gegenposition bleibt sichtbar?",
        detail: "Der Gegenbeleg wird nicht durch die Hauptthese verdrängt.",
        sourceIds: ["counter-source-1"],
      },
      {
        id: "invitation",
        kicker: "OFFENE FRAGE",
        headline: "Was muss ein Mensch noch prüfen?",
        detail: "Kein Upload und keine Veröffentlichung ohne Review.",
        sourceIds: [],
      },
    ],
    captionCues: [
      { id: "caption-1", startMs: 0, endMs: 2_000, text: "Was hat sich verändert?" },
      { id: "caption-2", startMs: 2_000, endMs: 4_000, text: "Welche Quelle trägt die Aussage?" },
      { id: "caption-3", startMs: 4_000, endMs: 6_000, text: "Welche Gegenposition bleibt sichtbar?" },
      { id: "caption-4", startMs: 6_000, endMs: 8_000, text: "Was muss ein Mensch noch prüfen?" },
    ],
  };
  const job = buildQueuedVoxyLocalCompositionJob({
    request,
    approval: {
      approved: true,
      approvalRef: "ci-human-approval-568",
      approvedBy: "ci-reviewer",
      approvedAt: new Date().toISOString(),
      authority: "trusted_review_authority",
    },
    now: new Date().toISOString(),
  });
  const manifestPath = join(outputRoot, "worker-input.json");
  await writeFile(
    manifestPath,
    `${JSON.stringify({
      job,
      request,
      audioAsset: {
        assetId: request.audioAssetId,
        absolutePath: audioPath,
        allowedRoot: audioRoot,
        sha256: await sha256(audioPath),
        durationMs: 8_000,
      },
    }, null, 2)}\n`,
    "utf8",
  );

  const stdout = run(
    "pnpm",
    [
      "exec",
      "tsx",
      "scripts/render-voxy-local-composition.ts",
      `--manifest=${manifestPath}`,
      `--output-root=${outputRoot}`,
    ],
    webRoot,
  );
  const result = JSON.parse(stdout.split(/\r?\n/).filter(Boolean).at(-1) ?? "{}") as VoxyLocalCompositionExecutionResult;
  const errors = validateVoxyLocalCompositionOutput({ job, output: result.output });
  if (errors.length) throw new Error(`smoke_output_invalid:${errors.join(",")}`);
  if (
    result.externalRequestCount !== 0 ||
    result.ffmpegShellInterpolationUsed !== false ||
    result.lipSyncUsed !== false ||
    result.externalAvatarProviderUsed !== false
  ) {
    throw new Error("smoke_execution_guard_failed");
  }

  const evidence = {
    taskId: "VOXY-LOCAL-COMPOSITION-RUNTIME-01",
    status: "pass",
    jobId: job.jobId,
    outputId: job.outputId,
    format: job.format,
    renderProfile: job.renderProfile,
    timelineHash: job.timelineHash,
    masterMp4: result.output.masterMp4,
    previewWebm: result.output.previewWebm,
    captionsVtt: result.output.captionsVtt,
    captionsSrt: result.output.captionsSrt,
    reviewRequired: true,
    reviewStatus: result.output.reviewStatus,
    uploaded: false,
    scheduled: false,
    socialPosted: false,
    published: false,
    externalRequestCount: result.externalRequestCount,
  };
  await writeFile(join(outputRoot, "smoke-evidence.json"), `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(evidence, null, 2));
}

main().catch((error: unknown) => {
  console.error(`VOXY_LOCAL_COMPOSITION_SMOKE_FAILED:${error instanceof Error ? error.message : "unknown"}`);
  process.exitCode = 1;
});
