import { normalizeGermanSearchText } from "@features/common/utils/textNormalization";
import type { MaterialExtractionJob } from "@/features/material/materialExtractionJobs";

export type MaterialGraphRecommendedAction = "reuse" | "continue" | "enrich" | "create_new";

export type MaterialGraphContextItem = {
  anlassraumId: string;
  title: string;
  summary: string;
  topicKey: string | null;
  relatedDossierHref?: string | null;
  relatedTopicPageHref?: string | null;
  relatedTopicPageTitle?: string | null;
};

export type MaterialGraphTopicItem = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  statements?: Array<{
    id?: string;
    title?: string | null;
    question?: string | null;
    text?: string | null;
  }>;
};

export type MaterialGraphFirstContext = {
  matchedTopicIds: string[];
  matchedDossierIds: string[];
  matchedRoundIds: string[];
  matchedClaimIds: string[];
  openPointIds: string[];
  relationCandidates: Array<{
    kind: "same_topic_as" | "duplicate_of" | "branch_of" | "follows_from";
    targetId: string;
    targetTitle: string;
    score: number;
  }>;
  coverageSummary: string;
  gapSummary: string;
  recommendedAction: MaterialGraphRecommendedAction;
  provenance: string[];
  noAutoMerge: true;
  noAutoGraphWrite: true;
  noAutoPublish: true;
};

function normalize(value: string | null | undefined) {
  return normalizeGermanSearchText(String(value ?? ""));
}

function tokens(value: string | null | undefined) {
  return normalize(value)
    .split(" ")
    .filter((token) => token.length >= 3);
}

function similarity(left: string, right: string) {
  const a = normalize(left);
  const b = normalize(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length >= 20 && b.includes(a)) return 0.92;
  if (b.length >= 20 && a.includes(b)) return 0.92;
  const leftTokens = new Set(tokens(a));
  const rightTokens = new Set(tokens(b));
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;
  let intersection = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) intersection += 1;
  }
  const union = leftTokens.size + rightTokens.size - intersection;
  return union > 0 ? intersection / union : 0;
}

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean)));
}

function parseIdFromHref(value: string | null | undefined) {
  const href = String(value ?? "").trim();
  if (!href) return null;
  const parts = href.split("/").filter(Boolean);
  return parts.at(-1) ?? null;
}

function jobSignals(job: MaterialExtractionJob) {
  return unique([
    job.materialLabel,
    ...job.questionDrafts.map((entry) => entry.text),
    ...job.claimDrafts.map((entry) => entry.text),
    ...job.optionDrafts.map((entry) => entry.text),
    ...job.sourceHints,
  ]);
}

function bestScore(signals: string[], haystack: string) {
  if (signals.length === 0) return 0;
  return Math.max(...signals.map((signal) => similarity(signal, haystack)));
}

