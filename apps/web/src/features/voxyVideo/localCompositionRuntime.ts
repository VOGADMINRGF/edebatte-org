import { stableHash } from "@core/utils/hash";
import { getVoxyFixtureDimensions } from "@/features/voxyVideo/characterMotionFixture";
import type { VoxyVideoFormat } from "@/features/voxyVideo/modernCharacterContracts";

export const VOXY_LOCAL_COMPOSITION_STATUSES = [
  "queued",
  "rendering",
  "rendered",
  "failed",
  "review_ready",
] as const;

export type VoxyLocalCompositionStatus =
  (typeof VOXY_LOCAL_COMPOSITION_STATUSES)[number];

export const VOXY_LOCAL_COMPOSITION_RENDER_PROFILES = ["local_review_v1"] as const;
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
};

export type VoxyLocalCompositionApprovalSnapshot = {
  approved: boolean;
  approvalRef: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  previewReviewFlowId: string | null;
  decisionGateId: string | null;
  dossierRefId: string | null;
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
  audioAssetId: string;
  previewReviewFlowId: string;
  decisionGateId: string;
  dossierRefId: string | null;
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

function normalized(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function validId(value: string): boolean {
  return SAFE_ID.test(value) && !value.includes("..") && !value.includes("/") && !value.includes("\\");
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
  };
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
  if (previousEnd !== 8_000) errors.push("caption_timeline_must_match_fixture_duration");
  return Array.from(new Set(errors));
}

export function buildVoxyLocalCompositionIdentityKey(
  input: VoxyLocalCompositionRequest,
): string {
  const payload = canonicalRequestPayload(input);
  return `voxy-local-composition:${stableHash(
    [
      payload.briefingId,
      payload.scriptVersion,
      payload.locale,
      payload.format,
      payload.renderProfile,
    ].join(":"),
  ).slice(0, 32)}`;
}

export function buildVoxyLocalCompositionInputFingerprint(
  input: VoxyLocalCompositionRequest,
): string {
  return stableHash(JSON.stringify(canonicalRequestPayload(input)));
}

export function buildVoxyLocalCompositionTimelineHash(
  input: VoxyLocalCompositionRequest,
): string {
  return stableHash(
    JSON.stringify({
      timelineVersion: normalized(input.timelineVersion),
      sceneContent: canonicalRequestPayload(input).sceneContent,
      captionCues: canonicalRequestPayload(input).captionCues,
    }),
  );
}

export function buildVoxyLocalCompositionReviewBindingHash(
  input: Pick<
    VoxyLocalCompositionApprovalSnapshot,
    "approvalRef" | "previewReviewFlowId" | "decisionGateId" | "dossierRefId"
  >,
): string {
  return stableHash(
    [
      normalized(input.approvalRef),
      normalized(input.previewReviewFlowId),
      normalized(input.decisionGateId),
      normalized(input.dossierRefId),
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
  if (
    !input.approval.approved ||
    !validId(approvalRef) ||
    !validId(previewReviewFlowId) ||
    !validId(decisionGateId) ||
    (dossierRefId !== null && !validId(dossierRefId))
  ) {
    throw new Error("voxy_local_composition_approval_required");
  }
  const errors = validateVoxyLocalCompositionRequest(input.request);
  if (errors.length) throw new Error(`voxy_local_composition_request_invalid:${errors.join(",")}`);
  const identityKey = buildVoxyLocalCompositionIdentityKey(input.request);
  const inputFingerprint = buildVoxyLocalCompositionInputFingerprint(input.request);
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
    audioAssetId: normalized(input.request.audioAssetId),
    previewReviewFlowId,
    decisionGateId,
    dossierRefId,
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
): string[] {
  const errors: string[] = [];
  if (!validId(normalized(input.assetId))) errors.push("audio_asset_id_invalid");
  if (!input.absolutePath || !input.allowedRoot) errors.push("audio_path_missing");
  if (!SHA256.test(normalized(input.sha256).toLowerCase())) errors.push("audio_sha256_invalid");
  if (!Number.isFinite(input.durationMs) || Math.abs(input.durationMs - 8_000) > 600) {
    errors.push("audio_duration_out_of_tolerance");
  }
  return errors;
}

export function validateVoxyLocalCompositionOutput(input: {
  job: VoxyLocalCompositionJob;
  output: VoxyLocalCompositionOutput;
}): string[] {
  const errors: string[] = [];
  const expected = getVoxyFixtureDimensions(input.job.format);
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
    input.output.dossierRefId !== input.job.dossierRefId
  ) {
    errors.push("output_revision_binding_mismatch");
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
    if (file.durationMs === null || Math.abs(file.durationMs - 8_000) > 650) {
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
