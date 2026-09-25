import { chromium } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { VOXY_LOCAL_TTS_ENGINE, VOXY_LOCAL_TTS_LICENSE_MATRIX, VOXY_LOCAL_TTS_MODEL, VOXY_LOCAL_TTS_OUTPUT, VOXY_LOCAL_TTS_RUNTIME_DEPENDENCIES, VOXY_LOCAL_TTS_SCRIPT, VOXY_LOCAL_TTS_SCRIPT_SEGMENTS, VOXY_LOCAL_TTS_VISUAL_MASTER_HEAD, validateVoxyLocalTtsLicenseGate } from "../src/features/voxyVideo/localTts";
import { PiperVoxyLocalTtsAdapter } from "./lib/voxyLocalTtsAdapter";

function argument(name: string): string | null { const prefix = `--${name}=`; return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? null; }
function capture(binary: string, args: string[]): { stdout: string; stderr: string } {
  const result = spawnSync(binary, args, { encoding: "utf8", env: { ...process.env, PIP_NO_INDEX: "1", HF_HUB_OFFLINE: "1" } });
  if (result.status !== 0 || result.error) throw new Error(`${path.basename(binary)}_failed:${result.error?.message ?? result.stderr.trim()}`);
  return { stdout: result.stdout.trim(), stderr: result.stderr.trim() };
}
function run(binary: string, args: string[], cwd?: string): string {
  if (!cwd) return capture(binary, args).stdout;
  const result = spawnSync(binary, args, { cwd, encoding: "utf8", env: { ...process.env, PIP_NO_INDEX: "1", HF_HUB_OFFLINE: "1" } });
  if (result.status !== 0 || result.error) throw new Error(`${path.basename(binary)}_failed:${result.error?.message ?? result.stderr.trim()}`);
  return result.stdout.trim();
}
async function sha256(file: string): Promise<string> { return createHash("sha256").update(await readFile(file)).digest("hex"); }
function ffprobe(file: string): { streams: Array<Record<string, string>>; format: Record<string, string> } { return JSON.parse(run("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", file])); }
function peakDb(file: string): number {
  const output = capture("ffmpeg", ["-i", file, "-af", "volumedetect", "-f", "null", "-"]).stderr;
  const value = output.match(/max_volume:\s*(-?[\d.]+) dB/)?.[1];
  if (!value) throw new Error("audio_peak_unavailable");
  return Number(value);
}
function wavEnvelope(buffer: Buffer): number[] {
  const dataMarker = buffer.indexOf(Buffer.from("data"));
  if (dataMarker < 0) throw new Error("wav_pcm_data_missing");
  const dataStart = dataMarker + 8;
  const sampleCount = Math.floor((buffer.length - dataStart) / 2);
  const bucketCount = 480;
  const values: number[] = [];
  for (let bucket = 0; bucket < bucketCount; bucket += 1) {
    const start = Math.floor((bucket * sampleCount) / bucketCount);
    const end = Math.max(start + 1, Math.floor(((bucket + 1) * sampleCount) / bucketCount));
    let sum = 0;
    for (let index = start; index < end; index += 1) { const sample = buffer.readInt16LE(dataStart + index * 2) / 32768; sum += sample * sample; }
    values.push(Math.sqrt(sum / (end - start)));
  }
  const max = Math.max(...values, 0.0001);
  return values.map((value) => Math.min(1, value / max));
}
function notices(): string {
  return `# Third-party notices — Voxy local TTS proof\n\nThis proof provisions, but does not commit, the following third-party software and model files. Retain this notice with any distributed runtime bundle. This inventory is an engineering license gate, not legal advice.\n\n## OHF Piper 1.6.0\n\n- Source: https://github.com/OHF-Voice/piper1-gpl\n- License: GNU GPL v3 or later\n- Integration: separate local CLI subprocess; no network during synthesis.\n- Embedded phonemizer: eSpeak NG, GNU GPL v3 or later.\n- Source and corresponding-license obligations must be fulfilled for any distributed binary bundle.\n\n## German Piper voice: de_DE-mls-medium, speaker 20\n\n- Model repository: https://huggingface.co/rhasspy/piper-voices\n- Pinned revision: ${VOXY_LOCAL_TTS_MODEL.repositoryRevision}\n- Repository/model distribution metadata: MIT\n- Model SHA-256: ${VOXY_LOCAL_TTS_MODEL.modelSha256}\n- Training: from scratch, according to the concrete model card.\n\n## Dataset attribution\n\nThe model card identifies Multilingual LibriSpeech German (OpenSLR SLR94), licensed CC BY 4.0. Dataset authors: Vineel Pratap, Qiantong Xu, Anuroop Sriram, Gabriel Synnaeve, and Ronan Collobert, “MLS: A Large-Scale Multilingual Dataset for Speech Research” (2020). Source: https://www.openslr.org/94/\n\n## Runtime dependencies\n\n${VOXY_LOCAL_TTS_RUNTIME_DEPENDENCIES.map((entry) => `- ${entry.name} ${entry.version}: ${entry.license}`).join("\n")}\n`;
}

