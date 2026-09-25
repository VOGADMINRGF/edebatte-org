import { buildVoxyEditorialScriptVersion } from "@/features/voxyVideo/editorialLanguageVariant";
import "server-only";

import { stableHash } from "@core/utils/hash";
import {
  getReviewQueueOperationsRepository,
  type ReviewQueueOperationAuditEvent,
  type ReviewQueueOperationRecord,
  type ReviewQueueOperationsRepository,
} from "@features/reviewQueueOperations";
import type {
  VoxyLocalCompositionJob,
  VoxyLocalCompositionOutput,
} from "./localCompositionRuntime";
import {
  getVoxyLocalCompositionRepository,
  type VoxyLocalCompositionRepository,
} from "./localCompositionRuntimeStore";
import {
  validateVoxyEditorialStoryPlan,
  type VoxyEditorialEvidenceContext,
  type VoxyEditorialStoryPlanValidation,
} from "./editorialStoryPlan";
import {
  applyVoxyStudioDraftEdit,
  buildVoxyStudioRenderReviewGateId,
  validateVoxyStudioDraft,
  VOXY_STUDIO_DRAFT_GUARDRAILS,
  VOXY_STUDIO_DRAFT_VERSION,
  type VoxyStudioDraft,
  type VoxyStudioDraftEditablePatch,
  type VoxyStudioReviewApproval,
  type VoxyStudioReviewApprovalSource,
} from "./studioDraft";
import {
  buildVoxyStudioDraftAuditEvent,
  buildVoxyStudioDraftId,
  buildVoxyStudioDraftIdempotencyKey,
  getVoxyStudioDraftRepository,
  type VoxyStudioDraftRepository,
} from "./studioDraftStore";
import { mergeVoxyStudioAllFormatLayoutSafetyIntoValidation } from "./studioLayoutSafety";

export type VoxyStudioEvidenceAuthority = {
  resolveEvidenceContext(
    draft: VoxyStudioDraft,
  ): Promise<VoxyEditorialEvidenceContext>;
};

export type VoxyStudioEditorialReviewAuthorityResult = {
  persistenceMode: "persistent_primary" | "in_memory_fallback";
  record: ReviewQueueOperationRecord | null;
  auditEvents: ReviewQueueOperationAuditEvent[];
};

export type VoxyStudioEditorialReviewAuthority = {
  resolveEditorialReview(input: {
    draft: VoxyStudioDraft;
    reviewItemId: string;
    decisionGateId: string;
  }): Promise<VoxyStudioEditorialReviewAuthorityResult>;
};

export type VoxyStudioCompositionAuthority = {
  resolveComposition(input: {
    jobId: string;
    outputId: string;
  }): Promise<{
    job: VoxyLocalCompositionJob | null;
    output: VoxyLocalCompositionOutput | null;
  }>;
};

export type VoxyStudioDraftServiceDependencies = {
  repository: VoxyStudioDraftRepository;
  evidenceAuthority: VoxyStudioEvidenceAuthority;
  editorialReviewAuthority: VoxyStudioEditorialReviewAuthority;
  compositionAuthority: VoxyStudioCompositionAuthority;
  now?: () => string;
  allowInMemoryEditorialReviewForTests?: boolean;
};

export type VoxyStudioCreateDraftInput = {
  clientRequestId: string;
  sourceKind: VoxyStudioDraft["sourceKind"];
  dossierId: string | null;
  briefingId: string;
  title: string;
  storyPlan: VoxyStudioDraft["storyPlan"];
  selectedFormat: VoxyStudioDraft["selectedFormat"];
  safeZoneProfile: VoxyStudioDraft["safeZoneProfile"];
  createdByUserId: string;
};

const SAFE_ID = /^[a-zA-Z0-9][a-zA-Z0-9._:@-]{0,159}$/;
const EDITABLE_PATCH_KEYS = new Set([
  "title",
  "storyPlan",
  "selectedFormat",
  "safeZoneProfile",
  "captionAdjustments",
]);

