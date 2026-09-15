import {
  createStartDraftContext,
  type StartDraftContext,
} from "@/features/start/startDraftContext";
import {
  evaluatePublicQuestionGeneralization,
  type PublicQuestionGeneralizationResult,
} from "@/features/create/safety/publicQuestionGeneralization";

export const MANUAL_ANLASSRAUM_SCOPE_VALUES = [
  "public",
  "organization_internal",
  "private_group",
] as const;

export const MANUAL_ANLASSRAUM_VISIBILITY_VALUES = [
  "private_draft",
  "internal",
  "public_after_review",
  "public_unverified",
] as const;

export const MANUAL_ANLASSRAUM_COMMUNITY_OPTIONS_MODE_VALUES = [
  "disabled",
  "review_required",
  "open_unverified",
] as const;

export const MANUAL_ANLASSRAUM_AI_SUPPORT_MODE_VALUES = [
  "disabled",
  "optional_suggestions",
  "option_suggestions",
  "source_review",
] as const;

export const MANUAL_ANLASSRAUM_NEXT_STEP_VALUES = [
  "save_draft",
  "start_internal",
  "submit_public_review",
  "continue_create",
] as const;

export type ManualAnlassraumScope = (typeof MANUAL_ANLASSRAUM_SCOPE_VALUES)[number];
export type ManualAnlassraumVisibility = (typeof MANUAL_ANLASSRAUM_VISIBILITY_VALUES)[number];
export type ManualAnlassraumCommunityOptionsMode =
  (typeof MANUAL_ANLASSRAUM_COMMUNITY_OPTIONS_MODE_VALUES)[number];
export type ManualAnlassraumAiSupportMode =
  (typeof MANUAL_ANLASSRAUM_AI_SUPPORT_MODE_VALUES)[number];
export type ManualAnlassraumNextStep = (typeof MANUAL_ANLASSRAUM_NEXT_STEP_VALUES)[number];

export type ManualAnlassraumSetup = {
  title: string;
  votingQuestion: string;
  description: string;
  scope: ManualAnlassraumScope;
  visibility: ManualAnlassraumVisibility;
  options: string[];
  communityOptionsMode: ManualAnlassraumCommunityOptionsMode;
  aiSupportMode: ManualAnlassraumAiSupportMode;
  nextStep: ManualAnlassraumNextStep;
  questionGuard?: PublicQuestionGeneralizationResult;
};

export type ManualAnlassraumChoiceDefinition<T extends string> = {
  value: T;
  label: string;
  description: string;
};

export type ManualAnlassraumActionState = {
  hasFrameInput: boolean;
  optionCount: number;
  canSaveDraft: boolean;
  canStartInternal: boolean;
  canSubmitPublicReview: boolean;
  canContinueCreate: boolean;
  publicReviewRequirements: string[];
};

export const MANUAL_ANLASSRAUM_SERVER_DRAFT_SOURCE = "runden_manual_anlassraum";
export const MANUAL_ANLASSRAUM_SERVER_DRAFT_SCHEMA_VERSION =
  "manual_anlassraum_server_draft.v1";

export type ManualAnlassraumServerDraftSnapshot = {
  draftId: string;
  updatedAt: string | null;
  setup: ManualAnlassraumSetup;
};

export const MANUAL_ANLASSRAUM_SCOPE_CHOICES: readonly ManualAnlassraumChoiceDefinition<ManualAnlassraumScope>[] =
  [
    {
      value: "public",
      label: "Öffentlich",
      description: "Der Anlass kann später bewusst für Beteiligung geöffnet werden.",
    },
    {
      value: "organization_internal",
      label: "Organisation intern",
      description: "Der Anlass bleibt zunächst im geschützten Arbeitsraum deiner Organisation.",
    },
    {
      value: "private_group",
      label: "Private Gruppe",
      description: "Ein kleiner Kreis bereitet den Anlass zuerst gemeinsam vor.",
    },
  ] as const;

export const MANUAL_ANLASSRAUM_VISIBILITY_CHOICES: readonly ManualAnlassraumChoiceDefinition<ManualAnlassraumVisibility>[] =
  [
    {
      value: "private_draft",
      label: "Privater Entwurf",
      description: "Nur als Arbeitsstand speichern und noch nicht teilen.",
    },
    {
      value: "internal",
      label: "Nur intern sichtbar",
      description: "Im internen Kreis besprechen, bevor weitere Sichtbarkeit entsteht.",
    },
    {
      value: "public_after_review",
      label: "Öffentlich nach Prüfung",
      description: "Erst nach bewusster Prüfung sichtbar machen.",
    },
    {
      value: "public_unverified",
      label: "Öffentlich, noch ungeprüft",
      description: "Mit klarer Vorsichtssprache sichtbar, ohne als geprüft zu gelten.",
    },
  ] as const;

