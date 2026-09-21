import { chromium } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { renderVoxyEditorialCompositionFrameHtml } from "../src/features/voxyVideo/editorialCompositionHtml";
import {
  VOXY_EDITORIAL_STORY_PLAN_VERSION,
  type VoxyEditorialStoryPlan,
  type VoxyEditorialTimeline,
} from "../src/features/voxyVideo/editorialStoryPlan";
import {
  VOXY_FINAL_CANON,
  assertVoxyFinalCanonBinding,
  finalVoxyCanonBinding,
} from "../src/features/voxyVideo/finalCanon";
import { VOXY_FIRST_EXPLAINER_STUDIO_LOCKUP_PATH } from "../src/features/voxyVideo/firstExplainerVideo";
import { VOXY_CANONICAL_CLEAN_STUDIO_BACKGROUND } from "../src/features/voxyVideo/headAlphaSilhouette";
import { VOXY_POCKET_MARK_COMPOSITION_SOURCE } from "../src/features/voxyVideo/pocketMarkFinalGate";
import { VOXY_STATIC_CANON_NATIVE_ASSETS } from "../src/features/voxyVideo/staticCanonRecovery";
import type { VoxyMotionV4EmbeddedAssets } from "../src/features/voxyVideo/motionV4Html";
import type { VoxyVideoFormat } from "../src/features/voxyVideo/modernCharacterContracts";

assertVoxyFinalCanonBinding(finalVoxyCanonBinding());

const TARGETS = [
  { format: "16:9" as const, width: 1920, height: 1080 },
  { format: "9:16" as const, width: 1080, height: 1920 },
  { format: "1:1" as const, width: 1080, height: 1080 },
];

