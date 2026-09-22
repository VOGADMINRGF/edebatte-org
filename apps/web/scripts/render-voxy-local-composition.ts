import { chromium } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";

import {
  buildVoxyCharacterMotionFixturePlan,
  validateVoxyCharacterMotionFixturePlan,
  type VoxyCharacterMotionFixturePlan,
} from "../src/features/voxyVideo/characterMotionFixture";
import { renderVoxyCharacterMotionFixtureHtml } from "../src/features/voxyVideo/characterMotionFixtureHtml";
import { loadVoxyEditorialCompositionEmbeddedAssets } from "../src/features/voxyVideo/editorialCompositionAssets.server";
import { renderVoxyEditorialCompositionFrameHtml } from "../src/features/voxyVideo/editorialCompositionHtml";
import {
  assertVoxyFinalCanonBinding,
  finalVoxyCanonBinding,
} from "../src/features/voxyVideo/finalCanon";
import {
  buildVoxyLocalCompositionIdentityKey,
  buildVoxyLocalCompositionInputFingerprint,
  buildVoxyLocalCompositionReviewBindingHash,
  buildVoxyLocalCompositionTimelineHash,
  getVoxyLocalCompositionDimensions,
  resolveVoxyLocalCompositionDurationMs,
  validateVoxyLocalCompositionAudioAsset,
  validateVoxyLocalCompositionOutput,
  validateVoxyLocalCompositionRequest,
  type VoxyLocalCompositionAudioAsset,
  type VoxyLocalCompositionExecutionResult,
  type VoxyLocalCompositionJob,
  type VoxyLocalCompositionMediaFile,
  type VoxyLocalCompositionOutput,
  type VoxyLocalCompositionRequest,
} from "../src/features/voxyVideo/localCompositionRuntime";

assertVoxyFinalCanonBinding(finalVoxyCanonBinding());

const MAX_OUTPUT_BYTES = 250_000_000;
const COMMAND_TIMEOUT_MS = 120_000;
const FPS = 24;

type WorkerManifest = {
  job: VoxyLocalCompositionJob;
  request: VoxyLocalCompositionRequest;
  audioAsset: VoxyLocalCompositionAudioAsset;
};

type OutputManifest = {
  schemaVersion: "voxy-local-composition-output-v1";
  canon: ReturnType<typeof finalVoxyCanonBinding>;
  output: VoxyLocalCompositionOutput;
  externalRequestCount: number;
  ffmpegShellInterpolationUsed: false;
  lipSyncUsed: false;
  externalAvatarProviderUsed: false;
};

type Probe = {
  streams?: Array<{ codec_type?: string; width?: number; height?: number }>;
  format?: { duration?: string; size?: string };
};

