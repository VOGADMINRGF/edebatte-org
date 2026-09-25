import { chromium, type Page } from "@playwright/test";
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
import type { HomepageFilmLayoutProfile } from "../src/features/voxyVideo/homepageReferenceFilmLayouts";
import { renderVoxyHomepageReferenceFilmFrameHtml } from "../src/features/voxyVideo/homepageReferenceFilmsHtml";
import { VOXY_FIRST_EXPLAINER_STUDIO_LOCKUP_PATH } from "../src/features/voxyVideo/firstExplainerVideo";
import {
  VOXY_CANONICAL_HEAD_ALPHA,
  VOXY_CANONICAL_HEAD_ALPHA_SCHEMA_VERSION,
  VOXY_CANONICAL_CLEAN_STUDIO_BACKGROUND,
  validateVoxyCanonicalHeadAlpha,
} from "../src/features/voxyVideo/headAlphaSilhouette";
import { VOXY_POCKET_MARK_COMPOSITION_SOURCE } from "../src/features/voxyVideo/pocketMarkFinalGate";
import { VOXY_STATIC_CANON_NATIVE_ASSETS } from "../src/features/voxyVideo/staticCanonRecovery";
import type { VoxyMotionV4EmbeddedAssets } from "../src/features/voxyVideo/motionV4Html";
import {
  argument,
  assertOutsideRepository,
  dataUrl,
  setHtml,
  sha256,
} from "./render-voxy-dual-voice-explainer-pilot";

const FILMS = ["edebatte", "voiceopengov"] as const;
const MOVEMENT_FRAMES = [
  { id: "01-early-neutral", frameIndex: 0, amplitude: 0 },
  { id: "02-mouth-opening", frameIndex: 31, amplitude: 0.2 },
  { id: "03-max-right", frameIndex: 49, amplitude: 0.82 },
  { id: "04-mouth-open", frameIndex: 61, amplitude: 0.96 },
  { id: "05-mid-transition", frameIndex: 120, amplitude: 0.36 },
  { id: "06-max-left", frameIndex: 178, amplitude: 0.68 },
  { id: "07-late", frameIndex: 400, amplitude: 0.18 },
  { id: "08-cycle-end", frameIndex: 527, amplitude: 0 },
] as const;
const REGRESSION_PROFILES = [
  "landscape_16_9",
  "square_1_1",
  "feed_4_5",
] as const satisfies readonly HomepageFilmLayoutProfile[];

function exactHead(repositoryRoot: string): string {
  const result = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  if (result.status !== 0) throw new Error("head_alpha_proof_exact_head_unavailable");
  return result.stdout.trim();
}

function buildPlan(
  filmId: VoxyHomepageFilmId,
  layoutProfile: HomepageFilmLayoutProfile,
  head: string,
) {
  const contextMode = filmId === "voiceopengov" ? "evergreen" : "election_window";
  const raw = buildVoxyHomepageReferenceFilmPlan({
    filmId,
    contextMode,
    exactHeadSha: head,
    speechDurationsMs: Array.from(
      { length: filmSegments(filmId, contextMode).length },
      () => filmId === "voiceopengov" ? 7_500 : 6_400,
    ),
    layoutProfile,
  });
  const errors = validateVoxyHomepageReferenceFilmPlan(raw);
  if (errors.length) throw new Error(`head_alpha_proof_plan_invalid:${errors.join(",")}`);
  const plan = contextualizeVoxyHomepageReferenceFilmPlan(raw);
  const contextErrors = validateVoxyHomepageContextIsolation(plan);
  if (contextErrors.length) {
    throw new Error(`head_alpha_proof_context_invalid:${contextErrors.join(",")}`);
  }
  return plan;
}

async function contactSheet(input: {
  page: Page;
  files: readonly string[];
  labels: readonly string[];
  output: string;
  closeup?: boolean;
}): Promise<void> {
  const cellWidth = 260;
  const imageHeight = input.closeup ? 280 : 462;
  const cellHeight = imageHeight;
  const columns = input.files.length === 6 ? 3 : 4;
  const filters = input.files.map((_, index) =>
    `[${index}:v]scale=${cellWidth}:${imageHeight}:force_original_aspect_ratio=decrease,pad=${cellWidth}:${imageHeight}:(ow-iw)/2:(oh-ih)/2:color=0x010511[cell${index}]`,
  );
  const layout = input.files.map((_, index) =>
    `${(index % columns) * cellWidth}_${Math.floor(index / columns) * cellHeight}`,
  ).join("|");
  const stack = `${input.files.map((_, index) => `[cell${index}]`).join("")}xstack=inputs=${input.files.length}:layout=${layout}:fill=0x010511[out]`;
  const result = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-v",
      "error",
      ...input.files.flatMap((file) => ["-i", file]),
      "-filter_complex",
      [...filters, stack].join(";"),
      "-map",
      "[out]",
      "-frames:v",
      "1",
      input.output,
    ],
    { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 },
  );
  if (result.status !== 0) {
    throw new Error(`head_alpha_contact_sheet_failed:${result.stderr}`);
  }
}

