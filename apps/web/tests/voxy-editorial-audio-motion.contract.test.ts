import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  buildVoxyEditorialAudioLevelsFromPcmWav,
  buildVoxyEditorialAudioMotionEnvelope,
  loadVoxyEditorialAudioMotionAnalysis,
  resolveVoxyEditorialAudioEnvelopeFrameAmplitude,
  resolveVoxyEditorialAudioFrameAmplitude,
  validateVoxyEditorialAudioMotionEnvelope,
} from "@/features/voxyVideo/editorialAudioMotion.server";
import type { VoxyLocalCompositionAudioAsset } from "@/features/voxyVideo/localCompositionRuntime";

const tempRoots: string[] = [];

function pcmWav(input: {
  sampleRate?: number;
  seconds: number;
  sample: (index: number, sampleRate: number) => number;
}): Buffer {
  const sampleRate = input.sampleRate ?? 48_000;
  const sampleCount = Math.round(sampleRate * input.seconds);
  const dataBytes = sampleCount * 2;
  const buffer = Buffer.alloc(44 + dataBytes);
  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write("WAVE", 8, "ascii");
  buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(dataBytes, 40);
  for (let index = 0; index < sampleCount; index += 1) {
    const normalized = Math.max(-1, Math.min(1, input.sample(index, sampleRate)));
    buffer.writeInt16LE(Math.round(normalized * 32767), 44 + index * 2);
  }
  return buffer;
}

function sha256(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function audioAsset(buffer: Buffer): Promise<VoxyLocalCompositionAudioAsset> {
  const root = await mkdtemp(join(tmpdir(), "voxy-audio-motion-contract-"));
  tempRoots.push(root);
  const path = join(root, "voice.wav");
  await writeFile(path, buffer);
  return {
    assetId: "audio-motion-contract",
    absolutePath: path,
    allowedRoot: root,
    sha256: sha256(buffer),
    durationMs: 2_000,
  };
}

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("Voxy editorial audio motion analysis", () => {
  it("keeps the canonical 24-fps RMS/gating/smoothing curve deterministic", () => {
    const wav = pcmWav({
      seconds: 2,
      sample: (index, sampleRate) => {
        if (index < sampleRate) return 0;
        return Math.sin((2 * Math.PI * 220 * index) / sampleRate) * 0.45;
      },
    });
    const levels = buildVoxyEditorialAudioLevelsFromPcmWav(wav, 24);

    expect(levels).toHaveLength(48);
    expect(levels.slice(0, 20).every((value) => value === 0)).toBe(true);
    expect(levels.slice(28).some((value) => value >= 0.5)).toBe(true);
    expect(levels.every((value) => value >= 0 && value <= 1)).toBe(true);
    expect(levels.every((value) => Number.isInteger(value * 20))).toBe(true);
  });

  it("uses trusted-root and registered SHA truth before returning a frame amplitude", async () => {
    const wav = pcmWav({
      seconds: 2,
      sample: (index, sampleRate) =>
        Math.sin((2 * Math.PI * 180 * index) / sampleRate) * 0.35,
    });
    const asset = await audioAsset(wav);

    const analysis = await loadVoxyEditorialAudioMotionAnalysis({
      audioAsset: asset,
      fps: 24,
    });
    const amplitude = await resolveVoxyEditorialAudioFrameAmplitude({
      audioAsset: asset,
      frameIndex: 12,
      fps: 24,
    });

    expect(analysis.absolutePath).toBe(asset.absolutePath);
    expect(amplitude).toBe(analysis.levels[12]);
    expect(amplitude).toBeGreaterThan(0);
  });

  it("persists a SHA-bound envelope that resolves the same frame amplitude without filesystem access", () => {
    const wav = pcmWav({
      seconds: 2,
      sample: (index, sampleRate) =>
        Math.sin((2 * Math.PI * 190 * index) / sampleRate) * 0.4,
    });
    const sourceSha256 = sha256(wav);
    const levels = buildVoxyEditorialAudioLevelsFromPcmWav(wav, 24);
    const envelope = buildVoxyEditorialAudioMotionEnvelope({
      sourceSha256,
      levels,
    });

    expect(
      validateVoxyEditorialAudioMotionEnvelope({
        envelope,
        sourceSha256,
        durationMs: 2_000,
      }),
    ).toEqual([]);
    expect(
      resolveVoxyEditorialAudioEnvelopeFrameAmplitude({
        envelope,
        sourceSha256,
        durationMs: 2_000,
        frameIndex: 12,
      }),
    ).toBe(levels[12]);
  });

  it("fails closed when a persisted envelope is bound to a different audio SHA", () => {
    const envelope = buildVoxyEditorialAudioMotionEnvelope({
      sourceSha256: "a".repeat(64),
      levels: Array.from({ length: 48 }, () => 0.25),
    });

    expect(() =>
      resolveVoxyEditorialAudioEnvelopeFrameAmplitude({
        envelope,
        sourceSha256: "b".repeat(64),
        durationMs: 2_000,
        frameIndex: 0,
      }),
    ).toThrow("audio_motion_envelope_sha256_mismatch");
  });

  it("fails closed when a persisted envelope is too short for the registered duration", () => {
    const envelope = buildVoxyEditorialAudioMotionEnvelope({
      sourceSha256: "a".repeat(64),
      levels: Array.from({ length: 24 }, () => 0.25),
    });

    expect(
      validateVoxyEditorialAudioMotionEnvelope({
        envelope,
        sourceSha256: "a".repeat(64),
        durationMs: 2_000,
      }),
    ).toContain("audio_motion_envelope_levels_invalid");
  });

  it("fails closed when the registered SHA no longer matches the trusted audio file", async () => {
    const wav = pcmWav({ seconds: 2, sample: () => 0.2 });
    const asset = await audioAsset(wav);

    await expect(
      resolveVoxyEditorialAudioFrameAmplitude({
        audioAsset: { ...asset, sha256: "f".repeat(64) },
        frameIndex: 0,
        fps: 24,
      }),
    ).rejects.toThrow("editorial_audio_motion_sha256_mismatch");
  });

  it("rejects malformed PCM input instead of inventing an amplitude", () => {
    expect(() =>
      buildVoxyEditorialAudioLevelsFromPcmWav(Buffer.from("not-a-wave"), 24),
    ).toThrow("editorial_audio_analysis_wav_invalid");
  });
});
