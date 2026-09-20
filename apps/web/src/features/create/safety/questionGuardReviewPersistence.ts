// @repository-integrity-classification: runtime-bridge

import type { PublicQuestionGeneralizationResult } from "@/features/create/safety/publicQuestionGeneralization";

/**
 * Canonical G1 policy epoch for persisted Public Question Guard evidence.
 *
 * When G1 semantics change in a way that can affect release decisions, this
 * value must be bumped. Producer integrations persist the derived evidence ref
 * inside the existing G1 result; consumers fail closed when that binding is
 * missing or stale.
 */
export const PUBLIC_QUESTION_GUARD_CONTRACT_VERSION =
  "public_question_guard.v1" as const;

export const PUBLIC_QUESTION_GUARD_CONTRACT_EVIDENCE_PREFIX =
  "question-guard-contract:" as const;

export const PUBLIC_QUESTION_GUARD_CONTRACT_EVIDENCE_REF =
  `${PUBLIC_QUESTION_GUARD_CONTRACT_EVIDENCE_PREFIX}${PUBLIC_QUESTION_GUARD_CONTRACT_VERSION}`;

export function isCurrentPublicQuestionGuardContractVersion(
  value: unknown,
): value is typeof PUBLIC_QUESTION_GUARD_CONTRACT_VERSION {
  return value === PUBLIC_QUESTION_GUARD_CONTRACT_VERSION;
}

export function bindQuestionGuardToCurrentContract(
  guard: PublicQuestionGeneralizationResult,
): PublicQuestionGeneralizationResult {
  return {
    ...guard,
    evidenceRefs: [
      ...guard.evidenceRefs.filter(
        (ref) => !ref.startsWith(PUBLIC_QUESTION_GUARD_CONTRACT_EVIDENCE_PREFIX),
      ),
      PUBLIC_QUESTION_GUARD_CONTRACT_EVIDENCE_REF,
    ],
  };
}

export function isQuestionGuardBoundToCurrentContract(
  guard:
    | Pick<PublicQuestionGeneralizationResult, "evidenceRefs">
    | null
    | undefined,
): boolean {
  return (
    guard?.evidenceRefs.includes(PUBLIC_QUESTION_GUARD_CONTRACT_EVIDENCE_REF) ===
    true
  );
}

type PersistQuestionGuardReviewFailClosedInput<TRecord, TAuditEntry> = {
  reviewReservation: TRecord;
  auditEntry: TAuditEntry;
  persistAudit: (entry: TAuditEntry) => Promise<unknown>;
  persistRecord: (record: TRecord) => Promise<TRecord>;
  afterReservation?: (reservation: TRecord) => Promise<unknown>;
  buildReleasedRecord: (reservation: TRecord) => TRecord;
};

export function normalizeWorkflowRecordVersion(value: unknown): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}

export function holdQuestionGuardForSerializedReview(
  guard: PublicQuestionGeneralizationResult,
): PublicQuestionGeneralizationResult {
  return {
    ...guard,
    releaseState: "review_required",
    requiresHumanReview: true,
    reasons: Array.from(
      new Set([
        ...guard.reasons,
        "Die Question-Guard-Reevaluation ist reserviert und noch nicht auditgestützt freigegeben.",
      ]),
    ),
    explanation:
      "Die Question-Guard-Reevaluation bleibt bis zum dauerhaft gespeicherten Review-Audit blockiert.",
  };
}

/**
 * Reserves the source version with a still-blocked record, then persists the
 * fail-closed side effects and durable review evidence, and only then releases
 * the reviewed guard with a second CAS write. Reservation, audit, side-effect,
 * or release failures can never expose draft_allowed.
 */
export async function persistQuestionGuardReviewFailClosed<TRecord, TAuditEntry>(
  input: PersistQuestionGuardReviewFailClosedInput<TRecord, TAuditEntry>,
): Promise<TRecord> {
  const reservation = await input.persistRecord(input.reviewReservation);
  await input.afterReservation?.(reservation);
  await input.persistAudit(input.auditEntry);
  return input.persistRecord(input.buildReleasedRecord(reservation));
}
