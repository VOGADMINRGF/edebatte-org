import { chromium, type Page } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, copyFile, lstat, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  VOXY_DUAL_VOICE_PILOT_AUDIO_SEGMENTS,
  VOXY_DUAL_VOICE_PILOT_OUTPUT,
  VOXY_SINGLE_VOICE_REVIEW_AUDIO_SEGMENTS,
  VOXY_SINGLE_VOICE_REVIEW_OUTPUT,
  assertVoxyPilotVoiceBinding,
  buildVoxyDualVoicePilotSrt,
  buildVoxyDualVoicePilotVtt,
  buildVoxyDualVoicePilotPlan,
  buildVoxySingleVoiceReviewPlan,
  validateVoxyDualVoicePilotPlan,
  validateVoxySingleVoiceReviewPlan,
} from "../src/features/voxyVideo/dualVoiceExplainerPilot";
import { renderVoxyDualVoicePilotFrameHtml } from "../src/features/voxyVideo/dualVoiceExplainerPilotHtml";
import {
  VOXY_DUAL_VOICE_ACCEPTANCE,
  EDITORIAL_VOICE,
  VOXY_SIGNATURE,
} from "../src/features/voxyVideo/dualVoiceArchitecture";
import { VOXY_FIRST_EXPLAINER_STUDIO_LOCKUP_PATH } from "../src/features/voxyVideo/firstExplainerVideo";
import { VOXY_CHATTERBOX_MODEL } from "../src/features/voxyVideo/firstPartyVoiceClone";
import { VOXY_POCKET_MARK_COMPOSITION_SOURCE } from "../src/features/voxyVideo/pocketMarkFinalGate";
import { VOXY_STATIC_CANON_NATIVE_ASSETS } from "../src/features/voxyVideo/staticCanonRecovery";
import type { VoxyMotionV4EmbeddedAssets } from "../src/features/voxyVideo/motionV4Html";

export type Probe = { streams: Array<Record<string, string>>; format: Record<string, string> };
export type PilotAudioSegment = Readonly<{
  id: string;
  speakerRole: "voxy" | "editorial";
  voiceId: string;
  text: string;
  spokenText: string;
  pauseAfterMs: number;
}>;

export function argument(name: string): string | null {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? null;
}

export function execute(binary: string, args: string[], options: { cwd?: string; input?: string; env?: NodeJS.ProcessEnv } = {}) {
  const result = spawnSync(binary, args, {
    cwd: options.cwd,
    input: options.input,
    env: { ...process.env, ...options.env },
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
  });
  if (result.status !== 0 || result.error) {
    throw new Error(`${path.basename(binary)}_failed:${result.error?.message ?? result.stderr.trim()}`);
  }
  return { stdout: result.stdout.trim(), stderr: result.stderr.trim() };
}

export function run(binary: string, args: string[], options: { cwd?: string; input?: string; env?: NodeJS.ProcessEnv } = {}): string {
  return execute(binary, args, options).stdout;
}

export async function sha256(file: string): Promise<string> {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

function sha256Buffer(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export function ffprobe(file: string): Probe {
  return JSON.parse(run("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", file])) as Probe;
}

export function privacySafeProbe(probe: Probe): Probe {
  return {
    ...probe,
    format: {
      ...probe.format,
      ...(probe.format.filename ? { filename: path.basename(probe.format.filename) } : {}),
    },
  };
}

export function durationMs(file: string): number {
  return Math.round(Number(ffprobe(file).format.duration) * 1_000);
}

export type AudioMetrics = Readonly<{
  integratedLufs: number;
  loudnessRangeLu: number;
  truePeakDbfs: number;
  sampleRate: number;
  channels: number;
  durationMs: number;
}>;

function lastMetric(stderr: string, pattern: RegExp, label: string): number {
  const values = [...stderr.matchAll(pattern)].map((match) => Number(match[1]));
  const value = values.at(-1);
  if (!Number.isFinite(value)) throw new Error(`audio_metric_missing:${label}`);
  return value!;
}

export function audioMetrics(file: string): AudioMetrics {
  const probe = ffprobe(file);
  const stream = probe.streams.find((entry) => entry.codec_type === "audio");
  if (!stream) throw new Error("audio_stream_missing_for_metrics");
  const analysis = execute("ffmpeg", [
    "-hide_banner", "-nostats", "-i", file,
    "-filter_complex", "ebur128=peak=true",
    "-f", "null", "-",
  ]).stderr;
  return {
    integratedLufs: lastMetric(analysis, /I:\s*(-?\d+(?:\.\d+)?) LUFS/g, "integrated_lufs"),
    loudnessRangeLu: lastMetric(analysis, /LRA:\s*(-?\d+(?:\.\d+)?) LU/g, "loudness_range"),
    truePeakDbfs: lastMetric(analysis, /Peak:\s*(-?\d+(?:\.\d+)?) dBFS/g, "true_peak"),
    sampleRate: Number(stream.sample_rate),
    channels: Number(stream.channels),
    durationMs: durationMs(file),
  };
}

function roundedGain(value: number, precisionDb: number): number {
  return Number((Math.round(value / precisionDb) * precisionDb).toFixed(3));
}

export function dataUrl(buffer: Buffer, mime: string): string {
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

export async function setHtml(page: Page, html: string): Promise<void> {
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images).map((image) => image.decode()));
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
}

export async function assertOutsideRepository(repositoryRoot: string, target: string, label: string): Promise<void> {
  const resolved = await realpath(target);
  const relative = path.relative(repositoryRoot, resolved);
  if (!relative.startsWith("..") || path.isAbsolute(relative) === false && relative === "") {
    throw new Error(`${label}_must_be_outside_repository`);
  }
}

export async function verifyAcceptedVoxyReference(input: {
  repositoryRoot: string;
  reference: string;
  selectionManifest: string;
}): Promise<{ expectedSegmentSha256: string; selectionManifestSha256: string }> {
  await assertOutsideRepository(input.repositoryRoot, input.reference, "private_voxy_reference");
  await assertOutsideRepository(input.repositoryRoot, input.selectionManifest, "private_voxy_reference_selection");
  const selection = JSON.parse(await readFile(input.selectionManifest, "utf8")) as {
    schemaVersion?: string;
    references?: Array<{ id: string; sha256: string; originalPathWithheld: boolean; copiedIntoWorktree: boolean }>;
    selectedSegments?: Array<{ id: string; sha256: string; privatePathWithheld: boolean }>;
  };
  const canonicalReference = VOXY_SIGNATURE.provenance.canonicalReference;
  const reference = selection.references?.find((entry) => entry.id === canonicalReference.id);
  const segment = selection.selectedSegments?.find((entry) => entry.id === canonicalReference.segmentId);
  if (selection.schemaVersion !== "voxy-first-party-reference-selection-v1" || !reference || !segment) {
    throw new Error("accepted_voxy_reference_selection_invalid");
  }
  if (!reference.originalPathWithheld || reference.copiedIntoWorktree || !segment.privatePathWithheld) {
    throw new Error("accepted_voxy_reference_privacy_invalid");
  }
  if (reference.sha256 !== canonicalReference.sha256 || await sha256(input.reference) !== canonicalReference.sha256) {
    throw new Error("accepted_voxy_reference_sha_mismatch");
  }
  if (segment.sha256 !== canonicalReference.segmentSha256) throw new Error("accepted_voxy_reference_segment_manifest_mismatch");
  return {
    expectedSegmentSha256: segment.sha256,
    selectionManifestSha256: await sha256(input.selectionManifest),
  };
}

