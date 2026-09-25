import { chromium, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildVoxyMouthCanonGatePlan,
  validateVoxyMouthCanonGatePlan,
  VOXY_MOUTH_CANON_GATE_OUTPUT,
} from "../src/features/voxyVideo/mouthCanonGate";
import {
  renderVoxyMouthCanonGateFrameHtml,
  renderVoxyMouthOverlayComparisonHtml,
} from "../src/features/voxyVideo/mouthCanonGateHtml";
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
  const exactHeadSha = process.env.VOXY_MOUTH_CANON_COMMIT_SHA?.trim() ?? "";
  if (!/^[0-9a-f]{40}$/.test(exactHeadSha)) {
    throw new Error("VOXY_MOUTH_CANON_COMMIT_SHA_must_be_exact_40_char_sha");
  }
  const repositoryRoot = path.resolve(import.meta.dirname, "../../..");
  const currentHead = run("git", ["rev-parse", "HEAD"], repositoryRoot);
  if (currentHead !== exactHeadSha) {
    throw new Error(`exact_head_mismatch:${currentHead}:${exactHeadSha}`);
  }
  const allowDirty = argument("allow-dirty") === "true";
  const inputs = [
    ".github/workflows/voxy-mouth-motion-v4-evidence.yml",
    "apps/web/scripts/render-voxy-mouth-canon-gate.ts",
    "apps/web/src/features/voxyVideo/mouthRig.ts",
    "apps/web/src/features/voxyVideo/headRelativeFaceRigHtml.ts",
    "apps/web/src/features/voxyVideo/mouthCanonGate.ts",
    "apps/web/src/features/voxyVideo/mouthCanonGateHtml.ts",
    VOXY_POCKET_MARK_COMPOSITION_SOURCE.repositoryPath,
  ];
  const dirtyInputs = run("git", ["status", "--porcelain", "--", ...inputs], repositoryRoot);
  if (dirtyInputs && !allowDirty) {
    throw new Error(`exact_head_mouth_inputs_dirty:${dirtyInputs.replaceAll("\n", ",")}`);
  }

  const plan = buildVoxyMouthCanonGatePlan(exactHeadSha);
  const planErrors = validateVoxyMouthCanonGatePlan(plan);
  if (planErrors.length) throw new Error(`mouth_canon_plan_invalid:${planErrors.join(",")}`);
  const outputRoot = path.resolve(repositoryRoot, argument("output") ?? VOXY_MOUTH_CANON_GATE_OUTPUT.outputDirectory);
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });

  const sourcePath = path.resolve(repositoryRoot, VOXY_POCKET_MARK_COMPOSITION_SOURCE.repositoryPath);
  const sourceBytes = await readFile(sourcePath);
  const assets = { canonStageDataUrl: dataUrl(sourceBytes, "image/png") };
  const browser = await chromium.launch({ headless: true });
  const externalRequests: string[] = [];
  const hiDpiContext = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 4, colorScheme: "dark" });
  const hiDpiPage = await hiDpiContext.newPage();
  hiDpiPage.on("request", (request) => { if (/^https?:/i.test(request.url())) externalRequests.push(request.url()); });

  const measurements = [];
  for (const state of VOXY_MOUTH_CANON_STATES) {
    await setHtml(hiDpiPage, renderVoxyMouthCanonGateFrameHtml({ assets, stateId: state.id }));
    const measurement = await hiDpiPage.evaluate(() => {
      const mouth = document.querySelector<HTMLElement>(".mouth-rig");
      const head = document.querySelector<HTMLElement>(".head-rig");
      if (!mouth || !head || mouth.parentElement !== head) throw new Error("mouth_head_parent_contract_missing");
      const style = getComputedStyle(mouth);
      return {
        state: document.querySelector<HTMLElement>(".viewport")?.dataset.mouthCanonState,
        parentClass: mouth.parentElement.className,
        anchorType: mouth.dataset.anchorType,
        anchorX: Number(mouth.dataset.anchorX),
        anchorY: Number(mouth.dataset.anchorY),
        pivotX: Number(mouth.dataset.pivotX),
        pivotY: Number(mouth.dataset.pivotY),
        canvasRelativePositioning: mouth.dataset.canvasRelativePositioning,
        computedLeft: style.left,
        computedTop: style.top,
        computedTransformOrigin: style.transformOrigin,
      };
    });
    measurements.push(measurement);
    const outputFile = path.resolve(outputRoot, VOXY_MOUTH_CANON_GATE_OUTPUT.stateFiles[state.id]);
    await hiDpiPage.screenshot({ path: outputFile, type: "png", clip: { x: 748, y: 282, width: 150, height: 104 } });
  }
  await hiDpiContext.close();

  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: "dark" });
  const page = await context.newPage();
  page.on("request", (request) => { if (/^https?:/i.test(request.url())) externalRequests.push(request.url()); });
  await setHtml(page, renderVoxyMouthCanonGateFrameHtml({ assets, stateId: "neutral" }));
  await page.screenshot({ path: path.resolve(outputRoot, VOXY_MOUTH_CANON_GATE_OUTPUT.headNeutralFileName), type: "png", clip: { x: 470, y: 45, width: 560, height: 440 } });
  await setHtml(page, renderVoxyMouthCanonGateFrameHtml({ assets, stateId: "speakingOpen", headRotationDegrees: 0.55, headTranslateY: 0.75 }));
  const coupledTransform = await page.evaluate(() => {
    const head = document.querySelector<HTMLElement>(".head-rig");
    const mouth = document.querySelector<HTMLElement>(".mouth-rig");
    if (!head || !mouth || !head.contains(mouth)) throw new Error("mouth_transform_inheritance_missing");
    return {
      headTransform: getComputedStyle(head).transform,
      mouthParentIsHead: mouth.parentElement === head,
      mouthLocalTransform: getComputedStyle(mouth).transform,
    };
  });
  await page.screenshot({ path: path.resolve(outputRoot, VOXY_MOUTH_CANON_GATE_OUTPUT.headSpeakingFileName), type: "png", clip: { x: 470, y: 45, width: 560, height: 440 } });

  await page.setViewportSize({ width: 1200, height: 760 });
  await setHtml(page, renderVoxyMouthOverlayComparisonHtml());
  await page.screenshot({ path: path.resolve(outputRoot, VOXY_MOUTH_CANON_GATE_OUTPUT.overlayComparisonFileName), type: "png" });
  await context.close();
  await browser.close();
  if (externalRequests.length) throw new Error(`external_request_detected:${externalRequests.join(",")}`);

  const measurementContract = measurements.every((measurement) =>
    measurement.parentClass === "head-rig" &&
    measurement.anchorType === "head_relative" &&
    measurement.anchorX === VOXY_MOUTH_CANON_ANCHOR.x &&
    measurement.anchorY === VOXY_MOUTH_CANON_ANCHOR.y &&
    measurement.pivotX === VOXY_MOUTH_CANON_ANCHOR.pivotX &&
    measurement.pivotY === VOXY_MOUTH_CANON_ANCHOR.pivotY &&
    measurement.canvasRelativePositioning === "false" &&
    measurement.computedLeft === `${VOXY_MOUTH_CANON_ANCHOR.x}px` &&
    measurement.computedTop === `${VOXY_MOUTH_CANON_ANCHOR.y}px`,
  );
  if (!measurementContract || !coupledTransform.mouthParentIsHead || coupledTransform.headTransform === "none") {
    throw new Error("mouth_head_binding_measurement_failed");
  }

  const files = Object.values(VOXY_MOUTH_CANON_GATE_OUTPUT.stateFiles).concat([
    VOXY_MOUTH_CANON_GATE_OUTPUT.overlayComparisonFileName,
    VOXY_MOUTH_CANON_GATE_OUTPUT.headNeutralFileName,
    VOXY_MOUTH_CANON_GATE_OUTPUT.headSpeakingFileName,
  ]);
  const manifest = {
    ...plan,
    technicalMouthCanonGate: "passed",
    mouth: {
      ...plan.mouth,
      noXDrift: true,
      noYDrift: true,
      renderedMeasurements: measurements,
      coupledTransform,
    },
    sourceAsset: {
      path: VOXY_POCKET_MARK_COMPOSITION_SOURCE.repositoryPath,
      sha256: sha256(sourceBytes),
    },
    evidence: Object.fromEntries(await Promise.all(files.map(async (file) => [file, { sha256: sha256(await readFile(path.resolve(outputRoot, file))) }]))),
    exactHeadInputsClean: !dirtyInputs,
    humanVisualAcceptance: "pending",
    productionEligible: false,
    autoPublish: false,
  };
  await writeFile(path.resolve(outputRoot, VOXY_MOUTH_CANON_GATE_OUTPUT.manifestFileName), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.info(JSON.stringify({ status: "voxy_mouth_canon_gate_passed", exactHeadSha, outputRoot: path.relative(repositoryRoot, outputRoot), mouthAnchor: VOXY_MOUTH_CANON_ANCHOR, evidenceFiles: files.length, humanVisualAcceptance: "pending" }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
