import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { VOXY_DOCUMENTARY_VOICE_CANDIDATES, validateVoxyDocumentaryVoiceBakeoffContract } from "../src/features/voxyVideo/documentaryVoiceBakeoff";

function argument(name: string): string | null {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? null;
}

async function exists(file: string): Promise<boolean> {
  try { await access(file); return true; } catch { return false; }
}

async function sha256(file: string): Promise<string> {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

function run(binary: string, args: string[]): string {
  const result = spawnSync(binary, args, { encoding: "utf8" });
  if (result.status !== 0 || result.error) throw new Error(`${path.basename(binary)}_failed:${result.error?.message ?? result.stderr.trim()}`);
  return result.stdout.trim();
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
  const errors = validateVoxyDocumentaryVoiceBakeoffContract();
  if (errors.length) throw new Error(`bakeoff_contract_invalid:${errors.join(",")}`);
  const repositoryRoot = path.resolve(import.meta.dirname, "../../..");
  const cacheRoot = path.resolve(repositoryRoot, argument("cache") ?? ".cache/voxy-documentary-bakeoff");
  const revision = "b239a9084e21fbaa7ac78ea6e31f5de1c31c8f42";
  const mimicBase = `https://github.com/MycroftAI/mimic3-voices/raw/${revision}/voices/de_DE`;
  const downloads = [
    { voice: "m-ailabs_low", file: "generator.onnx", sha256: "3330372429b25fe3a38b10bbe914862a49b2cd0a58da332bbe30fa123035a067" },
    { voice: "m-ailabs_low", file: "config.json", sha256: "e7e10c16ae1d53882b772ca62a3d8f8fe6f42f223facc2c0d9c7805bcacb36c7" },
    { voice: "m-ailabs_low", file: "phonemes.txt", sha256: "a0024e3875fa210c5a77e15c24d1e7bfa09719ec3111ba359b87d190bc3f2970" },
    { voice: "m-ailabs_low", file: "speaker_map.csv", sha256: "2e646caf922b48cf499e8063b2bdd43d0c6dae7e57943f102f1ef425490ddaff" },
    { voice: "m-ailabs_low", file: "phoneme_map.txt", sha256: "4003f421fc91ed1d5a343442659db6cf9d58bd1c6d8d771abc1999cc24d7694d" },
    { voice: "m-ailabs_low", file: "LICENSE", sha256: "fdd78a909fb9384d869363522b967557bc9e28e5b65874921f24e48cbb82f38c" },
    { voice: "thorsten-emotion_low", file: "generator.onnx", sha256: "5a2588308d23e51874f6c87dd9651fce2375302f4b26bdb98dfe125547d283a5" },
    { voice: "thorsten-emotion_low", file: "config.json", sha256: "131e089e38c0f7c4d93d419d34f7185e45dd926c7dddcb3f72be5f2272ac0785" },
    { voice: "thorsten-emotion_low", file: "phonemes.txt", sha256: "4820e701ece71e34c5d32f9640db6b103391093943ac071c001222d27b891e5f" },
    { voice: "thorsten-emotion_low", file: "speaker_map.csv", sha256: "371546cc49cefe755562da2e8404ae857206e6593fa777f70860bf1fff070b89" },
    { voice: "thorsten-emotion_low", file: "LICENSE", sha256: "19b4afb2e1c2c9f2cb07da14acd2d34098a4e11c13fccb09356845c4748fb50c" },
  ] as const;
  for (const download of downloads) {
    const relativePath = `mimic3-voices/de_DE/${download.voice}/${download.file}`;
    await downloadPinned(`${mimicBase}/${download.voice}/${download.file}`, path.resolve(cacheRoot, relativePath), download.sha256);
  }
  const venvRoot = path.resolve(cacheRoot, "mimic3-venv");
  if (!(await exists(path.resolve(venvRoot, "bin/python")))) run("python3", ["-m", "venv", venvRoot]);
  const python = path.resolve(venvRoot, "bin/python");
  const requirements = path.resolve(repositoryRoot, "apps/web/scripts/lib/voxy-mimic3-requirements.txt");
  run(python, ["-m", "pip", "install", "--disable-pip-version-check", "--requirement", requirements]);
  const pipFreeze = run(python, ["-m", "pip", "freeze"]);
  const runtimeLicenses = JSON.parse(run(path.resolve(venvRoot, "bin/pip-licenses"), ["--format=json", "--with-urls", "--with-description"])) as Array<{ Name: string; Version: string; License: string; URL: string }>;
  if (runtimeLicenses.some((dependency) => !dependency.License || dependency.License === "UNKNOWN")) throw new Error("mimic3_transitive_license_unknown");
  for (const candidate of VOXY_DOCUMENTARY_VOICE_CANDIDATES.slice(1)) {
    for (const file of candidate.modelFiles) {
      if (await sha256(path.resolve(cacheRoot, file.path)) !== file.sha256) throw new Error(`candidate_model_hash_failed:${candidate.id}:${file.path}`);
    }
  }
  await writeFile(path.resolve(cacheRoot, "runtime-license-report.json"), `${JSON.stringify({ status: "pass", dependencies: runtimeLicenses }, null, 2)}\n`, "utf8");
  await writeFile(path.resolve(cacheRoot, "provisioning-manifest.json"), `${JSON.stringify({ provisionedAt: new Date().toISOString(), candidates: VOXY_DOCUMENTARY_VOICE_CANDIDATES.map(({ id, voice, modelRevision, modelFiles }) => ({ id, voice, modelRevision, modelFiles })), pipFreeze: pipFreeze.split("\n"), requirementsSha256: await sha256(requirements), offlineReady: true, runtimeNetworkRequests: 0 }, null, 2)}\n`, "utf8");
  console.info(JSON.stringify({ status: "voxy_documentary_voice_bakeoff_provisioned", candidateCount: VOXY_DOCUMENTARY_VOICE_CANDIDATES.length - 1, cacheRoot, offlineReady: true }, null, 2));
}

main().catch((error) => { console.error(error instanceof Error ? error.stack : String(error)); process.exitCode = 1; });