export function buildMaterialGraphFirstContext(input: {
  job: MaterialExtractionJob;
  contextItems?: MaterialGraphContextItem[];
  topics?: MaterialGraphTopicItem[];
}): MaterialGraphFirstContext {
  const contextItems = input.contextItems ?? [];
  const topics = input.topics ?? [];
  const signals = jobSignals(input.job);

  const relationCandidates: MaterialGraphFirstContext["relationCandidates"] = [];
  const topicIds: string[] = [];
  const dossierIds: string[] = [];
  const roundIds: string[] = [];
  const provenance: string[] = [];
  let strongestTopicScore = 0;
  let strongestContextScore = 0;

  for (const topic of topics) {
    const score = bestScore(signals, `${topic.title} ${topic.description ?? ""}`);
    if (score < 0.48) continue;
    strongestTopicScore = Math.max(strongestTopicScore, score);
    topicIds.push(topic.slug || topic.id);
    provenance.push(`topics:${topic.slug || topic.id}`);
    relationCandidates.push({
      kind: score >= 0.86 ? "same_topic_as" : score >= 0.68 ? "duplicate_of" : "follows_from",
      targetId: topic.slug || topic.id,
      targetTitle: topic.title,
      score: Number(score.toFixed(4)),
    });
    for (const statement of topic.statements ?? []) {
      if (statement.id) roundIds.push(statement.id);
    }
  }

  for (const item of contextItems) {
    const score = bestScore(signals, `${item.title} ${item.summary} ${item.topicKey ?? ""}`);
    const topicOverlap = item.topicKey
      ? signals.some((signal) => normalize(signal).includes(normalize(item.topicKey)) || normalize(item.topicKey).includes(normalize(signal)))
      : false;
    if (score < 0.44 && !topicOverlap) continue;
    const resolvedScore = topicOverlap ? Math.max(score, 0.58) : score;
    strongestContextScore = Math.max(strongestContextScore, resolvedScore);
    roundIds.push(item.anlassraumId);
    provenance.push(`create-context:${item.anlassraumId}`);
    if (item.relatedTopicPageHref) {
      const topicId = parseIdFromHref(item.relatedTopicPageHref);
      if (topicId) topicIds.push(topicId);
    }
    if (item.relatedDossierHref) {
      const dossierId = parseIdFromHref(item.relatedDossierHref);
      if (dossierId) dossierIds.push(dossierId);
    }
    relationCandidates.push({
      kind: resolvedScore >= 0.82 ? "same_topic_as" : "branch_of",
      targetId: item.anlassraumId,
      targetTitle: item.relatedTopicPageTitle || item.title,
      score: Number(resolvedScore.toFixed(4)),
    });
  }

  relationCandidates.sort((left, right) => right.score - left.score);
  const strongestScore = Math.max(strongestTopicScore, strongestContextScore);
  const matchedTopicIds = unique(topicIds);
  const matchedDossierIds = unique(dossierIds);
  const matchedRoundIds = unique(roundIds);
  const existingQuestionCount = matchedRoundIds.length;
  const hasDraftQuestions = input.job.questionDrafts.length > 0;
  const hasDraftOptions = input.job.optionDrafts.length > 0;

  let recommendedAction: MaterialGraphRecommendedAction = "create_new";
  if (strongestScore >= 0.86 && existingQuestionCount > 0) recommendedAction = "reuse";
  else if (strongestScore >= 0.68) recommendedAction = "continue";
  else if (strongestScore >= 0.5 && (hasDraftQuestions || hasDraftOptions)) recommendedAction = "enrich";

  const coverageSummary = matchedTopicIds.length > 0 || existingQuestionCount > 0 || matchedDossierIds.length > 0
    ? `Bestehendes eDebatte-Wissen gefunden: ${matchedTopicIds.length} Themen, ${matchedDossierIds.length} Dossiers und ${existingQuestionCount} Fragen/Runden im aktuellen Runtime-Kontext.`
    : "Im aktuellen Runtime-Kontext wurde noch kein ausreichend ähnliches Thema, Dossier oder Frage/Runde gefunden.";

  const gapSummary = recommendedAction === "reuse"
    ? "Die vorhandene Abdeckung ist stark. Zuerst bestehende Frage/Runde wiederverwenden und nur echte inhaltliche Lücken ergänzen."
    : recommendedAction === "continue"
      ? "Ein bestehender Themenkontext ist vorhanden, aber das Material enthält wahrscheinlich einen sinnvollen Anschluss oder eine Folgefrage."
      : recommendedAction === "enrich"
        ? "Teilweise Abdeckung gefunden. Neue Perspektiven oder Antwortoptionen sollten bevorzugt an bestehende Kontexte angehängt werden."
        : "Keine belastbare bestehende Abdeckung gefunden. Eine neue Frage kann review-first vorbereitet werden.";

  return {
    matchedTopicIds,
    matchedDossierIds,
    matchedRoundIds,
    matchedClaimIds: [],
    openPointIds: [],
    relationCandidates: relationCandidates.slice(0, 12),
    coverageSummary,
    gapSummary,
    recommendedAction,
    provenance: unique(provenance),
    noAutoMerge: true,
    noAutoGraphWrite: true,
    noAutoPublish: true,
  };
}
