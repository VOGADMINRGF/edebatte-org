import {
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@/config/locales";
import type { CanonicalSourcePack } from "@/features/create/canonicalSourcePackContract";
import type {
  DossierClaimDoc,
  DossierFindingDoc,
  OpenQuestionDoc,
} from "@features/dossier/schemas";
import type { VoxyRigMotionState } from "./animatableMasterAsset";
import type { VoxyVideoFormat } from "./modernCharacterContracts";

export const VOXY_EDITORIAL_STORY_PLAN_VERSION =
  "voxy-editorial-story-plan-v1" as const;

export const VOXY_EDITORIAL_ARCHETYPES = [
  "breaking_update",
  "explainer",
  "controversy",
  "data_picture",
  "fact_check",
  "consequence_map",
  "deep_dive",
] as const;

export type VoxyEditorialArchetype =
  (typeof VOXY_EDITORIAL_ARCHETYPES)[number];

export const VOXY_EDITORIAL_CHAPTER_ROLES = [
  "what_happened",
  "what_is_supported",
  "source_evidence",
  "relevant_positions",
  "uncertainty_open_questions",
  "consequences_scenarios",
  "what_to_watch_next",
] as const;

export type VoxyEditorialChapterRole =
  (typeof VOXY_EDITORIAL_CHAPTER_ROLES)[number];

export const VOXY_EDITORIAL_CLAIM_PRESENTATIONS = [
  "confirmed_fact",
  "attributed_position",
  "interpretation",
  "uncertainty",
  "scenario",
  "open_question",
] as const;

export type VoxyEditorialClaimPresentation =
  (typeof VOXY_EDITORIAL_CLAIM_PRESENTATIONS)[number];

export const VOXY_EDITORIAL_EVIDENCE_WINDOW_KINDS = [
  "none",
  "source",
  "comparison",
  "data",
  "timeline",
] as const;

export type VoxyEditorialEvidenceWindowKind =
  (typeof VOXY_EDITORIAL_EVIDENCE_WINDOW_KINDS)[number];

export const VOXY_EDITORIAL_CONSEQUENCE_KINDS = [
  "confirmed_effect",
  "scenario",
] as const;

export type VoxyEditorialConsequenceKind =
  (typeof VOXY_EDITORIAL_CONSEQUENCE_KINDS)[number];

export const VOXY_EDITORIAL_DURATION_CLASSES = [
  "preview",
  "explainer",
  "deep_dive",
] as const;

export type VoxyEditorialDurationClass =
  (typeof VOXY_EDITORIAL_DURATION_CLASSES)[number];

export const VOXY_EDITORIAL_DURATION_LIMITS_MS: Readonly<
  Record<VoxyEditorialDurationClass, { min: number; max: number }>
> = {
  preview: { min: 20_000, max: 120_000 },
  explainer: { min: 120_000, max: 600_000 },
  deep_dive: { min: 300_000, max: 1_800_000 },
};

export const VOXY_EDITORIAL_ALLOWED_MOTIONS = [
  "neutral_idle",
  "listening",
  "explaining",
  "questioning",
  "highlighting_source",
  "showing_contrast",
  "inviting_participation",
] as const satisfies readonly VoxyRigMotionState[];

export type VoxyEditorialMotion =
  (typeof VOXY_EDITORIAL_ALLOWED_MOTIONS)[number];

export const VOXY_EDITORIAL_SUPPORTED_LOCALES = SUPPORTED_LOCALES;

export type VoxyEditorialClaimBinding = {
  claimId: string;
  presentation: VoxyEditorialClaimPresentation;
};

export type VoxyEditorialEvidenceWindow = {
  kind: VoxyEditorialEvidenceWindowKind;
  sourceIds: string[];
  findingIds: string[];
  visible?: boolean;
};

export type VoxyEditorialConsequence = {
  consequenceId: string;
  kind: VoxyEditorialConsequenceKind;
  text: string;
  claimIds: string[];
  sourceIds: string[];
};

export type VoxyEditorialStoryChapter = {
  chapterId: string;
  role: VoxyEditorialChapterRole;
  headline: string;
  narration: string;
  claimBindings: VoxyEditorialClaimBinding[];
  sourceIds: string[];
  findingIds: string[];
  openQuestionIds: string[];
  evidenceWindow: VoxyEditorialEvidenceWindow;
  consequences: VoxyEditorialConsequence[];
  motion: VoxyEditorialMotion;
};

export type VoxyEditorialStoryPlan = {
  version: typeof VOXY_EDITORIAL_STORY_PLAN_VERSION;
  storyPlanId: string;
  revision: number;
  briefingId: string;
  dossierId: string | null;
  title: string;
  locale: SupportedLocale;
  originalLanguage: string;
  outputLanguage: string;
  archetype: VoxyEditorialArchetype;
  durationClass: VoxyEditorialDurationClass;
  chapters: VoxyEditorialStoryChapter[];
  derivedFromStoryPlanId: string | null;
  derivedFromRevision: number | null;
  reviewRequired: true;
  autoRender: false;
  autoPublish: false;
};

export type VoxyEditorialEvidenceContext = {
  sourcePack: CanonicalSourcePack;
  claims: DossierClaimDoc[];
  findings: DossierFindingDoc[];
  openQuestions: OpenQuestionDoc[];
};

export type VoxyEditorialStoryPlanValidation = {
  errors: string[];
  approvalBlockers: string[];
  warnings: string[];
  renderEligible: boolean;
};

export type VoxyEditorialTimelineChapter = {
  chapterId: string;
  role: VoxyEditorialChapterRole;
  startMs: number;
  endMs: number;
  motion: VoxyEditorialMotion;
};

export type VoxyEditorialTimeline = {
  storyPlanId: string;
  storyPlanRevision: number;
  durationClass: VoxyEditorialDurationClass;
  durationMs: number;
  chapters: VoxyEditorialTimelineChapter[];
};

function normalizeId(value: string): string {
  return String(value ?? "").trim();
}

function uniqueNonEmpty(values: readonly string[]): string[] {
  return Array.from(new Set(values.map(normalizeId).filter(Boolean)));
}

function pushUnique(target: string[], value: string) {
  if (!target.includes(value)) target.push(value);
}

function sourceById(context: VoxyEditorialEvidenceContext) {
  return new Map(
    context.sourcePack.sources.map((source) => [source.sourceId, source]),
  );
}

function claimById(context: VoxyEditorialEvidenceContext) {
  return new Map(context.claims.map((claim) => [claim.claimId, claim]));
}

function findingById(context: VoxyEditorialEvidenceContext) {
  return new Map(
    context.findings.map((finding) => [finding.findingId, finding]),
  );
}

function questionById(context: VoxyEditorialEvidenceContext) {
  return new Map(
    context.openQuestions.map((question) => [question.questionId, question]),
  );
}

function sourceCanSupportConfirmedFact(
  sourceId: string,
  context: VoxyEditorialEvidenceContext,
): boolean {
  const source = sourceById(context).get(sourceId);
  return Boolean(
    source &&
      source.reviewState === "approved" &&
      source.evidenceState === "supported",
  );
}

function claimHasApprovedSupportingFinding(
  claimId: string,
  context: VoxyEditorialEvidenceContext,
): boolean {
  return context.findings.some(
    (finding) =>
      finding.claimId === claimId &&
      finding.verdict === "supports" &&
      finding.citations.some((citation) =>
        sourceCanSupportConfirmedFact(citation.sourceId, context),
      ),
  );
}

function validateClaimBinding(
  binding: VoxyEditorialClaimBinding,
  chapter: VoxyEditorialStoryChapter,
  context: VoxyEditorialEvidenceContext,
  result: VoxyEditorialStoryPlanValidation,
) {
  const claimId = normalizeId(binding.claimId);
  if (!claimId) {
    pushUnique(result.errors, `claim_binding_missing_id:${chapter.chapterId}`);
    return;
  }
  const claim = claimById(context).get(claimId);
  if (!claim) {
    pushUnique(result.approvalBlockers, `claim_not_found:${claimId}`);
    return;
  }

  if (binding.presentation === "confirmed_fact") {
    if (claim.kind !== "fact") {
      pushUnique(
        result.approvalBlockers,
        `confirmed_fact_requires_fact_claim:${claimId}`,
      );
    }
    if (claim.status !== "supported") {
      pushUnique(
        result.approvalBlockers,
        `confirmed_fact_claim_not_supported:${claimId}`,
      );
    }
    if (!claimHasApprovedSupportingFinding(claimId, context)) {
      pushUnique(
        result.approvalBlockers,
        `confirmed_fact_missing_approved_evidence:${claimId}`,
      );
    }
  }

  if (
    binding.presentation === "open_question" &&
    claim.kind !== "question"
  ) {
    pushUnique(
      result.warnings,
      `open_question_presentation_on_non_question_claim:${claimId}`,
    );
  }

  if (
    binding.presentation === "scenario" &&
    chapter.role !== "consequences_scenarios"
  ) {
    pushUnique(
      result.errors,
      `scenario_claim_outside_consequence_chapter:${claimId}`,
    );
  }
}

function validateEvidenceWindow(
  chapter: VoxyEditorialStoryChapter,
  context: VoxyEditorialEvidenceContext,
  result: VoxyEditorialStoryPlanValidation,
) {
  const window = chapter.evidenceWindow;
  const sourceIds = uniqueNonEmpty(window.sourceIds);
  const findingIds = uniqueNonEmpty(window.findingIds);
  const sources = sourceById(context);
  const findings = findingById(context);

  if (window.kind === "none" && (sourceIds.length || findingIds.length)) {
    pushUnique(result.errors, `hidden_evidence_window_has_refs:${chapter.chapterId}`);
  }
  if (window.kind !== "none" && sourceIds.length === 0) {
    pushUnique(result.approvalBlockers, `evidence_window_missing_source:${chapter.chapterId}`);
  }
  if (window.kind === "comparison" && sourceIds.length !== 2) {
    pushUnique(result.errors, `comparison_requires_two_sources:${chapter.chapterId}`);
  }
  if (window.kind !== "comparison" && sourceIds.length > 1) {
    pushUnique(result.errors, `single_window_has_multiple_sources:${chapter.chapterId}`);
  }
  for (const sourceId of sourceIds) {
    const source = sources.get(sourceId);
    if (!source) {
      pushUnique(result.approvalBlockers, `source_not_found:${sourceId}`);
      continue;
    }
    if (source.reviewState === "rejected") {
      pushUnique(result.approvalBlockers, `source_rejected:${sourceId}`);
    }
    if (source.reviewState !== "approved") {
      pushUnique(result.approvalBlockers, `source_review_pending:${sourceId}`);
    }
    if (
      ["source_needed", "partial", "contested", "context_missing", "outdated"].includes(
        source.evidenceState,
      )
    ) {
      pushUnique(
        result.warnings,
        `source_evidence_not_fully_supported:${sourceId}:${source.evidenceState}`,
      );
    }
  }
  for (const findingId of findingIds) {
    if (!findings.has(findingId)) {
      pushUnique(result.approvalBlockers, `finding_not_found:${findingId}`);
    }
  }
}

function validateConsequences(
  chapter: VoxyEditorialStoryChapter,
  context: VoxyEditorialEvidenceContext,
  result: VoxyEditorialStoryPlanValidation,
) {
  if (
    chapter.consequences.length > 0 &&
    chapter.role !== "consequences_scenarios"
  ) {
    pushUnique(result.errors, `consequence_outside_consequence_chapter:${chapter.chapterId}`);
  }
  const ids = new Set<string>();
  for (const consequence of chapter.consequences) {
    const id = normalizeId(consequence.consequenceId);
    if (!id || ids.has(id)) {
      pushUnique(result.errors, `consequence_id_invalid_or_duplicate:${chapter.chapterId}`);
      continue;
    }
    ids.add(id);
    if (!normalizeId(consequence.text)) {
      pushUnique(result.errors, `consequence_text_missing:${id}`);
    }
    if (consequence.kind === "confirmed_effect") {
      if (consequence.claimIds.length === 0) {
        pushUnique(result.approvalBlockers, `confirmed_effect_missing_claim:${id}`);
      }
      for (const claimId of uniqueNonEmpty(consequence.claimIds)) {
        const claim = claimById(context).get(claimId);
        if (
          !claim ||
          claim.kind !== "fact" ||
          claim.status !== "supported" ||
          !claimHasApprovedSupportingFinding(claimId, context)
        ) {
          pushUnique(
            result.approvalBlockers,
            `confirmed_effect_not_supported:${id}:${claimId}`,
          );
        }
      }
    }
    if (consequence.kind === "scenario" && consequence.sourceIds.length === 0) {
      pushUnique(result.warnings, `scenario_without_source_context:${id}`);
    }
  }
}

export function validateVoxyEditorialStoryPlan(
  plan: VoxyEditorialStoryPlan,
  context: VoxyEditorialEvidenceContext,
): VoxyEditorialStoryPlanValidation {
  const result: VoxyEditorialStoryPlanValidation = {
    errors: [],
    approvalBlockers: [],
    warnings: [],
    renderEligible: false,
  };

  if (plan.version !== VOXY_EDITORIAL_STORY_PLAN_VERSION) {
    pushUnique(result.errors, "unsupported_story_plan_version");
  }
  if (!normalizeId(plan.storyPlanId)) pushUnique(result.errors, "story_plan_id_missing");
  if (!Number.isInteger(plan.revision) || plan.revision < 1) {
    pushUnique(result.errors, "story_plan_revision_invalid");
  }
  if (!normalizeId(plan.briefingId)) pushUnique(result.errors, "briefing_id_missing");
  if (!normalizeId(plan.title)) pushUnique(result.errors, "story_title_missing");
  if (!SUPPORTED_LOCALES.includes(plan.locale)) {
    pushUnique(result.errors, `unsupported_locale:${plan.locale}`);
  }
  if (!normalizeId(plan.originalLanguage) || !normalizeId(plan.outputLanguage)) {
    pushUnique(result.errors, "language_binding_missing");
  }
  if (!VOXY_EDITORIAL_ARCHETYPES.includes(plan.archetype)) {
    pushUnique(result.errors, "story_archetype_invalid");
  }
  if (!VOXY_EDITORIAL_DURATION_CLASSES.includes(plan.durationClass)) {
    pushUnique(result.errors, "duration_class_invalid");
  }
  if (plan.reviewRequired !== true || plan.autoRender !== false || plan.autoPublish !== false) {
    pushUnique(result.errors, "review_first_guardrails_broken");
  }
  if (plan.chapters.length === 0) pushUnique(result.errors, "story_chapters_missing");

  const chapterIds = new Set<string>();
  const allReferencedQuestions = new Set<string>();
  for (const chapter of plan.chapters) {
    const chapterId = normalizeId(chapter.chapterId);
    if (!chapterId || chapterIds.has(chapterId)) {
      pushUnique(result.errors, "chapter_id_invalid_or_duplicate");
      continue;
    }
    chapterIds.add(chapterId);
    if (!VOXY_EDITORIAL_CHAPTER_ROLES.includes(chapter.role)) {
      pushUnique(result.errors, `chapter_role_invalid:${chapterId}`);
    }
    if (!normalizeId(chapter.headline) || !normalizeId(chapter.narration)) {
      pushUnique(result.errors, `chapter_copy_missing:${chapterId}`);
    }
    if (!VOXY_EDITORIAL_ALLOWED_MOTIONS.includes(chapter.motion)) {
      pushUnique(result.errors, `chapter_motion_invalid:${chapterId}`);
    }
    if (
      chapter.role === "relevant_positions" &&
      chapter.motion === "questioning"
    ) {
      pushUnique(
        result.errors,
        `position_chapter_must_not_use_questioning_motion:${chapterId}`,
      );
    }
    for (const binding of chapter.claimBindings) {
      validateClaimBinding(binding, chapter, context, result);
    }
    for (const sourceId of uniqueNonEmpty(chapter.sourceIds)) {
      const source = sourceById(context).get(sourceId);
      if (!source) pushUnique(result.approvalBlockers, `source_not_found:${sourceId}`);
      else if (source.reviewState === "rejected") {
        pushUnique(result.approvalBlockers, `source_rejected:${sourceId}`);
      }
    }
    for (const findingId of uniqueNonEmpty(chapter.findingIds)) {
      if (!findingById(context).has(findingId)) {
        pushUnique(result.approvalBlockers, `finding_not_found:${findingId}`);
      }
    }
    for (const questionId of uniqueNonEmpty(chapter.openQuestionIds)) {
      allReferencedQuestions.add(questionId);
      if (!questionById(context).has(questionId)) {
        pushUnique(result.approvalBlockers, `open_question_not_found:${questionId}`);
      }
    }
    validateEvidenceWindow(chapter, context, result);
    validateConsequences(chapter, context, result);
  }

  if (!plan.chapters.some((chapter) => chapter.role === "what_happened")) {
    pushUnique(result.approvalBlockers, "what_happened_chapter_missing");
  }
  if (
    !plan.chapters.some((chapter) =>
      ["what_is_supported", "source_evidence"].includes(chapter.role),
    )
  ) {
    pushUnique(result.approvalBlockers, "evidence_chapter_missing");
  }

  const unresolvedQuestions = context.openQuestions.filter(
    (question) => ["open", "in_review"].includes(question.status),
  );
  const hasUncertainClaims = context.claims.some((claim) =>
    ["open", "unclear"].includes(claim.status),
  );
  if (
    (unresolvedQuestions.length > 0 || hasUncertainClaims) &&
    !plan.chapters.some(
      (chapter) => chapter.role === "uncertainty_open_questions",
    )
  ) {
    pushUnique(result.approvalBlockers, "uncertainty_chapter_required");
  }
  if (
    unresolvedQuestions.length > 0 &&
    !unresolvedQuestions.some((question) =>
      allReferencedQuestions.has(question.questionId),
    )
  ) {
    pushUnique(result.warnings, "open_questions_exist_but_none_are_referenced");
  }

  result.renderEligible =
    result.errors.length === 0 && result.approvalBlockers.length === 0;
  return result;
}

export function buildVoxyEditorialTimeline(input: {
  plan: VoxyEditorialStoryPlan;
  chapterDurationsMs: Readonly<Record<string, number>>;
}): VoxyEditorialTimeline {
  let cursor = 0;
  const chapters = input.plan.chapters.map((chapter) => {
    const duration = input.chapterDurationsMs[chapter.chapterId];
    if (!Number.isInteger(duration) || duration < 1_500) {
      throw new Error(`editorial_chapter_duration_invalid:${chapter.chapterId}`);
    }
    const timelineChapter: VoxyEditorialTimelineChapter = {
      chapterId: chapter.chapterId,
      role: chapter.role,
      startMs: cursor,
      endMs: cursor + duration,
      motion: chapter.motion,
    };
    cursor += duration;
    return timelineChapter;
  });

  const limits = VOXY_EDITORIAL_DURATION_LIMITS_MS[input.plan.durationClass];
  if (cursor < limits.min || cursor > limits.max) {
    throw new Error(
      `editorial_duration_out_of_range:${input.plan.durationClass}:${cursor}`,
    );
  }

  return {
    storyPlanId: input.plan.storyPlanId,
    storyPlanRevision: input.plan.revision,
    durationClass: input.plan.durationClass,
    durationMs: cursor,
    chapters,
  };
}

export function resolveVoxyEvidenceWindowPresentation(input: {
  format: VoxyVideoFormat;
  window: VoxyEditorialEvidenceWindow;
}): "hidden" | "single" | "side_by_side" | "sequence" {
  if (input.window.visible === false || input.window.kind === "none") return "hidden";
  if (input.window.kind === "comparison") {
    return input.format === "16:9" ? "side_by_side" : "sequence";
  }
  return "single";
}

export function validateVoxyShortformDerivation(input: {
  longform: VoxyEditorialStoryPlan;
  shortform: VoxyEditorialStoryPlan;
}): string[] {
  const errors: string[] = [];
  if (input.shortform.durationClass !== "preview") {
    errors.push("shortform_must_use_preview_duration_class");
  }
  if (
    input.shortform.derivedFromStoryPlanId !== input.longform.storyPlanId ||
    input.shortform.derivedFromRevision !== input.longform.revision
  ) {
    errors.push("shortform_revision_binding_invalid");
  }

  const allowedClaims = new Set(
    input.longform.chapters.flatMap((chapter) =>
      chapter.claimBindings.map((binding) => binding.claimId),
    ),
  );
  const allowedSources = new Set(
    input.longform.chapters.flatMap((chapter) => [
      ...chapter.sourceIds,
      ...chapter.evidenceWindow.sourceIds,
      ...chapter.consequences.flatMap((item) => item.sourceIds),
    ]),
  );
  const allowedQuestions = new Set(
    input.longform.chapters.flatMap((chapter) => chapter.openQuestionIds),
  );

  for (const chapter of input.shortform.chapters) {
    for (const binding of chapter.claimBindings) {
      if (!allowedClaims.has(binding.claimId)) {
        pushUnique(errors, `shortform_introduces_new_claim:${binding.claimId}`);
      }
    }
    for (const sourceId of [
      ...chapter.sourceIds,
      ...chapter.evidenceWindow.sourceIds,
      ...chapter.consequences.flatMap((item) => item.sourceIds),
    ]) {
      if (!allowedSources.has(sourceId)) {
        pushUnique(errors, `shortform_introduces_new_source:${sourceId}`);
      }
    }
    for (const questionId of chapter.openQuestionIds) {
      if (!allowedQuestions.has(questionId)) {
        pushUnique(errors, `shortform_introduces_new_question:${questionId}`);
      }
    }
  }
  return errors;
}
