import { normalizeGermanSearchText } from "@features/common/utils/textNormalization";
import type {
  ExistingTopicMatch,
  ExistingTopicMatchDecision,
  ExistingTopicMatchPanelModel,
} from "@/features/create/existingTopicMatches";
import {
  createExistingTopicMatchPanelPreviewFromDialogOutcome,
} from "@/features/create/existingTopicMatches";
import type { CreateIntelligentFollowupResult } from "@/features/create/intelligentFollowupContract";
import {
  buildDialogOutcomePreviewFromCreateFollowup,
} from "@/features/dialog/dialogIntelligenceFixtures";

export const EXISTING_TOPIC_MATCHES_RUNTIME_BLOCKERS = [
  "missing_fetch_runtime",
  "missing_followup_summary",
  "context_route_unavailable",
  "topics_route_unavailable",
] as const;

export type ExistingTopicMatchesRuntimeBlocker =
  (typeof EXISTING_TOPIC_MATCHES_RUNTIME_BLOCKERS)[number];

type ExistingTopicMatchesRuntimeContextItem = {
  anlassraumId: string;
  title: string;
  summary: string;
  topicKey: string | null;
  anlassraumType: string | null;
  anlassraumStatus: string | null;
  sourceMode: string | null;
  outputStatus: string;
  updatedAt: string | null;
  relatedDossierHref?: string | null;
  relatedDossierUpdateLabel?: string | null;
  relatedTopicPageHref?: string | null;
  relatedTopicPageTitle?: string | null;
  relatedTopicPageVisibilityLabel?: string | null;
};

type ExistingTopicMatchesTopicsResponse = {
  topics: Array<{
    id: string;
    slug: string;
    title: string;
    description?: string | null;
    statements?: Array<{ id?: string }>;
  }>;
};

export type ExistingTopicMatchesRuntimeContext = {
  result: CreateIntelligentFollowupResult;
  locale?: string | null;
};

export type ExistingTopicMatchesRuntimeEntity =
  | {
      source: "context";
      kind: "participation_space";
      id: string;
      title: string;
      summary: string;
      score: number;
      requiresReview: true;
    }
  | {
      source: "context";
      kind: "branch";
      id: string;
      title: string;
      summary: string;
      score: number;
      relatedTopicId?: string | null;
      relatedBranchId?: string | null;
      requiresReview: false;
    }
  | {
      source: "context";
      kind: "dossier";
      id: string;
      title: string;
      summary: string;
      score: number;
      relatedDossierId?: string | null;
      requiresReview: true;
    }
  | {
      source: "context" | "topics";
      kind: "topic";
      id: string;
      title: string;
      summary: string;
      score: number;
      relatedTopicId?: string | null;
      requiresReview: false;
    }
  | {
      source: "topics";
      kind: "opinion_cluster";
      id: string;
      title: string;
      summary: string;
      score: number;
      countedOpinions: number;
      requiresReview: false;
    }
  | {
      source: "preview";
      kind: "source_question";
      id: string;
      title: string;
      summary: string;
      score: number;
      requiresReview: true;
    };

export type ResolveExistingTopicMatchesFromRuntimeOptions = {
  fetchJson?: <T>(url: string) => Promise<T>;
};

export type ResolveExistingTopicMatchesFromRuntimeResult = {
  status: "runtime" | "hybrid" | "preview" | "blocked";
  model: ExistingTopicMatchPanelModel;
  blockers: ExistingTopicMatchesRuntimeBlocker[];
  usedSources: string[];
};

function normalizeText(value: string): string {
  return normalizeGermanSearchText(value);
}

function tokenize(value: string): string[] {
  const normalized = normalizeText(value);
  if (!normalized) return [];
  return normalized.split(" ").filter((token) => token.length >= 3);
}

function jaccardScore(left: string[], right: string[]): number {
  if (left.length === 0 || right.length === 0) return 0;
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  let intersection = 0;
  for (const token of leftSet) {
    if (rightSet.has(token)) intersection += 1;
  }
  const union = leftSet.size + rightSet.size - intersection;
  return union > 0 ? intersection / union : 0;
}

