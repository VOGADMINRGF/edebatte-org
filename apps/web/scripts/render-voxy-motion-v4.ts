import { chromium, type Page } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFile,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { VOXY_FIRST_EXPLAINER_STUDIO_LOCKUP_PATH } from "../src/features/voxyVideo/firstExplainerVideo";
import {
  buildVoxyMotionV4Plan,
  buildVoxyMotionV4Srt,
  buildVoxyMotionV4Vtt,
  validateVoxyMotionV4Plan,
  VOXY_MOTION_V4_LAYERS,
  VOXY_MOTION_V4_STANDFRAMES,
} from "../src/features/voxyVideo/motionV4";
import {
  buildVoxyMotionV4FrameState,
  renderVoxyMotionV4FrameHtml,
  type VoxyMotionV4EmbeddedAssets,
  type VoxyMotionV4Format,
} from "../src/features/voxyVideo/motionV4Html";
import { VOXY_POCKET_MARK_COMPOSITION_SOURCE } from "../src/features/voxyVideo/pocketMarkFinalGate";
import { VOXY_STATIC_CANON_NATIVE_ASSETS } from "../src/features/voxyVideo/staticCanonRecovery";
import { VOXY_MOUTH_CANON_GATE_OUTPUT } from "../src/features/voxyVideo/mouthCanonGate";
import { VOXY_CANONICAL_CLEAN_STUDIO_BACKGROUND } from "../src/features/voxyVideo/headAlphaSilhouette";

function argument(name: string): string | null {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function fileSha256(file: string): Promise<string> {
  return sha256(await readFile(file));
}

function run(binary: string, args: string[], cwd?: string): string {
  const result = spawnSync(binary, args, { cwd, encoding: "utf8" });
  if (result.status !== 0 || result.error) {
    throw new Error(`${binary}_failed:${result.error?.message ?? result.stderr.trim()}`);
  }
  return result.stdout.trim();
}

function dataUrl(buffer: Buffer, mime: string): string {
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

async function settle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images).map((image) => image.decode()));
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
}

async function setHtml(page: Page, html: string): Promise<void> {
  if ((await page.evaluate(() => document.contentType)) !== "text/html") {
    await page.goto("about:blank");
  }
  await page.setContent(html, { waitUntil: "load" });
  await settle(page);
}

function ffprobe(file: string): { streams: Array<Record<string, string>>; format: Record<string, string> } {
  return JSON.parse(run("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", file])) as {
    streams: Array<Record<string, string>>;
    format: Record<string, string>;
  };
}

async function renderFormat(input: {
  page: Page;
  plan: ReturnType<typeof buildVoxyMotionV4Plan>;
  assets: VoxyMotionV4EmbeddedAssets;
  format: Exclude<VoxyMotionV4Format, "16:9">;
  outputRoot: string;
}) {
  const geometry = input.format === "9:16"
    ? { width: 720, height: 1280, file: "safe-frame-9x16.png" }
    : { width: 1080, height: 1080, file: "safe-frame-1x1.png" };
  await input.page.setViewportSize({ width: geometry.width, height: geometry.height });
  const frameIndex = Math.floor((15_500 * input.plan.output.fps) / 1_000);
  await setHtml(input.page, renderVoxyMotionV4FrameHtml({ plan: input.plan, assets: input.assets, frameIndex, format: input.format }));
  const file = path.resolve(input.outputRoot, "safe-crops", geometry.file);
  const bytes = await input.page.locator(".viewport").screenshot({ path: file, type: "png" });
  return { format: input.format, file: `safe-crops/${geometry.file}`, width: geometry.width, height: geometry.height, sha256: sha256(bytes) };
}

async function renderBoard(page: Page, input: { title: string; items: Array<{ label: string; file: string }>; output: string; width?: number; height?: number }) {
  const width = input.width ?? 1920;
  const height = input.height ?? 1080;
  const entries = await Promise.all(input.items.map(async (item) => ({ label: item.label, url: dataUrl(await readFile(item.file), "image/png") })));
  await page.setViewportSize({ width, height });
  const html = `<!doctype html><html><head><style>*{box-sizing:border-box}html,body{margin:0;background:#050a17;color:#fff;font-family:Arial,sans-serif}.board{width:${width}px;height:${height}px;padding:34px;display:flex;flex-direction:column;gap:24px}.title{font-size:30px;font-weight:800}.grid{min-height:0;flex:1;display:grid;grid-template-columns:repeat(5,1fr);gap:14px}.item{min-width:0;min-height:0;display:flex;flex-direction:column;border:1px solid #263a59;background:#071126;padding:8px}.item img{min-height:0;flex:1;width:100%;object-fit:contain;background:repeating-conic-gradient(#152238 0 25%,#0c1628 0 50%) 50%/20px 20px}.item span{padding:7px 4px 2px;font-size:13px;font-weight:700;color:#b9d4ef}</style></head><body><main class="board"><div class="title">${input.title}</div><section class="grid">${entries.map((entry) => `<div class="item"><img src="${entry.url}"><span>${entry.label}</span></div>`).join("")}</section></main></body></html>`;
  await setHtml(page, html);
  return page.screenshot({ path: input.output, type: "png" });
}

