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
import { dirname, join, relative, resolve } from "node:path";
import {
  buildVoxyRigFrame,
  validateVoxyLocalRigFrame,
  VOXY_CANONICAL_VISUAL_SOURCE,
  VOXY_LOCAL_RIG,
  VOXY_RIG_FIXTURE_TIMELINE,
  VOXY_RIG_MOTION_PROFILE,
} from "../src/features/voxyVideo/animatableMasterAsset";
import {
  buildVoxyCharacterMotionFixturePlan,
  validateVoxyCharacterMotionFixturePlan,
} from "../src/features/voxyVideo/characterMotionFixture";
import {
  getVoxyRigFrameCssProperties,
  renderVoxyCharacterMotionFixtureHtml,
} from "../src/features/voxyVideo/characterMotionFixtureHtml";
import type { VoxyVideoFormat } from "../src/features/voxyVideo/modernCharacterContracts";

const FORMATS = ["16:9", "9:16", "1:1"] as const satisfies readonly VoxyVideoFormat[];
const STAND_TIMES_MS = [1_000, 3_000, 5_000, 7_000] as const;
const FPS = 24;
const DURATION_MS = 8_000;
const FRAME_COUNT = (DURATION_MS / 1_000) * FPS;

type Bounds = { x: number; y: number; width: number; height: number };

function readArgument(name: string): string | null {
  const prefix = `--${name}=`;
  return (
    process.argv
      .slice(2)
      .find((entry) => entry.startsWith(prefix))
      ?.slice(prefix.length) ?? null
  );
}

function sha256(content: Buffer | string): string {
  return createHash("sha256").update(content).digest("hex");
}

async function fileSha256(path: string): Promise<string> {
  return sha256(await readFile(path));
}

function runBinary(binary: string, args: string[]): string {
  const result = spawnSync(binary, args, { encoding: "utf8" });
  if (result.error || result.status !== 0) {
    throw new Error(
      `${binary}_failed:${result.error?.message ?? result.stderr.trim()}`,
    );
  }
  return result.stdout.trim();
}

function repositoryAssetPath(repositoryRoot: string, repositoryPath: string): string {
  const resolved = resolve(repositoryRoot, repositoryPath);
  if (!resolved.startsWith(`${repositoryRoot}/`)) {
    throw new Error("repository_asset_path_escape");
  }
  return resolved;
}

function publicAssetPath(webRoot: string, publicPath: string): string {
  if (!publicPath.startsWith("/brands/voxy/")) {
    throw new Error("non_canonical_voxy_public_asset");
  }
  return resolve(webRoot, "public", publicPath.slice(1));
}

