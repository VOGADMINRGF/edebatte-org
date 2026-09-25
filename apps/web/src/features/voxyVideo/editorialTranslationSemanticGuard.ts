import type { CanonicalSourcePack } from "@/features/create/canonicalSourcePackContract";
import { buildMultilingualEvidenceTrustRecord } from "@/features/create/multilingualEvidenceTrustContract";
import type { VoxyEditorialStoryPlan } from "./editorialStoryPlan";

export const VOXY_EDITORIAL_TRANSLATION_SEMANTIC_GUARD_VERSION =
  "voxy-editorial-translation-semantic-guard-v1" as const;

export type VoxyEditorialTranslationSemanticGuardSnapshot = {
  version: typeof VOXY_EDITORIAL_TRANSLATION_SEMANTIC_GUARD_VERSION;
  reviewFlags: string[];
  reviewRequired: true;
  autoApprove: false;
};

export type VoxyEditorialTranslationSemanticGuardReport = {
  version: typeof VOXY_EDITORIAL_TRANSLATION_SEMANTIC_GUARD_VERSION;
  hardBlockers: string[];
  reviewFlags: string[];
  safeForBinding: boolean;
  requiresReview: boolean;
};

const CURRENCY_CODES = new Set([
  "EUR",
  "USD",
  "GBP",
  "CHF",
  "PLN",
  "SEK",
  "NOK",
  "DKK",
  "CZK",
  "HUF",
  "RON",
  "BGN",
  "ISK",
  "UAH",
  "TRY",
  "RSD",
]);

const UNIT_TOKENS = new Set([
  "%",
  "km/h",
  "m/s",
  "km",
  "cm",
  "mm",
  "m",
  "kg",
  "mg",
  "g",
  "t",
  "l",
  "ml",
  "kwh",
  "mwh",
  "gwh",
  "kw",
  "mw",
  "gw",
  "wh",
  "w",
  "ha",
  "ppm",
  "ppb",
  "°c",
  "°f",
]);

const PERCENT_WORDS: Readonly<Record<string, readonly string[]>> = {
  de: ["prozent"],
  en: ["percent", "percentage"],
  fr: ["pourcent", "pourcentage"],
  es: ["porcentaje"],
  it: ["percento"],
  pt: ["porcentagem"],
  nl: ["procent"],
  pl: ["procent"],
  cs: ["procent"],
  sk: ["percent"],
  sl: ["odstotek"],
  hr: ["posto"],
  ro: ["procent"],
  hu: ["százalék"],
  da: ["procent"],
  sv: ["procent"],
  no: ["prosent"],
  fi: ["prosentti"],
  et: ["protsent"],
  lv: ["procenti"],
  lt: ["procentas"],
  el: ["ποσοστό"],
  bg: ["процент"],
  ga: ["faoincéad"],
  mt: ["fil-mija"],
};

const NEGATION_MARKERS: Readonly<Record<string, readonly string[]>> = {
  de: ["nicht", "kein", "keine", "keinen", "keinem", "keiner", "nie", "niemals", "ohne"],
  en: ["not", "no", "never", "without", "neither", "nor"],
  fr: ["ne", "pas", "jamais", "aucun", "aucune", "sans"],
  es: ["no", "nunca", "jamás", "ningún", "ninguna", "sin"],
  it: ["non", "mai", "nessun", "nessuna", "senza"],
  pt: ["não", "nunca", "jamais", "nenhum", "nenhuma", "sem"],
  nl: ["niet", "geen", "nooit", "zonder"],
  pl: ["nie", "żaden", "żadna", "nigdy", "bez"],
  cs: ["ne", "není", "nejsou", "nikdy", "žádný", "bez"],
  sk: ["nie", "niet", "nikdy", "žiadny", "bez"],
  sl: ["ne", "ni", "nikoli", "brez"],
  hr: ["ne", "nije", "nikad", "bez"],
  ro: ["nu", "nici", "niciodată", "fără"],
  hu: ["nem", "nincs", "soha", "nélkül"],
  da: ["ikke", "ingen", "aldrig", "uden"],
  sv: ["inte", "ingen", "aldrig", "utan"],
  no: ["ikke", "ingen", "aldri", "uten"],
  fi: ["ei", "eivät", "en", "et", "emme", "ette", "ilman"],
  et: ["ei", "mitte", "kunagi", "ilma"],
  lv: ["ne", "nav", "nekad"],
  lt: ["ne", "nėra", "niekada", "be"],
  el: ["δεν", "μη", "ποτέ", "χωρίς"],
  bg: ["не", "няма", "никога", "без"],
  ga: ["ní", "nach", "riamh", "gan"],
  mt: ["mhux", "ma", "qatt", "mingħajr"],
};