export async function verifyCanonicalHumanEvidence(input: {
  repositoryRoot: string;
  voxyD1: string;
  editorialW1?: string;
}): Promise<void> {
  await assertOutsideRepository(input.repositoryRoot, input.voxyD1, "private_voxy_d1_evidence");
  if (input.editorialW1) await assertOutsideRepository(input.repositoryRoot, input.editorialW1, "private_editorial_w1_evidence");
  if (await sha256(input.voxyD1) !== VOXY_SIGNATURE.provenance.privateHumanReviewEvidenceSha256) throw new Error("canonical_voxy_d1_evidence_sha_mismatch");
  if (input.editorialW1 && await sha256(input.editorialW1) !== EDITORIAL_VOICE.provenance.privateHumanReviewEvidenceSha256) throw new Error("canonical_editorial_w1_evidence_sha_mismatch");
}

export async function renderTransparentMasterAudio(input: {
  segmentId: string;
  inputFile: string;
  outputFile: string;
  speakerRole: "voxy" | "editorial";
  acceptedEvidence: AudioMetrics;
}): Promise<Record<string, unknown>> {
  const { segmentId, inputFile, outputFile, speakerRole, acceptedEvidence } = input;
  const inputMetrics = audioMetrics(inputFile);
  const mastering = speakerRole === "voxy"
    ? VOXY_SIGNATURE.provenance.synthesis.mastering
    : EDITORIAL_VOICE.provenance.synthesis.mastering;
  const policy = mastering.staticGainPolicy;
  if (
    mastering.dynamicNormalization
    || mastering.compression
    || mastering.pitchChanged
    || mastering.tempoChanged
    || mastering.timeStretch
    || mastering.eqApplied
    || !policy.blanketRoleGainForbidden
    || !policy.abstractLufsTargetForbidden
    || mastering.peakProtectionApplied
  ) {
    throw new Error(`canonical_${speakerRole}_transparent_mastering_invalid`);
  }

  const evidenceBalanceDelta = acceptedEvidence.integratedLufs - inputMetrics.integratedLufs;
  const requestedGainDb = Math.abs(evidenceBalanceDelta) <= policy.zeroGainToleranceLu
    ? 0
    : roundedGain(evidenceBalanceDelta, policy.gainPrecisionDb);
  const maximumPeakSafeGainDb = Number((policy.maximumOutputTruePeakDbfs - inputMetrics.truePeakDbfs).toFixed(3));
  let staticGainDb = requestedGainDb > 0
    ? Math.min(requestedGainDb, Math.floor(maximumPeakSafeGainDb / policy.gainPrecisionDb) * policy.gainPrecisionDb)
    : requestedGainDb;
  staticGainDb = Number(staticGainDb.toFixed(3));
  let peakCorrectionApplied = false;

  const render = () => run("ffmpeg", [
    "-y", "-i", inputFile,
    ...(staticGainDb === 0 ? [] : ["-af", `volume=${staticGainDb}dB`]),
    "-ar", String(mastering.outputSampleRate),
    "-ac", String(mastering.outputChannels),
    "-c:a", mastering.outputCodec,
    outputFile,
  ]);
  render();
  let outputMetrics = audioMetrics(outputFile);
  if (outputMetrics.truePeakDbfs > policy.maximumOutputTruePeakDbfs) {
    const correctionDb = policy.maximumOutputTruePeakDbfs - outputMetrics.truePeakDbfs - policy.gainPrecisionDb;
    staticGainDb = roundedGain(staticGainDb + correctionDb, policy.gainPrecisionDb);
    peakCorrectionApplied = true;
    render();
    outputMetrics = audioMetrics(outputFile);
  }
  if (outputMetrics.truePeakDbfs > policy.maximumOutputTruePeakDbfs) {
    throw new Error(`canonical_${speakerRole}_static_gain_peak_gate_failed:${segmentId}`);
  }
  if (Math.abs(outputMetrics.durationMs - inputMetrics.durationMs) > 2) {
    throw new Error(`canonical_${speakerRole}_finish_changed_duration`);
  }
  return {
    segmentId,
    speakerRole,
    candidateId: speakerRole === "voxy" ? VOXY_SIGNATURE.candidateId : EDITORIAL_VOICE.candidateId,
    voiceId: speakerRole === "voxy" ? VOXY_SIGNATURE.voiceId : EDITORIAL_VOICE.voiceId,
    acceptedEvidenceSha256: speakerRole === "voxy"
      ? VOXY_SIGNATURE.provenance.privateHumanReviewEvidenceSha256
      : EDITORIAL_VOICE.provenance.privateHumanReviewEvidenceSha256,
    acceptedEvidenceMetrics: acceptedEvidence,
    inputSha256: await sha256(inputFile),
    inputLufs: inputMetrics.integratedLufs,
    inputPeak: inputMetrics.truePeakDbfs,
    inputSampleRate: inputMetrics.sampleRate,
    inputDurationMs: inputMetrics.durationMs,
    evidenceBalanceDeltaLu: Number(evidenceBalanceDelta.toFixed(3)),
    requestedStaticGainDb: requestedGainDb,
    maximumPeakSafeGainDb,
    staticGainDb,
    appliedFfmpegAudioFilters: staticGainDb === 0 ? [] : [`volume=${staticGainDb}dB`],
    peakSafetyGainAdjustmentApplied: peakCorrectionApplied || staticGainDb !== requestedGainDb,
    staticGainReason: staticGainDb === 0
      ? "input_already_within_human_evidence_balance_tolerance"
      : peakCorrectionApplied || staticGainDb !== requestedGainDb
        ? "human_evidence_balance_gain_limited_by_peak_headroom"
        : "human_evidence_relative_dialogue_balance",
    outputSha256: await sha256(outputFile),
    outputLufs: outputMetrics.integratedLufs,
    outputPeak: outputMetrics.truePeakDbfs,
    outputSampleRate: outputMetrics.sampleRate,
    outputDurationMs: outputMetrics.durationMs,
    resamplingApplied: inputMetrics.sampleRate !== outputMetrics.sampleRate,
    formatAlignmentApplied: inputMetrics.sampleRate !== outputMetrics.sampleRate || inputMetrics.channels !== outputMetrics.channels,
    dynamicNormalization: false,
    compression: false,
    eqApplied: false,
    pitchChanged: false,
    tempoChanged: false,
    timeStretch: false,
    reverbApplied: false,
    exciterApplied: false,
    limiterApplied: false,
    clipping: false,
  };
}

