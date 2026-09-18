// @repository-integrity-classification: runtime-bridge

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


export type ExistingTopicMatchRelation = "related" | "opposing" | "unclear";

const RELATION_POLICY_SIGNALS = [
  "tempo",
  "wahlalter",
  "mindestlohn",
  "steuer",
  "quote",
] as const;

function normalizeRelationText(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("de")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ");
}

function hasExplicitPolicyOpposition(
  text: string,
  sharedPolicySignals: string[],
): boolean {
  if (sharedPolicySignals.length === 0) return false;
  const policyObject = sharedPolicySignals.join("|");
  return (
    new RegExp(
      `\\bgegen\\s+(?:(?:den|die|das|ein|eine|einen|einem|einer)\\s+)?(?:${policyObject})\\b`,
      "u",
    ).test(text) ||
    new RegExp(`\\bkein(?:e|en|er|es)?\\s+(?:${policyObject})\\b`, "u").test(text) ||
    new RegExp(
      `\\b(?:ich|wir)\\s+lehn(?:e|en)\\b[^.!?]{0,60}\\b(?:${policyObject})\\b[^.!?]{0,30}\\bab\\b`,
      "u",
    ).test(text) ||
    new RegExp(
      `^(?:(?:den|die|das|ein|eine|einen|einem|einer)\\s+)?(?:${policyObject})\\b[^.!?]{0,60}\\b(?:ablehnen|abschaffen|verhindern)\\b`,
      "u",
    ).test(text) ||
    new RegExp(
      `\\b(?:${policyObject})\\b(?:(?!\\b(?:damit|sodass|um)\\b)[^.!?]){0,60}\\b(?:soll(?:te|ten)?|darf|dürfen|muss|müssen)\\b(?:(?!\\b(?:damit|sodass|um)\\b)[^.!?]){0,40}\\bnicht\\b`,
      "u",
    ).test(text)
  );
}

export function inferExistingTopicMatchRelation(
  sourceText: string,
  matchText: string,
): ExistingTopicMatchRelation {
  const source = normalizeRelationText(sourceText);
  const candidate = normalizeRelationText(matchText);
  if (!source || !candidate) return "unclear";

  const sourceNumbers = new Set(source.match(/\b\d{1,4}\b/g) ?? []);
  const candidateNumbers = new Set(candidate.match(/\b\d{1,4}\b/g) ?? []);
  const hasConflictingNumbers =
    sourceNumbers.size > 0 &&
    candidateNumbers.size > 0 &&
    Array.from(sourceNumbers).every((number) => !candidateNumbers.has(number));
  const sharedPolicySignals = RELATION_POLICY_SIGNALS.filter(
    (signal) => source.includes(signal) && candidate.includes(signal),
  );
  const sourceOpposition = hasExplicitPolicyOpposition(source, sharedPolicySignals);
  const candidateOpposition = hasExplicitPolicyOpposition(candidate, sharedPolicySignals);

  if (
    sourceOpposition !== candidateOpposition ||
    (sharedPolicySignals.length > 0 && hasConflictingNumbers)
  ) {
    return "opposing";
  }
  return "related";
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
