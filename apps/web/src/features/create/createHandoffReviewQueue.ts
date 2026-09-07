import type {
  CreateHandoffDraft,
  CreateHandoffDraftTarget,
} from "@/features/create/createHandoffDrafts";
import type { CanonicalPreparationStatus } from "@/features/create/canonicalPreparationStatusContract";
import { getHandoffDraftOpenQuestions } from "@/features/create/createHandoffDrafts";
import {
  getRoleSpecificReviewRequirement,
  type RoleSpecificReviewType,
} from "@/features/create/roleSpecificReviewContract";
import type { UserContributionLifecycleStatus } from "@/features/create/userContributionLifecycleContract";
import type { GovernanceActorRole } from "@features/trust/types";
import type { ExistingMatchUserDecision } from "@/features/create/createContributionPackageContract";

export const CREATE_HANDOFF_REVIEW_QUEUE_ITEM_STATUSES = [
  "draft",
  "queued_for_review",
  "in_review",
  "needs_clarification",
  "approved_for_setup",
  "rejected",
  "archived",
] as const;

export type CreateHandoffReviewQueueItemStatus =
  (typeof CREATE_HANDOFF_REVIEW_QUEUE_ITEM_STATUSES)[number];

export const CREATE_HANDOFF_REVIEW_QUEUE_ITEM_KINDS = [
  "opinion_count_review",
  "existing_branch_connection_review",
  "new_branch_review",
  "dossier_candidate_review",
  "anlassraum_candidate_review",
  "participation_space_candidate_review",
  "editorial_review",
  "factcheck_request_review",
] as const;

export type CreateHandoffReviewQueueItemKind =
  (typeof CREATE_HANDOFF_REVIEW_QUEUE_ITEM_KINDS)[number];

export type CreateHandoffReviewQueueItemAuditEntry = {
  at: string;
  action: string;
  note: string;
};

export type CreateHandoffReviewQueueItem = {
  id: string;
  sourceDraftId: string;
  kind: CreateHandoffReviewQueueItemKind;
  status: CreateHandoffReviewQueueItemStatus;
  requiredReviewType: RoleSpecificReviewType;
  requiredReviewerRoles: GovernanceActorRole[];
  lifecycleStatus: UserContributionLifecycleStatus;
  preparationStatus: CanonicalPreparationStatus;
  reviewReadyIsApproved: false;
  title: string;
  summary: string;
  authorStandpoint?: string | null;
  existingMatchDecision?: ExistingMatchUserDecision | null;
  topicTitle?: string | null;
  target: CreateHandoffDraftTarget;
  requiresEditorialReview: boolean;
  requiresFactcheck: boolean;
  reviewerNotes: string[];
  openQuestions: string[];
  auditTrail: CreateHandoffReviewQueueItemAuditEntry[];
  autoCreate: false;
  autoPublish: false;
  createdAt: string;
  updatedAt: string;
};

const REVIEW_QUEUE_GUARDRAIL_NOTE =
  "Review-first: keine automatische Veröffentlichung, Erstellung oder Zusammenführung.";

function nowIso(): string {
  return new Date().toISOString();
}

