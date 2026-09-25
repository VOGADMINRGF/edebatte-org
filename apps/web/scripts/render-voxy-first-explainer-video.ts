import { chromium, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  buildVoxyFirstExplainerPlan,
  buildVoxyFirstExplainerSrt,
  buildVoxyFirstExplainerVtt,
  validateVoxyFirstExplainerPlan,
  VOXY_FIRST_EXPLAINER_DETECTOR_HEAD,
  VOXY_FIRST_EXPLAINER_STANDFRAMES,
  VOXY_FIRST_EXPLAINER_STUDIO_LOCKUP_PATH,
} from "../src/features/voxyVideo/firstExplainerVideo";
import {
  buildVoxyFirstExplainerFrameState,
  renderVoxyFirstExplainerFrameHtml,
  VOXY_FIRST_EXPLAINER_MOTION_QUANTIZATION_STEPS,
  type VoxyFirstExplainerEmbeddedAssets,
  type VoxyFirstExplainerFormat,
} from "../src/features/voxyVideo/firstExplainerVideoHtml";
import {
  VOXY_STATIC_CANON_NATIVE_ASSETS,
  VOXY_STATIC_CANON_PIXEL_SOURCE,
} from "../src/features/voxyVideo/staticCanonRecovery";

type DetectorEvidence = {
  detected: boolean;
  fingerCount: number | null;
  confidence: number;
  landmarkCount: number;
  detectorId: string;
  detectorVersion: string;
  runtimeVersion: string;
  modelId: string;
  modelSha256: string;
  detectorProfileSha256: string;
  inputSha256: string;
  normalizedInputSha256: string | null;
  originalRotationDegrees: number | null;
  normalizationApplied: boolean;
  paddingPixels: number;
  normalizationCropLoss: boolean;
  localExecution: boolean;
  licenseStatus: string;
  failureReason: string | null;
};

function argument(name: string): string | null {
  const prefix = `--${name}=`;
  return (
    process.argv
      .slice(2)
      .find((value) => value.startsWith(prefix))
      ?.slice(prefix.length) ?? null
  );
}

function sha256(value: Buffer | Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function fileSha256(path: string): Promise<string> {
  return sha256(await readFile(path));
}

function runBinary(binary: string, args: string[], cwd?: string): string {
  const result = spawnSync(binary, args, { cwd, encoding: "utf8" });
  if (result.error || result.status !== 0) {
    throw new Error(
      `${binary}_failed:${result.error?.message ?? result.stderr.trim()}`,
    );
  }
  return result.stdout.trim();
}

function repositoryPath(repositoryRoot: string, path: string): string {
  const resolved = resolve(repositoryRoot, path);
  if (!resolved.startsWith(`${repositoryRoot}/`)) {
    throw new Error(`repository_path_escape:${path}`);
  }
  return resolved;
}

function dataUrl(buffer: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

function pngDimensions(buffer: Buffer): { width: number; height: number } {
  if (
    buffer.length < 24 ||
    buffer[0] !== 0x89 ||
    buffer.subarray(1, 4).toString("ascii") !== "PNG"
  ) {
    throw new Error("invalid_png_signature");
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

async function setFrameHtml(page: Page, html: string): Promise<void> {
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images).map((image) => image.decode()));
    await new Promise<void>((resolveFrame) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame()));
    });
  });
}

