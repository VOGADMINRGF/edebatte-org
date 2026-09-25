import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, copyFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  VOXY_CHATTERBOX_MODEL,
  VOXY_FIRST_PARTY_REFERENCE_WINDOWS,
} from "../src/features/voxyVideo/firstPartyVoiceClone";
import {
  VOXY_SIGNATURE_DELIVERY_MODES,
  VOXY_SIGNATURE_FINAL_PASS_BINDING,
  VOXY_SIGNATURE_MIN_P,
  VOXY_SIGNATURE_REPETITION_PENALTY,
  VOXY_SIGNATURE_TEST_SITUATIONS,
  VOXY_SIGNATURE_TOP_P,
  VOXY_SIGNATURE_VOICE_SCHEMA_VERSION,
  validateVoxySignatureVoiceFinalPassContract,
} from "../src/features/voxyVideo/signatureVoiceFinalPass";

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

function runStreaming(binary: string, args: string[], options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}): void {
  const result = spawnSync(binary, args, {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    stdio: "inherit",
  });
  if (result.status !== 0 || result.error) {
    throw new Error(`${path.basename(binary)}_failed:${result.error?.message ?? `exit_${result.status}`}`);
  }
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
  if (!relative.startsWith("..") || relative === "") throw new Error(`${label}_must_be_outside_git_worktree`);
}

async function assertDoesNotExist(target: string, label: string): Promise<void> {
  try {
    await access(target);
    throw new Error(`${label}_must_not_preexist`);
  } catch (error) {
    if (error instanceof Error && error.message === `${label}_must_not_preexist`) throw error;
  }
}

async function fileSnapshot(file: string) {
  const metadata = await stat(file);
  if (!metadata.isFile()) throw new Error(`regular_file_required:${file}`);
  return { size: metadata.size, mtimeMs: metadata.mtimeMs, sha256: await sha256(file) };
}

async function directorySnapshot(root: string): Promise<Record<string, Awaited<ReturnType<typeof fileSnapshot>>>> {
  const snapshot: Record<string, Awaited<ReturnType<typeof fileSnapshot>>> = {};
  async function visit(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.resolve(directory, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile()) snapshot[path.relative(root, absolute)] = await fileSnapshot(absolute);
    }
  }
  await visit(root);
  return snapshot;
}

function finishAudio(rawPath: string, finishedPath: string): void {
  run("ffmpeg", [
    "-y", "-nostdin", "-hide_banner", "-loglevel", "error", "-i", rawPath,
    "-af", "loudnorm=I=-18:TP=-1.5:LRA=11:linear=true",
    "-ar", "24000", "-ac", "1", "-c:a", "pcm_s16le", finishedPath,
  ]);
}

function concatAudio(files: string[], destination: string): void {
  run("ffmpeg", [
    "-y", "-nostdin", "-hide_banner", "-loglevel", "error",
    ...files.flatMap((file) => ["-i", file]),
    "-filter_complex", `${files.map((_, index) => `[${index}:a]`).join("")}concat=n=${files.length}:v=0:a=1[out]`,
    "-map", "[out]", "-ar", "24000", "-ac", "1", "-c:a", "pcm_s16le", destination,
  ]);
}

function watermarkScores(python: string, files: string[]): number[] {
  // Keep the invocation compact while still loading every file only once.
  const actualProgram = "import json,librosa,perth,sys;w=perth.PerthImplicitWatermarker();r=[];" +
    "\nfor p in sys.argv[1:]:\n x,s=librosa.load(p,sr=None);r.append(float(w.get_watermark(x,sample_rate=s)))\n" +
    "print(json.dumps(r))";
  const output = run(python, ["-c", actualProgram, ...files]);
  const jsonLine = output.split("\n").map((line) => line.trim()).filter(Boolean).at(-1);
  if (!jsonLine?.startsWith("[")) throw new Error("finished_watermark_json_missing");
  return JSON.parse(jsonLine);
}

