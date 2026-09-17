import { z } from "zod";

export const VOG_PUBLIC_BALLOT_CONTRACT_VERSION = "vog-public-ballot-v1" as const;
export const VOG_PUBLIC_BALLOT_ACCESS_MODE = "public_guest" as const;
export const VOG_PUBLIC_BALLOT_ATTRIBUTION_MODE = "hidden" as const;
export const VOG_PUBLIC_BALLOT_LEGITIMACY_CLASS = "open_public_consultation" as const;
export const VOG_BALLOT_CSRF_HEADER = "x-edebatte-vog-ballot" as const;
export const VOG_BALLOT_CSRF_VALUE = "vote-v1" as const;
export const VOG_RELEASE_CSRF_HEADER = "x-edebatte-vog-release" as const;
export const VOG_RELEASE_CSRF_VALUE = "release-v1" as const;

/**
 * UI copy is initially available for these locales. Ballot translation maps
 * remain open to every canonical BCP-47 tag and do not require a schema change.
 */
export const VOG_PUBLIC_BALLOT_INITIAL_UI_LOCALES = [
  "de",
  "en",
  "fr",
  "es",
  "tr",
  "ar",
] as const;

export type VogPublicBallotUiLocale =
  (typeof VOG_PUBLIC_BALLOT_INITIAL_UI_LOCALES)[number];
export type VogPublicBallotLocale = string;
export type VogPublicBallotParticipationClass =
  | "open_guest"
  | "verified_vog_member";

const STABLE_OPTION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,95}$/;
const LOCALE_SAFE_PATTERN = /^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/;

export function canonicalizeVogPublicBallotLocale(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const candidate = value.trim();
  if (!candidate || candidate.length > 48 || !LOCALE_SAFE_PATTERN.test(candidate)) {
    return null;
  }
  try {
    return Intl.getCanonicalLocales(candidate)[0] ?? null;
  } catch {
    return null;
  }
}

function isCanonicalLocale(value: string) {
  return canonicalizeVogPublicBallotLocale(value) === value;
}

function isInitialUiLocale(value: string): value is VogPublicBallotUiLocale {
  return (VOG_PUBLIC_BALLOT_INITIAL_UI_LOCALES as readonly string[]).includes(value);
}

export function normalizeVogPublicBallotUiLocale(
  value: unknown,
  fallback: VogPublicBallotUiLocale = "de",
): VogPublicBallotUiLocale {
  if (Array.isArray(value)) return fallback;
  const locale = canonicalizeVogPublicBallotLocale(value);
  return locale && isInitialUiLocale(locale) ? locale : fallback;
}

export function getVogPublicBallotLocaleDirection(locale: string): "ltr" | "rtl" {
  try {
    const direction = (
      new Intl.Locale(locale) as Intl.Locale & {
        textInfo?: { direction?: "ltr" | "rtl" };
      }
    ).textInfo?.direction;
    if (direction === "rtl") return "rtl";
  } catch {
    // The release and query validators already reject malformed locales.
  }
  const language = locale.toLowerCase().split("-")[0];
  return ["ar", "fa", "he", "ps", "sd", "ug", "ur", "yi"].includes(language)
    ? "rtl"
    : "ltr";
}

const LocaleTagSchema = z
  .string()
  .trim()
  .min(2)
  .max(48)
  .refine(isCanonicalLocale, "canonical_bcp47_locale_required");

const LocalizedBallotCopySchema = z
  .object({
    title: z.string().trim().min(3).max(240),
    context: z.string().trim().min(3).max(800),
    options: z
      .record(z.string(), z.string().trim().min(1).max(160))
      .superRefine((options, ctx) => {
        const optionIds = Object.keys(options);
        if (optionIds.length < 2 || optionIds.length > 12) {
          ctx.addIssue({
            code: "custom",
            message: "localized_option_count_invalid",
          });
        }
        for (const optionId of optionIds) {
          if (!STABLE_OPTION_ID_PATTERN.test(optionId)) {
            ctx.addIssue({
              code: "custom",
              path: [optionId],
              message: "stable_option_id_required",
            });
          }
        }
      }),
  })
  .strict();

