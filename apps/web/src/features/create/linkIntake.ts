/**
 * UI mirror for E150 Part16 Intake-Orchestrierung.
 *
 * This helper only classifies link-shaped intake for the local `/create`
 * clarification step. It mirrors canonical E150 intake fields like
 * `inputType`, `segments`, `sourceHints` and `missingInfoQuestions`, but it
 * does not scrape, summarize or auto-evaluate linked content.
 */
import type { CreateIntelligentFollowupResult } from "@/features/create/intelligentFollowupContract";
import { redactCreateSafetySensitiveText } from "@/features/create/safety/createSafetyLexicon";

export type CreateLinkKind = "youtube" | "video" | "article" | "web" | "multiple" | "unknown";

export type CreateLinkIntentOptionId =
  | "summarize"
  | "extract_claims"
  | "prepare_factcheck"
  | "add_source_to_dossier"
  | "derive_vote_questions";

export type CreateLinkLocale = "de" | "en";

export type CreateLinkIntentOption = {
  id: CreateLinkIntentOptionId;
  label: Record<CreateLinkLocale, string>;
};

export type CreateLinkIntentE150Field =
  | "sourceHints"
  | "missingInfoQuestions"
  | "evidenceNeeds"
  | "questionCandidates";

export type CreateLinkIntentE150Mapping = {
  inputType: "url" | "material_mix";
  mapsTo: CreateLinkIntentE150Field[];
};

export type CreateLinkIntakeDetection = {
  normalizedInput: string;
  hasLink: boolean;
  linkKind: CreateLinkKind;
  primaryUrl: string | null;
  urls: string[];
  linkOnly: boolean;
  mostlyLinkOnly: boolean;
  // Semantically this is the remaining `segments`/context once URLs are removed.
  remainingText: string;
  remainingWordCount: number;
};

export type CreateLinkIntakeMeta = {
  primaryUrl: string;
  urls: string[];
  linkKind: CreateLinkKind;
  selectedIntentId?: CreateLinkIntentOptionId;
  additionalContext?: string;
};

export const CREATE_LINK_INTENT_OPTIONS: readonly CreateLinkIntentOption[] = [
  {
    id: "summarize",
    label: {
      de: "Zusammenfassen",
      en: "Summarize content",
    },
  },
  {
    id: "extract_claims",
    label: {
      de: "Aussagen ableiten",
      en: "Derive statements",
    },
  },
  {
    id: "prepare_factcheck",
    label: {
      de: "Prüfpfad vorbereiten",
      en: "Prepare fact-check",
    },
  },
  {
    id: "add_source_to_dossier",
    label: {
      de: "Als Quelle vormerken",
      en: "Save as source",
    },
  },
  {
    id: "derive_vote_questions",
    label: {
      de: "Abstimmungsfragen ableiten",
      en: "Derive vote questions",
    },
  },
] as const;

const CREATE_LINK_INTENT_E150_MAPPING: Record<
  CreateLinkIntentOptionId,
  CreateLinkIntentE150Mapping
> = {
  summarize: {
    inputType: "url",
    mapsTo: ["sourceHints", "missingInfoQuestions"],
  },
  extract_claims: {
    inputType: "url",
    mapsTo: ["sourceHints", "evidenceNeeds"],
  },
  prepare_factcheck: {
    inputType: "url",
    mapsTo: ["sourceHints", "evidenceNeeds", "missingInfoQuestions"],
  },
  add_source_to_dossier: {
    inputType: "url",
    mapsTo: ["sourceHints"],
  },
  derive_vote_questions: {
    inputType: "material_mix",
    mapsTo: ["questionCandidates", "missingInfoQuestions"],
  },
};

const URL_PATTERN = /\bhttps?:\/\/[^\s<>"'`\])]+|\bwww\.[^\s<>"'`\])]+/gi;
const TRAILING_PUNCTUATION_PATTERN = /[),.;:!?]+$/;
const SENSITIVE_QUERY_KEY_PATTERN =
  /^(?:api[_-]?key|key|token|access[_-]?token|authorization|auth|session|cookie|password|passcode|secret|username|email|e[_-]?mail|phone|telephone|mobile)$/i;

export type CreateSourceUrlPersistenceDecision =
  | { ok: true; canonicalUrl: string }
  | { ok: false };

function containsCreateSafetySensitiveText(value: string): boolean {
  return redactCreateSafetySensitiveText(value) !== value;
}

function decodeCreateSourceUrlPath(pathname: string): string | null {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return null;
  }
}

/**
 * Canonical persistence gate for source URLs.
 *
 * The URL is itself a PII boundary. Unsafe components are rejected instead of
 * being rewritten because a rewritten URL would no longer identify the source
 * the citizen submitted and must never become a fetch target.
 */
export function validateCreateSourceUrlForPersistence(
  rawUrl: string,
): CreateSourceUrlPersistenceDecision {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false };
  }
  if (parsed.username || parsed.password || parsed.hash) {
    return { ok: false };
  }

  const decodedPath = decodeCreateSourceUrlPath(parsed.pathname);
  if (decodedPath === null || containsCreateSafetySensitiveText(decodedPath)) {
    return { ok: false };
  }

  for (const [key, value] of parsed.searchParams.entries()) {
    if (
      containsCreateSafetySensitiveText(key) ||
      containsCreateSafetySensitiveText(value) ||
      (value.length > 0 && SENSITIVE_QUERY_KEY_PATTERN.test(key))
    ) {
      return { ok: false };
    }
  }

  return { ok: true, canonicalUrl: parsed.toString() };
}

