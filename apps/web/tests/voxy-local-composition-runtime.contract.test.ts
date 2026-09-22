import { describe, expect, it } from "vitest";

import {
  buildQueuedVoxyLocalCompositionJob,
  buildVoxyLocalCompositionInputFingerprint,
  getVoxyLocalCompositionDimensions,
  validateVoxyLocalCompositionOutput,
  validateVoxyLocalCompositionRequest,
  type VoxyLocalCompositionApprovalSnapshot,
  type VoxyLocalCompositionExecutionResult,
  type VoxyLocalCompositionOutput,
  type VoxyLocalCompositionRequest,
} from "@/features/voxyVideo/localCompositionRuntime";
import {
  executeVoxyLocalComposition,
  queueVoxyLocalComposition,
  retryVoxyLocalComposition,
  type VoxyLocalCompositionRuntimeDependencies,
} from "@/features/voxyVideo/localCompositionRuntimeService";
import { createInMemoryVoxyLocalCompositionRepository } from "@/features/voxyVideo/localCompositionRuntimeStore";
import {
  VOXY_EDITORIAL_STORY_PLAN_VERSION,
  type VoxyEditorialStoryPlan,
  type VoxyEditorialTimeline,
} from "@/features/voxyVideo/editorialStoryPlan";

function request(overrides?: Partial<VoxyLocalCompositionRequest>): VoxyLocalCompositionRequest {
  return {
    requestedByUserId: "user-1",
    artifactId: "artifact-1",
    briefingId: "briefing-1",
    scriptVersion: "v1",
    locale: "de-DE",
    format: "16:9",
    renderProfile: "local_review_v1",
    timelineVersion: "fixture-v3",
    audioAssetId: "audio-1",
    sceneContent: [
      { id: "opening", kicker: "UPDATE", headline: "Was ist neu?", detail: "Ein geprüfter Einstieg.", sourceIds: [] },
      { id: "explanation", kicker: "QUELLE", headline: "Was ist belegt?", detail: "Eine Quelle trägt die Aussage.", sourceIds: ["source-1"] },
      { id: "contrast", kicker: "GEGENPOSITION", headline: "Was widerspricht?", detail: "Die Gegenposition bleibt sichtbar.", sourceIds: ["source-2"] },
      { id: "invitation", kicker: "OFFEN", headline: "Was fehlt?", detail: "Menschliches Review bleibt erforderlich.", sourceIds: [] },
    ],
    captionCues: [
      { id: "cue-1", startMs: 0, endMs: 2_000, text: "Was ist neu?" },
      { id: "cue-2", startMs: 2_000, endMs: 4_000, text: "Was ist belegt?" },
      { id: "cue-3", startMs: 4_000, endMs: 6_000, text: "Was widerspricht?" },
      { id: "cue-4", startMs: 6_000, endMs: 8_000, text: "Was fehlt?" },
    ],
    ...overrides,
  };
}

function editorialPlan(): VoxyEditorialStoryPlan {
  return {
    version: VOXY_EDITORIAL_STORY_PLAN_VERSION,
    storyPlanId: "story-plan-1",
    revision: 3,
    briefingId: "briefing-1",
    dossierId: "dossier-1",
    title: "Editorial Longform",
    locale: "de",
    originalLanguage: "de",
    outputLanguage: "de",
    archetype: "explainer",
    durationClass: "explainer",
    derivedFromStoryPlanId: null,
    derivedFromRevision: null,
    reviewRequired: true,
    autoRender: false,
    autoPublish: false,
    chapters: [
      {
        chapterId: "chapter-1",
        role: "what_happened",
        headline: "Was ist passiert?",
        narration: "Der belegte Ausgangspunkt wird erklärt.",
        claimBindings: [],
        sourceIds: ["source-1"],
        findingIds: [],
        openQuestionIds: [],
        evidenceWindow: { kind: "source", sourceIds: ["source-1"], findingIds: [] },
        consequences: [],
        motion: "highlighting_source",
      },
      {
        chapterId: "chapter-2",
        role: "source_evidence",
        headline: "Was ist belegt?",
        narration: "Die Evidenz bleibt sichtbar und nachvollziehbar.",
        claimBindings: [],
        sourceIds: ["source-1"],
        findingIds: [],
        openQuestionIds: [],
        evidenceWindow: { kind: "source", sourceIds: ["source-1"], findingIds: [] },
        consequences: [],
        motion: "explaining",
      },
    ],
  };
}