function argument(name: string): string | null {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function mimeForPath(file: string): string {
  const extension = path.extname(file).toLowerCase();
  if (extension === ".svg") return "image/svg+xml";
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  throw new Error(`editorial_smoke_asset_mime_unsupported:${extension || "none"}`);
}

async function dataUrl(file: string): Promise<string> {
  return `data:${mimeForPath(file)};base64,${(await readFile(file)).toString("base64")}`;
}

async function sha256(file: string): Promise<string> {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

async function assets(repositoryRoot: string): Promise<VoxyMotionV4EmbeddedAssets> {
  return {
    canonStageDataUrl: await dataUrl(
      path.resolve(repositoryRoot, VOXY_POCKET_MARK_COMPOSITION_SOURCE.repositoryPath),
    ),
    canonicalCleanStudioBackgroundDataUrl: await dataUrl(
      path.resolve(repositoryRoot, VOXY_CANONICAL_CLEAN_STUDIO_BACKGROUND.repositoryPath),
    ),
    studioLockupDataUrl: await dataUrl(
      path.resolve(repositoryRoot, VOXY_FIRST_EXPLAINER_STUDIO_LOCKUP_PATH),
    ),
    lapelPinDataUrl: await dataUrl(
      path.resolve(repositoryRoot, VOXY_STATIC_CANON_NATIVE_ASSETS.lapelPin),
    ),
    edebattePocketMarkDataUrl: await dataUrl(
      path.resolve(repositoryRoot, VOXY_STATIC_CANON_NATIVE_ASSETS.edebattePocketMark),
    ),
  };
}

function storyPlan(): VoxyEditorialStoryPlan {
  return {
    version: VOXY_EDITORIAL_STORY_PLAN_VERSION,
    storyPlanId: "editorial-smoke-story",
    revision: 1,
    briefingId: "editorial-smoke-briefing",
    dossierId: "editorial-smoke-dossier",
    title: "Wie Voxy Evidenz erklärt",
    locale: "de",
    originalLanguage: "de",
    outputLanguage: "de",
    archetype: "explainer",
    durationClass: "explainer",
    derivedFromStoryPlanId: null,
    derivedFromRevision: null,
    reviewRequired: true,
    autoRender: false,
    autoPublish: false,
    chapters: [
      {
        chapterId: "what-happened",
        role: "what_happened",
        headline: "Was ist passiert?",
        narration: "Voxy beginnt beim belegten Ausgangspunkt und trennt ihn von offenen Fragen.",
        claimBindings: [],
        sourceIds: ["source-primary"],
        findingIds: ["finding-primary"],
        openQuestionIds: [],
        evidenceWindow: {
          kind: "source",
          sourceIds: ["source-primary"],
          findingIds: ["finding-primary"],
        },
        consequences: [],
        motion: "highlighting_source",
      },
      {
        chapterId: "source-evidence",
        role: "source_evidence",
        headline: "Worauf stützt sich das?",
        narration: "Die Quelle und der Prüfpfad bleiben sichtbar, statt Gewissheit nur zu behaupten.",
        claimBindings: [],
        sourceIds: ["source-primary"],
        findingIds: ["finding-primary"],
        openQuestionIds: ["question-open"],
        evidenceWindow: {
          kind: "source",
          sourceIds: ["source-primary"],
          findingIds: ["finding-primary"],
        },
        consequences: [],
        motion: "explaining",
      },
    ],
  };
}

function timeline(): VoxyEditorialTimeline {
  return {
    storyPlanId: "editorial-smoke-story",
    storyPlanRevision: 1,
    durationClass: "explainer",
    durationMs: 120_000,
    chapters: [
      {
        chapterId: "what-happened",
        role: "what_happened",
        startMs: 0,
        endMs: 60_000,
        motion: "highlighting_source",
      },
      {
        chapterId: "source-evidence",
        role: "source_evidence",
        startMs: 60_000,
        endMs: 120_000,
        motion: "explaining",
      },
    ],
  };
}

async function assertCompositor(page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>["newPage"]>>) {
  const state = await page.evaluate(() => ({
    canonicalHeadCount: document.querySelectorAll('[data-head-layer="canonical-alpha-head"]').length,
    canonicalOutsideContribution:
      document.querySelector('[data-head-layer="canonical-alpha-head"]')?.getAttribute(
        "data-head-alpha-outside-contribution",
      ) ?? null,
    canonicalBodyCount: document.querySelectorAll(".canonical-body-master").length,
    legacyNeckPlateCount: document.querySelectorAll(".neck-plate").length,
    editorialRuntime:
      document.querySelector("main.viewport")?.getAttribute("data-editorial-runtime") ?? null,
    finalCanonId:
      document.querySelector(".editorial-story-overlay")?.getAttribute("data-final-canon-id") ?? null,
  }));
  if (
    state.canonicalHeadCount !== 1 ||
    state.canonicalOutsideContribution !== "0" ||
    state.canonicalBodyCount < 1 ||
    state.legacyNeckPlateCount !== 0 ||
    state.editorialRuntime !== "editorial_v1" ||
    state.finalCanonId !== VOXY_FINAL_CANON.canonId
  ) {
    throw new Error(`editorial_smoke_canon_invariant_failed:${JSON.stringify(state)}`);
  }
  return state;
}

async function main() {
  const repositoryRoot = path.resolve(import.meta.dirname, "../../..");
  const outputRoot = path.resolve(
    repositoryRoot,
    argument("output-root") ?? "artifacts/voxy-editorial-composition-smoke",
  );
  await mkdir(outputRoot, { recursive: true });

  const embeddedAssets = await assets(repositoryRoot);
  const plan = storyPlan();
  const boundTimeline = timeline();
  const captions = [
    {
      id: "caption-1",
      startMs: 0,
      endMs: 60_000,
      text: "Voxy beginnt beim belegten Ausgangspunkt und trennt ihn von offenen Fragen.",
    },
    {
      id: "caption-2",
      startMs: 60_000,
      endMs: 120_000,
      text: "Die Quelle und der Prüfpfad bleiben sichtbar, statt Gewissheit nur zu behaupten.",
    },
  ];
  const browser = await chromium.launch({
    headless: true,
    args: typeof process.getuid === "function" && process.getuid() === 0 ? ["--no-sandbox"] : [],
  });
  const surfaces: Array<{
    format: VoxyVideoFormat;
    width: number;
    height: number;
    file: string;
    sha256: string;
    canonicalHeadCount: number;
    canonicalOutsideContribution: string | null;
    canonicalBodyCount: number;
    legacyNeckPlateCount: number;
  }> = [];

  try {
    for (const target of TARGETS) {
      const context = await browser.newContext({
        viewport: { width: target.width, height: target.height },
        reducedMotion: "no-preference",
      });
      const page = await context.newPage();
      const externalRequests: string[] = [];
      page.on("request", (request) => {
        if (/^https?:/i.test(request.url())) externalRequests.push(request.url());
      });
      const html = renderVoxyEditorialCompositionFrameHtml({
        plan,
        timeline: boundTimeline,
        captions,
        assets: embeddedAssets,
        format: target.format,
        frameIndex: 24,
        amplitude: 0.35,
      });
      await page.setContent(html, { waitUntil: "load" });
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(Array.from(document.images).map((image) => image.decode()));
      });
      if (externalRequests.length) {
        throw new Error(`editorial_smoke_external_request:${externalRequests.join(",")}`);
      }
      const state = await assertCompositor(page);
      const fileName = `editorial-${target.format.replace(":", "x")}.png`;
      const file = path.join(outputRoot, fileName);
      await page.screenshot({
        path: file,
        type: "png",
        fullPage: false,
        clip: { x: 0, y: 0, width: target.width, height: target.height },
      });
      surfaces.push({
        format: target.format,
        width: target.width,
        height: target.height,
        file: fileName,
        sha256: await sha256(file),
        canonicalHeadCount: state.canonicalHeadCount,
        canonicalOutsideContribution: state.canonicalOutsideContribution,
        canonicalBodyCount: state.canonicalBodyCount,
        legacyNeckPlateCount: state.legacyNeckPlateCount,
      });
      await context.close();
    }
  } finally {
    await browser.close();
  }

  const manifest = {
    schemaVersion: "voxy-editorial-composition-smoke-v1",
    canon: finalVoxyCanonBinding(),
    storyPlan: {
      storyPlanId: plan.storyPlanId,
      revision: plan.revision,
      durationMs: boundTimeline.durationMs,
      reviewRequired: plan.reviewRequired,
      autoRender: plan.autoRender,
      autoPublish: plan.autoPublish,
    },
    renderPath: [
      "renderVoxyEditorialCompositionFrameHtml",
      "renderVoxyMotionV4FrameHtml",
      "renderVoxyCanonicalAlphaHeadRelativeFaceRig",
      "renderVoxyCanonicalBodyMasterLayer",
    ],
    externalRequestCount: 0,
    humanReviewRequired: true,
    autoApprove: false,
    autoPublish: false,
    surfaces,
  };
  await writeFile(
    path.join(outputRoot, "editorial-smoke-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
  console.log(JSON.stringify(manifest));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "unknown_editorial_smoke_error";
  console.error(`VOXY_EDITORIAL_COMPOSITION_SMOKE_FAILED:${message}`);
  process.exitCode = 1;
});
