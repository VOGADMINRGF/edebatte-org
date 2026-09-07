import type { ExistingMatchUserDecision } from "@/features/create/createContributionPackageContract";

export const CREATE_EXISTING_MATCH_USER_DECISIONS = [
  "count_my_position",
  "count_as_opposition",
  "add_as_nuance",
  "keep_separate",
  "request_review",
] as const satisfies readonly ExistingMatchUserDecision[];

export function normalizeCreateExistingMatchDecision(
  value: unknown,
): ExistingMatchUserDecision | null {
  return CREATE_EXISTING_MATCH_USER_DECISIONS.includes(
    value as ExistingMatchUserDecision,
  )
    ? (value as ExistingMatchUserDecision)
    : null;
}

export function buildCreateExistingMatchAuthorStandpoint(input: {
  decision: ExistingMatchUserDecision | null | undefined;
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