async function embeddedSvgDataUrl(path: string): Promise<string> {
  const svg = await readFile(path, "utf8");
  if (!svg.includes("<svg")) throw new Error(`invalid_svg:${path}`);
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

async function applyRigFrame(page: Page, timeMs: number): Promise<void> {
  const frame = buildVoxyRigFrame(timeMs);
  const errors = validateVoxyLocalRigFrame(frame);
  if (errors.length > 0) {
    throw new Error(`invalid_rig_frame:${errors.join(",")}`);
  }
  await page.evaluate(
    ({ captureTimeMs, state, properties }) => {
      const fixture = document.getElementById("fixture");
      if (!fixture) throw new Error("fixture_root_missing");
      fixture.style.setProperty("--capture-time", `${captureTimeMs}ms`);
      fixture.dataset.rigState = state;
      for (const [name, value] of Object.entries(properties)) {
        fixture.style.setProperty(name, value);
      }
      void fixture.offsetHeight;
    },
    {
      captureTimeMs: timeMs,
      state: frame.state,
      properties: getVoxyRigFrameCssProperties(frame),
    },
  );
}

async function inspectHand(page: Page, side: "left" | "right"): Promise<{
  bounds: Bounds;
  digitLandmarks: Array<{ id: string; centerX: number; centerY: number }>;
}> {
  const definition = VOXY_LOCAL_RIG.hands[side];
  return page.evaluate(
    ({ groupId, digitIds }) => {
      const group = document.getElementById(groupId);
      if (!group) throw new Error(`hand_group_missing:${groupId}`);
      const bounds = group.getBoundingClientRect();
      const digitLandmarks = digitIds.map((id) => {
        const digit = document.getElementById(id);
        if (!digit) throw new Error(`hand_digit_missing:${id}`);
        const box = digit.getBoundingClientRect();
        return {
          id,
          centerX: Number((box.left + box.width / 2).toFixed(3)),
          centerY: Number((box.top + box.height / 2).toFixed(3)),
        };
      });
      return {
        bounds: {
          x: Number(bounds.x.toFixed(3)),
          y: Number(bounds.y.toFixed(3)),
          width: Number(bounds.width.toFixed(3)),
          height: Number(bounds.height.toFixed(3)),
        },
        digitLandmarks,
      };
    },
    { groupId: definition.groupId, digitIds: [...definition.digitIds] },
  );
}

async function analyseRenderedHandPixels(
  page: Page,
  png: Buffer,
): Promise<{ width: number; height: number; lightNeutralPixels: number }> {
  return page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("canvas_context_unavailable");
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let lightNeutralPixels = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      const red = pixels[index];
      const green = pixels[index + 1];
      const blue = pixels[index + 2];
      const spread = Math.max(red, green, blue) - Math.min(red, green, blue);
      if (red > 175 && green > 175 && blue > 175 && spread < 48) {
        lightNeutralPixels += 1;
      }
    }
    return { width: canvas.width, height: canvas.height, lightNeutralPixels };
  }, png.toString("base64"));
}

async function captureHandEvidence(input: {
  page: Page;
  format: VoxyVideoFormat;
  timeMs: number;
  outputRoot: string;
  width: number;
  height: number;
}): Promise<unknown[]> {
  const evidence: unknown[] = [];
  for (const side of ["left", "right"] as const) {
    const inspection = await inspectHand(input.page, side);
    const cropPath = join(
      input.outputRoot,
      "hand-crops",
      `${input.format.replace(":", "x")}-${input.timeMs}ms-${side}.png`,
    );
    await mkdir(dirname(cropPath), { recursive: true });
    const cropBuffer = await input.page
      .locator(`#${VOXY_LOCAL_RIG.hands[side].groupId}`)
      .screenshot({ path: cropPath, type: "png" });
    const pixelEvidence = await analyseRenderedHandPixels(input.page, cropBuffer);
    const bounds = inspection.bounds;
    const cropSafe =
      bounds.x >= 0 &&
      bounds.y >= 0 &&
      bounds.x + bounds.width <= input.width &&
      bounds.y + bounds.height <= input.height;
    const passed =
      cropSafe &&
      inspection.digitLandmarks.length === 5 &&
      pixelEvidence.lightNeutralPixels >= 100;
    if (!passed) throw new Error(`rendered_hand_qa_failed:${input.format}:${input.timeMs}:${side}`);
    evidence.push({
      side,
      crop: relative(input.outputRoot, cropPath),
      cropSha256: sha256(cropBuffer),
      bounds,
      cropSafe,
      landmarkEvidenceType: "rendered_svg_digit_center",
      digitLandmarks: inspection.digitLandmarks,
      fingerCount: inspection.digitLandmarks.length,
      pixelEvidence,
      status: "pass",
    });
  }
  return evidence;
}

