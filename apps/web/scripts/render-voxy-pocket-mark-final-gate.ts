import { chromium, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import {
  buildVoxyFirstExplainerPlan,
  VOXY_FIRST_EXPLAINER_STUDIO_LOCKUP_PATH,
} from "../src/features/voxyVideo/firstExplainerVideo";
import {
  renderVoxyFirstExplainerFrameHtml,
  type VoxyFirstExplainerEmbeddedAssets,
} from "../src/features/voxyVideo/firstExplainerVideoHtml";
import {
  buildVoxyPocketMarkFinalGatePlan,
  validateVoxyPocketMarkFinalGatePlan,
  VOXY_POCKET_MARK_COMPOSITION_SOURCE,
  VOXY_POCKET_MARK_PREVIOUS_PASS_HEAD,
  VOXY_POCKET_MARK_PREVIOUS_PASS_PRESENTATION,
} from "../src/features/voxyVideo/pocketMarkFinalGate";
import {
  VOXY_STATIC_CANON_NATIVE_ASSETS,
  VOXY_STATIC_CANON_PIXEL_SOURCE,
} from "../src/features/voxyVideo/staticCanonRecovery";

function argument(name: string): string | null {
  const prefix = `--${name}=`;
  return (
    process.argv
      .slice(2)
      .find((value) => value.startsWith(prefix))
      ?.slice(prefix.length) ?? null
  );
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function fileSha256(path: string): Promise<string> {
  return sha256(await readFile(path));
}

function runBinary(binary: string, args: string[], cwd: string): string {
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

async function settlePage(page: Page, html: string): Promise<void> {
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images).map((image) => image.decode()));
    await new Promise<void>((resolveFrame) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame()));
    });
  });
}

async function scalePng(input: {
  source: string;
  destination: string;
  multiplier: 2 | 4;
  repositoryRoot: string;
}): Promise<void> {
  runBinary(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      input.source,
      "-vf",
      `scale=iw*${input.multiplier}:ih*${input.multiplier}:flags=lanczos`,
      "-frames:v",
      "1",
      input.destination,
    ],
    input.repositoryRoot,
  );
}

async function setPreviousPassPocketPresentation(
  page: Page,
  previousPassSvg: string,
): Promise<void> {
  await page.evaluate(
    ({ source, presentation }) => {
      const mark = document.querySelector<HTMLImageElement>(
        ".reconstructed-pocket-mark",
      );
      if (!mark) throw new Error("pocket_mark_element_missing");
      mark.src = source;
      Object.assign(mark.style, {
        left: `${presentation.left}px`,
        top: `${presentation.top}px`,
        width: `${presentation.width}px`,
        height: `${presentation.height}px`,
        transform: `rotate(${presentation.rotationDegrees}deg) ${presentation.perspectiveTransform}`,
        opacity: `${presentation.surfaceOpacity}`,
      });
    },
    {
      source: dataUrl(Buffer.from(previousPassSvg), "image/svg+xml"),
      presentation: VOXY_POCKET_MARK_PREVIOUS_PASS_PRESENTATION,
    },
  );
  await page.evaluate(async () => {
    const mark = document.querySelector<HTMLImageElement>(
      ".reconstructed-pocket-mark",
    );
    await mark?.decode();
  });
}

async function screenshotWithPocketMask(input: {
  page: Page;
  path: string;
}): Promise<void> {
  await input.page.evaluate(() => {
    const mask = document.createElement("div");
    mask.dataset.pocketFinalMask = "true";
    Object.assign(mask.style, {
      position: "fixed",
      left: "842px",
      top: "560px",
      width: "108px",
      height: "66px",
      background: "#ff00ff",
      zIndex: "9999",
    });
    document.body.append(mask);
  });
  await input.page.screenshot({ path: input.path, type: "png" });
  await input.page.evaluate(() => {
    document.querySelector("[data-pocket-final-mask='true']")?.remove();
  });
}