async function main(): Promise<void> {
  const exactHeadSha = process.env.VOXY_MOTION_V4_COMMIT_SHA?.trim() ?? "";
  if (!/^[0-9a-f]{40}$/.test(exactHeadSha)) throw new Error("VOXY_MOTION_V4_COMMIT_SHA_must_be_exact_40_char_sha");
  const repositoryRoot = path.resolve(import.meta.dirname, "../../..");
  const currentHead = run("git", ["rev-parse", "HEAD"], repositoryRoot);
  if (currentHead !== exactHeadSha) throw new Error(`exact_head_mismatch:${currentHead}:${exactHeadSha}`);
  const allowDirty = argument("allow-dirty") === "true";
  const evidenceInputs = [
    ".github/workflows/voxy-motion-v4-evidence.yml",
    "apps/web/scripts/render-voxy-motion-v4.ts",
    "apps/web/src/features/voxyVideo/motionV4.ts",
    "apps/web/src/features/voxyVideo/motionV4Html.ts",
    "apps/web/src/features/voxyVideo/canonicalAlphaHeadRelativeFaceRigHtml.ts",
    "apps/web/src/features/voxyVideo/headAlphaSilhouette.ts",
    "apps/web/src/features/voxyVideo/mouthRig.ts",
    "apps/web/src/features/voxyVideo/headRelativeFaceRigHtml.ts",
    VOXY_CANONICAL_CLEAN_STUDIO_BACKGROUND.repositoryPath,
    "apps/web/public/brands/voxy/rig/layers",
    VOXY_POCKET_MARK_COMPOSITION_SOURCE.repositoryPath,
    VOXY_STATIC_CANON_NATIVE_ASSETS.lapelPin,
    VOXY_STATIC_CANON_NATIVE_ASSETS.edebattePocketMark,
  ];
  const dirtyInputs = run("git", ["status", "--porcelain", "--", ...evidenceInputs], repositoryRoot);
  if (dirtyInputs && !allowDirty) throw new Error(`exact_head_motion_inputs_dirty:${dirtyInputs.replaceAll("\n", ",")}`);

  const plan = buildVoxyMotionV4Plan(exactHeadSha);
  const errors = validateVoxyMotionV4Plan(plan);
  if (errors.length) throw new Error(`motion_v4_plan_invalid:${errors.join(",")}`);
  const mouthManifestPath = path.resolve(
    repositoryRoot,
    VOXY_MOUTH_CANON_GATE_OUTPUT.outputDirectory,
    VOXY_MOUTH_CANON_GATE_OUTPUT.manifestFileName,
  );
  const mouthManifest = JSON.parse(await readFile(mouthManifestPath, "utf8")) as {
    exactHeadSha?: string;
    technicalMouthCanonGate?: string;
    mouth?: { anchorType?: string; sharedAnchor?: boolean; sharedPivot?: boolean; canvasRelativePositioning?: boolean };
  };
  if (
    mouthManifest.exactHeadSha !== exactHeadSha ||
    mouthManifest.technicalMouthCanonGate !== "passed" ||
    mouthManifest.mouth?.anchorType !== "head_relative" ||
    mouthManifest.mouth.sharedAnchor !== true ||
    mouthManifest.mouth.sharedPivot !== true ||
    mouthManifest.mouth.canvasRelativePositioning !== false
  ) {
    throw new Error("motion_v4_blocked_by_mouth_canon_gate");
  }
  const motionRoot = path.resolve(repositoryRoot, argument("motion-output") ?? plan.output.motionOutputDirectory);
  const layerRoot = path.resolve(repositoryRoot, argument("layer-output") ?? plan.output.layerOutputDirectory);
  await rm(motionRoot, { recursive: true, force: true });
  await rm(layerRoot, { recursive: true, force: true });
  const framesRoot = path.resolve(motionRoot, ".frames-temp");
  for (const directory of [framesRoot, path.resolve(motionRoot, "standframes"), path.resolve(motionRoot, "hand-crops"), path.resolve(motionRoot, "safe-crops"), path.resolve(layerRoot, "layers")]) {
    await mkdir(directory, { recursive: true });
  }

  const sourcePaths = {
    canonStage: path.resolve(repositoryRoot, VOXY_POCKET_MARK_COMPOSITION_SOURCE.repositoryPath),
    cleanStudioBackground: path.resolve(
      repositoryRoot,
      VOXY_CANONICAL_CLEAN_STUDIO_BACKGROUND.repositoryPath,
    ),
    studioLockup: path.resolve(repositoryRoot, VOXY_FIRST_EXPLAINER_STUDIO_LOCKUP_PATH),
    lapelPin: path.resolve(repositoryRoot, VOXY_STATIC_CANON_NATIVE_ASSETS.lapelPin),
    edebattePocketMark: path.resolve(repositoryRoot, VOXY_STATIC_CANON_NATIVE_ASSETS.edebattePocketMark),
  };
  const assets: VoxyMotionV4EmbeddedAssets = {
    canonStageDataUrl: dataUrl(await readFile(sourcePaths.canonStage), "image/png"),
    canonicalCleanStudioBackgroundDataUrl: dataUrl(
      await readFile(sourcePaths.cleanStudioBackground),
      "image/svg+xml",
    ),
    studioLockupDataUrl: dataUrl(await readFile(sourcePaths.studioLockup), "image/svg+xml"),
    lapelPinDataUrl: dataUrl(await readFile(sourcePaths.lapelPin), "image/svg+xml"),
    edebattePocketMarkDataUrl: dataUrl(await readFile(sourcePaths.edebattePocketMark), "image/svg+xml"),
  };

  const externalRequests: string[] = [];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: "dark" });
  const page = await context.newPage();
  page.on("request", (request) => { if (/^https?:/i.test(request.url())) externalRequests.push(request.url()); });

  const layerEntries = [];
  for (const layer of VOXY_MOTION_V4_LAYERS) {
    const sourceFile = path.resolve(repositoryRoot, layer.sourcePath);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(pathToFileURL(sourceFile).href, { waitUntil: "load" });
    await settle(page);
    const outputFile = path.resolve(layerRoot, "layers", `${layer.id}.png`);
    const bytes = await page.screenshot({ path: outputFile, type: "png", omitBackground: true });
    layerEntries.push({ ...layer, sourceSha256: await fileSha256(sourceFile), transparentRender: `layers/${layer.id}.png`, transparentRenderSha256: sha256(bytes) });
  }
  await renderBoard(page, {
    title: "Voxy Layer Master · 26 local reproducible layers",
    items: layerEntries.map((entry) => ({ label: `${entry.zIndex} · ${entry.id}`, file: path.resolve(layerRoot, entry.transparentRender) })),
    output: path.resolve(layerRoot, "layer-overview.png"),
  });

  const frameCache = new Map<string, string>();
  let chromiumRenderedFrameCount = 0;
  for (let frameIndex = 0; frameIndex < plan.output.frameCount; frameIndex += 1) {
    const outputFile = path.resolve(framesRoot, `frame-${String(frameIndex).padStart(4, "0")}.png`);
    const state = buildVoxyMotionV4FrameState({ plan, frameIndex });
    const cached = frameCache.get(state.visualStateKey);
    if (cached) {
      await copyFile(cached, outputFile);
      continue;
    }
    await page.setViewportSize({ width: 1920, height: 1080 });
    await setHtml(page, renderVoxyMotionV4FrameHtml({ plan, assets, frameIndex }));
    await page.locator(".viewport").screenshot({ path: outputFile, type: "png" });
    frameCache.set(state.visualStateKey, outputFile);
    chromiumRenderedFrameCount += 1;
    if (chromiumRenderedFrameCount % 25 === 0) console.info(`render_progress:unique_states=${chromiumRenderedFrameCount}`);
  }

  const mp4Path = path.resolve(motionRoot, plan.output.mp4FileName);
  const webmPath = path.resolve(motionRoot, plan.output.webmFileName);
  console.info("render_progress:encode_mp4");
  run("ffmpeg", ["-y", "-framerate", String(plan.output.fps), "-i", path.resolve(framesRoot, "frame-%04d.png"), "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", mp4Path]);
  console.info("render_progress:encode_webm");
  run("ffmpeg", ["-y", "-framerate", String(plan.output.fps), "-i", path.resolve(framesRoot, "frame-%04d.png"), "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "31", "-deadline", "realtime", "-cpu-used", "7", "-threads", "4", "-row-mt", "1", "-pix_fmt", "yuv420p", "-an", webmPath]);

  const standframes = [];
  for (const standframe of VOXY_MOTION_V4_STANDFRAMES) {
    const frameIndex = Math.floor((standframe.atMs * plan.output.fps) / 1_000);
    const outputFile = path.resolve(motionRoot, "standframes", `${standframe.id}.png`);
    await copyFile(path.resolve(framesRoot, `frame-${String(frameIndex).padStart(4, "0")}.png`), outputFile);
    standframes.push({ ...standframe, frameIndex, file: `standframes/${standframe.id}.png`, sha256: await fileSha256(outputFile) });
  }
  await copyFile(path.resolve(motionRoot, "standframes/edebatte.png"), path.resolve(motionRoot, plan.output.previewFileName));
  run("ffmpeg", ["-y", ...VOXY_MOTION_V4_STANDFRAMES.flatMap((standframe) => ["-i", path.resolve(motionRoot, "standframes", `${standframe.id}.png`)]), "-filter_complex", "[0:v]scale=384:216[a];[1:v]scale=384:216[b];[2:v]scale=384:216[c];[3:v]scale=384:216[d];[4:v]scale=384:216[e];[a][b][c][d][e]hstack=inputs=5", "-frames:v", "1", path.resolve(motionRoot, plan.output.contactSheetFileName)]);

  const handCrops = [];
  const gestureFrameIndex = Math.floor((6_000 * plan.output.fps) / 1_000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await setHtml(page, renderVoxyMotionV4FrameHtml({ plan, assets, frameIndex: gestureFrameIndex }));
  for (const crop of [{ hand: "left", x: 600, y: 620, width: 190, height: 170 }, { hand: "right", x: 750, y: 620, width: 190, height: 170 }] as const) {
    const file = path.resolve(motionRoot, "hand-crops", `gesture-${crop.hand}.png`);
    const bytes = await page.screenshot({ path: file, type: "png", clip: crop });
    handCrops.push({ hand: crop.hand, file: `hand-crops/gesture-${crop.hand}.png`, sha256: sha256(bytes), pose: "clasped_not_open_palm", detector588Status: "not_run_not_applicable" });
  }
  const safeCrops = [
    await renderFormat({ page, plan, assets, format: "9:16", outputRoot: motionRoot }),
    await renderFormat({ page, plan, assets, format: "1:1", outputRoot: motionRoot }),
  ];

  for (const frame of [
    { file: "neutral.png", frame: 0 },
    { file: "blink.png", frame: Math.round((1_150 * plan.output.fps) / 1_000) },
    { file: "speaking.png", frame: Math.round((15_500 * plan.output.fps) / 1_000) },
    { file: "gesture.png", frame: gestureFrameIndex },
  ]) {
    await copyFile(path.resolve(framesRoot, `frame-${String(frame.frame).padStart(4, "0")}.png`), path.resolve(layerRoot, frame.file));
  }

  await writeFile(path.resolve(motionRoot, plan.output.captionsVttFileName), buildVoxyMotionV4Vtt(), "utf8");
  await writeFile(path.resolve(motionRoot, plan.output.captionsSrtFileName), buildVoxyMotionV4Srt(), "utf8");
  await context.close();
  await browser.close();
  if (externalRequests.length) throw new Error(`external_request_detected:${externalRequests.join(",")}`);

  const mp4Probe = ffprobe(mp4Path);
  const webmProbe = ffprobe(webmPath);
  for (const [label, probe] of [["mp4", mp4Probe], ["webm", webmProbe]] as const) {
    const video = probe.streams.find((stream) => stream.codec_type === "video");
    const audio = probe.streams.find((stream) => stream.codec_type === "audio");
    if (!video || audio || Number(video.width) !== 1920 || Number(video.height) !== 1080 || video.avg_frame_rate !== "24/1" || Math.abs(Number(probe.format.duration) - 22) > 0.05) throw new Error(`${label}_ffprobe_contract_invalid`);
  }

  const layerMasterSha = sha256(layerEntries.map((entry) => `${entry.id}:${entry.sourceSha256}:${entry.transparentRenderSha256}`).join("\n"));
  const sourceAssets = Object.fromEntries(await Promise.all(Object.entries(sourcePaths).map(async ([id, file]) => [id, { path: path.relative(repositoryRoot, file), sha256: await fileSha256(file) }])));
  const layerManifest = {
    schemaVersion: "voxy-layer-master-v1",
    exactHeadSha,
    sourceStaticHeadSha: plan.staticMasterHeadSha,
    layerMasterSha,
    architecture: "additive_pixel_locked_motion_plates_over_accepted_flattened_static_master",
    layers: layerEntries,
    frozen: plan.characterLock.frozen,
    sourceAssets,
    noGenerativeReplacement: true,
    externalVisualUpload: false,
    neutralPosePixelSourceUnchanged: true,
    knownDeviation: "The accepted source is flattened. Transparent source-pixel plates are additive overlays; they are not a hole-filled, independently separated puppet.",
    humanVisualAcceptance: "pending",
    productionEligible: false,
    autoPublish: false,
  };
  await writeFile(path.resolve(layerRoot, "layer-manifest.json"), `${JSON.stringify(layerManifest, null, 2)}\n`, "utf8");

  const motionManifest = {
    schemaVersion: plan.schemaVersion,
    exactHeadSha,
    sourceStaticHeadSha: plan.staticMasterHeadSha,
    layerMasterSha,
    durationMs: plan.output.durationMs,
    fps: plan.output.fps,
    frameCount: plan.output.frameCount,
    resolution: { width: plan.output.width, height: plan.output.height },
    media: {
      mp4: { file: plan.output.mp4FileName, sha256: await fileSha256(mp4Path), ffprobe: mp4Probe },
      webm: { file: plan.output.webmFileName, sha256: await fileSha256(webmPath), ffprobe: webmProbe },
      preview: { file: plan.output.previewFileName, sha256: await fileSha256(path.resolve(motionRoot, plan.output.previewFileName)) },
      contactSheet: { file: plan.output.contactSheetFileName, sha256: await fileSha256(path.resolve(motionRoot, plan.output.contactSheetFileName)) },
    },
    captions: { language: "de", burnedIn: true, vtt: plan.output.captionsVttFileName, srt: plan.output.captionsSrtFileName },
    audioProvenance: plan.audioProvenance,
    brand: plan.brand,
    waveform: plan.waveform,
    mouth: plan.mouth,
    motion: plan.motion,
    characterLock: plan.characterLock,
    timeline: plan.timeline,
    standframes,
    handCrops,
    handQa: plan.handQa,
    safeCrops,
    sourceAssets,
    frameRendering: { chromiumRenderedFrameCount, pixelIdenticalReusedFrameCount: plan.output.frameCount - chromiumRenderedFrameCount, deterministicStateKey: true },
    noGenerativeReplacement: plan.noGenerativeReplacement,
    generativeCharacterAssetsUsed: plan.generativeCharacterAssetsUsed,
    externalProviderUsed: plan.externalProviderUsed,
    externalVisualUploadUsed: plan.externalVisualUploadUsed,
    exactHeadInputsClean: !dirtyInputs,
    humanVisualAcceptance: plan.humanVisualAcceptance,
    productionEligible: plan.productionEligible,
    autoPublish: plan.autoPublish,
    knownDeviations: [
      "accepted_static_master_is_flattened_and_motion_uses_additive_source_pixel_plates",
      "hands_remain_clasped_and_micro_motion_only_so_pr_588_open_palm_detector_is_not_applicable",
      "no_audio_because_no_license_clean_local_tts_result_was_available",
      "waveform_is_single_static_embedded_canon_element_without_audio_reactivity",
      "human_review_remains_required_for_mouth_naturalness_and_motion_timing",
    ],
  };
  await writeFile(path.resolve(motionRoot, "manifest.json"), `${JSON.stringify(motionManifest, null, 2)}\n`, "utf8");
  await rm(framesRoot, { recursive: true, force: true });
  console.info(JSON.stringify({ status: "voxy_motion_v4_rendered", exactHeadSha, layerMasterSha, motionArtifact: path.relative(repositoryRoot, motionRoot), layerArtifact: path.relative(repositoryRoot, layerRoot), mp4Sha256: motionManifest.media.mp4.sha256, humanVisualAcceptance: motionManifest.humanVisualAcceptance, productionEligible: false, autoPublish: false }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
