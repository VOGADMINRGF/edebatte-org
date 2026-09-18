import {
  resolvePart06CategoryLabels,
  type Part06CategoryKey,
} from "@/features/create/part06TopicMapping";
import type { CreatePlannerResult } from "@/features/create/createPlanner";
import { hasValidatedCreatePlannerProviderIdentity } from "@/features/create/createPlannerProviderContract";
import type { CreateCitizenIntakeContext } from "@/features/create/createContributionPackageContract";

export type FollowupConfidence = "low" | "medium" | "high";

export type CreateUnderstandingStatementKind =
  | "question"
  | "claim"
  | "demand"
  | "argument"
  | "source"
  | "option"
  | "objection"
  | "hint";

/**
 * Normalized create follow-up model derived from the E150 intake/analyze
 * envelope. It may condense multiple upstream fields for `/create`, but it
 * must not become a second domain contract beside Part16.
 */
export type CreateUnderstandingResult = {
  summary: string;
  dossierContext?: string;
  categories: Array<{
    id: string;
    label: string;
    confidence: FollowupConfidence;
  }>;
  topics: Array<{
    id: string;
    label: string;
    confidence: FollowupConfidence;
  }>;
  aspects?: string[];
  statements: Array<{
    id: string;
    text: string;
    kind: CreateUnderstandingStatementKind;
    stance: "pro" | "contra" | "mixed" | "open" | "unclear";
    confidence: FollowupConfidence;
    sourceExcerpt?: string;
  }>;
  scopes: Array<"local" | "district" | "municipal" | "state" | "federal" | "eu" | "international" | "unclear">;
  positionClusters?: Array<{
    id: string;
    label: "sozial/ausgleichend" | "ordnungs-/leistungsorientiert" | "pragmatisch/abwägend";
    confidence: FollowupConfidence;
  }>;
  openQuestion?: string | null;
  confidence: FollowupConfidence;
};

/**
 * UI-facing Anschluss suggestions for `/create`.
 * They stay reviewable view models and must not auto-assign dossiers,
 * Anlassraeume or votes.
 */
export type CreateConnectionSuggestion = {
  id: string;
  kind: "dossier" | "anlassraum" | "vote" | "topic" | "new_anlassraum";
  title: string;
  reason: string;
  confidence: FollowupConfidence;
  href?: string;
  suggestedContributionKind?: string;
  suggestedStance?: "yes" | "no" | "abstain" | "open" | null;
  requiresConfirmation: true;
};

export type CreateGraphMatchRelation =
  | "same"
  | "related"
  | "opposing"
  | "duplicate_risk"
  | "new"
  | "needs_review";

export type CreateGraphMatchRecord = {
  id: string;
  kind: "topic" | "dossier" | "claim" | "anlassraum" | "vote";
  label: string;
  relation: CreateGraphMatchRelation;
  requiresConfirmation: true;
};

export type CreateFollowupGraphMatchPlan = {
  stage: "after_structure";
  prepared: boolean;
  requiresConfirmation: true;
  searchTerms: string[];
  matches: CreateGraphMatchRecord[];
  matchedTopics: string[];
  matchedDossiers: string[];
  matchedClaims: string[];
  matchedAnlassraeume: string[];
  matchedVotes: string[];
  shouldCreateNewTopic: boolean;
};

export type CreateGraphMatchResult = CreateFollowupGraphMatchPlan;

export type DocumentTopic = {
  id: string;
  label: string;
  subtopicCount?: number | null;
  keyStatementCount?: number | null;
  verifiableClaimCount?: number | null;
  policyProposalCount?: number | null;
  summary?: string | null;
};

