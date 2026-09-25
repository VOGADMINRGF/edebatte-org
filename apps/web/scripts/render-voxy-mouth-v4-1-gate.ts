import { chromium, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildVoxyMouthV41GatePlan,
  validateVoxyMouthV41GatePlan,
  VOXY_MOUTH_V41_GATE_OUTPUT,
} from "../src/features/voxyVideo/mouthV41Gate";
import {
  renderVoxyMouthV41ComparisonHtml,
  renderVoxyMouthV41GateFrameHtml,
  renderVoxyMouthV41OverlayHtml,
  renderVoxyMouthV41SequenceHtml,
} from "../src/features/voxyVideo/mouthV41GateHtml";
import {
  VOXY_MOUTH_CANON_ANCHOR,
  VOXY_MOUTH_CANON_STATES,
} from "../src/features/voxyVideo/mouthRig";
import { VOXY_POCKET_MARK_COMPOSITION_SOURCE } from "../src/features/voxyVideo/pocketMarkFinalGate";

function argument(name: string): string | null {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function run(binary: string, args: string[], cwd?: string): string {
  const result = spawnSync(binary, args, { cwd, encoding: "utf8" });
  if (result.status !== 0 || result.error) {
    throw new Error(`${binary}_failed:${result.error?.message ?? result.stderr.trim()}`);
  }
  return result.stdout.trim();
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function dataUrl(buffer: Buffer, mime: string): string {
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

async function setHtml(page: Page, html: string): Promise<void> {
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(async () => {
    await Promise.all(Array.from(document.images).map((image) => image.decode()));
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
}

async function main(): Promise<void> {
  const exactHeadSha = process.env.VOXY_MOUTH_V41_COMMIT_SHA?.trim() ?? "";
  if (!/^[0-9a-f]{40}$/.test(exactHeadSha)) {
    throw new Error("VOXY_MOUTH_V41_COMMIT_SHA_must_be_exact_40_char_sha");
  }
  const repositoryRoot = path.resolve(import.meta.dirname, "../../..");
  const currentHead = run("git", ["rev-parse", "HEAD"], repositoryRoot);
  if (currentHead !== exactHeadSha) {
    throw new Error(`exact_head_mismatch:${currentHead}:${exactHeadSha}`);
  }
  const allowDirty = argument("allow-dirty") === "true";
  const inputs = [
    ".github/workflows/voxy-mouth-motion-v4-1-evidence.yml",
    "apps/web/scripts/render-voxy-mouth-v4-1-gate.ts",
    "apps/web/src/features/voxyVideo/mouthRig.ts",
    "apps/web/src/features/voxyVideo/mouthV41.ts",
    "apps/web/src/features/voxyVideo/mouthV41Gate.ts",
    "apps/web/src/features/voxyVideo/mouthV41GateHtml.ts",
    "apps/web/src/features/voxyVideo/headRelativeFaceRigHtml.ts",
    VOXY_POCKET_MARK_COMPOSITION_SOURCE.repositoryPath,
  ];
  const dirtyInputs = run("git", ["status", "--porcelain", "--", ...inputs], repositoryRoot);
  if (dirtyInputs && !allowDirty) {
    throw new Error(`exact_head_mouth_v4_1_inputs_dirty:${dirtyInputs.replaceAll("\n", ",")}`);
  }

  const plan = buildVoxyMouthV41GatePlan(exactHeadSha);
  const errors = validateVoxyMouthV41GatePlan(plan);
  if (errors.length) throw new Error(`mouth_v4_1_plan_invalid:${errors.join(",")}`);
  const outputRoot = path.resolve(
    repositoryRoot,
    argument("output") ?? VOXY_MOUTH_V41_GATE_OUTPUT.outputDirectory,
  );
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });

  const sourcePath = path.resolve(repositoryRoot, VOXY_POCKET_MARK_COMPOSITION_SOURCE.repositoryPath);
  const sourceBytes = await readFile(sourcePath);
  const assets = { canonStageDataUrl: dataUrl(sourceBytes, "image/png") };
  const browser = await chromium.launch({ headless: true });
  const externalRequests: string[] = [];
  const hiDpiContext = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 4,
    colorScheme: "dark",
  });
  const hiDpiPage = await hiDpiContext.newPage();
  hiDpiPage.on("request", (request) => {
    if (/^https?:/i.test(request.url())) externalRequests.push(request.url());
  });

  const measurements = [];
  for (const state of VOXY_MOUTH_CANON_STATES) {
    await setHtml(
      hiDpiPage,
      renderVoxyMouthV41GateFrameHtml({ assets, stateId: state.id }),
    );
    measurements.push(
      await hiDpiPage.evaluate(() => {
        const mouth = document.querySelector<HTMLElement>(".mouth-rig");
        const head = document.querySelector<HTMLElement>(".head-rig");
        const svg = mouth?.querySelector<SVGElement>("svg");
        if (!mouth || !head || mouth.parentElement !== head || !svg) {
          throw new Error("mouth_v4_1_head_binding_missing");
        }
        return {
          state: document.querySelector<HTMLElement>(".viewport")?.dataset.mouthState,
          profile: svg.dataset.mouthProfile,
          anchorType: mouth.dataset.anchorType,
          anchorX: Number(mouth.dataset.anchorX),
          anchorY: Number(mouth.dataset.anchorY),
          pivotX: Number(mouth.dataset.pivotX),
          pivotY: Number(mouth.dataset.pivotY),
          canvasRelativePositioning: mouth.dataset.canvasRelativePositioning,
          mouthParentIsHead: mouth.parentElement === head,
        };
      }),
    );
    await hiDpiPage.screenshot({
      path: path.resolve(outputRoot, VOXY_MOUTH_V41_GATE_OUTPUT.stateFiles[state.id]),
      type: "png",
      clip: { x: 748, y: 282, width: 150, height: 104 },
    });
  }
  await hiDpiContext.close();

  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 1,
    colorScheme: "dark",
  });
  const page = await context.newPage();
  page.on("request", (request) => {
    if (/^https?:/i.test(request.url())) externalRequests.push(request.url());
  });
  for (const board of [
    { file: VOXY_MOUTH_V41_GATE_OUTPUT.comparisonFileName, html: renderVoxyMouthV41ComparisonHtml(), height: 900 },
    { file: VOXY_MOUTH_V41_GATE_OUTPUT.overlayFileName, html: renderVoxyMouthV41OverlayHtml(), height: 900 },
    { file: VOXY_MOUTH_V41_GATE_OUTPUT.sequenceFileName, html: renderVoxyMouthV41SequenceHtml(), height: 1000 },
  ]) {
    await page.setViewportSize({ width: 1600, height: board.height });
    await setHtml(page, board.html);
    await page.screenshot({ path: path.resolve(outputRoot, board.file), type: "png" });
  }
  await context.close();
  await browser.close();
  if (externalRequests.length) {
    throw new Error(`external_request_detected:${externalRequests.join(",")}`);
  }

  const bindingPassed = measurements.every(
    (measurement) =>
      measurement.profile === "v4.1" &&
      measurement.anchorType === "head_relative" &&
      measurement.anchorX === VOXY_MOUTH_CANON_ANCHOR.x &&
      measurement.anchorY === VOXY_MOUTH_CANON_ANCHOR.y &&
      measurement.pivotX === VOXY_MOUTH_CANON_ANCHOR.pivotX &&
      measurement.pivotY === VOXY_MOUTH_CANON_ANCHOR.pivotY &&
      measurement.canvasRelativePositioning === "false" &&
      measurement.mouthParentIsHead,
  );
  if (!bindingPassed) throw new Error("mouth_v4_1_binding_measurement_failed");

  const files = Object.values(VOXY_MOUTH_V41_GATE_OUTPUT.stateFiles).concat([
    VOXY_MOUTH_V41_GATE_OUTPUT.comparisonFileName,
    VOXY_MOUTH_V41_GATE_OUTPUT.overlayFileName,
    VOXY_MOUTH_V41_GATE_OUTPUT.sequenceFileName,
  ]);
  const manifest = {
    ...plan,
    technicalMouthShapeGate: "passed",
    mouth: { ...plan.mouth, renderedMeasurements: measurements },
    sourceAsset: {
      path: VOXY_POCKET_MARK_COMPOSITION_SOURCE.repositoryPath,
      sha256: sha256(sourceBytes),
    },
    evidence: Object.fromEntries(
      await Promise.all(
        files.map(async (file) => [
          file,
          { sha256: sha256(await readFile(path.resolve(outputRoot, file))) },
        ]),
      ),
    ),
    exactHeadInputsClean: !dirtyInputs,
    humanVisualAcceptance: "pending",
    productionEligible: false,
    autoPublish: false,
  };
  await writeFile(
    path.resolve(outputRoot, VOXY_MOUTH_V41_GATE_OUTPUT.manifestFileName),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
  console.info(
    JSON.stringify(
      {
        status: "voxy_mouth_v4_1_shape_gate_passed",
        exactHeadSha,
        outputRoot: path.relative(repositoryRoot, outputRoot),
        mouthAnchor: VOXY_MOUTH_CANON_ANCHOR,
        evidenceFiles: files.length,
        humanVisualAcceptance: "pending",
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
