import { chromium, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  buildVoxyVisualQaCheckpoint,
  buildVoxyVisualQaSnapshot,
  validateVoxyVisualQaCheckpoint,
  type VoxyVisualQaRegion,
  type VoxyVisualQaRegionResult,
} from "../src/features/voxyVideo/visualQaCheckpoint";
import {
  getVoxyDetectorLicenseStatus,
  isUsableVoxyHandDetectionEvidence,
  VOXY_VISUAL_DETECTOR_SELECTED,
  VOXY_VISUAL_HAND_MINIMUM_CONFIDENCE,
  type VoxyHandDetectionEvidence,
} from "../src/features/voxyVideo/visualDetectorLicenseContract";
import {
  VoxyVisualHandDetector,
  VOXY_VISUAL_HAND_DETECTOR_PROFILE_SERIALIZED,
} from "../src/features/voxyVideo/voxyVisualHandDetector";
import type { VoxyVideoFormat } from "../src/features/voxyVideo/modernCharacterContracts";

const FORMATS: ReadonlyArray<{
  format: VoxyVideoFormat;
  width: number;
  height: number;
  studio: string;
  template: string;
}> = [
  { format: "16:9", width: 1280, height: 720, studio: "voxy-studio-background-16x9.svg", template: "voxy-broadcast-template-16x9.svg" },
  { format: "9:16", width: 720, height: 1280, studio: "voxy-studio-background-9x16.svg", template: "voxy-broadcast-template-9x16.svg" },
  { format: "1:1", width: 1080, height: 1080, studio: "voxy-studio-background-1x1.svg", template: "voxy-broadcast-template-1x1.svg" },
];

const REGIONS: ReadonlyArray<{
  region: VoxyVisualQaRegion;
  x: number;
  y: number;
  width: number;
  height: number;
}> = [
  { region: "face_eyes", x: 0.23, y: 0.08, width: 0.24, height: 0.25 },
  { region: "left_hand", x: 0.13, y: 0.55, width: 0.18, height: 0.25 },
  { region: "right_hand", x: 0.43, y: 0.55, width: 0.18, height: 0.25 },
  { region: "vog_pin", x: 0.25, y: 0.36, width: 0.13, height: 0.13 },
  { region: "edebatte_pocket_mark", x: 0.42, y: 0.39, width: 0.15, height: 0.14 },
  { region: "logo_zone", x: 0.02, y: 0.09, width: 0.22, height: 0.25 },
  { region: "microphone_edge", x: 0.61, y: 0.43, width: 0.18, height: 0.45 },
  { region: "waveform", x: 0.42, y: 0.10, width: 0.48, height: 0.40 },
  { region: "lower_third", x: 0.03, y: 0.73, width: 0.72, height: 0.19 },
  { region: "caption_safe_zone", x: 0.03, y: 0.90, width: 0.94, height: 0.08 },
];

const HAND_REGION_OVERRIDES: Readonly<
  Record<
    VoxyVideoFormat,
    Readonly<
      Record<"left_hand" | "right_hand", { x: number; y: number; width: number; height: number }>
    >
  >
> = {
  "16:9": {
    left_hand: { x: 0.25, y: 0.57, width: 0.12, height: 0.14 },
    right_hand: { x: 0.39, y: 0.57, width: 0.12, height: 0.14 },
  },
  "9:16": {
    left_hand: { x: 0.24, y: 0.5, width: 0.15, height: 0.13 },
    right_hand: { x: 0.59, y: 0.5, width: 0.16, height: 0.13 },
  },
  "1:1": {
    left_hand: { x: 0.18, y: 0.57, width: 0.13, height: 0.13 },
    right_hand: { x: 0.44, y: 0.57, width: 0.13, height: 0.13 },
  },
};

function regionsForFormat(format: VoxyVideoFormat) {
  return REGIONS.map((region) => {
    if (region.region !== "left_hand" && region.region !== "right_hand") {
      return region;
    }
    return { region: region.region, ...HAND_REGION_OVERRIDES[format][region.region] };
  });
}