async function main(): Promise<void> {
  const exactHeadSha = process.env.VOXY_FIXTURE_COMMIT_SHA?.trim() ?? "";
  if (!/^[0-9a-f]{40}$/.test(exactHeadSha)) {
    throw new Error("VOXY_FIXTURE_COMMIT_SHA_must_be_exact_40_char_git_sha");
  }

  const webRoot = resolve(import.meta.dirname, "..");
  const repositoryRoot = resolve(webRoot, "../..");
  const currentHead = runBinary("git", ["rev-parse", "HEAD"]);
  if (currentHead !== exactHeadSha) throw new Error("exact_head_does_not_match_checkout");
  const evidenceInputPaths = [
    "apps/web/scripts/render-voxy-animatable-rig-evidence.ts",
    "apps/web/src/features/voxyVideo/animatableMasterAsset.ts",
    "apps/web/src/features/voxyVideo/characterMotionFixture.ts",
    "apps/web/src/features/voxyVideo/characterMotionFixtureHtml.ts",
    "apps/web/public/brand/voxy/voxy-podcast-stage.png",
    "apps/web/public/brands/voxy/characters/voxy-sitting-master.svg",
    "apps/web/public/brands/voxy/studio",
  ];
  const changedEvidenceInputs = runBinary("git", [
    "diff",
    "--name-only",
    "HEAD",
    "--",
    ...evidenceInputPaths,
  ]);
  if (changedEvidenceInputs) {
    throw new Error(
      `exact_head_evidence_inputs_dirty:${changedEvidenceInputs.replaceAll("\n", ",")}`,
    );
  }

  const outputRoot = resolve(
    process.cwd(),
    readArgument("output") ?? "artifacts/voxy-animatable-rig-evidence",
  );
  const canonicalPath = repositoryAssetPath(
    repositoryRoot,
    VOXY_CANONICAL_VISUAL_SOURCE.repositoryPath,
  );
  const rigPath = repositoryAssetPath(repositoryRoot, VOXY_LOCAL_RIG.rigAssetPath);
  const rigSvg = await readFile(rigPath, "utf8");
  const ffmpeg = process.env.VOXY_FFMPEG_BIN?.trim() || "ffmpeg";
  const ffprobe = process.env.VOXY_FFPROBE_BIN?.trim() || "ffprobe";
  runBinary(ffmpeg, ["-version"]);
  runBinary(ffprobe, ["-version"]);

  await mkdir(outputRoot, { recursive: true });
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "voxy-rig-evidence-"));
  const framesDirectory = join(temporaryDirectory, "frames-16x9");
  await mkdir(framesDirectory, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const formatEvidence: unknown[] = [];
  let externalNetworkRequests = 0;
  let clipPath = "";
  let webmPath = "";
  try {
    for (const format of FORMATS) {
      const plan = buildVoxyCharacterMotionFixturePlan(format);
      const validation = validateVoxyCharacterMotionFixturePlan(plan);
      if (!validation.ok) throw new Error(`invalid_fixture_plan:${validation.errors.join(",")}`);
      const studioPath = publicAssetPath(webRoot, plan.studioAssetPath);
      const html = renderVoxyCharacterMotionFixtureHtml({
        plan,
        embeddedStudioAssetUrl: await embeddedSvgDataUrl(studioPath),
        embeddedCharacterSvg: rigSvg,
        captureTimeMs: 0,
      });
      const context = await browser.newContext({
        viewport: { width: plan.width, height: plan.height },
        reducedMotion: "no-preference",
      });
      await context.route(/^https?:\/\//, async (route) => {
        externalNetworkRequests += 1;
        await route.abort("blockedbyclient");
      });
      const page = await context.newPage();
      await page.setContent(html, { waitUntil: "load" });
      await page.waitForFunction(() =>
        Array.from(document.images).every((image) => image.complete),
      );

      const standframes: unknown[] = [];
      for (const timeMs of STAND_TIMES_MS) {
        await applyRigFrame(page, timeMs);
        const frame = buildVoxyRigFrame(timeMs);
        const standframePath = join(
          outputRoot,
          "standframes",
          `${format.replace(":", "x")}-${timeMs}ms-${frame.state}.png`,
        );
        await mkdir(dirname(standframePath), { recursive: true });
        await page.screenshot({
          path: standframePath,
          type: "png",
          clip: { x: 0, y: 0, width: plan.width, height: plan.height },
        });
        standframes.push({
          timeMs,
          state: frame.state,
          file: relative(outputRoot, standframePath),
          sha256: await fileSha256(standframePath),
          hands: await captureHandEvidence({
            page,
            format,
            timeMs,
            outputRoot,
            width: plan.width,
            height: plan.height,
          }),
        });
      }

      if (format === "16:9") {
        for (let frameIndex = 0; frameIndex < FRAME_COUNT; frameIndex += 1) {
          const timeMs = Math.round((frameIndex * 1_000) / FPS);
          await applyRigFrame(page, timeMs);
          await page.screenshot({
            path: join(
              framesDirectory,
              `frame-${String(frameIndex).padStart(4, "0")}.png`,
            ),
            type: "png",
            clip: { x: 0, y: 0, width: plan.width, height: plan.height },
          });
        }
        clipPath = join(
          outputRoot,
          `voxy-local-rig-${exactHeadSha.slice(0, 12)}-16x9.mp4`,
        );
        runBinary(ffmpeg, [
          "-y",
          "-framerate",
          String(FPS),
          "-i",
          join(framesDirectory, "frame-%04d.png"),
          "-frames:v",
          String(FRAME_COUNT),
          "-r",
          String(FPS),
          "-an",
          "-c:v",
          "libx264",
          "-pix_fmt",
          "yuv420p",
          "-movflags",
          "+faststart",
          clipPath,
        ]);
        webmPath = join(
          outputRoot,
          `voxy-local-rig-${exactHeadSha.slice(0, 12)}-16x9.webm`,
        );
        runBinary(ffmpeg, [
          "-y",
          "-framerate",
          String(FPS),
          "-i",
          join(framesDirectory, "frame-%04d.png"),
          "-frames:v",
          String(FRAME_COUNT),
          "-r",
          String(FPS),
          "-an",
          "-c:v",
          "libvpx-vp9",
          "-deadline",
          "good",
          "-cpu-used",
          "4",
          "-crf",
          "32",
          "-b:v",
          "0",
          "-pix_fmt",
          "yuv420p",
          webmPath,
        ]);
      }

      formatEvidence.push({
        format,
        width: plan.width,
        height: plan.height,
        standframes,
      });
      await context.close();
    }
  } finally {
    await browser.close();
  }

  if (!clipPath || !webmPath) throw new Error("primary_clip_missing");
  if (externalNetworkRequests !== 0) {
    throw new Error(`external_network_request_blocked:${externalNetworkRequests}`);
  }
  const probe = JSON.parse(
    runBinary(ffprobe, [
      "-v",
      "error",
      "-count_frames",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height,r_frame_rate,avg_frame_rate,nb_frames,nb_read_frames:format=duration",
      "-of",
      "json",
      clipPath,
    ]),
  ) as {
    streams?: Array<Record<string, string | number>>;
    format?: Record<string, string>;
  };
  const stream = probe.streams?.[0];
  const durationSeconds = Number(probe.format?.duration);
  const reportedFrameCount = Number(stream?.nb_read_frames ?? stream?.nb_frames);
  if (
    stream?.width !== 1280 ||
    stream?.height !== 720 ||
    stream?.avg_frame_rate !== "24/1" ||
    reportedFrameCount !== FRAME_COUNT ||
    Math.abs(durationSeconds - 8) > 0.01
  ) {
    throw new Error(`render_media_contract_failed:${JSON.stringify(probe)}`);
  }
  const webmProbe = JSON.parse(
    runBinary(ffprobe, [
      "-v",
      "error",
      "-count_frames",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height,r_frame_rate,avg_frame_rate,nb_frames,nb_read_frames:format=duration",
      "-of",
      "json",
      webmPath,
    ]),
  ) as {
    streams?: Array<Record<string, string | number>>;
    format?: Record<string, string>;
  };
  const webmStream = webmProbe.streams?.[0];
  const webmDurationSeconds = Number(webmProbe.format?.duration);
  const webmFrameCount = Number(
    webmStream?.nb_read_frames ?? webmStream?.nb_frames,
  );
  if (
    webmStream?.width !== 1280 ||
    webmStream?.height !== 720 ||
    webmStream?.avg_frame_rate !== "24/1" ||
    webmFrameCount !== FRAME_COUNT ||
    Math.abs(webmDurationSeconds - 8) > 0.01
  ) {
    throw new Error(
      `render_webm_media_contract_failed:${JSON.stringify(webmProbe)}`,
    );
  }

  const manifest = {
    schemaVersion: "voxy-animatable-rig-evidence-v1",
    taskId: "VOXY-ANIMATABLE-MASTER-ASSET-01",
    exactHeadSha,
    generatedAt: new Date().toISOString(),
    execution: {
      mode: "fully_local",
      networkRequired: false,
      externalNetworkRequests,
      providerRequired: false,
      uploadPerformed: false,
      generativeHands: false,
    },
    provenance: {
      canonicalReference: {
        path: VOXY_CANONICAL_VISUAL_SOURCE.repositoryPath,
        sha256: await fileSha256(canonicalPath),
      },
      rig: {
        id: VOXY_LOCAL_RIG.id,
        version: VOXY_LOCAL_RIG.version,
        implementation: VOXY_LOCAL_RIG.implementation,
        path: VOXY_LOCAL_RIG.rigAssetPath,
        sha256: await fileSha256(rigPath),
        licenseStatus: "first_party_repository_asset_no_model_weights",
      },
      motionProfile: {
        ...VOXY_RIG_MOTION_PROFILE,
        handPresentation: VOXY_LOCAL_RIG.handPresentation,
      },
    },
    render: {
      clip: relative(outputRoot, clipPath),
      clipSha256: await fileSha256(clipPath),
      webm: relative(outputRoot, webmPath),
      webmSha256: await fileSha256(webmPath),
      durationMs: DURATION_MS,
      fps: FPS,
      frameCount: FRAME_COUNT,
      width: 1280,
      height: 720,
      codec: "h264",
      pixelFormat: "yuv420p",
      ffprobe: probe,
      webmFfprobe: webmProbe,
    },
    timeline: VOXY_RIG_FIXTURE_TIMELINE,
    formats: formatEvidence,
    qa: {
      contract: "rendered_hand_crop_and_svg_landmark_smoke_v1",
      note: "Pixel evidence and rendered digit centers are a local smoke; PR #588 remains the independent fail-closed visual checkpoint.",
      status: "pass",
    },
    humanVisualAcceptance: "pending",
    productionEligible: false,
    autoPublish: false,
  } as const;
  const manifestPath = join(outputRoot, "manifest.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await copyFile(
    join(outputRoot, "standframes", "16x9-1000ms-neutral_idle.png"),
    join(outputRoot, "preview.png"),
  );
  await rm(temporaryDirectory, { recursive: true, force: true });

  console.log(
    JSON.stringify(
      {
        status: "voxy_animatable_rig_evidence_rendered",
        exactHeadSha,
        outputRoot,
        manifest: manifestPath,
        clip: clipPath,
        clipSha256: manifest.render.clipSha256,
        webm: webmPath,
        webmSha256: manifest.render.webmSha256,
        durationSeconds,
        fps: FPS,
        frameCount: reportedFrameCount,
        formats: FORMATS,
        humanVisualAcceptance: manifest.humanVisualAcceptance,
        productionEligible: manifest.productionEligible,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(
    `VOXY_ANIMATABLE_RIG_EVIDENCE_FAILED:${
      error instanceof Error ? error.message : "unknown_error"
    }`,
  );
  process.exitCode = 1;
});
