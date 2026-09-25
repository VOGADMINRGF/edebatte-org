import { stableHash } from "@core/utils/hash";
import type { VoxyEditorialStoryPlan } from "./editorialStoryPlan";

export const VOXY_EDITORIAL_LANGUAGE_VARIANT_VERSION =
  "voxy-editorial-language-variant-v1" as const;

export const VOXY_EDITORIAL_TRANSLATION_STATUSES = [
  "needs_review",
  "approved",
  "uncertain",
  "stale",
] as const;

export type VoxyEditorialTranslationStatus =
  (typeof VOXY_EDITORIAL_TRANSLATION_STATUSES)[number];

export type VoxyEditorialLanguageVariantBinding = {
  version: typeof VOXY_EDITORIAL_LANGUAGE_VARIANT_VERSION;
  sourceLanguage: string;
  targetLanguage: string;
  translatedFromStoryPlanId: string;
  translatedFromStoryPlanRevision: number;
  evidenceSourcePackId: string;
  translationRevision: number;
  translationHash: string;
  translationStatus: VoxyEditorialTranslationStatus;
  reviewRequired: true;
  autoRender: false;
  autoPublish: false;
};

export type VoxyEditorialLanguageVariantPlan = VoxyEditorialStoryPlan & {
  languageVariant: VoxyEditorialLanguageVariantBinding;
};

export type VoxyEditorialLanguageVariantFreshness = {
  current: boolean;
  blockers: string[];
};