const BallotTranslationMapSchema = z
  .record(z.string(), LocalizedBallotCopySchema)
  .superRefine((translations, ctx) => {
    const locales = Object.keys(translations);
    if (locales.length === 0 || locales.length > 32) {
      ctx.addIssue({ code: "custom", message: "translation_locale_count_invalid" });
    }
    for (const locale of locales) {
      if (!isCanonicalLocale(locale)) {
        ctx.addIssue({
          code: "custom",
          path: [locale],
          message: "canonical_bcp47_locale_required",
        });
      }
    }
    const canonicalOptionIds = Object.keys(
      translations[locales[0]!]?.options ?? {},
    ).sort();
    for (const locale of locales.slice(1)) {
      const translatedOptionIds = Object.keys(translations[locale]!.options).sort();
      if (
        translatedOptionIds.length !== canonicalOptionIds.length ||
        translatedOptionIds.some((optionId, index) => optionId !== canonicalOptionIds[index])
      ) {
        ctx.addIssue({
          code: "custom",
          path: [locale, "options"],
          message: "localized_option_ids_mismatch",
        });
      }
    }
  });

const LocalizedLabelMapSchema = z
  .record(z.string(), z.string().trim().min(1).max(500))
  .superRefine((labels, ctx) => {
    const locales = Object.keys(labels);
    if (locales.length === 0 || locales.length > 32) {
      ctx.addIssue({ code: "custom", message: "label_locale_count_invalid" });
    }
    for (const locale of locales) {
      if (!isCanonicalLocale(locale)) {
        ctx.addIssue({
          code: "custom",
          path: [locale],
          message: "canonical_bcp47_locale_required",
        });
      }
    }
  });

const HttpsUrlSchema = z
  .string()
  .trim()
  .url()
  .max(2_048)
  .refine((value) => new URL(value).protocol === "https:", "https_required");

const EvidenceLinkSchema = z
  .object({
    id: z.string().trim().regex(/^[a-z0-9][a-z0-9_-]{1,63}$/i),
    labels: LocalizedLabelMapSchema,
    href: HttpsUrlSchema,
  })
  .strict();

const CounterPositionSchema = z
  .object({
    id: z.string().trim().regex(/^[a-z0-9][a-z0-9_-]{1,63}$/i),
    labels: LocalizedLabelMapSchema,
    href: HttpsUrlSchema.optional(),
  })
  .strict();

const DateSchema = z.preprocess((value) => {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed;
  }
  return value;
}, z.date());

export const VogPublicBallotReleaseSchema = z
  .object({
    contractVersion: z.literal(VOG_PUBLIC_BALLOT_CONTRACT_VERSION),
    publicRelease: z.literal(true),
    publicVotingEnabled: z.literal(true),
    accessMode: z.literal(VOG_PUBLIC_BALLOT_ACCESS_MODE),
    attributionMode: z.literal(VOG_PUBLIC_BALLOT_ATTRIBUTION_MODE),
    legitimacyClass: z.literal(VOG_PUBLIC_BALLOT_LEGITIMACY_CLASS),
    status: z.enum(["open", "closed"]),
    originId: z
      .string()
      .trim()
      .regex(/^vog-question-[a-z0-9][a-z0-9-]{0,63}$/),
    originalLocale: LocaleTagSchema,
    resultsVisibility: z.enum(["always", "after_vote"]),
    startsAt: DateSchema.nullable().optional(),
    closesAt: DateSchema.nullable().optional(),
    translations: BallotTranslationMapSchema,
    sources: z.array(EvidenceLinkSchema).min(1).max(12),
    counterPositions: z.array(CounterPositionSchema).min(1).max(12),
  })
  .strict()
  .superRefine((release, ctx) => {
    if (
      release.startsAt &&
      release.closesAt &&
      release.closesAt.getTime() <= release.startsAt.getTime()
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["closesAt"],
        message: "closesAt_must_follow_startsAt",
      });
    }
    const translationLocales = Object.keys(release.translations);
    if (!release.translations[release.originalLocale]) {
      ctx.addIssue({
        code: "custom",
        path: ["translations", release.originalLocale],
        message: "original_locale_translation_required",
      });
    }
    for (const [collectionName, entries] of [
      ["sources", release.sources],
      ["counterPositions", release.counterPositions],
    ] as const) {
      entries.forEach((entry, entryIndex) => {
        for (const locale of translationLocales) {
          if (!entry.labels[locale]) {
            ctx.addIssue({
              code: "custom",
              path: [collectionName, entryIndex, "labels", locale],
              message: "translation_label_required",
            });
          }
        }
      });
    }
  });

export type VogPublicBallotRelease = z.infer<typeof VogPublicBallotReleaseSchema>;

export type VogPublicBallotQuestionRecord = {
  id?: unknown;
  title?: unknown;
  description?: unknown;
  options?: unknown;
  publicAttribution?: unknown;
  allowAnonymousVoting?: unknown;
  vogPublicBallot?: unknown;
};