const UNCERTAINTY_MARKERS: Readonly<Record<string, readonly string[]>> = {
  de: ["könnte", "dürfte", "möglicherweise", "vielleicht", "wahrscheinlich", "mutmaßlich", "unklar"],
  en: ["may", "might", "could", "possibly", "perhaps", "likely", "probably", "allegedly", "unclear"],
  fr: ["pourrait", "peut-être", "probablement", "possiblement", "incertain"],
  es: ["podría", "quizá", "quizás", "probablemente", "posiblemente", "incierto"],
  it: ["potrebbe", "forse", "probabilmente", "possibilmente", "incerto"],
  pt: ["poderia", "talvez", "provavelmente", "possivelmente", "incerto"],
  nl: ["zou", "mogelijk", "misschien", "waarschijnlijk", "onduidelijk"],
  pl: ["może", "mógłby", "prawdopodobnie", "możliwe", "niejasne"],
  cs: ["mohl", "možná", "pravděpodobně", "nejisté"],
  sk: ["mohol", "možno", "pravdepodobne", "neisté"],
  sl: ["lahko", "morda", "verjetno", "negotovo"],
  hr: ["mogao", "možda", "vjerojatno", "neizvjesno"],
  ro: ["ar", "poate", "probabil", "posibil", "incert"],
  hu: ["lehet", "talán", "valószínűleg", "bizonytalan"],
  da: ["kunne", "måske", "sandsynligvis", "usikkert"],
  sv: ["kunde", "kanske", "troligen", "osäkert"],
  no: ["kunne", "kanskje", "sannsynligvis", "usikkert"],
  fi: ["voisi", "ehkä", "todennäköisesti", "epävarma"],
  et: ["võib", "võiks", "ilmselt", "ebakindel"],
  lv: ["varētu", "iespējams", "droši", "neskaidrs"],
  lt: ["galėtų", "galbūt", "tikriausiai", "neaišku"],
  el: ["θα", "ίσως", "πιθανώς", "αβέβαιο"],
  bg: ["може", "вероятно", "възможно", "неясно"],
  ga: ["d'fhéadfadh", "b'fhéidir", "is-dócha", "éiginnte"],
  mt: ["jista'", "forsi", "probabbilment", "inċert"],
};

