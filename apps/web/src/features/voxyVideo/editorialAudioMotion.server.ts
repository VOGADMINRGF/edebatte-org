import "server-only";

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdtemp, readFile, realpath, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";

import type { VoxyLocalCompositionAudioAsset } from "./localCompositionRuntime";

export const VOXY_EDITORIAL_AUDIO_MOTION_ENVELOPE_VERSION =
  "voxy-editorial-audio-motion-envelope-v1" as const;
export const VOXY_EDITORIAL_AUDIO_MOTION_FPS = 24 as const;

export type VoxyEditorialAudioMotionEnvelope = {
  version: typeof VOXY_EDITORIAL_AUDIO_MOTION_ENVELOPE_VERSION;
  fps: typeof VOXY_EDITORIAL_AUDIO_MOTION_FPS;
  sourceSha256: string;
  levels: number[];
};

const COMMAND_TIMEOUT_MS = 120_000;
const MAX_ANALYSIS_WAV_BYTES = 256_000_000;
const MAX_CACHE_ENTRIES = 8;
const SHA256 = /^[0-9a-f]{64}$/;

const envelopeCache = new Map<string, readonly number[]>();
const analysisInFlight = new Map<string, Promise<readonly number[]>>();

async function sha256File(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(path);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

async function trustedAudioPath(asset: VoxyLocalCompositionAudioAsset): Promise<string> {
  const [actualPath, actualRoot] = await Promise.all([
    realpath(asset.absolutePath),
    realpath(asset.allowedRoot),
  ]);
  if (actualPath !== actualRoot && !actualPath.startsWith(`${actualRoot}${sep}`)) {
    throw new Error("editorial_audio_motion_path_outside_trusted_root");
  }
  const fileStat = await stat(actualPath);
  if (!fileStat.isFile() || fileStat.size <= 0) {
    throw new Error("editorial_audio_motion_file_invalid");
  }
  const actualSha = await sha256File(actualPath);
  if (actualSha !== asset.sha256.toLowerCase()) {
    throw new Error("editorial_audio_motion_sha256_mismatch");
  }
  return actualPath;
}

export function buildVoxyEditorialAudioLevelsFromPcmWav(
  buffer: Buffer,
  fps = VOXY_EDITORIAL_AUDIO_MOTION_FPS,
): number[] {
  if (!Number.isInteger(fps) || fps < 1 || fps > 120) {
    throw new Error("editorial_audio_motion_fps_invalid");
  }
  if (
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WAVE"
  ) {
    throw new Error("editorial_audio_analysis_wav_invalid");
  }
  const fmtMarker = buffer.indexOf(Buffer.from("fmt "));
  const dataMarker = buffer.indexOf(Buffer.from("data"));
  if (fmtMarker < 0 || dataMarker < 0) {
    throw new Error("editorial_audio_analysis_chunks_missing");
  }
  const channels = buffer.readUInt16LE(fmtMarker + 10);
  const sampleRate = buffer.readUInt32LE(fmtMarker + 12);
  const bits = buffer.readUInt16LE(fmtMarker + 22);
  if (channels !== 1 || bits !== 16 || sampleRate <= 0) {
    throw new Error("editorial_audio_analysis_pcm_invalid");
  }

  const dataStart = dataMarker + 8;
  const sampleCount = Math.floor((buffer.length - dataStart) / 2);
  const frameCount = Math.ceil((sampleCount * fps) / sampleRate);
  const rms: number[] = [];
  const halfWindow = Math.round(sampleRate * 0.045);
  for (let frame = 0; frame < frameCount; frame += 1) {
    const center = Math.round((frame * sampleRate) / fps);
    const start = Math.max(0, center - halfWindow);
    const end = Math.min(sampleCount, center + halfWindow);
    let sum = 0;
    for (let index = start; index < end; index += 1) {
      const sample = buffer.readInt16LE(dataStart + index * 2) / 32768;
      sum += sample * sample;
    }
    rms.push(Math.sqrt(sum / Math.max(1, end - start)));
  }

  const sorted = [...rms].sort((a, b) => a - b);
  const reference = sorted[Math.floor(sorted.length * 0.95)] ?? 0.001;
  let smoothed = 0;
  return rms.map((value) => {
    const gated = value < 0.006 ? 0 : Math.min(1, value / Math.max(reference, 0.001));
    smoothed =
      gated > smoothed
        ? smoothed * 0.35 + gated * 0.65
        : smoothed * 0.62 + gated * 0.38;
    return Math.round(smoothed * 20) / 20;
  });
}

export function buildVoxyEditorialAudioMotionEnvelope(input: {
  sourceSha256: string;
  levels: readonly number[];
}): VoxyEditorialAudioMotionEnvelope {
  const sourceSha256 = input.sourceSha256.toLowerCase();
  if (!SHA256.test(sourceSha256)) {
    throw new Error("editorial_audio_motion_envelope_sha256_invalid");
  }
  if (
    input.levels.length === 0 ||
    input.levels.some(
      (value) =>
        !Number.isFinite(value) ||
        value < 0 ||
        value > 1 ||
        !Number.isInteger(value * 20),
    )
  ) {
    throw new Error("editorial_audio_motion_envelope_levels_invalid");
  }
  return {
    version: VOXY_EDITORIAL_AUDIO_MOTION_ENVELOPE_VERSION,
    fps: VOXY_EDITORIAL_AUDIO_MOTION_FPS,
    sourceSha256,
    levels: [...input.levels],
  };
}

export function validateVoxyEditorialAudioMotionEnvelope(input: {
  envelope: VoxyEditorialAudioMotionEnvelope;
  sourceSha256: string;
  durationMs: number;
}): string[] {
  const errors: string[] = [];
  if (input.envelope.version !== VOXY_EDITORIAL_AUDIO_MOTION_ENVELOPE_VERSION) {
    errors.push("audio_motion_envelope_version_invalid");
  }
  if (input.envelope.fps !== VOXY_EDITORIAL_AUDIO_MOTION_FPS) {
    errors.push("audio_motion_envelope_fps_invalid");
  }
  if (
    !SHA256.test(input.envelope.sourceSha256) ||
    input.envelope.sourceSha256 !== input.sourceSha256.toLowerCase()
  ) {
    errors.push("audio_motion_envelope_sha256_mismatch");
  }
  const minimumFrameCount =
    Number.isInteger(input.durationMs) && input.durationMs > 0
      ? Math.floor(((input.durationMs - 1) * VOXY_EDITORIAL_AUDIO_MOTION_FPS) / 1_000) + 1
      : 0;
  if (
    minimumFrameCount <= 0 ||
    input.envelope.levels.length < minimumFrameCount ||
    input.envelope.levels.some(
      (value) =>
        !Number.isFinite(value) ||
        value < 0 ||
        value > 1 ||
        !Number.isInteger(value * 20),
    )
  ) {
    errors.push("audio_motion_envelope_levels_invalid");
  }
  return errors;
}

export function resolveVoxyEditorialAudioEnvelopeFrameAmplitude(input: {
  envelope: VoxyEditorialAudioMotionEnvelope;
  sourceSha256: string;
  durationMs: number;
  frameIndex: number;
}): number {
  const errors = validateVoxyEditorialAudioMotionEnvelope({
    envelope: input.envelope,
    sourceSha256: input.sourceSha256,
    durationMs: input.durationMs,
  });
  if (errors.length) {
    throw new Error(`editorial_audio_motion_envelope_invalid:${errors.join(",")}`);
  }
  if (
    !Number.isInteger(input.frameIndex) ||
    input.frameIndex < 0 ||
    input.frameIndex >= input.envelope.levels.length
  ) {
    throw new Error("editorial_audio_motion_frame_index_invalid");
  }
  return input.envelope.levels[input.frameIndex] ?? 0;
}

function rememberEnvelope(key: string, levels: readonly number[]) {
  envelopeCache.delete(key);
  envelopeCache.set(key, levels);
  while (envelopeCache.size > MAX_CACHE_ENTRIES) {
    const oldest = envelopeCache.keys().next().value as string | undefined;
    if (!oldest) break;
    envelopeCache.delete(oldest);
  }
}

async function analyzeAudioFile(input: {
  absolutePath: string;
  fps: number;
}): Promise<readonly number[]> {
  const tempRoot = await mkdtemp(join(tmpdir(), "voxy-editorial-audio-motion-"));
  const wavPath = join(tempRoot, "analysis.wav");
  try {
    const result = spawnSync(
      "ffmpeg",
      [
        "-y",
        "-v",
        "error",
        "-i",
        input.absolutePath,
        "-vn",
        "-ac",
        "1",
        "-ar",
        "48000",
        "-c:a",
        "pcm_s16le",
        wavPath,
      ],
      {
        encoding: "utf8",
        shell: false,
        timeout: COMMAND_TIMEOUT_MS,
        maxBuffer: 4 * 1024 * 1024,
      },
    );
    if (result.error || result.status !== 0) {
      throw new Error("editorial_audio_motion_ffmpeg_failed");
    }
    const wavStat = await stat(wavPath);
    if (
      !wavStat.isFile() ||
      wavStat.size <= 0 ||
      wavStat.size > MAX_ANALYSIS_WAV_BYTES
    ) {
      throw new Error("editorial_audio_motion_analysis_size_invalid");
    }
    return buildVoxyEditorialAudioLevelsFromPcmWav(await readFile(wavPath), input.fps);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

export async function loadVoxyEditorialAudioMotionAnalysis(input: {
  audioAsset: VoxyLocalCompositionAudioAsset;
  fps?: number;
}): Promise<{ absolutePath: string; levels: readonly number[] }> {
  const fps = input.fps ?? VOXY_EDITORIAL_AUDIO_MOTION_FPS;
  if (!Number.isInteger(fps) || fps < 1 || fps > 120) {
    throw new Error("editorial_audio_motion_fps_invalid");
  }
  const absolutePath = await trustedAudioPath(input.audioAsset);
  const cacheKey = `${input.audioAsset.sha256.toLowerCase()}:${fps}`;
  const cached = envelopeCache.get(cacheKey);
  if (cached) {
    envelopeCache.delete(cacheKey);
    envelopeCache.set(cacheKey, cached);
    return { absolutePath, levels: cached };
  }

  let pending = analysisInFlight.get(cacheKey);
  if (!pending) {
    pending = analyzeAudioFile({ absolutePath, fps });
    analysisInFlight.set(cacheKey, pending);
  }
  try {
    const levels = await pending;
    rememberEnvelope(cacheKey, levels);
    return { absolutePath, levels };
  } finally {
    if (analysisInFlight.get(cacheKey) === pending) {
      analysisInFlight.delete(cacheKey);
    }
  }
}

export async function resolveVoxyEditorialAudioFrameAmplitude(input: {
  audioAsset: VoxyLocalCompositionAudioAsset;
  frameIndex: number;
  fps?: number;
}): Promise<number> {
  if (!Number.isInteger(input.frameIndex) || input.frameIndex < 0) {
    throw new Error("editorial_audio_motion_frame_index_invalid");
  }
  const analysis = await loadVoxyEditorialAudioMotionAnalysis({
    audioAsset: input.audioAsset,
    fps: input.fps,
  });
  return analysis.levels[input.frameIndex] ?? 0;
}
