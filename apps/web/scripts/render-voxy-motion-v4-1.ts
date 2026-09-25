import { chromium, type Page } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { VOXY_FIRST_EXPLAINER_STUDIO_LOCKUP_PATH } from "../src/features/voxyVideo/firstExplainerVideo";
import {
  buildVoxyMotionV41Plan,
  buildVoxyMotionV41Srt,
  buildVoxyMotionV41Vtt,
  validateVoxyMotionV41Plan,
  VOXY_MOTION_V41_STANDFRAMES,
} from "../src/features/voxyVideo/motionV41";
import {
  buildVoxyMotionV41FrameState,
  renderVoxyMotionV41FrameHtml,
  type VoxyMotionV41EmbeddedAssets,
} from "../src/features/voxyVideo/motionV41Html";
import { VOXY_MOUTH_V41_GATE_OUTPUT } from "../src/features/voxyVideo/mouthV41Gate";
import { VOXY_POCKET_MARK_COMPOSITION_SOURCE } from "../src/features/voxyVideo/pocketMarkFinalGate";
import { VOXY_STATIC_CANON_NATIVE_ASSETS } from "../src/features/voxyVideo/staticCanonRecovery";
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

async function setHtml(page: Page, html: string): Promise<void> {
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images).map((image) => image.decode()));
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
}

function ffprobe(file: string): {
  streams: Array<Record<string, string>>;
  format: Record<string, string>;
} {
  return JSON.parse(
    run("ffprobe", [
      "-v",
      "error",
      "-show_streams",
      "-show_format",
      "-of",
      "json",
      file,
    ]),
  ) as {
    streams: Array<Record<string, string>>;
    format: Record<string, string>;
  };
}

async function renderContactSheet(input: {
  files: string[];
  output: string;
}): Promise<void> {
  run("ffmpeg", [
    "-y",
    ...input.files.flatMap((file) => ["-i", file]),
    "-filter_complex",
    "[0:v]scale=384:216[a];[1:v]scale=384:216[b];[2:v]scale=384:216[c];[3:v]scale=384:216[d];[4:v]scale=384:216[e];[a][b][c][d][e]hstack=inputs=5",
    "-frames:v",
    "1",
    input.output,
  ]);
}