function alphaRasterAudit(file: string) {
  const raw = (filter: string): Buffer => {
    const result = spawnSync(
      "ffmpeg",
      ["-v", "error", "-i", file, "-vf", `${filter},alphaextract,format=gray`, "-frames:v", "1", "-f", "rawvideo", "-"],
      { encoding: null, maxBuffer: 4 * 1024 * 1024 },
    );
    if (result.status !== 0 || !Buffer.isBuffer(result.stdout)) {
      throw new Error(`head_alpha_raster_audit_failed:${String(result.stderr)}`);
    }
    return result.stdout;
  };
  const extrema = (buffer: Buffer) => ({
    minimum: buffer.reduce((value, entry) => Math.min(value, entry), 255),
    maximum: buffer.reduce((value, entry) => Math.max(value, entry), 0),
    nonZeroPixels: buffer.reduce((value, entry) => value + (entry > 0 ? 1 : 0), 0),
  });
  const full = extrema(raw("null"));
  const forbiddenBodyStrip = extrema(raw("crop=500:10:0:390"));
  const forbiddenLeftShoulder = extrema(raw("crop=180:70:0:330"));
  const forbiddenRightShoulder = extrema(raw("crop=190:50:310:350"));
  const forbiddenLeftBorder = extrema(raw("crop=44:400:0:0"));
  if (
    full.minimum !== 0
    || full.maximum !== 255
    || full.nonZeroPixels === 0
    || forbiddenBodyStrip.maximum !== 0
    || forbiddenLeftShoulder.maximum !== 0
    || forbiddenRightShoulder.maximum !== 0
    || forbiddenLeftBorder.maximum !== 0
  ) {
    throw new Error("head_alpha_outside_silhouette_nonzero");
  }
  return {
    full,
    forbiddenBodyStrip,
    forbiddenLeftShoulder,
    forbiddenRightShoulder,
    forbiddenLeftBorder,
  };
}

