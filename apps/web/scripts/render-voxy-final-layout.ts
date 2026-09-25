import { chromium, type Page } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, copyFile, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  VOXY_FINAL_LAYOUT_OUTPUT,
  VOXY_FINAL_LAYOUT_VOG_PIN_PATH,
  VOXY_SIGNATURE,
  buildVoxyDemocracyBroadcastMeta,
  buildVoxyFinalLayoutPlan,
  validateVoxyFinalLayoutPlan,
} from "../src/features/voxyVideo";
import { renderVoxyDualVoicePilotFrameHtml } from "../src/features/voxyVideo/dualVoiceExplainerPilotHtml";
import { VOXY_FIRST_EXPLAINER_STUDIO_LOCKUP_PATH } from "../src/features/voxyVideo/firstExplainerVideo";
import { VOXY_POCKET_MARK_COMPOSITION_SOURCE } from "../src/features/voxyVideo/pocketMarkFinalGate";
import { VOXY_STATIC_CANON_NATIVE_ASSETS } from "../src/features/voxyVideo/staticCanonRecovery";
import type { VoxyMotionV4EmbeddedAssets } from "../src/features/voxyVideo/motionV4Html";

type Probe = { streams: Array<Record<string, string>>; format: Record<string, string> };
type SourceManifest = Readonly<{
  artifactId: string;
  exactHeadSha: string;
  speakerTimeline: readonly {
    id: string;
    start: number;
    end: number;
    speakerRole: string;
    voiceId: string;
    text: string;
  }[];
  visualStateTimeline: readonly { state: string }[];
  files: {
    masterAudio: { file: string; sha256: string };
    captionsVtt: { file: string; sha256: string };
    captionsSrt: { file: string; sha256: string };
  };
}>;

const CANONICAL_SOURCE_ARTIFACT = "voxy-democracy-pilot-v1-3-single-voice-e6363026303b";
const CANONICAL_SOURCE_AUDIO_SHA256 = "6e3182db9d7fc01d0cdcb69c625f6a8457b494518f884cdfc29f449323e0f09d";

function argument(name: string): string | null {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function run(binary: string, args: string[], cwd?: string): string {
  const result = spawnSync(binary, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
  });
  if (result.status !== 0 || result.error) {
    throw new Error(`${path.basename(binary)}_failed:${result.error?.message ?? result.stderr.trim()}`);
  }
  return result.stdout.trim();
}

async function sha256(file: string): Promise<string> {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

function ffprobe(file: string): Probe {
  return JSON.parse(run("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", file])) as Probe;
}

function privacySafeProbe(probe: Probe): Probe {
  return {
    ...probe,
    format: {
      ...probe.format,
      ...(probe.format.filename ? { filename: path.basename(probe.format.filename) } : {}),
    },
  };
}

function dataUrl(buffer: Buffer, mime: string): string {
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

async function setHtml(page: Page, html: string): Promise<void> {
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images).map((image) => image.decode()));
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

function audioLevelsFromWav(buffer: Buffer, fps: number): number[] {
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") throw new Error("source_master_wav_invalid");
  const fmt = buffer.indexOf(Buffer.from("fmt "));
  const data = buffer.indexOf(Buffer.from("data"));
  if (fmt < 0 || data < 0) throw new Error("source_master_wav_chunks_missing");
  const channels = buffer.readUInt16LE(fmt + 10);
  const sampleRate = buffer.readUInt32LE(fmt + 12);
  const bits = buffer.readUInt16LE(fmt + 22);
  if (channels !== 1 || sampleRate !== 48_000 || bits !== 16) throw new Error("source_master_wav_pcm_contract_invalid");
  const start = data + 8;
  const samples = Math.floor((buffer.length - start) / 2);
  const frameCount = Math.ceil((samples * fps) / sampleRate);
  const values: number[] = [];
  const halfWindow = Math.round(sampleRate * 0.042);
  for (let frame = 0; frame < frameCount; frame += 1) {
    const center = Math.round((frame * sampleRate) / fps);
    let sum = 0;
    const from = Math.max(0, center - halfWindow);
    const to = Math.min(samples, center + halfWindow);
    for (let index = from; index < to; index += 1) {
      const sample = buffer.readInt16LE(start + index * 2) / 32768;
      sum += sample * sample;
    }
    values.push(Math.sqrt(sum / Math.max(1, to - from)));
  }
  const sorted = [...values].sort((a, b) => a - b);
  const reference = sorted[Math.floor(sorted.length * 0.96)] ?? 0.001;
  let smoothed = 0;
  return values.map((value) => {
    const gated = value < 0.004 ? 0 : Math.min(1, value / Math.max(0.001, reference));
    smoothed = gated > smoothed ? smoothed * 0.28 + gated * 0.72 : smoothed * 0.58 + gated * 0.42;
    return Math.round(smoothed * 16) / 16;
  });
}