function textSimilarity(left: string, right: string): number {
  const leftNormalized = normalizeText(left);
  const rightNormalized = normalizeText(right);
  if (!leftNormalized || !rightNormalized) return 0;
  if (leftNormalized === rightNormalized) return 1;
  if (
    leftNormalized.length >= 28 &&
    rightNormalized.includes(leftNormalized)
  ) {
    return 0.93;
  }
  if (
    rightNormalized.length >= 28 &&
    leftNormalized.includes(rightNormalized)
  ) {
    return 0.93;
  }
  return Number(
    jaccardScore(tokenize(leftNormalized), tokenize(rightNormalized)).toFixed(4),
  );
}

export function inferExistingTopicMatchRelation(
  sourceText: string,
  matchText: string,
): ExistingTopicMatch["relation"] {
  const source = normalizeText(sourceText);
  const candidate = normalizeText(matchText);
  if (!source || !candidate) return "unclear";

  const sourceOpposition = /\b(gegen|ablehnen|abschaffen|verhindern|nicht|kein|beibehalten)\b/u.test(source);
  const candidateOpposition = /\b(gegen|ablehnen|abschaffen|verhindern|nicht|kein|beibehalten)\b/u.test(candidate);
  const sourceNumbers = new Set(source.match(/\b\d{1,4}\b/g) ?? []);
  const candidateNumbers = new Set(candidate.match(/\b\d{1,4}\b/g) ?? []);
  const hasConflictingNumbers =
    sourceNumbers.size > 0 &&
    candidateNumbers.size > 0 &&
    Array.from(sourceNumbers).every((number) => !candidateNumbers.has(number));
  const sharedPolicySignal = ["tempo", "wahlalter", "mindestlohn", "steuer", "quote"]
    .some((signal) => source.includes(signal) && candidate.includes(signal));

  if (sourceOpposition !== candidateOpposition || (sharedPolicySignal && hasConflictingNumbers)) {
    return "opposing";
  }
  return "related";
}

function strengthFromScore(score: number): ExistingTopicMatch["strength"] {
  if (score >= 0.82) return "strong";
  if (score >= 0.58) return "medium";
  return "weak";
}

function parseIdFromHref(href: string | null | undefined): string | null {
  const normalized = String(href ?? "").trim();
  if (!normalized) return null;
  const parts = normalized.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? null;
}