export const MANUAL_ANLASSRAUM_COMMUNITY_OPTIONS_MODE_CHOICES: readonly ManualAnlassraumChoiceDefinition<ManualAnlassraumCommunityOptionsMode>[] =
  [
    {
      value: "disabled",
      label: "Nur feste Optionen",
      description: "Nur die hier gesetzten Optionen bleiben offen.",
    },
    {
      value: "review_required",
      label: "Vorschläge mit Prüfung",
      description: "Menschen können weitere Optionen vorschlagen, bevor sie sichtbar werden.",
    },
    {
      value: "open_unverified",
      label: "Vorschläge offen sammeln",
      description: "Weitere Vorschläge werden als ungeprüfte Ergänzungen gesammelt.",
    },
  ] as const;

export const MANUAL_ANLASSRAUM_AI_SUPPORT_MODE_CHOICES: readonly ManualAnlassraumChoiceDefinition<ManualAnlassraumAiSupportMode>[] =
  [
    {
      value: "disabled",
      label: "Keine KI",
      description: "Du startest vollständig manuell.",
    },
    {
      value: "optional_suggestions",
      label: "Optionale Hinweise",
      description: "Später nur zusätzliche Formulierungshilfen holen.",
    },
    {
      value: "option_suggestions",
      label: "Optionen ergänzen",
      description: "Später Varianten für mögliche Antworten vorschlagen lassen.",
    },
    {
      value: "source_review",
      label: "Quellen prüfen",
      description: "Später nur Quellen- und Prüfhinweise ergänzen.",
    },
  ] as const;

export function createEmptyManualAnlassraumSetup(): ManualAnlassraumSetup {
  return {
    title: "",
    votingQuestion: "",
    description: "",
    scope: "public",
    visibility: "private_draft",
    options: ["", ""],
    communityOptionsMode: "disabled",
    aiSupportMode: "disabled",
    nextStep: "save_draft",
  };
}

export function normalizeManualAnlassraumText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeManualAnlassraumOption(value: string): string {
  return normalizeManualAnlassraumText(value);
}

export function sanitizeManualAnlassraumSetup(
  input: ManualAnlassraumSetup,
): ManualAnlassraumSetup {
  const normalizedOptions = input.options.map(normalizeManualAnlassraumOption);
  const optionSlots = normalizedOptions.length >= 2 ? normalizedOptions : [...normalizedOptions, "", ""].slice(0, 2);

  const votingQuestion = normalizeManualAnlassraumText(input.votingQuestion);
  return {
    ...input,
    title: normalizeManualAnlassraumText(input.title),
    votingQuestion,
    description: normalizeManualAnlassraumText(input.description),
    options: optionSlots,
    questionGuard: evaluatePublicQuestionGeneralization({
      originalInput: votingQuestion,
      candidatePublicQuestion: votingQuestion,
      actorContexts: [],
      actorExtraction: {
        status: "unverified",
        source: "human_review",
        independentFromCandidateProvider: false,
        evidenceRefs: [],
      },
    }),
  };
}

export function countConfiguredManualAnlassraumOptions(options: readonly string[]): number {
  return options.filter((option) => normalizeManualAnlassraumOption(option).length > 0).length;
}

export function hasManualAnlassraumFrameInput(setup: ManualAnlassraumSetup): boolean {
  return (
    normalizeManualAnlassraumText(setup.title).length > 0 ||
    normalizeManualAnlassraumText(setup.votingQuestion).length > 0
  );
}

export function getManualAnlassraumSignalTitle(setup: ManualAnlassraumSetup): string {
  const normalizedTitle = normalizeManualAnlassraumText(setup.title);
  if (normalizedTitle) return normalizedTitle.slice(0, 160);

  const normalizedQuestion = normalizeManualAnlassraumText(setup.votingQuestion);
  if (normalizedQuestion) return normalizedQuestion.slice(0, 160);

  return "Manueller Anlassraum-Entwurf";
}

export function resolveManualAnlassraumActionState(
  setup: ManualAnlassraumSetup,
): ManualAnlassraumActionState {
  const normalized = sanitizeManualAnlassraumSetup(setup);
  const hasFrameInput = hasManualAnlassraumFrameInput(normalized);
  const optionCount = countConfiguredManualAnlassraumOptions(normalized.options);
  const publicReviewRequirements: string[] = [];

  if (!hasFrameInput) {
    publicReviewRequirements.push("Setze mindestens einen Titel oder eine Abstimmungsfrage.");
  }
  if (optionCount < 2) {
    publicReviewRequirements.push("Für eine öffentliche Einreichung braucht es mindestens zwei Optionen.");
  }

  return {
    hasFrameInput,
    optionCount,
    canSaveDraft: hasFrameInput,
    canStartInternal: hasFrameInput,
    canSubmitPublicReview: hasFrameInput && optionCount >= 2,
    canContinueCreate: hasFrameInput,
    publicReviewRequirements,
  };
}