export type ValidatedVogPublicBallotQuestion = {
  id: string;
  canonicalOptions: string[];
  release: VogPublicBallotRelease;
};

export function validateVogPublicBallotQuestion(
  question: VogPublicBallotQuestionRecord,
): ValidatedVogPublicBallotQuestion | null {
  const id = typeof question.id === "string" ? question.id.trim() : "";
  const canonicalOptions = Array.isArray(question.options)
    ? question.options.map((option) => (typeof option === "string" ? option.trim() : ""))
    : [];
  const release = VogPublicBallotReleaseSchema.safeParse(question.vogPublicBallot);
  const canonicalOptionSet = new Set(canonicalOptions);

  if (
    !STABLE_OPTION_ID_PATTERN.test(id) ||
    canonicalOptions.length < 2 ||
    canonicalOptions.length > 12 ||
    canonicalOptionSet.size !== canonicalOptions.length ||
    canonicalOptions.some((optionId) => !STABLE_OPTION_ID_PATTERN.test(optionId)) ||
    !release.success ||
    question.publicAttribution !== "hidden" ||
    question.allowAnonymousVoting !== true ||
    release.data.attributionMode !== "hidden"
  ) {
    return null;
  }

  for (const translation of Object.values(release.data.translations)) {
    const translatedOptionIds = Object.keys(translation.options);
    if (
      translatedOptionIds.length !== canonicalOptions.length ||
      canonicalOptions.some((optionId) => !translation.options[optionId])
    ) {
      return null;
    }
  }

  return { id, canonicalOptions, release: release.data };
}

export type VogPublicBallotLifecycle = "open" | "scheduled" | "closed";

export function resolveVogPublicBallotLifecycle(input: {
  setStatus: unknown;
  release: VogPublicBallotRelease;
  now?: Date;
}): VogPublicBallotLifecycle {
  const now = input.now ?? new Date();
  if (input.setStatus !== "active" || input.release.status !== "open") {
    return "closed";
  }
  if (input.release.startsAt && input.release.startsAt.getTime() > now.getTime()) {
    return "scheduled";
  }
  if (input.release.closesAt && input.release.closesAt.getTime() <= now.getTime()) {
    return "closed";
  }
  return "open";
}

export type VogPublicBallotTranslationStatus =
  | "original"
  | "translated"
  | "missing_fallback"
  | "invalid_fallback";

export type VogPublicBallotLocaleResolution = {
  originalLocale: string;
  readingLocale: string;
  uiLocale: VogPublicBallotUiLocale;
  outputLocale: string;
  requestedReadingLocale: string | null;
  requestedOutputLocale: string | null;
  readingTranslationStatus: VogPublicBallotTranslationStatus;
  outputTranslationStatus: VogPublicBallotTranslationStatus;
  availableLocales: string[];
  direction: "ltr" | "rtl";
};

type LocaleCandidate =
  | { status: "missing"; locale: null }
  | { status: "invalid"; locale: null }
  | { status: "valid"; locale: string };

function readLocaleCandidate(value: unknown): LocaleCandidate {
  if (value === undefined || value === null || value === "") {
    return { status: "missing", locale: null };
  }
  if (Array.isArray(value)) return { status: "invalid", locale: null };
  const locale = canonicalizeVogPublicBallotLocale(value);
  return locale
    ? { status: "valid", locale }
    : { status: "invalid", locale: null };
}

function resolveContentLocale(input: {
  candidate: LocaleCandidate;
  originalLocale: string;
  availableLocales: readonly string[];
}): {
  locale: string;
  requestedLocale: string | null;
  status: VogPublicBallotTranslationStatus;
} {
  if (input.candidate.status === "missing") {
    return {
      locale: input.originalLocale,
      requestedLocale: null,
      status: "original",
    };
  }
  if (input.candidate.status === "invalid") {
    return {
      locale: input.originalLocale,
      requestedLocale: null,
      status: "invalid_fallback",
    };
  }
  const requestedLocale = input.candidate.locale;
  const allowlisted =
    isInitialUiLocale(requestedLocale) || input.availableLocales.includes(requestedLocale);
  if (!allowlisted) {
    return {
      locale: input.originalLocale,
      requestedLocale,
      status: "invalid_fallback",
    };
  }
  if (!input.availableLocales.includes(requestedLocale)) {
    return {
      locale: input.originalLocale,
      requestedLocale,
      status: "missing_fallback",
    };
  }
  return {
    locale: requestedLocale,
    requestedLocale,
    status: requestedLocale === input.originalLocale ? "original" : "translated",
  };
}