async function main(): Promise<void> {
  const repositoryRoot = path.resolve(import.meta.dirname, "../../..");
  const exactHeadSha = process.env.VOXY_FINAL_LAYOUT_COMMIT_SHA?.trim() ?? "";
  if (!/^[0-9a-f]{40}$/.test(exactHeadSha)) throw new Error("VOXY_FINAL_LAYOUT_COMMIT_SHA_required");
  if (run("git", ["rev-parse", "HEAD"], repositoryRoot) !== exactHeadSha) throw new Error("exact_head_mismatch");

  const sourceArgument = argument("source");
  const displayDate = argument("display-date");
  if (!sourceArgument || !displayDate) throw new Error("source_and_display_date_required");
  const sourceRoot = path.resolve(repositoryRoot, sourceArgument);
  const sourceReal = await realpath(sourceRoot);
  if (!path.relative(repositoryRoot, sourceReal).startsWith("..")) throw new Error("source_must_resolve_outside_repository");
  const sourceManifestFile = path.resolve(sourceRoot, "manifest.json");
  await access(sourceManifestFile);
  const sourceManifest = JSON.parse(await readFile(sourceManifestFile, "utf8")) as SourceManifest;
  if (sourceManifest.artifactId !== CANONICAL_SOURCE_ARTIFACT || sourceManifest.exactHeadSha !== "e6363026303b83d5ff52a338e917176ed2ad1d48") throw new Error("canonical_single_voice_source_manifest_invalid");
  if (sourceManifest.speakerTimeline.length !== 9 || sourceManifest.speakerTimeline.some((entry) => entry.speakerRole !== "voxy" || entry.voiceId !== VOXY_SIGNATURE.voiceId)) throw new Error("canonical_single_voice_source_speaker_gate_failed");
  if (sourceManifest.visualStateTimeline.map((entry) => entry.state).join(",") !== "HOST,FOCUS,EXPLAIN,DOCK,HOST,FOCUS,EXPLAIN,DOCK,SYNTHESIS,HOST") throw new Error("source_visual_grammar_invalid");

  const sourceMaster = path.resolve(sourceRoot, sourceManifest.files.masterAudio.file);
  const sourceVtt = path.resolve(sourceRoot, sourceManifest.files.captionsVtt.file);
  const sourceSrt = path.resolve(sourceRoot, sourceManifest.files.captionsSrt.file);
  for (const file of [sourceMaster, sourceVtt, sourceSrt]) await access(file);
  if (sourceManifest.files.masterAudio.sha256 !== CANONICAL_SOURCE_AUDIO_SHA256 || await sha256(sourceMaster) !== CANONICAL_SOURCE_AUDIO_SHA256) throw new Error("canonical_single_voice_source_audio_sha_invalid");
  if (await sha256(sourceVtt) !== sourceManifest.files.captionsVtt.sha256 || await sha256(sourceSrt) !== sourceManifest.files.captionsSrt.sha256) throw new Error("source_caption_sha_invalid");

  const speechDurationsMs = sourceManifest.speakerTimeline.map((entry) => Math.round((entry.end - entry.start) * 1_000));
  const plan = buildVoxyFinalLayoutPlan(
    exactHeadSha,
    speechDurationsMs,
    buildVoxyDemocracyBroadcastMeta(displayDate),
  );
  const planErrors = validateVoxyFinalLayoutPlan(plan);
  if (planErrors.length) throw new Error(`final_layout_plan_invalid:${planErrors.join(",")}`);
  if (Math.abs(Number(ffprobe(sourceMaster).format.duration) * 1_000 - plan.output.durationMs) > 2) throw new Error("source_audio_timeline_duration_drift");

  const outputArgument = argument("output") ?? VOXY_FINAL_LAYOUT_OUTPUT.directory;
  const outputRoot = path.resolve(repositoryRoot, outputArgument);
  if (path.basename(outputRoot) !== "v1.4-final-layout") throw new Error("final_layout_output_directory_name_invalid");
  const outputParentReal = await realpath(path.dirname(outputRoot));
  if (!path.relative(repositoryRoot, outputParentReal).startsWith("..")) throw new Error("private_output_parent_must_resolve_outside_repository");
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true, mode: 0o700 });
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "voxy-final-layout-"));
  const framesRoot = path.resolve(temporaryRoot, "frames");
  const standframesRoot = path.resolve(outputRoot, "standframes");
  await Promise.all([mkdir(framesRoot, { recursive: true }), mkdir(standframesRoot, { recursive: true })]);

  try {
    const masterAudio = path.resolve(outputRoot, VOXY_FINAL_LAYOUT_OUTPUT.masterAudio);
    await copyFile(sourceMaster, masterAudio);
    await copyFile(sourceVtt, path.resolve(outputRoot, VOXY_FINAL_LAYOUT_OUTPUT.captionsVtt));
    await copyFile(sourceSrt, path.resolve(outputRoot, VOXY_FINAL_LAYOUT_OUTPUT.captionsSrt));
    if (await sha256(masterAudio) !== CANONICAL_SOURCE_AUDIO_SHA256) throw new Error("copied_master_audio_changed");

    await writeFile(path.resolve(outputRoot, VOXY_FINAL_LAYOUT_OUTPUT.speakerTimeline), `${JSON.stringify(plan.speakerTimeline, null, 2)}\n`, "utf8");
    await writeFile(path.resolve(outputRoot, VOXY_FINAL_LAYOUT_OUTPUT.visualStateTimeline), `${JSON.stringify(plan.visualStateTimeline, null, 2)}\n`, "utf8");
    await writeFile(path.resolve(outputRoot, VOXY_FINAL_LAYOUT_OUTPUT.evidenceTimeline), `${JSON.stringify(plan.evidenceTimeline, null, 2)}\n`, "utf8");
    await writeFile(path.resolve(outputRoot, VOXY_FINAL_LAYOUT_OUTPUT.lowerThirdTimeline), `${JSON.stringify(plan.lowerThirdTimeline, null, 2)}\n`, "utf8");
    const audioPreservation = {
      schemaVersion: "voxy-single-d1-layout-only-audio-reuse-v1.4",
      gate: "passed",
      sourceArtifactId: CANONICAL_SOURCE_ARTIFACT,
      sourceAudioSha256: CANONICAL_SOURCE_AUDIO_SHA256,
      outputAudioSha256: await sha256(masterAudio),
      byteIdentical: true,
      pcmIdentical: true,
      voiceSynthesisPerformed: false,
      audioFiltersApplied: [],
      resamplingApplied: false,
      gainApplied: false,
      dynamicNormalization: false,
      compression: false,
      eqApplied: false,
      pitchChanged: false,
      tempoChanged: false,
      timeStretch: false,
      w1Used: false,
      everySpokenSegmentUsesD1: true,
      productionEligible: false,
      autoPublish: false,
    } as const;
    await writeFile(path.resolve(outputRoot, VOXY_FINAL_LAYOUT_OUTPUT.audioPreservation), `${JSON.stringify(audioPreservation, null, 2)}\n`, "utf8");

    const sourcePaths = {
      canonStage: path.resolve(repositoryRoot, VOXY_POCKET_MARK_COMPOSITION_SOURCE.repositoryPath),
      studioLockup: path.resolve(repositoryRoot, VOXY_FIRST_EXPLAINER_STUDIO_LOCKUP_PATH),
      lapelPin: path.resolve(repositoryRoot, VOXY_FINAL_LAYOUT_VOG_PIN_PATH),
      edebattePocketMark: path.resolve(repositoryRoot, VOXY_STATIC_CANON_NATIVE_ASSETS.edebattePocketMark),
    };
    const assets: VoxyMotionV4EmbeddedAssets = {
      canonStageDataUrl: dataUrl(await readFile(sourcePaths.canonStage), "image/png"),
      studioLockupDataUrl: dataUrl(await readFile(sourcePaths.studioLockup), "image/svg+xml"),
      lapelPinDataUrl: dataUrl(await readFile(sourcePaths.lapelPin), "image/svg+xml"),
      edebattePocketMarkDataUrl: dataUrl(await readFile(sourcePaths.edebattePocketMark), "image/svg+xml"),
    };
    const frozenInputs = [
      VOXY_POCKET_MARK_COMPOSITION_SOURCE.repositoryPath,
      VOXY_FINAL_LAYOUT_VOG_PIN_PATH,
      VOXY_STATIC_CANON_NATIVE_ASSETS.edebattePocketMark,
      "apps/web/src/features/voxyVideo/mouthRig.ts",
      "apps/web/src/features/voxyVideo/mouthV41.ts",
      "apps/web/src/features/voxyVideo/headRelativeFaceRigHtml.ts",
    ];
    if (spawnSync("git", ["diff", "--quiet", plan.visualMasterHeadSha, "--", ...frozenInputs], { cwd: repositoryRoot }).status !== 0) throw new Error("visual_canon_freeze_failed");

    const levels = audioLevelsFromWav(await readFile(masterAudio), plan.output.fps);
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: plan.output.width, height: plan.output.height }, deviceScaleFactor: 1, colorScheme: "dark" });
    const page = await context.newPage();
    const externalRequests: string[] = [];
    page.on("request", (request) => { if (/^https?:/i.test(request.url())) externalRequests.push(request.url()); });
    let renderedFrames = 0;
    console.info(`final_layout_progress:render_${plan.output.frameCount}_frames`);
    for (let frameIndex = 0; frameIndex < plan.output.frameCount; frameIndex += 1) {
      const output = path.resolve(framesRoot, `frame-${String(frameIndex).padStart(5, "0")}.png`);
      if (frameIndex % 2 === 1) {
        await copyFile(path.resolve(framesRoot, `frame-${String(frameIndex - 1).padStart(5, "0")}.png`), output);
        continue;
      }
      await setHtml(page, renderVoxyDualVoicePilotFrameHtml({ plan, assets, frameIndex, amplitude: levels[frameIndex] ?? 0 }));
      await page.locator(".viewport").screenshot({ path: output, type: "png" });
      renderedFrames += 1;
      if (renderedFrames % 80 === 0) console.info(`final_layout_progress:rendered_unique_frames=${renderedFrames}`);
    }
    await context.close();
    await browser.close();
    if (externalRequests.length) throw new Error("external_request_detected_during_render");

    const mp4 = path.resolve(outputRoot, VOXY_FINAL_LAYOUT_OUTPUT.mp4);
    const webm = path.resolve(outputRoot, VOXY_FINAL_LAYOUT_OUTPUT.webm);
    console.info("final_layout_progress:encode_mp4");
    run("ffmpeg", ["-y", "-framerate", "24", "-i", path.resolve(framesRoot, "frame-%05d.png"), "-i", masterAudio, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest", mp4]);
    console.info("final_layout_progress:encode_webm");
    run("ffmpeg", ["-y", "-framerate", "24", "-i", path.resolve(framesRoot, "frame-%05d.png"), "-i", masterAudio, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "32", "-deadline", "good", "-cpu-used", "4", "-threads", "8", "-row-mt", "1", "-pix_fmt", "yuv420p", "-c:a", "libopus", "-b:a", "128k", "-shortest", webm]);

    const states = plan.visualStateTimeline;
    const specs = [
      { id: "01-host-topic-date", at: 1.6 },
      { id: "02-host-stable-lower-third", at: 8 },
      { id: "03-focus-evidence-large", at: (states[1]!.start + states[1]!.end) / 2 },
      { id: "04-explain", at: states[2]!.start + 1 },
      { id: "05-focus-to-upper-right-dock-mid", at: (states[3]!.start + states[3]!.end) / 2 },
      { id: "06-evidence-upper-right-docked", at: states[4]!.start + 0.18 },
      { id: "07-two-evidence-in-memory", at: states[8]!.start + 0.2 },
      { id: "08-three-evidence-in-memory", at: states[9]!.start + 0.3 },
      { id: "09-synthesis", at: (states[8]!.start + states[8]!.end) / 2 },
      { id: "10-final-host", at: Math.min(states[9]!.end - 0.5, states[9]!.start + 7) },
    ];
    const reviewFrames = [];
    for (const spec of specs) {
      const frameIndex = Math.min(plan.output.frameCount - 1, Math.floor(spec.at * plan.output.fps));
      const sourceFrame = frameIndex - (frameIndex % 2);
      const file = path.resolve(standframesRoot, `${spec.id}.png`);
      await copyFile(path.resolve(framesRoot, `frame-${String(sourceFrame).padStart(5, "0")}.png`), file);
      reviewFrames.push({ id: spec.id, at: Number(spec.at.toFixed(3)), frameIndex, file: `standframes/${spec.id}.png`, sha256: await sha256(file) });
    }
    await copyFile(path.resolve(standframesRoot, "10-final-host.png"), path.resolve(outputRoot, VOXY_FINAL_LAYOUT_OUTPUT.preview));
    run("ffmpeg", ["-y", ...reviewFrames.flatMap((entry) => ["-i", path.resolve(outputRoot, entry.file)]), "-filter_complex", "[0:v]scale=360:203[a];[1:v]scale=360:203[b];[2:v]scale=360:203[c];[3:v]scale=360:203[d];[4:v]scale=360:203[e];[5:v]scale=360:203[f];[6:v]scale=360:203[g];[7:v]scale=360:203[h];[8:v]scale=360:203[i];[9:v]scale=360:203[j];[a][b][c][d][e]hstack=inputs=5[top];[f][g][h][i][j]hstack=inputs=5[bottom];[top][bottom]vstack=inputs=2", "-frames:v", "1", path.resolve(outputRoot, VOXY_FINAL_LAYOUT_OUTPUT.contactSheet)]);

    const mp4Probe = ffprobe(mp4);
    const webmProbe = ffprobe(webm);
    for (const [label, probe] of [["mp4", mp4Probe], ["webm", webmProbe]] as const) {
      const video = probe.streams.find((stream) => stream.codec_type === "video");
      const audio = probe.streams.find((stream) => stream.codec_type === "audio");
      const duration = Number(probe.format.duration);
      if (!video || !audio || Number(video.width) !== 1920 || Number(video.height) !== 1080 || video.avg_frame_rate !== "24/1" || duration < 45 || duration > 90) throw new Error(`${label}_technical_media_gate_failed`);
    }
    const files = {
      mp4: { file: VOXY_FINAL_LAYOUT_OUTPUT.mp4, sha256: await sha256(mp4), ffprobe: privacySafeProbe(mp4Probe) },
      webm: { file: VOXY_FINAL_LAYOUT_OUTPUT.webm, sha256: await sha256(webm), ffprobe: privacySafeProbe(webmProbe) },
      masterAudio: { file: VOXY_FINAL_LAYOUT_OUTPUT.masterAudio, sha256: await sha256(masterAudio), ffprobe: privacySafeProbe(ffprobe(masterAudio)) },
      preview: { file: VOXY_FINAL_LAYOUT_OUTPUT.preview, sha256: await sha256(path.resolve(outputRoot, VOXY_FINAL_LAYOUT_OUTPUT.preview)) },
      contactSheet: { file: VOXY_FINAL_LAYOUT_OUTPUT.contactSheet, sha256: await sha256(path.resolve(outputRoot, VOXY_FINAL_LAYOUT_OUTPUT.contactSheet)) },
      captionsVtt: { file: VOXY_FINAL_LAYOUT_OUTPUT.captionsVtt, sha256: await sha256(path.resolve(outputRoot, VOXY_FINAL_LAYOUT_OUTPUT.captionsVtt)) },
      captionsSrt: { file: VOXY_FINAL_LAYOUT_OUTPUT.captionsSrt, sha256: await sha256(path.resolve(outputRoot, VOXY_FINAL_LAYOUT_OUTPUT.captionsSrt)) },
      speakerTimeline: { file: VOXY_FINAL_LAYOUT_OUTPUT.speakerTimeline, sha256: await sha256(path.resolve(outputRoot, VOXY_FINAL_LAYOUT_OUTPUT.speakerTimeline)) },
      visualStateTimeline: { file: VOXY_FINAL_LAYOUT_OUTPUT.visualStateTimeline, sha256: await sha256(path.resolve(outputRoot, VOXY_FINAL_LAYOUT_OUTPUT.visualStateTimeline)) },
      evidenceTimeline: { file: VOXY_FINAL_LAYOUT_OUTPUT.evidenceTimeline, sha256: await sha256(path.resolve(outputRoot, VOXY_FINAL_LAYOUT_OUTPUT.evidenceTimeline)) },
      lowerThirdTimeline: { file: VOXY_FINAL_LAYOUT_OUTPUT.lowerThirdTimeline, sha256: await sha256(path.resolve(outputRoot, VOXY_FINAL_LAYOUT_OUTPUT.lowerThirdTimeline)) },
      audioPreservation: { file: VOXY_FINAL_LAYOUT_OUTPUT.audioPreservation, sha256: await sha256(path.resolve(outputRoot, VOXY_FINAL_LAYOUT_OUTPUT.audioPreservation)) },
    };
    const manifest = {
      schemaVersion: plan.schemaVersion,
      artifactId: `voxy-democracy-pilot-v1-4-final-layout-${exactHeadSha.slice(0, 12)}`,
      exactHeadSha,
      sourceArtifact: { artifactId: CANONICAL_SOURCE_ARTIFACT, exactHeadSha: sourceManifest.exactHeadSha, audioSha256: CANONICAL_SOURCE_AUDIO_SHA256 },
      technicalFinalLayoutGate: "passed",
      format: { width: plan.output.width, height: plan.output.height, fps: plan.output.fps, durationMs: plan.output.durationMs, frameCount: plan.output.frameCount },
      broadcastMeta: plan.broadcastMeta,
      broadcastLayout: plan.broadcastLayout,
      lowerThirdTimeline: plan.lowerThirdTimeline,
      speakerTimeline: plan.speakerTimeline,
      visualStateTimeline: plan.visualStateTimeline,
      evidenceTimeline: plan.evidenceTimeline,
      evidence: plan.evidence,
      captions: plan.captions,
      audioPreservation,
      objectContinuity: plan.objectContinuity,
      mouth: { ...plan.mouth, activeForEverySpokenSegment: true },
      waveform: plan.waveform,
      visualCanon: { frozen: true, visualMasterHeadSha: plan.visualMasterHeadSha, characterRedesign: false, studioRedesign: false },
      rendering: { renderedFrames, duplicatedAdjacentFrames: plan.output.frameCount - renderedFrames, runtimeNetworkRequests: 0, externalVisualUploadUsed: false },
      privacy: { ...plan.privacy, artifactStoredOutsideGitWorktreeViaIgnoredLocalSymlink: true, privateRawReferencesInRepository: false, privateReferencePathsRecorded: false },
      files,
      reviewFrames,
      canonicalNarrationArchitecture: "single_voice_default",
      canonicalVoxyVoice: "D1 Conversational Dynamic",
      humanVoxyVoiceAcceptance: "accepted",
      canonicalEditorialVoice: "W1 Natural Editorial",
      humanEditorialVoiceAcceptance: "accepted_optional_layer",
      w1Used: false,
      humanPilotAcceptance: "pending_final_layout_review",
      humanNews5VisualAcceptance: "pending_final_layout_review",
      productionEligible: false,
      autoPublish: false,
    } as const;
    await writeFile(path.resolve(outputRoot, VOXY_FINAL_LAYOUT_OUTPUT.manifest), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    console.info(JSON.stringify({ status: "FINAL_LAYOUT_TECHNICAL_PASS", exactHeadSha, artifactId: manifest.artifactId, output: outputArgument, mp4, preview: path.resolve(outputRoot, VOXY_FINAL_LAYOUT_OUTPUT.preview), contactSheet: path.resolve(outputRoot, VOXY_FINAL_LAYOUT_OUTPUT.contactSheet), sourceAudioSha256: CANONICAL_SOURCE_AUDIO_SHA256, humanPilotAcceptance: "pending_final_layout_review", humanNews5VisualAcceptance: "pending_final_layout_review", productionEligible: false, autoPublish: false }, null, 2));
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
