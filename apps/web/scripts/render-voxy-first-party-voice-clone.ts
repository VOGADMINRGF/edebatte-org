import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
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
  VOXY_FIRST_PARTY_VISIBLE_SEGMENTS,
  VOXY_FIRST_PARTY_VISUAL_BINDING,
  VOXY_FIRST_PARTY_VOICE_CLONE_SCHEMA_VERSION,
  validateVoxyFirstPartyVoiceCloneContract,
} from "../src/features/voxyVideo/firstPartyVoiceClone";

function argument(name: string): string | null {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function run(binary: string, args: string[], options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}): string {
  const result = spawnSync(binary, args, {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0 || result.error) {
    throw new Error(`${path.basename(binary)}_failed:${result.error?.message ?? result.stderr.trim()}`);
  }
  return result.stdout.trim();
}

async function sha256(file: string): Promise<string> {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

function ffprobe(file: string): { streams: Array<Record<string, string>>; format: Record<string, string> } {
  return JSON.parse(run("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", file]));
}

function audioMetrics(file: string) {
  const result = spawnSync("ffmpeg", [
    "-nostdin", "-hide_banner", "-i", file,
    "-af", "loudnorm=I=-18:TP=-1.5:LRA=11:print_format=json",
    "-f", "null", "-",
  ], { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`audio_metrics_failed:${result.stderr.trim()}`);
  const match = result.stderr.match(/\{\s*"input_i"[\s\S]*?\}/);
  if (!match) throw new Error("audio_metrics_json_missing");
  const measured = JSON.parse(match[0]) as Record<string, string>;
  return {
    integratedLufs: Number(measured.input_i),
    truePeakDb: Number(measured.input_tp),
    loudnessRangeLu: Number(measured.input_lra),
    clipping: Number(measured.input_tp) >= -0.1,
  };
}

async function assertOutsideRepository(repositoryRoot: string, candidate: string, label: string): Promise<void> {
  const relative = path.relative(repositoryRoot, candidate);
  if (!relative.startsWith("..") || path.isAbsolute(relative) === false && relative === "") {
    throw new Error(`${label}_must_be_outside_git_worktree`);
  }
}

async function main(): Promise<void> {
  const repositoryRoot = path.resolve(import.meta.dirname, "../../..");
  const errors = validateVoxyFirstPartyVoiceCloneContract();
  if (errors.length) throw new Error(`first_party_contract_invalid:${errors.join(",")}`);

  const exactHeadSha = process.env.VOXY_FIRST_PARTY_VOICE_CLONE_COMMIT_SHA?.trim() ?? "";
  if (!/^[0-9a-f]{40}$/.test(exactHeadSha)) throw new Error("VOXY_FIRST_PARTY_VOICE_CLONE_COMMIT_SHA_required");
  if (run("git", ["rev-parse", "HEAD"], { cwd: repositoryRoot }) !== exactHeadSha) throw new Error("exact_head_mismatch");
  const dirty = run("git", ["status", "--porcelain", "--", "apps/web/scripts/render-voxy-first-party-voice-clone.ts", "apps/web/scripts/lib/voxyChatterboxFirstParty.py", "apps/web/src/features/voxyVideo/firstPartyVoiceClone.ts", "apps/web/tests/voxy-first-party-voice-clone.contract.test.ts"], { cwd: repositoryRoot });
  if (dirty && argument("allow-dirty") !== "true") throw new Error(`exact_head_inputs_dirty:${dirty.replaceAll("\n", ",")}`);

  const referenceFiles = [argument("reference-01"), argument("reference-02")];
  if (referenceFiles.some((file) => !file)) throw new Error("both_explicit_reference_paths_required");
  const references = referenceFiles.map((file) => path.resolve(file!));
  for (const [index, file] of references.entries()) {
    await access(file);
    await assertOutsideRepository(repositoryRoot, file, `reference_${index + 1}`);
  }
  const referenceBefore = await Promise.all(references.map(async (file) => {
    const metadata = await stat(file);
    if (!metadata.isFile()) throw new Error("reference_must_be_regular_file");
    return { size: metadata.size, mtimeMs: metadata.mtimeMs, sha256: await sha256(file) };
  }));

  const python = path.resolve(argument("python") ?? "");
  const modelDir = path.resolve(argument("model-dir") ?? "");
  const referenceWorkspace = path.resolve(argument("reference-workspace") ?? "");
  const privateReviewDir = path.resolve(argument("private-review-dir") ?? "");
  if (!argument("python") || !argument("model-dir") || !argument("reference-workspace") || !argument("private-review-dir")) throw new Error("python_model_reference_workspace_and_private_review_dir_required");
  await assertOutsideRepository(repositoryRoot, referenceWorkspace, "reference_workspace");
  await assertOutsideRepository(repositoryRoot, privateReviewDir, "private_review_dir");
  for (const directory of [referenceWorkspace, privateReviewDir]) {
    try { await access(directory); throw new Error(`private_directory_must_not_preexist:${directory}`); } catch (error) {
      if (error instanceof Error && error.message.startsWith("private_directory_must_not_preexist")) throw error;
    }
    await mkdir(directory, { recursive: true, mode: 0o700 });
  }

  const outputRoot = path.resolve(repositoryRoot, argument("output") ?? "artifacts/voxy-first-party-voice-clone-private");
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true, mode: 0o700 });

  const selectedSegments = [];
  for (const window of VOXY_FIRST_PARTY_REFERENCE_WINDOWS) {
    const source = references[window.reference - 1]!;
    const file = path.resolve(referenceWorkspace, `${window.id}.wav`);
    run("ffmpeg", ["-y", "-nostdin", "-hide_banner", "-loglevel", "error", "-ss", String(window.startSeconds), "-to", String(window.endSeconds), "-i", source, "-ac", "1", "-ar", "24000", "-c:a", "pcm_s16le", file]);
    const probe = ffprobe(file);
    selectedSegments.push({
      ...window,
      durationMs: Math.round(Number(probe.format.duration) * 1_000),
      sha256: await sha256(file),
      metrics: audioMetrics(file),
      processing: "trim_and_resample_only_no_denoise_no_pitch_no_voice_change",
      privatePathWithheld: true,
      runtimePath: file,
    });
  }
  const segmentPathById = new Map(selectedSegments.map((segment) => [segment.id, segment.runtimePath]));
  const parameterMatrix = VOXY_FIRST_PARTY_PARAMETER_MATRIX.map((take) => ({
    ...take,
    referencePath: segmentPathById.get(take.referenceSegmentId),
  }));
  const variants = VOXY_FIRST_PARTY_VARIANTS.map((take) => ({
    ...take,
    referencePath: segmentPathById.get(take.referenceSegmentId),
  }));
  if ([...parameterMatrix, ...variants].some((take) => !take.referencePath)) throw new Error("reference_selection_mapping_failed");

  const configPath = path.resolve(referenceWorkspace, "private-synthesis-config.json");
  const resultPath = path.resolve(referenceWorkspace, "private-synthesis-result.json");
  await writeFile(configPath, `${JSON.stringify({
    modelDir,
    modelFiles: VOXY_CHATTERBOX_MODEL.files,
    device: argument("device") ?? "mps",
    outputDir: outputRoot,
    resultPath,
    matrixText: "Ich möchte dir helfen, besser zu verstehen.",
    parameterMatrix,
    variants,
    segments: VOXY_FIRST_PARTY_VISIBLE_SEGMENTS,
  }, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  run(python, [path.resolve(repositoryRoot, "apps/web/scripts/lib/voxyChatterboxFirstParty.py"), "--config", configPath], {
    cwd: repositoryRoot,
    env: {
      HF_HUB_OFFLINE: "1",
      TRANSFORMERS_OFFLINE: "1",
      HF_HOME: path.dirname(modelDir),
      HTTP_PROXY: "http://127.0.0.1:9",
      HTTPS_PROXY: "http://127.0.0.1:9",
      ALL_PROXY: "http://127.0.0.1:9",
      NO_PROXY: "",
    },
  });
  const synthesis = JSON.parse(await readFile(resultPath, "utf8")) as {
    device: string;
    torchVersion: string;
    runtimeNetworkRequests: number;
    networkAttempts: string[];
    matrix: Array<Record<string, unknown>>;
    candidates: Array<{ id: string; parameters: Record<string, unknown>; raw: { file: string; durationMs: number; sampleRate: number; channels: number; watermarkScore: number; timeline: unknown[] } }>;
  };
  if (synthesis.runtimeNetworkRequests !== 0 || synthesis.networkAttempts.length) throw new Error("offline_runtime_gate_failed");

  const finishedCandidates = [];
  for (const candidate of synthesis.candidates) {
    const candidateDir = path.resolve(outputRoot, candidate.id);
    const rawPath = path.resolve(candidate.raw.file);
    const finishedPath = path.resolve(candidateDir, "finished.wav");
    run("ffmpeg", ["-y", "-nostdin", "-hide_banner", "-loglevel", "error", "-i", rawPath, "-af", "loudnorm=I=-18:TP=-1.5:LRA=11:linear=true", "-ar", "24000", "-ac", "1", "-c:a", "pcm_s16le", finishedPath]);
    const probe = ffprobe(finishedPath);
    const metrics = audioMetrics(finishedPath);
    if (metrics.clipping || Number(probe.format.duration) < 20) throw new Error(`candidate_audio_gate_failed:${candidate.id}`);
    finishedCandidates.push({
      ...candidate,
      raw: { ...candidate.raw, file: `${candidate.id}/raw.wav`, sha256: await sha256(rawPath), metrics: audioMetrics(rawPath) },
      finished: { file: `${candidate.id}/finished.wav`, sha256: await sha256(finishedPath), durationMs: Math.round(Number(probe.format.duration) * 1_000), metrics, processing: "linear_loudness_normalization_only_no_reverb_no_pitch_no_voice_change" },
    });
  }

  const silence = path.resolve(referenceWorkspace, "comparison-silence.wav");
  run("ffmpeg", ["-y", "-nostdin", "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", "0.9", "-c:a", "pcm_s16le", silence]);
  const finishedPaths = finishedCandidates.map((candidate) => path.resolve(outputRoot, candidate.finished.file));
  const concat = (files: string[], destination: string) => {
    const args = ["-y", "-nostdin", "-hide_banner", "-loglevel", "error", ...files.flatMap((file) => ["-i", file]), "-filter_complex", `${files.map((_, index) => `[${index}:a]`).join("")}concat=n=${files.length}:v=0:a=1[out]`, "-map", "[out]", "-ar", "24000", "-ac", "1", "-c:a", "pcm_s16le", destination];
    run("ffmpeg", args);
  };
  const comparisonWithoutOriginal = path.resolve(outputRoot, "comparison-without-original.wav");
  concat([finishedPaths[0]!, silence, finishedPaths[1]!, silence, finishedPaths[2]!], comparisonWithoutOriginal);
  const externalComparison = path.resolve(privateReviewDir, "comparison.wav");
  const originalComparisonSegment = segmentPathById.get("reference-02-segment-b")!;
  concat([originalComparisonSegment, silence, finishedPaths[0]!, silence, finishedPaths[1]!, silence, finishedPaths[2]!], externalComparison);

  const referenceAfter = await Promise.all(references.map(async (file) => {
    const metadata = await stat(file);
    return { size: metadata.size, mtimeMs: metadata.mtimeMs, sha256: await sha256(file) };
  }));
  if (referenceBefore.some((before, index) => JSON.stringify(before) !== JSON.stringify(referenceAfter[index]))) throw new Error("original_reference_mutated");

  const referenceReport = {
    schemaVersion: "voxy-first-party-reference-selection-v1",
    references: referenceBefore.map((reference, index) => ({ id: `reference-0${index + 1}`, considered: true, ...reference, originalPathWithheld: true, copiedIntoWorktree: false })),
    selectedSegments: selectedSegments.map(({ runtimePath: _runtimePath, ...segment }) => segment),
    selectionMethod: "offline_whisper_timestamps_plus_objective_signal_metrics_and_phrase_boundaries",
    humanAuditorySelectionRequired: true,
    referenceSegmentsStoredOutsideWorktree: true,
  };
  await writeFile(path.resolve(outputRoot, "reference-selection.json"), `${JSON.stringify(referenceReport, null, 2)}\n`, "utf8");

  const manifest = {
    schemaVersion: VOXY_FIRST_PARTY_VOICE_CLONE_SCHEMA_VERSION,
    taskId: "VOXY-ANIMATABLE-MASTER-ASSET-01",
    exactHeadSha,
    engine: VOXY_CHATTERBOX_ENGINE,
    model: VOXY_CHATTERBOX_MODEL,
    runtime: { device: synthesis.device, torchVersion: synthesis.torchVersion, dependencies: VOXY_CHATTERBOX_RUNTIME_LICENSES, fullResolvedDependencyCount: 112, runtimeDistributionAuthorized: false, runtimeNetworkRequests: 0 },
    identity: VOXY_FIRST_PARTY_IDENTITY,
    privacy: { ...VOXY_FIRST_PARTY_PRIVACY, rawVoiceCommitted: false, rawVoicePublicArtifact: false, originalBearingComparisonStoredOutsideWorktree: true },
    visibleScript: VOXY_FIRST_PARTY_VISIBLE_SCRIPT,
    identicalVisibleScriptAcrossCandidates: true,
    pronunciationAliases: VOXY_FIRST_PARTY_PRONUNCIATION_ALIASES,
    parameterMatrix: parameterMatrix.map(({ referencePath: _referencePath, ...take }) => take),
    matrixResults: synthesis.matrix,
    references: { recording1Considered: true, recording2Considered: true, selectedSegmentCount: selectedSegments.length },
    candidates: finishedCandidates,
    comparison: { withoutOriginal: { file: "comparison-without-original.wav", sha256: await sha256(comparisonWithoutOriginal) }, withOriginal: { path: externalComparison, pathPublished: false, committed: false, uploaded: false } },
    visual: VOXY_FIRST_PARTY_VISUAL_BINDING,
    humanVisualAcceptance: "accepted",
    humanAudioAcceptance: "pending",
    firstPartyVoiceCloneGate: "ready_for_human_review",
    humanVoiceWinner: "pending",
    productionEligible: false,
    autoPublish: false,
    exactHeadInputsClean: !dirty,
  };
  await writeFile(path.resolve(outputRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await writeFile(path.resolve(outputRoot, "README.md"), `# Private Voxy first-party voice-clone review\n\nThis directory is local-only and must never be committed, uploaded as a GitHub artifact, copied to public/, Vercel, or a production bundle. All WAV files under candidate-a/, candidate-b/, candidate-c/, parameter-matrix/ and comparison-without-original.wav contain synthesized Ricky voice identity.\n\nThe original-bearing comparison is intentionally outside the Git worktree at \`${externalComparison}\`. Original source paths are intentionally omitted. Human audio acceptance and the human winner remain pending.\n`, "utf8");
  console.info(JSON.stringify({ status: "voxy_first_party_voice_clone_ready_for_human_review", exactHeadSha, artifact: path.relative(repositoryRoot, outputRoot), externalComparison, candidates: finishedCandidates.map((candidate) => ({ id: candidate.id, durationMs: candidate.finished.durationMs })), privacy: { rawVoiceCommitted: false, rawVoicePublicArtifact: false }, humanAudioAcceptance: "pending", humanVoiceWinner: "pending", productionEligible: false, autoPublish: false }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
