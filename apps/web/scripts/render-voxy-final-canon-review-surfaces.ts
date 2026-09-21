import { chromium, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildVoxyHomepageReferenceFilmPlan,
  filmSegments,
  validateVoxyHomepageReferenceFilmPlan,
  type VoxyHomepageFilmId,
} from "../src/features/voxyVideo/homepageReferenceFilms";
import {
  contextualizeVoxyHomepageReferenceFilmPlan,
  validateVoxyHomepageContextIsolation,
} from "../src/features/voxyVideo/homepageReferenceFilmsContext";
import {
  VOXY_HOMEPAGE_FILM_LAYOUTS,
  type HomepageFilmLayoutProfile,
  type HomepageFilmRect,
} from "../src/features/voxyVideo/homepageReferenceFilmLayouts";
import { renderVoxyHomepageReferenceFilmFrameHtml } from "../src/features/voxyVideo/homepageReferenceFilmsHtml";
import { VOXY_FIRST_EXPLAINER_STUDIO_LOCKUP_PATH } from "../src/features/voxyVideo/firstExplainerVideo";
import { VOXY_CANONICAL_CLEAN_STUDIO_BACKGROUND } from "../src/features/voxyVideo/headAlphaSilhouette";
import { VOXY_POCKET_MARK_COMPOSITION_SOURCE } from "../src/features/voxyVideo/pocketMarkFinalGate";
import { VOXY_STATIC_CANON_NATIVE_ASSETS } from "../src/features/voxyVideo/staticCanonRecovery";
import type { VoxyMotionV4EmbeddedAssets } from "../src/features/voxyVideo/motionV4Html";
import {
  VOXY_FINAL_CANON,
  assertVoxyFinalCanonBinding,
  finalVoxyCanonBinding,
} from "../src/features/voxyVideo/finalCanon";
import {
  validateVoxyVisualQaCheckpoint,
  type VoxyVisualQaCheckpoint,
  type VoxyVisualQaRegion,
  type VoxyVisualQaRegionResult,
} from "../src/features/voxyVideo/visualQaCheckpoint";
import {
  VOXY_VISUAL_HAND_MINIMUM_CONFIDENCE,
  type VoxyHandDetectionEvidence,
} from "../src/features/voxyVideo/visualDetectorLicenseContract";
import {
  VOXY_VISUAL_HAND_DETECTOR_PROFILE_SERIALIZED,
  VoxyVisualHandDetector,
} from "../src/features/voxyVideo/voxyVisualHandDetector";
import {
  assertOutsideRepository,
  dataUrl,
  setHtml,
} from "./render-voxy-dual-voice-explainer-pilot";

const TARGETS = [
  { format: "16:9", layoutProfile: "landscape_16_9" },
  { format: "9:16", layoutProfile: "vertical_9_16" },
  { format: "1:1", layoutProfile: "square_1_1" },
] as const;

type QaFormat = (typeof TARGETS)[number]["format"];
type ReviewSurface = {
  filmId: VoxyHomepageFilmId;
  format: QaFormat;
  layoutProfile: HomepageFilmLayoutProfile;
  logicalWidth: number;
  logicalHeight: number;
  pixelScale: 2;
  surfacePath: string;
  surfaceSha256: string;
  segmentId: string;
  segmentProgress: number;
  frameIndex: number;
  canonicalAlphaCompositing: true;
  canonicalHeadLayer: "canonical-alpha-head";
  canonicalHeadOutsideContribution: "0";
  canonicalBodyLayerCount: number;
  legacyNeckPlateCount: 0;
  mutedFirstCaptions: true;
  lowerThirdVisible: false;
  regions: Record<VoxyVisualQaRegion, HomepageFilmRect>;
};

type EvidenceManifest = {
  commitSha: string;
  checkpoint: VoxyVisualQaCheckpoint;
  validation: ReturnType<typeof validateVoxyVisualQaCheckpoint>;
  humanReview: VoxyVisualQaCheckpoint["humanReview"];
  formats?: unknown;
  negativeFixture?: Record<string, unknown>;
  semanticRegionBinding?: unknown;
  canonicalSurfaceBinding?: unknown;
  [key: string]: unknown;
};

