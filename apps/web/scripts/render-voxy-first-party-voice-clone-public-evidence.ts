import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  VOXY_CHATTERBOX_ENGINE,
  VOXY_CHATTERBOX_MODEL,
  VOXY_CHATTERBOX_RUNTIME_LICENSES,
  VOXY_FIRST_PARTY_IDENTITY,
  VOXY_FIRST_PARTY_PARAMETER_MATRIX,
  VOXY_FIRST_PARTY_PRIVACY,
  VOXY_FIRST_PARTY_PRONUNCIATION_ALIASES,
  VOXY_FIRST_PARTY_REFERENCE_WINDOWS,
  VOXY_FIRST_PARTY_VARIANTS,
  VOXY_FIRST_PARTY_VISIBLE_SCRIPT,
  VOXY_FIRST_PARTY_VISUAL_BINDING,
  VOXY_FIRST_PARTY_VOICE_CLONE_SCHEMA_VERSION,
  validateVoxyFirstPartyVoiceCloneContract,
} from "../src/features/voxyVideo/firstPartyVoiceClone";

function run(binary: string, args: string[], cwd: string): string {
  const result = spawnSync(binary, args, { cwd, encoding: "utf8" });
  if (result.status !== 0 || result.error) throw new Error(`${binary}_failed:${result.error?.message ?? result.stderr.trim()}`);
  return result.stdout.trim();
}

async function sha256(file: string): Promise<string> {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

async function main(): Promise<void> {
  const repositoryRoot = path.resolve(import.meta.dirname, "../../..");
  const exactHeadSha = process.env.VOXY_FIRST_PARTY_VOICE_CLONE_COMMIT_SHA?.trim() ?? "";
  if (!/^[0-9a-f]{40}$/.test(exactHeadSha) || run("git", ["rev-parse", "HEAD"], repositoryRoot) !== exactHeadSha) throw new Error("exact_head_required");
  const errors = validateVoxyFirstPartyVoiceCloneContract();
  if (errors.length) throw new Error(`contract_invalid:${errors.join(",")}`);
  const outputRoot = path.resolve(repositoryRoot, "artifacts/voxy-first-party-voice-clone-public");
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });
  const licenseMatrix = {
    status: "pass_for_local_inference_only",
    assessedAt: "2026-08-16",
    engine: VOXY_CHATTERBOX_ENGINE,
    model: VOXY_CHATTERBOX_MODEL,
    criticalRuntimeDependencies: VOXY_CHATTERBOX_RUNTIME_LICENSES,
    resolvedDependencyCount: 112,
    distribution: {
      runtimeBundleAuthorized: false,
      generatedAudioPublicationAuthorized: false,
      reason: "GPL/LGPL notice obligations and human voice approval remain separate manual gates.",
    },
  };
  const licensePath = path.resolve(outputRoot, "license-matrix.json");
  await writeFile(licensePath, `${JSON.stringify(licenseMatrix, null, 2)}\n`, "utf8");
  const manifest = {
    schemaVersion: `${VOXY_FIRST_PARTY_VOICE_CLONE_SCHEMA_VERSION}-public-evidence`,
    taskId: "VOXY-ANIMATABLE-MASTER-ASSET-01",
    exactHeadSha,
    identity: VOXY_FIRST_PARTY_IDENTITY,
    privacy: VOXY_FIRST_PARTY_PRIVACY,
    referenceEvidence: {
      authorizedReferenceCount: 2,
      selectedWindowCount: VOXY_FIRST_PARTY_REFERENCE_WINDOWS.length,
      pathsWithheld: true,
      hashesWithheld: true,
      audioIncluded: false,
      processedSegmentsIncluded: false,
    },
    visibleScriptSha256: createHash("sha256").update(VOXY_FIRST_PARTY_VISIBLE_SCRIPT).digest("hex"),
    identicalVisibleScriptAcrossCandidates: true,
    pronunciationAliases: VOXY_FIRST_PARTY_PRONUNCIATION_ALIASES,
    parameterMatrix: VOXY_FIRST_PARTY_PARAMETER_MATRIX,
    variants: VOXY_FIRST_PARTY_VARIANTS,
    engine: VOXY_CHATTERBOX_ENGINE,
    model: VOXY_CHATTERBOX_MODEL,
    licenseMatrix: { file: "license-matrix.json", sha256: await sha256(licensePath) },
    visual: VOXY_FIRST_PARTY_VISUAL_BINDING,
    publicAudioCount: 0,
    humanVisualAcceptance: "accepted",
    humanAudioAcceptance: "pending",
    firstPartyVoiceCloneGate: "private_local_execution_required",
    humanVoiceWinner: "pending",
    productionEligible: false,
    autoPublish: false,
  };
  await writeFile(path.resolve(outputRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await writeFile(path.resolve(outputRoot, "README.md"), "# Voxy first-party voice clone — public technical evidence\n\nThis exact-head artifact contains technical contracts and license provenance only. It contains no recording, reference segment, synthesized identity audio, private path, or reference hash. Human audio acceptance and the human winner remain pending.\n", "utf8");
  console.info(JSON.stringify({ status: "public_privacy_safe_evidence_ready", exactHeadSha, publicAudioCount: 0, humanAudioAcceptance: "pending", humanVoiceWinner: "pending", productionEligible: false, autoPublish: false }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
