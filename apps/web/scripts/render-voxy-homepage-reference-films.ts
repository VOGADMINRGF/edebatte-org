import { chromium } from "@playwright/test";
import { spawnSync } from "node:child_process";
import {
  access,
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { VOXY_SIGNATURE } from "../src/features/voxyVideo/dualVoiceArchitecture";
import {
  VOXY_HOMEPAGE_REFERENCE_FILMS,
  VOXY_HOMEPAGE_REFERENCE_FILMS_OUTPUT,
  buildVoxyHomepageFilmSrt,
  buildVoxyHomepageFilmVtt,
  buildVoxyHomepageReferenceFilmPlan,
  filmSegments,
  validateVoxyHomepageReferenceFilmPlan,
  type VoxyHomepageFilmId,
} from "../src/features/voxyVideo/homepageReferenceFilms";
import {
  VOXY_HOMEPAGE_FILM_LAYOUT_PROFILE_IDS,
  type HomepageFilmLayoutProfile,
} from "../src/features/voxyVideo/homepageReferenceFilmLayouts";
import {
  contextualizeVoxyHomepageReferenceFilmPlan,
  validateVoxyHomepageContextIsolation,
} from "../src/features/voxyVideo/homepageReferenceFilmsContext";
import { renderVoxyHomepageReferenceFilmFrameHtml } from "../src/features/voxyVideo/homepageReferenceFilmsHtml";
import { VOXY_FIRST_EXPLAINER_STUDIO_LOCKUP_PATH } from "../src/features/voxyVideo/firstExplainerVideo";
import {
  VOXY_CANONICAL_CLEAN_STUDIO_BACKGROUND,
  validateVoxyCanonicalHeadAlpha,
} from "../src/features/voxyVideo/headAlphaSilhouette";
import { VOXY_POCKET_MARK_COMPOSITION_SOURCE } from "../src/features/voxyVideo/pocketMarkFinalGate";
import { VOXY_STATIC_CANON_NATIVE_ASSETS } from "../src/features/voxyVideo/staticCanonRecovery";
import type { VoxyMotionV4EmbeddedAssets } from "../src/features/voxyVideo/motionV4Html";
import {
  argument,
  assertOutsideRepository,
  audioLevelsFromWav,
  audioMetrics,
  concatenateMaster,
  dataUrl,
  durationMs,
  ffprobe,
  privacySafeProbe,
  renderTransparentMasterAudio,
  run,
  setHtml,
  sha256,
  synthesizeVoxySegments,
  verifyAcceptedVoxyReference,
  verifyCanonicalHumanEvidence,
  verifyMasterAudioAssembly,
  type PilotAudioSegment,
} from "./render-voxy-dual-voice-explainer-pilot";

const FILM_IDS = ["edebatte", "voiceopengov"] as const;

async function renderFilm(input: {
  filmId: VoxyHomepageFilmId;
  layoutProfile: HomepageFilmLayoutProfile;
  repositoryRoot: string;
  outputBase: string;
  exactHeadSha: string;
  python?: string;
  modelDir?: string;
  reference?: string;
  referenceSegmentSha256?: string;
  acceptedEvidenceMetrics?: ReturnType<typeof audioMetrics>;
  selectionManifestSha256?: string;
  reuseAudio?: Readonly<{
    root: string;
    expectedMasterSha256: string;
  }>;
  assets: VoxyMotionV4EmbeddedAssets;
}): Promise<Record<string, unknown>> {
  const { filmId, layoutProfile, repositoryRoot } = input;
  const contextMode = filmId === "voiceopengov" ? "evergreen" : "election_window";
  const outputContract = VOXY_HOMEPAGE_REFERENCE_FILMS_OUTPUT[filmId];
  const outputRoot = path.resolve(
    input.outputBase,
    outputContract.directory,
    layoutProfile === "landscape_16_9" ? "" : layoutProfile,
  );
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true, mode: 0o700 });
  await assertOutsideRepository(repositoryRoot, outputRoot, `private_${filmId}_output`);

  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), `voxy-homepage-${filmId}-`));
  const rawRoot = path.resolve(temporaryRoot, "raw");
  const finishedRoot = path.resolve(temporaryRoot, "finished");
  const framesRoot = path.resolve(temporaryRoot, "frames");
  const standframesRoot = path.resolve(outputRoot, "standframes");
  await Promise.all(
    [rawRoot, finishedRoot, framesRoot, standframesRoot].map((directory) =>
      mkdir(directory, { recursive: true }),
    ),
  );

  try {
    const segments = filmSegments(filmId, contextMode) as readonly PilotAudioSegment[];
    const masterAudio = path.resolve(outputRoot, outputContract.masterAudio);
    let speechDurationsMs: number[];
    let audioPreservation: Record<string, unknown>;
    let selectionManifestSha256 = input.selectionManifestSha256 ?? "";
    let audioReuse: Record<string, unknown> | undefined;

    if (input.reuseAudio) {
      const sourceOutputRoot = path.resolve(
        input.reuseAudio.root,
        outputContract.directory,
        layoutProfile === "landscape_16_9" ? "" : layoutProfile,
      );
      const sourceMasterAudio = path.resolve(sourceOutputRoot, outputContract.masterAudio);
      const sourcePreservationPath = path.resolve(
        sourceOutputRoot,
        outputContract.audioPreservation,
      );
      const sourceManifestPath = path.resolve(sourceOutputRoot, outputContract.manifest);
      const sourceMasterSha256 = await sha256(sourceMasterAudio);
      if (sourceMasterSha256 !== input.reuseAudio.expectedMasterSha256) {
        throw new Error(`${filmId}_accepted_master_audio_source_hash_mismatch`);
      }

      const sourcePreservation = JSON.parse(
        await readFile(sourcePreservationPath, "utf8"),
      ) as Record<string, unknown>;
      const sourceManifest = JSON.parse(
        await readFile(sourceManifestPath, "utf8"),
      ) as Record<string, unknown>;
      const preservationSegments = sourcePreservation.segments;
      if (!Array.isArray(preservationSegments)) {
        throw new Error(`${filmId}_accepted_audio_preservation_segments_missing`);
      }
      speechDurationsMs = segments.map((segment, index) => {
        const preserved = preservationSegments[index] as Record<string, unknown> | undefined;
        if (
          preserved?.segmentId !== segment.id
          || typeof preserved.outputDurationMs !== "number"
          || preserved.outputDurationMs <= 0
        ) {
          throw new Error(`${filmId}_accepted_audio_segment_contract_mismatch:${segment.id}`);
        }
        return preserved.outputDurationMs;
      });
      if (preservationSegments.length !== segments.length) {
        throw new Error(`${filmId}_accepted_audio_segment_count_mismatch`);
      }
      const sourceVoice = sourceManifest.voice as Record<string, unknown> | undefined;
      if (
        sourceManifest.filmId !== filmId
        || sourceManifest.layoutProfile !== layoutProfile
        || sourceVoice?.voiceId !== VOXY_SIGNATURE.voiceId
        || typeof sourceVoice.selectionManifestSha256 !== "string"
      ) {
        throw new Error(`${filmId}_accepted_audio_source_manifest_mismatch`);
      }
      selectionManifestSha256 = sourceVoice.selectionManifestSha256;
      await copyFile(sourceMasterAudio, masterAudio);
      const copiedMasterSha256 = await sha256(masterAudio);
      if (copiedMasterSha256 !== sourceMasterSha256) {
        throw new Error(`${filmId}_accepted_master_audio_copy_not_byte_identical`);
      }
      audioReuse = {
        mode: "byte_identical_accepted_master",
        sourceRenderExactHeadSha: sourceManifest.exactHeadSha,
        sourceMasterAudio,
        sourceMasterSha256,
        copiedMasterSha256,
        synthesisInvoked: false,
        processingInvoked: false,
      };
      audioPreservation = {
        ...sourcePreservation,
        schemaVersion: "voxy-homepage-reference-film-d1-preservation-v1",
        gate: "passed",
        audioReuse,
        productionEligible: false,
        autoPublish: false,
      };
      console.info(`homepage_film_progress:${filmId}:${contextMode}:reuse_accepted_d1_byte_identical`);
    } else {
      if (
        !input.python
        || !input.modelDir
        || !input.reference
        || !input.referenceSegmentSha256
        || !input.acceptedEvidenceMetrics
        || !selectionManifestSha256
      ) {
        throw new Error(`${filmId}_private_voice_synthesis_inputs_missing`);
      }
      console.info(`homepage_film_progress:${filmId}:${contextMode}:synthesize_d1`);
      const rawById = await synthesizeVoxySegments({
        python: input.python,
        modelDir: input.modelDir,
        reference: input.reference,
        expectedReferenceSegmentSha256: input.referenceSegmentSha256,
        temporaryRoot,
        rawRoot,
        segments,
        singleVoiceReview: true,
      });

      const finishedById = new Map<string, string>();
      const audioPreservationSegments: Array<Record<string, unknown>> = [];
      for (const segment of segments) {
        const output = path.resolve(finishedRoot, `${segment.id}.wav`);
        audioPreservationSegments.push(
          await renderTransparentMasterAudio({
            segmentId: segment.id,
            inputFile: rawById.get(segment.id)!,
            outputFile: output,
            speakerRole: "voxy",
            acceptedEvidence: input.acceptedEvidenceMetrics,
          }),
        );
        finishedById.set(segment.id, output);
      }

      speechDurationsMs = segments.map((segment) => durationMs(finishedById.get(segment.id)!));
      await concatenateMaster({ finishedById, output: masterAudio, temporaryRoot, segments });
      const audioAssembly = await verifyMasterAudioAssembly({ finishedById, masterAudio, segments });
      audioPreservation = {
        schemaVersion: "voxy-homepage-reference-film-d1-preservation-v1",
        gate: "passed",
        canonicalVoice: "D1 Conversational Dynamic / accepted",
        acceptedEvidence: {
          candidateId: "D1",
          sha256: VOXY_SIGNATURE.provenance.privateHumanReviewEvidenceSha256,
          metrics: input.acceptedEvidenceMetrics,
        },
        segments: audioPreservationSegments,
        assembly: audioAssembly,
        hardGates: {
          everySpokenSegmentUsesD1: audioPreservationSegments.every(
            (entry) => entry.candidateId === "D1" && entry.voiceId === VOXY_SIGNATURE.voiceId,
          ),
          w1SegmentsUsed: false,
          fallbackUsed: false,
          dynamicNormalizationUsed: false,
          compressionUsed: false,
          limiterUsed: false,
          eqApplied: false,
          pitchChanged: false,
          tempoChanged: false,
          timeStretchUsed: false,
          reverbApplied: false,
          clippingDetected: false,
          pcmIdentityPreservedInAssembly: audioAssembly.segments.every(
            (entry) => entry.pcmIdentityMatch,
          ),
        },
        productionEligible: false,
        autoPublish: false,
      };
      const hardGates = audioPreservation.hardGates as Record<string, unknown>;
      if (!hardGates.everySpokenSegmentUsesD1 || !hardGates.pcmIdentityPreservedInAssembly) {
        throw new Error(`${filmId}_audio_preservation_failed`);
      }
    }

    const rawPlan = buildVoxyHomepageReferenceFilmPlan({
      filmId,
      contextMode,
      exactHeadSha: input.exactHeadSha,
      speechDurationsMs,
      layoutProfile,
    });
    const planErrors = validateVoxyHomepageReferenceFilmPlan(rawPlan);
    if (planErrors.length) throw new Error(`${filmId}_plan_invalid:${planErrors.join(",")}`);

    const plan = contextualizeVoxyHomepageReferenceFilmPlan(rawPlan);
    const contextErrors = validateVoxyHomepageContextIsolation(plan);
    if (contextErrors.length) {
      throw new Error(`${filmId}_context_isolation_invalid:${contextErrors.join(",")}`);
    }
    if (Math.abs(durationMs(masterAudio) - plan.output.durationMs) > 120) {
      throw new Error(`${filmId}_master_audio_duration_drift`);
    }

    await Promise.all([
      writeFile(
        path.resolve(outputRoot, outputContract.audioPreservation),
        `${JSON.stringify(audioPreservation, null, 2)}\n`,
        "utf8",
      ),
      writeFile(
        path.resolve(outputRoot, outputContract.speakerTimeline),
        `${JSON.stringify(plan.speakerTimeline, null, 2)}\n`,
        "utf8",
      ),
      writeFile(
        path.resolve(outputRoot, outputContract.visualStateTimeline),
        `${JSON.stringify(plan.visualStateTimeline, null, 2)}\n`,
        "utf8",
      ),
      writeFile(
        path.resolve(outputRoot, outputContract.evidenceTimeline),
        `${JSON.stringify(plan.evidenceTimeline, null, 2)}\n`,
        "utf8",
      ),
      writeFile(
        path.resolve(outputRoot, outputContract.motionTimeline),
        `${JSON.stringify(plan.motionTimeline, null, 2)}\n`,
        "utf8",
      ),
      writeFile(
        path.resolve(outputRoot, outputContract.lowerThirdTimeline),
        `${JSON.stringify(plan.lowerThirdTimeline, null, 2)}\n`,
        "utf8",
      ),
      writeFile(
        path.resolve(outputRoot, outputContract.sourceManifest),
        `${JSON.stringify(
          {
            schemaVersion: "voxy-homepage-source-manifest-v1",
            filmId,
            contextMode: plan.contextMode,
            sources: plan.sources,
            currentOfferInventory: plan.currentOfferInventory,
            marketedOffers: plan.marketedOffers,
            politicalNeutrality: true,
            generatedClaimsForbidden: true,
            sourceIntegrityGate: "passed",
            contextIsolationGate: "passed",
          },
          null,
          2,
        )}\n`,
        "utf8",
      ),
      writeFile(
        path.resolve(outputRoot, outputContract.captionsVtt),
        buildVoxyHomepageFilmVtt(plan.speakerTimeline),
        "utf8",
      ),
      writeFile(
        path.resolve(outputRoot, outputContract.captionsSrt),
        buildVoxyHomepageFilmSrt(plan.speakerTimeline),
        "utf8",
      ),
    ]);

    const frozenInputs = [
      VOXY_POCKET_MARK_COMPOSITION_SOURCE.repositoryPath,
      VOXY_STATIC_CANON_NATIVE_ASSETS.lapelPin,
      VOXY_STATIC_CANON_NATIVE_ASSETS.edebattePocketMark,
      VOXY_CANONICAL_CLEAN_STUDIO_BACKGROUND.repositoryPath,
      "apps/web/src/features/voxyVideo/mouthRig.ts",
      "apps/web/src/features/voxyVideo/mouthV41.ts",
    ];
    if (
      spawnSync("git", ["diff", "--quiet", plan.visualMasterHeadSha, "--", ...frozenInputs], {
        cwd: repositoryRoot,
      }).status !== 0
    ) {
      throw new Error(`${filmId}_visual_canon_freeze_failed`);
    }
    const headAlphaErrors = validateVoxyCanonicalHeadAlpha();
    if (headAlphaErrors.length) {
      throw new Error(`${filmId}_head_alpha_compositing_gate_failed:${headAlphaErrors.join(",")}`);
    }

    const levels = audioLevelsFromWav(await readFile(masterAudio), plan.output.fps);
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: plan.output.width, height: plan.output.height },
      deviceScaleFactor: 1,
      colorScheme: "dark",
    });
    const page = await context.newPage();
    const externalRequests: string[] = [];
    page.on("request", (request) => {
      if (/^https?:/i.test(request.url())) externalRequests.push(request.url());
    });

    let uniqueFrames = 0;
    console.info(`homepage_film_progress:${filmId}:render_${plan.output.frameCount}_frames`);
    for (let frameIndex = 0; frameIndex < plan.output.frameCount; frameIndex += 1) {
      const output = path.resolve(framesRoot, `frame-${String(frameIndex).padStart(5, "0")}.png`);
      if (frameIndex % 2 === 1) {
        await copyFile(
          path.resolve(framesRoot, `frame-${String(frameIndex - 1).padStart(5, "0")}.png`),
          output,
        );
        continue;
      }
      await setHtml(
        page,
        renderVoxyHomepageReferenceFilmFrameHtml({
          plan,
          assets: input.assets,
          frameIndex,
          amplitude: levels[frameIndex] ?? 0,
        }),
      );
      await page.locator(".viewport").screenshot({ path: output, type: "png" });
      uniqueFrames += 1;
      if (uniqueFrames % 100 === 0) {
        console.info(`homepage_film_progress:${filmId}:unique_frames=${uniqueFrames}`);
      }
    }
    await context.close();
    await browser.close();
    if (externalRequests.length) throw new Error(`${filmId}_external_render_request_detected`);

    const mp4 = path.resolve(outputRoot, outputContract.mp4);
    const contactSheetCellWidth = 360;
    const contactSheetCellHeight = Math.round(
      (contactSheetCellWidth * plan.output.height) / plan.output.width,
    );
    run("ffmpeg", [
      "-y",
      "-framerate",
      "24",
      "-i",
      path.resolve(framesRoot, "frame-%05d.png"),
      "-i",
      masterAudio,
      "-map",
      "0:v:0",
      "-map",
      "1:a:0",
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "18",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-movflags",
      "+faststart",
      "-shortest",
      mp4,
    ]);

    const reviewFrames = [] as Array<{
      id: string;
      at: number;
      frameIndex: number;
      file: string;
      sha256: string;
    }>;
    for (const [index, ratio] of [.03, .14, .24, .34, .4, .52, .64, .73, .82, .94].entries()) {
      const at = Number(((plan.output.durationMs / 1_000) * ratio).toFixed(3));
      const frameIndex = Math.min(plan.output.frameCount - 1, Math.floor(at * 24));
      const evenFrame = frameIndex - (frameIndex % 2);
      const id = `${String(index + 1).padStart(2, "0")}-${
        plan.visualStateTimeline.find((entry) => at >= entry.start && at < entry.end)?.state.toLowerCase() ??
        "host"
      }`;
      const file = path.resolve(standframesRoot, `${id}.png`);
      await copyFile(
        path.resolve(framesRoot, `frame-${String(evenFrame).padStart(5, "0")}.png`),
        file,
      );
      reviewFrames.push({
        id,
        at,
        frameIndex,
        file: `standframes/${id}.png`,
        sha256: await sha256(file),
      });
    }

    await copyFile(
      path.resolve(outputRoot, reviewFrames[8]!.file),
      path.resolve(outputRoot, outputContract.preview),
    );
    run("ffmpeg", [
      "-y",
      ...reviewFrames.flatMap((entry) => ["-i", path.resolve(outputRoot, entry.file)]),
      "-filter_complex",
      `[0:v]scale=${contactSheetCellWidth}:${contactSheetCellHeight}[a];[1:v]scale=${contactSheetCellWidth}:${contactSheetCellHeight}[b];[2:v]scale=${contactSheetCellWidth}:${contactSheetCellHeight}[c];[3:v]scale=${contactSheetCellWidth}:${contactSheetCellHeight}[d];[4:v]scale=${contactSheetCellWidth}:${contactSheetCellHeight}[e];[5:v]scale=${contactSheetCellWidth}:${contactSheetCellHeight}[f];[6:v]scale=${contactSheetCellWidth}:${contactSheetCellHeight}[g];[7:v]scale=${contactSheetCellWidth}:${contactSheetCellHeight}[h];[8:v]scale=${contactSheetCellWidth}:${contactSheetCellHeight}[i];[9:v]scale=${contactSheetCellWidth}:${contactSheetCellHeight}[j];[a][b][c][d][e]hstack=inputs=5[top];[f][g][h][i][j]hstack=inputs=5[bottom];[top][bottom]vstack=inputs=2`,
      "-frames:v",
      "1",
      path.resolve(outputRoot, outputContract.contactSheet),
    ]);

    const mp4Probe = ffprobe(mp4);
    const video = mp4Probe.streams.find((stream) => stream.codec_type === "video");
    const audio = mp4Probe.streams.find((stream) => stream.codec_type === "audio");
    const mediaDuration = Number(mp4Probe.format.duration);
    if (
      !video ||
      !audio ||
      Number(video.width) !== plan.output.width ||
      Number(video.height) !== plan.output.height ||
      video.avg_frame_rate !== "24/1" ||
      mediaDuration < outputContract.durationSeconds.min ||
      mediaDuration > outputContract.durationSeconds.max
    ) {
      throw new Error(`${filmId}_technical_media_gate_failed`);
    }

    const fileNames = [
      outputContract.mp4,
      outputContract.masterAudio,
      outputContract.preview,
      outputContract.contactSheet,
      outputContract.captionsVtt,
      outputContract.captionsSrt,
      outputContract.sourceManifest,
      outputContract.evidenceTimeline,
      outputContract.motionTimeline,
      outputContract.lowerThirdTimeline,
      outputContract.speakerTimeline,
      outputContract.visualStateTimeline,
      outputContract.audioPreservation,
    ];
    const files = Object.fromEntries(
      await Promise.all(
        fileNames.map(async (file) => [file, { sha256: await sha256(path.resolve(outputRoot, file)) }]),
      ),
    );

    const manifest = {
      schemaVersion: "voxy-homepage-reference-film-private-render-v1",
      artifactId: `voxy-${filmId}-homepage-reference-v1-${layoutProfile}-${input.exactHeadSha.slice(0, 12)}`,
      taskId: "VOXY-HOMEPAGE-REFERENCE-FILMS-01",
      exactHeadSha: input.exactHeadSha,
      filmId,
      title: VOXY_HOMEPAGE_REFERENCE_FILMS[filmId].title,
      proposition: plan.proposition,
      cta: plan.cta,
      contextMode: plan.contextMode,
      layoutProfile,
      layout: plan.layout,
      output: {
        width: plan.output.width,
        height: plan.output.height,
        fps: 24,
        frameCount: plan.output.frameCount,
        durationMs: plan.output.durationMs,
      },
      voice: {
        candidateId: "D1",
        voiceId: VOXY_SIGNATURE.voiceId,
        humanAcceptance: "accepted",
        W1: "parked_not_audible",
        selectionManifestSha256,
      },
      ...(audioReuse ? { audioReuse } : {}),
      audioPreservationGate: "passed",
      sourceIntegrityGate: "passed",
      evidenceIntegrityGate: "passed",
      contextIsolationGate: "passed",
      motionIntegrityGate: "passed",
      visualCanonGate: "passed",
      ffprobe: privacySafeProbe(mp4Probe),
      counts: {
        spokenSegments: plan.speakerTimeline.length,
        sources: plan.sources.length,
        evidenceTimelineEntries: plan.evidenceTimeline.length,
        motionEvents: plan.motionTimeline.length,
        lowerThirdEntries: plan.lowerThirdTimeline.length,
        renderedFrames: plan.output.frameCount,
        uniqueRenderedFrames: uniqueFrames,
      },
      files,
      reviewFrames,
      captions: plan.captions,
      privacy: plan.privacy,
      homepageIntegrationIncluded: false,
      humanHomepageFilmAcceptance: "pending",
      humanNews5VisualAcceptance: "pending",
      productionEligible: false,
      autoPublish: false,
    };
    await writeFile(
      path.resolve(outputRoot, outputContract.manifest),
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8",
    );

    console.info(
      JSON.stringify({
        filmId,
        layoutProfile,
        status: "TECHNICAL_PASS",
        output: mp4,
        contextMode: plan.contextMode,
        durationMs: plan.output.durationMs,
        frameCount: plan.output.frameCount,
        sourceCount: plan.sources.length,
        evidenceCount: plan.evidenceTimeline.length,
        motionEventCount: plan.motionTimeline.length,
      }),
    );
    return { filmId, layoutProfile, outputRoot, mp4, manifest };
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  const repositoryRoot = path.resolve(import.meta.dirname, "../../..");
  const exactHeadSha = process.env.VOXY_HOMEPAGE_REFERENCE_FILMS_COMMIT_SHA?.trim() ?? "";
  if (
    !/^[0-9a-f]{40}$/.test(exactHeadSha) ||
    run("git", ["rev-parse", "HEAD"], { cwd: repositoryRoot }) !== exactHeadSha
  ) {
    throw new Error("homepage_films_exact_head_mismatch");
  }

  const reuseAudioRootArgument = argument("reuse-audio-root");
  const reuseAudioMode = reuseAudioRootArgument !== null;
  const required = reuseAudioMode
    ? [
        "reuse-audio-root",
        "reuse-edebatte-audio-sha256",
        "reuse-voiceopengov-audio-sha256",
        "output",
      ]
    : [
        "voxy-python",
        "voxy-model-dir",
        "voxy-reference-02",
        "voxy-reference-selection",
        "voxy-d1-evidence",
        "output",
      ];
  if (required.some((name) => !argument(name))) {
    throw new Error("explicit_private_homepage_film_arguments_required");
  }

  const python = reuseAudioMode ? undefined : path.resolve(argument("voxy-python")!);
  const modelDir = reuseAudioMode ? undefined : path.resolve(argument("voxy-model-dir")!);
  const reference = reuseAudioMode ? undefined : path.resolve(argument("voxy-reference-02")!);
  const selection = reuseAudioMode
    ? undefined
    : path.resolve(argument("voxy-reference-selection")!);
  const d1Evidence = reuseAudioMode
    ? undefined
    : path.resolve(argument("voxy-d1-evidence")!);
  const reuseAudioRoot = reuseAudioMode ? path.resolve(reuseAudioRootArgument!) : undefined;
  const outputBase = path.resolve(argument("output")!);

  if (reuseAudioMode) {
    await access(reuseAudioRoot!);
    if (!(await lstat(reuseAudioRoot!)).isDirectory()) {
      throw new Error("accepted_audio_reuse_root_must_be_directory");
    }
  } else {
    for (const target of [python!, modelDir!, reference!, selection!, d1Evidence!]) {
      await access(target);
    }
    if (
      !(await lstat(reference!)).isFile()
      || !(await lstat(selection!)).isFile()
      || !(await lstat(d1Evidence!)).isFile()
    ) {
      throw new Error("private_voice_input_must_be_file");
    }
  }

  await mkdir(outputBase, { recursive: true, mode: 0o700 });
  const outputBaseReal = await realpath(outputBase);
  if (!path.relative(repositoryRoot, outputBaseReal).startsWith("..")) {
    throw new Error("private_output_must_be_outside_repository");
  }
  if (reuseAudioRoot) {
    const reuseAudioRootReal = await realpath(reuseAudioRoot);
    const outputRelativeToReuse = path.relative(reuseAudioRootReal, outputBaseReal);
    if (outputRelativeToReuse === "" || !outputRelativeToReuse.startsWith("..")) {
      throw new Error("accepted_audio_reuse_output_must_not_overlap_source");
    }
    for (const filmId of FILM_IDS) {
      const expectedHash = argument(
        filmId === "edebatte"
          ? "reuse-edebatte-audio-sha256"
          : "reuse-voiceopengov-audio-sha256",
      );
      if (!expectedHash || !/^[0-9a-f]{64}$/.test(expectedHash)) {
        throw new Error(`${filmId}_accepted_audio_sha256_invalid`);
      }
    }
  }

  const acceptedReference = reuseAudioMode
    ? undefined
    : await verifyAcceptedVoxyReference({
        repositoryRoot,
        reference: reference!,
        selectionManifest: selection!,
      });
  if (!reuseAudioMode) {
    await verifyCanonicalHumanEvidence({ repositoryRoot, voxyD1: d1Evidence! });
  }

  const sourcePaths = {
    canonStage: path.resolve(repositoryRoot, VOXY_POCKET_MARK_COMPOSITION_SOURCE.repositoryPath),
    cleanStudioBackground: path.resolve(
      repositoryRoot,
      VOXY_CANONICAL_CLEAN_STUDIO_BACKGROUND.repositoryPath,
    ),
    studioLockup: path.resolve(repositoryRoot, VOXY_FIRST_EXPLAINER_STUDIO_LOCKUP_PATH),
    lapelPin: path.resolve(repositoryRoot, VOXY_STATIC_CANON_NATIVE_ASSETS.lapelPin),
    edebattePocketMark: path.resolve(
      repositoryRoot,
      VOXY_STATIC_CANON_NATIVE_ASSETS.edebattePocketMark,
    ),
  };
  const assets: VoxyMotionV4EmbeddedAssets = {
    canonStageDataUrl: dataUrl(await readFile(sourcePaths.canonStage), "image/png"),
    canonicalCleanStudioBackgroundDataUrl: dataUrl(
      await readFile(sourcePaths.cleanStudioBackground),
      "image/svg+xml",
    ),
    studioLockupDataUrl: dataUrl(await readFile(sourcePaths.studioLockup), "image/svg+xml"),
    lapelPinDataUrl: dataUrl(await readFile(sourcePaths.lapelPin), "image/svg+xml"),
    edebattePocketMarkDataUrl: dataUrl(
      await readFile(sourcePaths.edebattePocketMark),
      "image/svg+xml",
    ),
  };

  const results = [];
  const requestedFilmId = argument("film") as VoxyHomepageFilmId | null;
  if (requestedFilmId && !FILM_IDS.includes(requestedFilmId)) {
    throw new Error(`unsupported_homepage_film:${requestedFilmId}`);
  }
  const filmIds = requestedFilmId ? [requestedFilmId] : FILM_IDS;
  const requestedLayoutProfile = argument("layout-profile") as HomepageFilmLayoutProfile | null;
  if (
    requestedLayoutProfile &&
    !VOXY_HOMEPAGE_FILM_LAYOUT_PROFILE_IDS.includes(requestedLayoutProfile)
  ) {
    throw new Error(`unsupported_homepage_film_layout_profile:${requestedLayoutProfile}`);
  }
  const layoutProfiles = requestedLayoutProfile
    ? [requestedLayoutProfile]
    : VOXY_HOMEPAGE_FILM_LAYOUT_PROFILE_IDS;
  for (const filmId of filmIds) {
    for (const layoutProfile of layoutProfiles) {
      results.push(
        await renderFilm({
          filmId,
          layoutProfile,
          repositoryRoot,
          outputBase,
          exactHeadSha,
          python,
          modelDir,
          reference,
          referenceSegmentSha256: acceptedReference?.expectedSegmentSha256,
          acceptedEvidenceMetrics: d1Evidence ? audioMetrics(d1Evidence) : undefined,
          selectionManifestSha256: acceptedReference?.selectionManifestSha256,
          reuseAudio: reuseAudioRoot
            ? {
                root: reuseAudioRoot,
                expectedMasterSha256: argument(
                  filmId === "edebatte"
                    ? "reuse-edebatte-audio-sha256"
                    : "reuse-voiceopengov-audio-sha256",
                )!,
              }
            : undefined,
          assets,
        }),
      );
    }
  }

  console.info(
    JSON.stringify(
      {
        status: "VOXY_HOMEPAGE_REFERENCE_FILMS_TECHNICAL_PASS",
        exactHeadSha,
        outputBase,
        films: results.map((entry) => ({
          filmId: entry.filmId,
          layoutProfile: entry.layoutProfile,
          mp4: entry.mp4,
        })),
        productionEligible: false,
        autoPublish: false,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