export type DocumentAnalysisSummary = {
  sourceUrl: string;
  documentTitle: string | null;
  documentType: "party_program" | "law" | "study" | "report" | "article" | "unknown";
  pageCount: number | null;
  wordCount: number | null;
  topicCount: number;
  subtopicCount: number;
  keyStatementCount: number;
  verifiableClaimCount: number;
  policyProposalCount: number;
  subjectBreadth: "narrow" | "medium" | "broad" | "very_broad";
  subjectDepth: "low" | "medium" | "high" | "mixed";
  balanceAssessment: "balanced" | "mostly_balanced" | "programmatic" | "one_sided" | "unclear";
  sourceSpecificity: "specific" | "partly_specific" | "mostly_unspecific" | "none" | "unclear";
  sourceVerificationStatus: "not_started" | "prepared" | "in_review" | "completed";
  counterpositionCoverage: "strong" | "partial" | "weak" | "none" | "unclear";
  summary: string;
  topics: DocumentTopic[];
};

export function normalizeDocumentAnalysisSummary(
  analysis: DocumentAnalysisSummary,
): DocumentAnalysisSummary {
  const seen = new Set<string>();
  const topics = analysis.topics.reduce<DocumentTopic[]>((normalizedTopics, topic, index) => {
      const label = topic.label.trim();
      if (!label) return normalizedTopics;
      const key = normalizeText(topic.id || label || `document-topic-${index + 1}`);
      if (!key || seen.has(key)) return normalizedTopics;
      seen.add(key);
      normalizedTopics.push({
        ...topic,
        id: topic.id?.trim() || `document-topic-${index + 1}`,
        label,
        summary: topic.summary?.trim() || null,
      });
      return normalizedTopics;
    }, []);

  return {
    ...analysis,
    documentTitle: analysis.documentTitle?.trim() || null,
    summary: analysis.summary.trim(),
    topicCount: topics.length,
    topics,
  };
}

export type CreateAnalysisState =
  | "idle"
  | "input_ready"
  | "link_detected"
  | "entitlement_required"
  | "fetching"
  | "fetch_failed"
  | "content_loaded"
  | "ai_analyzing"
  | "ai_failed"
  | "analysis_validated"
  | "result_ready";

export type CreateAnalysisRecord = {
  state: CreateAnalysisState;
  analysisId: string;
  sourceType: "text" | "link" | "document";
  sourceUrl?: string | null;
  sourceContentHash: string;
  analyzedAt: string;
  orchestrationRunId: string;
  schemaVersion: string;
  validationStatus: "not_started" | "failed" | "validated";
  evidenceReferences: string[];
  confidence: number | null;
  sourceLoaded: boolean;
  userMessage?: string | null;
};

export type CreateIntelligentFollowupMeta = {
  planner?: CreatePlannerResult | null;
  citizenContext?: CreateCitizenIntakeContext | null;
  graphMatch: CreateFollowupGraphMatchPlan;
  researchUsed: "none";
  researchProvider: null;
  deepSearchUsed: false;
  analysis?: CreateAnalysisRecord;
  documentAnalysis?: DocumentAnalysisSummary | null;
};

export type CreateIntelligentFollowupResult = {
  understanding: CreateUnderstandingResult;
  suggestions: CreateConnectionSuggestion[];
  sourceText: string;
  generatedAt: string;
  meta?: CreateIntelligentFollowupMeta;
  degraded?: boolean;
  degradedReason?: string | null;
};

export type CreateVisualNode = {
  id: string;
  kind:
    | "source_text"
    | "statement"
    | "topic"
    | "stance"
    | "scope"
    | "dossier"
    | "anlassraum"
    | "vote"
    | "new_anlassraum";
  label: string;
  detail?: string;
  confidence: FollowupConfidence;
};

export type CreateVisualEdge = {
  id: string;
  from: string;
  to: string;
  label?: string;
};

export type CreateVisualMap = {
  center: CreateVisualNode;
  nodes: CreateVisualNode[];
  edges: CreateVisualEdge[];
};

export type CreateVisualSection = {
  id: string;
  label: string;
  sourceText: string;
  statementLabel?: string;
  topicLabel?: string;
  stanceLabel?: string;
  connectionLabel?: string;
};

/**
 * UI-only ViewModel for the active-branch workspace in `/create`.
 * It derives from `topics`, statement-level claims/question signals and the
 * Part06 mirror. This is not a new domain taxonomy or orchestration contract.
 */
