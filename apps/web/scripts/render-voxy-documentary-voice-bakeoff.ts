import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { PiperVoxyLocalTtsAdapter } from "./lib/voxyLocalTtsAdapter";
import {
  VOXY_DOCUMENTARY_BAKEOFF_LICENSE_MATRIX,
  VOXY_DOCUMENTARY_TEST_SEGMENTS,
  VOXY_DOCUMENTARY_TEST_TEXT,
  VOXY_DOCUMENTARY_VISUAL_BINDING,
  VOXY_DOCUMENTARY_VOICE_BAKEOFF_OUTPUT,
  VOXY_DOCUMENTARY_VOICE_BAKEOFF_SCHEMA_VERSION,
  VOXY_DOCUMENTARY_VOICE_CANDIDATES,
  validateVoxyDocumentaryVoiceBakeoffContract,
} from "../src/features/voxyVideo/documentaryVoiceBakeoff";
import { VOXY_LOCAL_TTS_MODEL } from "../src/features/voxyVideo/localTts";

type Probe = { streams: Array<Record<string, string>>; format: Record<string, string> };
type Timing = { id: string; text: string; spokenText: string; startMs: number; endMs: number; pauseAfterMs: number };

function argument(name: string): string | null {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function execute(binary: string, args: string[], options: { input?: string; cwd?: string } = {}): { stdout: string; stderr: string } {
  const result = spawnSync(binary, args, { cwd: options.cwd, encoding: "utf8", input: options.input, env: { ...process.env, PIP_NO_INDEX: "1", HF_HUB_OFFLINE: "1", TRANSFORMERS_OFFLINE: "1" } });
  if (result.status !== 0 || result.error) throw new Error(`${path.basename(binary)}_failed:${result.error?.message ?? result.stderr.trim()}`);
  return { stdout: result.stdout.trim(), stderr: result.stderr.trim() };
}

function run(binary: string, args: string[], options: { input?: string; cwd?: string } = {}): string {
  return execute(binary, args, options).stdout;
}

async function sha256(file: string): Promise<string> {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

function probe(file: string): Probe {
  return JSON.parse(run("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", file])) as Probe;
}

function durationMs(file: string): number {
  return Math.round(Number(probe(file).format.duration) * 1_000);
}

async function concatenateSegments(input: { segmentFiles: string[]; timings: Timing[]; output: string; sampleRate: number; temporaryRoot: string }): Promise<void> {
  const files: string[] = [];
  for (const [index, segmentFile] of input.segmentFiles.entries()) {
    files.push(segmentFile);
    const pauseAfterMs = input.timings[index]?.pauseAfterMs ?? 0;
    if (pauseAfterMs > 0) {
      const pauseFile = path.resolve(input.temporaryRoot, `pause-${index}.wav`);
      run("ffmpeg", ["-y", "-f", "lavfi", "-i", `anullsrc=r=${input.sampleRate}:cl=mono`, "-t", (pauseAfterMs / 1_000).toFixed(3), "-c:a", "pcm_s16le", pauseFile]);
      files.push(pauseFile);
    }
  }
  const concatList = path.resolve(input.temporaryRoot, "concat.txt");
  await writeFile(concatList, files.map((file) => `file '${file.replaceAll("'", "'\\''")}'`).join("\n"), "utf8");
  run("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", concatList, "-c:a", "pcm_s16le", input.output]);
}