function capitalizeManualAnlassraumText(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function deriveManualAnlassraumTitleFromText(value: string): string {
  const normalized = normalizeManualAnlassraumText(value)
    .replace(/^bei uns fehlt\s+/i, "")
    .replace(/^ich m[oö]chte\s+/i, "")
    .replace(/[.!?]$/, "");

  if (!normalized) return "Manueller Anlassraum-Entwurf";
  return capitalizeManualAnlassraumText(normalized).slice(0, 160);
}

export function deriveManualAnlassraumSetupFromStartDraft(input: {
  text: string;
  preview?: Pick<
    NonNullable<StartDraftContext["preview"]>,
    "possibleTopics" | "openQuestions"
  >;
}): ManualAnlassraumSetup {
  const normalizedText = normalizeManualAnlassraumText(input.text);
  const title = deriveManualAnlassraumTitleFromText(normalizedText);
  const votingQuestion =
    normalizeManualAnlassraumText(input.preview?.openQuestions?.[0] ?? "") ||
    (/schulweg/i.test(normalizedText)
      ? "Welche Maßnahme verbessert den Schulweg zuerst?"
      : "Welche Maßnahme hilft zuerst?");
  const description =
    normalizedText ||
    normalizeManualAnlassraumText(input.preview?.possibleTopics?.[0] ?? "") ||
    "Arbeitsstand aus einem vorhandenen Entwurf.";
  const options = /schulweg/i.test(normalizedText)
    ? [
        "Zebrastreifen oder Querungshilfe",
        "Tempo 30 oder Verkehrsberuhigung",
        "Bessere Beleuchtung und Sichtachsen",
        "Mehr Schulwegbegleitung",
        "Schneller Pilot vor Ort",
        "Anderer Vorschlag",
      ]
    : [
        "Sofort starten",
        "Erst intern besprechen",
        "Weitere Hinweise sammeln",
        "Später entscheiden",
        "Anderer Vorschlag",
      ];

  return sanitizeManualAnlassraumSetup({
    ...createEmptyManualAnlassraumSetup(),
    title,
    votingQuestion,
    description,
    options,
  });
}

function mapScopeToPrefillLabel(scope: ManualAnlassraumScope): string {
  return (
    MANUAL_ANLASSRAUM_SCOPE_CHOICES.find((choice) => choice.value === scope)?.label ?? "Öffentlich"
  );
}

function mapVisibilityToPrefillLabel(visibility: ManualAnlassraumVisibility): string {
  return (
    MANUAL_ANLASSRAUM_VISIBILITY_CHOICES.find((choice) => choice.value === visibility)?.label ??
    "Privater Entwurf"
  );
}

function mapCommunityModeToPrefillLabel(
  mode: ManualAnlassraumCommunityOptionsMode,
): string {
  return (
    MANUAL_ANLASSRAUM_COMMUNITY_OPTIONS_MODE_CHOICES.find((choice) => choice.value === mode)?.label ??
    "Nur feste Optionen"
  );
}

function mapAiModeToPrefillLabel(mode: ManualAnlassraumAiSupportMode): string {
  return (
    MANUAL_ANLASSRAUM_AI_SUPPORT_MODE_CHOICES.find((choice) => choice.value === mode)?.label ??
    "Keine KI"
  );
}

export function buildManualAnlassraumPrefill(setup: ManualAnlassraumSetup): string {
  const normalized = sanitizeManualAnlassraumSetup(setup);
  const optionLines = normalized.options
    .map(normalizeManualAnlassraumOption)
    .filter(Boolean)
    .map((option) => `- ${option}`);

  const lines = [
    "Manueller Anlassraum-Entwurf",
    `Titel: ${normalized.title || "—"}`,
    `Abstimmungsfrage: ${normalized.votingQuestion || "—"}`,
    `Beschreibung: ${normalized.description || "—"}`,
    `Rahmen: ${mapScopeToPrefillLabel(normalized.scope)}`,
    `Sichtbarkeit: ${mapVisibilityToPrefillLabel(normalized.visibility)}`,
    `Community-Regeln: ${mapCommunityModeToPrefillLabel(normalized.communityOptionsMode)}`,
    `KI-Unterstützung: ${mapAiModeToPrefillLabel(normalized.aiSupportMode)}`,
    "Optionen:",
    ...(optionLines.length > 0 ? optionLines : ["- Noch keine festen Optionen"]),
  ];

  return lines.join("\n");
}

export function buildManualAnlassraumStartDraft(
  setup: ManualAnlassraumSetup,
  existing?: Pick<StartDraftContext, "id" | "createdAt" | "handoffCount"> | null,
): StartDraftContext | null {
  const normalized = sanitizeManualAnlassraumSetup(setup);
  const text = buildManualAnlassraumPrefill(normalized);
  const draft = createStartDraftContext({
    id: existing?.id,
    createdAt: existing?.createdAt,
    text,
    normalizedText: text,
    origin: "round_handoff",
    intent: "round_suggestion",
    targetHint: "rounds",
    preview: {
      contributionType: "Anlassraum-Entwurf",
      possibleTopics: normalized.title ? [normalized.title] : [],
      openQuestions: normalized.votingQuestion ? [normalized.votingQuestion] : [],
      suggestedNextSteps: [
        "Runde weiterbearbeiten",
        normalized.aiSupportMode === "disabled"
          ? "Nur bei Bedarf in /create vertiefen"
          : "In /create weiter ausarbeiten",
      ],
      relevance:
        normalized.visibility === "public_after_review" ||
        normalized.visibility === "public_unverified"
          ? "public_relevant"
          : "internal_review",
    },
  });
  if (!draft) return null;
  return {
    ...draft,
    handoffCount: existing?.handoffCount ?? draft.handoffCount,
  };
}

export function buildManualAnlassraumServerDraftSavePayload(input: {
  setup: ManualAnlassraumSetup;
  draftId?: string | null;
}) {
  const normalized = sanitizeManualAnlassraumSetup(input.setup);
  const prefill = buildManualAnlassraumPrefill(normalized);
  return {
    draftId: input.draftId ?? undefined,
    source: MANUAL_ANLASSRAUM_SERVER_DRAFT_SOURCE,
    text: prefill,
    textOriginal: prefill,
    textPrepared: prefill,
    analysis: {
      manualAnlassraumDraft: {
        schemaVersion: MANUAL_ANLASSRAUM_SERVER_DRAFT_SCHEMA_VERSION,
        sourceSurface: "/runden/new",
        setup: normalized,
        noAiRunStarted: true,
        noAiUsageEvent: true,
        noDeepSearchStarted: true,
        reviewFirstOnly: true,
        questionGuard: normalized.questionGuard,
      },
    },
  };
}

export function readManualAnlassraumServerDraftSnapshot(
  value: unknown,
): ManualAnlassraumServerDraftSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.source !== MANUAL_ANLASSRAUM_SERVER_DRAFT_SOURCE) return null;

  const recordId = (() => {
    const raw = record._id;
    if (typeof raw === "string") return raw;
    if (
      raw &&
      typeof raw === "object" &&
      "toHexString" in raw &&
      typeof (raw as { toHexString?: unknown }).toHexString === "function"
    ) {
      return String((raw as { toHexString: () => string }).toHexString());
    }
    return "";
  })();
  if (!recordId) return null;

  const analysis =
    record.analysis && typeof record.analysis === "object" && !Array.isArray(record.analysis)
      ? (record.analysis as Record<string, unknown>)
      : null;
  const manualDraft =
    analysis?.manualAnlassraumDraft &&
    typeof analysis.manualAnlassraumDraft === "object" &&
    !Array.isArray(analysis.manualAnlassraumDraft)
      ? (analysis.manualAnlassraumDraft as Record<string, unknown>)
      : null;
  if (
    manualDraft?.schemaVersion !== MANUAL_ANLASSRAUM_SERVER_DRAFT_SCHEMA_VERSION
  ) {
    return null;
  }

  const setup =
    manualDraft.setup && typeof manualDraft.setup === "object" && !Array.isArray(manualDraft.setup)
      ? sanitizeManualAnlassraumSetup(
          manualDraft.setup as ManualAnlassraumSetup,
        )
      : null;
  if (!setup) return null;

  return {
    draftId: recordId,
    updatedAt:
      typeof record.updatedAt === "string"
        ? record.updatedAt
        : record.updatedAt instanceof Date
          ? record.updatedAt.toISOString()
          : null,
    setup,
  };
}

export function buildManualAnlassraumContinueCreateHref(params: {
  returnTo?: string;
  setup: ManualAnlassraumSetup;
  draftId?: string | null;
}): string {
  const normalized = sanitizeManualAnlassraumSetup(params.setup);
  const searchParams = new URLSearchParams();
  searchParams.set("mode", "source");
  searchParams.set("source", "runden");
  searchParams.set("reason", "manual_anlassraum_continue_create");
  searchParams.set("signalTitle", getManualAnlassraumSignalTitle(normalized));
  searchParams.set("prefill", buildManualAnlassraumPrefill(normalized));
  searchParams.set("returnTo", params.returnTo || "/runden/new");
  if (typeof params.draftId === "string" && params.draftId.trim()) {
    searchParams.set("draftId", params.draftId.trim());
  }
  return `/create?${searchParams.toString()}`;
}
