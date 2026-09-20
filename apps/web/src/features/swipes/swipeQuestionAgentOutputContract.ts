import { buildSwipeQuestionAgentPromptFragment } from "./questionQualityContract";
import type {
  SwipeConsequence,
  SwipeConsequenceEvidenceRef,
  SwipeConsequenceEvidenceStatus,
  SwipeDecisionConsequences,
} from "./types";

export const SWIPE_QUESTION_AGENT_OUTPUT_FIELD = "swipeQuestion" as const;

export type SwipeQuestionAgentOutput = {
  humanContext: string;
  tradeoff: string;
  decisionConsequences: SwipeDecisionConsequences;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function cleanString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readEvidenceStatus(value: unknown): SwipeConsequenceEvidenceStatus | undefined {
  return value === "verified" ||
    value === "supported" ||
    value === "hypothesis" ||
    value === "unverified"
    ? value
    : undefined;
}

function readEvidenceRef(value: unknown): SwipeConsequenceEvidenceRef | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = cleanString(record.id);
  if (!id) return null;
  return {
    id,
    label: cleanString(record.label) ?? null,
    href: cleanString(record.href) ?? null,
    sourceType: cleanString(record.sourceType) ?? null,
  };
}

function readConsequence(value: unknown): SwipeConsequence | null {
  const record = asRecord(value);
  if (!record) return null;
  const title = cleanString(record.title);
  if (!title) return null;
  const evidenceRefs = Array.isArray(record.evidenceRefs)
    ? record.evidenceRefs
        .map(readEvidenceRef)
        .filter((ref): ref is SwipeConsequenceEvidenceRef => Boolean(ref))
        .slice(0, 12)
    : [];
  return {
    title,
    detail: cleanString(record.detail),
    evidenceStatus: readEvidenceStatus(record.evidenceStatus),
    evidenceRefs,
  };
}

function readConsequenceList(value: unknown): SwipeConsequence[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(readConsequence)
    .filter((entry): entry is SwipeConsequence => Boolean(entry))
    .slice(0, 5);
}

/**
 * Reads structured agent output without granting publication authority.
 * Missing or malformed fields stay incomplete and therefore fail closed in
 * the deterministic Swipe question finalizer.
 */
export function readSwipeQuestionAgentOutput(value: unknown): SwipeQuestionAgentOutput | null {
  const record = asRecord(value);
  if (!record) return null;
  const humanContext = cleanString(record.humanContext);
  const tradeoff = cleanString(record.tradeoff);
  const consequences = asRecord(record.decisionConsequences);
  if (!humanContext && !tradeoff && !consequences) return null;

  return {
    humanContext: humanContext ?? "",
    tradeoff: tradeoff ?? "",
    decisionConsequences: {
      agree: readConsequenceList(consequences?.agree),
      disagree: readConsequenceList(consequences?.disagree),
    },
  };
}

/**
 * Canonical producer fragment for any model/agent that prepares a Swipe
 * candidate. The output remains a reviewable draft and is always rechecked by
 * finalizeSwipeQuestionCandidate().
 */
export function buildSwipeQuestionAgentOutputPromptFragment(): string {
  return [
    buildSwipeQuestionAgentPromptFragment(),
    "SWIPE-QUESTION-OUTPUT:",
    `- Schreibe strukturierte Swipe-Daten ausschließlich unter claimCandidate.${SWIPE_QUESTION_AGENT_OUTPUT_FIELD}.`,
    "- humanContext: kurzer, belegbarer Alltags-/Problemkontext.",
    "- tradeoff: neutraler Zielkonflikt ohne Empfehlung oder Ranking.",
    "- decisionConsequences.agree/disagree: je 1 bis 5 unterschiedliche mögliche Folgen.",
    "- Jede Folge: title, optional detail, evidenceStatus = verified|supported|hypothesis|unverified und evidenceRefs[].",
    "- evidenceRefs enthalten vorhandene IDs/Quellenreferenzen; niemals Quellen, Zahlen oder Kausalität erfinden.",
    "- Wenn Evidenz fehlt: hypothesis oder unverified verwenden und keine sichere Kausalformulierung wählen.",
    "- Das Modell veröffentlicht nicht; der deterministische Finalizer und Human Review entscheiden über Readiness.",
  ].join("\n");
}
