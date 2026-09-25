import type { VoxyEditorialStoryPlan } from "./editorialStoryPlan";
import {
  evaluateVoxyEditorialTranslationSemanticGuard,
  VOXY_EDITORIAL_TRANSLATION_SEMANTIC_GUARD_VERSION,
  type VoxyEditorialTranslationSemanticGuardSnapshot,
} from "./editorialTranslationSemanticGuard";

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
  semanticGuard?: VoxyEditorialTranslationSemanticGuardSnapshot;
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

const SHA256_INITIAL = [
  0x6a09e667,
  0xbb67ae85,
  0x3c6ef372,
  0xa54ff53a,
  0x510e527f,
  0x9b05688c,
  0x1f83d9ab,
  0x5be0cd19,
] as const;

const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
  0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
  0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
  0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
  0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
] as const;

function rotateRight(value: number, bits: number) {
  return (value >>> bits) | (value << (32 - bits));
}

/**
 * Small synchronous SHA-256 implementation used by the shared story-plan
 * contract. It intentionally depends only on Web/JS primitives so importing
 * this module from a Client Component can never pull Node's crypto runtime
 * into the browser bundle.
 */
function browserSafeSha256(value: string): string {
  const bytes = new TextEncoder().encode(value);
  const bitLength = bytes.length * 8;
  const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;

  const view = new DataView(padded.buffer);
  const high = Math.floor(bitLength / 0x1_0000_0000);
  const low = bitLength >>> 0;
  view.setUint32(paddedLength - 8, high, false);
  view.setUint32(paddedLength - 4, low, false);

  const hash: number[] = [...SHA256_INITIAL];
  const words = new Uint32Array(64);

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      words[index] = view.getUint32(offset + index * 4, false);
    }
    for (let index = 16; index < 64; index += 1) {
      const x = words[index - 15]!;
      const y = words[index - 2]!;
      const s0 = rotateRight(x, 7) ^ rotateRight(x, 18) ^ (x >>> 3);
      const s1 = rotateRight(y, 17) ^ rotateRight(y, 19) ^ (y >>> 10);
      words[index] = (words[index - 16]! + s0 + words[index - 7]! + s1) >>> 0;
    }

    let a = hash[0]!;
    let b = hash[1]!;
    let c = hash[2]!;
    let d = hash[3]!;
    let e = hash[4]!;
    let f = hash[5]!;
    let g = hash[6]!;
    let h = hash[7]!;

    for (let index = 0; index < 64; index += 1) {
      const s1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + choice + SHA256_K[index]! + words[index]!) >>> 0;
      const s0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + majority) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    hash[0] = (hash[0]! + a) >>> 0;
    hash[1] = (hash[1]! + b) >>> 0;
    hash[2] = (hash[2]! + c) >>> 0;
    hash[3] = (hash[3]! + d) >>> 0;
    hash[4] = (hash[4]! + e) >>> 0;
    hash[5] = (hash[5]! + f) >>> 0;
    hash[6] = (hash[6]! + g) >>> 0;
    hash[7] = (hash[7]! + h) >>> 0;
  }

  return hash.map((word) => word.toString(16).padStart(8, "0")).join("");
}

export function computeVoxyEditorialTranslationHash(
  plan: VoxyEditorialStoryPlan,
): string {
  return browserSafeSha256(JSON.stringify(translationPresentationPayload(plan)));
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

  const semanticGuard = evaluateVoxyEditorialTranslationSemanticGuard({
    masterPlan: input.masterPlan,
    translatedPlan: input.translatedPlan,
  });
  if (semanticGuard.hardBlockers.length > 0) {
    throw new Error(
      `voxy_language_variant_semantic_invariant_failed:${semanticGuard.hardBlockers.join(",")}`,
    );
  }

  const requestedTranslationStatus = input.translationStatus ?? "needs_review";
  if (!VOXY_EDITORIAL_TRANSLATION_STATUSES.includes(requestedTranslationStatus)) {
    throw new Error("voxy_language_variant_translation_status_invalid");
  }
  const translationStatus =
    requestedTranslationStatus === "approved" && semanticGuard.reviewFlags.length > 0
      ? "uncertain"
      : requestedTranslationStatus;

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
      semanticGuard: {
        version: semanticGuard.version,
        reviewFlags: semanticGuard.reviewFlags,
        reviewRequired: true,
        autoApprove: false,
      },
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
  if (binding.semanticGuard) {
    if (binding.semanticGuard.version !== VOXY_EDITORIAL_TRANSLATION_SEMANTIC_GUARD_VERSION) {
      errors.push("language_variant_semantic_guard_version_invalid");
    }
    if (
      binding.semanticGuard.reviewRequired !== true ||
      binding.semanticGuard.autoApprove !== false
    ) {
      errors.push("language_variant_semantic_guard_guardrails_broken");
    }
    if (
      binding.semanticGuard.reviewFlags.length > 0 &&
      binding.translationStatus === "approved"
    ) {
      errors.push("language_variant_semantic_guard_requires_review");
    }
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