function unique(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function languageKey(value: string): string {
  return value.trim().toLowerCase().split(/[-_]/)[0] ?? "";
}

function normalizeIds(values: readonly string[]): string[] {
  return unique(values.map((value) => String(value ?? "").trim())).sort();
}

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  const a = normalizeIds(left);
  const b = normalizeIds(right);
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function words(value: string): string[] {
  return value.toLocaleLowerCase().match(/\p{L}+(?:['’-]\p{L}+)?/gu) ?? [];
}

function markerCount(value: string, markers: readonly string[]): number {
  const tokens = words(value);
  const markerSet = new Set(markers.map((marker) => marker.toLocaleLowerCase()));
  return tokens.filter((token) => markerSet.has(token)).length;
}

function numericTokens(value: string): string[] {
  const matches = value.match(/[-+]?\d(?:[\d\s.,'’]*\d)?/g) ?? [];
  return matches
    .map((token) => {
      const sign = token.trim().startsWith("-") ? "-" : "";
      const digits = token.replace(/\D/g, "");
      return digits ? `${sign}${digits}` : "";
    })
    .filter(Boolean)
    .sort();
}

function percentMarkerCount(value: string, language: string): number {
  const symbolic = (value.match(/%/g) ?? []).length;
  const lexical = markerCount(value, PERCENT_WORDS[languageKey(language)] ?? []);
  return symbolic + lexical;
}

function currencyTokens(value: string): string[] {
  const symbols = value.match(/[€£$¥]/g) ?? [];
  const codes = value.match(/\b[A-Z]{3}\b/g) ?? [];
  return [
    ...symbols,
    ...codes.filter((token) => CURRENCY_CODES.has(token.toUpperCase())).map((token) => token.toUpperCase()),
  ].sort();
}

function unitTokens(value: string): string[] {
  const normalized = value.toLocaleLowerCase();
  const matches = normalized.matchAll(
    /[-+]?\d(?:[\d\s.,'’]*\d)?\s*(km\/h|m\/s|kwh|mwh|gwh|kw|mw|gw|wh|kg|mg|ppm|ppb|km|cm|mm|ml|ha|°c|°f|m|g|t|l|w)\b/gu,
  );
  return Array.from(matches, (match) => match[1] ?? "").filter(Boolean).sort();
}

function acronymTokens(value: string): string[] {
  const raw = value.match(/\p{Lu}{2,}(?:[-&.]\p{Lu}{2,})*/gu) ?? [];
  return unique(
    raw
      .map((token) => token.replace(/[.-]+$/g, ""))
      .filter((token) => token.length >= 2)
      .filter((token) => !CURRENCY_CODES.has(token))
      .filter((token) => !UNIT_TOKENS.has(token.toLocaleLowerCase())),
  ).sort();
}

function quoteMarkerCount(value: string): number {
  return (value.match(/["“”„«»‹›]/g) ?? []).length;
}

function compareTokenList(
  reviewFlags: string[],
  path: string,
  category: string,
  source: readonly string[],
  target: readonly string[],
) {
  if (source.length !== target.length || source.some((value, index) => value !== target[index])) {
    reviewFlags.push(`semantic_guard_${category}_changed:${path}`);
  }
}

function compareTextRisk(input: {
  path: string;
  source: string;
  target: string;
  sourceLanguage: string;
  targetLanguage: string;
  reviewFlags: string[];
}) {
  compareTokenList(input.reviewFlags, input.path, "number", numericTokens(input.source), numericTokens(input.target));
  compareTokenList(input.reviewFlags, input.path, "currency", currencyTokens(input.source), currencyTokens(input.target));
  compareTokenList(input.reviewFlags, input.path, "unit", unitTokens(input.source), unitTokens(input.target));
  compareTokenList(input.reviewFlags, input.path, "acronym", acronymTokens(input.source), acronymTokens(input.target));

  if (
    percentMarkerCount(input.source, input.sourceLanguage) !==
    percentMarkerCount(input.target, input.targetLanguage)
  ) {
    input.reviewFlags.push(`semantic_guard_percent_changed:${input.path}`);
  }
  if (quoteMarkerCount(input.source) !== quoteMarkerCount(input.target)) {
    input.reviewFlags.push(`semantic_guard_quote_mode_changed:${input.path}`);
  }

  const sourceNegation = markerCount(
    input.source,
    NEGATION_MARKERS[languageKey(input.sourceLanguage)] ?? [],
  );
  const targetNegation = markerCount(
    input.target,
    NEGATION_MARKERS[languageKey(input.targetLanguage)] ?? [],
  );
  if ((sourceNegation > 0) !== (targetNegation > 0)) {
    input.reviewFlags.push(`semantic_guard_negation_risk:${input.path}`);
  }

  const sourceUncertainty = markerCount(
    input.source,
    UNCERTAINTY_MARKERS[languageKey(input.sourceLanguage)] ?? [],
  );
  const targetUncertainty = markerCount(
    input.target,
    UNCERTAINTY_MARKERS[languageKey(input.targetLanguage)] ?? [],
  );
  if ((sourceUncertainty > 0) !== (targetUncertainty > 0)) {
    input.reviewFlags.push(`semantic_guard_modality_uncertainty_risk:${input.path}`);
  }
}

function compareChapterStructure(input: {
  masterPlan: VoxyEditorialStoryPlan;
  translatedPlan: VoxyEditorialStoryPlan;
  hardBlockers: string[];
  reviewFlags: string[];
}) {
  const translatedById = new Map(
    input.translatedPlan.chapters.map((chapter) => [chapter.chapterId, chapter]),
  );
  const masterIds = input.masterPlan.chapters.map((chapter) => chapter.chapterId);
  const translatedIds = input.translatedPlan.chapters.map((chapter) => chapter.chapterId);
  if (masterIds.join("\u0000") !== translatedIds.join("\u0000")) {
    input.hardBlockers.push("semantic_guard_chapter_sequence_changed");
  }

  for (const masterChapter of input.masterPlan.chapters) {
    const translatedChapter = translatedById.get(masterChapter.chapterId);
    if (!translatedChapter) {
      input.hardBlockers.push(`semantic_guard_chapter_missing:${masterChapter.chapterId}`);
      continue;
    }
    const chapterPath = `chapter:${masterChapter.chapterId}`;
    if (translatedChapter.role !== masterChapter.role) {
      input.hardBlockers.push(`semantic_guard_chapter_role_changed:${masterChapter.chapterId}`);
    }

    const translatedClaims = new Map(
      translatedChapter.claimBindings.map((binding) => [binding.claimId, binding.presentation]),
    );
    const masterClaims = new Map(
      masterChapter.claimBindings.map((binding) => [binding.claimId, binding.presentation]),
    );
    if (!sameIds([...masterClaims.keys()], [...translatedClaims.keys()])) {
      input.hardBlockers.push(`semantic_guard_claim_ids_changed:${masterChapter.chapterId}`);
    }
    for (const [claimId, presentation] of masterClaims) {
      if (translatedClaims.get(claimId) !== presentation) {
        input.hardBlockers.push(
          `semantic_guard_claim_presentation_changed:${masterChapter.chapterId}:${claimId}`,
        );
      }
    }

    if (!sameIds(masterChapter.sourceIds, translatedChapter.sourceIds)) {
      input.hardBlockers.push(`semantic_guard_source_ids_changed:${masterChapter.chapterId}`);
    }
    if (!sameIds(masterChapter.findingIds, translatedChapter.findingIds)) {
      input.hardBlockers.push(`semantic_guard_finding_ids_changed:${masterChapter.chapterId}`);
    }
    if (!sameIds(masterChapter.openQuestionIds, translatedChapter.openQuestionIds)) {
      input.hardBlockers.push(`semantic_guard_open_question_ids_changed:${masterChapter.chapterId}`);
    }
    if (
      masterChapter.evidenceWindow.kind !== translatedChapter.evidenceWindow.kind ||
      !sameIds(masterChapter.evidenceWindow.sourceIds, translatedChapter.evidenceWindow.sourceIds) ||
      !sameIds(masterChapter.evidenceWindow.findingIds, translatedChapter.evidenceWindow.findingIds)
    ) {
      input.hardBlockers.push(`semantic_guard_evidence_window_changed:${masterChapter.chapterId}`);
    }

    const translatedConsequences = new Map(
      translatedChapter.consequences.map((item) => [item.consequenceId, item]),
    );
    if (
      !sameIds(
        masterChapter.consequences.map((item) => item.consequenceId),
        translatedChapter.consequences.map((item) => item.consequenceId),
      )
    ) {
      input.hardBlockers.push(`semantic_guard_consequence_ids_changed:${masterChapter.chapterId}`);
    }
    for (const masterConsequence of masterChapter.consequences) {
      const translatedConsequence = translatedConsequences.get(masterConsequence.consequenceId);
      if (!translatedConsequence) continue;
      if (
        translatedConsequence.kind !== masterConsequence.kind ||
        !sameIds(masterConsequence.claimIds, translatedConsequence.claimIds) ||
        !sameIds(masterConsequence.sourceIds, translatedConsequence.sourceIds)
      ) {
        input.hardBlockers.push(
          `semantic_guard_consequence_binding_changed:${masterChapter.chapterId}:${masterConsequence.consequenceId}`,
        );
      }
      compareTextRisk({
        path: `${chapterPath}:consequence:${masterConsequence.consequenceId}`,
        source: masterConsequence.text,
        target: translatedConsequence.text,
        sourceLanguage: input.masterPlan.outputLanguage,
        targetLanguage: input.translatedPlan.outputLanguage,
        reviewFlags: input.reviewFlags,
      });
    }

    compareTextRisk({
      path: `${chapterPath}:headline`,
      source: masterChapter.headline,
      target: translatedChapter.headline,
      sourceLanguage: input.masterPlan.outputLanguage,
      targetLanguage: input.translatedPlan.outputLanguage,
      reviewFlags: input.reviewFlags,
    });
    compareTextRisk({
      path: `${chapterPath}:narration`,
      source: masterChapter.narration,
      target: translatedChapter.narration,
      sourceLanguage: input.masterPlan.outputLanguage,
      targetLanguage: input.translatedPlan.outputLanguage,
      reviewFlags: input.reviewFlags,
    });
  }
}

export function evaluateVoxyEditorialTranslationSemanticGuard(input: {
  masterPlan: VoxyEditorialStoryPlan;
  translatedPlan: VoxyEditorialStoryPlan;
}): VoxyEditorialTranslationSemanticGuardReport {
  const hardBlockers: string[] = [];
  const reviewFlags: string[] = [];

  if (input.masterPlan.archetype !== input.translatedPlan.archetype) {
    hardBlockers.push("semantic_guard_archetype_changed");
  }
  if (input.masterPlan.durationClass !== input.translatedPlan.durationClass) {
    hardBlockers.push("semantic_guard_duration_class_changed");
  }

  compareChapterStructure({ ...input, hardBlockers, reviewFlags });
  compareTextRisk({
    path: "story:title",
    source: input.masterPlan.title,
    target: input.translatedPlan.title,
    sourceLanguage: input.masterPlan.outputLanguage,
    targetLanguage: input.translatedPlan.outputLanguage,
    reviewFlags,
  });

  const dedupedHardBlockers = unique(hardBlockers);
  const dedupedReviewFlags = unique(reviewFlags);
  return {
    version: VOXY_EDITORIAL_TRANSLATION_SEMANTIC_GUARD_VERSION,
    hardBlockers: dedupedHardBlockers,
    reviewFlags: dedupedReviewFlags,
    safeForBinding: dedupedHardBlockers.length === 0,
    requiresReview: dedupedReviewFlags.length > 0,
  };
}

export function evaluateVoxyEditorialTranslationEvidenceTrust(input: {
  sourcePack: CanonicalSourcePack;
  targetLanguage: string;
}): string[] {
  const trust = buildMultilingualEvidenceTrustRecord({
    sourcePack: input.sourcePack,
    userLocale: input.targetLanguage,
    readingLocale: input.targetLanguage,
  });
  const blockers: string[] = [];
  for (const entry of trust.entries) {
    if (entry.translationStatus === "needs_review") {
      blockers.push(`language_variant_source_translation_needs_review:${entry.sourceId}`);
    }
    if (entry.translationStatus === "uncertain") {
      blockers.push(`language_variant_source_translation_uncertain:${entry.sourceId}`);
    }
  }
  if (trust.overallTrustStatus === "translation_uncertain") {
    blockers.push("language_variant_source_pack_translation_uncertain");
  }
  return unique(blockers);
}