async function updateFrameState(
  page: Page,
  state: {
    frameIndex: number;
    atMs: number;
    opacity: number;
    blink: number;
    gazeX: number;
    gazeY: number;
    motionState: string;
    editorialKicker: string;
    editorialTitle: string;
    editorialRole: string;
    caption: string;
  },
): Promise<void> {
  await page.evaluate(async (next) => {
    const viewport = document.querySelector<HTMLElement>(".viewport");
    const onAirIndicator = document.querySelector<HTMLElement>(".on-air i");
    const cueCopy = document.querySelector<HTMLElement>(".cue-copy");
    const cueKicker = document.querySelector<HTMLElement>(".cue-kicker");
    const cueTitle = document.querySelector<HTMLElement>(".cue-title");
    const cueRole = document.querySelector<HTMLElement>(".cue-role");
    const caption = document.querySelector<HTMLElement>(".caption");
    const portraitCaption =
      document.querySelector<HTMLElement>(".portrait-caption");
    const portraitTitle =
      document.querySelector<HTMLElement>(".portrait-title strong");
    const portraitRole =
      document.querySelector<HTMLElement>(".portrait-title small");
    const eyelids = document.querySelectorAll<HTMLElement>(".eyelid");
    const eyeGlints = document.querySelectorAll<HTMLElement>(".eye-glint");
    if (
      !viewport ||
      !onAirIndicator ||
      !cueCopy ||
      !cueKicker ||
      !cueTitle ||
      !cueRole ||
      !caption ||
      !portraitCaption ||
      !portraitTitle ||
      !portraitRole ||
      eyelids.length !== 2 ||
      eyeGlints.length !== 2
    ) {
      throw new Error("reusable_frame_document_contract_missing");
    }
    viewport.dataset.frameIndex = String(next.frameIndex);
    viewport.dataset.atMs = next.atMs.toFixed(3);
    viewport.dataset.motionState = next.motionState;

    for (const eyelid of eyelids) {
      eyelid.style.opacity = String(next.blink);
    }
    for (const eyeGlint of eyeGlints) {
      eyeGlint.style.transform =
        `translate(${next.gazeX}px,${next.gazeY}px) rotate(-8deg)`;
    }
    onAirIndicator.style.boxShadow =
      `0 0 ${14 + next.opacity * 8}px rgba(0,217,192,.8)`;

    cueCopy.style.opacity = String(next.opacity);
    cueCopy.style.transform =
      `translateY(${Math.round((1 - next.opacity) * 10)}px)`;
    cueKicker.textContent = next.editorialKicker;
    cueTitle.textContent = next.editorialTitle;
    cueRole.textContent = next.editorialRole;

    caption.textContent = next.caption;
    caption.style.opacity = String(next.opacity);
    caption.style.transform =
      `translateY(${Math.round((1 - next.opacity) * 10)}px)`;
    portraitCaption.textContent = next.caption;
    portraitCaption.style.opacity = String(next.opacity);
    portraitTitle.textContent = next.editorialTitle;
    portraitRole.textContent = next.editorialKicker;
    await new Promise<void>((resolveFrame) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame()));
    });
  }, state);
}

async function decodeLocalPng(
  page: Page,
  pngPath: string,
): Promise<{
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
  inputPath: string;
  inputSha256: string;
}> {
  const png = await readFile(pngPath);
  await page.setContent(
    `<canvas id="c"></canvas><img id="i" src="${dataUrl(png, "image/png")}" alt="">`,
    { waitUntil: "load" },
  );
  const decoded = await page.evaluate(() => {
    const image = document.getElementById("i") as HTMLImageElement;
    const canvas = document.getElementById("c") as HTMLCanvasElement;
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("png_canvas_context_unavailable");
    context.drawImage(image, 0, 0);
    return {
      width: canvas.width,
      height: canvas.height,
      rgba: Array.from(
        context.getImageData(0, 0, canvas.width, canvas.height).data,
      ),
    };
  });
  return {
    width: decoded.width,
    height: decoded.height,
    rgba: new Uint8ClampedArray(decoded.rgba),
    inputPath: relative(process.cwd(), pngPath),
    inputSha256: sha256(png),
  };
}