export type CreateStructureBranch = {
  id: string;
  topicId: string;
  title: string;
  summary: string;
  topics: string[];
  topicTags: string[];
  evidenceSnippets: string[];
  subtopics: string[];
  sourceSection: string | null;
  confidence: FollowupConfidence;
  parentTopicId?: string | null;
  relatedTopicIds: string[];
  suggestedQuestions: string[];
  part06CategoryKeys: Part06CategoryKey[];
  part06CategoryLabels: string[];
  need: string;
  claims: string[];
  voteQuestions: string[];
  openReviewPoints: string[];
  positionClusters: string[];
  overflowTopics?: string[];
};

export type CreateFollowupDedupeResult = {
  prominentSummary: string;
  prominentCoreClaim: string;
  userBubbleText: string;
};

export function deriveDominantUnderstandingStance(
  understanding: CreateUnderstandingResult,
): "eher dafür" | "eher dagegen" | "offen/unklar" {
  let pro = 0;
  let contra = 0;
  let mixed = 0;
  for (const statement of understanding.statements) {
    if (statement.stance === "pro") pro += 1;
    if (statement.stance === "contra") contra += 1;
    if (statement.stance === "mixed") mixed += 1;
  }
  if (pro > contra && pro >= mixed) return "eher dafür";
  if (contra > pro && contra >= mixed) return "eher dagegen";
  return "offen/unklar";
}

function normalizeSuggestionNodeKind(
  kind: CreateConnectionSuggestion["kind"],
): CreateVisualNode["kind"] {
  if (kind === "dossier") return "dossier";
  if (kind === "anlassraum") return "anlassraum";
  if (kind === "vote") return "vote";
  if (kind === "topic") return "topic";
  return "new_anlassraum";
}

export function buildCreateVisualMap(result: CreateIntelligentFollowupResult): CreateVisualMap {
  const center: CreateVisualNode = {
    id: "source",
    kind: "source_text",
    label: "Dein Beitrag",
    detail: result.understanding.summary,
    confidence: result.understanding.confidence,
  };
  const nodes: CreateVisualNode[] = [];
  const edges: CreateVisualEdge[] = [];

  result.understanding.categories.slice(0, 3).forEach((category, index) => {
    const nodeId = `category-${index + 1}`;
    nodes.push({
      id: nodeId,
      kind: "statement",
      label: category.label,
      detail: "Kategorie",
      confidence: category.confidence,
    });
    edges.push({
      id: `edge-source-${nodeId}`,
      from: center.id,
      to: nodeId,
      label: "Kernsignal",
    });
  });

  result.understanding.statements.slice(0, 6).forEach((statement, index) => {
    const nodeId = `statement-${index + 1}`;
    nodes.push({
      id: nodeId,
      kind: "statement",
      label: statement.text,
      detail: statement.kind,
      confidence: statement.confidence,
    });
    edges.push({
      id: `edge-source-${nodeId}`,
      from: center.id,
      to: nodeId,
      label: "Aussage",
    });
  });

  result.understanding.topics.slice(0, 8).forEach((topic, index) => {
    const nodeId = `topic-${index + 1}`;
    nodes.push({
      id: nodeId,
      kind: "topic",
      label: topic.label,
      confidence: topic.confidence,
    });
    edges.push({
      id: `edge-source-${nodeId}`,
      from: center.id,
      to: nodeId,
      label: "Thema",
    });
  });

  const stanceNode: CreateVisualNode = {
    id: "stance",
    kind: "stance",
    label: deriveDominantUnderstandingStance(result.understanding),
    detail: "Vermutete Haltung",
    confidence: result.understanding.confidence,
  };
  nodes.push(stanceNode);
  edges.push({
    id: "edge-source-stance",
    from: center.id,
    to: stanceNode.id,
    label: "Haltung",
  });

  result.understanding.scopes.slice(0, 2).forEach((scope, index) => {
    const nodeId = `scope-${index + 1}`;
    nodes.push({
      id: nodeId,
      kind: "scope",
      label: scope,
      detail: "Ebene",
      confidence: result.understanding.confidence,
    });
    edges.push({
      id: `edge-source-${nodeId}`,
      from: center.id,
      to: nodeId,
      label: "Ebene",
    });
  });

  result.suggestions.slice(0, 4).forEach((suggestion, index) => {
    const nodeId = `suggestion-${index + 1}`;
    nodes.push({
      id: nodeId,
      kind: normalizeSuggestionNodeKind(suggestion.kind),
      label: suggestion.title,
      detail: suggestion.reason,
      confidence: suggestion.confidence,
    });
    edges.push({
      id: `edge-source-${nodeId}`,
      from: center.id,
      to: nodeId,
      label: "Anschluss",
    });
  });

  const hasDossier = nodes.some((node) => node.kind === "dossier");
  const hasNewAnlassraum = nodes.some((node) => node.kind === "new_anlassraum");
  if (!hasDossier) {
    const nodeId = "suggestion-fallback-dossier";
    nodes.push({
      id: nodeId,
      kind: "dossier",
      label: "Dossier",
      confidence: "medium",
    });
    edges.push({ id: `edge-source-${nodeId}`, from: center.id, to: nodeId, label: "Anschluss" });
  }
  if (!hasNewAnlassraum) {
    const nodeId = "suggestion-fallback-new-anlassraum";
    nodes.push({
      id: nodeId,
      kind: "new_anlassraum",
      label: "Neuer Anlassraum",
      confidence: "medium",
    });
    edges.push({ id: `edge-source-${nodeId}`, from: center.id, to: nodeId, label: "Anschluss" });
  }

  return {
    center,
    nodes,
    edges,
  };
}

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ");
}

