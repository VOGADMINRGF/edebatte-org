import { stableHash } from "@core/utils/hash";
import { getVoxyFixtureDimensions } from "@/features/voxyVideo/characterMotionFixture";
import { VOXY_FINAL_CANON } from "@/features/voxyVideo/finalCanon";
import type { VoxyVideoFormat } from "@/features/voxyVideo/modernCharacterContracts";
import {
  VOXY_EDITORIAL_DURATION_LIMITS_MS,
  VOXY_EDITORIAL_STORY_PLAN_VERSION,
  type VoxyEditorialStoryPlan,
  type VoxyEditorialTimeline,
} from "@/features/voxyVideo/editorialStoryPlan";

export const VOXY_LOCAL_COMPOSITION_STATUSES = [
  "queued",
  "rendering",
  "rendered",
  "failed",
  "review_ready",
] as const;

export type VoxyLocalCompositionStatus =
  (typeof VOXY_LOCAL_COMPOSITION_STATUSES)[number];

export const VOXY_LOCAL_COMPOSITION_RENDER_PROFILES = [
  "local_review_v1",
  "editorial_v1",
] as const;
export type VoxyLocalCompositionRenderProfile =
  (typeof VOXY_LOCAL_COMPOSITION_RENDER_PROFILES)[number];

export const VOXY_LOCAL_COMPOSITION_SCENE_IDS = [
  "opening",
  "explanation",
  "contrast",
  "invitation",
] as const;
export type VoxyLocalCompositionSceneId =
  (typeof VOXY_LOCAL_COMPOSITION_SCENE_IDS)[number];

export type VoxyLocalCompositionSceneContent = {
  id: VoxyLocalCompositionSceneId;
  kicker: string;
  headline: string;
  detail: string;
  sourceIds: string[];
};

export type VoxyLocalCompositionCaptionCue = {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
};

export type VoxyLocalCompositionEditorialBinding = {
  studioDraftId: string;
  studioDraftRevision: number;
  storyPlanId: string;
  storyPlanRevision: number;
  evidenceSourcePackId: string;
  evidenceDecisionGateId: string;
  finalCanonId: string;
};

export type VoxyLocalCompositionRequest = {
  requestedByUserId: string;
  artifactId: string;
  briefingId: string;
  scriptVersion: string;
  locale: string;
  format: VoxyVideoFormat;
  renderProfile: VoxyLocalCompositionRenderProfile;
  timelineVersion: string;
  audioAssetId: string;
  sceneContent: VoxyLocalCompositionSceneContent[];
  captionCues: VoxyLocalCompositionCaptionCue[];
  editorialStoryPlan?: VoxyEditorialStoryPlan | null;
  editorialTimeline?: VoxyEditorialTimeline | null;
  editorialBinding?: VoxyLocalCompositionEditorialBinding | null;
};

export const VOXY_LOCAL_COMPOSITION_APPROVAL_SOURCES = ["human", "agent_council"] as const;
export type VoxyLocalCompositionApprovalSource =
  (typeof VOXY_LOCAL_COMPOSITION_APPROVAL_SOURCES)[number];

export type VoxyLocalCompositionApprovalSnapshot = {
  approved: boolean;
  approvalRef: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  previewReviewFlowId: string | null;
  decisionGateId: string | null;
  dossierRefId: string | null;
  /** Missing only for the historical local_review_v1 compatibility profile. */
  approvalSource?: VoxyLocalCompositionApprovalSource | null;
  /** Required for agent_council editorial approvals; null for human/legacy approvals. */
  councilArtifactId?: string | null;
  authority: "trusted_review_authority";
};

export type VoxyLocalCompositionAudioAsset = {
  assetId: string;
  absolutePath: string;
  allowedRoot: string;
  sha256: string;
  durationMs: number;
};