async function loadExactDetector(repositoryRoot: string): Promise<{
  Detector: new (input: {
    modelSha256: string;
    hashBytes: (value: Uint8Array) => string;
  }) => { detect(input: unknown): DetectorEvidence };
  profileSerialized: string;
  isUsable: (evidence: DetectorEvidence) => boolean;
  detectorSourceSha256: string;
  licenseSourceSha256: string;
  cleanup: () => Promise<void>;
}> {
  runBinary("git", [
    "cat-file",
    "-e",
    `${VOXY_FIRST_EXPLAINER_DETECTOR_HEAD}^{commit}`,
  ], repositoryRoot);
  const detectorSource = runBinary(
    "git",
    [
      "show",
      `${VOXY_FIRST_EXPLAINER_DETECTOR_HEAD}:apps/web/src/features/voxyVideo/voxyVisualHandDetector.ts`,
    ],
    repositoryRoot,
  );
  const licenseSource = runBinary(
    "git",
    [
      "show",
      `${VOXY_FIRST_EXPLAINER_DETECTOR_HEAD}:apps/web/src/features/voxyVideo/visualDetectorLicenseContract.ts`,
    ],
    repositoryRoot,
  );
  const temporaryDirectory = await mkdtemp(
    resolve(tmpdir(), "voxy-first-explainer-detector-"),
  );
  const detectorPath = resolve(
    temporaryDirectory,
    "voxyVisualHandDetector.ts",
  );
  await writeFile(
    resolve(temporaryDirectory, "visualDetectorLicenseContract.ts"),
    `${licenseSource}\n`,
    "utf8",
  );
  await writeFile(detectorPath, `${detectorSource}\n`, "utf8");
  const detectorModule = (await import(
    `${pathToFileURL(detectorPath).href}?sha=${VOXY_FIRST_EXPLAINER_DETECTOR_HEAD}`
  )) as {
    VoxyVisualHandDetector: new (input: {
      modelSha256: string;
      hashBytes: (value: Uint8Array) => string;
    }) => { detect(input: unknown): DetectorEvidence };
    VOXY_VISUAL_HAND_DETECTOR_PROFILE_SERIALIZED: string;
  };
  const licenseModule = (await import(
    `${pathToFileURL(resolve(temporaryDirectory, "visualDetectorLicenseContract.ts")).href}?sha=${VOXY_FIRST_EXPLAINER_DETECTOR_HEAD}`
  )) as {
    isUsableVoxyHandDetectionEvidence: (
      evidence: DetectorEvidence,
    ) => boolean;
  };
  return {
    Detector: detectorModule.VoxyVisualHandDetector,
    profileSerialized:
      detectorModule.VOXY_VISUAL_HAND_DETECTOR_PROFILE_SERIALIZED,
    isUsable: licenseModule.isUsableVoxyHandDetectionEvidence,
    detectorSourceSha256: sha256(detectorSource),
    licenseSourceSha256: sha256(licenseSource),
    cleanup: () => rm(temporaryDirectory, { recursive: true, force: true }),
  };
}

async function runHandQa(input: {
  repositoryRoot: string;
  browserPage: Page;
  cropPaths: Array<{ id: string; hand: "left" | "right"; path: string }>;
}) {
  const exactDetector = await loadExactDetector(input.repositoryRoot);
  try {
    const detectorProfileSha256 = sha256(exactDetector.profileSerialized);
    const detector = new exactDetector.Detector({
      modelSha256: detectorProfileSha256,
      hashBytes: (value) => sha256(value),
    });
    const crops = [];
    for (const crop of input.cropPaths) {
      const evidence = detector.detect({
        hand: crop.hand,
        image: await decodeLocalPng(input.browserPage, crop.path),
      });
      const detectorUsable = exactDetector.isUsable(evidence);
      crops.push({
        id: crop.id,
        hand: crop.hand,
        file: relative(process.cwd(), crop.path),
        poseInspectability: "not_open_palm_clasped_hands",
        acceptedForFiveFingerGate: false,
        detectorUsable,
        evidence,
      });
    }
    const accepted = crops.filter(
      (crop) => crop.acceptedForFiveFingerGate,
    ).length;
    return {
      status: "blocked_human_review_required",
      reason:
        "The accepted flattened Primary A shows clasped hands, not separately inspectable open palms. The detector result is retained but cannot establish five visible fingers per hand.",
      detectorExactHeadSha: VOXY_FIRST_EXPLAINER_DETECTOR_HEAD,
      detectorSourceSha256: exactDetector.detectorSourceSha256,
      licenseContractSourceSha256: exactDetector.licenseSourceSha256,
      detectorProfileSha256,
      supportedPose: "rotation_normalized_open_palm_flat_vector",
      thresholdsChanged: false,
      qaExceptionUsed: false,
      staticFiveFallbackUsed: false,
      testedCropCount: crops.length,
      acceptedCropCount: accepted,
      blockedCropCount: crops.length - accepted,
      crops,
    };
  } finally {
    await exactDetector.cleanup();
  }
}