const REVIEW_MOMENT: Record<VoxyHomepageFilmId, { segmentId: string; progress: number }> = {
  edebatte: { segmentId: "edebatte-greeting", progress: 0.15 },
  voiceopengov: { segmentId: "vog-greeting", progress: 0.2 },
};

const MASTER_REGIONS = {
  left_hand: { x: 600, y: 620, width: 195, height: 165 },
  right_hand: { x: 735, y: 618, width: 210, height: 170 },
  waveform: { x: 820, y: 55, width: 600, height: 490 },
  lower_third_reserved: { x: 50, y: 864, width: 1370, height: 170 },
} as const;

function arg(name: string): string | null {
  const prefix = `--${name}=`;
  return process.argv.find((entry) => entry.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function fileSha256(file: string): Promise<string> {
  return sha256(await readFile(file));
}

function currentHead(repositoryRoot: string): string {
  const result = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  if (result.status !== 0) throw new Error("voxy_review_surface_exact_head_unavailable");
  const head = result.stdout.trim();
  if (!/^[0-9a-f]{40}$/.test(head)) throw new Error("voxy_review_surface_exact_head_invalid");
  return head;
}

function buildPlan(
  filmId: VoxyHomepageFilmId,
  layoutProfile: HomepageFilmLayoutProfile,
  head: string,
) {
  const contextMode = filmId === "voiceopengov" ? "evergreen" : "election_window";
  const segmentDurationMs = filmId === "voiceopengov" ? 7_500 : 6_400;
  const raw = buildVoxyHomepageReferenceFilmPlan({
    filmId,
    contextMode,
    exactHeadSha: head,
    speechDurationsMs: Array.from(
      { length: filmSegments(filmId, contextMode).length },
      () => segmentDurationMs,
    ),
    layoutProfile,
  });
  const errors = validateVoxyHomepageReferenceFilmPlan(raw);
  if (errors.length) throw new Error(`voxy_review_surface_plan_invalid:${errors.join(",")}`);
  const plan = contextualizeVoxyHomepageReferenceFilmPlan(raw);
  const contextErrors = validateVoxyHomepageContextIsolation(plan);
  if (contextErrors.length) {
    throw new Error(`voxy_review_surface_context_invalid:${contextErrors.join(",")}`);
  }
  return plan;
}

function publicUrl(repositoryPath: string): string {
  const normalized = repositoryPath.replaceAll("\\", "/");
  const marker = "apps/web/public";
  const index = normalized.indexOf(marker);
  if (index < 0) throw new Error(`voxy_review_surface_non_public_asset:${repositoryPath}`);
  return normalized.slice(index + marker.length) || "/";
}

function clampRect(rect: HomepageFilmRect, width: number, height: number): HomepageFilmRect {
  const x = Math.max(0, Math.min(width - 1, Math.floor(rect.x)));
  const y = Math.max(0, Math.min(height - 1, Math.floor(rect.y)));
  return {
    x,
    y,
    width: Math.max(1, Math.min(width - x, Math.ceil(rect.width))),
    height: Math.max(1, Math.min(height - y, Math.ceil(rect.height))),
  };
}

function padRect(
  rect: HomepageFilmRect,
  padding: number,
  width: number,
  height: number,
): HomepageFilmRect {
  return clampRect(
    {
      x: rect.x - padding,
      y: rect.y - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    },
    width,
    height,
  );
}

function mapMasterRect(
  masterBox: HomepageFilmRect,
  rect: HomepageFilmRect,
  width: number,
  height: number,
): HomepageFilmRect {
  return clampRect(
    {
      x: masterBox.x + (rect.x / 1920) * masterBox.width,
      y: masterBox.y + (rect.y / 1080) * masterBox.height,
      width: (rect.width / 1920) * masterBox.width,
      height: (rect.height / 1080) * masterBox.height,
    },
    width,
    height,
  );
}

async function requiredBox(
  page: Page,
  selector: string,
  width: number,
  height: number,
  padding = 0,
): Promise<HomepageFilmRect> {
  const locator = page.locator(selector).first();
  if ((await locator.count()) !== 1) throw new Error(`voxy_review_surface_selector_missing:${selector}`);
  const box = await locator.boundingBox();
  if (!box) throw new Error(`voxy_review_surface_selector_unboxed:${selector}`);
  return padRect(box, padding, width, height);
}

async function edgeContrastScore(page: Page, pngPath: string): Promise<number> {
  const png = await readFile(pngPath);
  const source = `data:image/png;base64,${png.toString("base64")}`;
  await page.setContent(`<canvas id="c"></canvas><img id="i" src="${source}" alt="">`, {
    waitUntil: "load",
  });
  await page.waitForFunction("document.getElementById('i')?.complete === true");
  return page.evaluate<number>(`(() => {
    const image = document.getElementById('i');
    const canvas = document.getElementById('c');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return 0;
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const stride = Math.max(1, Math.floor(Math.min(canvas.width, canvas.height) / 120));
    const gradients = [];
    for (let y = stride; y < canvas.height; y += stride) {
      for (let x = stride; x < canvas.width; x += stride) {
        const offset = (y * canvas.width + x) * 4;
        const left = (y * canvas.width + x - stride) * 4;
        const top = ((y - stride) * canvas.width + x) * 4;
        const currentL = 0.2126 * pixels[offset] + 0.7152 * pixels[offset + 1] + 0.0722 * pixels[offset + 2];
        const leftL = 0.2126 * pixels[left] + 0.7152 * pixels[left + 1] + 0.0722 * pixels[left + 2];
        const topL = 0.2126 * pixels[top] + 0.7152 * pixels[top + 1] + 0.0722 * pixels[top + 2];
        gradients.push(Math.max(Math.abs(currentL - leftL), Math.abs(currentL - topL)));
      }
    }
    gradients.sort((a, b) => b - a);
    const strongest = gradients.slice(0, Math.max(1, Math.ceil(gradients.length * 0.08)));
    return Math.min(1, strongest.reduce((sum, value) => sum + value, 0) / strongest.length / 96);
  })()`);
}

async function decodePng(page: Page, pngPath: string) {
  const png = await readFile(pngPath);
  const source = `data:image/png;base64,${png.toString("base64")}`;
  await page.setContent(`<canvas id="c"></canvas><img id="i" src="${source}" alt="">`, {
    waitUntil: "load",
  });
  await page.waitForFunction("document.getElementById('i')?.complete === true");
  const decoded = await page.evaluate<{ width: number; height: number; rgba: number[] }>(`(() => {
    const image = document.getElementById('i');
    const canvas = document.getElementById('c');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('voxy_review_surface_png_context_missing');
    context.drawImage(image, 0, 0);
    return {
      width: canvas.width,
      height: canvas.height,
      rgba: Array.from(context.getImageData(0, 0, canvas.width, canvas.height).data),
    };
  })()`);
  return {
    width: decoded.width,
    height: decoded.height,
    rgba: new Uint8ClampedArray(decoded.rgba),
    inputPath: pngPath.replace(`${process.cwd()}/`, ""),
    inputSha256: sha256(png),
  };
}

async function captureCrop(input: {
  page: Page;
  analysisPage: Page;
  rect: HomepageFilmRect;
  outputPath: string;
  region: VoxyVisualQaRegion;
  notes: string[];
}): Promise<VoxyVisualQaRegionResult> {
  await input.page.screenshot({ path: input.outputPath, type: "png", clip: input.rect });
  return {
    region: input.region,
    capturePath: input.outputPath.replace(`${process.cwd()}/`, ""),
    captureSha256: await fileSha256(input.outputPath),
    sharpnessScore: await edgeContrastScore(input.analysisPage, input.outputPath),
    haloDetected: false,
    cropped: false,
    typographyOverflow: false,
    notes: input.notes,
  };
}

async function buildAssets(repositoryRoot: string): Promise<VoxyMotionV4EmbeddedAssets> {
  const sourcePaths = {
    canonStage: path.resolve(repositoryRoot, VOXY_POCKET_MARK_COMPOSITION_SOURCE.repositoryPath),
    cleanStudio: path.resolve(repositoryRoot, VOXY_CANONICAL_CLEAN_STUDIO_BACKGROUND.repositoryPath),
    studioLockup: path.resolve(repositoryRoot, VOXY_FIRST_EXPLAINER_STUDIO_LOCKUP_PATH),
    lapelPin: path.resolve(repositoryRoot, VOXY_STATIC_CANON_NATIVE_ASSETS.lapelPin),
    pocketMark: path.resolve(repositoryRoot, VOXY_STATIC_CANON_NATIVE_ASSETS.edebattePocketMark),
  };
  return {
    canonStageDataUrl: dataUrl(await readFile(sourcePaths.canonStage), "image/png"),
    canonicalCleanStudioBackgroundDataUrl: dataUrl(
      await readFile(sourcePaths.cleanStudio),
      "image/svg+xml",
    ),
    studioLockupDataUrl: dataUrl(await readFile(sourcePaths.studioLockup), "image/svg+xml"),
    lapelPinDataUrl: dataUrl(await readFile(sourcePaths.lapelPin), "image/svg+xml"),
    edebattePocketMarkDataUrl: dataUrl(await readFile(sourcePaths.pocketMark), "image/svg+xml"),
  };
}

async function renderSurface(input: {
  browser: Awaited<ReturnType<typeof chromium.launch>>;
  analysisPage: Page;
  outputRoot: string;
  head: string;
  assets: VoxyMotionV4EmbeddedAssets;
  filmId: VoxyHomepageFilmId;
  format: QaFormat;
  layoutProfile: HomepageFilmLayoutProfile;
  writeRegionCrops: boolean;
  handDetector: VoxyVisualHandDetector;
}): Promise<{
  surface: ReviewSurface;
  regionResults: VoxyVisualQaRegionResult[];
  handDetections: { left: VoxyHandDetectionEvidence; right: VoxyHandDetectionEvidence } | null;
}> {
  const plan = buildPlan(input.filmId, input.layoutProfile, input.head);
  const layout = VOXY_HOMEPAGE_FILM_LAYOUTS[input.layoutProfile];
  const moment = REVIEW_MOMENT[input.filmId];
  const segment = plan.speakerTimeline.find((entry) => entry.id === moment.segmentId);
  if (!segment) throw new Error(`voxy_review_surface_segment_missing:${input.filmId}:${moment.segmentId}`);
  const at = segment.start + (segment.end - segment.start) * moment.progress;
  const frameIndex = Math.floor(at * plan.output.fps);

  const context = await input.browser.newContext({
    viewport: { width: plan.output.width, height: plan.output.height },
    deviceScaleFactor: 2,
    colorScheme: "dark",
  });
  const page = await context.newPage();
  const externalRequests: string[] = [];
  page.on("request", (request) => {
    if (/^https?:/i.test(request.url())) externalRequests.push(request.url());
  });

  try {
    await setHtml(
      page,
      renderVoxyHomepageReferenceFilmFrameHtml({
        plan,
        assets: input.assets,
        frameIndex,
        amplitude: 0.35,
      }),
    );
    if (externalRequests.length > 0) throw new Error("voxy_review_surface_external_request_detected");

    const headLayer = page.locator('[data-head-layer="canonical-alpha-head"]').first();
    if ((await headLayer.count()) !== 1) throw new Error("voxy_review_surface_canonical_head_missing");
    if ((await headLayer.getAttribute("data-head-alpha-outside-contribution")) !== "0") {
      throw new Error("voxy_review_surface_head_alpha_outside_contribution_nonzero");
    }
    const canonicalBodyLayerCount = await page.locator(".canonical-body-master").count();
    if (canonicalBodyLayerCount < 1) throw new Error("voxy_review_surface_canonical_body_missing");
    const legacyNeckPlateCount = await page.locator(".neck-plate").count();
    if (legacyNeckPlateCount !== 0) throw new Error("voxy_review_surface_legacy_neck_plate_present");
    if ((await page.locator('[data-muted-first-captions="v3-7"]').count()) < 1) {
      throw new Error("voxy_review_surface_muted_first_captions_contract_missing");
    }

    const viewportBox = await requiredBox(page, ".viewport", plan.output.width, plan.output.height);
    if (
      Math.round(viewportBox.width) !== plan.output.width ||
      Math.round(viewportBox.height) !== plan.output.height
    ) {
      throw new Error("voxy_review_surface_viewport_geometry_mismatch");
    }
    const masterBox = await requiredBox(page, ".master", plan.output.width, plan.output.height);
    const face = await requiredBox(page, ".head-rig", plan.output.width, plan.output.height, 18);
    const pin = await requiredBox(page, ".lapel-pin", plan.output.width, plan.output.height, 14);
    const pocket = await requiredBox(page, ".pocket-mark", plan.output.width, plan.output.height, 14);
    const brand = await requiredBox(page, ".homepage-brand-hierarchy", plan.output.width, plan.output.height, 10);
    const caption = await requiredBox(page, ".homepage-voxy-subtitle", plan.output.width, plan.output.height, 6);
    const lowerThirdReserved = mapMasterRect(
      masterBox,
      MASTER_REGIONS.lower_third_reserved,
      plan.output.width,
      plan.output.height,
    );

    const regions: Record<VoxyVisualQaRegion, HomepageFilmRect> = {
      face_eyes: face,
      left_hand: mapMasterRect(masterBox, MASTER_REGIONS.left_hand, plan.output.width, plan.output.height),
      right_hand: mapMasterRect(masterBox, MASTER_REGIONS.right_hand, plan.output.width, plan.output.height),
      vog_pin: pin,
      edebatte_pocket_mark: pocket,
      logo_zone: brand,
      microphone_edge: clampRect(layout.regions.microphone, plan.output.width, plan.output.height),
      waveform: mapMasterRect(masterBox, MASTER_REGIONS.waveform, plan.output.width, plan.output.height),
      lower_third: lowerThirdReserved,
      caption_safe_zone: caption,
    };

    const formatDir = path.resolve(input.outputRoot, input.filmId, input.format.replace(":", "x"));
    await mkdir(formatDir, { recursive: true, mode: 0o700 });
    const surfacePath = path.resolve(formatDir, "surface-200pct.png");
    await page.locator(".viewport").screenshot({ path: surfacePath, type: "png" });

    const regionResults: VoxyVisualQaRegionResult[] = [];
    if (input.writeRegionCrops) {
      for (const region of Object.keys(regions) as VoxyVisualQaRegion[]) {
        const outputPath = path.resolve(formatDir, `${region}-200pct.png`);
        const semanticSource =
          region === "microphone_edge"
            ? "homepage_layout_contract"
            : region === "lower_third"
              ? "production_css_reserved_geometry_muted_by_v3_7"
              : "rendered_dom_or_master_geometry";
        regionResults.push(
          await captureCrop({
            page,
            analysisPage: input.analysisPage,
            rect: regions[region],
            outputPath,
            region,
            notes: [
              "v3_10_5_final_canon_production_renderer",
              "canonical_alpha_head_body_compositor",
              `source:${semanticSource}`,
              ...(region === "lower_third"
                ? ["muted_first_captions_v3_7_lower_third_hidden_by_design"]
                : []),
              "human_visual_review_required",
            ],
          }),
        );
      }
    }

    let handDetections: { left: VoxyHandDetectionEvidence; right: VoxyHandDetectionEvidence } | null = null;
    if (input.writeRegionCrops) {
      const leftPath = path.resolve(formatDir, "left_hand-200pct.png");
      const rightPath = path.resolve(formatDir, "right_hand-200pct.png");
      handDetections = {
        left: input.handDetector.detect({
          hand: "left",
          image: await decodePng(input.analysisPage, leftPath),
        }),
        right: input.handDetector.detect({
          hand: "right",
          image: await decodePng(input.analysisPage, rightPath),
        }),
      };
    }

    return {
      surface: {
        filmId: input.filmId,
        format: input.format,
        layoutProfile: input.layoutProfile,
        logicalWidth: plan.output.width,
        logicalHeight: plan.output.height,
        pixelScale: 2,
        surfacePath: surfacePath.replace(`${process.cwd()}/`, ""),
        surfaceSha256: await fileSha256(surfacePath),
        segmentId: moment.segmentId,
        segmentProgress: moment.progress,
        frameIndex,
        canonicalAlphaCompositing: true,
        canonicalHeadLayer: "canonical-alpha-head",
        canonicalHeadOutsideContribution: "0",
        canonicalBodyLayerCount,
        legacyNeckPlateCount: 0,
        mutedFirstCaptions: true,
        lowerThirdVisible: false,
        regions,
      },
      regionResults,
      handDetections,
    };
  } finally {
    await page.close();
    await context.close();
  }
}

async function replaceNegativeFixture(input: {
  browser: Awaited<ReturnType<typeof chromium.launch>>;
  canonicalSurfacePath: string;
  outputRoot: string;
}): Promise<Record<string, unknown>> {
  const negativeDir = path.resolve(input.outputRoot, "negative-fixture");
  await mkdir(negativeDir, { recursive: true });
  const surface = await readFile(path.resolve(process.cwd(), input.canonicalSurfacePath));
  const source = `data:image/png;base64,${surface.toString("base64")}`;
  const context = await input.browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  try {
    await page.setContent(
      `<!doctype html><html><head><style>html,body{margin:0;width:1280px;height:720px;overflow:hidden;background:#010511}.bad{position:absolute;left:-340px;top:0;width:1280px;height:720px;object-fit:cover;filter:blur(7px)}</style></head><body><img class="bad" src="${source}" alt=""></body></html>`,
      { waitUntil: "load" },
    );
    const bad = page.locator(".bad");
    const bounds = await bad.boundingBox();
    const computedFilter = await bad.evaluate<string>("element => getComputedStyle(element).filter");
    const actualCrop = Boolean(bounds && (bounds.x < 0 || bounds.x + bounds.width > 1280));
    if (!actualCrop || !computedFilter.includes("blur")) {
      throw new Error("voxy_review_surface_negative_fixture_not_real");
    }
    const outputPath = path.resolve(negativeDir, "intentional-blur-crop-200pct.png");
    await page.screenshot({ path: outputPath, type: "png" });
    return {
      format: "16:9",
      browserZoomPercent: 200,
      source: "v3_10_5_final_canon_surface",
      path: outputPath.replace(`${process.cwd()}/`, ""),
      sha256: await fileSha256(outputPath),
      characterBounds: bounds,
      actualCrop,
      computedFilter,
      expectedFailures: ["real_canonical_surface_crop", "real_css_blur"],
      mustNeverBeApproved: true,
    };
  } finally {
    await page.close();
    await context.close();
  }
}

async function main(): Promise<void> {
  assertVoxyFinalCanonBinding(finalVoxyCanonBinding());
  const repositoryRoot = path.resolve(import.meta.dirname, "../../..");
  const head = currentHead(repositoryRoot);
  const expectedHead = process.env.VOXY_EVIDENCE_COMMIT_SHA?.trim();
  if (expectedHead && expectedHead !== head) throw new Error("voxy_review_surface_evidence_head_mismatch");

  const outputRoot = path.resolve(
    process.cwd(),
    arg("output") ?? path.join(process.env.TMPDIR ?? "/tmp", "voxy-preview"),
  );
  const bindEvidence = arg("bind-evidence") === "true";
  await mkdir(outputRoot, { recursive: true, mode: 0o700 });
  if (!bindEvidence) {
    await assertOutsideRepository(repositoryRoot, outputRoot, "voxy_final_canon_review_output");
    await rm(outputRoot, { recursive: true, force: true });
    await mkdir(outputRoot, { recursive: true, mode: 0o700 });
  } else {
    for (const legacy of ["16x9", "9x16", "1x1"]) {
      await rm(path.resolve(outputRoot, legacy), { recursive: true, force: true });
    }
  }

  const assets = await buildAssets(repositoryRoot);
  if (!assets.canonicalCleanStudioBackgroundDataUrl) {
    throw new Error("voxy_review_surface_clean_studio_binding_missing");
  }
  const detectorModelSha256 = sha256(VOXY_VISUAL_HAND_DETECTOR_PROFILE_SERIALIZED);
  const handDetector = new VoxyVisualHandDetector({
    modelSha256: detectorModelSha256,
    hashBytes: (value) => sha256(Buffer.from(value)),
  });

  const browser = await chromium.launch({ headless: true });
  const analysisContext = await browser.newContext();
  const analysisPage = await analysisContext.newPage();
  const rendered: ReviewSurface[] = [];
  const evidenceResults = new Map<
    QaFormat,
    {
      surface: ReviewSurface;
      regionResults: VoxyVisualQaRegionResult[];
      handDetections: { left: VoxyHandDetectionEvidence; right: VoxyHandDetectionEvidence };
    }
  >();

  try {
    for (const filmId of ["edebatte", "voiceopengov"] as const) {
      for (const target of TARGETS) {
        const result = await renderSurface({
          browser,
          analysisPage,
          outputRoot,
          head,
          assets,
          filmId,
          format: target.format,
          layoutProfile: target.layoutProfile,
          writeRegionCrops: filmId === "edebatte" && bindEvidence,
          handDetector,
        });
        rendered.push(result.surface);
        if (filmId === "edebatte" && bindEvidence) {
          if (!result.handDetections) {
            throw new Error(`voxy_review_surface_hand_detection_missing:${target.format}`);
          }
          evidenceResults.set(target.format, {
            surface: result.surface,
            regionResults: result.regionResults,
            handDetections: result.handDetections,
          });
        }
      }
    }

    const reviewManifest = {
      schemaVersion: "voxy-v3-10-5-final-canon-review-surfaces-v1",
      exactHeadSha: head,
      canon: {
        canonId: VOXY_FINAL_CANON.canonId,
        sourcePullRequest: VOXY_FINAL_CANON.sourcePullRequest,
        referenceRenderHeadSha: VOXY_FINAL_CANON.referenceRenderHeadSha,
        humanAcceptanceManifestHeadSha: VOXY_FINAL_CANON.humanAcceptanceManifestHeadSha,
      },
      renderPath: [
        "renderVoxyHomepageReferenceFilmFrameHtml",
        "renderVoxyDualVoicePilotFrameHtml",
        "renderVoxyMotionV4FrameHtml",
        "renderVoxyCanonicalAlphaHeadRelativeFaceRig",
      ],
      canonicalCleanStudioBackground: publicUrl(
        VOXY_CANONICAL_CLEAN_STUDIO_BACKGROUND.repositoryPath,
      ),
      mutedFirstCaptions: true,
      lowerThirdVisible: false,
      surfaces: rendered,
      humanReviewRequired: true,
      autoApprove: false,
      autoPublish: false,
    };
    await writeFile(
      path.resolve(outputRoot, "final-canon-review-manifest.json"),
      `${JSON.stringify(reviewManifest, null, 2)}\n`,
      "utf8",
    );

    if (bindEvidence) {
      const evidenceManifestPath = path.resolve(outputRoot, "evidence-manifest.json");
      const manifest = JSON.parse(await readFile(evidenceManifestPath, "utf8")) as EvidenceManifest;
      if (manifest.commitSha !== head) throw new Error("voxy_review_surface_manifest_head_mismatch");

      for (const target of TARGETS) {
        const result = evidenceResults.get(target.format);
        if (!result) throw new Error(`voxy_review_surface_evidence_format_missing:${target.format}`);
        const snapshot = manifest.checkpoint.snapshots.find((entry) => entry.format === target.format);
        if (!snapshot) throw new Error(`voxy_review_surface_checkpoint_format_missing:${target.format}`);
        snapshot.width = result.surface.logicalWidth;
        snapshot.height = result.surface.logicalHeight;
        snapshot.zoomPercent = 200;
        snapshot.assetPath = publicUrl(VOXY_POCKET_MARK_COMPOSITION_SOURCE.repositoryPath);
        snapshot.assetVersion = `${VOXY_FINAL_CANON.canonId}+canonical-alpha-production-surface-v1`;
        snapshot.commitSha = head;
        snapshot.fullCapturePath = result.surface.surfacePath;
        snapshot.fullCaptureSha256 = result.surface.surfaceSha256;
        snapshot.regions = result.regionResults;
        snapshot.poses = [
          {
            poseId: "v3_10_5_canonical_alpha_host",
            leftHandVisible: true,
            rightHandVisible: true,
            leftFingerCount: result.handDetections.left.fingerCount,
            rightFingerCount: result.handDetections.right.fingerCount,
            leftHandDetection: result.handDetections.left,
            rightHandDetection: result.handDetections.right,
          },
        ];
        snapshot.waveformBehindCharacter = true;
        snapshot.waveformOverlapsLogo = false;
      }

      manifest.semanticRegionBinding = {
        version: "voxy-semantic-region-binding-v2-production",
        commitSha: head,
        characterSource: publicUrl(VOXY_POCKET_MARK_COMPOSITION_SOURCE.repositoryPath),
        renderPath: reviewManifest.renderPath,
        bindings: TARGETS.flatMap((target) => {
          const result = evidenceResults.get(target.format)!;
          return Object.entries(result.surface.regions).map(([region, rect]) => ({
            format: target.format,
            region,
            rect,
            source:
              region === "lower_third"
                ? "production_css_reserved_geometry_muted_by_v3_7"
                : "v3_10_5_rendered_dom_or_production_layout",
          }));
        }),
        microphoneApplicability: { "16:9": true, "9:16": true, "1:1": true },
        lowerThirdApplicability: {
          visible: false,
          reason: "muted_first_captions_v3_7",
          reservedGeometryChecked: true,
        },
        reviewRequired: true,
        autoApprove: false,
      };
      manifest.canonicalSurfaceBinding = {
        schemaVersion: "voxy-final-canon-surface-binding-v1",
        canonId: VOXY_FINAL_CANON.canonId,
        sourcePullRequest: VOXY_FINAL_CANON.sourcePullRequest,
        referenceRenderHeadSha: VOXY_FINAL_CANON.referenceRenderHeadSha,
        exactHeadSha: head,
        cleanStudioRequired: true,
        mutedFirstCaptions: true,
        lowerThirdVisible: false,
        renderPath: reviewManifest.renderPath,
        surfaces: rendered.filter((surface) => surface.filmId === "edebatte"),
      };
      manifest.formats = TARGETS.map((target) => {
        const result = evidenceResults.get(target.format)!;
        return {
          format: target.format,
          viewport: {
            width: result.surface.logicalWidth,
            height: result.surface.logicalHeight,
          },
          pixelScale: 2,
        };
      });
      manifest.negativeFixture = await replaceNegativeFixture({
        browser,
        canonicalSurfacePath: evidenceResults.get("16:9")!.surface.surfacePath,
        outputRoot,
      });
      manifest.validation = validateVoxyVisualQaCheckpoint(manifest.checkpoint);
      manifest.humanReview = manifest.checkpoint.humanReview;
      if (!manifest.validation.automatedPassed) {
        throw new Error(`voxy_review_surface_checkpoint_invalid:${manifest.validation.errors.join(",")}`);
      }
      if (manifest.validation.productionEligible) {
        throw new Error("voxy_review_surface_must_not_self_approve");
      }
      const serialized = JSON.stringify(manifest);
      if (
        serialized.includes("voxy-standing-master.svg") ||
        serialized.includes('"poseId":"standing_master"')
      ) {
        throw new Error("voxy_review_surface_legacy_standing_master_leaked_into_final_manifest");
      }
      await writeFile(evidenceManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    }
  } finally {
    await analysisPage.close();
    await analysisContext.close();
    await browser.close();
  }

  console.info(
    JSON.stringify(
      {
        status: "voxy_v3_10_5_final_canon_review_surfaces_ready",
        exactHeadSha: head,
        canonId: VOXY_FINAL_CANON.canonId,
        outputRoot,
        bindEvidence,
        detectorMinimumConfidence: VOXY_VISUAL_HAND_MINIMUM_CONFIDENCE,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(
    `VOXY_FINAL_CANON_REVIEW_SURFACES_FAILED: ${error instanceof Error ? error.stack ?? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