export type VoxyLocalCompositionJob = {
  jobId: string;
  outputId: string;
  identityKey: string;
  inputFingerprint: string;
  reviewBindingHash: string;
  requestedByUserId: string;
  artifactId: string;
  briefingId: string;
  scriptVersion: string;
  locale: string;
  format: VoxyVideoFormat;
  renderProfile: VoxyLocalCompositionRenderProfile;
  timelineVersion: string;
  timelineHash: string;
  durationMs?: number;
  audioAssetId: string;
  previewReviewFlowId: string;
  decisionGateId: string;
  dossierRefId: string | null;
  /** Persisted when known; absent/null is tolerated only for historical local_review_v1 jobs. */
  approvalSource?: VoxyLocalCompositionApprovalSource | null;
  councilArtifactId?: string | null;
  status: VoxyLocalCompositionStatus;
  attempt: number;
  approvalRef: string;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  safeErrorCode: string | null;
  safeErrorMessage: string | null;
  reviewRequired: true;
  autoPublish: false;
  uploadTriggered: false;
  publishTriggered: false;
  socialPostTriggered: false;
};

export type VoxyLocalCompositionMediaFile = {
  storageKey: string;
  sha256: string;
  sizeBytes: number;
  durationMs: number | null;
  width: number | null;
  height: number | null;
  mimeType: string;
};

export type VoxyLocalCompositionOutput = {
  outputId: string;
  jobId: string;
  identityKey: string;
  inputFingerprint: string;
  reviewBindingHash: string;
  timelineHash: string;
  format: VoxyVideoFormat;
  renderProfile: VoxyLocalCompositionRenderProfile;
  locale: string;
  previewReviewFlowId: string;
  decisionGateId: string;
  dossierRefId: string | null;
  /** Mirrored from the render job for immutable audit lineage. */
  approvalSource?: VoxyLocalCompositionApprovalSource | null;
  councilArtifactId?: string | null;
  masterMp4: VoxyLocalCompositionMediaFile;
  previewWebm: VoxyLocalCompositionMediaFile;
  captionsVtt: VoxyLocalCompositionMediaFile;
  captionsSrt: VoxyLocalCompositionMediaFile;
  createdAt: string;
  reviewStatus: "needs_review";
  reviewRequired: true;
  publicAsset: false;
  uploaded: false;
  scheduled: false;
  socialPosted: false;
  published: false;
};

export type VoxyLocalCompositionExecutionResult = {
  output: VoxyLocalCompositionOutput;
  externalRequestCount: number;
  ffmpegShellInterpolationUsed: false;
  lipSyncUsed: false;
  externalAvatarProviderUsed: false;
};

export type VoxyLocalCompositionQueueResult =
  | { ok: true; status: "queued" | "existing"; job: VoxyLocalCompositionJob }
  | {
      ok: false;
      status: "blocked_by_missing_approval" | "invalid_request" | "idempotency_conflict";
      job: null;
      errors: string[];
    };

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:@-]{0,159}$/;
const SAFE_LOCALE = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;
const SHA256 = /^[0-9a-f]{64}$/;
const LEGACY_FIXTURE_DURATION_MS = 8_000;
const FINAL_CANON_DIMENSIONS: Readonly<
  Record<VoxyVideoFormat, { width: number; height: number }>
> = {
  "16:9": { width: 1920, height: 1080 },
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
};