function dedupeStrings(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (typeof value !== "string") continue;
    const normalized = value.trim();
    if (
      !normalized ||
      /\[object\s+(?:Object|Array)\]|^(?:undefined|null|nan|infinity)$/i.test(normalized)
    ) continue;
    const key = normalizeText(normalized);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
}

function areSimilarText(a: string, b: string): boolean {
  const left = normalizeText(a);
  const right = normalizeText(b);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.length < 18 || right.length < 18) return false;
  return left.includes(right) || right.includes(left);
}

export function dedupeCreateFollowupSections(params: {
  summary: string;
  coreClaim: string;
  sourceText: string;
  statementText?: string;
}): CreateFollowupDedupeResult {
  const summary = params.summary.trim();
  const coreClaim = params.coreClaim.trim();
  const statementText = String(params.statementText ?? "").trim();
  const sourceText = params.sourceText.trim().replace(/\s+/g, " ");

  let prominentSummary = summary || statementText || coreClaim || sourceText;
  let prominentCoreClaim = coreClaim || statementText || summary || sourceText;

  if (areSimilarText(prominentSummary, prominentCoreClaim)) {
    prominentCoreClaim = prominentSummary;
  }

  const bubbleSeed =
    statementText.length > 0 && !areSimilarText(statementText, prominentSummary)
      ? statementText
      : prominentSummary;

  return {
    prominentSummary,
    prominentCoreClaim,
    userBubbleText: bubbleSeed || sourceText,
  };
}

function resolveSectionThemeLabel(params: {
  sourceText: string;
  statementLabel?: string;
  topicLabel?: string;
  index: number;
}): string {
  if (params.topicLabel?.trim()) return params.topicLabel.trim();
  if (params.statementLabel?.trim()) return params.statementLabel.trim().slice(0, 72);
  const compactSource = params.sourceText.trim().replace(/\s+/g, " ");
  if (compactSource) return compactSource.slice(0, 72);
  return `Thema ${params.index + 1}`;
}

