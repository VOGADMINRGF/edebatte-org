import {
  evaluatePublicQuestionGeneralization,
  type PublicQuestionGeneralizationResult,
} from "@/features/create/safety/publicQuestionGeneralization";

export type RundenFlowDirection = "prepare" | "verify";

export type RundenFlowDraft = {
  occasion: string;
  question: string;
  options: string[];
  questionGuard: PublicQuestionGeneralizationResult;
};

function normalizeInput(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function takeFirstSentence(value: string): string {
  const normalized = normalizeInput(value);
  if (!normalized) return "";
  const split = normalized.split(/[.!?]/).map((part) => part.trim()).filter(Boolean);
  return split[0] ?? normalized;
}

function shorten(value: string, max = 140): string {
  const normalized = normalizeInput(value);
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1).trimEnd()}…`;
}

export function deriveRundenFlowDraft(input: string): RundenFlowDraft {
  const sentence = takeFirstSentence(input);
  const fallbackOccasion = "Neuer Anlass aus Rückmeldungen und offenen Fragen";
  const occasion = sentence ? shorten(sentence, 120) : fallbackOccasion;
  const question = sentence
    ? `Soll im Anlassraum priorisiert werden: ${shorten(sentence, 90)}?`
    : "Soll der Anlassraum dieses Thema als nächsten Arbeitsschritt priorisieren?";
  const questionGuard = evaluatePublicQuestionGeneralization({
    originalInput: input,
    candidatePublicQuestion: question,
    actorContexts: [],
    actorExtraction: {
      status: "unverified",
      source: "create_analysis",
      independentFromCandidateProvider: false,
      evidenceRefs: [],
    },
  });

  return {
    occasion,
    question,
    options:
      questionGuard.releaseState === "blocked"
        ? []
        : ["Ja, jetzt priorisieren", "Offen lassen und weiter prüfen", "Alternative Ausrichtung wählen"],
    questionGuard,
  };
}

export function reorderOptions(
  options: readonly string[],
  fromIndex: number,
  toIndex: number,
): string[] {
  const list = [...options];
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= list.length ||
    toIndex >= list.length ||
    fromIndex === toIndex
  ) {
    return list;
  }
  const [moved] = list.splice(fromIndex, 1);
  if (typeof moved !== "string") return list;
  list.splice(toIndex, 0, moved);
  return list;
}

export function buildRundenGuidedCreateHref(params: {
  direction: RundenFlowDirection;
  input: string;
  returnTo?: string;
  anlassraumId?: string | null;
}): string {
  const draft = deriveRundenFlowDraft(params.input);
  const url = new URLSearchParams();
  url.set("mode", "source");
  url.set(
    "intent",
    params.direction === "verify" ? "question" : "contribution",
  );
  url.set("entryIntent", "content_companion");
  url.set("entryMode", params.direction === "verify" ? "guided" : "direct");
  url.set("source", "runden");
  url.set(
    "reason",
    params.direction === "verify"
      ? "round_verify_readiness"
      : "round_prepare_question",
  );
  url.set("signalTitle", draft.occasion.slice(0, 160));
  url.set(
    "prefill",
    `${draft.occasion}\n\nVorgeschlagene Abstimmungsfrage:\n${draft.question}\n\nOptionen:\n- ${draft.options.join("\n- ")}`,
  );
  if (params.anlassraumId) {
    url.set("anlassraumId", params.anlassraumId);
  }
  if (params.returnTo) {
    url.set("returnTo", params.returnTo);
  }
  return `/create?${url.toString()}`;
}