function argument(name: string): string | null {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function run(binary: string, args: string[]): string {
  const result = spawnSync(binary, args, {
    encoding: "utf8",
    timeout: COMMAND_TIMEOUT_MS,
    maxBuffer: 8 * 1024 * 1024,
    shell: false,
  });
  if (result.error || result.status !== 0) {
    throw new Error(`${binary}_failed:${result.error?.message ?? result.stderr.trim()}`);
  }
  return result.stdout.trim();
}

async function sha256(path: string): Promise<string> {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

function sanitizeDirectorySegment(value: string): string {
  const safe = value.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!safe || safe.includes("..")) throw new Error("unsafe_output_directory_segment");
  return safe;
}

async function assertInsideRoot(path: string, root: string): Promise<string> {
  const [actualPath, actualRoot] = await Promise.all([realpath(path), realpath(root)]);
  if (actualPath !== actualRoot && !actualPath.startsWith(`${actualRoot}${sep}`)) {
    throw new Error("audio_path_outside_allowed_root");
  }
  return actualPath;
}

function publicAssetPath(webRoot: string, publicPath: string): string {
  if (!publicPath.startsWith("/brands/voxy/")) {
    throw new Error("voxy_asset_outside_canonical_brand_root");
  }
  return resolve(webRoot, "public", publicPath.slice(1));
}

async function embeddedSvgDataUrl(path: string): Promise<string> {
  const content = await readFile(path, "utf8");
  if (!content.includes("<svg")) throw new Error("voxy_svg_master_invalid");
  return `data:image/svg+xml;base64,${Buffer.from(content).toString("base64")}`;
}

function audioLevelsFromWav(buffer: Buffer, fps: number): number[] {
  if (
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WAVE"
  ) {
    throw new Error("editorial_audio_analysis_wav_invalid");
  }
  const fmtMarker = buffer.indexOf(Buffer.from("fmt "));
  const dataMarker = buffer.indexOf(Buffer.from("data"));
  if (fmtMarker < 0 || dataMarker < 0) throw new Error("editorial_audio_analysis_chunks_missing");
  const channels = buffer.readUInt16LE(fmtMarker + 10);
  const sampleRate = buffer.readUInt32LE(fmtMarker + 12);
  const bits = buffer.readUInt16LE(fmtMarker + 22);
  if (channels !== 1 || bits !== 16) throw new Error("editorial_audio_analysis_pcm_invalid");
  const dataStart = dataMarker + 8;
  const sampleCount = Math.floor((buffer.length - dataStart) / 2);
  const frameCount = Math.ceil((sampleCount * fps) / sampleRate);
  const rms: number[] = [];
  const halfWindow = Math.round(sampleRate * 0.045);
  for (let frame = 0; frame < frameCount; frame += 1) {
    const center = Math.round((frame * sampleRate) / fps);
    const start = Math.max(0, center - halfWindow);
    const end = Math.min(sampleCount, center + halfWindow);
    let sum = 0;
    for (let index = start; index < end; index += 1) {
      const sample = buffer.readInt16LE(dataStart + index * 2) / 32768;
      sum += sample * sample;
    }
    rms.push(Math.sqrt(sum / Math.max(1, end - start)));
  }
  const sorted = [...rms].sort((a, b) => a - b);
  const reference = sorted[Math.floor(sorted.length * 0.95)] ?? 0.001;
  let smoothed = 0;
  return rms.map((value) => {
    const gated = value < 0.006 ? 0 : Math.min(1, value / Math.max(reference, 0.001));
    smoothed =
      gated > smoothed
        ? smoothed * 0.35 + gated * 0.65
        : smoothed * 0.62 + gated * 0.38;
    return Math.round(smoothed * 20) / 20;
  });
}

function timestampVtt(ms: number): string {
  const value = Math.max(0, Math.trunc(ms));
  const hours = Math.floor(value / 3_600_000);
  const minutes = Math.floor((value % 3_600_000) / 60_000);
  const seconds = Math.floor((value % 60_000) / 1_000);
  const millis = value % 1_000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

function timestampSrt(ms: number): string {
  return timestampVtt(ms).replace(".", ",");
}

function cleanCaption(value: string): string {
  return value.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
}

function buildVtt(request: VoxyLocalCompositionRequest): string {
  const cues = request.captionCues
    .map((cue) => `${timestampVtt(cue.startMs)} --> ${timestampVtt(cue.endMs)}\n${cleanCaption(cue.text)}`)
    .join("\n\n");
  return `WEBVTT\n\n${cues}\n`;
}

function buildSrt(request: VoxyLocalCompositionRequest): string {
  return `${request.captionCues
    .map(
      (cue, index) =>
        `${index + 1}\n${timestampSrt(cue.startMs)} --> ${timestampSrt(cue.endMs)}\n${cleanCaption(cue.text)}`,
    )
    .join("\n\n")}\n`;
}

function buildRuntimePlan(request: VoxyLocalCompositionRequest): VoxyCharacterMotionFixturePlan {
  const base = buildVoxyCharacterMotionFixturePlan(request.format);
  const content = new Map(request.sceneContent.map((scene) => [scene.id, scene]));
  const language = request.locale.split("-")[0]?.toLowerCase() || request.locale.toLowerCase();
  return {
    ...base,
    id: `voxy-local-composition-${request.format.replace(":", "x")}`,
    title: content.get("opening")?.headline ?? base.title,
    locale: request.locale,
    originalLanguage: language,
    outputLanguage: language,
    sourceDisclosure: "Quellenstand: revisionsgebunden · menschliches Review erforderlich",
    scenes: base.scenes.map((scene) => {
      const copy = content.get(scene.id as "opening" | "explanation" | "contrast" | "invitation");
      if (!copy) throw new Error(`runtime_scene_missing:${scene.id}`);
      return {
        ...scene,
        kicker: copy.kicker,
        headline: copy.headline,
        detail: copy.detail,
        sourceIds: [...copy.sourceIds],
      };
    }),
  };
}

function probe(path: string): Probe {
  return JSON.parse(
    run("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", path]),
  ) as Probe;
}

async function mediaFile(input: {
  path: string;
  storageKey: string;
  mimeType: string;
  requireVideo?: boolean;
  expectedWidth?: number;
  expectedHeight?: number;
  expectedDurationMs?: number;
  requireAudio?: boolean;
  requireSubtitle?: boolean;
}): Promise<VoxyLocalCompositionMediaFile> {
  const fileStat = await stat(input.path);
  if (!fileStat.isFile() || fileStat.size <= 0 || fileStat.size > MAX_OUTPUT_BYTES) {
    throw new Error("rendered_file_size_invalid");
  }
  let durationMs: number | null = null;
  let width: number | null = null;
  let height: number | null = null;
  if (input.requireVideo) {
    const details = probe(input.path);
    const video = details.streams?.find((stream) => stream.codec_type === "video");
    const hasAudio = details.streams?.some((stream) => stream.codec_type === "audio") ?? false;
    const hasSubtitle = details.streams?.some((stream) => stream.codec_type === "subtitle") ?? false;
    width = video?.width ?? null;
    height = video?.height ?? null;
    durationMs = Math.round(Number(details.format?.duration ?? 0) * 1_000);
    if (width !== input.expectedWidth || height !== input.expectedHeight) {
      throw new Error("rendered_file_dimensions_invalid");
    }
    if (
      !Number.isFinite(durationMs) ||
      !Number.isFinite(input.expectedDurationMs) ||
      Math.abs(durationMs - Number(input.expectedDurationMs)) > 650
    ) {
      throw new Error("rendered_file_duration_invalid");
    }
    if (input.requireAudio && !hasAudio) throw new Error("rendered_file_audio_stream_missing");
    if (input.requireSubtitle && !hasSubtitle) throw new Error("rendered_file_subtitle_stream_missing");
  }
  return {
    storageKey: input.storageKey,
    sha256: await sha256(input.path),
    sizeBytes: fileStat.size,
    durationMs,
    width,
    height,
    mimeType: input.mimeType,
  };
}

function sameMediaFile(expected: VoxyLocalCompositionMediaFile, actual: VoxyLocalCompositionMediaFile) {
  return (
    expected.storageKey === actual.storageKey &&
    expected.sha256 === actual.sha256 &&
    expected.sizeBytes === actual.sizeBytes &&
    expected.durationMs === actual.durationMs &&
    expected.width === actual.width &&
    expected.height === actual.height &&
    expected.mimeType === actual.mimeType
  );
}

async function recoverExistingOutput(input: {
  finalDirectory: string;
  finalSegment: string;
  job: VoxyLocalCompositionJob;
  width: number;
  height: number;
  expectedDurationMs: number;
}): Promise<VoxyLocalCompositionExecutionResult | null> {
  try {
    const directoryStat = await stat(input.finalDirectory);
    if (!directoryStat.isDirectory()) throw new Error("existing_final_output_not_directory");
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return null;
    throw error;
  }

  let manifest: OutputManifest;
  try {
    manifest = JSON.parse(
      await readFile(join(input.finalDirectory, "composition-manifest.json"), "utf8"),
    ) as OutputManifest;
  } catch (error) {
    throw new Error(`existing_final_output_manifest_invalid:${error instanceof Error ? error.message : "unknown"}`);
  }

  const canon = finalVoxyCanonBinding();
  if (
    manifest.schemaVersion !== "voxy-local-composition-output-v1" ||
    manifest.canon.canonId !== canon.canonId ||
    manifest.canon.sourcePullRequest !== canon.sourcePullRequest ||
    manifest.canon.referenceRenderHeadSha !== canon.referenceRenderHeadSha ||
    manifest.output.jobId !== input.job.jobId ||
    manifest.output.outputId !== input.job.outputId ||
    manifest.output.identityKey !== input.job.identityKey ||
    manifest.output.inputFingerprint !== input.job.inputFingerprint ||
    manifest.output.reviewBindingHash !== input.job.reviewBindingHash ||
    manifest.output.timelineHash !== input.job.timelineHash ||
    manifest.output.previewReviewFlowId !== input.job.previewReviewFlowId ||
    manifest.output.decisionGateId !== input.job.decisionGateId ||
    manifest.output.dossierRefId !== input.job.dossierRefId ||
    manifest.externalRequestCount !== 0 ||
    manifest.ffmpegShellInterpolationUsed !== false ||
    manifest.lipSyncUsed !== false ||
    manifest.externalAvatarProviderUsed !== false
  ) {
    throw new Error("existing_final_output_revision_conflict");
  }

  const actualMaster = await mediaFile({
    path: join(input.finalDirectory, "master.mp4"),
    storageKey: `${input.finalSegment}/master.mp4`,
    mimeType: "video/mp4",
    requireVideo: true,
    expectedWidth: input.width,
    expectedHeight: input.height,
    expectedDurationMs: input.expectedDurationMs,
    requireAudio: true,
    requireSubtitle: true,
  });
  const actualPreview = await mediaFile({
    path: join(input.finalDirectory, "preview.webm"),
    storageKey: `${input.finalSegment}/preview.webm`,
    mimeType: "video/webm",
    requireVideo: true,
    expectedWidth: input.width,
    expectedHeight: input.height,
    expectedDurationMs: input.expectedDurationMs,
    requireAudio: true,
    requireSubtitle: true,
  });
  const actualVtt = await mediaFile({
    path: join(input.finalDirectory, "captions.vtt"),
    storageKey: `${input.finalSegment}/captions.vtt`,
    mimeType: "text/vtt",
  });
  const actualSrt = await mediaFile({
    path: join(input.finalDirectory, "captions.srt"),
    storageKey: `${input.finalSegment}/captions.srt`,
    mimeType: "application/x-subrip",
  });
  if (
    !sameMediaFile(manifest.output.masterMp4, actualMaster) ||
    !sameMediaFile(manifest.output.previewWebm, actualPreview) ||
    !sameMediaFile(manifest.output.captionsVtt, actualVtt) ||
    !sameMediaFile(manifest.output.captionsSrt, actualSrt) ||
    validateVoxyLocalCompositionOutput({ job: input.job, output: manifest.output }).length > 0
  ) {
    throw new Error("existing_final_output_integrity_mismatch");
  }

  return {
    output: manifest.output,
    externalRequestCount: 0,
    ffmpegShellInterpolationUsed: false,
    lipSyncUsed: false,
    externalAvatarProviderUsed: false,
  };
}

async function main(): Promise<void> {
  const manifestArg = argument("manifest");
  const outputRootArg = argument("output-root");
  if (!manifestArg || !outputRootArg) throw new Error("manifest_and_output_root_required");

  const manifestPath = resolve(process.cwd(), manifestArg);
  const outputRoot = resolve(process.cwd(), outputRootArg);
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as WorkerManifest;
  const expectedDurationMs = resolveVoxyLocalCompositionDurationMs(manifest.request);
  const requestErrors = validateVoxyLocalCompositionRequest(manifest.request);
  const audioErrors = validateVoxyLocalCompositionAudioAsset(manifest.audioAsset, {
    expectedDurationMs,
  });
  if (requestErrors.length || audioErrors.length) {
    throw new Error(`worker_manifest_invalid:${[...requestErrors, ...audioErrors].join(",")}`);
  }
  const expectedReviewBindingHash = buildVoxyLocalCompositionReviewBindingHash({
    approvalRef: manifest.job.approvalRef,
    previewReviewFlowId: manifest.job.previewReviewFlowId,
    decisionGateId: manifest.job.decisionGateId,
    dossierRefId: manifest.job.dossierRefId,
  });
  if (
    manifest.job.briefingId !== manifest.request.briefingId ||
    manifest.job.scriptVersion !== manifest.request.scriptVersion ||
    manifest.job.audioAssetId !== manifest.audioAsset.assetId ||
    manifest.job.format !== manifest.request.format ||
    manifest.job.renderProfile !== manifest.request.renderProfile ||
    manifest.job.locale !== manifest.request.locale.toLowerCase() ||
    manifest.job.identityKey !== buildVoxyLocalCompositionIdentityKey(manifest.request) ||
    manifest.job.inputFingerprint !== buildVoxyLocalCompositionInputFingerprint(manifest.request) ||
    manifest.job.timelineHash !== buildVoxyLocalCompositionTimelineHash(manifest.request) ||
    manifest.job.reviewBindingHash !== expectedReviewBindingHash ||
    (manifest.job.durationMs !== undefined && manifest.job.durationMs !== expectedDurationMs) ||
    (manifest.job.renderProfile === "editorial_v1" && manifest.job.durationMs !== expectedDurationMs) ||
    !manifest.job.previewReviewFlowId ||
    !manifest.job.decisionGateId
  ) {
    throw new Error("worker_manifest_revision_binding_mismatch");
  }

  await mkdir(outputRoot, { recursive: true });
  const audioPath = await assertInsideRoot(manifest.audioAsset.absolutePath, manifest.audioAsset.allowedRoot);
  if ((await sha256(audioPath)) !== manifest.audioAsset.sha256.toLowerCase()) {
    throw new Error("audio_sha256_mismatch");
  }
  const audioProbe = probe(audioPath);
  const audioDurationMs = Math.round(Number(audioProbe.format?.duration ?? 0) * 1_000);
  if (
    !Number.isFinite(audioDurationMs) ||
    Math.abs(audioDurationMs - manifest.audioAsset.durationMs) > 200 ||
    Math.abs(audioDurationMs - expectedDurationMs) > 600
  ) {
    throw new Error("audio_duration_metadata_mismatch");
  }

  const webRoot = resolve(import.meta.dirname, "..");
  const repositoryRoot = resolve(webRoot, "../..");
  const legacyPlan =
    manifest.request.renderProfile === "local_review_v1"
      ? buildRuntimePlan(manifest.request)
      : null;
  if (legacyPlan) {
    const planValidation = validateVoxyCharacterMotionFixturePlan(legacyPlan);
    if (!planValidation.ok) {
      throw new Error(`runtime_plan_invalid:${planValidation.errors.join(",")}`);
    }
  }
  if (
    manifest.request.renderProfile === "editorial_v1" &&
    (!manifest.request.editorialStoryPlan || !manifest.request.editorialTimeline)
  ) {
    throw new Error("editorial_runtime_plan_missing");
  }

  const dimensions = getVoxyLocalCompositionDimensions(
    manifest.request.format,
    manifest.request.renderProfile,
  );
  const embeddedStudioAssetUrl = legacyPlan
    ? await embeddedSvgDataUrl(publicAssetPath(webRoot, legacyPlan.studioAssetPath))
    : null;
  const embeddedCharacterSvg = legacyPlan
    ? await readFile(publicAssetPath(webRoot, legacyPlan.characterAssetPath), "utf8")
    : null;
  const editorialAssets =
    manifest.request.renderProfile === "editorial_v1"
      ? await loadVoxyEditorialCompositionEmbeddedAssets(repositoryRoot)
      : null;

  const finalSegment = sanitizeDirectorySegment(manifest.job.jobId);
  const finalDirectory = resolve(outputRoot, finalSegment);
  const relativeFinal = relative(outputRoot, finalDirectory);
  if (!relativeFinal || relativeFinal.startsWith("..") || relativeFinal.includes(`${sep}..${sep}`)) {
    throw new Error("final_output_path_outside_root");
  }

  const recovered = await recoverExistingOutput({
    finalDirectory,
    finalSegment,
    job: manifest.job,
    width: dimensions.width,
    height: dimensions.height,
    expectedDurationMs,
  });
  if (recovered) {
    console.log(JSON.stringify(recovered));
    return;
  }

  const stagingDirectory = await mkdtemp(join(outputRoot, ".voxy-local-staging-"));
  const framesDirectory = join(stagingDirectory, "frames");
  const captionsVttPath = join(stagingDirectory, "captions.vtt");
  const captionsSrtPath = join(stagingDirectory, "captions.srt");
  const masterPath = join(stagingDirectory, "master.mp4");
  const previewPath = join(stagingDirectory, "preview.webm");
  const analysisWavPath = join(stagingDirectory, "editorial-analysis.wav");
  await mkdir(framesDirectory, { recursive: true });

  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
  try {
    await writeFile(captionsVttPath, buildVtt(manifest.request), "utf8");
    await writeFile(captionsSrtPath, buildSrt(manifest.request), "utf8");

    let editorialLevels: number[] = [];
    if (manifest.request.renderProfile === "editorial_v1") {
      run("ffmpeg", [
        "-y",
        "-i", audioPath,
        "-vn",
        "-ac", "1",
        "-ar", "48000",
        "-c:a", "pcm_s16le",
        analysisWavPath,
      ]);
      editorialLevels = audioLevelsFromWav(await readFile(analysisWavPath), FPS);
      await rm(analysisWavPath, { force: true });
    }

    browser = await chromium.launch({
      headless: true,
      args: typeof process.getuid === "function" && process.getuid() === 0 ? ["--no-sandbox"] : [],
    });
    const context = await browser.newContext({
      viewport: { width: dimensions.width, height: dimensions.height },
      reducedMotion: "no-preference",
    });
    const page = await context.newPage();
    const externalRequests: string[] = [];
    page.on("request", (request) => {
      if (/^https?:/i.test(request.url())) externalRequests.push(request.url());
    });
    const frameCount = Math.round((expectedDurationMs / 1_000) * FPS);
    for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
      const captureTimeMs = Math.round((frameIndex * 1_000) / FPS);
      const html = legacyPlan
        ? renderVoxyCharacterMotionFixtureHtml({
            plan: legacyPlan,
            embeddedStudioAssetUrl: embeddedStudioAssetUrl!,
            embeddedCharacterSvg: embeddedCharacterSvg!,
            captureTimeMs,
          })
        : renderVoxyEditorialCompositionFrameHtml({
            plan: manifest.request.editorialStoryPlan!,
            timeline: manifest.request.editorialTimeline!,
            captions: manifest.request.captionCues,
            assets: editorialAssets!,
            format: manifest.request.format,
            frameIndex,
            amplitude: editorialLevels[frameIndex] ?? 0,
          });
      await page.setContent(html, { waitUntil: "load" });
      if (manifest.request.renderProfile === "editorial_v1" && frameIndex === 0) {
        const compositorState = await page.evaluate(() => ({
          canonicalHeadCount: document.querySelectorAll('[data-head-layer="canonical-alpha-head"]').length,
          canonicalOutsideContribution:
            document.querySelector('[data-head-layer="canonical-alpha-head"]')?.getAttribute(
              "data-head-alpha-outside-contribution",
            ) ?? null,
          canonicalBodyCount: document.querySelectorAll(".canonical-body-master").length,
          legacyNeckPlateCount: document.querySelectorAll(".neck-plate").length,
          editorialRuntime:
            document.querySelector("main.viewport")?.getAttribute("data-editorial-runtime") ?? null,
        }));
        if (
          compositorState.canonicalHeadCount !== 1 ||
          compositorState.canonicalOutsideContribution !== "0" ||
          compositorState.canonicalBodyCount < 1 ||
          compositorState.legacyNeckPlateCount !== 0 ||
          compositorState.editorialRuntime !== "editorial_v1"
        ) {
          throw new Error("editorial_final_canon_compositor_invariant_failed");
        }
      }
      await page.screenshot({
        path: join(framesDirectory, `frame-${String(frameIndex).padStart(6, "0")}.png`),
        type: "png",
        clip: { x: 0, y: 0, width: dimensions.width, height: dimensions.height },
      });
    }
    await context.close();
    await browser.close();
    browser = null;
    if (externalRequests.length > 0) throw new Error("external_request_detected");

    const frameInput = join(framesDirectory, "frame-%06d.png");
    run("ffmpeg", [
      "-y", "-framerate", String(FPS), "-i", frameInput, "-i", audioPath, "-i", captionsVttPath,
      "-map", "0:v:0", "-map", "1:a:0", "-map", "2:s:0",
      "-frames:v", String(frameCount), "-r", String(FPS),
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "160k", "-c:s", "mov_text", "-movflags", "+faststart", "-shortest",
      masterPath,
    ]);
    run("ffmpeg", [
      "-y", "-framerate", String(FPS), "-i", frameInput, "-i", audioPath, "-i", captionsVttPath,
      "-map", "0:v:0", "-map", "1:a:0", "-map", "2:s:0",
      "-frames:v", String(frameCount), "-r", String(FPS),
      "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "32", "-deadline", "realtime", "-cpu-used", "7",
      "-pix_fmt", "yuv420p", "-c:a", "libopus", "-b:a", "128k", "-c:s", "webvtt", "-shortest",
      previewPath,
    ]);

    await rm(framesDirectory, { recursive: true, force: true });
    const storagePrefix = finalSegment;
    const output: VoxyLocalCompositionOutput = {
      outputId: manifest.job.outputId,
      jobId: manifest.job.jobId,
      identityKey: manifest.job.identityKey,
      inputFingerprint: manifest.job.inputFingerprint,
      reviewBindingHash: manifest.job.reviewBindingHash,
      timelineHash: manifest.job.timelineHash,
      format: manifest.job.format,
      renderProfile: manifest.job.renderProfile,
      locale: manifest.job.locale,
      previewReviewFlowId: manifest.job.previewReviewFlowId,
      decisionGateId: manifest.job.decisionGateId,
      dossierRefId: manifest.job.dossierRefId,
      masterMp4: await mediaFile({
        path: masterPath,
        storageKey: `${storagePrefix}/master.mp4`,
        mimeType: "video/mp4",
        requireVideo: true,
        expectedWidth: dimensions.width,
        expectedHeight: dimensions.height,
        expectedDurationMs,
        requireAudio: true,
        requireSubtitle: true,
      }),
      previewWebm: await mediaFile({
        path: previewPath,
        storageKey: `${storagePrefix}/preview.webm`,
        mimeType: "video/webm",
        requireVideo: true,
        expectedWidth: dimensions.width,
        expectedHeight: dimensions.height,
        expectedDurationMs,
        requireAudio: true,
        requireSubtitle: true,
      }),
      captionsVtt: await mediaFile({
        path: captionsVttPath,
        storageKey: `${storagePrefix}/captions.vtt`,
        mimeType: "text/vtt",
      }),
      captionsSrt: await mediaFile({
        path: captionsSrtPath,
        storageKey: `${storagePrefix}/captions.srt`,
        mimeType: "application/x-subrip",
      }),
      createdAt: new Date().toISOString(),
      reviewStatus: "needs_review",
      reviewRequired: true,
      publicAsset: false,
      uploaded: false,
      scheduled: false,
      socialPosted: false,
      published: false,
    };
    const validation = validateVoxyLocalCompositionOutput({ job: manifest.job, output });
    if (validation.length) throw new Error(`worker_output_invalid:${validation.join(",")}`);

    const outputManifest: OutputManifest = {
      schemaVersion: "voxy-local-composition-output-v1",
      canon: finalVoxyCanonBinding(),
      output,
      externalRequestCount: 0,
      ffmpegShellInterpolationUsed: false,
      lipSyncUsed: false,
      externalAvatarProviderUsed: false,
    };
    await writeFile(
      join(stagingDirectory, "composition-manifest.json"),
      `${JSON.stringify(outputManifest, null, 2)}\n`,
      "utf8",
    );
    await rename(stagingDirectory, finalDirectory);

    const result: VoxyLocalCompositionExecutionResult = {
      output,
      externalRequestCount: 0,
      ffmpegShellInterpolationUsed: false,
      lipSyncUsed: false,
      externalAvatarProviderUsed: false,
    };
    console.log(JSON.stringify(result));
  } catch (error) {
    if (browser) await browser.close().catch(() => undefined);
    await rm(stagingDirectory, { recursive: true, force: true });
    throw error;
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "unknown_worker_error";
  console.error(`VOXY_LOCAL_COMPOSITION_WORKER_FAILED:${message}`);
  process.exitCode = 1;
});