async function main(): Promise<void> {
  const repositoryRoot = path.resolve(import.meta.dirname, "../../..");
  const exactHeadSha = process.env.VOXY_LOCAL_TTS_COMMIT_SHA?.trim() ?? "";
  if (!/^[0-9a-f]{40}$/.test(exactHeadSha)) throw new Error("VOXY_LOCAL_TTS_COMMIT_SHA_must_be_exact_40_char_sha");
  const currentHead = run("git", ["rev-parse", "HEAD"], repositoryRoot);
  if (currentHead !== exactHeadSha) throw new Error(`exact_head_mismatch:${currentHead}:${exactHeadSha}`);
  const gateErrors = validateVoxyLocalTtsLicenseGate();
  if (gateErrors.length) throw new Error(`tts_license_gate_failed:${gateErrors.join(",")}`);
  const cacheRoot = path.resolve(repositoryRoot, argument("cache") ?? ".cache/voxy-local-tts");
  const outputRoot = path.resolve(repositoryRoot, argument("output") ?? VOXY_LOCAL_TTS_OUTPUT.gateDirectory);
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });
  const rawWav = path.resolve(outputRoot, VOXY_LOCAL_TTS_OUTPUT.rawWav);
  const normalizedWav = path.resolve(outputRoot, VOXY_LOCAL_TTS_OUTPUT.normalizedWav);
  const adapter = new PiperVoxyLocalTtsAdapter({ piperBinary: path.resolve(cacheRoot, "venv/bin/piper"), cacheRoot });
  const result = await adapter.synthesize({ text: VOXY_LOCAL_TTS_SCRIPT, locale: "de-DE", voiceId: VOXY_LOCAL_TTS_MODEL.voiceId, outputPath: rawWav, segments: VOXY_LOCAL_TTS_SCRIPT_SEGMENTS, speed: 1.08 });
  run("ffmpeg", ["-y", "-i", rawWav, "-af", "loudnorm=I=-16:TP=-1.5:LRA=7", "-ar", String(VOXY_LOCAL_TTS_MODEL.sampleRate), "-ac", "1", "-c:a", "pcm_s16le", normalizedWav]);
  const rawProbe = ffprobe(rawWav);
  const normalizedProbe = ffprobe(normalizedWav);
  const rawPeakDbfs = peakDb(rawWav);
  const normalizedPeakDbfs = peakDb(normalizedWav);
  if (rawPeakDbfs > -0.1) throw new Error(`raw_audio_clips:${rawPeakDbfs}`);
  if (normalizedPeakDbfs > -0.1) throw new Error(`normalized_audio_clips:${normalizedPeakDbfs}`);
  const envelope = wavEnvelope(await readFile(normalizedWav));
  const points = envelope.map((value, index) => `${40 + index * (1120 / (envelope.length - 1))},${280 - value * 170}`).join(" ");
  const html = `<!doctype html><html><style>*{box-sizing:border-box}body{margin:0;background:#010511;color:#fff;font-family:Arial}.card{width:1200px;height:360px;padding:30px 40px;background:radial-gradient(circle at 80% 20%,#0b315d,#010511 55%)}h1{font-size:24px;margin:0 0 6px}.meta{color:#9dbbd7;font-size:15px}.axis{stroke:#325272;stroke-width:1}.wave{fill:none;stroke:#00d9c0;stroke-width:3;stroke-linejoin:round}.mirror{opacity:.34;transform:translateY(560px) scaleY(-1)}</style><body><main class="card"><h1>Voxy Local TTS · Audio-derived waveform</h1><div class="meta">${VOXY_LOCAL_TTS_MODEL.voiceId} · ${result.durationMs} ms · ${result.sampleRate} Hz · mono · normalized peak ${normalizedPeakDbfs.toFixed(1)} dBFS</div><svg width="1120" height="280" viewBox="0 0 1200 360"><line class="axis" x1="40" y1="280" x2="1160" y2="280"/><polyline class="wave" points="${points}"/><polyline class="wave mirror" points="${points}"/></svg></main></body></html>`;
  const browser = await chromium.launch({ headless: true, args: typeof process.getuid === "function" && process.getuid() === 0 ? ["--no-sandbox"] : [] });
  const page = await browser.newPage({ viewport: { width: 1200, height: 360 } });
  const externalRequests: string[] = [];
  page.on("request", (request) => { if (/^https?:/i.test(request.url())) externalRequests.push(request.url()); });
  await page.setContent(html, { waitUntil: "load" });
  await page.screenshot({ path: path.resolve(outputRoot, VOXY_LOCAL_TTS_OUTPUT.waveformPreview), type: "png" });
  await browser.close();
  if (externalRequests.length) throw new Error(`external_request_detected:${externalRequests.join(",")}`);
  const provisioning = JSON.parse(await readFile(path.resolve(cacheRoot, "provisioning-manifest.json"), "utf8"));
  const engineProvenance = { engine: VOXY_LOCAL_TTS_ENGINE, runtimeDependencies: VOXY_LOCAL_TTS_RUNTIME_DEPENDENCIES, provisionedWheel: provisioning.wheel, pipFreeze: provisioning.pipFreeze, runtimeNetworkAllowed: false, externalRequestCountDuringSynthesis: result.externalRequestCount };
  const modelProvenance = { ...VOXY_LOCAL_TTS_MODEL, sourceUrl: `https://huggingface.co/${VOXY_LOCAL_TTS_MODEL.repository}/tree/${VOXY_LOCAL_TTS_MODEL.repositoryRevision}/de/de_DE/mls/medium`, modelCardVerified: true, datasetLicenseVerified: true };
  await writeFile(path.resolve(outputRoot, "license-matrix.json"), `${JSON.stringify(VOXY_LOCAL_TTS_LICENSE_MATRIX, null, 2)}\n`, "utf8");
  await writeFile(path.resolve(outputRoot, "engine-provenance.json"), `${JSON.stringify(engineProvenance, null, 2)}\n`, "utf8");
  await writeFile(path.resolve(outputRoot, "model-provenance.json"), `${JSON.stringify(modelProvenance, null, 2)}\n`, "utf8");
  await writeFile(path.resolve(outputRoot, "THIRD_PARTY_NOTICES.md"), notices(), "utf8");
  const manifest = {
    schemaVersion: "voxy-local-tts-gate-v1", exactHeadSha, visualMasterHeadSha: VOXY_LOCAL_TTS_VISUAL_MASTER_HEAD,
    licenseGateStatus: "pass", tts: { engine: VOXY_LOCAL_TTS_ENGINE.selected, engineVersion: VOXY_LOCAL_TTS_ENGINE.version, engineLicense: VOXY_LOCAL_TTS_ENGINE.license, voiceId: VOXY_LOCAL_TTS_MODEL.voiceId, modelSha256: VOXY_LOCAL_TTS_MODEL.modelSha256, modelLicense: VOXY_LOCAL_TTS_MODEL.modelLicense, datasetLicense: VOXY_LOCAL_TTS_MODEL.datasetLicense, runtimeDependencies: VOXY_LOCAL_TTS_RUNTIME_DEPENDENCIES, licenseGateStatus: "pass" },
    audio: { sampleRate: result.sampleRate, channels: result.channels, durationMs: result.durationMs, rawPeakDbfs, peak: normalizedPeakDbfs, normalized: true, externalRequestCountDuringRender: result.externalRequestCount + externalRequests.length, raw: { file: VOXY_LOCAL_TTS_OUTPUT.rawWav, sha256: await sha256(rawWav), ffprobe: rawProbe }, normalizedFile: { file: VOXY_LOCAL_TTS_OUTPUT.normalizedWav, sha256: await sha256(normalizedWav), ffprobe: normalizedProbe } },
    script: VOXY_LOCAL_TTS_SCRIPT, pronunciationAliases: result.segmentTiming.filter((segment) => segment.text !== segment.spokenText).map(({ id, text, spokenText }) => ({ id, visibleText: text, spokenText })), segmentTiming: result.segmentTiming,
    waveform: { preview: VOXY_LOCAL_TTS_OUTPUT.waveformPreview, count: 1, placement: "behind_voxy", envelopeSource: "tts-sample-normalized.wav" },
    runtimeDownloadRequired: false, offlineAfterProvisioning: true, externalVisualUploadUsed: false, paidProviderUsed: false, humanAudioAcceptance: "pending", humanVisualAcceptance: "accepted", productionEligible: false, autoPublish: false,
  };
  await writeFile(path.resolve(outputRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.info(JSON.stringify({ status: "voxy_local_tts_gate_passed", exactHeadSha, artifact: path.relative(repositoryRoot, outputRoot), durationMs: result.durationMs, sampleRate: result.sampleRate, channels: result.channels, peakDbfs: normalizedPeakDbfs, modelSha256: VOXY_LOCAL_TTS_MODEL.modelSha256, runtimeNetworkRequests: 0 }, null, 2));
}
main().catch((error) => { console.error(error instanceof Error ? error.stack : String(error)); process.exitCode = 1; });
