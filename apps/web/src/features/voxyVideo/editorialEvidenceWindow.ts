import type { CanonicalSourcePackSource } from "@/features/create/canonicalSourcePackContract";
import type { DossierFindingDoc } from "@features/dossier/schemas";
import {
  resolveVoxyEvidenceWindowPresentation,
  type VoxyEditorialEvidenceContext,
  type VoxyEditorialStoryChapter,
} from "./editorialStoryPlan";
import type { VoxyVideoFormat } from "./modernCharacterContracts";

export type VoxyEditorialEvidenceRole =
  | "supports"
  | "refutes"
  | "mixed"
  | "unclear"
  | "context";

export type VoxyEditorialEvidenceWindowSourceView = {
  sourceId: string;
  title: string;
  sourceType: CanonicalSourcePackSource["sourceType"];
  reliabilityHint: CanonicalSourcePackSource["reliabilityHint"];
  evidenceState: CanonicalSourcePackSource["evidenceState"];
  reviewState: CanonicalSourcePackSource["reviewState"];
  evidenceRole: VoxyEditorialEvidenceRole;
  sourceLocale: string | null;
  translationStatus: CanonicalSourcePackSource["translationStatus"];
  snippet: string | null;
  snippetOrigin: "translated" | "original" | "unavailable";
  retrievedAt: string | null;
  sourceUrl: string | null;
};

export type VoxyEditorialEvidenceWindowView = {
  kind: VoxyEditorialStoryChapter["evidenceWindow"]["kind"];
  presentation: "hidden" | "single" | "side_by_side" | "sequence";
  sources: VoxyEditorialEvidenceWindowSourceView[];
  totalSourceCount: number;
  sequenceIndex: number | null;
  hasPendingReview: boolean;
  hasEvidenceCaveat: boolean;
};

function normalizeId(value: string): string {
  return String(value ?? "").trim();
}

function findingRoleForSource(input: {
  sourceId: string;
  findingIds: string[];
  findings: DossierFindingDoc[];
}): VoxyEditorialEvidenceRole {
  const roles = new Set(
    input.findings
      .filter(
        (finding) =>
          input.findingIds.includes(finding.findingId) &&
          finding.citations.some(
            (citation) => citation.sourceId === input.sourceId,
          ),
      )
      .map((finding) => finding.verdict),
  );

  if (roles.size === 0) return "context";
  if (roles.size > 1 || roles.has("mixed")) return "mixed";
  const [only] = Array.from(roles);
  if (only === "supports" || only === "refutes" || only === "unclear") {
    return only;
  }
  return "context";
}

function resolveSnippet(input: {
  source: CanonicalSourcePackSource;
  outputLanguage: string;
}): Pick<
  VoxyEditorialEvidenceWindowSourceView,
  "snippet" | "snippetOrigin"
> {
  const sourceLocale = normalizeId(input.source.sourceLocale ?? "");
  const outputLanguage = normalizeId(input.outputLanguage);
  const translated = normalizeId(input.source.translatedSnippet ?? "");
  const original = normalizeId(input.source.originalSnippet ?? "");

  if (
    translated &&
    input.source.translationStatus === "translated" &&
    sourceLocale &&
    sourceLocale !== outputLanguage
  ) {
    return { snippet: translated, snippetOrigin: "translated" };
  }
  if (original) return { snippet: original, snippetOrigin: "original" };
  if (translated) return { snippet: translated, snippetOrigin: "translated" };
  return { snippet: null, snippetOrigin: "unavailable" };
}

function buildSourceView(input: {
  source: CanonicalSourcePackSource;
  outputLanguage: string;
  findingIds: string[];
  findings: DossierFindingDoc[];
}): VoxyEditorialEvidenceWindowSourceView {
  const snippet = resolveSnippet({
    source: input.source,
    outputLanguage: input.outputLanguage,
  });
  return {
    sourceId: input.source.sourceId,
    title: input.source.title,
    sourceType: input.source.sourceType,
    reliabilityHint: input.source.reliabilityHint,
    evidenceState: input.source.evidenceState,
    reviewState: input.source.reviewState,
    evidenceRole: findingRoleForSource({
      sourceId: input.source.sourceId,
      findingIds: input.findingIds,
      findings: input.findings,
    }),
    sourceLocale: input.source.sourceLocale ?? null,
    translationStatus: input.source.translationStatus,
    ...snippet,
    retrievedAt: input.source.retrievedAt ?? null,
    sourceUrl: input.source.url ?? null,
  };
}

export function buildVoxyEditorialEvidenceWindowView(input: {
  chapter: VoxyEditorialStoryChapter;
  context: VoxyEditorialEvidenceContext;
  format: VoxyVideoFormat;
  outputLanguage: string;
  sequenceIndex?: number;
}): VoxyEditorialEvidenceWindowView {
  const presentation = resolveVoxyEvidenceWindowPresentation({
    format: input.format,
    window: input.chapter.evidenceWindow,
  });
  if (presentation === "hidden") {
    return {
      kind: input.chapter.evidenceWindow.kind,
      presentation,
      sources: [],
      totalSourceCount: 0,
      sequenceIndex: null,
      hasPendingReview: false,
      hasEvidenceCaveat: false,
    };
  }

  const sourceMap = new Map(
    input.context.sourcePack.sources.map((source) => [source.sourceId, source]),
  );
  const findingIds = Array.from(
    new Set([
      ...input.chapter.findingIds,
      ...input.chapter.evidenceWindow.findingIds,
    ]),
  );
  const allSources = input.chapter.evidenceWindow.sourceIds
    .map((sourceId) => sourceMap.get(sourceId))
    .filter((source): source is CanonicalSourcePackSource => Boolean(source))
    .map((source) =>
      buildSourceView({
        source,
        outputLanguage: input.outputLanguage,
        findingIds,
        findings: input.context.findings,
      }),
    );

  let visibleSources = allSources;
  let sequenceIndex: number | null = null;
  if (presentation === "sequence" && allSources.length > 0) {
    sequenceIndex = Math.max(
      0,
      Math.min(allSources.length - 1, input.sequenceIndex ?? 0),
    );
    visibleSources = [allSources[sequenceIndex]];
  }

  return {
    kind: input.chapter.evidenceWindow.kind,
    presentation,
    sources: visibleSources,
    totalSourceCount: allSources.length,
    sequenceIndex,
    hasPendingReview: allSources.some(
      (source) => source.reviewState !== "approved",
    ),
    hasEvidenceCaveat: allSources.some(
      (source) => source.evidenceState !== "supported",
    ),
  };
}
