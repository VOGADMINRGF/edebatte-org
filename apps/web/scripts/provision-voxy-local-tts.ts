import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { VOXY_LOCAL_TTS_ENGINE, VOXY_LOCAL_TTS_MODEL, VOXY_LOCAL_TTS_RUNTIME_DEPENDENCIES } from "../src/features/voxyVideo/localTts";

function argument(name: string): string | null {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? null;
}
function run(binary: string, args: string[]): string {
  const result = spawnSync(binary, args, { encoding: "utf8" });
  if (result.status !== 0 || result.error) throw new Error(`${path.basename(binary)}_failed:${result.error?.message ?? result.stderr.trim()}`);
  return result.stdout.trim();
}
async function sha256(file: string): Promise<string> {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}
async function exists(file: string): Promise<boolean> {
  try { await access(file); return true; } catch { return false; }
}
async function downloadPinned(url: string, output: string, expectedSha256: string): Promise<void> {
  if (await exists(output)) {
    const current = await sha256(output);
    if (current === expectedSha256) return;
    throw new Error(`provisioned_file_sha_mismatch:${output}:${current}`);
  }
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) throw new Error(`download_failed:${response.status}:${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const actual = createHash("sha256").update(bytes).digest("hex");
  if (actual !== expectedSha256) throw new Error(`download_sha_mismatch:${actual}:${expectedSha256}`);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, bytes);
}

async function main(): Promise<void> {
  const repositoryRoot = path.resolve(import.meta.dirname, "../../..");
  const cacheRoot = path.resolve(repositoryRoot, argument("cache") ?? ".cache/voxy-local-tts");
  const wheelsRoot = path.resolve(cacheRoot, "wheels");
  const modelRoot = path.resolve(cacheRoot, `models/${VOXY_LOCAL_TTS_MODEL.modelId}`);
  await mkdir(wheelsRoot, { recursive: true });
  await mkdir(modelRoot, { recursive: true });
  const base = `https://huggingface.co/${VOXY_LOCAL_TTS_MODEL.repository}/resolve/${VOXY_LOCAL_TTS_MODEL.repositoryRevision}/de/de_DE/mls/medium`;
  await downloadPinned(`${base}/de_DE-mls-medium.onnx?download=true`, path.resolve(cacheRoot, VOXY_LOCAL_TTS_MODEL.modelPath), VOXY_LOCAL_TTS_MODEL.modelSha256);
  await downloadPinned(`${base}/de_DE-mls-medium.onnx.json?download=true`, path.resolve(cacheRoot, VOXY_LOCAL_TTS_MODEL.configPath), VOXY_LOCAL_TTS_MODEL.configSha256);
  await downloadPinned(`${base}/MODEL_CARD?download=true`, path.resolve(cacheRoot, VOXY_LOCAL_TTS_MODEL.modelCardPath), VOXY_LOCAL_TTS_MODEL.modelCardSha256);

  run("python3", ["-m", "pip", "download", "--disable-pip-version-check", "--no-deps", "--only-binary=:all:", "--dest", wheelsRoot, `piper-tts==${VOXY_LOCAL_TTS_ENGINE.version}`]);
  const wheel = (await readdir(wheelsRoot)).find((file) => file.startsWith(`piper_tts-${VOXY_LOCAL_TTS_ENGINE.version}-`) && file.endsWith(".whl"));
  if (!wheel) throw new Error("piper_wheel_missing_after_download");
  const wheelPath = path.resolve(wheelsRoot, wheel);
  const expectedWheelSha = process.platform === "darwin" && process.arch === "arm64"
    ? VOXY_LOCAL_TTS_ENGINE.wheelSha256.darwinArm64
    : process.platform === "linux" && process.arch === "x64"
      ? VOXY_LOCAL_TTS_ENGINE.wheelSha256.linuxX64
      : null;
  if (!expectedWheelSha) throw new Error(`unsupported_piper_platform:${process.platform}:${process.arch}`);
  const wheelHash = await sha256(wheelPath);
  if (wheelHash !== expectedWheelSha) throw new Error(`piper_wheel_sha_mismatch:${wheelHash}`);

  const venvRoot = path.resolve(cacheRoot, "venv");
  if (!(await exists(path.resolve(venvRoot, "bin/python")))) run("python3", ["-m", "venv", venvRoot]);
  const python = path.resolve(venvRoot, "bin/python");
  run(python, ["-m", "pip", "install", "--disable-pip-version-check", wheelPath, "onnxruntime==1.28.0", "pathvalidate==3.3.1", "flatbuffers==25.12.19", "numpy==2.5.2", "packaging==26.3", "protobuf==7.35.1"]);
  const installedVersion = run(python, ["-c", "import importlib.metadata; print(importlib.metadata.version('piper-tts'))"]);
  if (installedVersion !== VOXY_LOCAL_TTS_ENGINE.version) throw new Error(`piper_version_mismatch:${installedVersion}`);
  const freeze = run(python, ["-m", "pip", "freeze"]);
  for (const dependency of VOXY_LOCAL_TTS_RUNTIME_DEPENDENCIES.filter((entry) => entry.name !== "espeak-ng (embedded)" && entry.name !== "piper-tts")) {
    if (!freeze.toLowerCase().includes(`${dependency.name.toLowerCase()}==${dependency.version}`)) throw new Error(`runtime_dependency_mismatch:${dependency.name}`);
  }
  await writeFile(path.resolve(cacheRoot, "provisioning-manifest.json"), `${JSON.stringify({ provisionedAt: new Date().toISOString(), cacheRoot, engine: VOXY_LOCAL_TTS_ENGINE, model: VOXY_LOCAL_TTS_MODEL, wheel: { file: wheel, sha256: wheelHash }, runtimeDependencies: VOXY_LOCAL_TTS_RUNTIME_DEPENDENCIES, pipFreeze: freeze.split("\n"), runtimeDownloadRequired: false, offlineReady: true }, null, 2)}\n`, "utf8");
  console.info(JSON.stringify({ status: "voxy_local_tts_provisioned", cacheRoot, voiceId: VOXY_LOCAL_TTS_MODEL.voiceId, modelSha256: VOXY_LOCAL_TTS_MODEL.modelSha256, offlineReady: true }, null, 2));
}
main().catch((error) => { console.error(error instanceof Error ? error.stack : String(error)); process.exitCode = 1; });