function renderBeforeAfterHtml(input: {
  beforeDataUrl: string;
  afterDataUrl: string;
}): string {
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{margin:0;width:1500px;height:760px;overflow:hidden;background:#050914;color:#f5f7fb;font-family:Arial,Helvetica,sans-serif}.board{width:1500px;height:760px;padding:44px 52px}.head{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:28px}.eyebrow{color:#53e4ae;font-weight:900;letter-spacing:.14em}.head h1{margin:8px 0 0;font-size:38px}.gate{padding:12px 18px;border:2px solid #35d89a;border-radius:999px;color:#75ebbb;font-weight:900;letter-spacing:.1em}.pair{display:grid;grid-template-columns:1fr 1fr;gap:26px}.panel{padding:18px;border:1px solid #293750;border-radius:18px;background:#091120}.panel h2{margin:0 0 14px;font-size:18px;letter-spacing:.1em}.panel img{display:block;width:100%;height:480px;object-fit:contain;background:#010511}.expected{margin-top:22px;padding:16px 20px;border-left:4px solid #35d89a;background:#111829;font-size:18px}.expected strong{color:#75ebbb}
</style></head><body><main class="board"><header class="head"><div><div class="eyebrow">VOXY · POCKET MARK MICRO-PASS</div><h1>BISHERIGER PASS · FINALER MICRO-PASS</h1></div><div class="gate">HUMAN REVIEW PENDING</div></header><section class="pair"><article class="panel"><h2>BISHERIGER PASS · ${VOXY_POCKET_MARK_PREVIOUS_PASS_PRESENTATION.rotationDegrees}° · 100 % DECKKRAFT</h2><img src="${input.beforeDataUrl}" alt="Bisherige technisch bestandene eDebatte-Pocket-Wortmarke"></article><article class="panel"><h2>MICRO-PASS · −2,5° · 94 % DECKKRAFT</h2><img src="${input.afterDataUrl}" alt="Finaler eDebatte-Pocket-Micro-Pass"></article></section><div class="expected"><strong>EXPECTED: eDebatte · genau einmal.</strong> Gleicher Ausschnitt, gleiche Skalierung, gleiche Position und Größe. Kein Stroke, Glow, Badge oder Box.</div></main></body></html>`;
}

async function main(): Promise<void> {
  const exactHeadSha = process.env.VOXY_POCKET_GATE_COMMIT_SHA?.trim() ?? "";
  if (!/^[0-9a-f]{40}$/.test(exactHeadSha)) {
    throw new Error("VOXY_POCKET_GATE_COMMIT_SHA_must_be_exact_40_char_sha");
  }

  const webRoot = resolve(import.meta.dirname, "..");
  const repositoryRoot = resolve(webRoot, "../..");
  const currentHead = runBinary("git", ["rev-parse", "HEAD"], repositoryRoot);
  if (currentHead !== exactHeadSha) {
    throw new Error(`exact_head_mismatch:${currentHead}:${exactHeadSha}`);
  }

  const evidenceInputs = [
    ".github/workflows/voxy-pocket-mark-final-gate.yml",
    "apps/web/scripts/render-voxy-pocket-mark-final-gate.ts",
    "apps/web/src/features/voxyVideo/pocketMarkFinalGate.ts",
    "apps/web/src/features/voxyVideo/jacketCanonGate.ts",
    "apps/web/src/features/voxyVideo/firstExplainerVideo.ts",
    "apps/web/src/features/voxyVideo/firstExplainerVideoHtml.ts",
    "apps/web/src/features/voxyVideo/staticCanonRecovery.ts",
    VOXY_STATIC_CANON_PIXEL_SOURCE.repositoryPath,
    VOXY_POCKET_MARK_COMPOSITION_SOURCE.repositoryPath,
    VOXY_STATIC_CANON_NATIVE_ASSETS.lapelPin,
    VOXY_STATIC_CANON_NATIVE_ASSETS.edebattePocketMark,
    VOXY_FIRST_EXPLAINER_STUDIO_LOCKUP_PATH,
  ];
  const dirtyInputs = runBinary(
    "git",
    ["diff", "--name-only", "HEAD", "--", ...evidenceInputs],
    repositoryRoot,
  );
  if (dirtyInputs) {
    throw new Error(
      `exact_head_pocket_gate_inputs_dirty:${dirtyInputs.replaceAll("\n", ",")}`,
    );
  }

  const plan = buildVoxyPocketMarkFinalGatePlan(exactHeadSha);
  const planErrors = validateVoxyPocketMarkFinalGatePlan(plan);
  if (planErrors.length > 0) {
    throw new Error(`pocket_gate_plan_invalid:${planErrors.join(",")}`);
  }

  const sourcePaths = {
    canonStage: repositoryPath(
      repositoryRoot,
      VOXY_POCKET_MARK_COMPOSITION_SOURCE.repositoryPath,
    ),
    canonSource: repositoryPath(
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
    pocketMark: repositoryPath(repositoryRoot, plan.sourceAsset),
  };
  if (
    (await fileSha256(sourcePaths.lapelPin)) !== plan.unchangedLapelPinSha256
  ) {
    throw new Error("lapel_pin_changed_outside_pocket_fix_scope");
  }

  const pocketSvg = await readFile(sourcePaths.pocketMark, "utf8");
  const textMatch = pocketSvg.match(/<text\b[^>]*>([\s\S]*?)<\/text>/i);
  const textContent = textMatch?.[1].replace(/<[^>]+>/g, "").trim() ?? "";
  const textElementCount = pocketSvg.match(/<text\b/gi)?.length ?? 0;
  if (
    !/\.svg$/i.test(plan.sourceAsset) ||
    !/data-vector-source="true"/.test(pocketSvg) ||
    !/data-exact-text="eDebatte"/.test(pocketSvg) ||
    textElementCount !== 1 ||
    textContent !== "eDebatte" ||
    /eDebotte|<rect\b|<filter\b|\sstroke=|drop-shadow|box-shadow/i.test(
      pocketSvg,
    ) ||
    !/data-surface-integration="substrate-alpha-0\.94"/.test(pocketSvg) ||
    (pocketSvg.match(/fill-opacity="0\.94"/g)?.length ?? 0) !== 1
  ) {
    throw new Error("pocket_vector_source_qa_failed");
  }
  const previousPassPocketSvg = pocketSvg.replace(' fill-opacity="0.94"', "");

  const outputRoot = resolve(
    process.cwd(),
    argument("output") ?? plan.output.outputDirectory,
  );
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });

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
    edebattePocketMarkDataUrl: dataUrl(Buffer.from(pocketSvg), "image/svg+xml"),
  };

  const externalRequests: string[] = [];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    colorScheme: "dark",
  });
  const page = await context.newPage();
  page.on("request", (request) => {
    if (/^https?:/i.test(request.url())) externalRequests.push(request.url());
  });
  await settlePage(
    page,
    renderVoxyFirstExplainerFrameHtml({
      plan: buildVoxyFirstExplainerPlan(exactHeadSha),
      assets,
      frameIndex: 192,
      format: "16:9",
    }),
  );

  const fullContextPath = resolve(outputRoot, plan.output.fullContextFileName);
  const mark100Path = resolve(outputRoot, plan.output.mark100PctFileName);
  const mark200Path = resolve(outputRoot, plan.output.mark200PctFileName);
  const mark400Path = resolve(outputRoot, plan.output.mark400PctFileName);
  const newMaskedPath = resolve(outputRoot, ".new-masked.png");
  await page.screenshot({
    path: fullContextPath,
    type: "png",
    clip: plan.crops.fullContext,
  });
  await page.screenshot({
    path: mark100Path,
    type: "png",
    clip: plan.crops.mark,
  });
  await screenshotWithPocketMask({ page, path: newMaskedPath });
  await scalePng({
    source: mark100Path,
    destination: mark200Path,
    multiplier: 2,
    repositoryRoot,
  });
  await scalePng({
    source: mark100Path,
    destination: mark400Path,
    multiplier: 4,
    repositoryRoot,
  });

  await setPreviousPassPocketPresentation(page, previousPassPocketSvg);
  const before100Path = resolve(outputRoot, ".before-100pct.png");
  const before400Path = resolve(outputRoot, ".before-400pct.png");
  const beforeMaskedPath = resolve(outputRoot, ".before-masked.png");
  await page.screenshot({
    path: before100Path,
    type: "png",
    clip: plan.crops.mark,
  });
  await screenshotWithPocketMask({ page, path: beforeMaskedPath });
  await scalePng({
    source: before100Path,
    destination: before400Path,
    multiplier: 4,
    repositoryRoot,
  });

  const newMaskedBytes = await readFile(newMaskedPath);
  const beforeMaskedBytes = await readFile(beforeMaskedPath);
  const outsidePocketPixelMatch = {
    mask: { x: 842, y: 560, width: 108, height: 66 },
    beforeSha256: sha256(beforeMaskedBytes),
    candidateSha256: sha256(newMaskedBytes),
    matched: beforeMaskedBytes.equals(newMaskedBytes),
  };
  if (!outsidePocketPixelMatch.matched) {
    throw new Error("outside_pocket_pixels_changed");
  }

  const beforeAfterPath = resolve(outputRoot, plan.output.beforeAfterFileName);
  await page.setViewportSize({ width: 1500, height: 760 });
  await settlePage(
    page,
    renderBeforeAfterHtml({
      beforeDataUrl: dataUrl(await readFile(before400Path), "image/png"),
      afterDataUrl: dataUrl(await readFile(mark400Path), "image/png"),
    }),
  );
  await page
    .locator(".board")
    .screenshot({ path: beforeAfterPath, type: "png" });
  await browser.close();

  if (externalRequests.length > 0) {
    throw new Error(`external_requests_detected:${externalRequests.join(",")}`);
  }

  const outputFiles = [
    plan.output.fullContextFileName,
    plan.output.mark100PctFileName,
    plan.output.mark200PctFileName,
    plan.output.mark400PctFileName,
    plan.output.beforeAfterFileName,
  ];
  const outputs = Object.fromEntries(
    await Promise.all(
      outputFiles.map(async (file) => {
        const bytes = await readFile(resolve(outputRoot, file));
        return [file, { file, sha256: sha256(bytes), ...pngDimensions(bytes) }];
      }),
    ),
  );

  const manifest = {
    schemaVersion: plan.schemaVersion,
    exactHeadSha,
    rejectedHeadSha: plan.rejectedHeadSha,
    previousPassHeadSha: VOXY_POCKET_MARK_PREVIOUS_PASS_HEAD,
    microPassDecision: "adopted",
    expectedText: plan.brandQa.expectedText,
    visibleMarkCount: plan.brandQa.visibleMarkCount,
    badgePresent: plan.brandQa.badgePresent,
    secondLinePresent: plan.brandQa.secondLinePresent,
    vectorSource: plan.brandQa.vectorSource,
    rasterUpscaleUsed: plan.brandQa.rasterUpscaleUsed,
    strokePresent: plan.brandQa.strokePresent,
    glowPresent: plan.brandQa.glowPresent,
    boxPresent: plan.brandQa.boxPresent,
    humanLegibilityRequired: plan.brandQa.humanLegibilityRequired,
    humanVisualAcceptance: plan.brandQa.humanVisualAcceptance,
    machineOcrClaimed: plan.brandQa.machineOcrClaimed,
    technicalPocketGate: plan.brandQa.technicalStatus,
    sourceAsset: {
      path: relative(repositoryRoot, sourcePaths.pocketMark),
      sha256: await fileSha256(sourcePaths.pocketMark),
      textElementCount,
      textContent,
      internalResolution: "1600x480",
    },
    cleanedCompositionSource: {
      path: relative(repositoryRoot, sourcePaths.canonStage),
      sha256: await fileSha256(sourcePaths.canonStage),
      derivedFrom: relative(repositoryRoot, sourcePaths.canonSource),
      cleanupRegion: VOXY_POCKET_MARK_COMPOSITION_SOURCE.cleanupRegion,
      cleanupMethod: VOXY_POCKET_MARK_COMPOSITION_SOURCE.cleanupMethod,
      nativeResolution: true,
      rasterUpscaleUsed: false,
    },
    presentation: plan.presentation,
    previousPassPresentation: VOXY_POCKET_MARK_PREVIOUS_PASS_PRESENTATION,
    surfaceIntegration: {
      method: "native_svg_fill_opacity_allows_subtle_substrate_light_response",
      fillOpacity: 0.94,
      blur: false,
      filter: false,
    },
    unchangedLapelPin: {
      path: relative(repositoryRoot, sourcePaths.lapelPin),
      sha256: await fileSha256(sourcePaths.lapelPin),
      changed: plan.lapelPinChanged,
    },
    outsidePocketPixelMatch,
    outputs,
    animationEligible: plan.animationEligible,
    productionEligible: plan.productionEligible,
    autoPublish: plan.autoPublish,
    stopReason:
      "Pocket micro-pass adopted after direct visual comparison; human visual acceptance remains pending. No layer master, Motion v3, audio, explainer video, production, or publishing is authorized.",
  };
  await writeFile(
    resolve(outputRoot, plan.output.manifestFileName),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  for (const temporaryPath of [
    newMaskedPath,
    before100Path,
    before400Path,
    beforeMaskedPath,
  ]) {
    await rm(temporaryPath, { force: true });
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        status: "technical_pocket_gate_passed_human_review_pending",
        exactHeadSha,
        outputRoot: relative(process.cwd(), outputRoot),
        evidenceFiles: outputFiles,
        expectedText: manifest.expectedText,
        humanVisualAcceptance: manifest.humanVisualAcceptance,
        animationEligible: manifest.animationEligible,
        productionEligible: manifest.productionEligible,
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
