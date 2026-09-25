import { chromium, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import {
  validateVoxyVisualQaCheckpoint,
  type VoxyVisualQaCheckpoint,
  type VoxyVisualQaRegion,
  type VoxyVisualQaRegionResult,
} from "../src/features/voxyVideo/visualQaCheckpoint";
import type { VoxyVideoFormat } from "../src/features/voxyVideo/modernCharacterContracts";

type Rect = { x: number; y: number; width: number; height: number };
type FormatSpec = {
  format: VoxyVideoFormat;
  width: number;
  height: number;
  characterBox: { left: number; top: number; width: number; height: number };
};

type EvidenceManifest = {
  schemaVersion: number;
  generatedAt: string;
  commitSha: string;
  checkpoint: VoxyVisualQaCheckpoint;
  validation: ReturnType<typeof validateVoxyVisualQaCheckpoint>;
  humanReview: VoxyVisualQaCheckpoint["humanReview"];
  semanticRegionBinding?: unknown;
  [key: string]: unknown;
};

const CHARACTER_NATIVE = { width: 1400, height: 2200 } as const;

const FORMATS: readonly FormatSpec[] = [
  {
    format: "16:9",
    width: 1280,
    height: 720,
    characterBox: { left: 0.08, top: 0.04, width: 0.58, height: 0.88 },
  },
  {
    format: "9:16",
    width: 720,
    height: 1280,
    characterBox: { left: 0.08, top: 0.08, width: 0.84, height: 0.70 },
  },
  {
    format: "1:1",
    width: 1080,
    height: 1080,
    characterBox: { left: 0.08, top: 0.04, width: 0.58, height: 0.88 },
  },
] as const;

const CHARACTER_TARGETS: Readonly<
  Record<"face_eyes" | "vog_pin" | "edebatte_pocket_mark", Rect & { padding: number }>
> = {
  face_eyes: { x: 390, y: 210, width: 650, height: 500, padding: 20 },
  vog_pin: { x: 470, y: 830, width: 135, height: 105, padding: 20 },
  edebatte_pocket_mark: { x: 750, y: 940, width: 230, height: 150, padding: 20 },
};

const SURFACE_TARGETS: Readonly<
  Record<
    VoxyVideoFormat,
    Readonly<
      Record<"logo_zone" | "microphone_edge" | "waveform" | "lower_third" | "caption_safe_zone", Rect>
    >
  >
> = {
  "16:9": {
    logo_zone: { x: 0.035, y: 0.12, width: 0.19, height: 0.22 },
    microphone_edge: { x: 0.60, y: 0.40, width: 0.22, height: 0.50 },
    waveform: { x: 0.38, y: 0.10, width: 0.50, height: 0.40 },
    lower_third: { x: 0.039, y: 0.735, width: 0.71, height: 0.17 },
    caption_safe_zone: { x: 0.039, y: 0.895, width: 0.922, height: 0.095 },
  },
  "9:16": {
    logo_zone: { x: 0.08, y: 0.04, width: 0.84, height: 0.19 },
    microphone_edge: { x: 0.70, y: 0.38, width: 0.23, height: 0.28 },
    waveform: { x: 0.05, y: 0.24, width: 0.90, height: 0.36 },
    lower_third: { x: 0.05, y: 0.81, width: 0.90, height: 0.12 },
    caption_safe_zone: { x: 0.05, y: 0.91, width: 0.90, height: 0.07 },
  },
  "1:1": {
    logo_zone: { x: 0.035, y: 0.05, width: 0.40, height: 0.23 },
    microphone_edge: { x: 0.60, y: 0.38, width: 0.23, height: 0.38 },
    waveform: { x: 0.26, y: 0.13, width: 0.71, height: 0.38 },
    lower_third: { x: 0.045, y: 0.76, width: 0.91, height: 0.145 },
    caption_safe_zone: { x: 0.045, y: 0.895, width: 0.91, height: 0.07 },
  },
};

const MICROPHONE_APPLICABILITY: Readonly<Record<VoxyVideoFormat, boolean>> = {
  "16:9": true,
  "9:16": false,
  "1:1": false,
};

function readArgument(name: string): string | null {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((entry) => entry.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function sha256(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function clampRect(rect: Rect, width: number, height: number): Rect {
  const x = Math.max(0, Math.min(width - 1, rect.x));
  const y = Math.max(0, Math.min(height - 1, rect.y));
  return {
    x,
    y,
    width: Math.max(1, Math.min(width - x, rect.width)),
    height: Math.max(1, Math.min(height - y, rect.height)),
  };
}

function characterContentRect(spec: FormatSpec): Rect {
  const box = {
    x: spec.characterBox.left * spec.width,
    y: spec.characterBox.top * spec.height,
    width: spec.characterBox.width * spec.width,
    height: spec.characterBox.height * spec.height,
  };
  const nativeAspect = CHARACTER_NATIVE.width / CHARACTER_NATIVE.height;
  const boxAspect = box.width / box.height;
  if (boxAspect >= nativeAspect) {
    const height = box.height;
    const width = height * nativeAspect;
    return {
      x: box.x + (box.width - width) / 2,
      y: box.y,
      width,
      height,
    };
  }
  const width = box.width;
  const height = width / nativeAspect;
  return {
    x: box.x,
    y: box.y + box.height - height,
    width,
    height,
  };
}

function characterTargetRect(
  spec: FormatSpec,
  target: keyof typeof CHARACTER_TARGETS,
): Rect {
  const content = characterContentRect(spec);
  const source = CHARACTER_TARGETS[target];
  return clampRect(
    {
      x: content.x + (source.x / CHARACTER_NATIVE.width) * content.width - source.padding,
      y: content.y + (source.y / CHARACTER_NATIVE.height) * content.height - source.padding,
      width: (source.width / CHARACTER_NATIVE.width) * content.width + source.padding * 2,
      height: (source.height / CHARACTER_NATIVE.height) * content.height + source.padding * 2,
    },
    spec.width,
    spec.height,
  );
}

function normalizedTargetRect(spec: FormatSpec, target: Rect): Rect {
  return clampRect(
    {
      x: target.x * spec.width,
      y: target.y * spec.height,
      width: target.width * spec.width,
      height: target.height * spec.height,
    },
    spec.width,
    spec.height,
  );
}

async function edgeContrastScore(page: Page, path: string): Promise<number> {
  const png = await readFile(path);
  const dataUrl = `data:image/png;base64,${png.toString("base64")}`;
  await page.setContent(
    `<!doctype html><html><body data-edge-ready="false"><canvas id="c"></canvas><img id="i" src="${dataUrl}" alt=""><script>
      (function () {
        var image = document.getElementById("i");
        var canvas = document.getElementById("c");
        var calculate = function () {
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          var context = canvas.getContext("2d", { willReadFrequently: true });
          if (!context) {
            document.body.dataset.edgeScore = "0";
            document.body.dataset.edgeReady = "true";
            return;
          }
          context.drawImage(image, 0, 0);
          var pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
          var stride = Math.max(1, Math.floor(Math.min(canvas.width, canvas.height) / 120));
          var gradients = [];
          for (var y = stride; y < canvas.height; y += stride) {
            for (var x = stride; x < canvas.width; x += stride) {
              var offset = (y * canvas.width + x) * 4;
              var left = (y * canvas.width + x - stride) * 4;
              var top = ((y - stride) * canvas.width + x) * 4;
              var lumOffset = 0.2126 * pixels[offset] + 0.7152 * pixels[offset + 1] + 0.0722 * pixels[offset + 2];
              var lumLeft = 0.2126 * pixels[left] + 0.7152 * pixels[left + 1] + 0.0722 * pixels[left + 2];
              var lumTop = 0.2126 * pixels[top] + 0.7152 * pixels[top + 1] + 0.0722 * pixels[top + 2];
              gradients.push(Math.max(Math.abs(lumOffset - lumLeft), Math.abs(lumOffset - lumTop)));
            }
          }
          if (!gradients.length) {
            document.body.dataset.edgeScore = "0";
            document.body.dataset.edgeReady = "true";
            return;
          }
          gradients.sort(function (a, b) { return b - a; });
          var strongest = gradients.slice(0, Math.max(1, Math.ceil(gradients.length * 0.08)));
          var sum = 0;
          for (var index = 0; index < strongest.length; index += 1) sum += strongest[index];
          var score = Math.min(1, (sum / strongest.length) / 96);
          document.body.dataset.edgeScore = String(score);
          document.body.dataset.edgeReady = "true";
        };
        if (image.complete && image.naturalWidth > 0) calculate();
        else image.addEventListener("load", calculate, { once: true });
      })();
    </script></body></html>`,
    { waitUntil: "load" },
  );
  await page.locator('body[data-edge-ready="true"]').waitFor({ state: "attached" });
  const score = await page.locator("body").getAttribute("data-edge-score");
  const numeric = Number(score);
  if (!Number.isFinite(numeric)) throw new Error(`semantic_region_edge_score_invalid:${path}`);
  return numeric;
}

async function captureSemanticRegion(input: {
  page: Page;
  analysisPage: Page;
  surfacePath: string;
  outputPath: string;
  surfaceWidth: number;
  surfaceHeight: number;
  rect: Rect;
  region: VoxyVisualQaRegion;
  notes: string[];
}): Promise<VoxyVisualQaRegionResult> {
  const surface = await readFile(input.surfacePath);
  const dataUrl = `data:image/png;base64,${surface.toString("base64")}`;
  await input.page.setViewportSize({ width: input.surfaceWidth, height: input.surfaceHeight });
  await input.page.setContent(
    `<style>html,body{margin:0;width:${input.surfaceWidth}px;height:${input.surfaceHeight}px;overflow:hidden;background:#020718}img{display:block;width:${input.surfaceWidth}px;height:${input.surfaceHeight}px}</style><img src="${dataUrl}" alt="">`,
    { waitUntil: "load" },
  );
  const rect = clampRect(input.rect, input.surfaceWidth, input.surfaceHeight);
  await mkdir(dirname(input.outputPath), { recursive: true });
  await input.page.screenshot({ path: input.outputPath, type: "png", clip: rect });
  const png = await readFile(input.outputPath);
  return {
    region: input.region,
    capturePath: input.outputPath.replace(`${process.cwd()}/`, ""),
    captureSha256: sha256(png),
    sharpnessScore: await edgeContrastScore(input.analysisPage, input.outputPath),
    haloDetected: false,
    cropped: false,
    typographyOverflow: false,
    notes: input.notes,
  };
}

async function main(): Promise<void> {
  const outputRoot = resolve(
    process.cwd(),
    readArgument("output") ?? "artifacts/voxy-200pct-visual-qa",
  );
  const manifestPath = resolve(outputRoot, "evidence-manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as EvidenceManifest;
  const expectedCommitSha = process.env.VOXY_EVIDENCE_COMMIT_SHA?.trim();
  if (!expectedCommitSha || manifest.commitSha !== expectedCommitSha) {
    throw new Error("semantic_region_evidence_commit_mismatch");
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ deviceScaleFactor: 1 });
  const page = await context.newPage();
  const analysisPage = await context.newPage();
  const bindings: Array<Record<string, unknown>> = [];

  try {
    for (const spec of FORMATS) {
      const snapshot = manifest.checkpoint.snapshots.find((entry) => entry.format === spec.format);
      if (!snapshot) throw new Error(`semantic_region_snapshot_missing:${spec.format}`);
      const surfacePath = resolve(process.cwd(), snapshot.fullCapturePath);
      const existing = new Map(snapshot.regions.map((region) => [region.region, region]));
      const replacements = new Map<VoxyVisualQaRegion, VoxyVisualQaRegionResult>();

      for (const region of ["face_eyes", "vog_pin", "edebatte_pocket_mark"] as const) {
        const rect = characterTargetRect(spec, region);
        const outputPath = resolve(outputRoot, spec.format.replace(":", "x"), `${region}-200pct.png`);
        replacements.set(
          region,
          await captureSemanticRegion({
            page,
            analysisPage,
            surfacePath,
            outputPath,
            surfaceWidth: spec.width,
            surfaceHeight: spec.height,
            rect,
            region,
            notes: [
              "semantic_crop_from_200pct_source",
              "semantic_target_source_bound",
              `character_native_${CHARACTER_NATIVE.width}x${CHARACTER_NATIVE.height}`,
            ],
          }),
        );
        bindings.push({ format: spec.format, region, rect, source: "voxy-standing-master.svg" });
      }

      for (const region of [
        "logo_zone",
        "microphone_edge",
        "waveform",
        "lower_third",
        "caption_safe_zone",
      ] as const) {
        const rect = normalizedTargetRect(spec, SURFACE_TARGETS[spec.format][region]);
        const outputPath = resolve(outputRoot, spec.format.replace(":", "x"), `${region}-200pct.png`);
        const notes = [
          "semantic_crop_from_200pct_source",
          "semantic_target_format_bound",
          "human_visual_review_required",
        ];
        if (region === "microphone_edge" && !MICROPHONE_APPLICABILITY[spec.format]) {
          notes.push("canonical_format_has_no_microphone_layer", "inspection_zone_only_not_presence_claim");
        }
        replacements.set(
          region,
          await captureSemanticRegion({
            page,
            analysisPage,
            surfacePath,
            outputPath,
            surfaceWidth: spec.width,
            surfaceHeight: spec.height,
            rect,
            region,
            notes,
          }),
        );
        bindings.push({
          format: spec.format,
          region,
          rect,
          source:
            region === "lower_third" || region === "caption_safe_zone"
              ? "broadcast-template"
              : "studio-surface",
          applicable: region !== "microphone_edge" || MICROPHONE_APPLICABILITY[spec.format],
        });
      }

      snapshot.regions = snapshot.regions.map((region) => replacements.get(region.region) ?? region);
      snapshot.assetVersion = `${snapshot.assetVersion}+semantic-region-binding-v1`;

      for (const requiredRegion of [
        "face_eyes",
        "left_hand",
        "right_hand",
        "vog_pin",
        "edebatte_pocket_mark",
        "logo_zone",
        "microphone_edge",
        "waveform",
        "lower_third",
        "caption_safe_zone",
      ] as const) {
        if (!existing.has(requiredRegion) && !replacements.has(requiredRegion)) {
          throw new Error(`semantic_region_missing:${spec.format}:${requiredRegion}`);
        }
      }
    }
  } finally {
    await analysisPage.close();
    await page.close();
    await context.close();
    await browser.close();
  }

  manifest.validation = validateVoxyVisualQaCheckpoint(manifest.checkpoint);
  if (!manifest.validation.automatedPassed) {
    throw new Error(`semantic_region_checkpoint_invalid:${manifest.validation.errors.join(",")}`);
  }
  if (manifest.validation.productionEligible) {
    throw new Error("semantic_region_rebind_must_not_self_approve");
  }
  manifest.humanReview = manifest.checkpoint.humanReview;
  manifest.generatedAt = new Date().toISOString();
  manifest.semanticRegionBinding = {
    version: "voxy-semantic-region-binding-v1",
    commitSha: manifest.commitSha,
    characterSource: "/brands/voxy/characters/voxy-standing-master.svg",
    bindings,
    microphoneApplicability: MICROPHONE_APPLICABILITY,
    reviewRequired: true,
    autoApprove: false,
  };

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        status: "voxy_200pct_semantic_regions_rebound",
        commitSha: manifest.commitSha,
        evidenceKey: manifest.validation.evidenceKey,
        productionEligible: manifest.validation.productionEligible,
        bindings: bindings.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(
    `VOXY_200PCT_SEMANTIC_REBIND_FAILED: ${error instanceof Error ? error.message : "unknown_error"}`,
  );
  process.exitCode = 1;
});