function normalized(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function validId(value: string): boolean {
  return SAFE_ID.test(value) && !value.includes("..") && !value.includes("/") && !value.includes("\\");
}

export function getVoxyLocalCompositionDimensions(
  format: VoxyVideoFormat,
  renderProfile: VoxyLocalCompositionRenderProfile,
): { width: number; height: number } {
  if (renderProfile === "editorial_v1") return { ...FINAL_CANON_DIMENSIONS[format] };
  return getVoxyFixtureDimensions(format);
}

export function resolveVoxyLocalCompositionDurationMs(
  input: Pick<VoxyLocalCompositionRequest, "renderProfile" | "editorialTimeline">,
): number {
  if (input.renderProfile === "local_review_v1") return LEGACY_FIXTURE_DURATION_MS;
  const duration = input.editorialTimeline?.durationMs;
  if (!Number.isInteger(duration) || !duration || duration < 1) {
    throw new Error("editorial_timeline_duration_missing");
  }
  return duration;
}

function canonicalRequestPayload(input: VoxyLocalCompositionRequest) {
  return {
    requestedByUserId: normalized(input.requestedByUserId),
    artifactId: normalized(input.artifactId),
    briefingId: normalized(input.briefingId),
    scriptVersion: normalized(input.scriptVersion),
    locale: normalized(input.locale).toLowerCase(),
    format: input.format,
    renderProfile: input.renderProfile,
    timelineVersion: normalized(input.timelineVersion),
    audioAssetId: normalized(input.audioAssetId),
    sceneContent: input.sceneContent.map((scene) => ({
      id: scene.id,
      kicker: normalized(scene.kicker),
      headline: normalized(scene.headline),
      detail: normalized(scene.detail),
      sourceIds: scene.sourceIds.map(normalized),
    })),
    captionCues: input.captionCues.map((cue) => ({
      id: normalized(cue.id),
      startMs: Math.trunc(cue.startMs),
      endMs: Math.trunc(cue.endMs),
      text: normalized(cue.text),
    })),
    editorialStoryPlan: input.editorialStoryPlan ?? null,
    editorialTimeline: input.editorialTimeline ?? null,
    editorialBinding: input.editorialBinding
      ? {
          studioDraftId: normalized(input.editorialBinding.studioDraftId),
          studioDraftRevision: Math.trunc(input.editorialBinding.studioDraftRevision),
          storyPlanId: normalized(input.editorialBinding.storyPlanId),
          storyPlanRevision: Math.trunc(input.editorialBinding.storyPlanRevision),
          evidenceSourcePackId: normalized(input.editorialBinding.evidenceSourcePackId),
          evidenceDecisionGateId: normalized(input.editorialBinding.evidenceDecisionGateId),
          finalCanonId: normalized(input.editorialBinding.finalCanonId),
        }
      : null,
  };
}

function validateLegacyFixtureScenes(input: VoxyLocalCompositionRequest, errors: string[]) {
  const seenScenes = new Set<string>();
  for (const scene of input.sceneContent) {
    if (!VOXY_LOCAL_COMPOSITION_SCENE_IDS.includes(scene.id)) errors.push(`scene_id_invalid:${scene.id}`);
    if (seenScenes.has(scene.id)) errors.push(`scene_id_duplicate:${scene.id}`);
    seenScenes.add(scene.id);
    if (!normalized(scene.kicker) || !normalized(scene.headline) || !normalized(scene.detail)) {
      errors.push(`scene_copy_missing:${scene.id}`);
    }
    if (scene.sourceIds.some((sourceId) => !validId(normalized(sourceId)))) {
      errors.push(`scene_source_id_invalid:${scene.id}`);
    }
    if ((scene.id === "explanation" || scene.id === "contrast") && scene.sourceIds.length === 0) {
      errors.push(`scene_source_required:${scene.id}`);
    }
  }
  for (const required of VOXY_LOCAL_COMPOSITION_SCENE_IDS) {
    if (!seenScenes.has(required)) errors.push(`scene_missing:${required}`);
  }
  if (input.sceneContent.length !== VOXY_LOCAL_COMPOSITION_SCENE_IDS.length) {
    errors.push("scene_count_invalid");
  }
  if (input.editorialStoryPlan || input.editorialTimeline || input.editorialBinding) {
    errors.push("legacy_fixture_must_not_bind_editorial_plan");
  }
}

function validateEditorialBinding(input: VoxyLocalCompositionRequest, errors: string[]) {
  if (input.sceneContent.length !== 0) errors.push("editorial_scene_content_must_be_empty");
  const plan = input.editorialStoryPlan;
  const timeline = input.editorialTimeline;
  if (!plan) errors.push("editorial_story_plan_missing");
  if (!timeline) errors.push("editorial_timeline_missing");
  if (!plan || !timeline) return;

  if (plan.version !== VOXY_EDITORIAL_STORY_PLAN_VERSION) errors.push("editorial_story_plan_version_invalid");
  if (plan.briefingId !== normalized(input.briefingId)) errors.push("editorial_briefing_binding_mismatch");
  if (plan.outputLanguage.toLowerCase() !== normalized(input.locale).toLowerCase()) {
    errors.push("editorial_locale_binding_mismatch");
  }
  if (normalized(input.scriptVersion) !== `story-r${plan.revision}`) {
    errors.push("editorial_script_revision_binding_mismatch");
  }
  if (
    timeline.storyPlanId !== plan.storyPlanId ||
    timeline.storyPlanRevision !== plan.revision ||
    timeline.durationClass !== plan.durationClass
  ) {
    errors.push("editorial_timeline_story_binding_mismatch");
  }
  const binding = input.editorialBinding;
  if (!binding) {
    errors.push("editorial_binding_missing");
  } else {
    if (
      !validId(normalized(binding.studioDraftId)) ||
      normalized(binding.studioDraftId) !== normalized(input.artifactId)
    ) {
      errors.push("editorial_studio_draft_binding_mismatch");
    }
    if (!Number.isInteger(binding.studioDraftRevision) || binding.studioDraftRevision < 1) {
      errors.push("editorial_studio_draft_revision_invalid");
    }
    if (
      normalized(binding.storyPlanId) !== plan.storyPlanId ||
      binding.storyPlanRevision !== plan.revision
    ) {
      errors.push("editorial_binding_story_revision_mismatch");
    }
    if (!normalized(binding.evidenceSourcePackId) || normalized(binding.evidenceSourcePackId).length > 320) {
      errors.push("editorial_evidence_source_pack_binding_invalid");
    }
    if (!normalized(binding.evidenceDecisionGateId) || normalized(binding.evidenceDecisionGateId).length > 512) {
      errors.push("editorial_evidence_decision_gate_binding_invalid");
    }
    if (normalized(binding.finalCanonId) !== VOXY_FINAL_CANON.canonId) {
      errors.push("editorial_final_canon_binding_mismatch");
    }
  }
  const limits = VOXY_EDITORIAL_DURATION_LIMITS_MS[plan.durationClass];
  if (
    !Number.isInteger(timeline.durationMs) ||
    timeline.durationMs < limits.min ||
    timeline.durationMs > limits.max
  ) {
    errors.push("editorial_timeline_duration_out_of_range");
  }
  if (timeline.chapters.length !== plan.chapters.length) {
    errors.push("editorial_timeline_chapter_count_mismatch");
  }
  let cursor = 0;
  for (let index = 0; index < timeline.chapters.length; index += 1) {
    const entry = timeline.chapters[index];
    const chapter = plan.chapters[index];
    if (!entry || !chapter) continue;
    if (entry.chapterId !== chapter.chapterId || entry.role !== chapter.role || entry.motion !== chapter.motion) {
      errors.push(`editorial_timeline_chapter_binding_mismatch:${chapter.chapterId}`);
    }
    if (entry.startMs !== cursor || entry.endMs <= entry.startMs) {
      errors.push(`editorial_timeline_chapter_range_invalid:${entry.chapterId}`);
    }
    cursor = entry.endMs;
  }
  if (cursor !== timeline.durationMs) errors.push("editorial_timeline_not_contiguous");
}

export function validateVoxyLocalCompositionRequest(
  input: VoxyLocalCompositionRequest,
): string[] {
  const errors: string[] = [];
  const ids = [
    ["requested_by", input.requestedByUserId],
    ["artifact", input.artifactId],
    ["briefing", input.briefingId],
    ["script_version", input.scriptVersion],
    ["timeline_version", input.timelineVersion],
    ["audio_asset", input.audioAssetId],
  ] as const;
  for (const [name, value] of ids) {
    if (!validId(normalized(value))) errors.push(`${name}_id_invalid`);
  }
  if (!SAFE_LOCALE.test(normalized(input.locale))) errors.push("locale_invalid");
  if (!(["16:9", "9:16", "1:1"] as const).includes(input.format)) errors.push("format_invalid");
  if (!VOXY_LOCAL_COMPOSITION_RENDER_PROFILES.includes(input.renderProfile)) {
    errors.push("render_profile_invalid");
  }

  if (input.renderProfile === "editorial_v1") validateEditorialBinding(input, errors);
  else validateLegacyFixtureScenes(input, errors);

  if (input.captionCues.length === 0) errors.push("caption_cues_missing");
  let previousEnd = 0;
  for (const cue of input.captionCues) {
    if (!validId(normalized(cue.id))) errors.push(`caption_id_invalid:${cue.id}`);
    if (!normalized(cue.text)) errors.push(`caption_text_missing:${cue.id}`);
    if (!Number.isFinite(cue.startMs) || !Number.isFinite(cue.endMs)) {
      errors.push(`caption_time_invalid:${cue.id}`);
      continue;
    }
    if (cue.startMs < previousEnd || cue.endMs <= cue.startMs) {
      errors.push(`caption_timeline_invalid:${cue.id}`);
    }
    previousEnd = cue.endMs;
  }
  if (input.captionCues[0]?.startMs !== 0) errors.push("caption_timeline_must_start_at_zero");
  try {
    const expectedDurationMs = resolveVoxyLocalCompositionDurationMs(input);
    if (previousEnd !== expectedDurationMs) {
      errors.push(
        input.renderProfile === "local_review_v1"
          ? "caption_timeline_must_match_fixture_duration"
          : "caption_timeline_must_match_editorial_duration",
      );
    }
  } catch {
    if (input.renderProfile === "editorial_v1") errors.push("editorial_timeline_duration_missing");
  }
  return Array.from(new Set(errors));
}

export function buildVoxyLocalCompositionIdentityKey(
  input: VoxyLocalCompositionRequest,
): string {
  const payload = canonicalRequestPayload(input);
  const identityParts = [
    payload.briefingId,
    payload.scriptVersion,
    payload.locale,
    payload.format,
    payload.renderProfile,
  ];
  if (input.renderProfile === "editorial_v1" && payload.editorialBinding) {
    identityParts.push(
      payload.artifactId,
      String(payload.editorialBinding.studioDraftRevision),
      payload.editorialBinding.evidenceSourcePackId,
      payload.editorialBinding.finalCanonId,
    );
  }
  return `voxy-local-composition:${stableHash(identityParts.join(":")).slice(0, 32)}`;
}

export function buildVoxyLocalCompositionInputFingerprint(
  input: VoxyLocalCompositionRequest,
): string {
  return stableHash(JSON.stringify(canonicalRequestPayload(input)));
}

export function buildVoxyLocalCompositionTimelineHash(
  input: VoxyLocalCompositionRequest,
): string {
  const payload = canonicalRequestPayload(input);
  return stableHash(
    JSON.stringify({
      timelineVersion: normalized(input.timelineVersion),
      sceneContent: payload.sceneContent,
      captionCues: payload.captionCues,
      editorialStoryPlan: payload.editorialStoryPlan,
      editorialTimeline: payload.editorialTimeline,
    }),
  );
}

export function buildVoxyLocalCompositionReviewBindingHash(
  input: Pick<
    VoxyLocalCompositionApprovalSnapshot,
    | "approvalRef"
    | "previewReviewFlowId"
    | "decisionGateId"
    | "dossierRefId"
    | "approvalSource"
    | "councilArtifactId"
  >,
): string {
  const legacyParts = [
    normalized(input.approvalRef),
    normalized(input.previewReviewFlowId),
    normalized(input.decisionGateId),
    normalized(input.dossierRefId),
  ];
  const approvalSource = normalized(input.approvalSource);
  if (!approvalSource) return stableHash(legacyParts.join(":"));
  return stableHash(
    [
      ...legacyParts,
      approvalSource,
      normalized(input.councilArtifactId),
    ].join(":"),
  );
}

export function buildQueuedVoxyLocalCompositionJob(input: {
  request: VoxyLocalCompositionRequest;
  approval: VoxyLocalCompositionApprovalSnapshot;
  now?: string;
}): VoxyLocalCompositionJob {
  const approvalRef = normalized(input.approval.approvalRef);
  const previewReviewFlowId = normalized(input.approval.previewReviewFlowId);
  const decisionGateId = normalized(input.approval.decisionGateId);
  const dossierRefId = normalized(input.approval.dossierRefId) || null;
  const approvalSource = normalized(input.approval.approvalSource) as
    | VoxyLocalCompositionApprovalSource
    | "";
  const councilArtifactId = normalized(input.approval.councilArtifactId) || null;
  if (
    !input.approval.approved ||
    !validId(approvalRef) ||
    !validId(previewReviewFlowId) ||
    !validId(decisionGateId) ||
    (dossierRefId !== null && !validId(dossierRefId))
  ) {
    throw new Error("voxy_local_composition_approval_required");
  }
  if (input.request.renderProfile === "editorial_v1") {
    if (!VOXY_LOCAL_COMPOSITION_APPROVAL_SOURCES.includes(approvalSource as VoxyLocalCompositionApprovalSource)) {
      throw new Error("voxy_local_composition_editorial_approval_source_required");
    }
    if (approvalSource === "agent_council") {
      if (!councilArtifactId || !validId(councilArtifactId)) {
        throw new Error("voxy_local_composition_council_artifact_required");
      }
      if (!normalized(input.approval.approvedBy).startsWith("agent:voxy-chief-judge:")) {
        throw new Error("voxy_local_composition_council_approval_actor_invalid");
      }
    } else if (councilArtifactId !== null) {
      throw new Error("voxy_local_composition_human_approval_council_artifact_forbidden");
    }
  }
  if (
    input.request.renderProfile === "editorial_v1" &&
    input.request.editorialBinding &&
    normalized(input.request.editorialBinding.evidenceDecisionGateId) !== decisionGateId
  ) {
    throw new Error("voxy_local_composition_editorial_approval_binding_mismatch");
  }
  const errors = validateVoxyLocalCompositionRequest(input.request);
  if (errors.length) throw new Error(`voxy_local_composition_request_invalid:${errors.join(",")}`);
  const identityKey = buildVoxyLocalCompositionIdentityKey(input.request);
  const inputFingerprint = buildVoxyLocalCompositionInputFingerprint(input.request);
  const durationMs = resolveVoxyLocalCompositionDurationMs(input.request);
  const now = input.now ?? new Date().toISOString();
  const hash = stableHash(identityKey).slice(0, 32);
  return {
    jobId: `voxy-local-job:${hash}`,
    outputId: `voxy-local-output:${hash}`,
    identityKey,
    inputFingerprint,
    reviewBindingHash: buildVoxyLocalCompositionReviewBindingHash(input.approval),
    requestedByUserId: normalized(input.request.requestedByUserId),
    artifactId: normalized(input.request.artifactId),
    briefingId: normalized(input.request.briefingId),
    scriptVersion: normalized(input.request.scriptVersion),
    locale: normalized(input.request.locale).toLowerCase(),
    format: input.request.format,
    renderProfile: input.request.renderProfile,
    timelineVersion: normalized(input.request.timelineVersion),
    timelineHash: buildVoxyLocalCompositionTimelineHash(input.request),
    durationMs,
    audioAssetId: normalized(input.request.audioAssetId),
    previewReviewFlowId,
    decisionGateId,
    dossierRefId,
    approvalSource: approvalSource || null,
    councilArtifactId,
    status: "queued",
    attempt: 1,
    approvalRef,
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    completedAt: null,
    safeErrorCode: null,
    safeErrorMessage: null,
    reviewRequired: true,
    autoPublish: false,
    uploadTriggered: false,
    publishTriggered: false,
    socialPostTriggered: false,
  };
}

export function validateVoxyLocalCompositionAudioAsset(
  input: VoxyLocalCompositionAudioAsset,
  options?: { expectedDurationMs?: number; toleranceMs?: number },
): string[] {
  const errors: string[] = [];
  if (!validId(normalized(input.assetId))) errors.push("audio_asset_id_invalid");
  if (!input.absolutePath || !input.allowedRoot) errors.push("audio_path_missing");
  if (!SHA256.test(normalized(input.sha256).toLowerCase())) errors.push("audio_sha256_invalid");
  const expectedDurationMs = options?.expectedDurationMs ?? LEGACY_FIXTURE_DURATION_MS;
  const toleranceMs = Math.max(0, options?.toleranceMs ?? 600);
  if (
    !Number.isFinite(input.durationMs) ||
    !Number.isFinite(expectedDurationMs) ||
    Math.abs(input.durationMs - expectedDurationMs) > toleranceMs
  ) {
    errors.push("audio_duration_out_of_tolerance");
  }
  return errors;
}

export function validateVoxyLocalCompositionOutput(input: {
  job: VoxyLocalCompositionJob;
  output: VoxyLocalCompositionOutput;
}): string[] {
  const errors: string[] = [];
  const expected = getVoxyLocalCompositionDimensions(input.job.format, input.job.renderProfile);
  const expectedDurationMs =
    input.job.renderProfile === "editorial_v1"
      ? input.job.durationMs
      : input.job.durationMs ?? LEGACY_FIXTURE_DURATION_MS;
  const media = [input.output.masterMp4, input.output.previewWebm];
  if (input.output.jobId !== input.job.jobId || input.output.outputId !== input.job.outputId) {
    errors.push("output_identity_mismatch");
  }
  if (
    input.output.identityKey !== input.job.identityKey ||
    input.output.inputFingerprint !== input.job.inputFingerprint ||
    input.output.reviewBindingHash !== input.job.reviewBindingHash ||
    input.output.timelineHash !== input.job.timelineHash ||
    input.output.previewReviewFlowId !== input.job.previewReviewFlowId ||
    input.output.decisionGateId !== input.job.decisionGateId ||
    input.output.dossierRefId !== input.job.dossierRefId ||
    (input.output.approvalSource ?? null) !== (input.job.approvalSource ?? null) ||
    (input.output.councilArtifactId ?? null) !== (input.job.councilArtifactId ?? null)
  ) {
    errors.push("output_revision_binding_mismatch");
  }
  if (input.output.renderProfile !== input.job.renderProfile) {
    errors.push("output_render_profile_mismatch");
  }
  if (input.job.renderProfile === "editorial_v1" && !Number.isInteger(expectedDurationMs)) {
    errors.push("output_editorial_duration_missing");
  }
  if (input.job.renderProfile === "editorial_v1") {
    if (!VOXY_LOCAL_COMPOSITION_APPROVAL_SOURCES.includes(input.job.approvalSource as VoxyLocalCompositionApprovalSource)) {
      errors.push("output_editorial_approval_source_missing");
    }
    if (
      input.job.approvalSource === "agent_council" &&
      (!input.job.councilArtifactId || !validId(input.job.councilArtifactId))
    ) {
      errors.push("output_editorial_council_artifact_missing");
    }
    if (input.job.approvalSource === "human" && input.job.councilArtifactId) {
      errors.push("output_human_council_artifact_forbidden");
    }
  }
  for (const file of [
    input.output.masterMp4,
    input.output.previewWebm,
    input.output.captionsVtt,
    input.output.captionsSrt,
  ]) {
    if (!file.storageKey || file.storageKey.startsWith("/") || file.storageKey.includes("..")) {
      errors.push("output_storage_key_invalid");
    }
    if (!SHA256.test(file.sha256)) errors.push("output_sha256_invalid");
    if (!Number.isFinite(file.sizeBytes) || file.sizeBytes <= 0 || file.sizeBytes > 250_000_000) {
      errors.push("output_size_invalid");
    }
  }
  for (const file of media) {
    if (file.width !== expected.width || file.height !== expected.height) {
      errors.push("output_dimensions_invalid");
    }
    if (
      file.durationMs === null ||
      !Number.isFinite(expectedDurationMs) ||
      Math.abs(file.durationMs - Number(expectedDurationMs)) > 650
    ) {
      errors.push("output_duration_invalid");
    }
  }
  if (
    input.output.reviewRequired !== true ||
    input.output.reviewStatus !== "needs_review" ||
    input.output.publicAsset !== false ||
    input.output.uploaded !== false ||
    input.output.scheduled !== false ||
    input.output.socialPosted !== false ||
    input.output.published !== false
  ) {
    errors.push("review_first_output_contract_broken");
  }
  return Array.from(new Set(errors));
}

export function safeVoxyLocalCompositionFailure(error: unknown): {
  code: string;
  message: string;
} {
  const raw = error instanceof Error ? error.message : String(error ?? "unknown");
  const known = raw.split(":", 1)[0]?.replace(/[^a-z0-9_]/gi, "_").toLowerCase() || "render_failed";
  return {
    code: known.slice(0, 80),
    message: "Die lokale Voxy-Vorschau konnte nicht erstellt werden. Es wurde nichts hochgeladen oder veröffentlicht.",
  };
}