function dedupeSectionLabel(label: string, fallbackTopicLabel: string | undefined, usedLabels: Set<string>): string {
  const normalizedLabel = normalizeText(label);
  if (!normalizedLabel) return label;
  if (!usedLabels.has(normalizedLabel)) {
    usedLabels.add(normalizedLabel);
    return label;
  }

  const topicLabel = String(fallbackTopicLabel ?? "").trim();
  if (topicLabel) {
    const topicNormalized = normalizeText(topicLabel);
    if (topicNormalized && !usedLabels.has(topicNormalized)) {
      usedLabels.add(topicNormalized);
      return topicLabel;
    }

    const combined = `${label} zu ${topicLabel}`;
    const combinedNormalized = normalizeText(combined);
    if (!usedLabels.has(combinedNormalized)) {
      usedLabels.add(combinedNormalized);
      return combined;
    }
  }

  let counter = 2;
  while (true) {
    const candidate = `${label} ${counter}`;
    const candidateNormalized = normalizeText(candidate);
    if (!usedLabels.has(candidateNormalized)) {
      usedLabels.add(candidateNormalized);
      return candidate;
    }
    counter += 1;
  }
}

function splitIntoSentenceGroups(text: string, maxSections: number): string[] {
  const normalized = text.trim().replace(/\r/g, "");
  if (!normalized) return [];
  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  const groups = paragraphs.length > 0 ? paragraphs : [normalized];
  const sections: string[] = [];

  for (const group of groups) {
    const sentences = group
      .split(/(?<=[.!?])\s+/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    if (sentences.length <= 2) {
      sections.push(group);
      continue;
    }
    for (let i = 0; i < sentences.length; i += 2) {
      sections.push(sentences.slice(i, i + 2).join(" "));
    }
  }

  if (sections.length <= maxSections) return sections;
  const trimmed = sections.slice(0, maxSections);
  const overflow = sections.slice(maxSections).join(" ");
  if (overflow.trim()) trimmed[maxSections - 1] = `${trimmed[maxSections - 1]} ${overflow}`.trim();
  return trimmed;
}

export function buildCreateVisualSections(
  result: CreateIntelligentFollowupResult,
  maxSections: number = 4,
): CreateVisualSection[] {
  const chunks = splitIntoSentenceGroups(result.sourceText, Math.max(1, maxSections));
  if (chunks.length === 0) return [];
  const usedLabels = new Set<string>();
  return chunks.map((chunk, index) => {
    const statement = result.understanding.statements[index] ?? result.understanding.statements[0];
    const topic = result.understanding.topics[index] ?? result.understanding.topics[0];
    const suggestion = result.suggestions[index] ?? result.suggestions[0];
    const label = dedupeSectionLabel(
      resolveSectionThemeLabel({
        sourceText: chunk,
        statementLabel: statement?.text,
        topicLabel: topic?.label,
        index,
      }),
      topic?.label,
      usedLabels,
    );
    const baseSection: CreateVisualSection = {
      id: `section-${index + 1}`,
      label,
      sourceText: chunk,
      statementLabel: statement?.text,
      topicLabel: topic?.label,
      stanceLabel: statement?.stance,
      connectionLabel: suggestion?.title,
    };
    return baseSection;
  });
}

function selectPositionClusters(
  understanding: CreateUnderstandingResult,
): string[] {
  return understanding.positionClusters?.map((cluster) => cluster.label).slice(0, 3) ?? [];
}

function collectUnassignedCreateTopics(params: {
  topics: CreateUnderstandingResult["topics"];
  visibleBranches: CreateStructureBranch[];
}): string[] {
  const assignedTopics = new Set(
    params.visibleBranches.flatMap((branch) => branch.topics).map((topic) => normalizeText(topic)),
  );
  const overflowTopics: string[] = [];

  for (const topic of params.topics) {
    const normalized = normalizeText(topic.label);
    if (!normalized || assignedTopics.has(normalized)) continue;
    if (overflowTopics.some((entry) => normalizeText(entry) === normalized)) continue;
    overflowTopics.push(topic.label);
  }

  return overflowTopics;
}

function buildBranchSummary(params: {
  title: string;
  need: string;
  claims: string[];
}): string {
  return params.claims[0] ?? params.need ?? `${params.title} bleibt sichtbar.`;
}

function buildBranchSubtopics(params: {
  topicTags: string[];
  openReviewPoints: string[];
  voteQuestions: string[];
}): string[] {
  return dedupeStrings([
    ...params.topicTags,
    ...params.openReviewPoints,
    ...params.voteQuestions,
  ]).slice(0, 8);
}

function buildPlannerStructureBranches(
  result: CreateIntelligentFollowupResult,
  maxBranches: number,
): CreateStructureBranch[] {
  const planner = result.meta?.planner;
  if (
    !planner ||
    !hasValidatedCreatePlannerProviderIdentity(planner) ||
    planner.qualityStatus !== "specific" ||
    planner.plannerDegraded
  ) {
    return [];
  }
  const positionClusters = selectPositionClusters(result.understanding);
  const topicLabels = result.understanding.topics.map((topic) => topic.label);
  const aspects = dedupeStrings(result.understanding.aspects ?? planner.plannerClusters);
  const branchLimit = Math.max(1, maxBranches);

  return result.understanding.topics.slice(0, branchLimit).map((topic, index) => {
    const voteQuestion =
      planner.plannerOpenQuestions[index] ??
      planner.openQuestions[index] ??
      "Welche Leitfrage soll zuerst geklärt werden?";
    const plannerClaim = index === 0 ? planner.plannerCore : planner.openQuestions[index - 1] ?? planner.plannerCore;
    const relatedAspects = topicLabels.length === 1
      ? aspects
      : aspects.filter((aspect) => {
          const topicWords = new Set(normalizeText(topic.label).split(" ").filter((word) => word.length >= 5));
          return normalizeText(aspect).split(" ").some((word) => topicWords.has(word));
        });
    const topicTags = dedupeStrings([topic.label, ...relatedAspects]).slice(0, 6);
    const claims = dedupeStrings([plannerClaim, result.understanding.statements[index]?.text]).slice(0, 2);
    const openReviewPoints = dedupeStrings([
      planner.plannerOpenQuestions[index] ?? planner.openQuestions[index] ?? "",
      "Belege prüfen",
      "Abgrenzung schärfen",
    ]).slice(0, 3);

    return {
      id: `planner-branch-${index + 1}`,
      topicId: `planner-branch-${index + 1}`,
      title: topic.label,
      summary: buildBranchSummary({
        title: topic.label,
        need: `${topic.label} ist als eigenständiges Hauptanliegen erkannt worden.`,
        claims,
      }),
      topics: [topic.label],
      topicTags,
      evidenceSnippets: claims,
      subtopics: buildBranchSubtopics({
        topicTags: relatedAspects,
        openReviewPoints,
        voteQuestions: [voteQuestion],
      }),
      sourceSection: result.understanding.summary ?? null,
      confidence:
        topic.confidence ?? result.understanding.confidence,
      parentTopicId: null,
      relatedTopicIds: [],
      suggestedQuestions: [voteQuestion],
      part06CategoryKeys: ["local_community"],
      part06CategoryLabels: resolvePart06CategoryLabels(["local_community"]),
      need: `${topic.label} ist als eigenständiges Hauptanliegen erkannt worden.`,
      claims,
      voteQuestions: [voteQuestion],
      openReviewPoints,
      positionClusters,
    };
  });
}

function buildDocumentStructureBranches(
  result: CreateIntelligentFollowupResult,
  maxBranches: number,
): CreateStructureBranch[] {
  const documentTopics = result.meta?.documentAnalysis
    ? normalizeDocumentAnalysisSummary(result.meta.documentAnalysis).topics
    : [];
  if (documentTopics.length === 0) return [];
  const positionClusters = selectPositionClusters(result.understanding);
  const branchLimit = Math.max(1, maxBranches);

  return documentTopics.slice(0, branchLimit).map((topic, index) => {
    const evidenceSnippets = dedupeStrings([
      topic.summary ?? "",
      result.understanding.summary,
    ]).slice(0, 2);
    return {
      id: topic.id || `document-topic-${index + 1}`,
      topicId: topic.id || `document-topic-${index + 1}`,
      title: topic.label,
      summary: topic.summary?.trim() || `${topic.label} wurde aus dem Dokument als Themenbereich erkannt.`,
      topics: [topic.label],
      topicTags: [topic.label],
      evidenceSnippets,
      subtopics: dedupeStrings([
        topic.subtopicCount ? `${topic.subtopicCount} Unterthemen` : "",
        topic.keyStatementCount ? `${topic.keyStatementCount} Kernaussagen` : "",
      ]),
      sourceSection: result.understanding.summary ?? null,
      confidence: index === 0 ? "high" : "medium",
      parentTopicId: null,
      relatedTopicIds: [],
      suggestedQuestions: [],
      part06CategoryKeys: ["local_community"],
      part06CategoryLabels: resolvePart06CategoryLabels(["local_community"]),
      need: `${topic.label} ist im Dokument als eigener Themenbereich vorhanden.`,
      claims: evidenceSnippets,
      voteQuestions: [],
      openReviewPoints: [],
      positionClusters,
    };
  });
}

function buildUnderstandingTopicBranches(
  result: CreateIntelligentFollowupResult,
  maxBranches: number,
): CreateStructureBranch[] {
  const topicLimit = Math.max(1, maxBranches);
  const positionClusters = selectPositionClusters(result.understanding);

  return result.understanding.topics.slice(0, topicLimit).map((topic, index) => {
    const matchingStatement = result.understanding.statements[index] ?? result.understanding.statements[0];
    const evidenceSnippets = dedupeStrings([
      matchingStatement?.text ?? "",
      result.understanding.summary,
    ]).slice(0, 2);
    const followupQuestion =
      result.understanding.openQuestion ??
      "Welche Aussage möchtest du in diesem Themenstrang als Nächstes schärfen?";
    return {
      id: topic.id,
      topicId: topic.id,
      title: topic.label,
      summary: result.understanding.summary || `${topic.label} wurde als Thema erkannt.`,
      topics: [topic.label],
      topicTags: [topic.label],
      evidenceSnippets,
      subtopics: [],
      sourceSection: result.understanding.summary ?? null,
      confidence: topic.confidence,
      parentTopicId: null,
      relatedTopicIds: [],
      suggestedQuestions: [followupQuestion],
      part06CategoryKeys: ["local_community"],
      part06CategoryLabels: resolvePart06CategoryLabels(["local_community"]),
      need: `${topic.label} wurde als eigenständiger Themenstrang erkannt.`,
      claims: evidenceSnippets,
      voteQuestions: [followupQuestion],
      openReviewPoints: ["Quellenprüfung noch nicht durchgeführt"],
      positionClusters,
    };
  });
}

export function buildCreateStructureBranches(
  result: CreateIntelligentFollowupResult,
  maxBranches: number = 3,
): CreateStructureBranch[] {
  const documentBranches = buildDocumentStructureBranches(result, maxBranches);
  if (documentBranches.length > 0) return documentBranches;

  const plannerBranches = buildPlannerStructureBranches(result, maxBranches);
  if (plannerBranches.length > 0) {
    const overflowTopics = collectUnassignedCreateTopics({
      topics: result.understanding.topics,
      visibleBranches: plannerBranches,
    });
    if (overflowTopics.length > 0) {
      plannerBranches[plannerBranches.length - 1] = {
        ...plannerBranches[plannerBranches.length - 1],
        overflowTopics,
      };
    }
    return plannerBranches;
  }

  const branches = buildUnderstandingTopicBranches(result, maxBranches);
  if (branches.length === 0) return branches;

  const branchLimit = Math.max(1, maxBranches);
  const visibleBranches = branches.slice(0, branchLimit);
  const overflowTopics = collectUnassignedCreateTopics({
    topics: result.understanding.topics,
    visibleBranches,
  });
  if (overflowTopics.length > 0 && visibleBranches.length > 0) {
    visibleBranches[visibleBranches.length - 1] = {
      ...visibleBranches[visibleBranches.length - 1],
      overflowTopics,
    };
  }
  return visibleBranches;
}
