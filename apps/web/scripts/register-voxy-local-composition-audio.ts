import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, realpath, stat } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { z } from "zod";

import {
  buildVoxyEditorialAudioMotionEnvelope,
  loadVoxyEditorialAudioMotionAnalysis,
  VOXY_EDITORIAL_AUDIO_MOTION_FPS,
} from "../src/features/voxyVideo/editorialAudioMotion.server";
import {
  VOXY_LOCAL_COMPOSITION_AUDIO_INPUT_VERSION,
  getVoxyLocalCompositionAudioInputRepository,
  resolveVoxyLocalCompositionAudioAssetFromRecord,
  type VoxyLocalCompositionAudioInputRecord,
} from "../src/features/voxyVideo/localCompositionAudioAssetStore";

const ChapterTimingSchema = z
  .object({
    chapterId: z.string().trim().min(1).max(160),
    durationMs: z.number().int().min(1_500).max(1_800_000),
  })
  .strict();

const CaptionCueSchema = z
  .object({
    id: z.string().trim().min(1).max(160),
    startMs: z.number().int().nonnegative(),
    endMs: z.number().int().positive(),
    text: z.string().trim().min(1).max(1_000),
  })
  .strict();

const ManifestSchema = z
  .object({
    assetId: z.string().trim().min(1).max(160),
    artifactId: z.string().trim().min(1).max(160),
    briefingId: z.string().trim().min(1).max(160),
    scriptVersion: z.string().trim().min(1).max(160),
    storyPlanId: z.string().trim().min(1).max(160),
    storyPlanRevision: z.number().int().positive(),
    locale: z.string().trim().min(2).max(20),
    voiceProfileId: z.string().trim().min(1).max(160),
    voiceUsageApproved: z.literal(true),
    storageKey: z.string().trim().min(1).max(512),
    timelineVersion: z.string().trim().min(1).max(160),
    chapterTimings: z.array(ChapterTimingSchema).min(1).max(100),
    captionCues: z.array(CaptionCueSchema).min(1).max(1_000),
    approvalRef: z.string().trim().min(1).max(160),
    approvedByUserId: z.string().trim().min(1).max(160),
    approvedAt: z.string().datetime(),
    createdAt: z.string().datetime().optional(),
  })
  .strict();