function normalize(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function now(deps: VoxyStudioDraftServiceDependencies): string {
  return deps.now?.() ?? new Date().toISOString();
}

function requireActor(actorId: string) {
  const normalized = normalize(actorId);
  if (!SAFE_ID.test(normalized)) throw new Error("voxy_studio_actor_invalid");
  return normalized;
}

function assertEditablePatchKeys(patch: VoxyStudioDraftEditablePatch) {
  const invalid = Object.keys(patch as Record<string, unknown>).filter(
    (key) => !EDITABLE_PATCH_KEYS.has(key),
  );
  if (invalid.length) {
    throw new Error(`voxy_studio_patch_field_forbidden:${invalid.sort().join(",")}`);
  }
}

async function requireDraft(
  repository: VoxyStudioDraftRepository,
  draftId: string,
): Promise<VoxyStudioDraft> {
  const draft = await repository.getDraft(draftId);
  if (!draft) throw new Error("voxy_studio_draft_missing");
  return draft;
}

export async function resolveVoxyStudioDraftRevisionAuthorActor(
  draft: Pick<VoxyStudioDraft, "draftId" | "revision" | "storyPlan">,
  repository: VoxyStudioDraftRepository = getVoxyStudioDraftRepository(),
): Promise<string> {
  if (repository.getPersistenceState().mode !== "persistent_primary") {
    throw new Error("voxy_studio_revision_author_not_persistent");
  }
  const audits = await repository.listAuditEvents(draft.draftId);
  const authoringEvent = audits.find(
    (event) =>
      event.draftId === draft.draftId &&
      event.draftRevision === draft.revision &&
      event.storyPlanRevision === draft.storyPlan.revision &&
      (event.action === "created" || event.action === "edited"),
  );
  if (!authoringEvent) {
    throw new Error("voxy_studio_revision_author_audit_missing");
  }
  return requireActor(authoringEvent.byUserId);
}

async function replaceDraftOrThrow(input: {
  repository: VoxyStudioDraftRepository;
  current: VoxyStudioDraft;
  next: VoxyStudioDraft;
}) {
  const replaced = await input.repository.replaceDraftIfRevision({
    draftId: input.current.draftId,
    expectedRevision: input.current.revision,
    expectedStatus: input.current.status,
    next: input.next,
  });
  if (!replaced) throw new Error("voxy_studio_revision_conflict");
  return input.next;
}

type VoxyStudioCurrentStoryReview = {
  evidence: VoxyEditorialEvidenceContext;
  validation: VoxyEditorialStoryPlanValidation;
};

async function resolveCurrentStoryReview(
  draft: VoxyStudioDraft,
  deps: VoxyStudioDraftServiceDependencies,
): Promise<VoxyStudioCurrentStoryReview> {
  const evidence = await deps.evidenceAuthority.resolveEvidenceContext(draft);
  const editorialValidation = validateVoxyEditorialStoryPlan(draft.storyPlan, evidence);
  return {
    evidence,
    validation: mergeVoxyStudioAllFormatLayoutSafetyIntoValidation({
      draft,
      validation: editorialValidation,
    }),
  };
}

async function validateCurrentStory(
  draft: VoxyStudioDraft,
  deps: VoxyStudioDraftServiceDependencies,
): Promise<VoxyEditorialStoryPlanValidation> {
  return (await resolveCurrentStoryReview(draft, deps)).validation;
}

function evidenceBindingToken(sourcePackId: string): string {
  const normalized = normalize(sourcePackId);
  if (!normalized) throw new Error("voxy_studio_evidence_source_pack_binding_missing");
  return stableHash(normalized).slice(0, 24);
}

export function buildVoxyStudioEvidenceBoundRenderReviewGateId(
  draft: Pick<VoxyStudioDraft, "draftId" | "revision" | "storyPlan">,
  evidenceSourcePackId: string,
): string {
  return `${buildVoxyStudioRenderReviewGateId(draft)}:evidence-${evidenceBindingToken(
    evidenceSourcePackId,
  )}`;
}

export function buildVoxyStudioEditorialReviewItemId(
  draft: Pick<VoxyStudioDraft, "draftId" | "revision" | "storyPlan">,
  evidenceSourcePackId?: string | null,
): string {
  const base = `voxy-studio-editorial:${draft.draftId}:r${draft.revision}:story-r${draft.storyPlan.revision}`;
  const sourcePackId = normalize(evidenceSourcePackId);
  return sourcePackId
    ? `${base}:evidence-${evidenceBindingToken(sourcePackId)}`
    : base;
}

export function createDefaultVoxyStudioEditorialReviewAuthority(
  repository: ReviewQueueOperationsRepository = getReviewQueueOperationsRepository(),
): VoxyStudioEditorialReviewAuthority {
  return {
    async resolveEditorialReview({ reviewItemId }) {
      const [record, auditEvents] = await Promise.all([
        repository.getRecord(reviewItemId),
        repository.listAuditEvents(reviewItemId),
      ]);
      return {
        persistenceMode: repository.getPersistenceState().mode,
        record,
        auditEvents,
      };
    },
  };
}

export function createDefaultVoxyStudioCompositionAuthority(
  repository: VoxyLocalCompositionRepository = getVoxyLocalCompositionRepository(),
): VoxyStudioCompositionAuthority {
  return {
    async resolveComposition({ jobId, outputId }) {
      const [job, output] = await Promise.all([
        repository.getJob(jobId),
        repository.getOutput(outputId),
      ]);
      return { job, output };
    },
  };
}

export function createDefaultVoxyStudioServiceDependencies(input: {
  evidenceAuthority: VoxyStudioEvidenceAuthority;
  now?: () => string;
}): VoxyStudioDraftServiceDependencies {
  return {
    repository: getVoxyStudioDraftRepository(),
    evidenceAuthority: input.evidenceAuthority,
    editorialReviewAuthority: createDefaultVoxyStudioEditorialReviewAuthority(),
    compositionAuthority: createDefaultVoxyStudioCompositionAuthority(),
    now: input.now,
  };
}

export async function createVoxyStudioDraft(
  input: VoxyStudioCreateDraftInput,
  deps: VoxyStudioDraftServiceDependencies,
): Promise<VoxyStudioDraft> {
  const actor = requireActor(input.createdByUserId);
  if (!SAFE_ID.test(normalize(input.clientRequestId))) {
    throw new Error("voxy_studio_client_request_id_invalid");
  }
  const timestamp = now(deps);
  const draftId = buildVoxyStudioDraftId({
    clientRequestId: input.clientRequestId,
    briefingId: input.briefingId,
    createdByUserId: actor,
  });
  const draft: VoxyStudioDraft = {
    version: VOXY_STUDIO_DRAFT_VERSION,
    draftId,
    revision: 1,
    sourceKind: input.sourceKind,
    dossierId: input.dossierId,
    briefingId: normalize(input.briefingId),
    title: normalize(input.title),
    storyPlan: input.storyPlan,
    selectedFormat: input.selectedFormat,
    safeZoneProfile: input.safeZoneProfile,
    captionAdjustments: [],
    status: "draft",
    renderApproval: null,
    renderBinding: null,
    publishApproval: null,
    createdByUserId: actor,
    updatedByUserId: actor,
    createdAt: timestamp,
    updatedAt: timestamp,
    guardrails: VOXY_STUDIO_DRAFT_GUARDRAILS,
  };
  const errors = validateVoxyStudioDraft(draft);
  if (errors.length) {
    throw new Error(`voxy_studio_draft_invalid:${errors.join(",")}`);
  }
  const storyValidation = await validateCurrentStory(draft, deps);
  if (storyValidation.errors.length) {
    throw new Error(
      `voxy_studio_story_structure_invalid:${storyValidation.errors.join(",")}`,
    );
  }
  const idempotencyKey = buildVoxyStudioDraftIdempotencyKey({
    clientRequestId: input.clientRequestId,
    briefingId: input.briefingId,
    createdByUserId: actor,
  });
  const persisted = await deps.repository.createOrGetDraft({
    draft,
    idempotencyKey,
  });
  if (
    persisted.storyPlan.storyPlanId !== draft.storyPlan.storyPlanId ||
    persisted.storyPlan.revision !== draft.storyPlan.revision ||
    persisted.briefingId !== draft.briefingId
  ) {
    throw new Error("voxy_studio_create_idempotency_conflict");
  }
  if (persisted.createdAt === draft.createdAt) {
    await deps.repository.appendAuditEvent(
      buildVoxyStudioDraftAuditEvent({
        draft: persisted,
        action: "created",
        byUserId: actor,
        at: timestamp,
      }),
    );
  }
  return persisted;
}

export async function editVoxyStudioDraft(input: {
  draftId: string;
  expectedRevision: number;
  patch: VoxyStudioDraftEditablePatch;
  updatedByUserId: string;
}, deps: VoxyStudioDraftServiceDependencies): Promise<VoxyStudioDraft> {
  const actor = requireActor(input.updatedByUserId);
  assertEditablePatchKeys(input.patch);
  const current = await requireDraft(deps.repository, input.draftId);
  if (current.revision !== input.expectedRevision) {
    throw new Error("voxy_studio_revision_conflict");
  }
  const next = applyVoxyStudioDraftEdit({
    draft: current,
    patch: input.patch,
    updatedByUserId: actor,
    updatedAt: now(deps),
  });
  const storyValidation = await validateCurrentStory(next, deps);
  if (storyValidation.errors.length) {
    throw new Error(
      `voxy_studio_story_structure_invalid:${storyValidation.errors.join(",")}`,
    );
  }
  await replaceDraftOrThrow({ repository: deps.repository, current, next });
  await deps.repository.appendAuditEvent(
    buildVoxyStudioDraftAuditEvent({
      draft: next,
      action: "edited",
      byUserId: actor,
      at: next.updatedAt,
    }),
  );
  return next;
}

export async function submitVoxyStudioDraftForReview(input: {
  draftId: string;
  expectedRevision: number;
  submittedByUserId: string;
}, deps: VoxyStudioDraftServiceDependencies): Promise<{
  draft: VoxyStudioDraft;
  validation: VoxyEditorialStoryPlanValidation;
  decisionGateId: string;
  reviewItemId: string;
}> {
  const actor = requireActor(input.submittedByUserId);
  const current = await requireDraft(deps.repository, input.draftId);
  if (current.revision !== input.expectedRevision) {
    throw new Error("voxy_studio_revision_conflict");
  }
  if (
    !["draft", "needs_changes", "needs_review", "approved_for_render"].includes(
      current.status,
    )
  ) {
    throw new Error(`voxy_studio_submit_not_allowed:${current.status}`);
  }
  const storyReview = await resolveCurrentStoryReview(current, deps);
  const validation = storyReview.validation;
  if (validation.errors.length) {
    throw new Error(
      `voxy_studio_story_structure_invalid:${validation.errors.join(",")}`,
    );
  }
  const timestamp = now(deps);
  const next: VoxyStudioDraft = {
    ...current,
    status: "needs_review",
    updatedByUserId: actor,
    updatedAt: timestamp,
    renderApproval: null,
    renderBinding: null,
    publishApproval: null,
  };
  if (current.status !== "needs_review") {
    await replaceDraftOrThrow({ repository: deps.repository, current, next });
    await deps.repository.appendAuditEvent(
      buildVoxyStudioDraftAuditEvent({
        draft: next,
        action: "submitted_for_review",
        byUserId: actor,
        at: timestamp,
        note:
          validation.approvalBlockers.length > 0
            ? `Approval blockers: ${validation.approvalBlockers.join(", ")}`
            : null,
      }),
    );
  }
  const effectiveDraft = current.status === "needs_review" ? current : next;
  const evidenceSourcePackId = storyReview.evidence.sourcePack.sourcePackId;
  return {
    draft: effectiveDraft,
    validation,
    decisionGateId: buildVoxyStudioEvidenceBoundRenderReviewGateId(
      effectiveDraft,
      evidenceSourcePackId,
    ),
    reviewItemId: buildVoxyStudioEditorialReviewItemId(
      effectiveDraft,
      evidenceSourcePackId,
    ),
  };
}

export async function requestVoxyStudioDraftChanges(input: {
  draftId: string;
  expectedRevision: number;
  requestedByUserId: string;
  note: string;
}, deps: VoxyStudioDraftServiceDependencies): Promise<VoxyStudioDraft> {
  const actor = requireActor(input.requestedByUserId);
  const note = normalize(input.note);
  if (!note) throw new Error("voxy_studio_change_request_note_required");
  const current = await requireDraft(deps.repository, input.draftId);
  if (current.revision !== input.expectedRevision) {
    throw new Error("voxy_studio_revision_conflict");
  }
  if (current.status !== "needs_review") {
    throw new Error(`voxy_studio_change_request_not_allowed:${current.status}`);
  }
  const timestamp = now(deps);
  const next: VoxyStudioDraft = {
    ...current,
    status: "needs_changes",
    renderApproval: null,
    renderBinding: null,
    publishApproval: null,
    updatedByUserId: actor,
    updatedAt: timestamp,
  };
  await replaceDraftOrThrow({ repository: deps.repository, current, next });
  await deps.repository.appendAuditEvent(
    buildVoxyStudioDraftAuditEvent({
      draft: next,
      action: "review_changes_requested",
      byUserId: actor,
      at: timestamp,
      note,
    }),
  );
  return next;
}

export async function approveVoxyStudioDraftForRender(input: {
  draftId: string;
  expectedRevision: number;
  approvedByUserId: string;
  approvalSource?: VoxyStudioReviewApprovalSource;
  councilArtifactId?: string | null;
}, deps: VoxyStudioDraftServiceDependencies): Promise<VoxyStudioDraft> {
  const actor = requireActor(input.approvedByUserId);
  const current = await requireDraft(deps.repository, input.draftId);
  if (current.revision !== input.expectedRevision) {
    throw new Error("voxy_studio_revision_conflict");
  }
  if (current.status !== "needs_review") {
    throw new Error(`voxy_studio_render_approval_not_allowed:${current.status}`);
  }
  const storyReview = await resolveCurrentStoryReview(current, deps);
  const validation = storyReview.validation;
  if (!validation.renderEligible) {
    throw new Error(
      `voxy_studio_editorial_approval_blocked:${[
        ...validation.errors,
        ...validation.approvalBlockers,
      ].join(",")}`,
    );
  }

  const evidenceSourcePackId = storyReview.evidence.sourcePack.sourcePackId;
  const decisionGateId = buildVoxyStudioEvidenceBoundRenderReviewGateId(
    current,
    evidenceSourcePackId,
  );
  const reviewItemId = buildVoxyStudioEditorialReviewItemId(
    current,
    evidenceSourcePackId,
  );
  const review = await deps.editorialReviewAuthority.resolveEditorialReview({
    draft: current,
    reviewItemId,
    decisionGateId,
  });
  if (
    review.persistenceMode !== "persistent_primary" &&
    !deps.allowInMemoryEditorialReviewForTests
  ) {
    throw new Error("voxy_studio_editorial_review_not_persistent");
  }
  const record = review.record;
  if (!record) throw new Error("voxy_studio_editorial_review_missing");
  if (record.itemId !== reviewItemId) {
    throw new Error("voxy_studio_editorial_review_item_mismatch");
  }
  if (record.operationalStatus !== "ready") {
    throw new Error(`voxy_studio_editorial_review_not_ready:${record.operationalStatus}`);
  }
  const readyAudit = review.auditEvents.find(
    (event) =>
      event.itemId === reviewItemId &&
      event.action === "mark_ready" &&
      event.nextOperationalStatus === "ready",
  );
  if (!readyAudit) throw new Error("voxy_studio_editorial_ready_audit_missing");
  if (readyAudit.byUserId !== actor) {
    throw new Error("voxy_studio_editorial_review_actor_mismatch");
  }
  if (!SAFE_ID.test(readyAudit.id) || !SAFE_ID.test(readyAudit.byUserId) || !readyAudit.at) {
    throw new Error("voxy_studio_editorial_ready_audit_invalid");
  }

  const timestamp = now(deps);
  const approvalSource = input.approvalSource ?? "human";
  const approval: VoxyStudioReviewApproval = {
    approvalSource,
    reviewDecisionRecordId: readyAudit.id,
    decisionGateId,
    approvedByUserId: readyAudit.byUserId,
    councilArtifactId: input.councilArtifactId ?? null,
    approvedAt: readyAudit.at,
    studioDraftRevision: current.revision,
    storyPlanRevision: current.storyPlan.revision,
  };
  const next: VoxyStudioDraft = {
    ...current,
    status: "approved_for_render",
    renderApproval: approval,
    renderBinding: null,
    publishApproval: null,
    updatedByUserId: actor,
    updatedAt: timestamp,
  };
  const errors = validateVoxyStudioDraft(next);
  if (errors.length) {
    throw new Error(`voxy_studio_approved_draft_invalid:${errors.join(",")}`);
  }
  await replaceDraftOrThrow({ repository: deps.repository, current, next });
  await deps.repository.appendAuditEvent(
    buildVoxyStudioDraftAuditEvent({
      draft: next,
      action: "approved_for_render",
      byUserId: actor,
      at: timestamp,
      reviewDecisionRecordId: readyAudit.id,
      note: `Persistierte redaktionelle Renderfreigabe (${approvalSource}) aus Review Queue ${reviewItemId}, revisionsgebunden an ${decisionGateId}; startet keinen Render automatisch.`,
    }),
  );
  return next;
}

function validateCompositionBinding(input: {
  draft: VoxyStudioDraft;
  job: VoxyLocalCompositionJob;
  output: VoxyLocalCompositionOutput;
}): string[] {
  const errors: string[] = [];
  const { draft, job, output } = input;
  const expectedGate = draft.renderApproval?.decisionGateId ?? null;
  const expectedApprovalRef = draft.renderApproval?.reviewDecisionRecordId ?? null;
  const expectedScriptVersion = buildVoxyEditorialScriptVersion(draft.storyPlan);
  if (job.status !== "review_ready") errors.push("composition_job_not_review_ready");
  if (!expectedApprovalRef || job.approvalRef !== expectedApprovalRef) {
    errors.push("composition_approval_ref_mismatch");
  }
  if (job.scriptVersion !== expectedScriptVersion) {
    errors.push("composition_story_revision_mismatch");
  }
  if (job.locale !== draft.storyPlan.outputLanguage.toLowerCase()) {
    errors.push("composition_locale_mismatch");
  }
  if (job.artifactId !== draft.draftId) errors.push("composition_artifact_mismatch");
  if (job.briefingId !== draft.briefingId) errors.push("composition_briefing_mismatch");
  if (job.format !== draft.selectedFormat || output.format !== draft.selectedFormat) {
    errors.push("composition_format_mismatch");
  }
  if (job.outputId !== output.outputId || output.jobId !== job.jobId) {
    errors.push("composition_output_identity_mismatch");
  }
  if (
    !expectedGate ||
    job.decisionGateId !== expectedGate ||
    output.decisionGateId !== expectedGate
  ) {
    errors.push("composition_review_gate_mismatch");
  }
  if (
    job.dossierRefId !== draft.dossierId ||
    output.dossierRefId !== draft.dossierId
  ) {
    errors.push("composition_dossier_binding_mismatch");
  }
  if (
    output.reviewRequired !== true ||
    output.publicAsset !== false ||
    output.uploaded !== false ||
    output.scheduled !== false ||
    output.socialPosted !== false ||
    output.published !== false
  ) {
    errors.push("composition_output_guardrails_broken");
  }
  if (!/^[a-f0-9]{64}$/.test(output.masterMp4.sha256)) {
    errors.push("composition_master_sha_invalid");
  }
  return errors;
}

export async function bindVoxyStudioVerifiedRender(input: {
  draftId: string;
  expectedRevision: number;
  jobId: string;
  outputId: string;
  boundByUserId: string;
}, deps: VoxyStudioDraftServiceDependencies): Promise<VoxyStudioDraft> {
  const actor = requireActor(input.boundByUserId);
  const current = await requireDraft(deps.repository, input.draftId);
  if (current.revision !== input.expectedRevision) {
    throw new Error("voxy_studio_revision_conflict");
  }
  if (current.status !== "approved_for_render" || !current.renderApproval) {
    throw new Error(`voxy_studio_render_binding_not_allowed:${current.status}`);
  }
  const { job, output } = await deps.compositionAuthority.resolveComposition({
    jobId: input.jobId,
    outputId: input.outputId,
  });
  if (!job || !output) throw new Error("voxy_studio_composition_missing");
  const bindingErrors = validateCompositionBinding({
    draft: current,
    job,
    output,
  });
  if (bindingErrors.length) {
    throw new Error(`voxy_studio_composition_invalid:${bindingErrors.join(",")}`);
  }

  const timestamp = now(deps);
  const next: VoxyStudioDraft = {
    ...current,
    status: "rendered",
    renderBinding: {
      jobId: job.jobId,
      outputId: output.outputId,
      outputSha256: output.masterMp4.sha256,
      format: output.format,
      studioDraftRevision: current.revision,
      storyPlanRevision: current.storyPlan.revision,
      renderedAt: job.completedAt ?? output.createdAt,
    },
    publishApproval: null,
    updatedByUserId: actor,
    updatedAt: timestamp,
  };
  const errors = validateVoxyStudioDraft(next);
  if (errors.length) {
    throw new Error(`voxy_studio_rendered_draft_invalid:${errors.join(",")}`);
  }
  await replaceDraftOrThrow({ repository: deps.repository, current, next });
  await deps.repository.appendAuditEvent(
    buildVoxyStudioDraftAuditEvent({
      draft: next,
      action: "render_bound",
      byUserId: actor,
      at: timestamp,
      reviewDecisionRecordId: current.renderApproval.reviewDecisionRecordId,
      renderJobId: job.jobId,
      renderOutputId: output.outputId,
    }),
  );
  return next;
}