async function main(): Promise<void> {
  const repositoryRoot = path.resolve(import.meta.dirname, "../../..");
  const outputRoot = path.resolve(
    argument("output")
      ?? path.join(process.env.TMPDIR ?? "/tmp", "voxy-head-alpha-compositing-proofs"),
  );
  await mkdir(outputRoot, { recursive: true, mode: 0o700 });
  await assertOutsideRepository(repositoryRoot, outputRoot, "private_head_alpha_proof_output");
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true, mode: 0o700 });

  const alphaErrors = validateVoxyCanonicalHeadAlpha();
  if (alphaErrors.length) throw new Error(`head_alpha_contract_invalid:${alphaErrors.join(",")}`);
  const head = exactHead(repositoryRoot);
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

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ colorScheme: "dark" });
  const evidence: Array<Record<string, unknown>> = [];
  try {
    for (const filmId of FILMS) {
      const filmRoot = path.resolve(outputRoot, filmId);
      await mkdir(filmRoot, { recursive: true, mode: 0o700 });
      const plan = buildPlan(filmId, "vertical_9_16", head);
      const movementFiles: string[] = [];
      const diagnosticFiles: string[] = [];

      for (const frame of MOVEMENT_FRAMES) {
        await page.setViewportSize({ width: plan.output.width, height: plan.output.height });
        const html = renderVoxyHomepageReferenceFilmFrameHtml({
          plan,
          assets,
          frameIndex: frame.frameIndex,
          amplitude: frame.amplitude,
        });
        await setHtml(page, html);
        const movementFile = path.resolve(filmRoot, `${frame.id}.png`);
        await page.locator(".viewport").screenshot({ path: movementFile, type: "png" });
        movementFiles.push(movementFile);

        await page.addStyleTag({ content: `.studio-stage{filter:saturate(.25) brightness(.3)!important}.motion-plate{display:none!important}.head-alpha-canon-source{display:none!important}.head-alpha-debug-shape{display:block!important;opacity:.92}.head-rig>*:not(.head-alpha-source){display:none!important}.homepage-profile-overlay{opacity:.18!important}` });
        const diagnosticFile = path.resolve(filmRoot, `${frame.id}-alpha-layer.png`);
        await page.locator(".viewport").screenshot({ path: diagnosticFile, type: "png" });
        diagnosticFiles.push(diagnosticFile);
      }

      const movementSheet = path.resolve(filmRoot, "movement-contact-sheet.png");
      await contactSheet({
        page,
        files: movementFiles,
        labels: MOVEMENT_FRAMES.map((entry) => entry.id),
        output: movementSheet,
      });
      const diagnosticSheet = path.resolve(filmRoot, "alpha-layer-contact-sheet.png");
      await contactSheet({
        page,
        files: diagnosticFiles,
        labels: MOVEMENT_FRAMES.map((entry) => `${entry.id} · HEAD PIXELS`),
        output: diagnosticSheet,
      });

      const alphaPage = await browser.newPage({ colorScheme: "dark" });
      await alphaPage.setViewportSize({ width: 500, height: 400 });
      await setHtml(
        alphaPage,
        renderVoxyHomepageReferenceFilmFrameHtml({ plan, assets, frameIndex: 0, amplitude: 0 }),
      );
      await alphaPage.addStyleTag({ content: `html,body,.viewport{width:500px!important;height:400px!important;background:transparent!important;overflow:hidden!important}.viewport>*:not(.master){display:none!important}.master{left:0!important;top:0!important;transform:none!important;background:transparent!important}.master>*{display:none!important}.master>.head-rig{display:block!important;left:0!important;top:0!important;transform:none!important}.head-rig>*:not(.head-alpha-source){display:none!important}.head-alpha-debug-shape{display:none!important}` });
      const alphaOnlyFile = path.resolve(filmRoot, "head-source-alpha-only.png");
      await alphaPage.screenshot({
        path: alphaOnlyFile,
        type: "png",
        omitBackground: true,
        clip: { x: 0, y: 0, width: 500, height: 400 },
      });
      await alphaPage.close();
      const alphaAudit = alphaRasterAudit(alphaOnlyFile);

      const regressionFiles: string[] = [];
      for (const layoutProfile of REGRESSION_PROFILES) {
        const regressionPlan = buildPlan(filmId, layoutProfile, head);
        for (const frame of [MOVEMENT_FRAMES[2], MOVEMENT_FRAMES[5]]) {
          await page.setViewportSize({
            width: regressionPlan.output.width,
            height: regressionPlan.output.height,
          });
          await setHtml(
            page,
            renderVoxyHomepageReferenceFilmFrameHtml({
              plan: regressionPlan,
              assets,
              frameIndex: frame.frameIndex,
              amplitude: frame.amplitude,
            }),
          );
          const file = path.resolve(filmRoot, `regression-${layoutProfile}-${frame.id}.png`);
          await page.locator(".viewport").screenshot({ path: file, type: "png" });
          regressionFiles.push(file);
        }
      }
      const regressionSheet = path.resolve(filmRoot, "format-regression-contact-sheet.png");
      await contactSheet({
        page,
        files: regressionFiles,
        labels: REGRESSION_PROFILES.flatMap((profile) => [
          `${profile} · max-right`,
          `${profile} · max-left`,
        ]),
        output: regressionSheet,
      });

      evidence.push({
        filmId,
        verticalMovementFrames: await Promise.all(
          movementFiles.map(async (file) => ({ file: path.relative(outputRoot, file), sha256: await sha256(file) })),
        ),
        movementContactSheet: path.relative(outputRoot, movementSheet),
        alphaLayerContactSheet: path.relative(outputRoot, diagnosticSheet),
        alphaOnly: {
          file: path.relative(outputRoot, alphaOnlyFile),
          sha256: await sha256(alphaOnlyFile),
          audit: alphaAudit,
        },
        formatRegressionContactSheet: path.relative(outputRoot, regressionSheet),
      });
    }
  } finally {
    await page.close();
    await browser.close();
  }

  await writeFile(
    path.resolve(outputRoot, "head-alpha-proof-manifest.json"),
    `${JSON.stringify({
      schemaVersion: "voxy-homepage-root-cause-compositing-proof-v3-10-5",
      exactHeadSha: head,
      sourceAsset: VOXY_CANONICAL_HEAD_ALPHA.source,
      sourceBoundingBox: {
        native: `${VOXY_CANONICAL_HEAD_ALPHA.source.nativeWidth}x${VOXY_CANONICAL_HEAD_ALPHA.source.nativeHeight}`,
        acceptedMotionSourceInHeadRig:
          VOXY_CANONICAL_HEAD_ALPHA.acceptedMotionSourceInRig,
      },
      alphaSchema: VOXY_CANONICAL_HEAD_ALPHA_SCHEMA_VERSION,
      contributionBounds: VOXY_CANONICAL_HEAD_ALPHA.contributionBounds,
      outsideSilhouetteContribution: 0,
      bodyRegionsExcluded: VOXY_CANONICAL_HEAD_ALPHA.excludes,
      commonPipeline: [
        "renderVoxyHomepageReferenceFilmFrameHtml",
        "renderVoxyDualVoicePilotFrameHtml",
        "renderVoxyMotionV4FrameHtml",
        "renderVoxyHeadRelativeFaceRig",
      ],
      evidence,
      humanHomepageFilmAcceptance: "pending",
      humanNews5VisualAcceptance: "pending",
      productionEligible: false,
      autoPublish: false,
    }, null, 2)}\n`,
    "utf8",
  );
  console.info(`voxy_head_alpha_compositing_proofs_ready:${outputRoot}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
