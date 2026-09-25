import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { VOXY_LOCAL_TTS_ENGINE, VOXY_LOCAL_TTS_MODEL, type VoxyLocalTtsAdapter, type VoxyLocalTtsRequest, type VoxyLocalTtsResult, type VoxyLocalTtsSegmentTiming } from "../../src/features/voxyVideo/localTts";

function run(binary: string, args: string[], input?: string): string {
  const result = spawnSync(binary, args, { encoding: "utf8", input, env: { ...process.env, PIP_NO_INDEX: "1", HF_HUB_OFFLINE: "1" } });
  if (result.status !== 0 || result.error) throw new Error(`${path.basename(binary)}_failed:${result.error?.message ?? result.stderr.trim()}`);
  return result.stdout.trim();
}
async function sha256(file: string): Promise<string> {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}
function probeWav(file: string): { durationMs: number; sampleRate: number; channels: number } {
  const probe = JSON.parse(run("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", file])) as { streams: Array<Record<string, string>>; format: Record<string, string> };
  const audio = probe.streams.find((stream) => stream.codec_type === "audio");
  if (!audio) throw new Error("tts_output_audio_stream_missing");
  return { durationMs: Math.round(Number(probe.format.duration) * 1_000), sampleRate: Number(audio.sample_rate), channels: Number(audio.channels) };
}

export class PiperVoxyLocalTtsAdapter implements VoxyLocalTtsAdapter {
  constructor(private readonly input: Readonly<{ piperBinary: string; cacheRoot: string }>) {}

  async synthesize(request: VoxyLocalTtsRequest): Promise<VoxyLocalTtsResult> {
    if (request.locale !== VOXY_LOCAL_TTS_MODEL.locale || request.voiceId !== VOXY_LOCAL_TTS_MODEL.voiceId) throw new Error("unapproved_voice_request");
    if (request.text !== request.segments.map((segment) => segment.text).join("\n\n")) throw new Error("visible_script_and_segments_drift");
    const modelPath = path.resolve(this.input.cacheRoot, VOXY_LOCAL_TTS_MODEL.modelPath);
    const configPath = path.resolve(this.input.cacheRoot, VOXY_LOCAL_TTS_MODEL.configPath);
    const modelHash = await sha256(modelPath);
    const configHash = await sha256(configPath);
    if (modelHash !== VOXY_LOCAL_TTS_MODEL.modelSha256) throw new Error(`model_sha_mismatch:${modelHash}`);
    if (configHash !== VOXY_LOCAL_TTS_MODEL.configSha256) throw new Error(`config_sha_mismatch:${configHash}`);

    const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "voxy-local-tts-"));
    try {
      const concatFiles: string[] = [];
      const segmentTiming: VoxyLocalTtsSegmentTiming[] = [];
      let cursorMs = 0;
      for (const [index, segment] of request.segments.entries()) {
        const segmentFile = path.resolve(temporaryRoot, `segment-${index}.wav`);
        const spokenText = segment.spokenText ?? segment.text;
        run(this.input.piperBinary, ["--model", modelPath, "--config", configPath, "--speaker", String(VOXY_LOCAL_TTS_MODEL.speakerId), "--length-scale", String(request.speed ?? VOXY_LOCAL_TTS_ENGINE.deterministicInference.lengthScale), "--noise-scale", String(VOXY_LOCAL_TTS_ENGINE.deterministicInference.noiseScale), "--noise-w-scale", String(VOXY_LOCAL_TTS_ENGINE.deterministicInference.noiseWidthScale), "--sentence-silence", "0.08", "--volume", String(VOXY_LOCAL_TTS_ENGINE.deterministicInference.volume), "--output-file", segmentFile], `${spokenText}\n`);
        const segmentProbe = probeWav(segmentFile);
        if (segmentProbe.sampleRate !== VOXY_LOCAL_TTS_MODEL.sampleRate || segmentProbe.channels !== VOXY_LOCAL_TTS_MODEL.channels) throw new Error("tts_segment_media_contract_invalid");
        const pauseAfterMs = segment.pauseAfterMs ?? 0;
        segmentTiming.push({ id: segment.id, text: segment.text, spokenText, startMs: cursorMs, endMs: cursorMs + segmentProbe.durationMs, pauseAfterMs });
        concatFiles.push(segmentFile);
        cursorMs += segmentProbe.durationMs;
        if (pauseAfterMs > 0) {
          const pauseFile = path.resolve(temporaryRoot, `pause-${index}.wav`);
          run("ffmpeg", ["-y", "-f", "lavfi", "-i", `anullsrc=r=${VOXY_LOCAL_TTS_MODEL.sampleRate}:cl=mono`, "-t", (pauseAfterMs / 1_000).toFixed(3), "-c:a", "pcm_s16le", pauseFile]);
          concatFiles.push(pauseFile);
          cursorMs += pauseAfterMs;
        }
      }
      await mkdir(path.dirname(request.outputPath), { recursive: true });
      const concatList = path.resolve(temporaryRoot, "concat.txt");
      await writeFile(concatList, concatFiles.map((file) => `file '${file.replaceAll("'", "'\\''")}'`).join("\n"), "utf8");
      run("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", concatList, "-c:a", "pcm_s16le", request.outputPath]);
      const outputProbe = probeWav(request.outputPath);
      if (outputProbe.sampleRate !== VOXY_LOCAL_TTS_MODEL.sampleRate || outputProbe.channels !== VOXY_LOCAL_TTS_MODEL.channels || outputProbe.durationMs < 10_000) throw new Error("tts_adapter_output_invalid");
      return { wavPath: request.outputPath, durationMs: outputProbe.durationMs, sampleRate: outputProbe.sampleRate, channels: outputProbe.channels, segmentTiming, engineProvenance: VOXY_LOCAL_TTS_ENGINE, voiceProvenance: VOXY_LOCAL_TTS_MODEL, modelSha256: VOXY_LOCAL_TTS_MODEL.modelSha256, licenseStatus: "pass", externalRequestCount: 0 };
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }
}
