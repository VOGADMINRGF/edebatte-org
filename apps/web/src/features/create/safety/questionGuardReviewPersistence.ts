import type { PublicQuestionGeneralizationResult } from "@/features/create/safety/publicQuestionGeneralization";

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
