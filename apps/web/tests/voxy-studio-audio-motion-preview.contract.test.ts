import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildVoxyEditorialAudioMotionEnvelope,
} from "@/features/voxyVideo/editorialAudioMotion.server";
import {
  VOXY_LOCAL_COMPOSITION_AUDIO_INPUT_VERSION,
  validateVoxyLocalCompositionAudioInputRecord,
  type VoxyLocalCompositionAudioInputRecord,
} from "@/features/voxyVideo/localCompositionAudioAssetStore";

function record(): VoxyLocalCompositionAudioInputRecord {
  return {
    version: VOXY_LOCAL_COMPOSITION_AUDIO_INPUT_VERSION,
    assetId: "audio-preview-1",
    artifactId: "draft-preview-1",
    briefingId: "briefing-preview-1",
    scriptVersion: "story-r1",
    storyPlanId: "story-preview-1",
    storyPlanRevision: 1,
    locale: "de",
    voiceProfileId: "voice-de-approved-1",
    voiceUsageApproved: true,
    fallbackLocale: null,
    storageKey: "draft-preview-1/story-r1/audio.wav",
    sha256: "a".repeat(64),
    durationMs: 2_000,
    timelineVersion: "timeline-preview-1",
    chapterTimings: [{ chapterId: "chapter-1", durationMs: 2_000 }],
    captionCues: [
      {
        id: "caption-1",
        startMs: 0,
        endMs: 2_000,
        text: "Revisionsgebundene Vorschau.",
      },
    ],
    approvalRef: "voice-review-1",
    approvedByUserId: "admin-1",
    approvedAt: "2026-09-22T18:00:00.000Z",
    createdAt: "2026-09-22T18:01:00.000Z",
    reviewRequired: true,
    externalProviderUsed: false,
    autoRender: false,
    autoPublish: false,
  };
}

describe("Voxy Studio persisted audio-motion preview boundary", () => {
  it("keeps historical audio records without an envelope valid for the render worker", () => {
    expect(validateVoxyLocalCompositionAudioInputRecord(record())).toEqual([]);
  });

  it("accepts a SHA-bound persisted envelope and rejects stale envelope SHA truth", () => {
    const current = record();
    current.motionEnvelope = buildVoxyEditorialAudioMotionEnvelope({
      sourceSha256: current.sha256,
      levels: Array.from({ length: 48 }, () => 0.25),
    });
    expect(validateVoxyLocalCompositionAudioInputRecord(current)).toEqual([]);

    const stale = record();
    stale.motionEnvelope = buildVoxyEditorialAudioMotionEnvelope({
      sourceSha256: "b".repeat(64),
      levels: Array.from({ length: 48 }, () => 0.25),
    });
    expect(validateVoxyLocalCompositionAudioInputRecord(stale)).toContain(
      "audio_input_audio_motion_envelope_sha256_mismatch",
    );
  });

  it("keeps the Admin frame preview independent from the worker audio filesystem", async () => {
    const route = await readFile(
      resolve(
        process.cwd(),
        "src/app/api/admin/voxy-studio/[draftId]/frame-preview/route.ts",
      ),
      "utf8",
    );

    expect(route).toContain("audioInput.motionEnvelope");
    expect(route).toContain("resolveVoxyEditorialAudioEnvelopeFrameAmplitude");
    expect(route).not.toContain("VOXY_LOCAL_COMPOSITION_AUDIO_ROOT");
    expect(route).not.toContain("resolveVoxyLocalCompositionAudioAssetFromRecord");
    expect(route).not.toContain("resolveVoxyEditorialAudioFrameAmplitude");
    expect(route).not.toContain("amplitude: 0");
  });
});
