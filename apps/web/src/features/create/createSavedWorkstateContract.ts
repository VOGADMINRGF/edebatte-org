export const CREATE_SAVED_WORKSTATE_SCHEMA_VERSION = "create_saved_workstate.v1";

export const CREATE_SAVED_WORKSTATE_VISIBILITIES = [
  "private",
  "admin_internal",
  "organization_internal",
  "community_candidate",
  "published",
] as const;

export type CreateSavedWorkstateVisibility =
  (typeof CREATE_SAVED_WORKSTATE_VISIBILITIES)[number];

export const CREATE_SAVED_WORKSTATE_TYPES = [
  "saved_contribution",
  "topic_candidate",
  "question_candidate",
  "source_list",
  "internal_note",
  "community_candidate",
  "deferred_work",
  "parked_topic",
] as const;

export type CreateSavedWorkstateType =
  (typeof CREATE_SAVED_WORKSTATE_TYPES)[number];

export const CREATE_SAVED_WORKSTATE_STATUSES = [
  "saved",
  "parked",
  "needs_review",
  "prepared",
  "published",
] as const;

export type CreateSavedWorkstateStatus =
  (typeof CREATE_SAVED_WORKSTATE_STATUSES)[number];

export type CreateSavedWorkstateMetadata = {
  topicId?: string | null;
  topicTitle?: string | null;
  summary?: string | null;
  evidenceSnippets?: string[];
  subtopics?: string[];
  suggestedQuestions?: string[];
  sourceSection?: string | null;
  sourceLabel?: string | null;
  linkLoaded?: boolean;
  materialReviewId?: string | null;
  materialId?: string | null;
  materialReviewAction?: "reuse" | "continue" | "enrich" | "create_new" | null;
  suggestedOptions?: string[];
};

export type CreateSavedWorkstateRecord = {
  schemaVersion: typeof CREATE_SAVED_WORKSTATE_SCHEMA_VERSION;
  id: string;
  ownerUserId: string;
  organizationId: string | null;
  visibility: CreateSavedWorkstateVisibility;
  type: CreateSavedWorkstateType;
  status: CreateSavedWorkstateStatus;
  sourceUrl: string | null;
  sourceAnalysisId: string | null;
  parentTopicId: string | null;
  title: string;
  content: string;
  metadata: CreateSavedWorkstateMetadata;
  resumeHref: string;
  createdAt: string;
  updatedAt: string;
};

export type PersistCreateSavedWorkstateInput = {
  ownerUserId: string;
  organizationId?: string | null;
  visibility: CreateSavedWorkstateVisibility;
  type: CreateSavedWorkstateType;
  status: CreateSavedWorkstateStatus;
  sourceUrl?: string | null;
  sourceAnalysisId?: string | null;
  parentTopicId?: string | null;
  title: string;
  content: string;
  metadata?: CreateSavedWorkstateMetadata;
  resumeHref: string;
};

export function createSavedWorkstateVisibilityLabel(
  visibility: CreateSavedWorkstateVisibility,
): string {
  switch (visibility) {
    case "admin_internal":
      return "Nur Admin";
    case "organization_internal":
      return "Intern";
    case "community_candidate":
      return "Community-Kandidat";
    case "published":
      return "Veröffentlicht";
    case "private":
    default:
      return "Privat";
  }
}

export function createSavedWorkstateTypeLabel(
  type: CreateSavedWorkstateType,
): string {
  switch (type) {
    case "topic_candidate":
      return "Thema";
    case "question_candidate":
      return "Frage";
    case "source_list":
      return "Quelle";
    case "internal_note":
      return "Interne Notiz";
    case "community_candidate":
      return "Community-Entwurf";
    case "deferred_work":
      return "Später";
    case "parked_topic":
      return "Geparktes Thema";
    case "saved_contribution":
    default:
      return "Beitrag";
  }
}

export function createSavedWorkstateStatusLabel(
  status: CreateSavedWorkstateStatus,
): string {
  switch (status) {
    case "parked":
      return "Geparkt";
    case "needs_review":
      return "Review offen";
    case "prepared":
      return "Vorbereitet";
    case "published":
      return "Veröffentlicht";
    case "saved":
    default:
      return "Gespeichert";
  }
}
