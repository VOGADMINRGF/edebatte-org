import { chromium, type Page } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { VOXY_FIRST_EXPLAINER_STUDIO_LOCKUP_PATH } from "../src/features/voxyVideo/firstExplainerVideo";
import { VOXY_LOCAL_TTS_ENGINE, VOXY_LOCAL_TTS_MODEL, VOXY_LOCAL_TTS_OUTPUT, VOXY_LOCAL_TTS_RUNTIME_DEPENDENCIES, VOXY_LOCAL_TTS_VISUAL_MASTER_HEAD, type VoxyLocalTtsResult } from "../src/features/voxyVideo/localTts";
import { buildVoxyMotionV4FrameState, type VoxyMotionV4EmbeddedAssets } from "../src/features/voxyVideo/motionV4Html";
import { VOXY_POCKET_MARK_COMPOSITION_SOURCE } from "../src/features/voxyVideo/pocketMarkFinalGate";
import { VOXY_STATIC_CANON_NATIVE_ASSETS } from "../src/features/voxyVideo/staticCanonRecovery";
import { buildVoxyVoicedExplainerV1Plan, buildVoxyVoicedExplainerV1Srt, buildVoxyVoicedExplainerV1Vtt, mapAudioTimeToV41Frame, validateVoxyVoicedExplainerV1Plan } from "../src/features/voxyVideo/voicedExplainerV1";
import { buildVoxyAudioMouthFrame, renderVoxyVoicedExplainerV1FrameHtml } from "../src/features/voxyVideo/voicedExplainerV1Html";

function argument(name: string): string | null { const prefix = `--${name}=`; return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? null; }
function runResult(binary: string, args: string[], cwd?: string) { return spawnSync(binary, args, { cwd, encoding: "utf8", env: { ...process.env, PIP_NO_INDEX: "1", HF_HUB_OFFLINE: "1" } }); }
function run(binary: string, args: string[], cwd?: string): string { const result = runResult(binary, args, cwd); if (result.status !== 0 || result.error) throw new Error(`${path.basename(binary)}_failed:${result.error?.message ?? result.stderr.trim()}`); return result.stdout.trim(); }
async function sha256(file: string): Promise<string> { return createHash("sha256").update(await readFile(file)).digest("hex"); }
function dataUrl(buffer: Buffer, mime: string): string { return `data:${mime};base64,${buffer.toString("base64")}`; }
function ffprobe(file: string): { streams: Array<Record<string, string>>; format: Record<string, string> } { return JSON.parse(run("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", file])); }
async function setHtml(page: Page, html: string): Promise<void> { await page.setContent(html, { waitUntil: "load" }); await page.evaluate(async () => { await document.fonts.ready; await Promise.all(Array.from(document.images).map((image) => image.decode())); await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); }); }

function audioLevelsFromWav(buffer: Buffer, fps: number): { levels: number[]; sampleRate: number; channels: number } {
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") throw new Error("normalized_wav_invalid");
  const fmtMarker = buffer.indexOf(Buffer.from("fmt "));
  const dataMarker = buffer.indexOf(Buffer.from("data"));
  if (fmtMarker < 0 || dataMarker < 0) throw new Error("normalized_wav_chunks_missing");
  const channels = buffer.readUInt16LE(fmtMarker + 10);
  const sampleRate = buffer.readUInt32LE(fmtMarker + 12);
  const bits = buffer.readUInt16LE(fmtMarker + 22);
  if (channels !== 1 || bits !== 16) throw new Error("normalized_wav_pcm_contract_invalid");
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
    for (let index = start; index < end; index += 1) { const sample = buffer.readInt16LE(dataStart + index * 2) / 32768; sum += sample * sample; }
    rms.push(Math.sqrt(sum / Math.max(1, end - start)));
  }
  const sorted = [...rms].sort((a, b) => a - b);
  const reference = sorted[Math.floor(sorted.length * 0.95)] ?? 0.001;
  let smoothed = 0;
  const levels = rms.map((value) => {
    const gated = value < 0.006 ? 0 : Math.min(1, value / Math.max(reference, 0.001));
    smoothed = gated > smoothed ? smoothed * 0.35 + gated * 0.65 : smoothed * 0.62 + gated * 0.38;
    return Math.round(smoothed * 20) / 20;
  });
  return { levels, sampleRate, channels };
}

