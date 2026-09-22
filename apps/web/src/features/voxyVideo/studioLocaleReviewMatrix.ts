import {
  SUPPORTED_LOCALES,
  getDir,
  type SupportedLocale,
} from "@/config/locales";
import type { VoxyLocalCompositionAudioInputRecord } from "./localCompositionAudioAssetStore";
import type { VoxyVideoFormat } from "./modernCharacterContracts";
import type { VoxyStudioDraft } from "./studioDraft";
import { evaluateVoxyStudioAllFormatLayoutSafety } from "./studioLayoutSafety";

export const VOXY_STUDIO_LOCALE_TRANSLATION_STATUSES = [
  "not_prepared",
  "not_needed",
  "needs_review",
  "locale_draft_approved",
] as const;
export type VoxyStudioLocaleTranslationStatus =
  (typeof VOXY_STUDIO_LOCALE_TRANSLATION_STATUSES)[number];

export const VOXY_STUDIO_LOCALE_VOICE_STATUSES = [
  "not_prepared",
  "voice_unavailable",
  "voice_available",
] as const;
export type VoxyStudioLocaleVoiceStatus =
  (typeof VOXY_STUDIO_LOCALE_VOICE_STATUSES)[number];

export const VOXY_STUDIO_LOCALE_CAPTION_STATUSES = [
  "not_prepared",
  "preparation_pending",
  "ready",
] as const;
export type VoxyStudioLocaleCaptionStatus =
  (typeof VOXY_STUDIO_LOCALE_CAPTION_STATUSES)[number];

export const VOXY_STUDIO_LOCALE_FORMAT_SAFETY_STATUSES = [
  "not_prepared",
  "ready",
  "warning",
  "blocked",
] as const;
export type VoxyStudioLocaleFormatSafetyStatus =
  (typeof VOXY_STUDIO_LOCALE_FORMAT_SAFETY_STATUSES)[number];

export type VoxyStudioLocaleReviewMatrixEntry = {
  locale: SupportedLocale;
  direction: "ltr" | "rtl";
  draftId: string | null;
  draftRevision: number | null;
  storyPlanId: string | null;
  storyPlanRevision: number | null;
  draftStatus: VoxyStudioDraft["status"] | "not_prepared";
  exactLocaleApprovalPresent: boolean;
  translationStatus: VoxyStudioLocaleTranslationStatus;
  voiceStatus: VoxyStudioLocaleVoiceStatus;
  voiceProfileId: string | null;
  fallbackLocale: null;
  captionStatus: VoxyStudioLocaleCaptionStatus;
  formatSafety: Record<VoxyVideoFormat, VoxyStudioLocaleFormatSafetyStatus>;
  rtlReviewRequired: boolean;
  rtlReviewSatisfiedByExplicitLocaleApproval: boolean;
};

export type VoxyStudioLocaleReviewMatrix = {
  briefingId: string;
  title: string;
  originalLanguage: string;
  locales: VoxyStudioLocaleReviewMatrixEntry[];
  preparedLocales: number;
  approvedLocales: number;
  totalLocales: number;
};

function approved(draft: VoxyStudioDraft) {
  return (
    ["approved_for_render", "rendered", "approved_for_publish"].includes(draft.status) &&
    draft.renderApproval?.studioDraftRevision === draft.revision &&
    draft.renderApproval.storyPlanRevision === draft.storyPlan.revision
  );
}

function formatSafetyStatus(
  draft: VoxyStudioDraft,
): Record<VoxyVideoFormat, VoxyStudioLocaleFormatSafetyStatus> {
  const results = evaluateVoxyStudioAllFormatLayoutSafety(draft);
  return Object.fromEntries(
    (Object.keys(results) as VoxyVideoFormat[]).map((format) => {
      const result = results[format];
      const status: VoxyStudioLocaleFormatSafetyStatus = result.blockers.length
        ? "blocked"
        : result.warnings.length
          ? "warning"
          : "ready";
      return [format, status];
    }),
  ) as Record<VoxyVideoFormat, VoxyStudioLocaleFormatSafetyStatus>;
}

function newestDraft(left: VoxyStudioDraft, right: VoxyStudioDraft) {
  if (left.revision !== right.revision) return left.revision > right.revision ? left : right;
  return left.updatedAt >= right.updatedAt ? left : right;
}