function editorialTimeline(): VoxyEditorialTimeline {
  return {
    storyPlanId: "story-plan-1",
    storyPlanRevision: 3,
    durationClass: "explainer",
    durationMs: 120_000,
    chapters: [
      {
        chapterId: "chapter-1",
        role: "what_happened",
        startMs: 0,
        endMs: 60_000,
        motion: "highlighting_source",
      },
      {
        chapterId: "chapter-2",
        role: "source_evidence",
        startMs: 60_000,
        endMs: 120_000,
        motion: "explaining",
      },
    ],
  };
}

function editorialRequest(
  overrides?: Partial<VoxyLocalCompositionRequest>,
): VoxyLocalCompositionRequest {
  return request({
    scriptVersion: "story-r3",
    locale: "de",
    renderProfile: "editorial_v1",
    timelineVersion: "editorial-v1-story-r3",
    sceneContent: [],
    captionCues: [
      { id: "chapter-1", startMs: 0, endMs: 60_000, text: "Der belegte Ausgangspunkt wird erklärt." },
      { id: "chapter-2", startMs: 60_000, endMs: 120_000, text: "Die Evidenz bleibt sichtbar und nachvollziehbar." },
    ],
    editorialStoryPlan: editorialPlan(),
    editorialTimeline: editorialTimeline(),
    editorialBinding: {
      studioDraftId: "artifact-1",
      studioDraftRevision: 1,
      storyPlanId: "story-plan-1",
      storyPlanRevision: 3,
      evidenceSourcePackId: "source-pack-1",
      evidenceDecisionGateId: "decision-gate-1",
      approvalSource: "human",
      councilArtifactId: null,
      finalCanonId: "VOXY-V3.10.5-HUMAN-FINAL",
    },
    ...overrides,
  });
}

function approval(overrides?: Partial<VoxyLocalCompositionApprovalSnapshot>): VoxyLocalCompositionApprovalSnapshot {
  return {
    approved: true,
    approvalRef: "approval-1",
    approvedBy: "reviewer-1",
    approvedAt: "2026-09-21T15:59:00.000Z",
    previewReviewFlowId: "preview-review-flow-1",
    decisionGateId: "decision-gate-1",
    dossierRefId: "dossier-1",
    approvalSource: "human",
    councilArtifactId: null,
    authority: "trusted_review_authority",
    ...overrides,
  };
}

function outputFor(job: ReturnType<typeof buildQueuedVoxyLocalCompositionJob>): VoxyLocalCompositionOutput {
  const dimensions = getVoxyLocalCompositionDimensions(job.format, job.renderProfile);
  const durationMs = job.durationMs ?? 8_000;
  const video = (name: string, mimeType: string) => ({
    storageKey: `${job.jobId.replace(":", "-")}/${name}`,
    sha256: "a".repeat(64),
    sizeBytes: 10_000,
    durationMs,
    width: dimensions.width,
    height: dimensions.height,
    mimeType,
  });
  const caption = (name: string, mimeType: string) => ({
    storageKey: `${job.jobId.replace(":", "-")}/${name}`,
    sha256: "b".repeat(64),
    sizeBytes: 100,
    durationMs: null,
    width: null,
    height: null,
    mimeType,
  });
  return {
    outputId: job.outputId,
    jobId: job.jobId,
    identityKey: job.identityKey,
    inputFingerprint: job.inputFingerprint,
    reviewBindingHash: job.reviewBindingHash,
    timelineHash: job.timelineHash,
    format: job.format,
    renderProfile: job.renderProfile,
    locale: job.locale,
    previewReviewFlowId: job.previewReviewFlowId,
    decisionGateId: job.decisionGateId,
    dossierRefId: job.dossierRefId,
    masterMp4: video("master.mp4", "video/mp4"),
    previewWebm: video("preview.webm", "video/webm"),
    captionsVtt: caption("captions.vtt", "text/vtt"),
    captionsSrt: caption("captions.srt", "application/x-subrip"),
    createdAt: "2026-09-21T16:00:00.000Z",
    reviewStatus: "needs_review",
    reviewRequired: true,
    publicAsset: false,
    uploaded: false,
    scheduled: false,
    socialPosted: false,
    published: false,
  };
}