function dedupeMatches(matches: ExistingTopicMatch[]): ExistingTopicMatch[] {
  const seen = new Set<string>();
  return matches.filter((match) => {
    const key = `${match.kind}:${match.title}:${match.relatedTopicId ?? ""}:${match.relatedDossierId ?? ""}:${match.relatedParticipationSpaceId ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function rankMatch(match: ExistingTopicMatch): number {
  const strengthWeight =
    match.strength === "strong" ? 400 : match.strength === "medium" ? 300 : 200;
  const kindWeight: Record<ExistingTopicMatch["kind"], number> = {
    topic: 80,
    branch: 70,
    participation_space: 75,
    dossier: 72,
    opinion_cluster: 50,
    source_question: 65,
  };
  return strengthWeight + kindWeight[match.kind];
}

function inferSuggestedDecision(
  matches: ExistingTopicMatch[],
  previewModel: ExistingTopicMatchPanelModel,
): ExistingTopicMatchDecision {
  const primary = matches[0] ?? null;
  if (!primary) return previewModel.suggestedDecision;
  if (primary.kind === "source_question") return "ask_for_review";
  if (primary.kind === "dossier") return "prepare_dossier_candidate";
  if (primary.kind === "participation_space") {
    return "prepare_anlassraum_candidate";
  }
  if (primary.kind === "opinion_cluster") return "count_only";
  return "connect_to_existing";
}

function createPreviewModel(
  result: CreateIntelligentFollowupResult,
): ExistingTopicMatchPanelModel {
  return createExistingTopicMatchPanelPreviewFromDialogOutcome(
    buildDialogOutcomePreviewFromCreateFollowup({ result }),
  );
}

function makeFetchJson(
  override?: <T>(url: string) => Promise<T>,
): <T>(url: string) => Promise<T> {
  if (override) return override;
  return async function fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`fetch_failed:${url}`);
    }
    return (await response.json()) as T;
  };
}

function buildRuntimeTopicSignals(
  result: CreateIntelligentFollowupResult,
): string[] {
  return [
    result.understanding.dossierContext ?? "",
    ...result.understanding.topics.map((topic) => topic.label),
    result.understanding.summary,
  ]
    .map((value) => String(value).trim())
    .filter(Boolean);
}

function mapContextItemToRuntimeEntities(
  item: ExistingTopicMatchesRuntimeContextItem,
  signals: string[],
): ExistingTopicMatchesRuntimeEntity[] {
  const haystack = [item.title, item.summary, item.topicKey ?? ""].join(" ");
  const score = Math.max(...signals.map((signal) => textSimilarity(signal, haystack)));
  const topicOverlap = item.topicKey
    ? signals.some(
        (signal) =>
          normalizeText(signal).includes(normalizeText(item.topicKey ?? "")) ||
          normalizeText(item.topicKey ?? "").includes(normalizeText(signal)),
      )
    : false;
  if (score < 0.45 && !topicOverlap) return [];

  const resolvedScore = topicOverlap && score < 0.58 ? 0.58 : score;
  const entities: ExistingTopicMatchesRuntimeEntity[] = [
    {
      source: "context",
      kind: "participation_space",
      id: item.anlassraumId,
      title: item.title,
      summary:
        item.summary ||
        "Ein vorhandener aktiver Anlass- oder Beteiligungsraum könnte dieses Thema weiterführen.",
      score: resolvedScore,
      requiresReview: true,
    },
    {
      source: "context",
      kind: "branch",
      id: `branch:${item.anlassraumId}`,
      title: item.title,
      summary:
        item.summary ||
        "Ein bestehender Arbeitsstrang kann getrennt und review-first weiterbearbeitet werden.",
      score: Math.max(0.52, resolvedScore - 0.04),
      relatedTopicId:
        parseIdFromHref(item.relatedTopicPageHref) ?? item.topicKey ?? null,
      relatedBranchId: item.anlassraumId,
      requiresReview: false,
    },
  ];

  if (item.relatedDossierHref) {
    entities.push({
      source: "context",
      kind: "dossier",
      id: item.relatedDossierHref,
      title: item.relatedDossierUpdateLabel
        ? `${item.title} im Dossier-Kontext`
        : `${item.title} als Dossier-Anknüpfung`,
      summary:
        item.relatedDossierUpdateLabel ||
        "Ein bestehender Dossierkontext kann diesen Anschluss vorbereitend aufnehmen.",
      score: Math.max(0.56, resolvedScore),
      relatedDossierId: parseIdFromHref(item.relatedDossierHref),
      requiresReview: true,
    });
  }

  if (item.relatedTopicPageHref && item.relatedTopicPageTitle) {
    entities.push({
      source: "context",
      kind: "topic",
      id: item.relatedTopicPageHref,
      title: item.relatedTopicPageTitle,
      summary:
        item.relatedTopicPageVisibilityLabel
          ? `Vorhandene Themenseite: ${item.relatedTopicPageVisibilityLabel}.`
          : "Vorhandene Themenseite mit ähnlichem Fokus.",
      score: Math.max(0.54, resolvedScore),
      relatedTopicId: parseIdFromHref(item.relatedTopicPageHref),
      requiresReview: false,
    });
  }

  return entities;
}

function mapTopicsToRuntimeEntities(
  topics: ExistingTopicMatchesTopicsResponse["topics"],
  signals: string[],
): ExistingTopicMatchesRuntimeEntity[] {
  const entities: ExistingTopicMatchesRuntimeEntity[] = [];

  for (const topic of topics) {
    const score = Math.max(
      ...signals.map((signal) =>
        textSimilarity(signal, `${topic.title} ${topic.description ?? ""}`),
      ),
    );
    if (score < 0.5) continue;

    const topicHref = `/topic/${encodeURIComponent(topic.slug)}`;
    entities.push({
      source: "topics",
      kind: "topic",
      id: topicHref,
      title: topic.title,
      summary:
        topic.description?.trim() ||
        "Vorhandenes veröffentlichtes Thema aus eDebatte.",
      score,
      relatedTopicId: topic.slug,
      requiresReview: false,
    });

    const countedOpinions = Array.isArray(topic.statements)
      ? topic.statements.length
      : 0;
    if (countedOpinions > 0) {
      entities.push({
        source: "topics",
        kind: "opinion_cluster",
        id: `opinion-cluster:${topic.slug}`,
        title: `Ähnliche Meinungen zu ${topic.title}`,
        summary:
          "Veröffentlichte Aussagen mit ähnlichem Themenfokus können nur als vorsichtiger Meinungscluster gelesen werden.",
        score: Math.max(0.5, score - 0.03),
        countedOpinions,
        requiresReview: false,
      });
    }
  }

  return entities;
}

function maybeBuildPreviewSourceQuestionEntity(
  previewModel: ExistingTopicMatchPanelModel,
): ExistingTopicMatchesRuntimeEntity[] {
  const sourceQuestion = previewModel.matches.find(
    (match) => match.kind === "source_question" && match.status !== "rejected",
  );
  if (!sourceQuestion) return [];
  return [
    {
      source: "preview",
      kind: "source_question",
      id: sourceQuestion.id,
      title: sourceQuestion.title,
      summary: sourceQuestion.summary,
      score: 0.7,
      requiresReview: true,
    },
  ];
}

export function mapRuntimeEntityToExistingTopicMatch(
  entity: ExistingTopicMatchesRuntimeEntity,
): ExistingTopicMatch {
  if (entity.kind === "participation_space") {
    return {
      id: entity.id,
      kind: "participation_space",
      title: entity.title,
      summary: entity.summary,
      strength: strengthFromScore(entity.score),
      status: "needs_review",
      reason:
        "Gefundener aktiver Anlass- oder Beteiligungsraum aus vorhandenen eDebatte-Strukturen.",
      relatedParticipationSpaceId: entity.id,
      requiresReview: true,
    };
  }
  if (entity.kind === "branch") {
    return {
      id: entity.id,
      kind: "branch",
      title: entity.title,
      summary: entity.summary,
      strength: strengthFromScore(entity.score),
      status: "suggested",
      reason:
        "Gefundener bestehender Arbeitsstrang aus aktivem Anlassraum-/Round-Kontext.",
      relatedTopicId: entity.relatedTopicId ?? null,
      relatedBranchId: entity.relatedBranchId ?? null,
      requiresReview: false,
    };
  }
  if (entity.kind === "dossier") {
    return {
      id: entity.id,
      kind: "dossier",
      title: entity.title,
      summary: entity.summary,
      strength: strengthFromScore(entity.score),
      status: "needs_review",
      reason:
        "Gefundener Dossier-Kontext aus vorhandenen eDebatte-Strukturen.",
      relatedDossierId: entity.relatedDossierId ?? null,
      requiresReview: true,
    };
  }
  if (entity.kind === "topic") {
    return {
      id: entity.id,
      kind: "topic",
      title: entity.title,
      summary: entity.summary,
      strength: strengthFromScore(entity.score),
      status: "suggested",
      reason:
        "Gefundener Themenanschluss aus vorhandenen eDebatte-Strukturen.",
      relatedTopicId: entity.relatedTopicId ?? null,
      requiresReview: false,
    };
  }
  if (entity.kind === "opinion_cluster") {
    return {
      id: entity.id,
      kind: "opinion_cluster",
      title: entity.title,
      summary: entity.summary,
      strength: strengthFromScore(entity.score),
      status: "suggested",
      reason:
        "Vorsichtiger Meinungscluster auf Basis vorhandener veröffentlichter Aussagen.",
      countedOpinions: entity.countedOpinions,
      requiresReview: false,
    };
  }
  return {
    id: entity.id,
    kind: "source_question",
    title: entity.title,
    summary: entity.summary,
    strength: strengthFromScore(entity.score),
    status: "needs_review",
    reason:
      "Quellen- oder Belegfrage bleibt review-first und ist keine bestätigte Tatsachenbehauptung.",
    requiresReview: true,
  };
}

export function getExistingTopicMatchesRuntimeBlockers(
  context: ExistingTopicMatchesRuntimeContext,
): ExistingTopicMatchesRuntimeBlocker[] {
  const blockers: ExistingTopicMatchesRuntimeBlocker[] = [];
  if (typeof fetch !== "function") blockers.push("missing_fetch_runtime");
  if (!String(context.result.understanding.summary ?? "").trim()) {
    blockers.push("missing_followup_summary");
  }
  return blockers;
}

export function canResolveExistingTopicMatchesFromRuntime(
  context: ExistingTopicMatchesRuntimeContext,
): boolean {
  return getExistingTopicMatchesRuntimeBlockers(context).length === 0;
}

export async function resolveExistingTopicMatchesFromRuntime(
  context: ExistingTopicMatchesRuntimeContext,
  options: ResolveExistingTopicMatchesFromRuntimeOptions = {},
): Promise<ResolveExistingTopicMatchesFromRuntimeResult> {
  const previewModel = createPreviewModel(context.result);
  const blockers = getExistingTopicMatchesRuntimeBlockers(context);
  if (blockers.length > 0) {
    return {
      status: "blocked",
      blockers,
      usedSources: [],
      model: previewModel,
    };
  }

  const fetchJson = makeFetchJson(options.fetchJson);
  const locale = String(context.locale ?? "de").trim() || "de";
  const usedSources: string[] = [];
  const runtimeBlockers: ExistingTopicMatchesRuntimeBlocker[] = [];

  let contextItems: ExistingTopicMatchesRuntimeContextItem[] = [];
  try {
    const response = await fetchJson<{
      ok: boolean;
      items?: ExistingTopicMatchesRuntimeContextItem[];
    }>("/api/create/context?limit=40");
    if (response.ok && Array.isArray(response.items)) {
      contextItems = response.items;
      usedSources.push("/api/create/context");
    } else {
      runtimeBlockers.push("context_route_unavailable");
    }
  } catch {
    runtimeBlockers.push("context_route_unavailable");
  }

  let topics: ExistingTopicMatchesTopicsResponse["topics"] = [];
  try {
    const response = await fetchJson<ExistingTopicMatchesTopicsResponse>(
      `/api/topics?locale=${encodeURIComponent(locale.slice(0, 2))}`,
    );
    if (Array.isArray(response.topics)) {
      topics = response.topics;
      usedSources.push("/api/topics");
    } else {
      runtimeBlockers.push("topics_route_unavailable");
    }
  } catch {
    runtimeBlockers.push("topics_route_unavailable");
  }

  const signals = buildRuntimeTopicSignals(context.result);
  const runtimeEntities = [
    ...contextItems.flatMap((item) => mapContextItemToRuntimeEntities(item, signals)),
    ...mapTopicsToRuntimeEntities(topics, signals),
  ];
  const runtimeMatches = dedupeMatches(
    runtimeEntities.map((entity) => {
      const match = mapRuntimeEntityToExistingTopicMatch(entity);
      return {
        ...match,
        relation: inferExistingTopicMatchRelation(
          context.result.sourceText,
          `${match.title} ${match.summary}`,
        ),
      };
    }),
  ).sort((left, right) => rankMatch(right) - rankMatch(left));

  const previewOnlyMatches = maybeBuildPreviewSourceQuestionEntity(previewModel).map(
    mapRuntimeEntityToExistingTopicMatch,
  );

  if (runtimeMatches.length === 0 && runtimeBlockers.length > 0) {
    return {
      status: "preview",
      blockers: runtimeBlockers,
      usedSources,
      model: previewModel,
    };
  }

  const combinedMatches = dedupeMatches([
    ...runtimeMatches,
    ...previewOnlyMatches.filter(
      (match) => !runtimeMatches.some((runtimeMatch) => runtimeMatch.kind === match.kind),
    ),
  ]).sort((left, right) => rankMatch(right) - rankMatch(left));

  const sourceKind =
    previewOnlyMatches.length > 0 ? "hybrid" : "runtime";
  const sourceLabel =
    sourceKind === "runtime"
      ? "Gefundene Anschlüsse aus vorhandenen eDebatte-Strukturen"
      : "Gefundene Anschlüsse aus vorhandenen eDebatte-Strukturen, ergänzt um Preview für noch unverdrahtete Match-Arten";

  return {
    status: sourceKind,
    blockers: runtimeBlockers,
    usedSources,
    model: {
      ...previewModel,
      matches: combinedMatches,
      suggestedDecision: inferSuggestedDecision(combinedMatches, previewModel),
      sourceKind,
      sourceLabel,
      emptyStateText:
        combinedMatches.length === 0
          ? "Aus vorhandenen eDebatte-Strukturen wurde kein belastbarer Anschluss gefunden. Du kannst bewusst einen neuen Zweig starten."
          : null,
    },
  };
}