function normalized(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function positiveRevision(value: number) {
  return Number.isInteger(value) && value >= 1;
}

function translationPresentationPayload(plan: VoxyEditorialStoryPlan) {
  return {
    title: plan.title,
    locale: plan.locale,
    outputLanguage: plan.outputLanguage,
    archetype: plan.archetype,
    durationClass: plan.durationClass,
    chapters: plan.chapters.map((chapter) => ({
      chapterId: chapter.chapterId,
      role: chapter.role,
      headline: chapter.headline,
      narration: chapter.narration,
      consequences: chapter.consequences.map((consequence) => ({
        consequenceId: consequence.consequenceId,
        kind: consequence.kind,
        text: consequence.text,
      })),
    })),
  };
}

export function computeVoxyEditorialTranslationHash(
  plan: VoxyEditorialStoryPlan,
): string {
  return stableHash(translationPresentationPayload(plan));
}

export function getVoxyEditorialLanguageVariantBinding(
  plan: VoxyEditorialStoryPlan,
): VoxyEditorialLanguageVariantBinding | null {
  const candidate = (plan as VoxyEditorialStoryPlan & {
    languageVariant?: VoxyEditorialLanguageVariantBinding | null;
  }).languageVariant;
  return candidate ?? null;
}

export function bindVoxyEditorialLanguageVariant(input: {
  translatedPlan: VoxyEditorialStoryPlan;
  masterPlan: VoxyEditorialStoryPlan;
  evidenceSourcePackId: string;
  translationRevision: number;
  translationStatus?: VoxyEditorialTranslationStatus;
}): VoxyEditorialLanguageVariantPlan {
  const sourceLanguage = normalized(input.masterPlan.outputLanguage || input.masterPlan.originalLanguage)
    .toLowerCase();
  const targetLanguage = normalized(input.translatedPlan.outputLanguage).toLowerCase();
  const evidenceSourcePackId = normalized(input.evidenceSourcePackId);
  if (!sourceLanguage) throw new Error("voxy_language_variant_source_language_missing");
  if (!targetLanguage) throw new Error("voxy_language_variant_target_language_missing");
  if (sourceLanguage === targetLanguage) {
    throw new Error("voxy_language_variant_target_matches_source");
  }
  if (!normalized(input.masterPlan.storyPlanId)) {
    throw new Error("voxy_language_variant_master_story_plan_missing");
  }
  if (!positiveRevision(input.masterPlan.revision)) {
    throw new Error("voxy_language_variant_master_revision_invalid");
  }
  if (!positiveRevision(input.translationRevision)) {
    throw new Error("voxy_language_variant_translation_revision_invalid");
  }
  if (!evidenceSourcePackId) {
    throw new Error("voxy_language_variant_evidence_binding_missing");
  }
  if (input.translatedPlan.derivedFromStoryPlanId !== input.masterPlan.storyPlanId) {
    throw new Error("voxy_language_variant_master_story_binding_mismatch");
  }
  if (input.translatedPlan.derivedFromRevision !== input.masterPlan.revision) {
    throw new Error("voxy_language_variant_master_revision_binding_mismatch");
  }
  if (normalized(input.translatedPlan.originalLanguage).toLowerCase() !== sourceLanguage) {
    throw new Error("voxy_language_variant_original_language_binding_mismatch");
  }
  if (normalized(input.translatedPlan.locale).toLowerCase() !== targetLanguage) {
    throw new Error("voxy_language_variant_locale_binding_mismatch");
  }

  const translationStatus = input.translationStatus ?? "needs_review";
  if (!VOXY_EDITORIAL_TRANSLATION_STATUSES.includes(translationStatus)) {
    throw new Error("voxy_language_variant_translation_status_invalid");
  }

  return {
    ...input.translatedPlan,
    languageVariant: {
      version: VOXY_EDITORIAL_LANGUAGE_VARIANT_VERSION,
      sourceLanguage,
      targetLanguage,
      translatedFromStoryPlanId: input.masterPlan.storyPlanId,
      translatedFromStoryPlanRevision: input.masterPlan.revision,
      evidenceSourcePackId,
      translationRevision: input.translationRevision,
      translationHash: computeVoxyEditorialTranslationHash(input.translatedPlan),
      translationStatus,
      reviewRequired: true,
      autoRender: false,
      autoPublish: false,
    },
  };
}

export function validateVoxyEditorialLanguageVariantBinding(
  plan: VoxyEditorialStoryPlan,
): string[] {
  const binding = getVoxyEditorialLanguageVariantBinding(plan);
  if (!binding) return [];
  const errors: string[] = [];
  if (binding.version !== VOXY_EDITORIAL_LANGUAGE_VARIANT_VERSION) {
    errors.push("language_variant_version_invalid");
  }
  if (!normalized(binding.sourceLanguage)) errors.push("language_variant_source_language_missing");
  if (!normalized(binding.targetLanguage)) errors.push("language_variant_target_language_missing");
  if (binding.sourceLanguage === binding.targetLanguage) {
    errors.push("language_variant_target_matches_source");
  }
  if (!normalized(binding.translatedFromStoryPlanId)) {
    errors.push("language_variant_master_story_plan_missing");
  }
  if (!positiveRevision(binding.translatedFromStoryPlanRevision)) {
    errors.push("language_variant_master_revision_invalid");
  }
  if (!normalized(binding.evidenceSourcePackId)) {
    errors.push("language_variant_evidence_binding_missing");
  }
  if (!positiveRevision(binding.translationRevision)) {
    errors.push("language_variant_translation_revision_invalid");
  }
  if (!/^[0-9a-f]{64}$/.test(binding.translationHash)) {
    errors.push("language_variant_translation_hash_invalid");
  } else if (binding.translationHash !== computeVoxyEditorialTranslationHash(plan)) {
    errors.push("language_variant_translation_hash_stale");
  }
  if (!VOXY_EDITORIAL_TRANSLATION_STATUSES.includes(binding.translationStatus)) {
    errors.push("language_variant_translation_status_invalid");
  }
  if (
    binding.reviewRequired !== true ||
    binding.autoRender !== false ||
    binding.autoPublish !== false
  ) {
    errors.push("language_variant_review_guardrails_broken");
  }
  if (normalized(plan.outputLanguage).toLowerCase() !== binding.targetLanguage) {
    errors.push("language_variant_target_language_binding_mismatch");
  }
  if (normalized(plan.locale).toLowerCase() !== binding.targetLanguage) {
    errors.push("language_variant_locale_binding_mismatch");
  }
  if (normalized(plan.originalLanguage).toLowerCase() !== binding.sourceLanguage) {
    errors.push("language_variant_source_language_binding_mismatch");
  }
  if (plan.derivedFromStoryPlanId !== binding.translatedFromStoryPlanId) {
    errors.push("language_variant_master_story_binding_mismatch");
  }
  if (plan.derivedFromRevision !== binding.translatedFromStoryPlanRevision) {
    errors.push("language_variant_master_revision_binding_mismatch");
  }
  return Array.from(new Set(errors));
}

export function evaluateVoxyEditorialLanguageVariantFreshness(input: {
  plan: VoxyEditorialStoryPlan;
  masterStoryPlanId: string;
  masterStoryPlanRevision: number;
  evidenceSourcePackId: string;
}): VoxyEditorialLanguageVariantFreshness {
  const binding = getVoxyEditorialLanguageVariantBinding(input.plan);
  if (!binding) return { current: true, blockers: [] };
  const blockers = validateVoxyEditorialLanguageVariantBinding(input.plan);
  if (binding.translatedFromStoryPlanId !== input.masterStoryPlanId) {
    blockers.push("language_variant_master_story_changed");
  }
  if (binding.translatedFromStoryPlanRevision !== input.masterStoryPlanRevision) {
    blockers.push("language_variant_master_revision_changed");
  }
  if (binding.evidenceSourcePackId !== input.evidenceSourcePackId) {
    blockers.push("language_variant_evidence_fingerprint_changed");
  }
  if (binding.translationStatus !== "approved") {
    blockers.push(`language_variant_translation_not_approved:${binding.translationStatus}`);
  }
  return {
    current: blockers.length === 0,
    blockers: Array.from(new Set(blockers)),
  };
}

export function buildVoxyEditorialScriptVersion(plan: VoxyEditorialStoryPlan): string {
  const binding = getVoxyEditorialLanguageVariantBinding(plan);
  if (!binding) return `story-r${plan.revision}`;
  return `story-r${plan.revision}-tr${binding.translationRevision}-${binding.translationHash.slice(0, 16)}`;
}
