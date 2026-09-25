import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { VOXY_CHATTERBOX_ENGINE, VOXY_CHATTERBOX_MODEL } from "../src/features/voxyVideo/firstPartyVoiceClone";

function argument(name: string): string | null {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function run(binary: string, args: string[], options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}): string {
  const result = spawnSync(binary, args, { cwd: options.cwd, env: { ...process.env, ...options.env }, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0 || result.error) throw new Error(`${path.basename(binary)}_failed:${result.error?.message ?? result.stderr.trim()}`);
  return result.stdout.trim();
}

async function sha256(file: string): Promise<string> {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

async function main(): Promise<void> {
  const repositoryRoot = path.resolve(import.meta.dirname, "../../..");
  const pythonArgument = argument("python");
  const modelCacheArgument = argument("model-cache");
  const reportArgument = argument("report-dir");
  if (!pythonArgument || !modelCacheArgument || !reportArgument) throw new Error("python_model_cache_and_report_dir_required");
  const python = path.resolve(pythonArgument);
  const modelCache = path.resolve(modelCacheArgument);
  const reportDir = path.resolve(reportArgument);
  for (const [label, target] of [["model_cache", modelCache], ["report_dir", reportDir]] as const) {
    const relative = path.relative(repositoryRoot, target);
    if (!relative.startsWith("..")) throw new Error(`${label}_must_be_outside_git_worktree`);
  }
  await mkdir(modelCache, { recursive: true });
  await mkdir(reportDir, { recursive: true, mode: 0o700 });
  const requirements = path.resolve(repositoryRoot, "apps/web/scripts/lib/voxy-chatterbox-requirements.txt");
  run(python, ["-m", "pip", "install", "-r", requirements]);
  run(python, ["-m", "pip", "install", "--no-deps", "--force-reinstall", `git+${VOXY_CHATTERBOX_ENGINE.sourceRepository}.git@${VOXY_CHATTERBOX_ENGINE.sourceRevision}`]);
  const downloadProgram = [
    "from huggingface_hub import snapshot_download",
    `print(snapshot_download(repo_id=${JSON.stringify(VOXY_CHATTERBOX_MODEL.repository)}, repo_type='model', revision=${JSON.stringify(VOXY_CHATTERBOX_MODEL.revision)}, allow_patterns=${JSON.stringify(VOXY_CHATTERBOX_MODEL.files.map((file) => file.path))}))`,
  ].join(";");
  const modelDir = run(python, ["-c", downloadProgram], { env: { HF_HOME: modelCache } }).split("\n").at(-1)!.trim();
  for (const modelFile of VOXY_CHATTERBOX_MODEL.files) {
    const file = path.resolve(modelDir, modelFile.path);
    if (await sha256(file) !== modelFile.sha256) throw new Error(`model_integrity_failed:${modelFile.path}`);
  }
  const licenses = JSON.parse(run(path.resolve(path.dirname(python), "pip-licenses"), ["--format=json", "--with-urls", "--with-description"])) as Array<{ Name: string; Version: string; License: string }>;
  if (licenses.some((entry) => !entry.License || entry.License === "UNKNOWN")) throw new Error("runtime_license_unknown");
  const report = {
    schemaVersion: "voxy-chatterbox-runtime-license-report-v1",
    engine: VOXY_CHATTERBOX_ENGINE,
    model: VOXY_CHATTERBOX_MODEL,
    modelDir,
    dependencyCount: licenses.length,
    dependencies: licenses,
    status: "pass_for_local_inference_only",
    runtimeDistributionAuthorized: false,
  };
  await writeFile(path.resolve(reportDir, "runtime-license-report.json"), `${JSON.stringify(report, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  console.info(JSON.stringify({ status: report.status, modelDir, dependencyCount: licenses.length, runtimeDistributionAuthorized: false }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