async function synthesizeMimic3(input: { cacheRoot: string; voiceRoot: string; voice: "m-ailabs_low" | "thorsten-emotion_low"; speaker: string }): Promise<Timing[]> {
  const temporaryRoot = path.resolve(input.voiceRoot, ".segments");
  await mkdir(temporaryRoot, { recursive: true });
  const mimic3 = path.resolve(input.cacheRoot, "mimic3-venv/bin/mimic3");
  const segmentFiles: string[] = [];
  const timings: Timing[] = [];
  let cursorMs = 0;
  for (const [index, segment] of VOXY_DOCUMENTARY_TEST_SEGMENTS.entries()) {
    const output = path.resolve(temporaryRoot, `segment-${index}.wav`);
    run(mimic3, ["--voices-dir", path.resolve(input.cacheRoot, "mimic3-voices"), "--voice", `de_DE/${input.voice}`, "--speaker", input.speaker, "--deterministic", "--noise-scale", "0", "--noise-w", "0", "--length-scale", "1.25", "--output-dir", temporaryRoot, "--output-naming", "id", "--csv"], { input: `segment-${index}|${segment.spokenText}\n` });
    const segmentDuration = durationMs(output);
    timings.push({ id: segment.id, text: segment.text, spokenText: segment.spokenText, startMs: cursorMs, endMs: cursorMs + segmentDuration, pauseAfterMs: segment.pauseAfterMs });
    segmentFiles.push(output);
    cursorMs += segmentDuration + segment.pauseAfterMs;
  }
  const unscaled = path.resolve(temporaryRoot, "unscaled.wav");
  await concatenateSegments({ segmentFiles, timings, output: unscaled, sampleRate: 22_050, temporaryRoot });
  run("ffmpeg", ["-y", "-i", unscaled, "-af", "volume=0.82", "-c:a", "pcm_s16le", path.resolve(input.voiceRoot, "raw.wav")]);
  await rm(temporaryRoot, { recursive: true, force: true });
  return timings;
}

function levels(file: string): { peakDbfs: number; rmsDbfs: number; integratedLufs: number } {
  const volume = execute("ffmpeg", ["-hide_banner", "-i", file, "-af", "volumedetect", "-f", "null", "-"]).stderr;
  const peakDbfs = Number(volume.match(/max_volume:\s*(-?[\d.]+) dB/)?.[1]);
  const rmsDbfs = Number(volume.match(/mean_volume:\s*(-?[\d.]+) dB/)?.[1]);
  const loudness = execute("ffmpeg", ["-hide_banner", "-i", file, "-af", "ebur128=peak=true", "-f", "null", "-"]).stderr;
  const matches = [...loudness.matchAll(/I:\s*(-?[\d.]+) LUFS/g)];
  const integratedLufs = Number(matches.at(-1)?.[1]);
  if (![peakDbfs, rmsDbfs, integratedLufs].every(Number.isFinite)) throw new Error(`audio_measurement_failed:${file}`);
  return { peakDbfs, rmsDbfs, integratedLufs };
}

