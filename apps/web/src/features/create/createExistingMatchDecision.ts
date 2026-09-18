import type { ExistingMatchUserDecision } from "@/features/create/createContributionPackageContract";
import type { CreateHandoffDraftTarget } from "@/features/create/createHandoffDrafts";

export const CREATE_EXISTING_MATCH_USER_DECISIONS = [
  "count_my_position",
  "count_as_opposition",
  "add_as_nuance",
  "keep_separate",
] as const satisfies readonly ExistingMatchUserDecision[];

export type CreateExistingMatchDecision =
  (typeof CREATE_EXISTING_MATCH_USER_DECISIONS)[number];

export function normalizeCreateExistingMatchDecision(
  value: unknown,
): CreateExistingMatchDecision | null {
  return CREATE_EXISTING_MATCH_USER_DECISIONS.includes(
    value as CreateExistingMatchDecision,
  )
    ? (value as CreateExistingMatchDecision)
    : null;
}

export function buildCreateExistingMatchAuthorStandpoint(input: {
  decision: CreateExistingMatchDecision | null | undefined;
  topicTitle?: string | null;
}): string | null {
  const topicTitle = String(input.topicTitle ?? "").trim();
  const suffix = topicTitle ? `: ${topicTitle}` : "";
  if (input.decision === "count_my_position") {
    return `Unterstützt die bestehende Position${suffix}`;
  }
  if (input.decision === "count_as_opposition") {
    return `Widerspricht der bestehenden Position${suffix}`;
  }
  if (input.decision === "add_as_nuance") {
    return `Ergänzt eine alternative oder differenzierende Position zu${suffix}`;
  }
  if (input.decision === "keep_separate") {
    return `Führt eine eigenständige neue Position getrennt weiter zu${suffix}`;
  }
  return null;
}

export function mapCreateExistingMatchDecisionToDraftTarget(
  decision: CreateExistingMatchDecision,
): CreateHandoffDraftTarget {
  if (
    decision === "count_my_position" ||
    decision === "count_as_opposition"
  ) {
    return "opinion_count";
  }
  if (decision === "add_as_nuance") {
    return "existing_branch_connection";
  }
  return "new_branch";
}