async function main(): Promise<void> {
  const exactHeadSha = process.env.VOXY_MOTION_V41_COMMIT_SHA?.trim() ?? "";
  if (!/^[0-9a-f]{40}$/.test(exactHeadSha)) {
    throw new Error("VOXY_MOTION_V41_COMMIT_SHA_must_be_exact_40_char_sha");
  }
  const repositoryRoot = path.resolve(import.meta.dirname, "../../..");
  const currentHead = run("git", ["rev-parse", "HEAD"], repositoryRoot);
  if (currentHead !== exactHeadSha) {
    throw new Error(`exact_head_mismatch:${currentHead}:${exactHeadSha}`);
  }
  const allowDirty = argument("allow-dirty") === "true";
  const evidenceInputs = [
    ".github/workflows/voxy-mouth-motion-v4-1-evidence.yml",
    "apps/web/scripts/render-voxy-mouth-v4-1-gate.ts",
    "apps/web/scripts/render-voxy-motion-v4-1.ts",
    "apps/web/src/features/voxyVideo/motionV4.ts",
    "apps/web/src/features/voxyVideo/motionV4Html.ts",
    "apps/web/src/features/voxyVideo/canonicalAlphaHeadRelativeFaceRigHtml.ts",
    "apps/web/src/features/voxyVideo/headAlphaSilhouette.ts",
    "apps/web/src/features/voxyVideo/motionV41.ts",
    "apps/web/src/features/voxyVideo/motionV41Html.ts",
    "apps/web/src/features/voxyVideo/mouthRig.ts",
    "apps/web/src/features/voxyVideo/mouthV41.ts",
    "apps/web/src/features/voxyVideo/mouthV41Gate.ts",
    "apps/web/src/features/voxyVideo/headRelativeFaceRigHtml.ts",
    VOXY_CANONICAL_CLEAN_STUDIO_BACKGROUND.repositoryPath,
    VOXY_POCKET_MARK_COMPOSITION_SOURCE.repositoryPath,
    VOXY_STATIC_CANON_NATIVE_ASSETS.lapelPin,
    VOXY_STATIC_CANON_NATIVE_ASSETS.edebattePocketMark,
  ];
  const dirtyInputs = run(
    "git",
    ["status", "--porcelain", "--", ...evidenceInputs],
    repositoryRoot,
  );
  if (dirtyInputs && !allowDirty) {
    throw new Error(
      `exact_head_motion_v4_1_inputs_dirty:${dirtyInputs.replaceAll("\n", ",")}`,
    );
  }

  const plan = buildVoxyMotionV41Plan(exactHeadSha);
  const errors = validateVoxyMotionV41Plan(plan);
  if (errors.length) throw new Error(`motion_v4_1_plan_invalid:${errors.join(",")}`);

  const mouthManifestPath = path.resolve(
    repositoryRoot,
    VOXY_MOUTH_V41_GATE_OUTPUT.outputDirectory,
    VOXY_MOUTH_V41_GATE_OUTPUT.manifestFileName,
  );
  const mouthManifest = JSON.parse(await readFile(mouthManifestPath, "utf8")) as {
    exactHeadSha?: string;
    technicalMouthShapeGate?: string;
    mouth?: {
      architectureChanged?: boolean;
      anchorChanged?: boolean;
      pivotChanged?: boolean;
      headBindingChanged?: boolean;
      slightOpenPolished?: boolean;
      speakingOpenPolished?: boolean;
      transitionPolished?: boolean;
      anchorType?: string;
      sharedAnchor?: boolean;
      sharedPivot?: boolean;
      canvasRelativePositioning?: boolean;
    };
  };
  if (
    mouthManifest.exactHeadSha !== exactHeadSha ||
    mouthManifest.technicalMouthShapeGate !== "passed" ||
    mouthManifest.mouth?.architectureChanged !== false ||
    mouthManifest.mouth.anchorChanged !== false ||
    mouthManifest.mouth.pivotChanged !== false ||
    mouthManifest.mouth.headBindingChanged !== false ||
    mouthManifest.mouth.slightOpenPolished !== true ||
    mouthManifest.mouth.speakingOpenPolished !== true ||
    mouthManifest.mouth.transitionPolished !== true ||
    mouthManifest.mouth.anchorType !== "head_relative" ||
    mouthManifest.mouth.sharedAnchor !== true ||
    mouthManifest.mouth.sharedPivot !== true ||
    mouthManifest.mouth.canvasRelativePositioning !== false
  ) {
    throw new Error("motion_v4_1_blocked_by_mouth_shape_gate");
  }

  const outputRoot = path.resolve(
    repositoryRoot,
    argument("output") ?? plan.output.motionOutputDirectory,
  );
  await rm(outputRoot, { recursive: true, force: true });
  const framesRoot = path.resolve(outputRoot, ".frames-temp");
  const standframesRoot = path.resolve(outputRoot, "standframes");
  await mkdir(framesRoot, { recursive: true });
  await mkdir(standframesRoot, { recursive: true });

  const sourcePaths = {
    canonStage: path.resolve(
      repositoryRoot,
      VOXY_POCKET_MARK_COMPOSITION_SOURCE.repositoryPath,
    ),
    cleanStudioBackground: path.resolve(
      repositoryRoot,
      VOXY_CANONICAL_CLEAN_STUDIO_BACKGROUND.repositoryPath,
    ),
    studioLockup: path.resolve(
      repositoryRoot,
      VOXY_FIRST_EXPLAINER_STUDIO_LOCKUP_PATH,
    ),
    lapelPin: path.resolve(repositoryRoot, VOXY_STATIC_CANON_NATIVE_ASSETS.lapelPin),
    edebattePocketMark: path.resolve(
      repositoryRoot,
      VOXY_STATIC_CANON_NATIVE_ASSETS.edebattePocketMark,
    ),
  };
  const assets: VoxyMotionV41EmbeddedAssets = {
    canonStageDataUrl: dataUrl(await readFile(sourcePaths.canonStage), "image/png"),
    canonicalCleanStudioBackgroundDataUrl: dataUrl(
      await readFile(sourcePaths.cleanStudioBackground),
      "image/svg+xml",
    ),
    studioLockupDataUrl: dataUrl(
      await readFile(sourcePaths.studioLockup),
      "image/svg+xml",
    ),
    lapelPinDataUrl: dataUrl(await readFile(sourcePaths.lapelPin), "image/svg+xml"),
    edebattePocketMarkDataUrl: dataUrl(
      await readFile(sourcePaths.edebattePocketMark),
      "image/svg+xml",
    ),
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    colorScheme: "dark",
  });
  const page = await context.newPage();
  const externalRequests: string[] = [];
  page.on("request", (request) => {
    if (/^https?:/i.test(request.url())) externalRequests.push(request.url());
  });

  const frameCache = new Map<string, string>();
  let chromiumRenderedFrameCount = 0;
  for (let frameIndex = 0; frameIndex < plan.output.frameCount; frameIndex += 1) {
    const outputFile = path.resolve(
      framesRoot,
      `frame-${String(frameIndex).padStart(4, "0")}.png`,
    );
    const state = buildVoxyMotionV41FrameState({ plan, frameIndex });
    const cached = frameCache.get(state.visualStateKey);
    if (cached) {
      await copyFile(cached, outputFile);
      continue;
    }
    await setHtml(page, renderVoxyMotionV41FrameHtml({ plan, assets, frameIndex }));
    await page.locator(".viewport").screenshot({ path: outputFile, type: "png" });
    frameCache.set(state.visualStateKey, outputFile);
    chromiumRenderedFrameCount += 1;
    if (chromiumRenderedFrameCount % 25 === 0) {
      console.info(`render_progress:unique_states=${chromiumRenderedFrameCount}`);
    }
  }

  const mp4Path = path.resolve(outputRoot, plan.output.mp4FileName);
  const webmPath = path.resolve(outputRoot, plan.output.webmFileName);
  console.info("render_progress:encode_mp4");
  run("ffmpeg", [
    "-y",
    "-framerate",
    String(plan.output.fps),
    "-i",
    path.resolve(framesRoot, "frame-%04d.png"),
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "18",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    "-an",
    mp4Path,
  ]);
  console.info("render_progress:encode_webm");
  run("ffmpeg", [
    "-y",
    "-framerate",
    String(plan.output.fps),
    "-i",
    path.resolve(framesRoot, "frame-%04d.png"),
    "-c:v",
    "libvpx-vp9",
    "-b:v",
    "0",
    "-crf",
    "31",
    "-deadline",
    "realtime",
    "-cpu-used",
    "7",
    "-threads",
    "4",
    "-row-mt",
    "1",
    "-pix_fmt",
    "yuv420p",
    "-an",
    webmPath,
  ]);

  const standframes = [];
  for (const standframe of VOXY_MOTION_V41_STANDFRAMES) {
    const frameIndex = Math.floor((standframe.atMs * plan.output.fps) / 1_000);
    const outputFile = path.resolve(standframesRoot, `${standframe.id}.png`);
    await copyFile(
      path.resolve(framesRoot, `frame-${String(frameIndex).padStart(4, "0")}.png`),
      outputFile,
    );
    standframes.push({
      ...standframe,
      frameIndex,
      file: `standframes/${standframe.id}.png`,
      sha256: await fileSha256(outputFile),
    });
  }
  await copyFile(
    path.resolve(standframesRoot, "edebatte.png"),
    path.resolve(outputRoot, plan.output.previewFileName),
  );
  await renderContactSheet({
    files: VOXY_MOTION_V41_STANDFRAMES.map((standframe) =>
      path.resolve(standframesRoot, `${standframe.id}.png`),
    ),
    output: path.resolve(outputRoot, plan.output.contactSheetFileName),
  });
  await writeFile(
    path.resolve(outputRoot, plan.output.captionsVttFileName),
    buildVoxyMotionV41Vtt(),
    "utf8",
  );
  await writeFile(
    path.resolve(outputRoot, plan.output.captionsSrtFileName),
    buildVoxyMotionV41Srt(),
    "utf8",
  );
  await context.close();
  await browser.close();
  if (externalRequests.length) {
    throw new Error(`external_request_detected:${externalRequests.join(",")}`);
  }

  const mp4Probe = ffprobe(mp4Path);
  const webmProbe = ffprobe(webmPath);
  for (const [label, probe] of [
    ["mp4", mp4Probe],
    ["webm", webmProbe],
  ] as const) {
    const video = probe.streams.find((stream) => stream.codec_type === "video");
    const audio = probe.streams.find((stream) => stream.codec_type === "audio");
    if (
      !video ||
      audio ||
      Number(video.width) !== 1920 ||
      Number(video.height) !== 1080 ||
      video.avg_frame_rate !== "24/1" ||
      Math.abs(Number(probe.format.duration) - 22) > 0.05
    ) {
      throw new Error(`${label}_ffprobe_contract_invalid`);
    }
  }

  const sourceAssets = Object.fromEntries(
    await Promise.all(
      Object.entries(sourcePaths).map(async ([id, file]) => [
        id,
        { path: path.relative(repositoryRoot, file), sha256: await fileSha256(file) },
      ]),
    ),
  );
  const manifest = {
    schemaVersion: plan.schemaVersion,
    exactHeadSha,
    sourceMotionV4HeadSha: plan.sourceMotionV4HeadSha,
    sourceStaticHeadSha: plan.staticMasterHeadSha,
    mouthShapeGate: {
      manifest: path.relative(repositoryRoot, mouthManifestPath),
      sha256: await fileSha256(mouthManifestPath),
      technicalMouthShapeGate: "passed",
    },
    durationMs: plan.output.durationMs,
    fps: plan.output.fps,
    frameCount: plan.output.frameCount,
    resolution: { width: plan.output.width, height: plan.output.height },
    media: {
      mp4: {
        file: plan.output.mp4FileName,
        sha256: await fileSha256(mp4Path),
        ffprobe: mp4Probe,
      },
      webm: {
        file: plan.output.webmFileName,
        sha256: await fileSha256(webmPath),
        ffprobe: webmProbe,
      },
      preview: {
        file: plan.output.previewFileName,
        sha256: await fileSha256(path.resolve(outputRoot, plan.output.previewFileName)),
      },
      contactSheet: {
        file: plan.output.contactSheetFileName,
        sha256: await fileSha256(
          path.resolve(outputRoot, plan.output.contactSheetFileName),
        ),
      },
    },
    captions: {
      language: "de",
      burnedIn: true,
      vtt: plan.output.captionsVttFileName,
      srt: plan.output.captionsSrtFileName,
    },
    audioProvenance: plan.audioProvenance,
    brand: plan.brand,
    waveform: plan.waveform,
    mouth: plan.mouth,
    motion: plan.motion,
    characterLock: plan.characterLock,
    timeline: plan.timeline,
    standframes,
    sourceAssets,
    frameRendering: {
      chromiumRenderedFrameCount,
      pixelIdenticalReusedFrameCount:
        plan.output.frameCount - chromiumRenderedFrameCount,
      deterministicStateKey: true,
    },
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
      "hands_remain_clasped_with_exact_v4_micro_gesture",
      "no_audio_because_no_license_clean_local_tts_result_was_available",
      "waveform_is_single_static_embedded_canon_element_without_audio_reactivity",
      "human_review_remains_required_for_mouth_shape_speaking_naturalness_and_transitions",
    ],
  };
  await writeFile(
    path.resolve(outputRoot, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
  await rm(framesRoot, { recursive: true, force: true });
  console.info(
    JSON.stringify(
      {
        status: "voxy_motion_v4_1_rendered",
        exactHeadSha,
        motionArtifact: path.relative(repositoryRoot, outputRoot),
        mp4Sha256: manifest.media.mp4.sha256,
        humanVisualAcceptance: manifest.humanVisualAcceptance,
        productionEligible: false,
        autoPublish: false,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
