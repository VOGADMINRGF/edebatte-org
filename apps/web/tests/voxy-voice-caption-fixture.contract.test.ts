import { describe, expect, it } from "vitest";
import { buildVoxyCharacterMotionFixturePlan } from "@/features/voxyVideo/characterMotionFixture";
import {
  buildVoxyVoiceCaptionFixturePlan,
  formatVoxySrtTimestamp,
  formatVoxyWebVttTimestamp,
  getVoxyCaptionSafeArea,
  renderVoxyVoiceCaptionArtifacts,
  validateVoxyVoiceCaptionFixturePlan,
} from "@/features/voxyVideo/voiceCaptionFixture";

const approvedAudio = {
  source: {
    kind: "local_file" as const,
    path: "/fixtures/voxy-voice-de.wav",
    usageApproved: true as const,
  },
  durationMs: 8_000,
  integratedLufs: -16,
  truePeakDbtp: -1.5,
  sampleRateHz: 48_000,
  channels: 1 as const,
};

describe("Voxy voice and caption fixture", () => {
  it.each(["16:9", "9:16", "1:1"] as const)(
    "builds a self-validating caption plan for %s",
    (format) => {
      const characterPlan = buildVoxyCharacterMotionFixturePlan(format);
      const plan = buildVoxyVoiceCaptionFixturePlan({
        characterPlan,
        briefingId: `briefing-${format}`,
        scriptVersion: "script-v3",
        audio: approvedAudio,
        reviewStatus: "approved",
        reviewerId: "editor-001",
        reviewedAt: "2026-08-05T20:00:00.000Z",
      });

      expect(validateVoxyVoiceCaptionFixturePlan(plan)).toEqual({
        ok: true,
        renderEligible: true,
        errors: [],
      });
      expect(
        plan.segments.every(
          (segment) =>
            segment.text.length <=
            plan.safeArea.maxCharactersPerLine * plan.safeArea.maxLines,
        ),
      ).toBe(true);
    },
  );

  it("renders provider-neutral VTT and clean viewer-facing SRT", () => {
    const plan = buildVoxyVoiceCaptionFixturePlan({
      characterPlan: buildVoxyCharacterMotionFixturePlan("16:9"),
      briefingId: "briefing-artifacts",
      scriptVersion: "script-v3",
      audio: approvedAudio,
      reviewStatus: "approved",
      reviewerId: "editor-001",
      reviewedAt: "2026-08-05T20:00:00.000Z",
    });

    const artifacts = renderVoxyVoiceCaptionArtifacts(plan);
    expect(artifacts.webVtt).toContain("WEBVTT");
    expect(artifacts.webVtt).toContain("caption-");
    expect(artifacts.srt).not.toMatch(/^caption-/m);
    expect(artifacts.timeline).toEqual(plan.segments);
    expect(artifacts.timeline.at(-1)?.endMs).toBe(8_000);
  });

  it("keeps lip sync, visemes and auto-publish disabled", () => {
    const plan = buildVoxyVoiceCaptionFixturePlan({
      characterPlan: buildVoxyCharacterMotionFixturePlan("1:1"),
      briefingId: "briefing-002",
      scriptVersion: "script-v1",
      audio: approvedAudio,
    });

    expect(plan.lipSync).toBe(false);
    expect(plan.visemeGeneration).toBe(false);
    expect(plan.autoPublish).toBe(false);
    expect(plan.review.required).toBe(true);
    expect(validateVoxyVoiceCaptionFixturePlan(plan).renderEligible).toBe(false);
  });

  it("uses format-specific subtitle safe areas", () => {
    expect(getVoxyCaptionSafeArea("16:9")).toMatchObject({
      bottomPercent: 10,
      maxLines: 2,
    });
    expect(getVoxyCaptionSafeArea("9:16")).toMatchObject({
      bottomPercent: 18,
      maxCharactersPerLine: 28,
    });
    expect(getVoxyCaptionSafeArea("1:1")).toMatchObject({
      bottomPercent: 14,
      maxLines: 3,
    });
  });

  it("formats WebVTT and SRT timestamps deterministically", () => {
    expect(formatVoxyWebVttTimestamp(3_721_045)).toBe("01:02:01.045");
    expect(formatVoxySrtTimestamp(3_721_045)).toBe("01:02:01,045");
  });

  it("fails closed for overlapping segments and audio mismatch", () => {
    const plan = buildVoxyVoiceCaptionFixturePlan({
      characterPlan: buildVoxyCharacterMotionFixturePlan("16:9"),
      briefingId: "briefing-003",
      scriptVersion: "script-v1",
      audio: { ...approvedAudio, durationMs: 7_000 },
    });
    const overlappedId = plan.segments[1].id;
    plan.segments[1] = { ...plan.segments[1], startMs: 1_700 };

    const result = validateVoxyVoiceCaptionFixturePlan(plan);
    expect(result.ok).toBe(false);
    expect(result.renderEligible).toBe(false);
    expect(result.errors).toContain(
      `caption_timeline_gap_or_overlap:${overlappedId}`,
    );
    expect(result.errors).toContain("audio_and_caption_duration_mismatch");
  });

  it("requires explicit usage approval for provider audio", () => {
    const plan = buildVoxyVoiceCaptionFixturePlan({
      characterPlan: buildVoxyCharacterMotionFixturePlan("16:9"),
      briefingId: "briefing-004",
      scriptVersion: "script-v1",
      audio: {
        ...approvedAudio,
        source: {
          kind: "provider_result",
          providerId: "voice-provider",
          assetId: "asset-42",
          usageApproved: false,
        },
      },
    });

    expect(validateVoxyVoiceCaptionFixturePlan(plan).errors).toContain(
      "provider_audio_usage_not_approved",
    );
  });

  it("requires human review when output language differs", () => {
    const characterPlan = buildVoxyCharacterMotionFixturePlan("9:16");
    characterPlan.outputLanguage = "en";
    const plan = buildVoxyVoiceCaptionFixturePlan({
      characterPlan,
      briefingId: "briefing-005",
      scriptVersion: "script-v2",
      audio: approvedAudio,
      translationReviewed: false,
    });

    expect(validateVoxyVoiceCaptionFixturePlan(plan).errors).toContain(
      "translated_caption_requires_review",
    );
  });
});