async function main(): Promise<void> {
  const repositoryRoot = path.resolve(import.meta.dirname, "../../..");
  const contractErrors = validateVoxySignatureVoiceFinalPassContract();
  if (contractErrors.length) throw new Error(`signature_voice_contract_invalid:${contractErrors.join(",")}`);

  const exactHeadSha = process.env.VOXY_FIRST_PARTY_VOICE_CLONE_COMMIT_SHA?.trim() ?? "";
  if (!/^[0-9a-f]{40}$/.test(exactHeadSha)) throw new Error("VOXY_FIRST_PARTY_VOICE_CLONE_COMMIT_SHA_required");
  if (run("git", ["rev-parse", "HEAD"], { cwd: repositoryRoot }) !== exactHeadSha) throw new Error("exact_head_mismatch");
  const trackedInputs = [
    "apps/web/src/features/voxyVideo/signatureVoiceFinalPass.ts",
    "apps/web/scripts/render-voxy-signature-voice-final-pass.ts",
    "apps/web/scripts/lib/voxyChatterboxSignature.py",
    "apps/web/tests/voxy-signature-voice-final-pass.contract.test.ts",
  ];
  const dirty = run("git", ["status", "--porcelain", "--", ...trackedInputs], { cwd: repositoryRoot });
  if (dirty && argument("allow-dirty") !== "true") throw new Error("exact_head_inputs_dirty");

  const requiredArguments = ["reference-01", "reference-02", "python", "model-dir", "reference-workspace", "accepted-reference-root", "output"] as const;
  if (requiredArguments.some((name) => !argument(name))) throw new Error("all_private_runtime_arguments_required");
  const references = [path.resolve(argument("reference-01")!), path.resolve(argument("reference-02")!)];
  const python = path.resolve(argument("python")!);
  const modelDir = path.resolve(argument("model-dir")!);
  const referenceWorkspace = path.resolve(argument("reference-workspace")!);
  const acceptedReferenceRoot = path.resolve(argument("accepted-reference-root")!);
  const outputRoot = path.resolve(argument("output")!);
  const resume = argument("resume") === "true";
  for (const [index, reference] of references.entries()) {
    await access(reference);
    await assertOutsideRepository(repositoryRoot, reference, `reference_${index + 1}`);
  }
  await assertOutsideRepository(repositoryRoot, referenceWorkspace, "reference_workspace");
  await assertOutsideRepository(repositoryRoot, outputRoot, "private_output");
  if (resume) {
    await access(referenceWorkspace);
    await access(outputRoot);
  } else {
    await assertDoesNotExist(referenceWorkspace, "reference_workspace");
    await assertDoesNotExist(outputRoot, "private_output");
  }

  const acceptedManifest = JSON.parse(await readFile(path.resolve(acceptedReferenceRoot, "manifest.json"), "utf8")) as {
    exactHeadSha: string;
    candidates: Array<{ id: string; raw: { sha256: string }; finished: { sha256: string } }>;
  };
  if (acceptedManifest.exactHeadSha !== exactHeadSha) throw new Error("accepted_reference_head_mismatch");
  for (const id of ["candidate-b", "candidate-c"]) {
    const candidate = acceptedManifest.candidates.find((entry) => entry.id === id);
    if (!candidate) throw new Error(`accepted_reference_missing:${id}`);
    if (await sha256(path.resolve(acceptedReferenceRoot, id, "raw.wav")) !== candidate.raw.sha256) throw new Error(`accepted_reference_raw_drift:${id}`);
    if (await sha256(path.resolve(acceptedReferenceRoot, id, "finished.wav")) !== candidate.finished.sha256) throw new Error(`accepted_reference_finished_drift:${id}`);
  }
  const acceptedBefore = {
    voiceB: await directorySnapshot(path.resolve(acceptedReferenceRoot, "candidate-b")),
    voiceC: await directorySnapshot(path.resolve(acceptedReferenceRoot, "candidate-c")),
  };
  const originalBefore = await Promise.all(references.map(fileSnapshot));

  if (!resume) {
    await mkdir(referenceWorkspace, { recursive: true, mode: 0o700 });
    await mkdir(outputRoot, { recursive: true, mode: 0o700 });
  }
  const selectedSegments = [];
  for (const window of VOXY_FIRST_PARTY_REFERENCE_WINDOWS) {
    const source = references[window.reference - 1]!;
    const file = path.resolve(referenceWorkspace, `${window.id}.wav`);
    if (!resume) run("ffmpeg", ["-y", "-nostdin", "-hide_banner", "-loglevel", "error", "-ss", String(window.startSeconds), "-to", String(window.endSeconds), "-i", source, "-ac", "1", "-ar", "24000", "-c:a", "pcm_s16le", file]);
    else await access(file);
    selectedSegments.push({ ...window, file, sha256: await sha256(file) });
  }
  const acceptedSelection = JSON.parse(await readFile(path.resolve(acceptedReferenceRoot, "reference-selection.json"), "utf8")) as {
    selectedSegments: Array<{ id: string; sha256: string }>;
  };
  for (const segment of selectedSegments) {
    if (acceptedSelection.selectedSegments.find((entry) => entry.id === segment.id)?.sha256 !== segment.sha256) throw new Error(`reference_segment_drift:${segment.id}`);
  }
  const segmentPathById = new Map(selectedSegments.map((segment) => [segment.id, segment.file]));

  type Job = {
    id: string;
    modeId: string;
    variantId: string;
    situationId: string;
    purpose: "parameter_search" | "three_situations";
    outputPath: string;
    referencePath: string;
    seedOffset: number;
    parameters: Record<string, string | number>;
    segments: readonly Record<string, unknown>[];
  };
  const jobs: Job[] = [];
  for (const [modeIndex, mode] of VOXY_SIGNATURE_DELIVERY_MODES.entries()) {
    const primarySituation = VOXY_SIGNATURE_TEST_SITUATIONS.find((situation) => situation.id === mode.primarySituationId)!;
    for (const variant of mode.variants) {
      if (variant.id === mode.selectedVariantId) continue;
      jobs.push({
        id: `${mode.id}-${variant.id}-search`, modeId: mode.id, variantId: variant.id,
        situationId: primarySituation.id, purpose: "parameter_search",
        outputPath: path.resolve(outputRoot, "parameter-search", mode.id, `${variant.id}.raw.wav`),
        referencePath: segmentPathById.get(variant.referenceSegmentId)!, seedOffset: 0,
        parameters: { ...variant, repetitionPenalty: VOXY_SIGNATURE_REPETITION_PENALTY, minP: VOXY_SIGNATURE_MIN_P, topP: VOXY_SIGNATURE_TOP_P },
        segments: primarySituation.spokenSegments,
      });
    }
    const selectedVariant = mode.variants.find((variant) => variant.id === mode.selectedVariantId)!;
    for (const [situationIndex, situation] of VOXY_SIGNATURE_TEST_SITUATIONS.entries()) {
      jobs.push({
        id: `${mode.id}-${situation.id}`, modeId: mode.id, variantId: selectedVariant.id,
        situationId: situation.id, purpose: "three_situations",
        outputPath: path.resolve(outputRoot, mode.id, "situations", situation.id, "raw.wav"),
        referencePath: segmentPathById.get(selectedVariant.referenceSegmentId)!, seedOffset: (modeIndex + 1) * 1_000 + situationIndex * 100,
        parameters: { ...selectedVariant, repetitionPenalty: VOXY_SIGNATURE_REPETITION_PENALTY, minP: VOXY_SIGNATURE_MIN_P, topP: VOXY_SIGNATURE_TOP_P },
        segments: situation.spokenSegments,
      });
    }
  }
  if (jobs.length !== 12) throw new Error("targeted_search_job_count_drift");

  const configPath = path.resolve(referenceWorkspace, "signature-private-synthesis-config.json");
  const resultPath = path.resolve(referenceWorkspace, "signature-private-synthesis-result.json");
  await writeFile(configPath, `${JSON.stringify({ modelDir, modelFiles: VOXY_CHATTERBOX_MODEL.files, device: argument("device") ?? "mps", resultPath, jobs }, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  if (!resume) {
    runStreaming(python, [path.resolve(repositoryRoot, "apps/web/scripts/lib/voxyChatterboxSignature.py"), "--config", configPath], {
      cwd: repositoryRoot,
      env: {
        HF_HUB_OFFLINE: "1", TRANSFORMERS_OFFLINE: "1", HF_HOME: path.dirname(modelDir),
        HTTP_PROXY: "http://127.0.0.1:9", HTTPS_PROXY: "http://127.0.0.1:9", ALL_PROXY: "http://127.0.0.1:9", NO_PROXY: "",
      },
    });
  }
  const synthesis = JSON.parse(await readFile(resultPath, "utf8")) as {
    device: string; torchVersion: string; runtimeNetworkRequests: number; networkAttempts: string[];
    jobs: Array<{ id: string; modeId: string; variantId: string; situationId: string; purpose: string; file: string; sha256: string; durationMs: number; sampleRate: number; channels: number; watermarkScore: number; timeline: unknown[] }>;
  };
  if (synthesis.runtimeNetworkRequests !== 0 || synthesis.networkAttempts.length) throw new Error("offline_runtime_gate_failed");
  if (synthesis.jobs.some((job) => job.watermarkScore < 0.5 || job.durationMs < 4_000)) throw new Error("raw_audio_or_watermark_gate_failed");
  for (const job of synthesis.jobs) {
    if (await sha256(path.resolve(job.file)) !== job.sha256) throw new Error(`raw_audio_resume_drift:${job.id}`);
  }

  const finishedResults = [];
  for (const job of synthesis.jobs) {
    const rawPath = path.resolve(job.file);
    const finishedPath = rawPath.replace(/\.raw\.wav$/, ".finished.wav").replace(/\/raw\.wav$/, "/finished.wav");
    finishAudio(rawPath, finishedPath);
    const probe = ffprobe(finishedPath);
    const metrics = audioMetrics(finishedPath);
    if (metrics.clipping || Number(probe.format.duration) < 4) throw new Error(`finished_audio_gate_failed:${job.id}`);
    finishedResults.push({
      ...job,
      raw: { file: path.relative(outputRoot, rawPath), sha256: await sha256(rawPath), metrics: audioMetrics(rawPath), watermarkScore: job.watermarkScore },
      finished: { file: path.relative(outputRoot, finishedPath), sha256: await sha256(finishedPath), durationMs: Math.round(Number(probe.format.duration) * 1_000), metrics, processing: "linear_loudness_normalization_and_peak_control_only" },
    });
  }
  const finishedPaths = finishedResults.map((result) => path.resolve(outputRoot, result.finished.file));
  const finishedWatermarks = watermarkScores(python, finishedPaths);
  if (finishedWatermarks.some((score) => score < 0.5)) throw new Error("finished_watermark_gate_failed");
  finishedResults.forEach((result, index) => Object.assign(result.finished, { watermarkScore: finishedWatermarks[index] }));

  const candidateSummaries = [];
  for (const mode of VOXY_SIGNATURE_DELIVERY_MODES) {
    const primary = finishedResults.find((result) => result.modeId === mode.id && result.situationId === mode.primarySituationId && result.variantId === mode.selectedVariantId)!;
    const candidateDir = path.resolve(outputRoot, mode.id);
    const candidateRaw = path.resolve(candidateDir, "raw.wav");
    const candidateFinished = path.resolve(candidateDir, "finished.wav");
    await copyFile(path.resolve(outputRoot, primary.raw.file), candidateRaw);
    await copyFile(path.resolve(outputRoot, primary.finished.file), candidateFinished);
    const situationResults = finishedResults.filter((result) => result.modeId === mode.id && result.purpose === "three_situations");
    const alternativeResults = finishedResults.filter((result) => result.modeId === mode.id && result.purpose === "parameter_search");
    const parameters = {
      mode,
      selectedVariant: mode.variants.find((variant) => variant.id === mode.selectedVariantId),
      searchVariants: [
        ...alternativeResults.map((result) => ({ variantId: result.variantId, situationId: result.situationId, raw: result.raw, finished: result.finished })),
        { variantId: primary.variantId, situationId: primary.situationId, raw: primary.raw, finished: primary.finished },
      ],
      situations: situationResults.map((result) => ({ situationId: result.situationId, raw: result.raw, finished: result.finished, timeline: result.timeline })),
      primary: { situationId: primary.situationId, raw: { file: "raw.wav", sha256: await sha256(candidateRaw) }, finished: { file: "finished.wav", sha256: await sha256(candidateFinished), durationMs: primary.finished.durationMs, metrics: primary.finished.metrics, watermarkScore: finishedWatermarks[finishedResults.indexOf(primary)] } },
    };
    await writeFile(path.resolve(candidateDir, "parameters.json"), `${JSON.stringify(parameters, null, 2)}\n`, "utf8");
    candidateSummaries.push({ id: mode.id, shortId: mode.shortId, label: mode.label, developmentReference: mode.developmentReference, primarySituationId: mode.primarySituationId, parametersFile: `${mode.id}/parameters.json`, raw: parameters.primary.raw, finished: parameters.primary.finished });
  }

  const shortSilence = path.resolve(referenceWorkspace, "pause-short.wav");
  const longSilence = path.resolve(referenceWorkspace, "pause-long.wav");
  for (const [file, duration] of [[shortSilence, "0.85"], [longSilence, "1.6"]] as const) {
    run("ffmpeg", ["-y", "-nostdin", "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", duration, "-c:a", "pcm_s16le", file]);
  }
  const finalistsPath = path.resolve(outputRoot, "voxy-signature-finalists.wav");
  concatAudio(VOXY_SIGNATURE_DELIVERY_MODES.flatMap((mode, index) => {
    const file = path.resolve(outputRoot, mode.id, "finished.wav");
    return index === VOXY_SIGNATURE_DELIVERY_MODES.length - 1 ? [file] : [file, longSilence];
  }), finalistsPath);
  const threeSituationsPath = path.resolve(outputRoot, "voxy-three-situations.wav");
  const threeSituationFiles: string[] = [];
  VOXY_SIGNATURE_TEST_SITUATIONS.forEach((situation, situationIndex) => {
    VOXY_SIGNATURE_DELIVERY_MODES.forEach((mode, modeIndex) => {
      const result = finishedResults.find((entry) => entry.modeId === mode.id && entry.situationId === situation.id && entry.purpose === "three_situations")!;
      threeSituationFiles.push(path.resolve(outputRoot, result.finished.file));
      if (modeIndex < VOXY_SIGNATURE_DELIVERY_MODES.length - 1) threeSituationFiles.push(shortSilence);
    });
    if (situationIndex < VOXY_SIGNATURE_TEST_SITUATIONS.length - 1) threeSituationFiles.push(longSilence);
  });
  concatAudio(threeSituationFiles, threeSituationsPath);

  const spokenScript = {
    schemaVersion: `${VOXY_SIGNATURE_VOICE_SCHEMA_VERSION}-spoken-script`,
    visibleMeaningChanged: false,
    allowedTransformations: ["sentence_grouping", "punctuation", "pause_timing", "pronunciation_aliases", "prosodic_segmentation"],
    pronunciationAliases: VOXY_SIGNATURE_FINAL_PASS_BINDING.pronunciationAliases,
    situations: VOXY_SIGNATURE_TEST_SITUATIONS,
  };
  await writeFile(path.resolve(outputRoot, "spoken-script.json"), `${JSON.stringify(spokenScript, null, 2)}\n`, "utf8");

  const originalAfter = await Promise.all(references.map(fileSnapshot));
  const acceptedAfter = {
    voiceB: await directorySnapshot(path.resolve(acceptedReferenceRoot, "candidate-b")),
    voiceC: await directorySnapshot(path.resolve(acceptedReferenceRoot, "candidate-c")),
  };
  if (JSON.stringify(originalBefore) !== JSON.stringify(originalAfter)) throw new Error("original_reference_mutated");
  if (JSON.stringify(acceptedBefore) !== JSON.stringify(acceptedAfter)) throw new Error("accepted_b_or_c_mutated");

  const manifest = {
    schemaVersion: VOXY_SIGNATURE_VOICE_SCHEMA_VERSION,
    taskId: "VOXY-ANIMATABLE-MASTER-ASSET-01",
    exactHeadSha,
    technicalStatus: "pass",
    engine: VOXY_SIGNATURE_FINAL_PASS_BINDING.engine,
    model: VOXY_SIGNATURE_FINAL_PASS_BINDING.model,
    runtime: { device: synthesis.device, torchVersion: synthesis.torchVersion, offlineAfterProvisioning: true, runtimeNetworkRequests: 0 },
    privacy: { outputOutsideGitWorktree: true, originalsReadOnly: true, referenceSegmentsOutsideGitWorktree: true, privateReferencePathsRecorded: false, publicAudioCreated: false, uploaded: false },
    acceptedDevelopmentReferences: { voiceB: { status: "development_reference_accepted", preserved: true, files: acceptedBefore.voiceB }, voiceC: { status: "development_reference_accepted", preserved: true, files: acceptedBefore.voiceC }, audioMixedTogether: false },
    search: { strategy: "targeted_local_search_around_b_and_c", variantsPerMode: 2, technicalScoreSelectsWinner: false },
    candidates: candidateSummaries,
    reviewArtifacts: {
      finalists: { file: "voxy-signature-finalists.wav", order: ["D EDITORIAL", "E SIGNATURE", "F EXPLAINER"], sha256: await sha256(finalistsPath), durationMs: Math.round(Number(ffprobe(finalistsPath).format.duration) * 1_000) },
      threeSituations: { file: "voxy-three-situations.wav", order: VOXY_SIGNATURE_TEST_SITUATIONS.map((situation) => ({ test: situation.label, candidates: ["D", "E", "F"] })), sha256: await sha256(threeSituationsPath), durationMs: Math.round(Number(ffprobe(threeSituationsPath).format.duration) * 1_000) },
      spokenScript: "spoken-script.json",
    },
    visual: { ...VOXY_SIGNATURE_FINAL_PASS_BINDING.visual, previewVideosCreated: false },
    voiceB: "development_reference_accepted",
    voiceC: "development_reference_accepted",
    voiceD: "human_review",
    voiceE: "primary_canon_candidate",
    voiceF: "human_review",
    primaryCanonCandidate: "E",
    humanAudioAcceptance: "pending",
    humanVoiceWinner: "pending",
    productionEligible: false,
    autoPublish: false,
    exactHeadInputsClean: !dirty,
  };
  await writeFile(path.resolve(outputRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await writeFile(path.resolve(outputRoot, "README.md"), `# VOXY Signature Voice Final Pass — private local review\n\nThis directory is private, local-only evidence outside the Git worktree. It must not be committed, uploaded, copied to public/, included in Vercel, deployed, published, or used in production.\n\n## Review order\n\n- voxy-signature-finalists.wav: D Editorial → E Signature → F Explainer.\n- voxy-three-situations.wav: Test 1 D → E → F; Test 2 D → E → F; Test 3 D → E → F.\n\nB and C remain byte-for-byte preserved development references. E is only the primary canon candidate. Human audio acceptance and the human voice winner remain pending.\n`, "utf8");
  console.info(JSON.stringify({
    status: "voxy_signature_voice_final_pass_technical_pass", exactHeadSha, outputRoot,
    candidates: candidateSummaries.map((candidate) => ({ id: candidate.id, durationMs: candidate.finished.durationMs })),
    finalistsPath, threeSituationsPath,
    primaryCanonCandidate: "E", humanAudioAcceptance: "pending", humanVoiceWinner: "pending", productionEligible: false, autoPublish: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