function argument(name: string): string | null {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function run(binary: string, args: string[]): string {
  const result = spawnSync(binary, args, {
    encoding: "utf8",
    shell: false,
    timeout: 30_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    throw new Error(`${binary}_failed:${result.error?.message ?? result.stderr.trim()}`);
  }
  return result.stdout.trim();
}

async function sha256(file: string): Promise<string> {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

function durationMs(file: string): number {
  const raw = run("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    file,
  ]);
  const duration = Math.round(Number(raw) * 1_000);
  if (!Number.isInteger(duration) || duration <= 0) {
    throw new Error("voxy_audio_registration_duration_invalid");
  }
  return duration;
}

async function assertTrustedFile(input: {
  audioRoot: string;
  storageKey: string;
}): Promise<{ allowedRoot: string; absolutePath: string }> {
  const allowedRoot = await realpath(resolve(input.audioRoot));
  const candidate = resolve(allowedRoot, input.storageKey);
  if (candidate !== allowedRoot && !candidate.startsWith(`${allowedRoot}${sep}`)) {
    throw new Error("voxy_audio_registration_path_outside_trusted_root");
  }
  const absolutePath = await realpath(candidate);
  if (absolutePath !== allowedRoot && !absolutePath.startsWith(`${allowedRoot}${sep}`)) {
    throw new Error("voxy_audio_registration_realpath_outside_trusted_root");
  }
  const fileStat = await stat(absolutePath);
  if (!fileStat.isFile() || fileStat.size <= 0) {
    throw new Error("voxy_audio_registration_file_invalid");
  }
  return { allowedRoot, absolutePath };
}

async function main() {
  const manifestArg = argument("manifest");
  const audioRootArg =
    argument("audio-root") ?? process.env.VOXY_LOCAL_COMPOSITION_AUDIO_ROOT?.trim() ?? null;
  if (!manifestArg) throw new Error("voxy_audio_registration_manifest_required");
  if (!audioRootArg) throw new Error("voxy_audio_registration_trusted_root_required");

  const manifest = ManifestSchema.parse(
    JSON.parse(await readFile(resolve(process.cwd(), manifestArg), "utf8")),
  );
  const trusted = await assertTrustedFile({
    audioRoot: audioRootArg,
    storageKey: manifest.storageKey,
  });
  const actualDurationMs = durationMs(trusted.absolutePath);
  const actualSha256 = await sha256(trusted.absolutePath);
  const motionAnalysis = await loadVoxyEditorialAudioMotionAnalysis({
    audioAsset: {
      assetId: manifest.assetId,
      absolutePath: trusted.absolutePath,
      allowedRoot: trusted.allowedRoot,
      sha256: actualSha256,
      durationMs: actualDurationMs,
    },
    fps: VOXY_EDITORIAL_AUDIO_MOTION_FPS,
  });
  const motionEnvelope = buildVoxyEditorialAudioMotionEnvelope({
    sourceSha256: actualSha256,
    levels: motionAnalysis.levels,
  });

  const record: VoxyLocalCompositionAudioInputRecord = {
    version: VOXY_LOCAL_COMPOSITION_AUDIO_INPUT_VERSION,
    assetId: manifest.assetId,
    artifactId: manifest.artifactId,
    briefingId: manifest.briefingId,
    scriptVersion: manifest.scriptVersion,
    storyPlanId: manifest.storyPlanId,
    storyPlanRevision: manifest.storyPlanRevision,
    locale: manifest.locale.toLowerCase(),
    voiceProfileId: manifest.voiceProfileId,
    voiceUsageApproved: true,
    fallbackLocale: null,
    storageKey: manifest.storageKey,
    sha256: actualSha256,
    durationMs: actualDurationMs,
    motionEnvelope,
    timelineVersion: manifest.timelineVersion,
    chapterTimings: manifest.chapterTimings,
    captionCues: manifest.captionCues,
    approvalRef: manifest.approvalRef,
    approvedByUserId: manifest.approvedByUserId,
    approvedAt: manifest.approvedAt,
    createdAt: manifest.createdAt ?? new Date().toISOString(),
    reviewRequired: true,
    externalProviderUsed: false,
    autoRender: false,
    autoPublish: false,
  };

  // Resolve once before persistence so path traversal, root binding and record
  // validation use the same contract the composition runtime will use later.
  const resolved = resolveVoxyLocalCompositionAudioAssetFromRecord({
    record,
    trustedAudioRoot: trusted.allowedRoot,
  });
  if (resolved.absolutePath !== trusted.absolutePath) {
    throw new Error("voxy_audio_registration_storage_key_realpath_mismatch");
  }

  const repository = getVoxyLocalCompositionAudioInputRepository();
  const persistence = repository.getPersistenceState();
  if (persistence.mode !== "persistent_primary" || persistence.productionTruth !== true) {
    throw new Error("voxy_audio_registration_persistent_primary_required");
  }
  const persisted = await repository.registerOrGet(record);
  console.log(
    JSON.stringify({
      ok: true,
      assetId: persisted.assetId,
      artifactId: persisted.artifactId,
      briefingId: persisted.briefingId,
      scriptVersion: persisted.scriptVersion,
      storyPlanId: persisted.storyPlanId,
      storyPlanRevision: persisted.storyPlanRevision,
      locale: persisted.locale,
      voiceProfileId: persisted.voiceProfileId,
      storageKey: persisted.storageKey,
      sha256: persisted.sha256,
      durationMs: persisted.durationMs,
      timelineVersion: persisted.timelineVersion,
      motionEnvelopeVersion: persisted.motionEnvelope?.version ?? null,
      motionEnvelopeFps: persisted.motionEnvelope?.fps ?? null,
      motionEnvelopeFrames: persisted.motionEnvelope?.levels.length ?? 0,
      persistence,
      absolutePathExposed: false,
      autoRender: false,
      autoPublish: false,
    }),
  );
}

main().catch((error: unknown) => {
  console.error(
    `VOXY_LOCAL_COMPOSITION_AUDIO_REGISTRATION_FAILED:${
      error instanceof Error ? error.message : "unknown"
    }`,
  );
  process.exitCode = 1;
});