function deps(options?: {
  approval?: VoxyLocalCompositionApprovalSnapshot;
  executorFails?: boolean;
  audioDurationMs?: number;
}) {
  const repository = createInMemoryVoxyLocalCompositionRepository();
  const runtime: VoxyLocalCompositionRuntimeDependencies = {
    repository,
    approvalAuthority: {
      async resolveApproval() {
        return options?.approval ?? approval();
      },
    },
    audioResolver: {
      async resolveAudioAsset(audioAssetId) {
        return {
          assetId: audioAssetId,
          absolutePath: "/tmp/voxy/audio.wav",
          allowedRoot: "/tmp/voxy",
          sha256: "c".repeat(64),
          durationMs: options?.audioDurationMs ?? 8_000,
        };
      },
    },
    executor: {
      async execute({ job }): Promise<VoxyLocalCompositionExecutionResult> {
        if (options?.executorFails) throw new Error("ffmpeg_failed:synthetic test failure");
        return {
          output: outputFor(job),
          externalRequestCount: 0,
          ffmpegShellInterpolationUsed: false,
          lipSyncUsed: false,
          externalAvatarProviderUsed: false,
        };
      },
    },
    now: () => "2026-09-21T16:00:00.000Z",
  };
  return runtime;
}

describe("VOXY-LOCAL-COMPOSITION-RUNTIME-01", () => {
  it("deduplicates parallel identical queue requests into one deterministic job", async () => {
    const runtime = deps();
    const input = request();
    const [left, right] = await Promise.all([
      queueVoxyLocalComposition(input, runtime),
      queueVoxyLocalComposition(input, runtime),
    ]);
    expect(left.ok).toBe(true);
    expect(right.ok).toBe(true);
    if (!left.ok || !right.ok) return;
    expect(left.job.jobId).toBe(right.job.jobId);
    expect(left.job.identityKey).toBe(right.job.identityKey);
    expect(left.job.attempt).toBe(1);
    expect(left.job.durationMs).toBe(8_000);
    expect(left.job.previewReviewFlowId).toBe("preview-review-flow-1");
    expect(left.job.decisionGateId).toBe("decision-gate-1");
  });

  it("keeps local_review_v1 pinned to the historical four-scene 8-second fixture", () => {
    expect(validateVoxyLocalCompositionRequest(request())).toEqual([]);
    expect(
      validateVoxyLocalCompositionRequest(
        request({ captionCues: [{ id: "cue-1", startMs: 0, endMs: 9_000, text: "zu lang" }] }),
      ),
    ).toContain("caption_timeline_must_match_fixture_duration");
  });

  it("accepts an editorial_v1 story plan and variable timeline without weakening legacy fixture rules", () => {
    const input = editorialRequest();
    expect(validateVoxyLocalCompositionRequest(input)).toEqual([]);
    const job = buildQueuedVoxyLocalCompositionJob({
      request: input,
      approval: approval(),
      now: "2026-09-21T16:00:00.000Z",
    });
    expect(job.durationMs).toBe(120_000);
    expect(job.renderProfile).toBe("editorial_v1");
    expect(getVoxyLocalCompositionDimensions("16:9", "editorial_v1")).toEqual({
      width: 1920,
      height: 1080,
    });
    expect(getVoxyLocalCompositionDimensions("9:16", "editorial_v1")).toEqual({
      width: 1080,
      height: 1920,
    });
    expect(validateVoxyLocalCompositionOutput({ job, output: outputFor(job) })).toEqual([]);
  });

  it("cryptographically changes editorial identity when approval provenance changes", () => {
    const human = editorialRequest();
    const agent = editorialRequest({
      editorialBinding: {
        ...editorialRequest().editorialBinding!,
        approvalSource: "agent_council",
        councilArtifactId: "voxy-council-artifact-1",
      },
    });
    const humanJob = buildQueuedVoxyLocalCompositionJob({
      request: human,
      approval: approval(),
      now: "2026-09-21T16:00:00.000Z",
    });
    const agentJob = buildQueuedVoxyLocalCompositionJob({
      request: agent,
      approval: approval({
        approvedBy: "agent:voxy-chief-judge:decision-1",
        approvalSource: "agent_council",
        councilArtifactId: "voxy-council-artifact-1",
      }),
      now: "2026-09-21T16:00:00.000Z",
    });
    expect(buildVoxyLocalCompositionInputFingerprint(human)).not.toBe(
      buildVoxyLocalCompositionInputFingerprint(agent),
    );
    expect(humanJob.identityKey).not.toBe(agentJob.identityKey);
  });

  it("fails closed when approval snapshot and editorial provenance disagree", () => {
    expect(() =>
      buildQueuedVoxyLocalCompositionJob({
        request: editorialRequest(),
        approval: approval({
          approvalSource: "agent_council",
          councilArtifactId: "voxy-council-artifact-foreign",
          approvedBy: "agent:voxy-chief-judge:decision-foreign",
        }),
      }),
    ).toThrow("voxy_local_composition_editorial_approval_provenance_mismatch");
  });

  it("fails closed when editorial revision/evidence/canon binding is missing", () => {
    const errors = validateVoxyLocalCompositionRequest(
      editorialRequest({ editorialBinding: null }),
    );
    expect(errors).toContain("editorial_binding_missing");
  });

  it("fails closed when editorial captions do not end on the bound story timeline", () => {
    const errors = validateVoxyLocalCompositionRequest(
      editorialRequest({
        captionCues: [
          { id: "chapter-1", startMs: 0, endMs: 60_000, text: "Kapitel eins" },
          { id: "chapter-2", startMs: 60_000, endMs: 119_000, text: "Kapitel zwei" },
        ],
      }),
    );
    expect(errors).toContain("caption_timeline_must_match_editorial_duration");
  });

  it("fails closed when editorial timeline and story-plan revisions diverge", () => {
    const errors = validateVoxyLocalCompositionRequest(
      editorialRequest({
        editorialTimeline: { ...editorialTimeline(), storyPlanRevision: 2 },
      }),
    );
    expect(errors).toContain("editorial_timeline_story_binding_mismatch");
  });

  it("creates a distinct identity when the script version changes", async () => {
    const runtime = deps();
    const first = await queueVoxyLocalComposition(request(), runtime);
    const second = await queueVoxyLocalComposition(request({ scriptVersion: "v2" }), runtime);
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.job.jobId).not.toBe(second.job.jobId);
  });

  it("blocks render queueing when trusted approval authority has not approved", async () => {
    const runtime = deps({
      approval: approval({
        approved: false,
        approvalRef: null,
        approvedBy: null,
        approvedAt: null,
      }),
    });
    const result = await queueVoxyLocalComposition(request(), runtime);
    expect(result).toMatchObject({ ok: false, status: "blocked_by_missing_approval", job: null });
  });

  it("blocks render queueing when trusted approval lacks existing review architecture ids", async () => {
    const runtime = deps({
      approval: approval({ previewReviewFlowId: null, decisionGateId: null }),
    });
    const result = await queueVoxyLocalComposition(request(), runtime);
    expect(result).toMatchObject({ ok: false, status: "blocked_by_missing_approval", job: null });
  });

  it("renders editorial_v1 to review_ready only when audio duration matches the bound timeline", async () => {
    const runtime = deps({ audioDurationMs: 120_000 });
    const input = editorialRequest();
    const queued = await queueVoxyLocalComposition(input, runtime);
    expect(queued.ok).toBe(true);
    if (!queued.ok) return;
    const result = await executeVoxyLocalComposition({ jobId: queued.job.jobId, request: input, deps: runtime });
    expect(result.status).toBe("review_ready");
    expect(result.durationMs).toBe(120_000);
    const output = await runtime.repository.getOutput(result.outputId);
    expect(output?.masterMp4.durationMs).toBe(120_000);
    expect(output?.masterMp4.width).toBe(1920);
    expect(output?.masterMp4.height).toBe(1080);
  });

  it("keeps editorial_v1 failed when audio duration does not match the story timeline", async () => {
    const runtime = deps({ audioDurationMs: 8_000 });
    const input = editorialRequest();
    const queued = await queueVoxyLocalComposition(input, runtime);
    expect(queued.ok).toBe(true);
    if (!queued.ok) return;
    const result = await executeVoxyLocalComposition({ jobId: queued.job.jobId, request: input, deps: runtime });
    expect(result.status).toBe("failed");
    expect(await runtime.repository.getOutput(result.outputId)).toBeNull();
  });

  it("renders to review_ready and persists one verified output without publishing", async () => {
    const runtime = deps();
    const input = request();
    const queued = await queueVoxyLocalComposition(input, runtime);
    expect(queued.ok).toBe(true);
    if (!queued.ok) return;
    const result = await executeVoxyLocalComposition({ jobId: queued.job.jobId, request: input, deps: runtime });
    expect(result.status).toBe("review_ready");
    expect(result.uploadTriggered).toBe(false);
    expect(result.publishTriggered).toBe(false);
    expect(result.socialPostTriggered).toBe(false);
    const output = await runtime.repository.getOutput(result.outputId);
    expect(output).not.toBeNull();
    expect(output).toMatchObject({
      previewReviewFlowId: "preview-review-flow-1",
      decisionGateId: "decision-gate-1",
      dossierRefId: "dossier-1",
      reviewRequired: true,
      reviewStatus: "needs_review",
      uploaded: false,
      scheduled: false,
      socialPosted: false,
      published: false,
    });
  });

  it("keeps FFmpeg/worker failures failed and does not persist a successful output", async () => {
    const runtime = deps({ executorFails: true });
    const input = request();
    const queued = await queueVoxyLocalComposition(input, runtime);
    expect(queued.ok).toBe(true);
    if (!queued.ok) return;
    const failed = await executeVoxyLocalComposition({ jobId: queued.job.jobId, request: input, deps: runtime });
    expect(failed.status).toBe("failed");
    expect(failed.safeErrorMessage).toContain("nichts hochgeladen oder veröffentlicht");
    expect(await runtime.repository.getOutput(failed.outputId)).toBeNull();
  });

  it("retries the same failed job with attempt+1 and no duplicate output identity", async () => {
    const runtime = deps({ executorFails: true });
    const input = request();
    const queued = await queueVoxyLocalComposition(input, runtime);
    expect(queued.ok).toBe(true);
    if (!queued.ok) return;
    const failed = await executeVoxyLocalComposition({ jobId: queued.job.jobId, request: input, deps: runtime });
    const retry = await retryVoxyLocalComposition({
      jobId: failed.jobId,
      repository: runtime.repository,
      now: "2026-09-21T16:01:00.000Z",
    });
    expect(retry.jobId).toBe(failed.jobId);
    expect(retry.outputId).toBe(failed.outputId);
    expect(retry.attempt).toBe(2);
    expect(retry.status).toBe("queued");
  });

  it.each([
    ["16:9", 1280, 720],
    ["9:16", 720, 1280],
    ["1:1", 1080, 1080],
  ] as const)("validates %s output dimensions", (format, width, height) => {
    const input = request({ format });
    const job = buildQueuedVoxyLocalCompositionJob({ request: input, approval: approval(), now: "2026-09-21T16:00:00.000Z" });
    const output = outputFor(job);
    expect(output.masterMp4.width).toBe(width);
    expect(output.masterMp4.height).toBe(height);
    expect(validateVoxyLocalCompositionOutput({ job, output })).toEqual([]);
  });

  it("fails closed for path-traversal and argument-injection shaped identifiers", () => {
    expect(validateVoxyLocalCompositionRequest(request({ briefingId: "../../etc/passwd" }))).toContain(
      "briefing_id_invalid",
    );
    expect(validateVoxyLocalCompositionRequest(request({ audioAssetId: "--filter_complex=evil" }))).toContain(
      "audio_asset_id_invalid",
    );
  });

  it("rejects changed payload under an unchanged composition identity", async () => {
    const runtime = deps();
    const first = await queueVoxyLocalComposition(request(), runtime);
    expect(first.ok).toBe(true);
    const changed = request({
      sceneContent: request().sceneContent.map((scene) =>
        scene.id === "opening" ? { ...scene, headline: "Geänderter Text ohne neue Scriptversion" } : scene,
      ),
    });
    const second = await queueVoxyLocalComposition(changed, runtime);
    expect(second).toMatchObject({ ok: false, status: "idempotency_conflict" });
  });

  it("rejects a changed trusted review binding under an unchanged composition identity", async () => {
    const repository = createInMemoryVoxyLocalCompositionRepository();
    const firstRuntime = deps();
    firstRuntime.repository = repository;
    const first = await queueVoxyLocalComposition(request(), firstRuntime);
    expect(first.ok).toBe(true);

    const secondRuntime = deps({
      approval: approval({ decisionGateId: "decision-gate-2" }),
    });
    secondRuntime.repository = repository;
    const second = await queueVoxyLocalComposition(request(), secondRuntime);
    expect(second).toMatchObject({ ok: false, status: "idempotency_conflict" });
  });
});