function ffprobe(path: string): {
  streams: Array<Record<string, string>>;
  format: Record<string, string>;
} {
  return JSON.parse(
    runBinary("ffprobe", [
      "-v",
      "error",
      "-show_streams",
      "-show_format",
      "-of",
      "json",
      path,
    ]),
  ) as {
    streams: Array<Record<string, string>>;
    format: Record<string, string>;
  };
}

async function renderFormatEvidence(input: {
  page: Page;
  plan: ReturnType<typeof buildVoxyFirstExplainerPlan>;
  assets: VoxyFirstExplainerEmbeddedAssets;
  outputRoot: string;
  format: Exclude<VoxyFirstExplainerFormat, "16:9">;
}) {
  const geometry =
    input.format === "9:16"
      ? { width: 720, height: 1280, prefix: "9x16" }
      : { width: 1080, height: 1080, prefix: "1x1" };
  await input.page.setViewportSize({
    width: geometry.width,
    height: geometry.height,
  });
  const evidence = [];
  for (const standframe of VOXY_FIRST_EXPLAINER_STANDFRAMES) {
    const frameIndex = Math.floor(
      (standframe.atMs * input.plan.output.fps) / 1_000,
    );
    await setFrameHtml(
      input.page,
      renderVoxyFirstExplainerFrameHtml({
        plan: input.plan,
        assets: input.assets,
        frameIndex,
        format: input.format,
      }),
    );
    const file = `${geometry.prefix}-${standframe.id}.png`;
    const path = resolve(input.outputRoot, "format-evidence", file);
    const bytes = await input.page.locator(".viewport").screenshot({
      path,
      type: "png",
    });
    evidence.push({
      format: input.format,
      standframe: standframe.id,
      file: `format-evidence/${file}`,
      sha256: sha256(bytes),
      width: geometry.width,
      height: geometry.height,
    });
  }
  return evidence;
}

