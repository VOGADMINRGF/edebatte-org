import { chromium } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve } from "node:path";
import {
  buildVoxyCharacterMotionFixturePlan,
  validateVoxyCharacterMotionFixturePlan,
} from "../src/features/voxyVideo/characterMotionFixture";
import {
  getVoxyRigFrameCssProperties,
  renderVoxyCharacterMotionFixtureHtml,
} from "../src/features/voxyVideo/characterMotionFixtureHtml";
import { buildVoxyRigFrame } from "../src/features/voxyVideo/animatableMasterAsset";
import type { VoxyVideoFormat } from "../src/features/voxyVideo/modernCharacterContracts";

const SUPPORTED_FORMATS = new Set<VoxyVideoFormat>(["16:9", "9:16", "1:1"]);

function readArgument(name: string): string | null {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((entry) => entry.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function hasFlag(name: string): boolean {
  return process.argv.slice(2).includes(`--${name}`);
}

function resolveFormat(): VoxyVideoFormat {
  const value = readArgument("format") ?? "16:9";
  if (!SUPPORTED_FORMATS.has(value as VoxyVideoFormat)) {
    throw new Error(`Unsupported format: ${value}. Use 16:9, 9:16 or 1:1.`);
  }
  return value as VoxyVideoFormat;
}

function publicAssetPath(webRoot: string, publicPath: string): string {
  if (!publicPath.startsWith("/brands/voxy/")) {
    throw new Error("Voxy fixture assets must use the canonical /brands/voxy path.");
  }
  return resolve(webRoot, "public", publicPath.slice(1));
}

async function embeddedSvgDataUrl(path: string): Promise<string> {
  const content = await readFile(path, "utf8");
  if (!content.includes("<svg")) throw new Error(`Invalid SVG master: ${path}`);
  return `data:image/svg+xml;base64,${Buffer.from(content).toString("base64")}`;
}

function runFfmpeg(input: {
  framesDirectory: string;
  fps: number;
  frameCount: number;
  outputPath: string;
  outputExtension: ".mp4" | ".webm";
}): void {
  const common = [
    "-y", "-framerate", String(input.fps), "-i",
    join(input.framesDirectory, "frame-%04d.png"),
    "-frames:v", String(input.frameCount), "-r", String(input.fps), "-an",
  ];
  const codec = input.outputExtension === ".mp4"
    ? ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart"]
    : ["-c:v", "libvpx-vp9", "-crf", "32", "-b:v", "0", "-pix_fmt", "yuv420p"];
  const result = spawnSync("ffmpeg", [...common, ...codec, input.outputPath], { encoding: "utf8" });
  if (result.error || result.status !== 0) {
    throw new Error(`FFmpeg render failed: ${result.error?.message ?? result.stderr.trim()}`);
  }
}

async function main(): Promise<void> {
  const format = resolveFormat();
  const plan = buildVoxyCharacterMotionFixturePlan(format);
  const validation = validateVoxyCharacterMotionFixturePlan(plan);
  if (!validation.ok) throw new Error(`Fixture plan invalid: ${validation.errors.join(", ")}`);

  const webRoot = resolve(import.meta.dirname, "..");
  const repositoryRoot = resolve(webRoot, "../..");
  const studioPath = publicAssetPath(webRoot, plan.studioAssetPath);
  const characterPath = publicAssetPath(webRoot, plan.characterAssetPath);
  const requestedOutput = resolve(
    process.cwd(),
    readArgument("output") ?? `artifacts/voxy-character-motion-fixture-${format.replace(":", "x")}.webm`,
  );
  const outputExtension = extname(requestedOutput).toLowerCase();
  if (outputExtension !== ".webm" && outputExtension !== ".mp4") {
    throw new Error("Output must end in .webm or .mp4.");
  }

  const embeddedStudioAssetUrl = await embeddedSvgDataUrl(studioPath);
  const embeddedCharacterSvg = await readFile(characterPath, "utf8");
  const previewHtml = renderVoxyCharacterMotionFixtureHtml({
    plan,
    embeddedStudioAssetUrl,
    embeddedCharacterSvg,
  });

  const temporaryDirectory = await mkdtemp(join(tmpdir(), "voxy-character-motion-fixture-"));
  const framesDirectory = join(temporaryDirectory, "frames");
  const previewHtmlPath = join(temporaryDirectory, "fixture.html");
  const planPath = join(temporaryDirectory, "fixture-plan.json");
  await mkdir(framesDirectory, { recursive: true });
  await writeFile(previewHtmlPath, previewHtml, "utf8");
  await writeFile(planPath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");

  if (hasFlag("html-only")) {
    const htmlOutput = requestedOutput.replace(/\.(webm|mp4)$/i, ".html");
    const jsonOutput = requestedOutput.replace(/\.(webm|mp4)$/i, ".json");
    await mkdir(dirname(htmlOutput), { recursive: true });
    await copyFile(previewHtmlPath, htmlOutput);
    await copyFile(planPath, jsonOutput);
    console.log(JSON.stringify({ status: "html_fixture_written", format, htmlOutput, jsonOutput, reviewRequired: plan.reviewRequired, autoPublish: plan.autoPublish, lipSync: plan.lipSync }, null, 2));
    await rm(temporaryDirectory, { recursive: true, force: true });
    return;
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: plan.width, height: plan.height }, reducedMotion: "no-preference" });
  const page = await context.newPage();
  const captureHtml = renderVoxyCharacterMotionFixtureHtml({
    plan,
    embeddedStudioAssetUrl,
    embeddedCharacterSvg,
    captureTimeMs: 0,
  });
  await page.setContent(captureHtml, { waitUntil: "load" });
  await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete));

  const frameCount = Math.round((plan.durationMs / 1_000) * plan.fps);
  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    const captureTimeMs = Math.round((frameIndex * 1_000) / plan.fps);
    const rigFrame = buildVoxyRigFrame(captureTimeMs);
    const cssProperties = getVoxyRigFrameCssProperties(rigFrame);
    await page.evaluate(({ timeMs, state, properties }) => {
      const fixture = document.getElementById("fixture");
      fixture?.style.setProperty("--capture-time", `${timeMs}ms`);
      if (fixture) {
        fixture.dataset.rigState = state;
        for (const [name, value] of Object.entries(properties)) {
          fixture.style.setProperty(name, value);
        }
      }
      if (fixture) void fixture.offsetHeight;
    }, { timeMs: captureTimeMs, state: rigFrame.state, properties: cssProperties });
    await page.screenshot({
      path: join(framesDirectory, `frame-${String(frameIndex).padStart(4, "0")}.png`),
      type: "png",
      clip: { x: 0, y: 0, width: plan.width, height: plan.height },
    });
  }

  await page.close();
  await context.close();
  await browser.close();

  await mkdir(dirname(requestedOutput), { recursive: true });
  runFfmpeg({
    framesDirectory,
    fps: plan.fps,
    frameCount,
    outputPath: requestedOutput,
    outputExtension: outputExtension as ".mp4" | ".webm",
  });

  const manifestOutput = requestedOutput.replace(/\.(webm|mp4)$/i, ".json");
  await copyFile(planPath, manifestOutput);
  await rm(temporaryDirectory, { recursive: true, force: true });

  console.log(JSON.stringify({
    status: "fixture_rendered",
    repositoryRoot,
    format,
    output: requestedOutput,
    manifest: manifestOutput,
    studioAssetPath: plan.studioAssetPath,
    characterAssetPath: plan.characterAssetPath,
    width: plan.width,
    height: plan.height,
    durationMs: plan.durationMs,
    fps: plan.fps,
    frameCount,
    reviewRequired: plan.reviewRequired,
    autoPublish: plan.autoPublish,
    lipSync: plan.lipSync,
  }, null, 2));
}

main().catch((error: unknown) => {
  console.error(`VOXY_CHARACTER_MOTION_FIXTURE_FAILED: ${error instanceof Error ? error.message : "Unknown fixture error"}`);
  process.exitCode = 1;
});