function normalizeDetectedUrl(raw: string): string {
  const normalized = raw.trim().replace(TRAILING_PUNCTUATION_PATTERN, "");
  if (!normalized) return normalized;
  if (normalized.toLowerCase().startsWith("www.")) {
    return `https://${normalized}`;
  }
  return normalized;
}

function extractUrls(text: string): string[] {
  const matches = text.match(URL_PATTERN) ?? [];
  const urls: string[] = [];
  for (const match of matches) {
    const normalized = normalizeDetectedUrl(match);
    if (!normalized || urls.includes(normalized)) continue;
    urls.push(normalized);
  }
  return urls;
}

function countMeaningfulWords(text: string): number {
  return text.match(/[0-9A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß]+/g)?.length ?? 0;
}

function resolveCreateLinkKind(urls: string[]): CreateLinkKind {
  if (urls.length === 0) return "unknown";
  if (urls.length > 1) return "multiple";

  const primaryUrl = urls[0];
  if (!primaryUrl) return "unknown";

  const lowerUrl = primaryUrl.toLowerCase();
  if (lowerUrl.includes("youtube.com") || lowerUrl.includes("youtu.be")) return "youtube";
  if (
    lowerUrl.includes("vimeo.com") ||
    lowerUrl.includes("/video/") ||
    /\.(mp4|mov|avi|mkv|webm)(?:$|[?#])/i.test(lowerUrl)
  ) {
    return "video";
  }
  if (/(article|artikel|news|story|bericht|blog|post)/i.test(lowerUrl)) return "article";
  return "web";
}

export function detectCreateLinkIntake(text: string): CreateLinkIntakeDetection {
  const normalizedInput = text.trim();
  const urls = extractUrls(normalizedInput);
  const withoutUrls = normalizedInput.replace(URL_PATTERN, " ");
  const remainingText = withoutUrls.replace(/\s+/g, " ").trim();
  const remainingWordCount = countMeaningfulWords(remainingText);
  const hasLink = urls.length > 0;
  const linkOnly = hasLink && remainingWordCount === 0;
  const mostlyLinkOnly =
    hasLink &&
    (linkOnly || (remainingWordCount <= 6 && remainingText.length <= 48));

  return {
    normalizedInput,
    hasLink,
    linkKind: resolveCreateLinkKind(urls),
    primaryUrl: urls[0] ?? null,
    urls,
    linkOnly,
    mostlyLinkOnly,
    remainingText,
    remainingWordCount,
  };
}

export function readCreateBoundLinkSourceUrl(
  followup: CreateIntelligentFollowupResult | null | undefined,
): string | null {
  const sourceUrl = followup?.meta?.analysis?.sourceUrl?.trim() ?? "";
  if (!sourceUrl) return null;
  const detection = detectCreateLinkIntake(followup?.sourceText ?? "");
  return detection.primaryUrl === sourceUrl ? sourceUrl : null;
}

export function hasCreatePendingLinkSource(
  followup: CreateIntelligentFollowupResult | null | undefined,
): boolean {
  const analysis = followup?.meta?.analysis;
  return Boolean(
    readCreateBoundLinkSourceUrl(followup) &&
      analysis?.state === "link_detected" &&
      analysis.sourceType === "link" &&
      analysis.sourceLoaded === false &&
      analysis.validationStatus === "not_started",
  );
}

export function resolveCreateLinkIntentOptionLabel(
  id: CreateLinkIntentOptionId,
  locale: CreateLinkLocale,
): string {
  return (
    CREATE_LINK_INTENT_OPTIONS.find((option) => option.id === id)?.label[locale] ??
    CREATE_LINK_INTENT_OPTIONS.find((option) => option.id === id)?.label.de ??
    id
  );
}

export function resolveCreateLinkIntentE150Mapping(
  id: CreateLinkIntentOptionId,
): CreateLinkIntentE150Mapping {
  return CREATE_LINK_INTENT_E150_MAPPING[id];
}

export function buildCreateLinkSourceNotice(params: {
  locale: CreateLinkLocale;
  selectedIntentId?: CreateLinkIntentOptionId | null;
}): string {
  const selection = params.selectedIntentId
    ? resolveCreateLinkIntentOptionLabel(params.selectedIntentId, params.locale)
    : null;

  if (params.locale === "en") {
    const prefix = selection ? `Selected: ${selection}. ` : "";
    const factcheckGuardrail =
      params.selectedIntentId === "prepare_factcheck"
        ? " Source verification or external source analysis starts only after explicit confirmation. No automatic cost booking."
        : "";
    return `${prefix}The link stays a source hint for now. Its content has not been automatically evaluated yet.${factcheckGuardrail}`;
  }

  const prefix = selection ? `Gewählt: ${selection}. ` : "";
  const factcheckGuardrail =
    params.selectedIntentId === "prepare_factcheck"
      ? " Quellenprüfung oder externe Quellenanalyse startet erst nach bewusster Bestätigung. Keine automatische Kostenbuchung."
      : "";
  return `${prefix}Der Link bleibt vorerst ein Quellenhinweis. Der Inhalt wurde noch nicht automatisch ausgewertet.${factcheckGuardrail}`;
}

export function buildCreateLinkIntakeMeta(params: {
  detection: CreateLinkIntakeDetection;
  selectedIntentId?: CreateLinkIntentOptionId | null;
  additionalContext?: string | null;
}): CreateLinkIntakeMeta | null {
  if (!params.detection.hasLink || !params.detection.primaryUrl) return null;
  const additionalContext = String(params.additionalContext ?? "").trim();
  return {
    primaryUrl: params.detection.primaryUrl,
    urls: params.detection.urls,
    linkKind: params.detection.linkKind,
    selectedIntentId: params.selectedIntentId ?? undefined,
    additionalContext: additionalContext || undefined,
  };
}