export async function synthesizeVoxySegments(input: {
  python: string;
  modelDir: string;
  reference: string;
  expectedReferenceSegmentSha256: string;
  temporaryRoot: string;
  rawRoot: string;
  segments: readonly PilotAudioSegment[];
  singleVoiceReview: boolean;
}): Promise<Map<string, string>> {
  const referenceSegment = path.resolve(input.temporaryRoot, "voxy-reference-segment.wav");
  const canonicalReference = VOXY_SIGNATURE.provenance.canonicalReference;
  run("ffmpeg", [
    "-y", "-ss", String(canonicalReference.segmentStartSeconds), "-to", String(canonicalReference.segmentEndSeconds),
    "-i", input.reference, "-ar", "24000", "-ac", "1", "-c:a", "pcm_s16le", referenceSegment,
  ]);
  if (await sha256(referenceSegment) !== input.expectedReferenceSegmentSha256) {
    throw new Error("accepted_voxy_reference_segment_sha_mismatch");
  }
  const synthesis = VOXY_SIGNATURE.provenance.synthesis;
  if (synthesis.timeStretch || VOXY_SIGNATURE.selectedVariantId !== "d1-conversational-dynamic") throw new Error("accepted_voxy_variant_binding_invalid");
  const spokenParts: Record<string, readonly { text: string; pauseAfterMs: number }[]> = {
    "voxy-democracy-opening": [
      { text: "Hallo Nachbar.", pauseAfterMs: 240 },
      { text: "Wir wählen. Wir diskutieren. Wir streiten.", pauseAfterMs: 200 },
      { text: "Und trotzdem bleibt bei vielen Menschen eine ziemlich einfache Frage.", pauseAfterMs: 180 },
      { text: "Wird meine Stimme eigentlich gehört?", pauseAfterMs: 0 },
    ],
    "voxy-headline-limits": [
      { text: "Aber wenn wir wissen wollen, wie es unserer Demokratie wirklich geht, reicht eine Schlagzeile nicht.", pauseAfterMs: 0 },
    ],
    "voxy-distinction": [
      { text: "Genau deshalb trennen wir Gefühl, Befund und offene Frage.", pauseAfterMs: 0 },
    ],
    "voxy-democracy-reflection": [
      { text: "Vielleicht ist die spannendere Frage also nicht nur, ob Demokratie funktioniert.", pauseAfterMs: 240 },
      { text: "Sondern wo Menschen erleben, dass sie nicht mehr funktioniert.", pauseAfterMs: 0 },
    ],
    "voxy-verifiability": [
      { text: "Du musst mir dabei nichts glauben.", pauseAfterMs: 360 },
      { text: "Du sollst es prüfen können.", pauseAfterMs: 0 },
    ],
  };
  const canonicalD1Segments = VOXY_DUAL_VOICE_PILOT_AUDIO_SEGMENTS.filter((segment) => segment.speakerRole === "voxy");
  const jobs = input.segments
    .filter((segment) => segment.speakerRole === "voxy")
    .map((segment, jobIndex) => {
      const binding = assertVoxyPilotVoiceBinding(segment);
      if (binding.synthesisBackend !== "chatterbox_multilingual_first_party") {
        throw new Error("voxy_synthesis_backend_mapping_invalid");
      }
      return {
      id: segment.id,
      modeId: VOXY_SIGNATURE.id,
      variantId: VOXY_SIGNATURE.selectedVariantId,
      situationId: input.singleVoiceReview ? "single-voice-human-ab-test-v1.3" : "dual-voice-pilot-v1.3",
      purpose: input.singleVoiceReview ? "canonical_d1_for_private_single_voice_human_ab_test" : "canonical_d1_voxy_for_private_human_review_pilot",
      outputPath: path.resolve(input.rawRoot, `${segment.id}.wav`),
      referencePath: referenceSegment,
      seedOffset: (() => {
        const canonicalIndex = canonicalD1Segments.findIndex((entry) => entry.id === segment.id);
        return canonicalIndex >= 0 ? 1_000 + canonicalIndex * 100 : 2_000 + jobIndex * 100;
      })(),
      parameters: {
        seed: synthesis.seed,
        exaggeration: synthesis.exaggeration,
        cfgWeight: synthesis.cfgWeight,
        temperature: synthesis.temperature,
        repetitionPenalty: synthesis.repetitionPenalty,
        minP: synthesis.minP,
        topP: synthesis.topP,
        pauseScale: synthesis.pauseScale,
      },
      segments: (spokenParts[segment.id] ?? [{ text: segment.spokenText, pauseAfterMs: 0 }]).map((part, index, parts) => ({
        id: `${segment.id}-${index + 1}`,
        visibleText: part.text,
        spokenText: part.text,
        pauseAfterMs: index < parts.length - 1 ? part.pauseAfterMs : 0,
      })),
    };
    });
  const resultPath = path.resolve(input.temporaryRoot, "voxy-result.json");
  const configPath = path.resolve(input.temporaryRoot, "voxy-config.json");
  await writeFile(configPath, `${JSON.stringify({
    modelDir: input.modelDir,
    modelFiles: VOXY_CHATTERBOX_MODEL.files,
    device: argument("voxy-device") ?? "mps",
    resultPath,
    jobs,
  }, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  run(input.python, [path.resolve(import.meta.dirname, "lib/voxyChatterboxSignature.py"), "--config", configPath], {
    env: {
      HF_HUB_OFFLINE: "1",
      TRANSFORMERS_OFFLINE: "1",
      HF_HOME: path.dirname(input.modelDir),
      HTTPS_PROXY: "http://127.0.0.1:9",
      HTTP_PROXY: "http://127.0.0.1:9",
      ALL_PROXY: "http://127.0.0.1:9",
      NO_PROXY: "",
    },
  });
  const result = JSON.parse(await readFile(resultPath, "utf8")) as {
    runtimeNetworkRequests: number;
    jobs: Array<{ id: string; modeId: string; variantId: string; file: string; watermarkScore: number }>;
  };
  if (
    result.runtimeNetworkRequests !== 0
    || result.jobs.length !== jobs.length
    || result.jobs.some((job) =>
      job.watermarkScore < 0.9
      || job.modeId !== VOXY_SIGNATURE.id
      || job.variantId !== VOXY_SIGNATURE.selectedVariantId
      || !jobs.some((expected) => expected.id === job.id && expected.outputPath === job.file)
    )
  ) {
    throw new Error("voxy_offline_or_watermark_gate_failed");
  }
  return new Map(result.jobs.map((job) => [job.id, job.file]));
}

async function synthesizeEditorialSegment(input: {
  mimic3Cache: string;
  segmentId: string;
  speakerRole: "editorial";
  voiceId: string;
  spokenText: string;
  rawRoot: string;
}): Promise<string> {
  const binding = assertVoxyPilotVoiceBinding(input);
  if (binding.synthesisBackend !== "mimic3_m_ailabs_ramona_deininger") {
    throw new Error("editorial_synthesis_backend_mapping_invalid");
  }
  const spokenParts: Record<string, readonly { text: string; pauseAfterMs: number }[]> = {
    "editorial-democracy-dimensions": [
      { text: "Denn Vertrauen, politische Beteiligung und das Gefühl, selbst etwas bewirken zu können, beschreiben unterschiedliche Seiten derselben Demokratie.", pauseAfterMs: 0 },
    ],
    "editorial-look-closer": [
      { text: "Ein einzelner Wert kann steigen, während ein anderer fällt.", pauseAfterMs: 320 },
      { text: "Das ist kein Widerspruch.", pauseAfterMs: 260 },
      { text: "Es bedeutet, dass wir genauer hinschauen müssen.", pauseAfterMs: 0 },
    ],
    "editorial-open-questions": [
      { text: "Was wissen wir?", pauseAfterMs: 220 },
      { text: "Was spricht für eine Erklärung?", pauseAfterMs: 220 },
      { text: "Was spricht dagegen?", pauseAfterMs: 220 },
      { text: "Und was wissen wir noch nicht?", pauseAfterMs: 0 },
    ],
    "editorial-synthesis": [
      { text: "Erst zusammen entsteht ein Bild, das mehr zeigt als eine einzelne Zahl oder eine einzelne Meinung.", pauseAfterMs: 0 },
    ],
  };
  const parts = spokenParts[input.segmentId] ?? [{ text: input.spokenText.replaceAll("\n", " "), pauseAfterMs: 0 }];
  const segmentRoot = path.resolve(input.rawRoot, `${input.segmentId}-mimic3`);
  await mkdir(segmentRoot, { recursive: true });
  const mimic3 = path.resolve(input.mimic3Cache, "mimic3-venv/bin/mimic3");
  run(mimic3, [
    "--voices-dir", path.resolve(input.mimic3Cache, "mimic3-voices"),
    "--voice", "de_DE/m-ailabs_low",
    "--speaker", "ramona_deininger",
    "--deterministic", "--noise-scale", "0", "--noise-w", "0",
    "--length-scale", String(EDITORIAL_VOICE.provenance.synthesis.lengthScale),
    "--output-dir", segmentRoot, "--output-naming", "id", "--csv",
  ], {
    input: `${parts.map((part, index) => `part-${index + 1}|${part.text}`).join("\n")}\n`,
    env: { PIP_NO_INDEX: "1", HF_HUB_OFFLINE: "1", TRANSFORMERS_OFFLINE: "1", HTTPS_PROXY: "http://127.0.0.1:9", HTTP_PROXY: "http://127.0.0.1:9", ALL_PROXY: "http://127.0.0.1:9", NO_PROXY: "" },
  });
  const files: string[] = [];
  const firstPart = path.resolve(segmentRoot, "part-1.wav");
  const sampleRate = Number(ffprobe(firstPart).streams.find((stream) => stream.codec_type === "audio")?.sample_rate);
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) throw new Error("editorial_sample_rate_invalid");
  for (const [index, part] of parts.entries()) {
    files.push(path.resolve(segmentRoot, `part-${index + 1}.wav`));
    if (part.pauseAfterMs) {
      const silence = path.resolve(segmentRoot, `pause-${index + 1}.wav`);
      run("ffmpeg", ["-y", "-f", "lavfi", "-i", `anullsrc=r=${sampleRate}:cl=mono`, "-t", (part.pauseAfterMs / 1_000).toFixed(3), "-c:a", "pcm_s16le", silence]);
      files.push(silence);
    }
  }
  const concatList = path.resolve(segmentRoot, "concat.txt");
  await writeFile(concatList, files.map((file) => `file '${file.replaceAll("'", "'\\''")}'`).join("\n"), "utf8");
  const assembled = path.resolve(input.rawRoot, `${input.segmentId}.wav`);
  run("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", concatList, "-c:a", "pcm_s16le", assembled]);
  return assembled;
}

export async function concatenateMaster(input: {
  finishedById: ReadonlyMap<string, string>;
  output: string;
  temporaryRoot: string;
  segments: readonly PilotAudioSegment[];
}): Promise<void> {
  const files: string[] = [];
  const addSilence = (id: string, milliseconds: number) => {
    const file = path.resolve(input.temporaryRoot, `${id}.wav`);
    run("ffmpeg", ["-y", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono", "-t", (milliseconds / 1_000).toFixed(3), "-c:a", "pcm_s16le", file]);
    files.push(file);
  };
  addSilence("leading-silence", 600);
  for (const segment of input.segments) {
    files.push(input.finishedById.get(segment.id)!);
    if (segment.pauseAfterMs) addSilence(`pause-${segment.id}`, segment.pauseAfterMs);
  }
  addSilence("tail-silence", 800);
  const concatList = path.resolve(input.temporaryRoot, "master-concat.txt");
  await writeFile(concatList, files.map((file) => `file '${file.replaceAll("'", "'\\''")}'`).join("\n"), "utf8");
  run("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", concatList, "-c:a", "pcm_s16le", input.output]);
}

function wavPcmData(buffer: Buffer): Buffer {
  const dataChunk = buffer.indexOf(Buffer.from("data"));
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE" || dataChunk < 0) {
    throw new Error("wav_pcm_data_invalid");
  }
  const byteLength = buffer.readUInt32LE(dataChunk + 4);
  return buffer.subarray(dataChunk + 8, dataChunk + 8 + byteLength);
}

export async function verifyMasterAudioAssembly(input: {
  finishedById: ReadonlyMap<string, string>;
  masterAudio: string;
  segments: readonly PilotAudioSegment[];
}) {
  const masterPcm = wavPcmData(await readFile(input.masterAudio));
  let cursorBytes = 600 * 48 * 2;
  const segments = [];
  for (const segment of input.segments) {
    const binding = assertVoxyPilotVoiceBinding(segment);
    const finishedFile = input.finishedById.get(segment.id);
    if (!finishedFile) throw new Error(`finished_audio_missing:${segment.id}`);
    const finishedPcm = wavPcmData(await readFile(finishedFile));
    const masterWindow = masterPcm.subarray(cursorBytes, cursorBytes + finishedPcm.length);
    if (!finishedPcm.equals(masterWindow)) throw new Error(`master_audio_pcm_identity_mismatch:${segment.id}`);
    let absoluteSampleSum = 0;
    for (let offset = 0; offset < finishedPcm.length; offset += 2) {
      absoluteSampleSum += Math.abs(finishedPcm.readInt16LE(offset));
    }
    const meanAbsoluteSample = absoluteSampleSum / Math.max(1, finishedPcm.length / 2);
    if (meanAbsoluteSample < 80) throw new Error(`assembled_voice_segment_is_silent:${segment.id}`);
    segments.push({
      id: segment.id,
      speakerRole: segment.speakerRole,
      voiceId: segment.voiceId,
      candidateId: binding.candidateId,
      humanIdentityStatus: binding.humanIdentityStatus,
      synthesisBackend: binding.synthesisBackend,
      finishedFileSha256: await sha256(finishedFile),
      masterWindowPcmSha256: sha256Buffer(masterWindow),
      pcmIdentityMatch: true,
      nonSilent: true,
    });
    cursorBytes += finishedPcm.length + segment.pauseAfterMs * 48 * 2;
  }
  return {
    gate: "passed",
    finalMasterContainsEveryVerifiedSegment: true,
    roleVoiceCrossing: false,
    segments,
  } as const;
}

export function audioLevelsFromWav(buffer: Buffer, fps: number): number[] {
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") throw new Error("master_wav_invalid");
  const fmt = buffer.indexOf(Buffer.from("fmt "));
  const data = buffer.indexOf(Buffer.from("data"));
  if (fmt < 0 || data < 0) throw new Error("master_wav_chunks_missing");
  const channels = buffer.readUInt16LE(fmt + 10);
  const sampleRate = buffer.readUInt32LE(fmt + 12);
  const bits = buffer.readUInt16LE(fmt + 22);
  if (channels !== 1 || sampleRate !== 48_000 || bits !== 16) throw new Error("master_wav_pcm_contract_invalid");
  const start = data + 8;
  const samples = Math.floor((buffer.length - start) / 2);
  const frameCount = Math.ceil((samples * fps) / sampleRate);
  const values: number[] = [];
  const halfWindow = Math.round(sampleRate * 0.042);
  for (let frame = 0; frame < frameCount; frame += 1) {
    const center = Math.round((frame * sampleRate) / fps);
    let sum = 0;
    const from = Math.max(0, center - halfWindow);
    const to = Math.min(samples, center + halfWindow);
    for (let index = from; index < to; index += 1) {
      const sample = buffer.readInt16LE(start + index * 2) / 32768;
      sum += sample * sample;
    }
    values.push(Math.sqrt(sum / Math.max(1, to - from)));
  }
  const sorted = [...values].sort((a, b) => a - b);
  const reference = sorted[Math.floor(sorted.length * 0.96)] ?? 0.001;
  let smoothed = 0;
  return values.map((value) => {
    const gated = value < 0.004 ? 0 : Math.min(1, value / Math.max(0.001, reference));
    smoothed = gated > smoothed ? smoothed * 0.28 + gated * 0.72 : smoothed * 0.58 + gated * 0.42;
    return Math.round(smoothed * 16) / 16;
  });
}

async function main(): Promise<void> {
  const repositoryRoot = path.resolve(import.meta.dirname, "../../..");
  const reviewVariant = argument("review-variant");
  if (reviewVariant && reviewVariant !== "single-voice") throw new Error("unsupported_review_variant");
  const singleVoiceReview = reviewVariant === "single-voice";
  const pilotSegments: readonly PilotAudioSegment[] = singleVoiceReview
    ? VOXY_SINGLE_VOICE_REVIEW_AUDIO_SEGMENTS
    : VOXY_DUAL_VOICE_PILOT_AUDIO_SEGMENTS;
  const outputContract = singleVoiceReview
    ? VOXY_SINGLE_VOICE_REVIEW_OUTPUT
    : VOXY_DUAL_VOICE_PILOT_OUTPUT;
  if (!VOXY_DUAL_VOICE_ACCEPTANCE.videoRenderingAllowed) {
    throw new Error("video_render_blocked_pending_human_voice_selection");
  }
  const exactHeadSha = process.env.VOXY_DUAL_VOICE_PILOT_COMMIT_SHA?.trim() ?? "";
  if (!/^[0-9a-f]{40}$/.test(exactHeadSha)) throw new Error("VOXY_DUAL_VOICE_PILOT_COMMIT_SHA_required");
  if (run("git", ["rev-parse", "HEAD"], { cwd: repositoryRoot }) !== exactHeadSha) throw new Error("exact_head_mismatch");
  const requiredArguments = [
    "voxy-python", "voxy-model-dir", "voxy-reference-02", "voxy-reference-selection", "voxy-d1-evidence",
    ...(singleVoiceReview ? [] : ["editorial-w1-evidence", "mimic3-cache"]),
  ];
  if (requiredArguments.some((name) => !argument(name))) throw new Error("explicit_private_voice_runtime_arguments_required");
  const voxyPython = path.resolve(argument("voxy-python")!);
  const voxyModelDir = path.resolve(argument("voxy-model-dir")!);
  const voxyReference = path.resolve(argument("voxy-reference-02")!);
  const voxyReferenceSelection = path.resolve(argument("voxy-reference-selection")!);
  const voxyD1Evidence = path.resolve(argument("voxy-d1-evidence")!);
  const editorialW1Evidence = argument("editorial-w1-evidence") ? path.resolve(argument("editorial-w1-evidence")!) : null;
  const mimic3Cache = argument("mimic3-cache") ? path.resolve(argument("mimic3-cache")!) : null;
  for (const target of [voxyPython, voxyModelDir, voxyReference, voxyReferenceSelection, voxyD1Evidence, editorialW1Evidence, mimic3Cache].filter((entry): entry is string => Boolean(entry))) await access(target);
  if (!(await lstat(voxyReference)).isFile()) throw new Error("private_voxy_reference_must_be_file");
  if (!(await lstat(voxyReferenceSelection)).isFile()) throw new Error("private_voxy_reference_selection_must_be_file");
  const acceptedVoxyReference = await verifyAcceptedVoxyReference({
    repositoryRoot,
    reference: voxyReference,
    selectionManifest: voxyReferenceSelection,
  });
  await verifyCanonicalHumanEvidence({ repositoryRoot, voxyD1: voxyD1Evidence, ...(editorialW1Evidence ? { editorialW1: editorialW1Evidence } : {}) });
  const acceptedEvidenceMetrics = {
    voxy: audioMetrics(voxyD1Evidence),
    ...(editorialW1Evidence ? { editorial: audioMetrics(editorialW1Evidence) } : {}),
  } as const;
  for (const modelFile of singleVoiceReview ? [] : EDITORIAL_VOICE.provenance.modelFiles) {
    if (!mimic3Cache || await sha256(path.resolve(mimic3Cache, modelFile.path)) !== modelFile.sha256) throw new Error(`canonical_editorial_model_file_sha_mismatch:${modelFile.path}`);
  }

  const outputArgument = argument("output") ?? outputContract.directory;
  const outputRoot = path.resolve(repositoryRoot, outputArgument);
  const outputParentReal = await realpath(path.dirname(outputRoot));
  if (!path.relative(repositoryRoot, outputParentReal).startsWith("..")) throw new Error("private_output_parent_must_resolve_outside_repository");
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true, mode: 0o700 });
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "voxy-dual-voice-pilot-"));
  const rawRoot = path.resolve(temporaryRoot, "raw");
  const finishedRoot = path.resolve(temporaryRoot, "finished");
  const framesRoot = path.resolve(temporaryRoot, "frames");
  const standframesRoot = path.resolve(outputRoot, "standframes");
  await Promise.all([mkdir(rawRoot, { recursive: true }), mkdir(finishedRoot, { recursive: true }), mkdir(framesRoot, { recursive: true }), mkdir(standframesRoot, { recursive: true })]);

  try {
    const masterAudio = path.resolve(outputRoot, outputContract.masterAudio);
    for (const segment of pilotSegments) assertVoxyPilotVoiceBinding(segment);
    console.info("pilot_progress:synthesize_canonical_d1_voxy");
    const voxyRaw = await synthesizeVoxySegments({
      python: voxyPython,
      modelDir: voxyModelDir,
      reference: voxyReference,
      expectedReferenceSegmentSha256: acceptedVoxyReference.expectedSegmentSha256,
      temporaryRoot,
      rawRoot,
      segments: pilotSegments,
      singleVoiceReview,
    });
    const rawById = new Map(voxyRaw);
    if (!singleVoiceReview) console.info("pilot_progress:synthesize_canonical_w1_editorial");
    for (const segment of pilotSegments.filter((entry) => entry.speakerRole === "editorial")) {
      rawById.set(segment.id, await synthesizeEditorialSegment({
        mimic3Cache: mimic3Cache!,
        segmentId: segment.id,
        speakerRole: segment.speakerRole,
        voiceId: segment.voiceId,
        spokenText: segment.spokenText,
        rawRoot,
      }));
    }
    const rawSpeechDurationMs = pilotSegments.reduce((sum, segment) => sum + durationMs(rawById.get(segment.id)!), 0);
    console.info(JSON.stringify({ pilot_progress: "natural_audio_duration", rawSpeechDurationMs, timeCompression: false, timeStretch: false }));
    const finishedById = new Map<string, string>();
    const audioPreservationSegments: Array<Record<string, unknown>> = [];
    for (const segment of pilotSegments) {
      const finished = path.resolve(finishedRoot, `${segment.id}.wav`);
      audioPreservationSegments.push(await renderTransparentMasterAudio({
        segmentId: segment.id,
        inputFile: rawById.get(segment.id)!,
        outputFile: finished,
        speakerRole: segment.speakerRole,
        acceptedEvidence: segment.speakerRole === "voxy" ? acceptedEvidenceMetrics.voxy : acceptedEvidenceMetrics.editorial!,
      }));
      finishedById.set(segment.id, finished);
    }
    const speechDurationsMs = pilotSegments.map((segment) => durationMs(finishedById.get(segment.id)!));
    await concatenateMaster({ finishedById, output: masterAudio, temporaryRoot, segments: pilotSegments });
    const audioAssembly = await verifyMasterAudioAssembly({ finishedById, masterAudio, segments: pilotSegments });
    const plan = singleVoiceReview
      ? buildVoxySingleVoiceReviewPlan(exactHeadSha, speechDurationsMs)
      : buildVoxyDualVoicePilotPlan(exactHeadSha, speechDurationsMs);
    const planErrors = singleVoiceReview
      ? validateVoxySingleVoiceReviewPlan(plan as ReturnType<typeof buildVoxySingleVoiceReviewPlan>)
      : validateVoxyDualVoicePilotPlan(plan as ReturnType<typeof buildVoxyDualVoicePilotPlan>);
    if (planErrors.length) throw new Error(`pilot_plan_invalid:${planErrors.join(",")}`);
    if (Math.abs(durationMs(masterAudio) - plan.output.durationMs) > 120) throw new Error("master_audio_duration_drift");
    const audioPreservation = {
      schemaVersion: singleVoiceReview ? "voxy-single-d1-voice-preservation-v1.3" : "voxy-human-accepted-voice-preservation-v1.3",
      gate: "passed",
      policy: VOXY_SIGNATURE.provenance.synthesis.mastering,
      acceptedEvidence: {
        voxy: {
          candidateId: VOXY_SIGNATURE.candidateId,
          sha256: VOXY_SIGNATURE.provenance.privateHumanReviewEvidenceSha256,
          metrics: acceptedEvidenceMetrics.voxy,
        },
        ...(!singleVoiceReview ? { editorial: {
          candidateId: EDITORIAL_VOICE.candidateId,
          sha256: EDITORIAL_VOICE.provenance.privateHumanReviewEvidenceSha256,
          metrics: acceptedEvidenceMetrics.editorial!,
        } } : {}),
      },
      segments: audioPreservationSegments,
      hardGates: {
        d1OnlyForVoxy: audioPreservationSegments.filter((entry) => entry.speakerRole === "voxy").every((entry) => entry.candidateId === "D1"),
        w1OnlyForEditorial: audioPreservationSegments.filter((entry) => entry.speakerRole === "editorial").every((entry) => entry.candidateId === "W1"),
        everySpokenSegmentUsesD1: audioPreservationSegments.every((entry) => entry.candidateId === "D1" && entry.voiceId === VOXY_SIGNATURE.voiceId),
        w1SegmentsUsed: audioPreservationSegments.some((entry) => entry.candidateId === "W1"),
        fallbackUsed: false,
        loudnessNormalizationUsed: false,
        dynamicNormalizationUsed: false,
        compressionUsed: false,
        limiterUsed: false,
        eqApplied: false,
        pitchChanged: false,
        tempoChanged: false,
        timeStretchUsed: false,
        reverbApplied: false,
        exciterApplied: false,
        clippingDetected: false,
        blanketRoleGainUsed: false,
        everyGainIsSegmentSpecific: true,
        everyOutputBelowTruePeakCeiling: audioPreservationSegments.every((entry) => Number(entry.outputPeak) <= VOXY_SIGNATURE.provenance.synthesis.mastering.staticGainPolicy.maximumOutputTruePeakDbfs),
      },
      productionEligible: false,
      autoPublish: false,
    } as const;
    if (
      !audioPreservation.hardGates.everyOutputBelowTruePeakCeiling
      || (singleVoiceReview && (!audioPreservation.hardGates.everySpokenSegmentUsesD1 || audioPreservation.hardGates.w1SegmentsUsed))
      || (!singleVoiceReview && (!audioPreservation.hardGates.d1OnlyForVoxy || !audioPreservation.hardGates.w1OnlyForEditorial))
    ) {
      throw new Error("audio_preservation_hard_gate_failed");
    }
    await writeFile(path.resolve(outputRoot, outputContract.audioPreservation), `${JSON.stringify(audioPreservation, null, 2)}\n`, "utf8");
    await writeFile(path.resolve(outputRoot, outputContract.speakerTimeline), `${JSON.stringify(plan.speakerTimeline.map(({ id: _id, ...entry }) => entry), null, 2)}\n`, "utf8");
    await writeFile(path.resolve(outputRoot, outputContract.visualStateTimeline), `${JSON.stringify(plan.visualStateTimeline, null, 2)}\n`, "utf8");
    await writeFile(path.resolve(outputRoot, outputContract.evidenceTimeline), `${JSON.stringify(plan.evidenceTimeline, null, 2)}\n`, "utf8");
    await writeFile(path.resolve(outputRoot, outputContract.captionsVtt), buildVoxyDualVoicePilotVtt(plan.speakerTimeline), "utf8");
    await writeFile(path.resolve(outputRoot, outputContract.captionsSrt), buildVoxyDualVoicePilotSrt(plan.speakerTimeline), "utf8");
    if (singleVoiceReview && "comparisonNotes" in outputContract) {
      await writeFile(path.resolve(outputRoot, outputContract.comparisonNotes), `# Human A/B Review — Dual Voice vs Single Voice\n\nA = v1.3 Dual Voice (D1 / W1)\n\nB = v1.3 Single Voice (alle gesprochenen Segmente D1)\n\n## Human-Entscheidung\n\n- technicalDualVoiceTest = passed\n- technicalSingleVoiceTest = passed\n- humanSingleVsDualPreference = single_voice\n- humanSingleVsDualPreferenceAcceptance = accepted\n- canonicalNarrationArchitecture = single_voice_default\n- canonicalVoxyVoice = D1 / accepted\n- canonicalEditorialVoice = W1 / accepted optional editorial layer\n\nBegründung: Single Voice stärkt Voxy als zentrale Persönlichkeit und wird als Default bevorzugt. A und B bleiben als technische Evidence erhalten.\n`, "utf8");
    }

    const sourcePaths = {
      canonStage: path.resolve(repositoryRoot, VOXY_POCKET_MARK_COMPOSITION_SOURCE.repositoryPath),
      studioLockup: path.resolve(repositoryRoot, VOXY_FIRST_EXPLAINER_STUDIO_LOCKUP_PATH),
      lapelPin: path.resolve(repositoryRoot, VOXY_STATIC_CANON_NATIVE_ASSETS.lapelPin),
      edebattePocketMark: path.resolve(repositoryRoot, VOXY_STATIC_CANON_NATIVE_ASSETS.edebattePocketMark),
    };
    const assets: VoxyMotionV4EmbeddedAssets = {
      canonStageDataUrl: dataUrl(await readFile(sourcePaths.canonStage), "image/png"),
      studioLockupDataUrl: dataUrl(await readFile(sourcePaths.studioLockup), "image/svg+xml"),
      lapelPinDataUrl: dataUrl(await readFile(sourcePaths.lapelPin), "image/svg+xml"),
      edebattePocketMarkDataUrl: dataUrl(await readFile(sourcePaths.edebattePocketMark), "image/svg+xml"),
    };
    const frozenInputs = [
      VOXY_POCKET_MARK_COMPOSITION_SOURCE.repositoryPath,
      VOXY_STATIC_CANON_NATIVE_ASSETS.lapelPin,
      VOXY_STATIC_CANON_NATIVE_ASSETS.edebattePocketMark,
      "apps/web/src/features/voxyVideo/mouthRig.ts",
      "apps/web/src/features/voxyVideo/mouthV41.ts",
      "apps/web/src/features/voxyVideo/headRelativeFaceRigHtml.ts",
    ];
    if (spawnSync("git", ["diff", "--quiet", plan.visualMasterHeadSha, "--", ...frozenInputs], { cwd: repositoryRoot }).status !== 0) throw new Error("visual_canon_freeze_failed");
    const levels = audioLevelsFromWav(await readFile(masterAudio), plan.output.fps);
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: plan.output.width, height: plan.output.height }, deviceScaleFactor: 1, colorScheme: "dark" });
    const page = await context.newPage();
    const externalRequests: string[] = [];
    page.on("request", (request) => { if (/^https?:/i.test(request.url())) externalRequests.push(request.url()); });
    let renderedFrames = 0;
    console.info(`pilot_progress:render_${plan.output.frameCount}_frames`);
    for (let frameIndex = 0; frameIndex < plan.output.frameCount; frameIndex += 1) {
      const output = path.resolve(framesRoot, `frame-${String(frameIndex).padStart(5, "0")}.png`);
      if (frameIndex % 2 === 1) {
        await copyFile(path.resolve(framesRoot, `frame-${String(frameIndex - 1).padStart(5, "0")}.png`), output);
        continue;
      }
      await setHtml(page, renderVoxyDualVoicePilotFrameHtml({ plan, assets, frameIndex, amplitude: levels[frameIndex] ?? 0 }));
      await page.locator(".viewport").screenshot({ path: output, type: "png" });
      renderedFrames += 1;
      if (renderedFrames % 80 === 0) console.info(`pilot_progress:rendered_unique_frames=${renderedFrames}`);
    }
    await context.close();
    await browser.close();
    if (externalRequests.length) throw new Error("external_request_detected_during_render");

    const mp4 = path.resolve(outputRoot, outputContract.mp4);
    const webm = path.resolve(outputRoot, outputContract.webm);
    console.info("pilot_progress:encode_mp4");
    run("ffmpeg", ["-y", "-framerate", "24", "-i", path.resolve(framesRoot, "frame-%05d.png"), "-i", masterAudio, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest", mp4]);
    console.info("pilot_progress:encode_webm");
    run("ffmpeg", ["-y", "-framerate", "24", "-i", path.resolve(framesRoot, "frame-%05d.png"), "-i", masterAudio, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "32", "-deadline", "good", "-cpu-used", "4", "-threads", "8", "-row-mt", "1", "-pix_fmt", "yuv420p", "-c:a", "libopus", "-b:a", "128k", "-shortest", webm]);

    const firstFocus = plan.visualStateTimeline[1]!;
    const firstExplain = plan.visualStateTimeline[2]!;
    const firstDock = plan.visualStateTimeline[3]!;
    const firstDocked = plan.visualStateTimeline[4]!;
    const secondFocus = plan.visualStateTimeline[5]!;
    const secondDock = plan.visualStateTimeline[7]!;
    const synthesis = plan.visualStateTimeline[8]!;
    const reviewFrameSpecs = [
      { id: "01-voxy-host", at: plan.speakerTimeline[0]!.start + 1 },
      { id: "02-democracy-question", at: plan.speakerTimeline[0]!.end - 0.45 },
      { id: "03-evidence-focus", at: (firstFocus.start + firstFocus.end) / 2 },
      { id: "04-editorial-explain", at: Math.max(firstExplain.start + 0.5, plan.speakerTimeline[2]!.start + 0.5) },
      { id: "05-focus-to-dock-mid-transition", at: (firstDock.start + firstDock.end) / 2 },
      { id: "06-evidence-docked", at: firstDocked.start + 0.18 },
      { id: "07-second-evidence-focus", at: (secondFocus.start + secondFocus.end) / 2 },
      { id: "08-second-evidence-docked", at: secondDock.end + 0.12 },
      { id: "09-synthesis", at: (synthesis.start + synthesis.end) / 2 },
      { id: "10-voxy-close", at: (plan.speakerTimeline.at(-1)!.start + plan.speakerTimeline.at(-1)!.end) / 2 },
    ];
    const reviewFrames = [];
    for (const spec of reviewFrameSpecs) {
      const at = Math.min(plan.output.durationMs / 1_000 - 0.05, spec.at);
      const frameIndex = Math.min(plan.output.frameCount - 1, Math.floor(at * plan.output.fps));
      const file = path.resolve(standframesRoot, `${spec.id}.png`);
      await copyFile(path.resolve(framesRoot, `frame-${String(frameIndex - (frameIndex % 2)).padStart(5, "0")}.png`), file);
      reviewFrames.push({ id: spec.id, at: Number(at.toFixed(3)), frameIndex, file: `standframes/${spec.id}.png`, sha256: await sha256(file) });
    }
    await copyFile(path.resolve(standframesRoot, "09-synthesis.png"), path.resolve(outputRoot, outputContract.preview));
    run("ffmpeg", ["-y", ...reviewFrames.flatMap((entry) => ["-i", path.resolve(outputRoot, entry.file)]), "-filter_complex", "[0:v]scale=360:203[a];[1:v]scale=360:203[b];[2:v]scale=360:203[c];[3:v]scale=360:203[d];[4:v]scale=360:203[e];[5:v]scale=360:203[f];[6:v]scale=360:203[g];[7:v]scale=360:203[h];[8:v]scale=360:203[i];[9:v]scale=360:203[j];[a][b][c][d][e]hstack=inputs=5[top];[f][g][h][i][j]hstack=inputs=5[bottom];[top][bottom]vstack=inputs=2", "-frames:v", "1", path.resolve(outputRoot, outputContract.contactSheet)]);

    const mp4Probe = ffprobe(mp4);
    const webmProbe = ffprobe(webm);
    const audioProbe = ffprobe(masterAudio);
    for (const [label, probe] of [["mp4", mp4Probe], ["webm", webmProbe]] as const) {
      const video = probe.streams.find((stream) => stream.codec_type === "video");
      const audio = probe.streams.find((stream) => stream.codec_type === "audio");
      const duration = Number(probe.format.duration);
      if (!video || !audio || Number(video.width) !== 1920 || Number(video.height) !== 1080 || video.avg_frame_rate !== "24/1" || duration < 45 || duration > 90) throw new Error(`${label}_technical_media_gate_failed`);
    }
    const files = {
      mp4: { file: outputContract.mp4, sha256: await sha256(mp4), ffprobe: privacySafeProbe(mp4Probe) },
      webm: { file: outputContract.webm, sha256: await sha256(webm), ffprobe: privacySafeProbe(webmProbe) },
      masterAudio: { file: outputContract.masterAudio, sha256: await sha256(masterAudio), ffprobe: privacySafeProbe(audioProbe) },
      preview: { file: outputContract.preview, sha256: await sha256(path.resolve(outputRoot, outputContract.preview)) },
      contactSheet: { file: outputContract.contactSheet, sha256: await sha256(path.resolve(outputRoot, outputContract.contactSheet)) },
      captionsVtt: { file: outputContract.captionsVtt, sha256: await sha256(path.resolve(outputRoot, outputContract.captionsVtt)) },
      captionsSrt: { file: outputContract.captionsSrt, sha256: await sha256(path.resolve(outputRoot, outputContract.captionsSrt)) },
      speakerTimeline: { file: outputContract.speakerTimeline, sha256: await sha256(path.resolve(outputRoot, outputContract.speakerTimeline)) },
      visualStateTimeline: { file: outputContract.visualStateTimeline, sha256: await sha256(path.resolve(outputRoot, outputContract.visualStateTimeline)) },
      evidenceTimeline: { file: outputContract.evidenceTimeline, sha256: await sha256(path.resolve(outputRoot, outputContract.evidenceTimeline)) },
      audioPreservation: { file: outputContract.audioPreservation, sha256: await sha256(path.resolve(outputRoot, outputContract.audioPreservation)) },
      ...(singleVoiceReview && "comparisonNotes" in outputContract ? {
        comparisonNotes: { file: outputContract.comparisonNotes, sha256: await sha256(path.resolve(outputRoot, outputContract.comparisonNotes)) },
      } : {}),
    };
    const manifest = {
      schemaVersion: plan.schemaVersion,
      artifactId: singleVoiceReview
        ? `voxy-democracy-pilot-v1-3-single-voice-${exactHeadSha.slice(0, 12)}`
        : `voxy-democracy-pilot-v1-3-${exactHeadSha.slice(0, 12)}`,
      exactHeadSha,
      reviewVariant: singleVoiceReview ? "single_voice_human_ab_test" : "dual_voice_canonical",
      technicalPilotGate: singleVoiceReview ? "not_applicable_review_variant" : "passed",
      technicalSingleVoiceTest: singleVoiceReview ? "passed" : "not_applicable",
      format: { width: plan.output.width, height: plan.output.height, fps: plan.output.fps, durationMs: plan.output.durationMs, frameCount: plan.output.frameCount },
      voices: singleVoiceReview ? {
        active: {
          role: "voxy",
          candidateId: VOXY_SIGNATURE.candidateId,
          voiceId: VOXY_SIGNATURE.voiceId,
          selectedVariantId: VOXY_SIGNATURE.selectedVariantId,
          humanIdentityStatus: VOXY_SIGNATURE.humanIdentityStatus,
          privateHumanReviewEvidenceSha256: VOXY_SIGNATURE.provenance.privateHumanReviewEvidenceSha256,
          reference: VOXY_SIGNATURE.provenance.canonicalReference,
          synthesis: VOXY_SIGNATURE.provenance.synthesis,
          acceptedPrivateReferenceSelectionVerified: true,
          canonicalPipelineMatch: true,
          localOfflineSynthesis: true,
          usedForEverySpokenSegment: true,
        },
        canonicalEditorialUnchanged: {
          candidateId: EDITORIAL_VOICE.candidateId,
          voiceId: EDITORIAL_VOICE.voiceId,
          humanIdentityStatus: EDITORIAL_VOICE.humanIdentityStatus,
          usedInVariant: false,
        },
      } : {
        voxy: {
          role: "voxy",
          candidateId: VOXY_SIGNATURE.candidateId,
          voiceId: VOXY_SIGNATURE.voiceId,
          selectedVariantId: VOXY_SIGNATURE.selectedVariantId,
          humanIdentityStatus: VOXY_SIGNATURE.humanIdentityStatus,
          privateHumanReviewEvidenceSha256: VOXY_SIGNATURE.provenance.privateHumanReviewEvidenceSha256,
          reference: VOXY_SIGNATURE.provenance.canonicalReference,
          synthesis: VOXY_SIGNATURE.provenance.synthesis,
          acceptedPrivateReferenceSelectionVerified: true,
          canonicalPipelineMatch: true,
          localOfflineSynthesis: true,
        },
        editorial: {
          role: "editorial",
          candidateId: EDITORIAL_VOICE.candidateId,
          voiceId: EDITORIAL_VOICE.voiceId,
          selectedVariantId: "w1-natural-editorial",
          humanIdentityStatus: EDITORIAL_VOICE.humanIdentityStatus,
          privateHumanReviewEvidenceSha256: EDITORIAL_VOICE.provenance.privateHumanReviewEvidenceSha256,
          synthesis: EDITORIAL_VOICE.provenance.synthesis,
          modelFiles: EDITORIAL_VOICE.provenance.modelFiles,
          canonicalPipelineMatch: true,
          localOfflineSynthesis: true,
        },
      },
      audioAssembly: {
        ...audioAssembly,
        acceptedVoxyReferenceSelectionManifestSha256: acceptedVoxyReference.selectionManifestSha256,
        d1ActuallyInEveryVoxyMasterWindow: audioAssembly.segments.filter((segment) => segment.speakerRole === "voxy").every((segment) => segment.candidateId === "D1" && segment.pcmIdentityMatch),
        d1ActuallyInEveryMasterWindow: singleVoiceReview ? audioAssembly.segments.every((segment) => segment.candidateId === "D1" && segment.pcmIdentityMatch) : false,
        w1ActuallyInEveryEditorialMasterWindow: singleVoiceReview ? false : audioAssembly.segments.filter((segment) => segment.speakerRole === "editorial").every((segment) => segment.candidateId === "W1" && segment.pcmIdentityMatch),
        w1Used: !singleVoiceReview,
        roleVoiceCrossing: false,
        fallbackUsed: false,
        timeCompressionUsed: false,
        dynamicNormalizationUsed: false,
        eqApplied: false,
        pitchChanged: false,
        tempoChanged: false,
        peakProtectionApplied: false,
        blanketRoleGainUsed: false,
        perSegmentStaticGainAudit: outputContract.audioPreservation,
        canonicalPipelinesVerified: true,
      },
      audioPreservation,
      speakerTimeline: plan.speakerTimeline,
      visualStateTimeline: plan.visualStateTimeline,
      evidenceTimeline: plan.evidenceTimeline,
      evidence: plan.evidence,
      captions: plan.captions,
      burnedInLowerText: false,
      objectContinuity: plan.objectContinuity,
      mouth: { ...plan.mouth, editorialFramesUseClosedMouth: !singleVoiceReview, voxyOnlyLipSync: true, activeForEverySpokenSegment: singleVoiceReview },
      waveform: plan.waveform,
      visualCanon: { frozen: true, visualMasterHeadSha: plan.visualMasterHeadSha, sourceAssets: Object.fromEntries(await Promise.all(Object.entries(sourcePaths).map(async ([id, file]) => [id, { repositoryPath: path.relative(repositoryRoot, file), sha256: await sha256(file) }]))), characterRedesign: false, studioRedesign: false },
      rendering: { renderedFrames, duplicatedAdjacentFrames: plan.output.frameCount - renderedFrames, runtimeNetworkRequests: 0, externalVisualUploadUsed: false },
      privacy: { ...plan.privacy, artifactStoredOutsideGitWorktreeViaIgnoredLocalSymlink: true, privateRawReferencesInRepository: false, privateReferencePathsRecorded: false },
      files,
      reviewFrames,
      humanPilotAcceptance: "pending",
      humanVoiceAcceptance: "accepted",
      humanVoxyVoiceAcceptance: "accepted",
      humanEditorialVoiceAcceptance: "accepted",
      canonicalVoxyVoice: "D1 Conversational Dynamic",
      canonicalEditorialVoice: "W1 Natural Editorial",
      humanNews5VisualAcceptance: "pending",
      canonicalNarrationArchitecture: "single_voice_default",
      humanNarrationArchitectureAcceptance: "accepted",
      humanSingleVsDualPreference: "single_voice",
      humanSingleVsDualPreferenceAcceptance: "accepted",
      optionalEditorialLayer: "W1 Natural Editorial / accepted / explicit editorialIntent required",
      productionEligible: false,
      autoPublish: false,
      knownDeviations: [
        "private_human_review_required_for_final_pilot_and_news_5_visual_acceptance",
        "voxy_mouth_sync_uses_smoothed_audio_amplitude_not_phoneme_alignment",
        "twelve_unique_visual_updates_per_second_are_frame_doubled_to_twenty_four_fps",
        "demo_illustration_objects_show_format_behavior_and_are_not_real_sources_or_statistics",
      ],
    };
    await writeFile(path.resolve(outputRoot, outputContract.manifest), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    console.info(JSON.stringify({ status: singleVoiceReview ? "SINGLE_VOICE_HUMAN_AB_TEST_TECHNICAL_PASS" : "PILOT_V1_3_TECHNICAL_PASS", exactHeadSha, artifactId: manifest.artifactId, output: outputArgument, durationMs: plan.output.durationMs, fps: 24, resolution: "1920x1080", activeVoice: singleVoiceReview ? "D1 only" : "D1 / W1", canonicalNarrationArchitecture: "single_voice_default", canonicalVoxyVoice: "D1 Conversational Dynamic", canonicalEditorialVoice: "W1 Natural Editorial", voiceMappingGate: "passed", audioPreservationGate: "passed", burnedInLowerText: false, humanNarrationArchitectureAcceptance: "accepted", humanVoiceAcceptance: "accepted", humanPilotAcceptance: "pending", humanNews5VisualAcceptance: "pending", humanSingleVsDualPreference: "single_voice", humanSingleVsDualPreferenceAcceptance: "accepted", productionEligible: false, autoPublish: false }, null, 2));
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack : String(error));
    process.exitCode = 1;
  });
}