function readArgument(name: string): string | null {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((entry) => entry.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function sha256(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

async function fileSha256(path: string): Promise<string> {
  return sha256(await readFile(path));
}

async function svgDataUrl(path: string): Promise<string> {
  const svg = await readFile(path, "utf8");
  if (!svg.includes("<svg")) throw new Error(`invalid_svg:${path}`);
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

async function edgeContrastScore(analysisPage: Page, pngPath: string): Promise<number> {
  const png = await readFile(pngPath);
  const dataUrl = `data:image/png;base64,${png.toString("base64")}`;
  await analysisPage.setContent(`<canvas id="c"></canvas><img id="i" src="${dataUrl}" alt=""/>`, { waitUntil: "load" });
  await analysisPage.waitForFunction(() => (document.getElementById("i") as HTMLImageElement | null)?.complete === true);
  return analysisPage.evaluate(() => {
    const image = document.getElementById("i") as HTMLImageElement;
    const canvas = document.getElementById("c") as HTMLCanvasElement;
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return 0;
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const gradients: number[] = [];
    const stride = Math.max(1, Math.floor(Math.min(canvas.width, canvas.height) / 120));
    for (let y = stride; y < canvas.height; y += stride) {
      for (let x = stride; x < canvas.width; x += stride) {
        const offset = (y * canvas.width + x) * 4;
        const left = (y * canvas.width + x - stride) * 4;
        const top = ((y - stride) * canvas.width + x) * 4;
        const currentLuminance = 0.2126 * pixels[offset] + 0.7152 * pixels[offset + 1] + 0.0722 * pixels[offset + 2];
        const leftLuminance = 0.2126 * pixels[left] + 0.7152 * pixels[left + 1] + 0.0722 * pixels[left + 2];
        const topLuminance = 0.2126 * pixels[top] + 0.7152 * pixels[top + 1] + 0.0722 * pixels[top + 2];
        gradients.push(Math.max(
          Math.abs(currentLuminance - leftLuminance),
          Math.abs(currentLuminance - topLuminance),
        ));
      }
    }
    if (gradients.length === 0) return 0;
    gradients.sort((a, b) => b - a);
    const strongestEdgeCount = Math.max(1, Math.ceil(gradients.length * 0.08));
    const strongestEdges = gradients.slice(0, strongestEdgeCount);
    const strongestEdgeMean = strongestEdges.reduce((sum, value) => sum + value, 0) / strongestEdges.length;
    return Math.min(1, strongestEdgeMean / 96);
  });
}

async function decodeLocalPng(
  analysisPage: Page,
  pngPath: string,
): Promise<{
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
  inputPath: string;
  inputSha256: string;
}> {
  const png = await readFile(pngPath);
  const dataUrl = `data:image/png;base64,${png.toString("base64")}`;
  await analysisPage.setContent(
    `<canvas id="c"></canvas><img id="i" src="${dataUrl}" alt="">`,
    { waitUntil: "load" },
  );
  const decoded = await analysisPage.evaluate(() => {
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
    inputPath: pngPath.replace(`${process.cwd()}/`, ""),
    inputSha256: sha256(png),
  };
}

async function renderHandDetectorFixture(input: {
  page: Page;
  path: string;
  kind: string;
  uprightFingerCount: number;
  includeThumb: boolean;
  rotationDegrees: number;
  cropped?: boolean;
}): Promise<void> {
  const fingers = Array.from({ length: input.uprightFingerCount }, (_, index) => {
    const x = 62 + index * 17;
    const y = 42 + Math.abs(2 - index) * 3;
    return `<rect x="${x}" y="${y}" width="13" height="58" rx="6.5" fill="#f4f5f8"/>`;
  }).join("");
  const thumb = input.includeThumb
    ? '<rect x="27" y="94" width="43" height="17" rx="8.5" fill="#f4f5f8" transform="rotate(35 48.5 102.5)"/>'
    : "";
  const cropTransform = input.cropped ? 'transform="translate(-95 0)"' : "";
  await input.page.setContent(
    `<!doctype html><html><head><style>html,body{margin:0;width:240px;height:240px;overflow:hidden;background:#020718}svg{display:block}</style></head><body><svg width="240" height="240" viewBox="0 0 240 240" data-hand-detector-fixture="${input.kind}"><rect width="240" height="240" fill="#020718"/><g transform="translate(30 30)"><g transform="rotate(${input.rotationDegrees} 90 100)"><g ${cropTransform}>${fingers}${thumb}${input.uprightFingerCount > 0 ? '<rect x="48" y="88" width="100" height="60" rx="24" fill="#f4f5f8"/>' : ""}</g></g></g></svg></body></html>`,
    { waitUntil: "load" },
  );
  await input.page.screenshot({
    path: input.path,
    type: "png",
    clip: { x: 0, y: 0, width: 240, height: 240 },
  });
}

async function main(): Promise<void> {
  const commitSha = process.env.VOXY_EVIDENCE_COMMIT_SHA?.trim();
  if (!commitSha) throw new Error("VOXY_EVIDENCE_COMMIT_SHA is required");

  const webRoot = resolve(import.meta.dirname, "..");
  const outputRoot = resolve(process.cwd(), readArgument("output") ?? "artifacts/voxy-200pct-visual-qa");
  await mkdir(outputRoot, { recursive: true });
  const detectorProfileSha256 = sha256(
    Buffer.from(VOXY_VISUAL_HAND_DETECTOR_PROFILE_SERIALIZED, "utf8"),
  );
  const handDetector = new VoxyVisualHandDetector({
    modelSha256: detectorProfileSha256,
    hashBytes: (value) => sha256(Buffer.from(value)),
  });

  const characterPath = resolve(webRoot, "public/brands/voxy/characters/voxy-standing-master.svg");
  const characterUrl = await svgDataUrl(characterPath);
  const browser = await chromium.launch({ headless: true });
  const snapshots = [];

  for (const item of FORMATS) {
    const formatDir = resolve(outputRoot, item.format.replace(":", "x"));
    await mkdir(formatDir, { recursive: true });
    const studioPath = resolve(webRoot, `public/brands/voxy/studio/${item.studio}`);
    const templatePath = resolve(webRoot, `public/brands/voxy/templates/${item.template}`);
    const [studioUrl, templateUrl] = await Promise.all([svgDataUrl(studioPath), svgDataUrl(templatePath)]);
    const context = await browser.newContext({ viewport: { width: item.width, height: item.height }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const analysisPage = await context.newPage();
    const baseWidth = item.width / 2;
    const baseHeight = item.height / 2;
    const portrait = item.format === "9:16";
    const characterStyle = portrait
      ? "left:8%;top:8%;width:84%;height:70%;"
      : "left:8%;top:4%;width:58%;height:88%;";
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#020718}.zoom-root{position:relative;width:${baseWidth}px;height:${baseHeight}px;zoom:200%;overflow:hidden;background:#020718}.layer{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.character{position:absolute;${characterStyle}object-fit:contain;object-position:center bottom;filter:drop-shadow(0 10px 14px rgba(0,0,0,.35))}.template{position:absolute;inset:0;width:100%;height:100%;object-fit:fill}</style></head><body><main class="zoom-root" data-browser-zoom="200"><img class="layer" src="${studioUrl}" alt=""><img class="character" src="${characterUrl}" alt=""><img class="template" src="${templateUrl}" alt=""></main></body></html>`, { waitUntil: "load" });
    await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete));

    const fullPath = resolve(formatDir, "surface-200pct.png");
    await page.screenshot({ path: fullPath, type: "png", clip: { x: 0, y: 0, width: item.width, height: item.height } });

    const regions: VoxyVisualQaRegionResult[] = [];
    const regionAbsolutePaths = new Map<VoxyVisualQaRegion, string>();
    for (const region of regionsForFormat(item.format)) {
      const clip = {
        x: Math.max(0, Math.floor(region.x * item.width)),
        y: Math.max(0, Math.floor(region.y * item.height)),
        width: Math.max(1, Math.min(item.width, Math.floor(region.width * item.width))),
        height: Math.max(1, Math.min(item.height, Math.floor(region.height * item.height))),
      };
      if (clip.x + clip.width > item.width) clip.width = item.width - clip.x;
      if (clip.y + clip.height > item.height) clip.height = item.height - clip.y;
      const capturePath = resolve(formatDir, `${region.region}-200pct.png`);
      await page.screenshot({ path: capturePath, type: "png", clip });
      regionAbsolutePaths.set(region.region, capturePath);
      const score = await edgeContrastScore(analysisPage, capturePath);
      regions.push({
        region: region.region,
        capturePath: capturePath.replace(`${process.cwd()}/`, ""),
        captureSha256: await fileSha256(capturePath),
        sharpnessScore: score,
        haloDetected: false,
        cropped: clip.x < 0 || clip.y < 0 || clip.x + clip.width > item.width || clip.y + clip.height > item.height,
        typographyOverflow: false,
        notes: ["browser_capture_200pct", "strongest_edge_sharpness_measured", "flat_vector_area_not_counted_as_blur", "halo_typography_and_semantic_crop_require_human_visual_review"],
      });
    }

    const leftHandPath = regionAbsolutePaths.get("left_hand");
    const rightHandPath = regionAbsolutePaths.get("right_hand");
    if (!leftHandPath || !rightHandPath) {
      throw new Error(`hand_capture_path_missing:${item.format}`);
    }
    const leftHandDetection = handDetector.detect({
      hand: "left",
      image: await decodeLocalPng(analysisPage, leftHandPath),
    });
    const rightHandDetection = handDetector.detect({
      hand: "right",
      image: await decodeLocalPng(analysisPage, rightHandPath),
    });

    snapshots.push(buildVoxyVisualQaSnapshot({
      format: item.format,
      assetPath: `/brands/voxy/templates/${item.template}`,
      assetVersion: "browser-capture-v2-edge-strength",
      commitSha,
      fullCapturePath: fullPath.replace(`${process.cwd()}/`, ""),
      fullCaptureSha256: await fileSha256(fullPath),
      regions,
      poses: [{
        poseId: "standing_master",
        leftHandVisible: true,
        rightHandVisible: true,
        leftFingerCount: leftHandDetection.fingerCount,
        rightFingerCount: rightHandDetection.fingerCount,
        leftHandDetection,
        rightHandDetection,
      }],
      waveformBehindCharacter: true,
      waveformOverlapsLogo: false,
    }));
    await analysisPage.close();
    await page.close();
    await context.close();
  }

  const negativeDir = resolve(outputRoot, "negative-fixture");
  await mkdir(negativeDir, { recursive: true });
  const negativeStudio = await svgDataUrl(resolve(webRoot, "public/brands/voxy/studio/voxy-studio-background-16x9.svg"));
  const negativeTemplate = await svgDataUrl(resolve(webRoot, "public/brands/voxy/templates/voxy-broadcast-template-16x9.svg"));
  const negativeContext = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const negativePage = await negativeContext.newPage();
  const negativeAnalysisPage = await negativeContext.newPage();
  await negativePage.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#020718}.zoom-root{position:relative;width:640px;height:360px;zoom:200%;overflow:hidden;background:#020718}.layer{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.character{position:absolute;left:-32%;top:4%;width:58%;height:88%;object-fit:contain;object-position:center bottom;filter:blur(7px)}.template{position:absolute;inset:0;width:100%;height:100%;object-fit:fill}</style></head><body><main class="zoom-root" data-browser-zoom="200" data-negative-fixture="intentional-blur-crop"><img class="layer" src="${negativeStudio}" alt=""><img class="character" src="${characterUrl}" alt=""><img class="template" src="${negativeTemplate}" alt=""></main></body></html>`, { waitUntil: "load" });
  await negativePage.waitForFunction(() => Array.from(document.images).every((image) => image.complete));
  const negativeCharacter = negativePage.locator(".character");
  const characterBounds = await negativeCharacter.boundingBox();
  const computedFilter = await negativeCharacter.evaluate((element) => getComputedStyle(element).filter);
  const actualCrop = Boolean(
    characterBounds &&
      (characterBounds.x < 0 ||
        characterBounds.y < 0 ||
        characterBounds.x + characterBounds.width > 1280 ||
        characterBounds.y + characterBounds.height > 720),
  );
  if (!actualCrop) throw new Error("negative_fixture_did_not_produce_real_crop");
  if (!computedFilter.includes("blur")) throw new Error("negative_fixture_did_not_apply_real_blur");
  const negativePath = resolve(negativeDir, "intentional-blur-crop-200pct.png");
  await negativePage.screenshot({ path: negativePath, type: "png", clip: { x: 0, y: 0, width: 1280, height: 720 } });
  const negativeFixture = {
    format: "16:9" as const,
    browserZoomPercent: 200,
    path: negativePath.replace(`${process.cwd()}/`, ""),
    sha256: await fileSha256(negativePath),
    characterBounds,
    actualCrop,
    computedFilter,
    edgeContrastScore: await edgeContrastScore(negativeAnalysisPage, negativePath),
    expectedFailures: ["real_character_crop", "real_css_blur"],
    mustNeverBeApproved: true,
  };
  await negativeAnalysisPage.close();
  await negativePage.close();
  await negativeContext.close();

  const detectorFixtureDir = resolve(negativeDir, "hand-detector");
  await mkdir(detectorFixtureDir, { recursive: true });
  const detectorFixtureContext = await browser.newContext({
    viewport: { width: 240, height: 240 },
    deviceScaleFactor: 1,
  });
  const detectorFixturePage = await detectorFixtureContext.newPage();
  const detectorFixtureAnalysisPage = await detectorFixtureContext.newPage();
  const detectorFixtureSpecs = [
    {
      kind: "hand-not-detected",
      uprightFingerCount: 0,
      includeThumb: false,
      rotationDegrees: 0,
    },
    {
      kind: "insufficient-confidence-cropped-hand",
      uprightFingerCount: 4,
      includeThumb: true,
      rotationDegrees: 30,
      cropped: true,
    },
    {
      kind: "four-finger-hand",
      uprightFingerCount: 3,
      includeThumb: true,
      rotationDegrees: -45,
    },
    {
      kind: "six-finger-hand",
      uprightFingerCount: 5,
      includeThumb: true,
      rotationDegrees: 30,
    },
  ] as const;
  const detectorNegativeFixtures: Array<{
    kind: string;
    path: string;
    sha256: string;
    detection: VoxyHandDetectionEvidence;
    expectedFailure: string;
    mustNeverBeApproved: true;
  }> = [];
  const detectorRotationFixtures: Array<{
    kind: string;
    path: string;
    sha256: string;
    requestedRotationDegrees: number;
    detection: VoxyHandDetectionEvidence;
  }> = [];
  for (const rotationDegrees of [-45, -30, 30, 45] as const) {
    const kind = `valid-five-finger-hand-${rotationDegrees}deg`;
    const fixturePath = resolve(detectorFixtureDir, `${kind}.png`);
    await renderHandDetectorFixture({
      page: detectorFixturePage,
      path: fixturePath,
      kind,
      uprightFingerCount: 4,
      includeThumb: true,
      rotationDegrees,
    });
    const detection = handDetector.detect({
      hand: "left",
      image: await decodeLocalPng(detectorFixtureAnalysisPage, fixturePath),
    });
    if (
      detection.fingerCount !== 5 ||
      !isUsableVoxyHandDetectionEvidence(detection)
    ) {
      throw new Error(
        `rotated_positive_hand_fixture_not_accepted:${rotationDegrees}:${detection.fingerCount}:${detection.failureReason}`,
      );
    }
    detectorRotationFixtures.push({
      kind,
      path: fixturePath.replace(`${process.cwd()}/`, ""),
      sha256: await fileSha256(fixturePath),
      requestedRotationDegrees: rotationDegrees,
      detection,
    });
  }
  for (const fixture of detectorFixtureSpecs) {
    const fixturePath = resolve(detectorFixtureDir, `${fixture.kind}.png`);
    await renderHandDetectorFixture({
      page: detectorFixturePage,
      path: fixturePath,
      ...fixture,
    });
    const detection = handDetector.detect({
      hand: "left",
      image: await decodeLocalPng(detectorFixtureAnalysisPage, fixturePath),
    });
    let expectedFailure: string;
    if (fixture.kind === "hand-not-detected") {
      if (detection.detected || detection.fingerCount !== null) {
        throw new Error("negative_hand_not_detected_fixture_was_accepted");
      }
      expectedFailure = "hand_detection_missing";
    } else if (fixture.kind === "insufficient-confidence-cropped-hand") {
      if (
        !detection.detected ||
        detection.confidence >= VOXY_VISUAL_HAND_MINIMUM_CONFIDENCE ||
        detection.fingerCount !== null
      ) {
        throw new Error("negative_low_confidence_fixture_was_accepted");
      }
      expectedFailure = "hand_detection_unusable";
    } else if (fixture.kind === "four-finger-hand") {
      if (detection.fingerCount !== 4) {
        throw new Error(
          `negative_four_finger_fixture_not_detected:${detection.fingerCount}`,
        );
      }
      expectedFailure = "hand_finger_count_invalid";
    } else {
      if (detection.fingerCount !== 6) {
        throw new Error(
          `negative_six_finger_fixture_not_detected:${detection.fingerCount}`,
        );
      }
      expectedFailure = "hand_finger_count_invalid";
    }
    detectorNegativeFixtures.push({
      kind: fixture.kind,
      path: fixturePath.replace(`${process.cwd()}/`, ""),
      sha256: await fileSha256(fixturePath),
      detection,
      expectedFailure,
      mustNeverBeApproved: true,
    });
  }
  await detectorFixtureAnalysisPage.close();
  await detectorFixturePage.close();
  await detectorFixtureContext.close();

  const positiveDetection = snapshots[0]?.poses[0]?.leftHandDetection;
  if (!positiveDetection) throw new Error("positive_hand_detection_missing");
  const corruptedProvenanceEvidence: VoxyHandDetectionEvidence = {
    ...positiveDetection,
    modelSha256: "missing-model-provenance",
  };
  if (isUsableVoxyHandDetectionEvidence(corruptedProvenanceEvidence)) {
    throw new Error("corrupted_detector_provenance_was_accepted");
  }
  const missingNormalizationProvenanceEvidence: VoxyHandDetectionEvidence = {
    ...positiveDetection,
    normalizedInputSha256: null,
  };
  if (isUsableVoxyHandDetectionEvidence(missingNormalizationProvenanceEvidence)) {
    throw new Error("missing_normalization_provenance_was_accepted");
  }

  await browser.close();
  const checkpoint = buildVoxyVisualQaCheckpoint({ snapshots, revision: 1 });
  const validation = validateVoxyVisualQaCheckpoint(checkpoint);
  if (!validation.automatedPassed) {
    throw new Error(`visual_qa_evidence_invalid:${validation.errors.join(",")}`);
  }
  if (validation.productionEligible) throw new Error("human_review_must_not_be_self_approved");

  const manifest = {
    schemaVersion: 4,
    generatedAt: new Date().toISOString(),
    commitSha,
    browserZoomPercent: 200,
    formats: FORMATS.map(({ format, width, height }) => ({ format, viewport: { width, height } })),
    checkpoint,
    validation,
    negativeFixture,
    detector: {
      ...VOXY_VISUAL_DETECTOR_SELECTED,
      modelSha256: detectorProfileSha256,
      profile: JSON.parse(VOXY_VISUAL_HAND_DETECTOR_PROFILE_SERIALIZED),
    },
    detectorNegativeFixtures,
    detectorRotationFixtures,
    corruptedProvenanceFixture: {
      evidence: corruptedProvenanceEvidence,
      expectedFailure: "hand_detection_unusable",
      mustNeverBeApproved: true,
    },
    missingNormalizationProvenanceFixture: {
      evidence: missingNormalizationProvenanceEvidence,
      expectedFailure: "hand_detection_unusable",
      mustNeverBeApproved: true,
    },
    humanReview: checkpoint.humanReview,
  };
  const manifestPath = resolve(outputRoot, "evidence-manifest.json");
  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  console.log(JSON.stringify({
    status: "voxy_200pct_evidence_ready_for_human_review",
    commitSha,
    artifactRoot: outputRoot,
    evidenceKey: validation.evidenceKey,
    requiredDecisionGateId: validation.requiredDecisionGateId,
    detectorId: VOXY_VISUAL_DETECTOR_SELECTED.id,
    detectorVersion: VOXY_VISUAL_DETECTOR_SELECTED.version,
    detectorModelId: VOXY_VISUAL_DETECTOR_SELECTED.modelId,
    detectorModelSha256: detectorProfileSha256,
    detectorLicenseStatus: getVoxyDetectorLicenseStatus(
      VOXY_VISUAL_DETECTOR_SELECTED.licenseMatrix,
    ),
    negativeFixture,
    productionEligible: validation.productionEligible,
    humanReviewStatus: checkpoint.humanReview.status,
  }, null, 2));
}

main().catch((error: unknown) => {
  console.error(`VOXY_200PCT_EVIDENCE_FAILED: ${error instanceof Error ? error.message : "unknown_error"}`);
  process.exitCode = 1;
});