async function main(): Promise<void> {
  const exactHeadSha = process.env.VOXY_EXPLAINER_COMMIT_SHA?.trim() ?? "";
  if (!/^[0-9a-f]{40}$/.test(exactHeadSha)) {
    throw new Error("VOXY_EXPLAINER_COMMIT_SHA_must_be_exact_40_char_sha");
  }
  const webRoot = resolve(import.meta.dirname, "..");
  const repositoryRoot = resolve(webRoot, "../..");
  const currentHead = runBinary("git", ["rev-parse", "HEAD"], repositoryRoot);
  if (currentHead !== exactHeadSha) {
    throw new Error(`exact_head_mismatch:${currentHead}:${exactHeadSha}`);
  }
  const evidenceInputs = [
    ".github/workflows/voxy-first-explainer-video.yml",
    "apps/web/scripts/render-voxy-first-explainer-video.ts",
    "apps/web/src/features/voxyVideo/firstExplainerVideo.ts",
    "apps/web/src/features/voxyVideo/firstExplainerVideoHtml.ts",
    "apps/web/src/features/voxyVideo/staticCanonRecovery.ts",
    "apps/web/public/brands/voxy/references/canon",
    VOXY_FIRST_EXPLAINER_STUDIO_LOCKUP_PATH,
    VOXY_STATIC_CANON_NATIVE_ASSETS.lapelPin,
    VOXY_STATIC_CANON_NATIVE_ASSETS.edebattePocketMark,
  ];
  const dirtyInputs = runBinary(
    "git",
    ["diff", "--name-only", "HEAD", "--", ...evidenceInputs],
    repositoryRoot,
  );
  if (dirtyInputs) {
    throw new Error(
      `exact_head_explainer_inputs_dirty:${dirtyInputs.replaceAll("\n", ",")}`,
    );
  }

  const plan = buildVoxyFirstExplainerPlan(exactHeadSha);
  const planErrors = validateVoxyFirstExplainerPlan(plan);
  if (planErrors.length > 0) {
    throw new Error(`explainer_plan_invalid:${planErrors.join(",")}`);
  }
  const outputRoot = resolve(
    process.cwd(),
    argument("output") ?? plan.output.outputDirectory,
  );
  const framesRoot = resolve(outputRoot, ".frames-temp");
  const standframesRoot = resolve(outputRoot, "standframes");
  const handCropsRoot = resolve(outputRoot, "hand-crops");
  const formatEvidenceRoot = resolve(outputRoot, "format-evidence");
  await mkdir(framesRoot, { recursive: true });
  await mkdir(standframesRoot, { recursive: true });
  await mkdir(handCropsRoot, { recursive: true });
  await mkdir(formatEvidenceRoot, { recursive: true });

  const sourcePaths = {
    canonStage: repositoryPath(
      repositoryRoot,
      VOXY_STATIC_CANON_PIXEL_SOURCE.repositoryPath,
    ),
    studioLockup: repositoryPath(
      repositoryRoot,
      VOXY_FIRST_EXPLAINER_STUDIO_LOCKUP_PATH,
    ),
    lapelPin: repositoryPath(
      repositoryRoot,
      VOXY_STATIC_CANON_NATIVE_ASSETS.lapelPin,
    ),
    edebattePocketMark: repositoryPath(
      repositoryRoot,
      VOXY_STATIC_CANON_NATIVE_ASSETS.edebattePocketMark,
    ),
  };
  const assets: VoxyFirstExplainerEmbeddedAssets = {
    canonStageDataUrl: dataUrl(await readFile(sourcePaths.canonStage), "image/png"),
    studioLockupDataUrl: dataUrl(
      await readFile(sourcePaths.studioLockup),
      "image/svg+xml",
    ),
    lapelPinDataUrl: dataUrl(
      await readFile(sourcePaths.lapelPin),
      "image/svg+xml",
    ),
    edebattePocketMarkDataUrl: dataUrl(
      await readFile(sourcePaths.edebattePocketMark),
      "image/svg+xml",
    ),
  };
  const lapelPinSvg = await readFile(sourcePaths.lapelPin, "utf8");
  const edebattePocketMarkSvg = await readFile(
    sourcePaths.edebattePocketMark,
    "utf8",
  );
  const studioLockupSvg = await readFile(sourcePaths.studioLockup, "utf8");
  const brandQa = {
    status:
      />VOXY<\/text>/.test(lapelPinSvg) &&
      !/>VOG<\/text>/.test(lapelPinSvg) &&
      />eDebatte<\/text>/.test(edebattePocketMarkSvg) &&
      !/>eDebotte<\/text>/.test(edebattePocketMarkSvg) &&
      />VoiceOpenGov<\/text>/.test(studioLockupSvg) &&
      />eDebatte<\/text>/.test(studioLockupSvg) &&
      !/>VOXY<\/text>/.test(studioLockupSvg) &&
      !/>Vote4Gov<\/text>/.test(studioLockupSvg)
        ? "rule_based_pass_visual_review_pending"
        : "failed",
    ...plan.brand,
    characterMarks: "canon_geometry_reconstructed_vector_wordmarks",
    pocketBadgeGeometryPresent: false,
    reconstructedVectorOverlays: true,
    geometryDerivedFromCanon: true,
    wordmarkReconstructedForLegibility: true,
    humanLegibilityRequired: true,
    rasterTextReconstructionUsed: false,
    canonStageSha256: await fileSha256(sourcePaths.canonStage),
    lapelPinSha256: await fileSha256(sourcePaths.lapelPin),
    edebattePocketMarkSha256: await fileSha256(
      sourcePaths.edebattePocketMark,
    ),
    studioLockupSha256: await fileSha256(sourcePaths.studioLockup),
  } as const;
  if (brandQa.status === "failed") throw new Error("native_brand_qa_failed");

  const externalRequests: string[] = [];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: plan.output.width, height: plan.output.height },
    deviceScaleFactor: 1,
    colorScheme: "dark",
  });
  const page = await context.newPage();
  page.on("request", (request) => {
    if (/^https?:/i.test(request.url())) externalRequests.push(request.url());
  });

  const renderedVisualStates = new Map<string, string>();
  let chromiumRenderedFrameCount = 0;
  let reusedFrameCount = 0;
  let mainFrameDocumentInitialized = false;
  for (let frameIndex = 0; frameIndex < plan.output.frameCount; frameIndex += 1) {
    const framePath = resolve(
      framesRoot,
      `frame-${String(frameIndex).padStart(4, "0")}.png`,
    );
    const frameState = buildVoxyFirstExplainerFrameState({ plan, frameIndex });
    const reusableFramePath = renderedVisualStates.get(
      frameState.visualStateKey,
    );
    if (reusableFramePath) {
      await copyFile(reusableFramePath, framePath);
      reusedFrameCount += 1;
      continue;
    }
    if (mainFrameDocumentInitialized) {
      await updateFrameState(page, {
        frameIndex,
        atMs: frameState.atMs,
        opacity: frameState.opacity,
        blink: frameState.blink,
        gazeX: frameState.gazeX,
        gazeY: frameState.gazeY,
        motionState: frameState.segment.motionState,
        editorialKicker: frameState.segment.editorialKicker,
        editorialTitle: frameState.segment.editorialTitle,
        editorialRole: frameState.segment.editorialRole,
        caption: frameState.segment.caption,
      });
    } else {
      await setFrameHtml(
        page,
        renderVoxyFirstExplainerFrameHtml({
          plan,
          assets,
          frameIndex,
          format: "16:9",
        }),
      );
      mainFrameDocumentInitialized = true;
    }
    const bytes = await page.locator(".viewport").screenshot({
      path: framePath,
      type: "png",
    });
    const dimensions = pngDimensions(bytes);
    if (
      dimensions.width !== plan.output.width ||
      dimensions.height !== plan.output.height
    ) {
      throw new Error(`primary_frame_dimensions_invalid:${frameIndex}`);
    }
    renderedVisualStates.set(frameState.visualStateKey, framePath);
    chromiumRenderedFrameCount += 1;
    if (chromiumRenderedFrameCount % 10 === 0) {
      console.log(
        `render_progress:chromium_states=${chromiumRenderedFrameCount}`,
      );
    }
  }

  const mp4Path = resolve(outputRoot, plan.output.mp4FileName);
  const webmPath = resolve(outputRoot, plan.output.webmFileName);
  console.log("render_progress:encode_mp4_started");
  runBinary("ffmpeg", [
    "-y",
    "-framerate",
    String(plan.output.fps),
    "-i",
    resolve(framesRoot, "frame-%04d.png"),
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
  console.log("render_progress:encode_mp4_completed");
  console.log("render_progress:encode_webm_started");
  runBinary("ffmpeg", [
    "-y",
    "-framerate",
    String(plan.output.fps),
    "-i",
    resolve(framesRoot, "frame-%04d.png"),
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
    "-tile-columns",
    "2",
    "-threads",
    "4",
    "-row-mt",
    "1",
    "-pix_fmt",
    "yuv420p",
    "-an",
    webmPath,
  ]);
  console.log("render_progress:encode_webm_completed");

  const standframes = [];
  const cropPaths: Array<{
    id: string;
    hand: "left" | "right";
    path: string;
  }> = [];
  for (const standframe of VOXY_FIRST_EXPLAINER_STANDFRAMES) {
    const frameIndex = Math.floor(
      (standframe.atMs * plan.output.fps) / 1_000,
    );
    const sourceFramePath = resolve(
      framesRoot,
      `frame-${String(frameIndex).padStart(4, "0")}.png`,
    );
    const standframeFile = `${standframe.id}.png`;
    const standframePath = resolve(standframesRoot, standframeFile);
    await copyFile(sourceFramePath, standframePath);
    const standframeBytes = await readFile(standframePath);
    standframes.push({
      id: standframe.id,
      atMs: standframe.atMs,
      frameIndex,
      file: `standframes/${standframeFile}`,
      sha256: sha256(standframeBytes),
    });
    await page.setViewportSize({ width: plan.output.width, height: plan.output.height });
    await setFrameHtml(
      page,
      renderVoxyFirstExplainerFrameHtml({ plan, assets, frameIndex }),
    );
    const cropSpecs = [
      { hand: "left" as const, x: 408, y: 385, width: 160, height: 150 },
      { hand: "right" as const, x: 482, y: 385, width: 160, height: 150 },
    ];
    for (const crop of cropSpecs) {
      const id = `${standframe.id}-${crop.hand}`;
      const path = resolve(handCropsRoot, `${id}.png`);
      await page.screenshot({ path, type: "png", clip: crop });
      cropPaths.push({ id, hand: crop.hand, path });
    }
  }
  const previewPath = resolve(outputRoot, plan.output.previewFileName);
  await copyFile(resolve(standframesRoot, "edebatte.png"), previewPath);

  const formatEvidence = [
    ...(await renderFormatEvidence({
      page,
      plan,
      assets,
      outputRoot,
      format: "9:16",
    })),
    ...(await renderFormatEvidence({
      page,
      plan,
      assets,
      outputRoot,
      format: "1:1",
    })),
  ];
  const analysisPage = await context.newPage();
  const handQa = await runHandQa({
    repositoryRoot,
    browserPage: analysisPage,
    cropPaths,
  });
  await analysisPage.close();
  await context.close();
  await browser.close();
  if (externalRequests.length > 0) {
    throw new Error(`external_request_detected:${externalRequests.join(",")}`);
  }

  const captionsVttPath = resolve(
    outputRoot,
    plan.output.captionsVttFileName,
  );
  const captionsSrtPath = resolve(
    outputRoot,
    plan.output.captionsSrtFileName,
  );
  await writeFile(captionsVttPath, buildVoxyFirstExplainerVtt(), "utf8");
  await writeFile(captionsSrtPath, buildVoxyFirstExplainerSrt(), "utf8");

  const mp4Probe = ffprobe(mp4Path);
  const webmProbe = ffprobe(webmPath);
  const assertMedia = (label: string, probe: ReturnType<typeof ffprobe>) => {
    const video = probe.streams.find((stream) => stream.codec_type === "video");
    const audio = probe.streams.find((stream) => stream.codec_type === "audio");
    const duration = Number(probe.format.duration);
    if (
      !video ||
      audio ||
      Number(video.width) !== plan.output.width ||
      Number(video.height) !== plan.output.height ||
      !["24/1", "24/1"].includes(video.avg_frame_rate) ||
      Math.abs(duration - plan.output.durationMs / 1_000) > 0.05
    ) {
      throw new Error(`${label}_ffprobe_contract_invalid`);
    }
  };
  assertMedia("mp4", mp4Probe);
  assertMedia("webm", webmProbe);

  const clipSha256 = await fileSha256(mp4Path);
  const webmSha256 = await fileSha256(webmPath);
  const captionSha256 = await fileSha256(captionsVttPath);

  const manifest = {
    schemaVersion: plan.schemaVersion,
    exactHeadSha,
    staticMasterHeadSha: plan.staticMaster.exactHeadSha,
    primaryMaster: plan.staticMaster.primaryMaster,
    editorialVariant: plan.staticMaster.editorialVariant,
    rejectedVariant: plan.staticMaster.rejectedVariant,
    staticMasterHumanVisualAcceptance:
      plan.staticMaster.humanVisualAcceptance,
    characterPixelSource: plan.characterPixelSource,
    durationMs: plan.output.durationMs,
    durationSeconds: plan.output.durationMs / 1_000,
    fps: plan.output.fps,
    frameCount: plan.output.frameCount,
    frameRendering: {
      chromiumRenderedFrameCount,
      reusedPixelIdenticalFrameCount: reusedFrameCount,
      motionQuantizationSteps:
        VOXY_FIRST_EXPLAINER_MOTION_QUANTIZATION_STEPS,
      reuseContract:
        "Only frames with identical segment and identically quantized smootherstep opacity/blink/gaze-highlight state reuse a previously rendered PNG.",
    },
    width: plan.output.width,
    height: plan.output.height,
    renderSize: {
      width: plan.output.width,
      height: plan.output.height,
    },
    clipSha256,
    webmSha256,
    captionSha256,
    media: {
      mp4: {
        file: plan.output.mp4FileName,
        sha256: clipSha256,
        ffprobe: mp4Probe,
      },
      webm: {
        file: plan.output.webmFileName,
        sha256: webmSha256,
        ffprobe: webmProbe,
      },
      preview: {
        file: plan.output.previewFileName,
        sha256: await fileSha256(previewPath),
      },
    },
    captions: {
      language: "de",
      burnedIn: true,
      vtt: {
        file: plan.output.captionsVttFileName,
        sha256: captionSha256,
      },
      srt: {
        file: plan.output.captionsSrtFileName,
        sha256: await fileSha256(captionsSrtPath),
      },
    },
    audioProvenance: plan.audioProvenance,
    timeline: plan.timeline,
    motionStates: plan.timeline.map((segment) => ({
      id: segment.id,
      state: segment.motionState,
      startMs: segment.startMs,
      endMs: segment.endMs,
      handGesture: segment.handGesture,
    })),
    motionBoundary: plan.motionBoundary,
    waveform: plan.waveform,
    waveformCount: plan.waveform.count,
    waveformPlacement: plan.waveform.placement,
    brand: plan.brand,
    brandQa,
    sourceAssets: Object.fromEntries(
      await Promise.all(
        Object.entries(sourcePaths).map(async ([key, path]) => [
          key,
          {
            path: relative(repositoryRoot, path),
            sha256: await fileSha256(path),
          },
        ]),
      ),
    ),
    standframes,
    handCrops: await Promise.all(
      cropPaths.map(async (crop) => ({
        id: crop.id,
        hand: crop.hand,
        file: relative(outputRoot, crop.path),
        sha256: await fileSha256(crop.path),
      })),
    ),
    formatEvidence,
    handQa,
    externalProviderUsed: plan.externalProviderUsed,
    externalUploadUsed: plan.externalUploadUsed,
    externalVisualUploadUsed: plan.externalUploadUsed,
    generativeRedrawUsed: plan.generativeRedrawUsed,
    humanVisualAcceptance: plan.humanVisualAcceptance,
    productionEligible: plan.productionEligible,
    autoPublish: plan.autoPublish,
    knownDeviations: [
      "accepted_primary_a_is_a_flattened_raster_without_independent_head_or_hand_layers",
      "motion_is_limited_to_five_sparse_blinks_micro_gaze_highlight_cues_and_editorial_easing_to_preserve_the_accepted_identity",
      "independent_head_body_arm_and_hand_motion_is_blocked_until_an_accepted_layered_master_exists",
      "accepted_primary_a_hands_are_clasped_and_not_open_palm_detector_inspectable",
      "no_audio_is_included_because_pr_590_has_no_reusable_license_clean_local_voice_result",
      "canon_retained_jacket_pixels_and_full_motion_output_require_human_visual_review",
    ],
  };
  await writeFile(
    resolve(outputRoot, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
  await rm(framesRoot, { recursive: true, force: true });
  process.stdout.write(
    `${JSON.stringify(
      {
        status: "voxy_first_explainer_rendered",
        exactHeadSha,
        outputRoot: relative(process.cwd(), outputRoot),
        mp4: { file: basename(mp4Path), sha256: manifest.media.mp4.sha256 },
        webm: { file: basename(webmPath), sha256: manifest.media.webm.sha256 },
        durationSeconds: manifest.durationSeconds,
        audioIncluded: manifest.audioProvenance.audioIncluded,
        captions: manifest.captions,
        brandQa: manifest.brandQa.status,
        handQa: {
          status: manifest.handQa.status,
          tested: manifest.handQa.testedCropCount,
          accepted: manifest.handQa.acceptedCropCount,
          blocked: manifest.handQa.blockedCropCount,
        },
        humanVisualAcceptance: manifest.humanVisualAcceptance,
        productionEligible: manifest.productionEligible,
        autoPublish: manifest.autoPublish,
      },
      null,
      2,
    )}\n`,
  );
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.stack : String(error)}\n`,
  );
  process.exitCode = 1;
});
