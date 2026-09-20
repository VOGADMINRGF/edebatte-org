import type { SwipeItem } from "./types";

/**
 * Shared prompt fragment for every agent/model that prepares a public Swipe.
 * It deliberately focuses on presentation quality and neutrality; it does not
 * authorize the model to invent facts, publish, rank political choices or infer
 * a user's preferred political position.
 */
export const SWIPE_QUESTION_AGENT_GUIDANCE = [
  "Formuliere die Entscheidung menschlich, konkret und alltagsnah statt als Serie generischer 'Soll ...?'-Fragen.",
  "Beginne mit dem konkreten Problem oder Alltagseffekt, wenn er aus dem geprüften Kontext ableitbar ist.",
  "Mache sichtbar, wer oder was betroffen ist, ohne eine politische Seite sprachlich zu bevorzugen.",
  "Benenne den zentralen Zielkonflikt in neutraler Sprache; vermeide moralische Wertung, Alarmismus und suggestive Formulierungen.",
  "Vermeide Zustimmungssprache wie 'guter Weg', 'richtig' oder 'diesen Weg mitgehen'; menschlich bedeutet verständlich, nicht überredend.",
  "Die eigentliche Frage muss genau eine verständliche Entscheidung enthalten und mit Dafür/Offen/Dagegen sinnvoll beantwortbar sein.",
  "Wenn Folgen darstellbar sind, liefere getrennt bis zu fünf mögliche Folgen für Zustimmung und Ablehnung; beide Richtungen dürfen nicht gespiegelt oder identisch sein.",
  "Kennzeichne Folgen als mögliche Konsequenzen, nicht als sichere Prognosen, sofern die Evidenz keine sichere Aussage trägt.",
  "Erfinde keine Zahlen, Kausalitäten, Zuständigkeiten, Betroffenengruppen oder Folgen. Nutze nur den vorhandenen geprüften Kontext.",
  "Vermeide Parteizitate, Kandidatenranking, Wahlempfehlungen oder personalisierte politische Überredung.",
  "Prüfe auch den gesamten Kartenstapel auf monotone Satzanfänge; sprachliche Variation darf keine bloße Umformulierung derselben Entscheidung sein.",
] as const;

export type SwipeQuestionQualityIssue =
  | "missing_question_text"
  | "generic_should_template"
  | "loaded_approval_frame"
  | "missing_human_context"
  | "missing_tradeoff"
  | "missing_directional_consequences"
  | "too_many_agree_consequences"
  | "too_many_disagree_consequences"
  | "identical_directional_consequences";

export type SwipeQuestionQualityAssessment = {
  ready: boolean;
  issues: SwipeQuestionQualityIssue[];
};

export type SwipeQuestionDeckQualityIssue = {
  issue: "repetitive_question_frame";
  signature: string;
  count: number;
};

export type SwipeQuestionDeckQualityAssessment = {
  ready: boolean;
  issues: SwipeQuestionDeckQualityIssue[];
};

function normalize(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("de-DE")
    .replace(/[^a-z0-9äöüß\s]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function questionFrameSignature(value: string): string {
  return normalize(value).split(" ").slice(0, 5).join(" ");
}

export function assessSwipeQuestionQuality(item: SwipeItem): SwipeQuestionQualityAssessment {
  const issues: SwipeQuestionQualityIssue[] = [];
  const title = item.title.trim();
  if (!title) issues.push("missing_question_text");
  // A concrete, neutral "Soll ...?" question is valid. Generic/monotonous
  // framing is a deck-level property and is checked by assessSwipeQuestionDeckQuality().
  if (/\b(guter weg|richtige(?:r|s|n)? weg|wäre es richtig|diesen weg mitgehen|vernünftige(?:r|s|n)? weg)\b/i.test(title)) {
    issues.push("loaded_approval_frame");
  }
  if (!item.humanContext?.trim()) issues.push("missing_human_context");
  if (!item.tradeoff?.trim()) issues.push("missing_tradeoff");

  const agree = item.decisionConsequences?.agree ?? [];
  const disagree = item.decisionConsequences?.disagree ?? [];
  if (agree.length === 0 || disagree.length === 0) issues.push("missing_directional_consequences");
  if (agree.length > 5) issues.push("too_many_agree_consequences");
  if (disagree.length > 5) issues.push("too_many_disagree_consequences");

  if (agree.length > 0 && disagree.length > 0) {
    const agreeSet = new Set(agree.map((entry) => normalize(entry.title)));
    const disagreeSet = new Set(disagree.map((entry) => normalize(entry.title)));
    const sameSize = agreeSet.size === disagreeSet.size;
    const sameEntries = sameSize && Array.from(agreeSet).every((entry) => disagreeSet.has(entry));
    if (sameEntries) issues.push("identical_directional_consequences");
  }

  return { ready: issues.length === 0, issues };
}

export function assessSwipeQuestionDeckQuality(
  items: SwipeItem[],
  maxFrameShare = 0.18,
): SwipeQuestionDeckQualityAssessment {
  if (items.length === 0) return { ready: true, issues: [] };

  const counts = new Map<string, number>();
  for (const item of items) {
    const signature = questionFrameSignature(item.title);
    if (!signature) continue;
    counts.set(signature, (counts.get(signature) ?? 0) + 1);
  }

  const maxCount = Math.max(6, Math.ceil(items.length * maxFrameShare));
  const issues: SwipeQuestionDeckQualityIssue[] = [];
  for (const [signature, count] of counts.entries()) {
    if (count > maxCount) {
      issues.push({ issue: "repetitive_question_frame", signature, count });
    }
  }

  return { ready: issues.length === 0, issues };
}

export function buildSwipeQuestionAgentPromptFragment(): string {
  return ["SWIPE-QUESTION-QUALITY:", ...SWIPE_QUESTION_AGENT_GUIDANCE.map((rule) => `- ${rule}`)].join("\n");
}
