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
  "Die eigentliche Frage muss genau eine verständliche Entscheidung enthalten und mit Ja/Neutral/Nein sinnvoll beantwortbar sein.",
  "Wenn Folgen darstellbar sind, liefere getrennt bis zu fünf mögliche Folgen für Zustimmung und Ablehnung; beide Richtungen dürfen nicht gespiegelt oder identisch sein.",
  "Kennzeichne Folgen als mögliche Konsequenzen, nicht als sichere Prognosen, sofern die Evidenz keine sichere Aussage trägt.",
  "Erfinde keine Zahlen, Kausalitäten, Zuständigkeiten, Betroffenengruppen oder Folgen. Nutze nur den vorhandenen geprüften Kontext.",
  "Vermeide Parteizitate, Kandidatenranking, Wahlempfehlungen oder personalisierte politische Überredung.",
] as const;

export type SwipeQuestionQualityIssue =
  | "generic_should_template"
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

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("de-DE").replace(/\s+/g, " ");
}

export function assessSwipeQuestionQuality(item: SwipeItem): SwipeQuestionQualityAssessment {
  const issues: SwipeQuestionQualityIssue[] = [];
  if (/^soll\b/i.test(item.title.trim())) issues.push("generic_should_template");
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

export function buildSwipeQuestionAgentPromptFragment(): string {
  return ["SWIPE-QUESTION-QUALITY:", ...SWIPE_QUESTION_AGENT_GUIDANCE.map((rule) => `- ${rule}`)].join("\n");
}