function unique(values: readonly string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

function mapDraftTargetToQueueItemKind(
  target: CreateHandoffDraftTarget,
): CreateHandoffReviewQueueItemKind {
  if (target === "opinion_count") return "opinion_count_review";
  if (target === "existing_branch_connection") {
    return "existing_branch_connection_review";
  }
  if (target === "new_branch") return "new_branch_review";
  if (target === "dossier_candidate") return "dossier_candidate_review";
  if (target === "anlassraum_candidate") {
    return "anlassraum_candidate_review";
  }
  if (target === "participation_space_candidate") {
    return "participation_space_candidate_review";
  }
  if (target === "factcheck_request") return "factcheck_request_review";
  return "editorial_review";
}

function mapQueueItemKindToRequiredReviewType(
  kind: CreateHandoffReviewQueueItemKind,
): RoleSpecificReviewType {
  if (kind === "factcheck_request_review") return "source_review";
  if (kind === "participation_space_candidate_review") {
    return "org_review";
  }
  if (kind === "opinion_count_review") return "self_review";
  return "editorial_review";
}

function createAuditEntry(
  action: string,
  note: string,
): CreateHandoffReviewQueueItemAuditEntry {
  return {
    at: nowIso(),
    action,
    note,
  };
}

function withStatusTransition(
  item: CreateHandoffReviewQueueItem,
  status: CreateHandoffReviewQueueItemStatus,
  action: string,
  note: string,
): CreateHandoffReviewQueueItem {
  const updatedAt = nowIso();
  return {
    ...item,
    status,
    reviewerNotes: unique(
      action === "needs_clarification" ||
        action === "approved_for_setup" ||
        action === "rejected"
        ? [...item.reviewerNotes, note]
        : item.reviewerNotes,
    ),
    auditTrail: [...item.auditTrail, createAuditEntry(action, note)],
    updatedAt,
  };
}

export function createReviewQueueItemFromHandoffDraft(
  draft: CreateHandoffDraft,
): CreateHandoffReviewQueueItem {
  const timestamp = nowIso();
  const openQuestions = getHandoffDraftOpenQuestions(draft);
  const kind = mapDraftTargetToQueueItemKind(draft.target);
  const requiredReviewType = mapQueueItemKindToRequiredReviewType(kind);
  const requiredReviewerRoles = getRoleSpecificReviewRequirement(
    requiredReviewType,
  ).allowedRoles;

  return {
    id: `create-handoff-review-item-${draft.id}`,
    sourceDraftId: draft.id,
    kind,
    status: "draft",
    requiredReviewType,
    requiredReviewerRoles,
    lifecycleStatus: "review_ready",
    preparationStatus: "review_ready",
    reviewReadyIsApproved: false,
    title: draft.title,
    summary: draft.summary,
    authorStandpoint: draft.authorStandpoint ?? null,
    existingMatchDecision: draft.existingMatchDecision ?? null,
    topicTitle: draft.topicTitle ?? null,
    target: draft.target,
    requiresEditorialReview: draft.requiresEditorialReview,
    requiresFactcheck: draft.requiresFactcheck,
    reviewerNotes: [],
    openQuestions,
    auditTrail: [
      {
        at: timestamp,
        action: "draft_created",
        note: "Als lokales Review-Item vorbereitet. Noch wurde nichts veröffentlicht oder erstellt.",
      },
    ],
    autoCreate: false,
    autoPublish: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function canQueueHandoffDraftForReview(
  draft: CreateHandoffDraft,
): boolean {
  if (draft.status === "rejected") return false;
  if (draft.autoCreate !== false || draft.autoPublish !== false) return false;
  return hasText(draft.title) && hasText(draft.summary);
}

export function getReviewQueueItemGuardrailNote(
  _item: CreateHandoffReviewQueueItem,
): string {
  return REVIEW_QUEUE_GUARDRAIL_NOTE;
}

export function getReviewQueueItemStatusLabel(
  item: CreateHandoffReviewQueueItem,
): string {
  if (item.status === "queued_for_review") return "zur Prüfung vorgemerkt";
  if (item.status === "in_review") return "in Prüfung";
  if (item.status === "needs_clarification") return "Klärung nötig";
  if (item.status === "approved_for_setup") return "für Setup freigegeben";
  if (item.status === "rejected") return "abgelehnt";
  if (item.status === "archived") return "archiviert";
  return "Entwurf";
}

export function getReviewQueueItemKindLabel(
  item: CreateHandoffReviewQueueItem,
): string {
  if (item.kind === "opinion_count_review") {
    return "Meinungs-Erfassung prüfen";
  }
  if (item.kind === "existing_branch_connection_review") {
    return "Anschluss an bestehenden Zweig prüfen";
  }
  if (item.kind === "new_branch_review") return "Neuen Zweig prüfen";
  if (item.kind === "dossier_candidate_review") {
    return "Dossier-Kandidat prüfen";
  }
  if (item.kind === "anlassraum_candidate_review") {
    return "Anlassraum-Kandidat prüfen";
  }
  if (item.kind === "participation_space_candidate_review") {
    return "Beteiligungsraum-Kandidat prüfen";
  }
  if (item.kind === "factcheck_request_review") {
    return "Factcheck-Anfrage prüfen";
  }
  return "Redaktionelle Prüfung";
}

export function getReviewQueueItemOpenQuestions(
  item: CreateHandoffReviewQueueItem,
): string[] {
  return unique(item.openQuestions);
}

export function blocksReviewQueueAutoRuntimeSideEffects(
  _item: CreateHandoffReviewQueueItem,
): boolean {
  return true;
}

export function markReviewQueueItemQueued(
  item: CreateHandoffReviewQueueItem,
): CreateHandoffReviewQueueItem {
  return withStatusTransition(
    item,
    "queued_for_review",
    "queued_for_review",
    "Zur Prüfung vorgemerkt. Keine automatische Veröffentlichung, Erstellung oder Zusammenführung.",
  );
}

export function markReviewQueueItemNeedsClarification(
  item: CreateHandoffReviewQueueItem,
  note: string,
): CreateHandoffReviewQueueItem {
  return withStatusTransition(
    item,
    "needs_clarification",
    "needs_clarification",
    note,
  );
}

export function markReviewQueueItemApprovedForSetup(
  item: CreateHandoffReviewQueueItem,
  note: string,
): CreateHandoffReviewQueueItem {
  return withStatusTransition(
    item,
    "approved_for_setup",
    "approved_for_setup",
    note,
  );
}

export function markReviewQueueItemSubmittedToRuntime(
  item: CreateHandoffReviewQueueItem,
): CreateHandoffReviewQueueItem {
  return withStatusTransition(
    item,
    "queued_for_review",
    "submitted_to_runtime",
    "An die bestehende redaktionelle Review Queue übergeben. Noch wurde nichts veröffentlicht, erstellt oder zusammengeführt.",
  );
}

export function markReviewQueueItemRejected(
  item: CreateHandoffReviewQueueItem,
  note: string,
): CreateHandoffReviewQueueItem {
  return withStatusTransition(item, "rejected", "rejected", note);
}
