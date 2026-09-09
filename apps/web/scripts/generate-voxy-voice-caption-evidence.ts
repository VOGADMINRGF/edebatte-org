import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import {
  formatVoxySrtTimestamp,
  formatVoxyWebVttTimestamp,
} from "../src/features/voxyVideo/voiceCaptionFixture";

function readArgument(name: string): string | null {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((entry) => entry.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function run(command: string, args: string[]): string {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.error || result.status !== 0) {
    throw new Error(`${command}_failed:${result.error?.message ?? result.stderr.trim()}`);
  }
  return `${result.stdout}\n${result.stderr}`.trim();
}

async function sha256(path: string): Promise<string> {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

function repoPath(path: string): string {
  return relative(process.cwd(), path).replaceAll("\\", "/");
}

function normalizeTranscript(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function probe(path: string) {
  return JSON.parse(run("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration,format_name,bit_rate:stream=codec_name,sample_rate,channels,channel_layout",
    "-of", "json",
    path,
  ]));
}

function measureEbur128(path: string): { integratedLufs: number; truePeakDbfs: number } {
  const output = run("ffmpeg", ["-hide_banner", "-nostats", "-i", path, "-filter_complex", "ebur128=peak=true", "-f", "null", "-"]);
  const integrated = [...output.matchAll(/I:\s*(-?\d+(?:\.\d+)?)\s+LUFS/g)].at(-1)?.[1];
  const peak = [...output.matchAll(/Peak:\s*(-?\d+(?:\.\d+)?)\s+dBFS/g)].at(-1)?.[1];
  if (!integrated || !peak) throw new Error("ebur128_summary_missing");
  return { integratedLufs: Number(integrated), truePeakDbfs: Number(peak) };
}

type SegmentInput = { id: string; text: string };

type SegmentDocument = {
  locale: string;
  segments: SegmentInput[];
};

async function main(): Promise<void> {
  const commitSha = process.env.VOXY_EVIDENCE_COMMIT_SHA?.trim();
  if (!commitSha) throw new Error("VOXY_EVIDENCE_COMMIT_SHA is required");

  const sourceArgument = readArgument("source");
  const transcriptArgument = readArgument("transcript");
  const segmentsArgument = readArgument("segments");
  if (!sourceArgument || !transcriptArgument || !segmentsArgument) {
    throw new Error("source_transcript_and_segments_are_required");
  }

  const sourcePath = resolve(process.cwd(), sourceArgument);
  const transcriptPath = resolve(process.cwd(), transcriptArgument);
  const segmentsPath = resolve(process.cwd(), segmentsArgument);
  const outputRoot = resolve(process.cwd(), readArgument("output") ?? "artifacts/voxy-voice-caption");
  await mkdir(outputRoot, { recursive: true });

  const segmentDocument = JSON.parse(await readFile(segmentsPath, "utf8")) as SegmentDocument;
  if (!segmentDocument.segments.length) throw new Error("caption_segments_missing");

  const spokenTranscript = normalizeTranscript(await readFile(transcriptPath, "utf8"));
  const captionTranscript = normalizeTranscript(
    segmentDocument.segments.map((segment) => segment.text).join(" "),
  );
  if (!spokenTranscript || spokenTranscript !== captionTranscript) {
    throw new Error("spoken_transcript_caption_mismatch");
  }

  const languageCode = segmentDocument.locale.split("-")[0]?.toLowerCase();
  if (!languageCode || !/^[a-z]{2,3}$/.test(languageCode)) {
    throw new Error(`caption_locale_invalid:${segmentDocument.locale}`);
  }

  const sourceProbe = probe(sourcePath);
  const sourceDurationMs = Math.round(Number(sourceProbe.format?.duration ?? 0) * 1000);
  if (sourceDurationMs <= 0) throw new Error("source_audio_duration_invalid");
  const sourceMeasurement = measureEbur128(sourcePath);

  const normalizedPath = resolve(outputRoot, `normalized-voice-${languageCode}.wav`);
  run("ffmpeg", [
    "-y", "-i", sourcePath,
    "-af", "loudnorm=I=-16:TP=-1.5:LRA=7",
    "-ar", "48000", "-ac", "1",
    normalizedPath,
  ]);
  const normalizedProbe = probe(normalizedPath);
  const normalizedMeasurement = measureEbur128(normalizedPath);
  const normalizedDurationMs = Math.round(Number(normalizedProbe.format?.duration ?? 0) * 1000);
  if (Math.abs(normalizedDurationMs - sourceDurationMs) > 120) throw new Error("normalization_changed_duration");
  if (normalizedMeasurement.integratedLufs < -17 || normalizedMeasurement.integratedLufs > -15) throw new Error(`normalized_lufs_out_of_target:${normalizedMeasurement.integratedLufs}`);
  if (normalizedMeasurement.truePeakDbfs > -1) throw new Error(`normalized_peak_out_of_target:${normalizedMeasurement.truePeakDbfs}`);

  const weights = segmentDocument.segments.map((segment) => Math.max(1, segment.text.trim().split(/\s+/).length));
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  let cursor = 0;
  const segments = segmentDocument.segments.map((segment, index) => {
    const startMs = cursor;
    const endMs = index === segmentDocument.segments.length - 1
      ? normalizedDurationMs
      : Math.round(cursor + (normalizedDurationMs * weights[index]) / totalWeight);
    cursor = endMs;
    return { ...segment, startMs, endMs };
  });

  const webVtt = `WEBVTT\n\n${segments.map((segment) => `${segment.id}\n${formatVoxyWebVttTimestamp(segment.startMs)} --> ${formatVoxyWebVttTimestamp(segment.endMs)}\n${segment.text}`).join("\n\n")}\n`;
  const srt = `${segments.map((segment, index) => `${index + 1}\n${formatVoxySrtTimestamp(segment.startMs)} --> ${formatVoxySrtTimestamp(segment.endMs)}\n${segment.text}`).join("\n\n")}\n`;
  const vttPath = resolve(outputRoot, `voice-caption-${languageCode}.vtt`);
  const srtPath = resolve(outputRoot, `voice-caption-${languageCode}.srt`);
  const timelinePath = resolve(outputRoot, `caption-timeline-${languageCode}.json`);
  await writeFile(vttPath, webVtt, "utf8");
  await writeFile(srtPath, srt, "utf8");
  await writeFile(timelinePath, `${JSON.stringify({ commitSha, locale: segmentDocument.locale, audioDurationMs: normalizedDurationMs, segments }, null, 2)}\n`, "utf8");

  const manifest = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    commitSha,
    locale: segmentDocument.locale,
    transcript: {
      path: repoPath(transcriptPath),
      sha256: await sha256(transcriptPath),
      matchesCaptions: true,
    },
    source: {
      path: repoPath(sourcePath),
      sha256: await sha256(sourcePath),
      durationMs: sourceDurationMs,
      probe: sourceProbe,
      ...sourceMeasurement,
      origin: "local_espeak_ng_contract_fixture_from_committed_transcript_not_final_voxy_voice",
    },
    normalization: {
      command: "ffmpeg -af loudnorm=I=-16:TP=-1.5:LRA=7 -ar 48000 -ac 1",
      targetIntegratedLufs: -16,
      targetTruePeakDbfs: -1.5,
      targetLra: 7,
    },
    normalized: {
      path: repoPath(normalizedPath),
      sha256: await sha256(normalizedPath),
      durationMs: normalizedDurationMs,
      probe: normalizedProbe,
      ...normalizedMeasurement,
    },
    captions: {
      timeline: { path: repoPath(timelinePath), sha256: await sha256(timelinePath) },
      webVtt: { path: repoPath(vttPath), sha256: await sha256(vttPath) },
      srt: { path: repoPath(srtPath), sha256: await sha256(srtPath) },
      segments,
    },
    humanReview: { required: true, status: "pending", approvedCommitSha: null },
  };
  const manifestPath = resolve(outputRoot, `evidence-manifest-${languageCode}.json`);
  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ status: "voxy_voice_caption_evidence_ready_for_human_review", commitSha, locale: manifest.locale, transcript: manifest.transcript, source: manifest.source, normalized: manifest.normalized, captions: manifest.captions, humanReview: manifest.humanReview }, null, 2));
}

main().catch((error: unknown) => {
  console.error(`VOXY_VOICE_CAPTION_EVIDENCE_FAILED: ${error instanceof Error ? error.message : "unknown_error"}`);
  process.exitCode = 1;
});