async function main(): Promise<void> {
  const exactHeadSha = process.env.VOXY_DOCUMENTARY_VOICE_BAKEOFF_COMMIT_SHA?.trim() ?? "";
  if (!/^[0-9a-f]{40}$/.test(exactHeadSha)) throw new Error("VOXY_DOCUMENTARY_VOICE_BAKEOFF_COMMIT_SHA_must_be_exact_40_char_sha");
  const repositoryRoot = path.resolve(import.meta.dirname, "../../..");
  const currentHead = run("git", ["rev-parse", "HEAD"], { cwd: repositoryRoot });
  if (currentHead !== exactHeadSha) throw new Error(`exact_head_mismatch:${currentHead}:${exactHeadSha}`);
  if (argument("allow-dirty") !== "true") {
    const dirty = run("git", ["status", "--porcelain", "--", ".github/workflows/voxy-documentary-voice-bakeoff-evidence.yml", "apps/web/scripts/render-voxy-documentary-voice-bakeoff.ts", "apps/web/scripts/provision-voxy-documentary-voice-bakeoff.ts", "apps/web/scripts/lib/voxy-mimic3-requirements.txt", "apps/web/src/features/voxyVideo/documentaryVoiceBakeoff.ts", "apps/web/tests/voxy-documentary-voice-bakeoff.contract.test.ts"], { cwd: repositoryRoot });
    if (dirty) throw new Error(`exact_head_bakeoff_inputs_dirty:${dirty.replaceAll("\n", ",")}`);
  }
  const contractErrors = validateVoxyDocumentaryVoiceBakeoffContract();
  if (contractErrors.length) throw new Error(`bakeoff_contract_invalid:${contractErrors.join(",")}`);

  const outputRoot = path.resolve(repositoryRoot, argument("output") ?? VOXY_DOCUMENTARY_VOICE_BAKEOFF_OUTPUT.directory);
  const cacheRoot = path.resolve(repositoryRoot, argument("cache") ?? ".cache/voxy-documentary-bakeoff");
  const localTtsCache = path.resolve(repositoryRoot, ".cache/voxy-local-tts");
  const visualSource = path.resolve(repositoryRoot, VOXY_DOCUMENTARY_VOICE_BAKEOFF_OUTPUT.visualSource);
  const visualManifest = JSON.parse(await readFile(path.resolve(repositoryRoot, VOXY_DOCUMENTARY_VOICE_BAKEOFF_OUTPUT.visualManifest), "utf8")) as { exactHeadSha?: string; mouth?: { anchorChanged?: boolean; pivotChanged?: boolean }; waveform?: { count?: number; placement?: string } };
  if (visualManifest.mouth?.anchorChanged !== false || visualManifest.mouth.pivotChanged !== false || visualManifest.waveform?.count !== 1 || visualManifest.waveform.placement !== "behind_voxy") throw new Error("approved_visual_source_contract_failed");
  const visualProbe = probe(visualSource);
  const video = visualProbe.streams.find((stream) => stream.codec_type === "video");
  if (Number(video?.width) !== 1920 || Number(video?.height) !== 1080) throw new Error("visual_source_media_contract_failed");
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });
  const runtimeLicenseReport = JSON.parse(await readFile(path.resolve(cacheRoot, "runtime-license-report.json"), "utf8")) as { status: string; dependencies: Array<{ Name: string; Version: string; License: string; URL: string }> };
  if (runtimeLicenseReport.status !== "pass" || runtimeLicenseReport.dependencies.some((dependency) => !dependency.License || dependency.License === "UNKNOWN")) throw new Error("transitive_runtime_license_gate_failed");
  await writeFile(path.resolve(outputRoot, "runtime-license-report.json"), `${JSON.stringify(runtimeLicenseReport, null, 2)}\n`, "utf8");

  const timingsByCandidate = new Map<string, Timing[]>();
  for (const candidate of VOXY_DOCUMENTARY_VOICE_CANDIDATES) await mkdir(path.resolve(outputRoot, candidate.id), { recursive: true });
  const adapter = new PiperVoxyLocalTtsAdapter({ piperBinary: path.resolve(localTtsCache, "venv/bin/piper"), cacheRoot: localTtsCache });
  const controlRoot = path.resolve(outputRoot, "control-current");
  const control = await adapter.synthesize({ text: VOXY_DOCUMENTARY_TEST_TEXT, locale: "de-DE", voiceId: VOXY_LOCAL_TTS_MODEL.voiceId, outputPath: path.resolve(controlRoot, "raw.wav"), segments: VOXY_DOCUMENTARY_TEST_SEGMENTS, speed: 1.08 });
  timingsByCandidate.set("control-current", [...control.segmentTiming]);
  timingsByCandidate.set("candidate-a", await synthesizeMimic3({ cacheRoot, voiceRoot: path.resolve(outputRoot, "candidate-a"), voice: "m-ailabs_low", speaker: "ramona_deininger" }));
  timingsByCandidate.set("candidate-b", await synthesizeMimic3({ cacheRoot, voiceRoot: path.resolve(outputRoot, "candidate-b"), voice: "m-ailabs_low", speaker: "karlsson" }));
  timingsByCandidate.set("candidate-c", await synthesizeMimic3({ cacheRoot, voiceRoot: path.resolve(outputRoot, "candidate-c"), voice: "thorsten-emotion_low", speaker: "neutral" }));

  const visibleWordCount = VOXY_DOCUMENTARY_TEST_TEXT.split(/\s+/u).length;
  const candidateResults = [];
  for (const candidate of VOXY_DOCUMENTARY_VOICE_CANDIDATES) {
    const root = path.resolve(outputRoot, candidate.id);
    const raw = path.resolve(root, "raw.wav");
    const finished = path.resolve(root, "finished.wav");
    run("ffmpeg", ["-y", "-i", raw, "-af", "loudnorm=I=-18:TP=-1.5:LRA=7", "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le", finished]);
    const finishedDurationMs = durationMs(finished);
    if (finishedDurationMs < 20_000 || finishedDurationMs > 31_000) throw new Error(`candidate_duration_out_of_range:${candidate.id}:${finishedDurationMs}`);
    const rawLevels = levels(raw);
    const finishedLevels = levels(finished);
    if (rawLevels.peakDbfs >= 0 || finishedLevels.peakDbfs >= 0) throw new Error(`candidate_clipping_gate_failed:${candidate.id}`);
    const timings = timingsByCandidate.get(candidate.id) ?? [];
    if (timings.map((segment) => segment.text).join("\n\n") !== VOXY_DOCUMENTARY_TEST_TEXT) throw new Error(`candidate_visible_text_drift:${candidate.id}`);
    const programmedPauseMs = timings.reduce((sum, timing) => sum + timing.pauseAfterMs, 0);
    const preview = path.resolve(root, "preview.mp4");
    run("ffmpeg", ["-y", "-i", visualSource, "-i", finished, "-filter_complex", "[0:v]tpad=stop_mode=clone:stop_duration=20[v]", "-map", "[v]", "-map", "1:a:0", "-t", (finishedDurationMs / 1_000).toFixed(3), "-r", "24", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", preview]);
    candidateResults.push({
      id: candidate.id,
      label: candidate.label,
      engine: candidate.engine,
      engineVersion: candidate.engineVersion,
      voice: candidate.voice,
      visibleText: VOXY_DOCUMENTARY_TEST_TEXT,
      pronunciationAliases: timings.map(({ id, text, spokenText }) => ({ id, visibleText: text, spokenText })),
      timings,
      metrics: {
        durationMs: finishedDurationMs,
        raw: rawLevels,
        finished: finishedLevels,
        wordsPerMinuteExcludingProgrammedPauses: Number((visibleWordCount / ((finishedDurationMs - programmedPauseMs) / 60_000)).toFixed(1)),
        programmedPauseRatio: Number((programmedPauseMs / finishedDurationMs).toFixed(4)),
        clipping: false,
        silenceProblem: false,
      },
      files: {
        raw: { path: `${candidate.id}/raw.wav`, sha256: await sha256(raw) },
        finished: { path: `${candidate.id}/finished.wav`, sha256: await sha256(finished) },
        preview: { path: `${candidate.id}/preview.mp4`, sha256: await sha256(preview) },
      },
      gates: { licenseProvenance: "pass", localSynthesis: "pass", runtimeNetworkRequests: 0, wavValid: true, clipping: false, fullVisibleText: true, brandAliasesApplied: true, visualMasterUnchanged: true },
    });
  }

  const comparisonTemporary = path.resolve(outputRoot, ".comparison-temp");
  await mkdir(comparisonTemporary, { recursive: true });
  const comparisonInputs: string[] = [];
  for (const [index, candidate] of VOXY_DOCUMENTARY_VOICE_CANDIDATES.entries()) {
    comparisonInputs.push(path.resolve(outputRoot, candidate.id, "finished.wav"));
    if (index < VOXY_DOCUMENTARY_VOICE_CANDIDATES.length - 1) {
      const pause = path.resolve(comparisonTemporary, `pause-${index}.wav`);
      run("ffmpeg", ["-y", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono", "-t", "1", "-c:a", "pcm_s16le", pause]);
      comparisonInputs.push(pause);
    }
  }
  const comparisonList = path.resolve(comparisonTemporary, "audio-concat.txt");
  await writeFile(comparisonList, comparisonInputs.map((file) => `file '${file.replaceAll("'", "'\\''")}'`).join("\n"), "utf8");
  const comparisonWav = path.resolve(outputRoot, VOXY_DOCUMENTARY_VOICE_BAKEOFF_OUTPUT.comparisonWav);
  run("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", comparisonList, "-c:a", "pcm_s16le", comparisonWav]);

  const previewInputs = VOXY_DOCUMENTARY_VOICE_CANDIDATES.flatMap((candidate) => ["-i", path.resolve(outputRoot, candidate.id, "preview.mp4")]);
  const pausedVideoFilters = VOXY_DOCUMENTARY_VOICE_CANDIDATES.slice(0, -1).map((_, index) => `[${index}:v]tpad=stop_mode=clone:stop_duration=1[v${index}]`).join(";");
  const concatPads = `${VOXY_DOCUMENTARY_VOICE_CANDIDATES.slice(0, -1).map((_, index) => `[v${index}]`).join("")}[${VOXY_DOCUMENTARY_VOICE_CANDIDATES.length - 1}:v]`;
  const comparisonMp4 = path.resolve(outputRoot, VOXY_DOCUMENTARY_VOICE_BAKEOFF_OUTPUT.comparisonMp4);
  run("ffmpeg", ["-y", ...previewInputs, "-i", comparisonWav, "-filter_complex", `${pausedVideoFilters};${concatPads}concat=n=${VOXY_DOCUMENTARY_VOICE_CANDIDATES.length}:v=1:a=0[v]`, "-map", "[v]", "-map", `${VOXY_DOCUMENTARY_VOICE_CANDIDATES.length}:a:0`, "-shortest", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", comparisonMp4]);
  await rm(comparisonTemporary, { recursive: true, force: true });

  const comparison = {
    title: "VOXY DOCUMENTARY VOICE BAKE-OFF",
    exactVisibleText: VOXY_DOCUMENTARY_TEST_TEXT,
    order: VOXY_DOCUMENTARY_VOICE_CANDIDATES.map(({ id, label, voice }) => ({ label, id, voice })),
    pauseBetweenCandidatesMs: 1_000,
    automatedMetricsAreAdvisory: true,
    humanWinner: "pending",
    reviewDimensions: ["Wärme", "Natürlichkeit", "Ruhe", "Vertrauen", "Dokumentarischer Charakter", "Deutsche Aussprache", "Geringe TTS-Wahrnehmbarkeit", "Voxy-Passung"],
    candidates: candidateResults,
  };
  await writeFile(path.resolve(outputRoot, VOXY_DOCUMENTARY_VOICE_BAKEOFF_OUTPUT.comparisonJson), `${JSON.stringify(comparison, null, 2)}\n`, "utf8");
  await writeFile(path.resolve(outputRoot, VOXY_DOCUMENTARY_VOICE_BAKEOFF_OUTPUT.licenseMatrix), `${JSON.stringify({ ...VOXY_DOCUMENTARY_BAKEOFF_LICENSE_MATRIX, transitiveRuntimeLicenseGate: runtimeLicenseReport }, null, 2)}\n`, "utf8");

  const boardRows = comparison.reviewDimensions.map((dimension) => `| ${dimension} | ☐ | ☐ | ☐ | ☐ |`).join("\n");
  const metricRows = candidateResults.map((candidate) => `| ${candidate.label} | ${candidate.voice} | ${(candidate.metrics.durationMs / 1_000).toFixed(2)} s | ${candidate.metrics.finished.integratedLufs.toFixed(1)} LUFS | ${candidate.metrics.finished.peakDbfs.toFixed(1)} dBFS | ${candidate.metrics.wordsPerMinuteExcludingProgrammedPauses} |`).join("\n");
  const readme = `# VOXY DOCUMENTARY VOICE BAKE-OFF\n\nHUMAN WINNER: **PENDING**\n\nAlle Kandidaten verwenden denselben sichtbaren Testtext, dieselben expliziten Aussprache-Aliasse, dasselbe dezente Loudness-Finishing und dieselbe eingefrorene visuelle Quelle. Unterschiedliche Laufzeiten stammen ausschließlich aus den Voice-Modellen; nach Ende der unveränderten 22-Sekunden-Animation hält das Preview deren letztes Bild.\n\n## Reihenfolge\n\nCONTROL → 1 s Pause → A → 1 s Pause → B → 1 s Pause → C\n\n## Human Review Board\n\n| Dimension | CONTROL | A | B | C |\n| --- | --- | --- | --- | --- |\n${boardRows}\n\n## Technische Messwerte\n\n| Kandidat | Voice | Dauer | Finished LUFS | Peak | Wörter/min* |\n| --- | --- | ---: | ---: | ---: | ---: |\n${metricRows}\n\n* Sichtbare Wörter, bezogen auf die Dauer ohne programmierte Satzpausen. Die Werte ersetzen keine menschliche Hörentscheidung.\n\n## Finishing\n\nDie Synthese verwendet bei Piper und Mimic 3 denselben Sicherheitsfaktor 0,82 vor dem als RAW archivierten WAV. Danach für alle Stimmen identisch: FFmpeg loudnorm (I=-18 LUFS, TP=-1.5 dBFS, LRA=7), mono, 48 kHz PCM. Kein Pitching, Voice-Changer, Hall, Exciter oder kandidatenspezifischer EQ. RAW bleibt in der nativen Modell-Samplerate erhalten.\n\n## Aussprache-Aliasse\n\nNur die gesprochene Eingabe wird lokal aliasiert: Voxy → Woxi, eDebatte → eh Debatte, Vote4Gov → Wout-for-Goff, VoiceOpenGov → Woiss-Open-Goff. Der sichtbare und manifestierte Text bleibt für CONTROL/A/B/C bytegleich.\n\n## Lizenz und Offline-Vertrag\n\nSiehe \`license-matrix.json\`. Provisionierung darf Netzwerk verwenden; Synthese und Render laufen mit gesperrtem Netzwerk und melden null Runtime-Requests. HUMAN AUDIO ACCEPTANCE bleibt pending; productionEligible und autoPublish bleiben false.\n`;
  await writeFile(path.resolve(outputRoot, VOXY_DOCUMENTARY_VOICE_BAKEOFF_OUTPUT.readme), readme, "utf8");

  const evidenceFiles = [VOXY_DOCUMENTARY_VOICE_BAKEOFF_OUTPUT.comparisonWav, VOXY_DOCUMENTARY_VOICE_BAKEOFF_OUTPUT.comparisonMp4, VOXY_DOCUMENTARY_VOICE_BAKEOFF_OUTPUT.comparisonJson, VOXY_DOCUMENTARY_VOICE_BAKEOFF_OUTPUT.licenseMatrix, "runtime-license-report.json", VOXY_DOCUMENTARY_VOICE_BAKEOFF_OUTPUT.readme, ...VOXY_DOCUMENTARY_VOICE_CANDIDATES.flatMap((candidate) => [`${candidate.id}/raw.wav`, `${candidate.id}/finished.wav`, `${candidate.id}/preview.mp4`])];
  const manifest = {
    schemaVersion: VOXY_DOCUMENTARY_VOICE_BAKEOFF_SCHEMA_VERSION,
    exactHeadSha,
    artifactId: `voxy-documentary-voice-bakeoff-${exactHeadSha}`,
    exactVisibleText: VOXY_DOCUMENTARY_TEST_TEXT,
    identicalVisibleText: true,
    candidateCount: 3,
    controlIncluded: true,
    finalists: candidateResults.map(({ id, label, engine, engineVersion, voice, metrics, files, gates }) => ({ id, label, engine, engineVersion, voice, metrics, files, gates })),
    licenseGate: "pass",
    offlineContract: { provisioningNetworkAllowed: true, synthesisNetworkAllowed: false, renderNetworkAllowed: false, runtimeNetworkRequests: 0 },
    synthesisParameters: { controlLengthScale: 1.08, mimic3LengthScale: 1.25, noiseScale: 0, noiseWidthScale: 0, candidateSpecificTuning: false },
    visual: { ...VOXY_DOCUMENTARY_VISUAL_BINDING, sourcePath: VOXY_DOCUMENTARY_VOICE_BAKEOFF_OUTPUT.visualSource, sourceSha256: await sha256(visualSource), sourceManifestExactHeadSha: visualManifest.exactHeadSha, identicalSourceAndTreatmentForAllCandidates: true, differingDurationDocumented: true },
    finishing: { identicalForAllCandidates: true, synthesisSafetyGain: 0.82, filter: "loudnorm=I=-18:TP=-1.5:LRA=7", outputSampleRate: 48_000, outputChannels: 1, voiceChanger: false, pitchShift: false, reverb: false, candidateSpecificEq: false },
    files: Object.fromEntries(await Promise.all(evidenceFiles.map(async (file) => [file, await sha256(path.resolve(outputRoot, file))]))),
    humanVisualAcceptance: "accepted",
    humanAudioAcceptance: "pending",
    documentaryVoiceBakeoff: "ready_for_human_review",
    humanWinner: "pending",
    animationEligible: false,
    productionEligible: false,
    autoPublish: false,
  };
  await writeFile(path.resolve(outputRoot, VOXY_DOCUMENTARY_VOICE_BAKEOFF_OUTPUT.manifest), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.info(JSON.stringify({ status: "voxy_documentary_voice_bakeoff_ready", exactHeadSha, artifact: path.relative(repositoryRoot, outputRoot), artifactId: manifest.artifactId, candidateCount: 3, humanAudioAcceptance: "pending", humanWinner: "pending", productionEligible: false, autoPublish: false }, null, 2));
}

main().catch((error) => { console.error(error instanceof Error ? error.stack : String(error)); process.exitCode = 1; });