async function main(): Promise<void> {
  const repositoryRoot = path.resolve(import.meta.dirname, "../../..");
  const exactHeadSha = process.env.VOXY_LOCAL_TTS_COMMIT_SHA?.trim() ?? "";
  if (!/^[0-9a-f]{40}$/.test(exactHeadSha)) throw new Error("VOXY_LOCAL_TTS_COMMIT_SHA_must_be_exact_40_char_sha");
  const currentHead = run("git", ["rev-parse", "HEAD"], repositoryRoot);
  if (currentHead !== exactHeadSha) throw new Error(`exact_head_mismatch:${currentHead}:${exactHeadSha}`);
  const gateRoot = path.resolve(repositoryRoot, argument("gate") ?? VOXY_LOCAL_TTS_OUTPUT.gateDirectory);
  const gateManifestPath = path.resolve(gateRoot, "manifest.json");
  const gateManifest = JSON.parse(await readFile(gateManifestPath, "utf8")) as {
    exactHeadSha: string; visualMasterHeadSha: string; licenseGateStatus: string;
    audio: { sampleRate: number; channels: number; durationMs: number; peak: number; externalRequestCountDuringRender: number; normalizedFile: { file: string; sha256: string } };
    segmentTiming: VoxyLocalTtsResult["segmentTiming"];
  };
  if (gateManifest.exactHeadSha !== exactHeadSha || gateManifest.visualMasterHeadSha !== VOXY_LOCAL_TTS_VISUAL_MASTER_HEAD || gateManifest.licenseGateStatus !== "pass" || gateManifest.audio.externalRequestCountDuringRender !== 0) throw new Error("voiced_render_blocked_by_tts_gate");
  const normalizedWav = path.resolve(gateRoot, gateManifest.audio.normalizedFile.file);
  if (await sha256(normalizedWav) !== gateManifest.audio.normalizedFile.sha256) throw new Error("normalized_audio_sha_mismatch");
  const ttsResult = {
    wavPath: normalizedWav, durationMs: gateManifest.audio.durationMs, sampleRate: gateManifest.audio.sampleRate, channels: gateManifest.audio.channels,
    segmentTiming: gateManifest.segmentTiming, engineProvenance: VOXY_LOCAL_TTS_ENGINE, voiceProvenance: VOXY_LOCAL_TTS_MODEL,
    modelSha256: VOXY_LOCAL_TTS_MODEL.modelSha256, licenseStatus: "pass", externalRequestCount: 0,
  } as const satisfies VoxyLocalTtsResult;
  const plan = buildVoxyVoicedExplainerV1Plan(exactHeadSha, ttsResult);
  const errors = validateVoxyVoicedExplainerV1Plan(plan);
  if (errors.length) throw new Error(`voiced_plan_invalid:${errors.join(",")}`);

  const frozenInputs = [
    VOXY_POCKET_MARK_COMPOSITION_SOURCE.repositoryPath, VOXY_STATIC_CANON_NATIVE_ASSETS.lapelPin, VOXY_STATIC_CANON_NATIVE_ASSETS.edebattePocketMark,
    "apps/web/src/features/voxyVideo/jacketCanonGate.ts", "apps/web/src/features/voxyVideo/mouthRig.ts", "apps/web/src/features/voxyVideo/mouthV41.ts", "apps/web/src/features/voxyVideo/headRelativeFaceRigHtml.ts",
  ];
  const visualDiff = runResult("git", ["diff", "--quiet", VOXY_LOCAL_TTS_VISUAL_MASTER_HEAD, "--", ...frozenInputs], repositoryRoot);
  if (visualDiff.status !== 0) throw new Error("frozen_visual_master_mutated");
  const evidenceInputs = [".github/workflows/voxy-local-tts-voiced-explainer-v1-evidence.yml", "apps/web/scripts/provision-voxy-local-tts.ts", "apps/web/scripts/render-voxy-local-tts-gate.ts", "apps/web/scripts/render-voxy-voiced-explainer-v1.ts", "apps/web/scripts/lib/voxyLocalTtsAdapter.ts", "apps/web/src/features/voxyVideo/localTts.ts", "apps/web/src/features/voxyVideo/voicedExplainerV1.ts", "apps/web/src/features/voxyVideo/voicedExplainerV1Html.ts", "apps/web/src/features/voxyVideo/motionV4Html.ts", "apps/web/tests/voxy-local-tts-voiced-explainer-v1.contract.test.ts"];
  const dirtyInputs = run("git", ["status", "--porcelain", "--", ...evidenceInputs], repositoryRoot);
  if (dirtyInputs && argument("allow-dirty") !== "true") throw new Error(`exact_head_voiced_inputs_dirty:${dirtyInputs.replaceAll("\n", ",")}`);

  const outputRoot = path.resolve(repositoryRoot, argument("output") ?? VOXY_LOCAL_TTS_OUTPUT.voicedDirectory);
  await rm(outputRoot, { recursive: true, force: true });
  const framesRoot = path.resolve(outputRoot, ".frames-temp");
  const standframesRoot = path.resolve(outputRoot, "standframes");
  await mkdir(framesRoot, { recursive: true }); await mkdir(standframesRoot, { recursive: true });
  const sourcePaths = { canonStage: path.resolve(repositoryRoot, VOXY_POCKET_MARK_COMPOSITION_SOURCE.repositoryPath), studioLockup: path.resolve(repositoryRoot, VOXY_FIRST_EXPLAINER_STUDIO_LOCKUP_PATH), lapelPin: path.resolve(repositoryRoot, VOXY_STATIC_CANON_NATIVE_ASSETS.lapelPin), edebattePocketMark: path.resolve(repositoryRoot, VOXY_STATIC_CANON_NATIVE_ASSETS.edebattePocketMark) };
  const assets: VoxyMotionV4EmbeddedAssets = { canonStageDataUrl: dataUrl(await readFile(sourcePaths.canonStage), "image/png"), studioLockupDataUrl: dataUrl(await readFile(sourcePaths.studioLockup), "image/svg+xml"), lapelPinDataUrl: dataUrl(await readFile(sourcePaths.lapelPin), "image/svg+xml"), edebattePocketMarkDataUrl: dataUrl(await readFile(sourcePaths.edebattePocketMark), "image/svg+xml") };
  const audioData = audioLevelsFromWav(await readFile(normalizedWav), plan.output.fps);
  if (audioData.sampleRate !== VOXY_LOCAL_TTS_MODEL.sampleRate || audioData.channels !== VOXY_LOCAL_TTS_MODEL.channels) throw new Error("audio_level_source_contract_invalid");
  const browser = await chromium.launch({ headless: true, args: typeof process.getuid === "function" && process.getuid() === 0 ? ["--no-sandbox"] : [] });
  const context = await browser.newContext({ viewport: { width: plan.output.width, height: plan.output.height }, deviceScaleFactor: 1, colorScheme: "dark" });
  const page = await context.newPage();
  const externalRequests: string[] = [];
  page.on("request", (request) => { if (/^https?:/i.test(request.url())) externalRequests.push(request.url()); });
  const frameCache = new Map<string, string>();
  let chromiumRenderedFrameCount = 0;
  for (let frameIndex = 0; frameIndex < plan.output.frameCount; frameIndex += 1) {
    const amplitude = audioData.levels[frameIndex] ?? 0;
    const sourceFrameIndex = mapAudioTimeToV41Frame(plan, (frameIndex * 1_000) / plan.output.fps);
    const sourceState = buildVoxyMotionV4FrameState({ plan: plan.baseMotionPlan.baseMotionPlan, frameIndex: sourceFrameIndex });
    const mouth = buildVoxyAudioMouthFrame(amplitude);
    const visualStateKey = `${sourceState.visualStateKey}:${mouth.mouthState}:${mouth.mouthNextState}:${mouth.mouthMix}:${amplitude}`;
    const outputFile = path.resolve(framesRoot, `frame-${String(frameIndex).padStart(5, "0")}.png`);
    const cached = frameCache.get(visualStateKey);
    if (cached) { await copyFile(cached, outputFile); continue; }
    await setHtml(page, renderVoxyVoicedExplainerV1FrameHtml({ plan, assets, frameIndex, amplitude }));
    await page.locator(".viewport").screenshot({ path: outputFile, type: "png" });
    frameCache.set(visualStateKey, outputFile); chromiumRenderedFrameCount += 1;
    if (chromiumRenderedFrameCount % 40 === 0) console.info(`render_progress:unique_states=${chromiumRenderedFrameCount}`);
  }
  await context.close(); await browser.close();
  if (externalRequests.length) throw new Error(`external_request_detected:${externalRequests.join(",")}`);
  const audioPath = path.resolve(outputRoot, VOXY_LOCAL_TTS_OUTPUT.audio);
  await copyFile(normalizedWav, audioPath);
  const mp4Path = path.resolve(outputRoot, VOXY_LOCAL_TTS_OUTPUT.mp4);
  const webmPath = path.resolve(outputRoot, VOXY_LOCAL_TTS_OUTPUT.webm);
  console.info("render_progress:encode_voiced_mp4");
  run("ffmpeg", ["-y", "-framerate", String(plan.output.fps), "-i", path.resolve(framesRoot, "frame-%05d.png"), "-i", audioPath, "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", "-shortest", mp4Path]);
  console.info("render_progress:encode_voiced_webm");
  run("ffmpeg", ["-y", "-framerate", String(plan.output.fps), "-i", path.resolve(framesRoot, "frame-%05d.png"), "-i", audioPath, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "31", "-deadline", "realtime", "-cpu-used", "7", "-threads", "4", "-row-mt", "1", "-pix_fmt", "yuv420p", "-c:a", "libopus", "-b:a", "128k", "-shortest", webmPath]);
  await writeFile(path.resolve(outputRoot, VOXY_LOCAL_TTS_OUTPUT.captionsVtt), buildVoxyVoicedExplainerV1Vtt(plan.timeline), "utf8");
  await writeFile(path.resolve(outputRoot, VOXY_LOCAL_TTS_OUTPUT.captionsSrt), buildVoxyVoicedExplainerV1Srt(plan.timeline), "utf8");
  const standframes = [];
  for (const segment of plan.timeline) {
    const frameIndex = Math.min(plan.output.frameCount - 1, Math.floor((((segment.startMs + segment.endMs) / 2) * plan.output.fps) / 1_000));
    const file = path.resolve(standframesRoot, `${segment.id}.png`);
    await copyFile(path.resolve(framesRoot, `frame-${String(frameIndex).padStart(5, "0")}.png`), file);
    standframes.push({ id: segment.id, atMs: Math.round((segment.startMs + segment.endMs) / 2), frameIndex, file: `standframes/${segment.id}.png`, sha256: await sha256(file) });
  }
  await copyFile(path.resolve(standframesRoot, "edebatte.png"), path.resolve(outputRoot, VOXY_LOCAL_TTS_OUTPUT.preview));
  run("ffmpeg", ["-y", ...standframes.map((entry) => ["-i", path.resolve(outputRoot, entry.file)]).flat(), "-filter_complex", "[0:v]scale=320:180[a];[1:v]scale=320:180[b];[2:v]scale=320:180[c];[3:v]scale=320:180[d];[4:v]scale=320:180[e];[5:v]scale=320:180[f];[a][b][c][d][e][f]hstack=inputs=6", "-frames:v", "1", path.resolve(outputRoot, VOXY_LOCAL_TTS_OUTPUT.contactSheet)]);
  const mp4Probe = ffprobe(mp4Path); const webmProbe = ffprobe(webmPath); const audioProbe = ffprobe(audioPath);
  for (const [label, probe] of [["mp4", mp4Probe], ["webm", webmProbe]] as const) {
    const video = probe.streams.find((stream) => stream.codec_type === "video"); const audio = probe.streams.find((stream) => stream.codec_type === "audio");
    if (!video || !audio || Number(video.width) !== 1920 || Number(video.height) !== 1080 || video.avg_frame_rate !== "24/1" || Math.abs(Number(probe.format.duration) * 1_000 - plan.output.durationMs) > 150) throw new Error(`${label}_ffprobe_contract_invalid`);
  }
  const sourceAssets = Object.fromEntries(await Promise.all(Object.entries(sourcePaths).map(async ([id, file]) => [id, { path: path.relative(repositoryRoot, file), sha256: await sha256(file) }])));
  const manifest = {
    schemaVersion: plan.schemaVersion, exactHeadSha, visualMasterHeadSha: plan.visualMasterHeadSha, durationMs: plan.output.durationMs, fps: plan.output.fps, frameCount: plan.output.frameCount, resolution: { width: plan.output.width, height: plan.output.height },
    tts: { ...plan.tts, runtimeDependencies: VOXY_LOCAL_TTS_RUNTIME_DEPENDENCIES },
    audio: { file: VOXY_LOCAL_TTS_OUTPUT.audio, sha256: await sha256(audioPath), sampleRate: ttsResult.sampleRate, channels: ttsResult.channels, durationMs: ttsResult.durationMs, peak: gateManifest.audio.peak, normalized: true, externalRequestCountDuringRender: externalRequests.length, ffprobe: audioProbe },
    media: { mp4: { file: VOXY_LOCAL_TTS_OUTPUT.mp4, sha256: await sha256(mp4Path), ffprobe: mp4Probe }, webm: { file: VOXY_LOCAL_TTS_OUTPUT.webm, sha256: await sha256(webmPath), ffprobe: webmProbe }, preview: { file: VOXY_LOCAL_TTS_OUTPUT.preview, sha256: await sha256(path.resolve(outputRoot, VOXY_LOCAL_TTS_OUTPUT.preview)) }, contactSheet: { file: VOXY_LOCAL_TTS_OUTPUT.contactSheet, sha256: await sha256(path.resolve(outputRoot, VOXY_LOCAL_TTS_OUTPUT.contactSheet)) } },
    captions: { language: "de", script: plan.script, bakedIntoReviewVideo: true, vtt: VOXY_LOCAL_TTS_OUTPUT.captionsVtt, srt: VOXY_LOCAL_TTS_OUTPUT.captionsSrt, timingSource: "audio_segment_durations" },
    mouth: plan.mouth, waveform: plan.waveform, timeline: plan.timeline, standframes, sourceAssets, visualMasterMutated: plan.visualMasterMutated, frozenVisualDiffAgainstAcceptedBaseline: false,
    frameRendering: { chromiumRenderedFrameCount, pixelIdenticalReusedFrameCount: plan.output.frameCount - chromiumRenderedFrameCount, mouthTimingSource: "audio", waveformEnvelopeSource: "audio.wav" },
    externalVisualUploadUsed: false, paidProviderUsed: false, externalProviderUsed: false, runtimeDownloadRequired: false, runtimeNetworkRequests: 0, exactHeadInputsClean: !dirtyInputs,
    humanAudioAcceptance: plan.humanAudioAcceptance, humanVisualAcceptance: plan.humanVisualAcceptance, productionEligible: false, autoPublish: false,
    knownDeviations: ["voice_quality_and_brand_pronunciation_require_human_audio_acceptance", "mouth_sync_is_smoothed_amplitude_based_not_phoneme_or_word_alignment", "waveform_reactivity_is_a_subtle_overlay_of_the_single_frozen_waveform_region", "GPL_distribution_obligations_require_compliance_review_before_product_packaging"],
  };
  await writeFile(path.resolve(outputRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await rm(framesRoot, { recursive: true, force: true });
  console.info(JSON.stringify({ status: "voxy_voiced_explainer_v1_rendered", exactHeadSha, artifact: path.relative(repositoryRoot, outputRoot), mp4Sha256: manifest.media.mp4.sha256, audioSha256: manifest.audio.sha256, durationMs: manifest.durationMs, runtimeNetworkRequests: 0, humanAudioAcceptance: "pending", humanVisualAcceptance: "accepted", productionEligible: false, autoPublish: false }, null, 2));
}
main().catch((error) => { console.error(error instanceof Error ? error.stack : String(error)); process.exitCode = 1; });