export function buildVoxyStudioLocaleReviewMatrices(input: {
  drafts: readonly VoxyStudioDraft[];
  audioInputsByDraftId?: Readonly<Record<string, readonly VoxyLocalCompositionAudioInputRecord[]>>;
}): VoxyStudioLocaleReviewMatrix[] {
  const byBriefing = new Map<string, VoxyStudioDraft[]>();
  for (const draft of input.drafts) {
    const list = byBriefing.get(draft.briefingId) ?? [];
    list.push(draft);
    byBriefing.set(draft.briefingId, list);
  }

  return Array.from(byBriefing.entries())
    .map(([briefingId, drafts]) => {
      const latest = drafts.reduce(newestDraft);
      const byLocale = new Map<SupportedLocale, VoxyStudioDraft>();
      for (const draft of drafts) {
        const locale = draft.storyPlan.outputLanguage.toLowerCase();
        if (!(SUPPORTED_LOCALES as readonly string[]).includes(locale)) continue;
        const typedLocale = locale as SupportedLocale;
        const current = byLocale.get(typedLocale);
        byLocale.set(typedLocale, current ? newestDraft(current, draft) : draft);
      }

      const locales = SUPPORTED_LOCALES.map((locale): VoxyStudioLocaleReviewMatrixEntry => {
        const draft = byLocale.get(locale) ?? null;
        if (!draft) {
          return {
            locale,
            direction: getDir(locale),
            draftId: null,
            draftRevision: null,
            storyPlanId: null,
            storyPlanRevision: null,
            draftStatus: "not_prepared",
            exactLocaleApprovalPresent: false,
            translationStatus: "not_prepared",
            voiceStatus: "not_prepared",
            voiceProfileId: null,
            fallbackLocale: null,
            captionStatus: "not_prepared",
            formatSafety: {
              "16:9": "not_prepared",
              "9:16": "not_prepared",
              "1:1": "not_prepared",
            },
            rtlReviewRequired: getDir(locale) === "rtl",
            rtlReviewSatisfiedByExplicitLocaleApproval: false,
          };
        }

        const localeApproved = approved(draft);
        const audioInputs = input.audioInputsByDraftId?.[draft.draftId] ?? [];
        const audio = audioInputs.find(
          (record) =>
            record.artifactId === draft.draftId &&
            record.briefingId === draft.briefingId &&
            record.storyPlanId === draft.storyPlan.storyPlanId &&
            record.storyPlanRevision === draft.storyPlan.revision &&
            record.scriptVersion === `story-r${draft.storyPlan.revision}` &&
            record.locale.toLowerCase() === locale &&
            record.voiceUsageApproved === true &&
            record.fallbackLocale === null,
        ) ?? null;
        const originalLanguage = draft.storyPlan.originalLanguage.toLowerCase();
        const translationStatus: VoxyStudioLocaleTranslationStatus =
          locale === originalLanguage
            ? "not_needed"
            : localeApproved
              ? "locale_draft_approved"
              : "needs_review";

        return {
          locale,
          direction: getDir(locale),
          draftId: draft.draftId,
          draftRevision: draft.revision,
          storyPlanId: draft.storyPlan.storyPlanId,
          storyPlanRevision: draft.storyPlan.revision,
          draftStatus: draft.status,
          exactLocaleApprovalPresent: localeApproved,
          translationStatus,
          voiceStatus: audio ? "voice_available" : "voice_unavailable",
          voiceProfileId: audio?.voiceProfileId ?? null,
          fallbackLocale: null,
          captionStatus: audio?.captionCues.length ? "ready" : "preparation_pending",
          formatSafety: formatSafetyStatus(draft),
          rtlReviewRequired: getDir(locale) === "rtl",
          rtlReviewSatisfiedByExplicitLocaleApproval:
            getDir(locale) === "rtl" && localeApproved,
        };
      });

      return {
        briefingId,
        title: latest.title,
        originalLanguage: latest.storyPlan.originalLanguage,
        locales,
        preparedLocales: locales.filter((entry) => entry.draftId !== null).length,
        approvedLocales: locales.filter((entry) => entry.exactLocaleApprovalPresent).length,
        totalLocales: SUPPORTED_LOCALES.length,
      };
    })
    .sort((left, right) => left.briefingId.localeCompare(right.briefingId));
}