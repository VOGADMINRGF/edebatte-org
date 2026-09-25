import { chromium, type Page } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { VOXY_FIRST_EXPLAINER_STUDIO_LOCKUP_PATH } from "../src/features/voxyVideo/firstExplainerVideo";
import { VOXY_FIRST_PARTY_VISIBLE_SCRIPT, VOXY_FIRST_PARTY_VISUAL_BINDING } from "../src/features/voxyVideo/firstPartyVoiceClone";
import { VOXY_JACKET_BRAND_LAYER_GEOMETRY } from "../src/features/voxyVideo/jacketCanonGate";
import { VOXY_POCKET_MARK_COMPOSITION_SOURCE } from "../src/features/voxyVideo/pocketMarkFinalGate";
import { buildVoxyMotionV41Plan } from "../src/features/voxyVideo/motionV41";
import { buildVoxyMotionV4FrameState, renderVoxyMotionV4FrameHtml, type VoxyMotionV4EmbeddedAssets } from "../src/features/voxyVideo/motionV4Html";
import { VOXY_STATIC_CANON_NATIVE_ASSETS } from "../src/features/voxyVideo/staticCanonRecovery";
import { buildVoxyAudioMouthFrame } from "../src/features/voxyVideo/voicedExplainerV1Html";

function argument(name: string): string | null {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function run(binary: string, args: string[], cwd?: string): string {
  const result = spawnSync(binary, args, { cwd, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  if (result.status !== 0 || result.error) throw new Error(`${path.basename(binary)}_failed:${result.error?.message ?? result.stderr.trim()}`);
  return result.stdout.trim();
}

async function sha256(file: string): Promise<string> {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

function dataUrl(buffer: Buffer, mime: string): string {
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

function audioLevelsFromWav(buffer: Buffer, fps: number): number[] {
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") throw new Error("wav_invalid");
  const fmt = buffer.indexOf(Buffer.from("fmt "));
  const data = buffer.indexOf(Buffer.from("data"));
  if (fmt < 0 || data < 0) throw new Error("wav_chunks_missing");
  const channels = buffer.readUInt16LE(fmt + 10);
  const sampleRate = buffer.readUInt32LE(fmt + 12);
  const bits = buffer.readUInt16LE(fmt + 22);
  if (channels !== 1 || sampleRate !== 24_000 || bits !== 16) throw new Error("wav_media_contract_invalid");
  const start = data + 8;
  const samples = Math.floor((buffer.length - start) / 2);
  const frameCount = Math.ceil((samples * fps) / sampleRate);
  const rms = [];
  const halfWindow = Math.round(sampleRate * 0.045);
  for (let frame = 0; frame < frameCount; frame += 1) {
    const center = Math.round(frame * sampleRate / fps);
    const from = Math.max(0, center - halfWindow);
    const to = Math.min(samples, center + halfWindow);
    let sum = 0;
    for (let sample = from; sample < to; sample += 1) {
      const value = buffer.readInt16LE(start + sample * 2) / 32768;
      sum += value * value;
    }
    rms.push(Math.sqrt(sum / Math.max(1, to - from)));
  }
  const sorted = [...rms].sort((a, b) => a - b);
  const reference = sorted[Math.floor(sorted.length * 0.95)] ?? 0.001;
  let smoothed = 0;
  return rms.map((value) => {
    const gated = value < 0.006 ? 0 : Math.min(1, value / Math.max(reference, 0.001));
    smoothed = gated > smoothed ? smoothed * 0.35 + gated * 0.65 : smoothed * 0.62 + gated * 0.38;
    return Math.round(smoothed * 20) / 20;
  });
}

async function setHtml(page: Page, html: string): Promise<void> {
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images).map((image) => image.decode()));
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
}

async function main(): Promise<void> {
  const repositoryRoot = path.resolve(import.meta.dirname, "../../..");
  const exactHeadSha = process.env.VOXY_FIRST_PARTY_VOICE_CLONE_COMMIT_SHA?.trim() ?? "";
  if (!/^[0-9a-f]{40}$/.test(exactHeadSha) || run("git", ["rev-parse", "HEAD"], repositoryRoot) !== exactHeadSha) throw new Error("exact_head_required");
  if (VOXY_JACKET_BRAND_LAYER_GEOMETRY.pocketMark.rotationDegrees !== -2.5) throw new Error("accepted_pocket_mark_drift");
  const outputRoot = path.resolve(repositoryRoot, argument("output") ?? "artifacts/voxy-first-party-voice-clone-private");
  const manifestPath = path.resolve(outputRoot, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
    exactHeadSha: string;
    visibleScript: string;
    firstPartyVoiceCloneGate: string;
    candidates: Array<{
      id: string;
      raw: { timeline: Array<{ id: string; visibleText: string; startMs: number; endMs: number }> };
      finished: { file: string; durationMs: number };
      preview?: Record<string, unknown>;
    }>;
    visual: typeof VOXY_FIRST_PARTY_VISUAL_BINDING;
    productionEligible: boolean;
    autoPublish: boolean;
  };
  if (manifest.exactHeadSha !== exactHeadSha || manifest.visibleScript !== VOXY_FIRST_PARTY_VISIBLE_SCRIPT || manifest.firstPartyVoiceCloneGate !== "ready_for_human_review" || manifest.productionEligible || manifest.autoPublish) throw new Error("private_voice_manifest_gate_failed");
  if (JSON.stringify(manifest.visual) !== JSON.stringify(VOXY_FIRST_PARTY_VISUAL_BINDING)) throw new Error("visual_binding_drift");

  const frozenInputs = [
    VOXY_POCKET_MARK_COMPOSITION_SOURCE.repositoryPath,
    VOXY_STATIC_CANON_NATIVE_ASSETS.lapelPin,
    VOXY_STATIC_CANON_NATIVE_ASSETS.edebattePocketMark,
    "apps/web/src/features/voxyVideo/jacketCanonGate.ts",
    "apps/web/src/features/voxyVideo/mouthRig.ts",
    "apps/web/src/features/voxyVideo/mouthV41.ts",
    "apps/web/src/features/voxyVideo/headRelativeFaceRigHtml.ts",
  ];
  const visualDiff = spawnSync("git", ["diff", "--quiet", VOXY_FIRST_PARTY_VISUAL_BINDING.visualMasterHeadSha, "--", ...frozenInputs], { cwd: repositoryRoot });
  if (visualDiff.status !== 0) throw new Error("frozen_visual_master_mutated");

  const sourcePaths = {
    canonStage: path.resolve(repositoryRoot, VOXY_POCKET_MARK_COMPOSITION_SOURCE.repositoryPath),
    studioLockup: path.resolve(repositoryRoot, VOXY_FIRST_EXPLAINER_STUDIO_LOCKUP_PATH),
    lapelPin: path.resolve(repositoryRoot, VOXY_STATIC_CANON_NATIVE_ASSETS.lapelPin),
    edebattePocketMark: path.resolve(repositoryRoot, VOXY_STATIC_CANON_NATIVE_ASSETS.edebattePocketMark),
  };
  const assets: VoxyMotionV4EmbeddedAssets = {
    canonStageDataUrl: dataUrl(await readFile(sourcePaths.canonStage), "image/png"),
    studioLockupDataUrl: dataUrl(await readFile(sourcePaths.studioLockup), "image/svg+xml"),
    lapelPinDataUrl: dataUrl(await readFile(sourcePaths.lapelPin), "image/svg+xml"),
    edebattePocketMarkDataUrl: dataUrl(await readFile(sourcePaths.edebattePocketMark), "image/svg+xml"),
  };
  const motionPlan = buildVoxyMotionV41Plan(exactHeadSha).baseMotionPlan;
  const fps = 24;
  const previewDurationMs = 12_000;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: "dark" });
  const page = await context.newPage();
  const externalRequests: string[] = [];
  page.on("request", (request) => { if (/^https?:/i.test(request.url())) externalRequests.push(request.url()); });

  for (const candidate of manifest.candidates) {
    const candidateRoot = path.resolve(outputRoot, candidate.id);
    const framesRoot = path.resolve(candidateRoot, ".preview-frames");
    await rm(framesRoot, { recursive: true, force: true });
    await mkdir(framesRoot, { recursive: true });
    const finishedPath = path.resolve(outputRoot, candidate.finished.file);
    const levels = audioLevelsFromWav(await readFile(finishedPath), fps);
    const frameCount = Math.min(levels.length, Math.ceil(previewDurationMs * fps / 1_000));
    const cache = new Map<string, string>();
    for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
      const atMs = frameIndex * 1_000 / fps;
      const sourceFrameIndex = frameIndex % motionPlan.output.frameCount;
      const sourceState = buildVoxyMotionV4FrameState({ plan: motionPlan, frameIndex: sourceFrameIndex });
      const mouth = buildVoxyAudioMouthFrame(levels[frameIndex] ?? 0);
      const segment = candidate.raw.timeline.find((entry) => atMs >= entry.startMs && atMs < entry.endMs) ?? candidate.raw.timeline.at(-1)!;
      const key = `${sourceState.visualStateKey}:${mouth.mouthState}:${mouth.mouthNextState}:${mouth.mouthMix}:${mouth.amplitude}:${segment.id}`;
      const outputFile = path.resolve(framesRoot, `frame-${String(frameIndex).padStart(5, "0")}.png`);
      const cached = cache.get(key);
      if (cached) {
        await copyFile(cached, outputFile);
        continue;
      }
      await setHtml(page, renderVoxyMotionV4FrameHtml({
        plan: motionPlan,
        assets,
        frameIndex: sourceFrameIndex,
        displayFrameIndex: frameIndex,
        mouthProfile: "v4.1",
        mouthOverride: { mouthState: mouth.mouthState, mouthNextState: mouth.mouthNextState, mouthMix: mouth.mouthMix },
        waveformAmplitude: mouth.amplitude,
        editorialOverride: { kicker: "VOXY · FIRST-PARTY VOICE", title: "Voxy erklärt", brand: "VoiceOpenGov", caption: segment.visibleText.replaceAll("\n", " ") },
      }));
      await page.locator(".viewport").screenshot({ path: outputFile, type: "png" });
      cache.set(key, outputFile);
    }
    const previewPath = path.resolve(candidateRoot, "preview.mp4");
    run("ffmpeg", ["-y", "-nostdin", "-hide_banner", "-loglevel", "error", "-framerate", String(fps), "-i", path.resolve(framesRoot, "frame-%05d.png"), "-i", finishedPath, "-t", String(previewDurationMs / 1_000), "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", "-shortest", previewPath]);
    const probe = JSON.parse(run("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", previewPath])) as { streams: Array<Record<string, string>>; format: Record<string, string> };
    const video = probe.streams.find((stream) => stream.codec_type === "video");
    const audio = probe.streams.find((stream) => stream.codec_type === "audio");
    if (!video || !audio || Number(video.width) !== 1920 || Number(video.height) !== 1080 || video.avg_frame_rate !== "24/1") throw new Error(`preview_media_gate_failed:${candidate.id}`);
    candidate.preview = { file: `${candidate.id}/preview.mp4`, sha256: await sha256(previewPath), durationMs: Math.round(Number(probe.format.duration) * 1_000), resolution: { width: 1920, height: 1080 }, fps, audioReactiveMouth: true, audioReactiveWaveform: true, waveformCount: 1, visualMasterMutated: false, captionSource: "exact_visible_script_prefix", fullCandidateAudio: false };
    await rm(framesRoot, { recursive: true, force: true });
  }
  await context.close();
  await browser.close();
  if (externalRequests.length) throw new Error(`external_visual_request_detected:${externalRequests.join(",")}`);
  (manifest as Record<string, unknown>).previews = { status: "pass", frozenVisualMaster: true, mouthProfile: "v4.1", mouthShapesChanged: false, mouthAnchorChanged: false, mouthPivotChanged: false, waveformCount: 1, externalRequests: 0, previewIsTwelveSecondExcerpt: true };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.info(JSON.stringify({ status: "private_first_party_previews_rendered", exactHeadSha, candidates: manifest.candidates.map((candidate) => candidate.preview), humanAudioAcceptance: "pending", productionEligible: false, autoPublish: false }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