export function resolveVogPublicBallotLocales(input: {
  release: VogPublicBallotRelease;
  locale?: unknown;
  readingLocale?: unknown;
  uiLocale?: unknown;
  outputLocale?: unknown;
}): VogPublicBallotLocaleResolution {
  const originalLocale = input.release.originalLocale;
  const availableLocales = Object.keys(input.release.translations);
  const legacyLocale = input.locale;
  const reading = resolveContentLocale({
    candidate: readLocaleCandidate(input.readingLocale ?? legacyLocale),
    originalLocale,
    availableLocales,
  });
  const outputCandidate = readLocaleCandidate(
    input.outputLocale ?? input.readingLocale ?? legacyLocale,
  );
  const output =
    outputCandidate.status === "missing"
      ? {
          locale: reading.locale,
          requestedLocale: reading.requestedLocale,
          status: reading.status,
        }
      : resolveContentLocale({
          candidate: outputCandidate,
          originalLocale,
          availableLocales,
        });
  const uiCandidate = readLocaleCandidate(input.uiLocale ?? input.readingLocale ?? legacyLocale);
  const uiLocale =
    uiCandidate.status === "valid" && isInitialUiLocale(uiCandidate.locale)
      ? uiCandidate.locale
      : isInitialUiLocale(reading.locale)
        ? reading.locale
        : isInitialUiLocale(originalLocale)
          ? originalLocale
          : "en";

  return {
    originalLocale,
    readingLocale: reading.locale,
    uiLocale,
    outputLocale: output.locale,
    requestedReadingLocale: reading.requestedLocale,
    requestedOutputLocale: output.requestedLocale,
    readingTranslationStatus: reading.status,
    outputTranslationStatus: output.status,
    availableLocales,
    direction: getVogPublicBallotLocaleDirection(reading.locale),
  };
}

export type VogOriginMetadata = {
  source: "vote4gov" | "voiceopengov" | "direct";
  origin: "voiceopengov" | "vote4gov" | "edebatte";
  originId: string;
  originalLocale: string;
  readingLocale: string;
  uiLocale: VogPublicBallotUiLocale;
  outputLocale: string;
};

function readSingleMetadataValue(value: unknown): string {
  if (Array.isArray(value)) return "";
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function normalizeVogOriginMetadata(
  input: Record<string, unknown> | null | undefined,
  canonicalOriginId: string,
  locales: Pick<
    VogPublicBallotLocaleResolution,
    "originalLocale" | "readingLocale" | "uiLocale" | "outputLocale"
  >,
): VogOriginMetadata {
  const sourceValue = readSingleMetadataValue(input?.source);
  const originValue = readSingleMetadataValue(input?.origin);
  const source =
    sourceValue === "vote4gov" || sourceValue === "voiceopengov"
      ? sourceValue
      : "direct";
  const origin =
    originValue === "voiceopengov" ||
    originValue === "vote4gov" ||
    originValue === "edebatte"
      ? originValue
      : "edebatte";

  return {
    source,
    origin,
    // Release and resolved locale contract are authoritative. Query/body
    // metadata can never replace release, eligibility or participation truth.
    originId: canonicalOriginId,
    originalLocale: locales.originalLocale,
    readingLocale: locales.readingLocale,
    uiLocale: locales.uiLocale,
    outputLocale: locales.outputLocale,
  };
}

export function buildVogPublicBallotHref(input: {
  code: string;
  questionId: string;
  source?: VogOriginMetadata["source"];
  origin?: VogOriginMetadata["origin"];
  originId?: string;
  /** Backward-compatible input. New links use the separated locale fields. */
  locale?: string;
  readingLocale?: string;
  uiLocale?: string;
  outputLocale?: string;
}) {
  const params = new URLSearchParams();
  if (input.source) params.set("source", input.source);
  if (input.origin) params.set("origin", input.origin);
  if (input.originId) params.set("origin_id", input.originId);
  if (input.locale) params.set("locale", input.locale);
  if (input.readingLocale) params.set("reading_locale", input.readingLocale);
  if (input.uiLocale) params.set("ui_locale", input.uiLocale);
  if (input.outputLocale) params.set("output_locale", input.outputLocale);
  const query = params.toString();
  const pathname = `/vog/fragen/${encodeURIComponent(input.code)}/${encodeURIComponent(input.questionId)}`;
  return query ? `${pathname}?${query}` : pathname;
}
