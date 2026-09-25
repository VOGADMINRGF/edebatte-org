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
  buildVoxyJacketCanonGatePlan,
  validateVoxyJacketCanonGatePlan,
} from "../src/features/voxyVideo/jacketCanonGate";
import { VOXY_POCKET_MARK_COMPOSITION_SOURCE } from "../src/features/voxyVideo/pocketMarkFinalGate";
import {
  VOXY_STATIC_CANON_BOARDS,
  VOXY_STATIC_CANON_FINAL_CAMERA,
  VOXY_STATIC_CANON_NATIVE_ASSETS,
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

function renderCanonReferenceHtml(canonStageDataUrl: string): string {
  const camera = VOXY_STATIC_CANON_FINAL_CAMERA;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#010511}.viewport{position:relative;width:1920px;height:1080px;overflow:hidden;background:#010511}.studio-stage{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:translate(${camera.translateX}px,${camera.translateY}px) scale(${camera.scale});transform-origin:${camera.transformOrigin};filter:saturate(1.08) contrast(1.06) brightness(.92)}.studio-grade{position:absolute;inset:0;background:radial-gradient(circle at 47% 38%,rgba(32,102,255,.05),transparent 29%),linear-gradient(90deg,rgba(1,5,17,.88) 0%,rgba(1,5,17,.38) 29%,transparent 54%,rgba(1,5,17,.76) 88%,#010511 100%)}
</style></head><body><main class="viewport"><img class="studio-stage" src="${canonStageDataUrl}" alt=""><div class="studio-grade"></div></main></body></html>`;
}

function renderComparisonHtml(input: {
  candidateDataUrl: string;
  canonDataUrl: string;
}): string {
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{margin:0;width:1600px;height:900px;overflow:hidden;background:#050914;color:#f5f7fb;font-family:Arial,Helvetica,sans-serif}.board{width:1600px;height:900px;padding:46px 54px}.header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:28px}.eyebrow{color:#53e4ae;font-weight:900;letter-spacing:.14em}.title{margin:8px 0 0;font-size:36px}.gate{padding:12px 18px;border:2px solid #35d89a;border-radius:999px;color:#75ebbb;font-weight:900;letter-spacing:.12em}.pair{display:grid;grid-template-columns:1fr 1fr;gap:28px}.panel{padding:20px;border:1px solid #293750;border-radius:18px;background:#091120}.panel h2{margin:0 0 14px;font-size:18px;letter-spacing:.08em}.panel img{display:block;width:100%;height:465px;object-fit:contain;background:#010511}.notes{margin-top:24px;padding:18px 22px;border-left:4px solid #35d89a;background:#111829;font-size:20px;line-height:1.45}.notes strong{color:#75ebbb}
</style></head><body><main class="board"><header class="header"><div><div class="eyebrow">VOXY · HARD CANON REGION</div><h1 class="title">Jacket Canon Comparison</h1></div><div class="gate">TECHNICAL PASS</div></header><section class="pair"><article class="panel"><h2>NEW · RECONSTRUCTED WORDMARKS</h2><img src="${input.candidateDataUrl}" alt="Jacket with reconstructed VOXY and eDebatte marks"></article><article class="panel"><h2>CANON-04 · GEOMETRY REFERENCE</h2><img src="${input.canonDataUrl}" alt="Canon-04 geometry reference crop"></article></section><section class="notes"><strong>HUMAN REVIEW PENDING:</strong> Außerhalb der zwei Markenmasken bleiben die Jacket-Pixel unverändert. VOXY und eDebatte sind lesbar neu gerenderte Vektorlayer; ihre finale visuelle Akzeptanz wird hier nicht automatisiert behauptet.</section></main></body></html>`;
}

function renderLegibilityComparisonHtml(input: {
  canonLapelDataUrl: string;
  beforeLapelDataUrl: string;
  newLapelDataUrl: string;
  canonPocketDataUrl: string;
  beforePocketDataUrl: string;
  newPocketDataUrl: string;
}): string {
  const panel = (label: string, image: string, alt: string) =>
    `<article class="panel"><h3>${label}</h3><img src="${image}" alt="${alt}"></article>`;
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{margin:0;width:1800px;height:1050px;overflow:hidden;background:#050914;color:#f5f7fb;font-family:Arial,Helvetica,sans-serif}.board{width:1800px;height:1050px;padding:44px 52px}.eyebrow{color:#53e4ae;font-weight:900;letter-spacing:.14em}.header{display:flex;justify-content:space-between;align-items:flex-end}.header h1{margin:8px 0 0;font-size:38px}.gate{padding:12px 18px;border:2px solid #35d89a;border-radius:999px;color:#75ebbb;font-weight:900;letter-spacing:.1em}.section{margin-top:28px}.section-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}.section h2{margin:0;font-size:22px;letter-spacing:.08em}.expected{color:#75ebbb;font-size:18px;font-weight:900;letter-spacing:.08em}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}.panel{padding:15px;border:1px solid #293750;border-radius:16px;background:#091120}.panel h3{margin:0 0 10px;color:#a9bdd5;font-size:15px;letter-spacing:.12em}.panel img{display:block;width:100%;height:292px;object-fit:contain;background:#010511}.notice{margin-top:22px;padding:15px 20px;border-left:4px solid #35d89a;background:#111829;font-size:17px}.notice strong{color:#75ebbb}
</style></head><body><main class="board"><header class="header"><div><div class="eyebrow">VOXY · BRAND LEGIBILITY</div><h1>CANON · VORHER · NEU</h1></div><div class="gate">HUMAN REVIEW PENDING</div></header><section class="section"><div class="section-head"><h2>REVERS-PIN</h2><div class="expected">EXPECTED: VOXY</div></div><div class="grid">${panel("CANON", input.canonLapelDataUrl, "Canon lapel pin")}${panel("VORHER · 64b79c79", input.beforeLapelDataUrl, "Human-rejected prior lapel pin")}${panel("NEU · VECTOR", input.newLapelDataUrl, "Reconstructed VOXY lapel pin")}</div></section><section class="section"><div class="section-head"><h2>BRUSTTASCHE</h2><div class="expected">EXPECTED: eDebatte</div></div><div class="grid">${panel("CANON", input.canonPocketDataUrl, "Canon pocket mark")}${panel("VORHER · 64b79c79", input.beforePocketDataUrl, "Human-rejected prior pocket mark")}${panel("NEU · VECTOR", input.newPocketDataUrl, "Reconstructed eDebatte pocket mark")}</div></section><div class="notice"><strong>STOP:</strong> Technischer PASS erlaubt weder Layer-Master noch Motion v3. Die Wortmarken benötigen die nächste menschliche Sichtfreigabe.</div></main></body></html>`;
}

async function screenshotMaskedNonBrandJacket(input: {
  page: Page;
  path: string;
  clip: { x: number; y: number; width: number; height: number };
  masks: Readonly<Record<string, { x: number; y: number; width: number; height: number }>>;
}): Promise<void> {
  await input.page.evaluate((masks) => {
    for (const mask of Object.values(masks)) {
      const element = document.createElement("div");
      element.dataset.jacketBrandMask = "true";
      Object.assign(element.style, {
        position: "fixed",
        left: `${mask.x}px`,
        top: `${mask.y}px`,
        width: `${mask.width}px`,
        height: `${mask.height}px`,
        background: "#ff00ff",
        zIndex: "9999",
      });
      document.body.append(element);
    }
  }, input.masks);
  await input.page.screenshot({ path: input.path, type: "png", clip: input.clip });
  await input.page.evaluate(() => {
    document
      .querySelectorAll("[data-jacket-brand-mask='true']")
      .forEach((element) => element.remove());
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

async function main(): Promise<void> {
  const exactHeadSha = process.env.VOXY_JACKET_GATE_COMMIT_SHA?.trim() ?? "";
  if (!/^[0-9a-f]{40}$/.test(exactHeadSha)) {
    throw new Error("VOXY_JACKET_GATE_COMMIT_SHA_must_be_exact_40_char_sha");
  }

  const webRoot = resolve(import.meta.dirname, "..");
  const repositoryRoot = resolve(webRoot, "../..");
  const currentHead = runBinary("git", ["rev-parse", "HEAD"], repositoryRoot);
  if (currentHead !== exactHeadSha) {
    throw new Error(`exact_head_mismatch:${currentHead}:${exactHeadSha}`);
  }

  const evidenceInputs = [
    ".github/workflows/voxy-jacket-canon-gate.yml",
    "apps/web/scripts/render-voxy-jacket-canon-gate.ts",
    "apps/web/src/features/voxyVideo/jacketCanonGate.ts",
    "apps/web/src/features/voxyVideo/firstExplainerVideo.ts",
    "apps/web/src/features/voxyVideo/firstExplainerVideoHtml.ts",
    "apps/web/src/features/voxyVideo/staticCanonRecovery.ts",
    "apps/web/src/features/voxyVideo/staticCanonRecoveryHtml.ts",
    "apps/web/public/brands/voxy/references/canon",
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
      `exact_head_jacket_gate_inputs_dirty:${dirtyInputs.replaceAll("\n", ",")}`,
    );
  }

  const plan = buildVoxyJacketCanonGatePlan(exactHeadSha);
  const planErrors = validateVoxyJacketCanonGatePlan(plan);
  if (planErrors.length > 0) {
    throw new Error(`jacket_gate_plan_invalid:${planErrors.join(",")}`);
  }

  const canonEvidence = [];
  for (const board of VOXY_STATIC_CANON_BOARDS) {
    const path = repositoryPath(repositoryRoot, board.repositoryPath);
    const bytes = await readFile(path);
    const dimensions = pngDimensions(bytes);
    const actualSha256 = sha256(bytes);
    if (
      actualSha256 !== board.sha256 ||
      dimensions.width !== board.width ||
      dimensions.height !== board.height
    ) {
      throw new Error(`canon_board_contract_mismatch:${board.id}`);
    }
    canonEvidence.push({
      id: board.id,
      path: board.repositoryPath,
      sha256: actualSha256,
      ...dimensions,
    });
  }

  const outputRoot = resolve(
    process.cwd(),
    argument("output") ?? plan.output.outputDirectory,
  );
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });

  const sourcePaths = {
    canonStage: repositoryPath(
      repositoryRoot,
      VOXY_POCKET_MARK_COMPOSITION_SOURCE.repositoryPath,
    ),
    canonGeometryReference: repositoryPath(
      repositoryRoot,
      plan.source.canonBoardPath,
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
  const lapelPinSource = await readFile(sourcePaths.lapelPin, "utf8");
  const pocketMarkSource = await readFile(
    sourcePaths.edebattePocketMark,
    "utf8",
  );
  if (
    !/>VOXY<\//.test(lapelPinSource) ||
    />VOG<\//.test(lapelPinSource) ||
    !/>eDebatte<\//.test(pocketMarkSource) ||
    />eDebotte<\//.test(pocketMarkSource)
  ) {
    throw new Error("reconstructed_brand_source_text_contract_failed");
  }
  const assets: VoxyFirstExplainerEmbeddedAssets = {
    canonStageDataUrl: dataUrl(await readFile(sourcePaths.canonStage), "image/png"),
    studioLockupDataUrl: dataUrl(
      await readFile(sourcePaths.studioLockup),
      "image/svg+xml",
    ),
    lapelPinDataUrl: dataUrl(Buffer.from(lapelPinSource), "image/svg+xml"),
    edebattePocketMarkDataUrl: dataUrl(
      Buffer.from(pocketMarkSource),
      "image/svg+xml",
    ),
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

  const candidateFrameIndex = 192;
  await settlePage(
    page,
    renderVoxyFirstExplainerFrameHtml({
      plan: buildVoxyFirstExplainerPlan(exactHeadSha),
      assets,
      frameIndex: candidateFrameIndex,
      format: "16:9",
    }),
  );

  const jacketFullPath = resolve(outputRoot, plan.output.jacketFullFileName);
  const jacketMatchCandidatePath = resolve(
    outputRoot,
    ".jacket-match-candidate.png",
  );
  const lapelSourcePath = resolve(outputRoot, ".lapel-source.png");
  const pocketSourcePath = resolve(outputRoot, ".pocket-source.png");
  await page.screenshot({
    path: jacketFullPath,
    type: "png",
    clip: plan.cropContract.jacket,
  });
  await screenshotMaskedNonBrandJacket({
    page,
    path: jacketMatchCandidatePath,
    clip: plan.nonBrandPixelMatchCrop,
    masks: plan.brandReplacementMasks,
  });
  await page.screenshot({
    path: lapelSourcePath,
    type: "png",
    clip: plan.cropContract.lapelPin,
  });
  await page.screenshot({
    path: pocketSourcePath,
    type: "png",
    clip: plan.cropContract.pocketMark,
  });

  const jacket200PctPath = resolve(
    outputRoot,
    plan.output.jacket200PctFileName,
  );
  const lapel400PctPath = resolve(
    outputRoot,
    plan.output.lapelPin400PctFileName,
  );
  const pocket400PctPath = resolve(
    outputRoot,
    plan.output.pocketMark400PctFileName,
  );
  await scalePng({
    source: jacketFullPath,
    destination: jacket200PctPath,
    multiplier: 2,
    repositoryRoot,
  });
  await scalePng({
    source: lapelSourcePath,
    destination: lapel400PctPath,
    multiplier: 4,
    repositoryRoot,
  });
  await scalePng({
    source: pocketSourcePath,
    destination: pocket400PctPath,
    multiplier: 4,
    repositoryRoot,
  });

  await settlePage(
    page,
    renderCanonReferenceHtml(
      dataUrl(await readFile(sourcePaths.canonGeometryReference), "image/png"),
    ),
  );
  const canonJacketPath = resolve(outputRoot, ".canon-jacket-source.png");
  const canonJacketMatchPath = resolve(outputRoot, ".canon-jacket-match.png");
  const canonLapelPath = resolve(outputRoot, ".canon-lapel-source.png");
  const canonPocketPath = resolve(outputRoot, ".canon-pocket-source.png");
  await page.screenshot({
    path: canonJacketPath,
    type: "png",
    clip: plan.cropContract.jacket,
  });
  await screenshotMaskedNonBrandJacket({
    page,
    path: canonJacketMatchPath,
    clip: plan.nonBrandPixelMatchCrop,
    masks: plan.brandReplacementMasks,
  });
  await page.screenshot({
    path: canonLapelPath,
    type: "png",
    clip: plan.cropContract.lapelPin,
  });
  await page.screenshot({
    path: canonPocketPath,
    type: "png",
    clip: plan.cropContract.pocketMark,
  });
  const comparisonPath = resolve(outputRoot, plan.output.comparisonFileName);
  await page.setViewportSize({ width: 1600, height: 900 });
  await settlePage(
    page,
    renderComparisonHtml({
      candidateDataUrl: dataUrl(await readFile(jacketFullPath), "image/png"),
      canonDataUrl: dataUrl(await readFile(canonJacketPath), "image/png"),
    }),
  );
  await page.locator(".board").screenshot({ path: comparisonPath, type: "png" });
  const legibilityComparisonPath = resolve(
    outputRoot,
    plan.output.legibilityComparisonFileName,
  );
  await page.setViewportSize({ width: 1800, height: 1050 });
  await settlePage(
    page,
    renderLegibilityComparisonHtml({
      canonLapelDataUrl: dataUrl(await readFile(canonLapelPath), "image/png"),
      beforeLapelDataUrl: dataUrl(await readFile(canonLapelPath), "image/png"),
      newLapelDataUrl: dataUrl(await readFile(lapelSourcePath), "image/png"),
      canonPocketDataUrl: dataUrl(await readFile(canonPocketPath), "image/png"),
      beforePocketDataUrl: dataUrl(await readFile(canonPocketPath), "image/png"),
      newPocketDataUrl: dataUrl(await readFile(pocketSourcePath), "image/png"),
    }),
  );
  await page
    .locator(".board")
    .screenshot({ path: legibilityComparisonPath, type: "png" });
  await browser.close();

  if (externalRequests.length > 0) {
    throw new Error(`external_requests_detected:${externalRequests.join(",")}`);
  }

  const candidateNonBrandBytes = await readFile(jacketMatchCandidatePath);
  const referenceNonBrandBytes = await readFile(canonJacketMatchPath);
  const nonBrandPixelMatch = {
    crop: plan.nonBrandPixelMatchCrop,
    replacementMasks: plan.brandReplacementMasks,
    maskFill: "#ff00ff",
    candidateSha256: sha256(candidateNonBrandBytes),
    referenceSha256: sha256(referenceNonBrandBytes),
    matched: candidateNonBrandBytes.equals(referenceNonBrandBytes),
  };
  if (!nonBrandPixelMatch.matched) {
    throw new Error("jacket_canon_non_brand_pixel_match_failed");
  }

  const outputFiles = [
    plan.output.jacketFullFileName,
    plan.output.jacket200PctFileName,
    plan.output.lapelPin400PctFileName,
    plan.output.pocketMark400PctFileName,
    plan.output.comparisonFileName,
    plan.output.legibilityComparisonFileName,
  ];
  const outputs = Object.fromEntries(
    await Promise.all(
      outputFiles.map(async (file) => {
        const path = resolve(outputRoot, file);
        const bytes = await readFile(path);
        return [file, { file, sha256: sha256(bytes), ...pngDimensions(bytes) }];
      }),
    ),
  );

  const manifest = {
    schemaVersion: plan.schemaVersion,
    exactHeadSha,
    staticMasterSha: await fileSha256(sourcePaths.canonStage),
    canonHashes: plan.source.allCanonHashes,
    canonEvidence,
    hardCanonRegion: plan.hardCanonRegion,
    cropContract: plan.cropContract,
    nonBrandPixelMatch,
    markProvenance: plan.markProvenance,
    comparison: plan.comparison,
    candidateFrameIndex,
    sourceAssets: {
      canonStage: {
        path: relative(repositoryRoot, sourcePaths.canonStage),
        sha256: await fileSha256(sourcePaths.canonStage),
      },
      canonGeometryReference: {
        path: relative(repositoryRoot, sourcePaths.canonGeometryReference),
        sha256: await fileSha256(sourcePaths.canonGeometryReference),
      },
      lapelPin: {
        path: relative(repositoryRoot, sourcePaths.lapelPin),
        sha256: await fileSha256(sourcePaths.lapelPin),
        exactText: "VOXY",
        geometryReference: "CANON-04",
        reconstructedForLegibility: true,
      },
      pocketMark: {
        path: relative(repositoryRoot, sourcePaths.edebattePocketMark),
        sha256: await fileSha256(sourcePaths.edebattePocketMark),
        exactText: "eDebatte",
        geometryReference: "CANON-04",
        reconstructedForLegibility: true,
      },
    },
    outputs,
    jacketCanonGate: plan.jacketCanonGate,
    brandQa: plan.brandQa,
    humanDecision: plan.humanDecision,
    layerMasterEligible: plan.layerMasterEligible,
    motionV3Eligible: plan.motionV3Eligible,
    animationEligible: plan.animationEligible,
    externalProviderUsed: plan.externalProviderUsed,
    externalUploadUsed: plan.externalUploadUsed,
    generativeReplacementUsed: plan.generativeReplacementUsed,
    humanVisualAcceptance: plan.humanVisualAcceptance,
    productionEligible: plan.productionEligible,
    autoPublish: plan.autoPublish,
    stopReason:
      "Jacket Canon Gate passed; human visual acceptance remains pending. No layer master or Motion v3 render is authorized.",
  };
  await writeFile(
    resolve(outputRoot, plan.output.manifestFileName),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
  await rm(lapelSourcePath, { force: true });
  await rm(pocketSourcePath, { force: true });
  await rm(canonJacketPath, { force: true });
  await rm(jacketMatchCandidatePath, { force: true });
  await rm(canonJacketMatchPath, { force: true });
  await rm(canonLapelPath, { force: true });
  await rm(canonPocketPath, { force: true });

  process.stdout.write(
    `${JSON.stringify(
      {
        status: "jacket_canon_gate_passed_human_review_pending",
        exactHeadSha,
        outputRoot: relative(process.cwd(), outputRoot),
        evidenceFiles: outputFiles,
        lapelPin: manifest.brandQa.lapelPin,
        pocketMark: manifest.brandQa.pocketMark,
        animationEligible: manifest.animationEligible,
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
