"use client";

import * as React from "react";
import { VoxyAvatar } from "@/components/voxy/VoxyGuide";
import { hasValidatedCreatePlannerProviderIdentity } from "@/features/create/createPlannerProviderContract";
import {
  buildCreateSupportFailureCopy,
  getCreateVoxyCopy,
  type CreateVoxyLocale,
} from "@/features/create/createVoxySupportCopy";
import type { CreateSupportHandoffPublic } from "@/features/support/createSupportTicketContract";
import {
  buildCreateVisualSections,
  buildCreateStructureBranches,
  dedupeCreateFollowupSections,
  deriveDominantUnderstandingStance,
  normalizeDocumentAnalysisSummary,
  type DocumentAnalysisSummary,
  type CreateConnectionSuggestion,
  type CreateIntelligentFollowupResult,
  type CreateStructureBranch,
  type CreateVisualNode,
} from "@/features/create/intelligentFollowupContract";
import CreateHandoffDraftSummary from "@/features/create/CreateHandoffDraftSummary";
import ExistingTopicMatchesPanel, {
  type CitizenMatchDecision,
} from "@/features/create/ExistingTopicMatchesPanel";
import {
  createHandoffDraftFromDialogOutcome,
  createHandoffDraftFromExistingTopicMatch,
  mapDialogHandoffTargetToCreateHandoffDraftTarget,
  type CreateHandoffDraft,
  type CreateHandoffDraftTarget,
} from "@/features/create/createHandoffDrafts";
import {
  createReviewQueueItemFromHandoffDraft,
  canQueueHandoffDraftForReview,
  markReviewQueueItemQueued,
  markReviewQueueItemSubmittedToRuntime,
  type CreateHandoffReviewQueueItem,
} from "@/features/create/createHandoffReviewQueue";
import {
  submitCreateHandoffReviewQueueItemToRuntime,
} from "@/features/create/createHandoffReviewQueueRuntimeBridge";
import {
  createExistingTopicMatchPanelPreviewFromDialogOutcome,
  type ExistingTopicMatch,
  type ExistingTopicMatchPanelModel,
} from "@/features/create/existingTopicMatches";
import {
  resolveExistingTopicMatchesFromRuntime,
  type ResolveExistingTopicMatchesFromRuntimeResult,
} from "@/features/create/existingTopicMatchesRuntimeBridge";
import {
  runDialogIntelligenceRuntime,
  type DialogIntelligenceRuntimeResult,
  type DialogIntelligenceRuntimeSourceKind,
} from "@/features/create/dialogIntelligenceRuntimeBridge";
import type { CreateLinkIntakeDetection } from "@/features/create/linkIntake";
import {
  buildTopicDeduplicationCandidates,
  canQueueTopicDeduplicationReview,
  createTopicDeduplicationReviewDraft,
  summarizeTopicDeduplicationReviewState,
} from "@/features/create/topicDeduplicationReview";
import {
  mapDeduplicationCandidateToGraphEdgeDraft,
  summarizeTopicGraphMutationState,
} from "@/features/create/topicGraphRuntime";
import DialogResultsHandoffPanel from "@/features/dialog/DialogResultsHandoffPanel";
import type { NormalizedMaterialItem } from "@/features/create/materialRouting";
import type { DialogHandoffTarget } from "@/features/dialog/dialogIntelligenceContract";
type CreateVisualFollowupProps = {
  result: CreateIntelligentFollowupResult;
  actionNotice?: string | null;
  isConfirmed?: boolean;
  embedInWorkspaceShell?: boolean;
  activeTopicLabel?: string | null;
  selectedPrimaryTopic?: string | null;
  groupedTopicLabels?: string[];
  parkedTopicLabels?: string[];
  composerMode?: "default" | "edit" | "source" | "manual_topic";
  reviewRequestState?: "idle" | "saving" | "saved" | "error";
  reviewRequestMessage?: string | null;
  factcheckMessage?: string | null;
  showCorrectionComposer?: boolean;
  onConfirm: () => void;
  onEdit: () => void;
  onFocusTopic?: (topicLabel: string) => void;
  onSelectPrimaryTopic?: (topicLabel: string) => void;
  onGroupTopics?: (topicLabels: string[]) => void;
  onSeparateTopics?: () => void;
  onParkTopic?: (topicLabel: string) => void;
  onOpenManualTopicChooser?: () => void;
  onPrepareSubmission: () => void;
  onPrepareAnlassraum: () => void;
  onOpenDossierAppend: () => void;
  onOpenDossierCreate: () => void;
  onPrepareVote: () => void;
  onRequestEditorialReview?: () => void;
  onStartOptionalService?: () => void;
  onDeepenAllTopics?: () => void;
  onDeepenTopic?: (topicLabel: string) => void;
  onContinueInAccount?: () => void;
  onSaveQuestion?: () => void;
  onSaveTopic?: () => void;
  onSaveSource?: () => void;
  onSaveInternal?: () => void;
  onPrepareCommunity?: () => void;
  onDeferWork?: () => void;
  canCreateInternalWorkstate?: boolean;
  onRetryPlanner?: () => void;
  isRetryPlannerPending?: boolean;
  locale?: CreateVoxyLocale;
  supportHandoff?: CreateSupportHandoffPublic | null;
  dynamicStatusRef?: React.Ref<React.ElementRef<"div">>;
  onSaveOnly?: () => void;
  onSkipPlaceClarification?: () => void;
  linkDetection?: CreateLinkIntakeDetection | null;
  compactBranchLimit?: number;
  expandedBranchLimit?: number;
  documentTopicOverviewOpened?: boolean;
  showExpandedTopicPreview?: boolean;
  topicExpansionDecision?: "idle" | "expanded" | "compact" | "link" | "later";
  expandedTopicAccess?: {
    canPreviewAllTopics: boolean;
    isPrivilegedPreview: boolean;
    costState: "inactive" | "addon_required" | "uses_search_credit";
  };
  onOpenDocumentTopicOverview?: () => void;
  onExpandTopicPreview?: () => void;
  onKeepCompactTopicPreview?: () => void;
  onPrepareLinkReview?: () => void;
  onDeferExpandedReview?: () => void;
  continuationValue: string;
  onContinuationChange: (value: string) => void;
  onContinueConversation: () => void;
  continueConversationDisabled?: boolean;
  handoffRuntimeDossierId?: string | null;
  handoffRuntimeAnlassraumId?: string | null;
  handoffRuntimeSourceUrls?: string[];
  handoffRuntimeMaterialItems?: NormalizedMaterialItem[];
};

export const CREATE_VISUAL_FOLLOWUP_COPY = {
  headline: "Ich sehe einen gemeinsamen Kern.",
  headlineProvisional: "Ich sehe einen möglichen Kern.",
  headlineNeedsClarification: "Ich sehe mehrere mögliche Themenstränge.",
  structureTitle: "Vorläufig verstanden",
  structureTitleNeedsClarification: "Einordnung offen",
  coreTitle: "Kern erkannt",
  graphTitle: "So könnte der Arbeitsstand aussehen",
  overviewTitle: "Deine Struktur auf einen Blick",
  confirmTitle: "Wie willst du damit weitergehen?",
  guardrail:
    "Keine automatische Stimme. Keine automatische Veröffentlichung. Du bestätigst jeden nächsten Schritt selbst.",
  freeWriteHint: "Schreib einfach weiter. eDebatte passt den Arbeitsstand an, wenn etwas anders gemeint war.",
  pendingPreparationHint:
    "Nach deiner Bestätigung kann eDebatte passende Themen, Abstimmungen oder einen neuen Arbeitsstand vorbereiten.",
} as const;

// Contract marker for light/dark readability regressions:
// color-mix(in_oklab,white_58%,rgb(var(--card))_42%)

type FocusAreaId = "priorities" | "clusters" | "questions" | "sections" | "next_steps";

const FOCUS_AREA_ORDER: readonly FocusAreaId[] = ["priorities", "clusters", "questions", "next_steps"] as const;

type FocusOverviewCard = {
  id: FocusAreaId;
  title: string;
  lead: string;
  status: string;
};

type NextStepChecklistItem = {
  id: string;
  label: string;
  detail: string;
  done: boolean;
};

type ContentModuleTone = "source" | "vote" | "topic" | "context" | "stats";

type CreateFollowupContentModule = {
  id: string;
  title: string;
  lead: string;
  detail: string;
  tone: ContentModuleTone;
};

type CreateReviewRequestState = "idle" | "saving" | "saved" | "error";

type DialogIntelligenceUiSourceState = {
  kind: DialogIntelligenceRuntimeSourceKind;
  title: string;
  detail: string;
};

export type CreateStructureOverviewProps = {
  locale?: "de" | "en";
  prioritiesCount: number;
  clustersCount: number;
  questionsCount: number;
  nextStepsCount: number;
  nextStepLabel?: string;
  showOpenLabels?: boolean;
  onOpenSection?: (section: "priorities" | "clusters" | "questions" | "next_steps") => void;
};

const BROAD_TOPIC_FIELD_ORDER = [
  "Wohnen",
  "Verkehr",
  "Klima",
  "Bildung",
  "Migration/Integration",
  "Sicherheit/Rechtsstaat",
  "Gesundheit/Pflege",
  "kommunale Finanzen",
  "Bürgerbeteiligung",
] as const;

function resolveDialogIntelligenceUiSourceState(input: {
  runtimeResult: DialogIntelligenceRuntimeResult;
  existingTopicMatchesRuntimeStatus: ResolveExistingTopicMatchesFromRuntimeResult["status"];
}): DialogIntelligenceUiSourceState {
  if (input.runtimeResult.status === "runtime_ai") {
    return {
      kind: "runtime_ai",
      title: input.runtimeResult.sourceLabel,
      detail: input.runtimeResult.detail,
    };
  }
  if (
    input.existingTopicMatchesRuntimeStatus === "runtime" ||
    input.existingTopicMatchesRuntimeStatus === "hybrid"
  ) {
    return {
      kind: "runtime_readmodel",
      title: "KI-Auswertung vorbereitet",
      detail:
        "Anschlussvorschläge kommen bereits aus vorhandenen Runtime-Readmodels. Die Dialoganalyse selbst bleibt bis zu einer sicheren AI-Verdrahtung vorbereitend.",
    };
  }
  if (input.runtimeResult.status === "preview") {
    return {
      kind: "preview",
      title: input.runtimeResult.sourceLabel,
      detail: input.runtimeResult.detail,
    };
  }
  if (input.runtimeResult.status === "blocked_unwired") {
    return {
      kind: "blocked_unwired",
      title: input.runtimeResult.sourceLabel,
      detail: input.runtimeResult.detail,
    };
  }
  return {
    kind: "error",
    title: input.runtimeResult.sourceLabel,
    detail: input.runtimeResult.detail,
  };
}

const BROAD_TOPIC_QUESTION_BY_FIELD: Record<(typeof BROAD_TOPIC_FIELD_ORDER)[number], string> = {
  Wohnen: "Soll bezahlbarer Wohnraum Vorrang vor neuen Einzelprojekten bekommen?",
  Verkehr: "Welche Verkehrsmaßnahmen sollen zuerst umgesetzt werden?",
  Klima: "Wie sollen Klimaziele und soziale Tragfähigkeit ausbalanciert werden?",
  Bildung: "Welche Bildungsmaßnahmen haben aktuell die höchste Priorität?",
  "Migration/Integration": "Welche Integrationsmaßnahmen sollten zuerst gestärkt werden?",
  "Sicherheit/Rechtsstaat": "Wie soll Sicherheit gestärkt werden, ohne den Rechtsstaat auszuhöhlen?",
  "Gesundheit/Pflege": "Welche Pflege- und Gesundheitsmaßnahmen sind kurzfristig am dringendsten?",
  "kommunale Finanzen": "Welche Prioritäten sind unter den aktuellen kommunalen Finanzen tragfähig?",
  "Bürgerbeteiligung": "Wie kann Bürgerbeteiligung verbindlicher in Entscheidungen einfließen?",
};

function isPlaceClarificationQuestion(question: string | null | undefined): boolean {
  const normalized = String(question ?? "").trim().toLowerCase();
  if (!normalized) return false;
  return /\bort\b|\bbezirk\b|\bkommune\b|\bgemeinde\b|\bstadt\b|\bkiez\b|\bviertel\b|\bregion\b|\bpostleitzahl\b|\bplz\b/.test(
    normalized,
  );
}

function resolveNodeTone(kind: CreateVisualNode["kind"]): string {
  if (kind === "source_text") {
    return "border-cyan-500/35 bg-cyan-50 text-cyan-950 dark:border-cyan-300/60 dark:bg-cyan-500/15 dark:text-cyan-50";
  }
  if (kind === "statement") {
    return "border-sky-500/30 bg-sky-50 text-sky-950 dark:border-sky-300/45 dark:bg-sky-500/10 dark:text-sky-50";
  }
  if (kind === "topic") {
    return "border-violet-500/30 bg-violet-50 text-violet-950 dark:border-violet-300/45 dark:bg-violet-500/10 dark:text-violet-50";
  }
  if (kind === "stance") {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-950 dark:border-emerald-300/45 dark:bg-emerald-500/10 dark:text-emerald-50";
  }
  if (kind === "scope") {
    return "border-amber-500/35 bg-amber-50 text-amber-950 dark:border-amber-300/45 dark:bg-amber-500/10 dark:text-amber-50";
  }
  if (kind === "dossier" || kind === "anlassraum") {
    return "border-blue-500/30 bg-blue-50 text-blue-950 dark:border-blue-300/45 dark:bg-blue-500/10 dark:text-blue-50";
  }
  if (kind === "vote") {
    return "border-fuchsia-500/30 bg-fuchsia-50 text-fuchsia-950 dark:border-fuchsia-300/45 dark:bg-fuchsia-500/10 dark:text-fuchsia-50";
  }
  return "border-slate-300/45 bg-slate-50 text-slate-900 dark:border-slate-300/45 dark:bg-slate-500/10 dark:text-slate-100";
}

function resolveStanceLead(label: string): string {
  if (label === "eher dafür") return "eher dafür";
  if (label === "eher dagegen") return "eher dagegen";
  return "offen/unklar";
}

function resolveScopeLabel(scope: string): string {
  if (scope === "local") return "lokal";
  if (scope === "district") return "Bezirk";
  if (scope === "municipal") return "Kommune";
  if (scope === "state") return "Land";
  if (scope === "federal") return "Bund";
  if (scope === "eu") return "EU";
  if (scope === "international") return "international";
  return "unklar";
}

function resolveSuggestionBadge(kind: CreateConnectionSuggestion["kind"]): string {
  if (kind === "dossier") return "Dossier";
  if (kind === "vote") return "Abstimmung";
  if (kind === "anlassraum") return "Anlassraum";
  if (kind === "new_anlassraum") return "Neuer Anlassraum";
  return "Themenfeld";
}

function FocusAreaIcon(props: { area: FocusAreaId | "branch"; active?: boolean }) {
  const className = props.active ? "text-cyan-950 dark:text-cyan-50" : "text-slate-600 dark:text-slate-200";

  if (props.area === "priorities") {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20" className={`h-4 w-4 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 5h12" />
        <path d="M4 10h9" />
        <path d="M4 15h6" />
      </svg>
    );
  }
  if (props.area === "clusters" || props.area === "branch") {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20" className={`h-4 w-4 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="4" width="5" height="5" rx="1.5" />
        <rect x="12" y="4" width="5" height="5" rx="1.5" />
        <rect x="7.5" y="11" width="5" height="5" rx="1.5" />
      </svg>
    );
  }
  if (props.area === "questions") {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20" className={`h-4 w-4 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M7.2 7.1a2.8 2.8 0 1 1 5 1.7c-.8.8-1.7 1.3-1.7 2.6" />
        <circle cx="10" cy="14.8" r=".8" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (props.area === "sections") {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20" className={`h-4 w-4 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M5 5.5h10" />
        <path d="M5 10h10" />
        <path d="M5 14.5h7" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className={`h-4 w-4 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 10.5 8 14l8-8" />
      <path d="M4 5h12" />
    </svg>
  );
}

function toSentenceList(labels: string[]): string {
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0] ?? "";
  if (labels.length === 2) return `${labels[0]} und ${labels[1]}`;
  const head = labels.slice(0, -1).join(", ");
  const last = labels[labels.length - 1];
  return `${head} und ${last}`;
}

function resolveLoopedIndex(currentIndex: number, offset: number, total: number): number {
  return (currentIndex + offset + total) % total;
}

function resolveExistingTopicMatchDraftTarget(
  match: ExistingTopicMatch,
): CreateHandoffDraftTarget {
  if (match.kind === "opinion_cluster") return "opinion_count";
  if (match.kind === "source_question") return "factcheck_request";
  if (match.kind === "dossier") return "dossier_candidate";
  if (match.kind === "participation_space") {
    return "participation_space_candidate";
  }
  return "existing_branch_connection";
}

export function resolveCitizenMatchDecisionDraftTarget(
  match: ExistingTopicMatch,
  decision: CitizenMatchDecision | null | undefined,
): CreateHandoffDraftTarget {
  if (decision === "keep_separate") return "new_branch";
  if (decision === "add_as_nuance") return "existing_branch_connection";
  if (decision === "count_my_position" || decision === "count_as_opposition") {
    return "opinion_count";
  }
  return resolveExistingTopicMatchDraftTarget(match);
}

function resolveNextIndexFromKey(currentIndex: number, key: string, total: number): number | null {
  if (total <= 0) return null;
  if (key === "ArrowRight" || key === "ArrowDown") return resolveLoopedIndex(currentIndex, 1, total);
  if (key === "ArrowLeft" || key === "ArrowUp") return resolveLoopedIndex(currentIndex, -1, total);
  if (key === "Home") return 0;
  if (key === "End") return total - 1;
  return null;
}

function resolveReviewRequestLabel(
  state: CreateReviewRequestState,
  variant: "full" | "compact" = "full",
): string {
  if (state === "saving") return variant === "compact" ? "Wird angefragt …" : "Prüfung wird angefragt …";
  if (state === "saved") return variant === "compact" ? "Prüfung angefragt" : "Redaktionelle Prüfung angefragt";
  if (state === "error") return variant === "compact" ? "Erneut anfragen" : "Prüfung erneut anfragen";
  return variant === "compact" ? "Prüfung anfragen" : "Redaktionell prüfen lassen";
}

function needsPlannerClarification(result: CreateIntelligentFollowupResult): boolean {
  const planner = result.meta?.planner;
  if (!planner) return false;
  if (hasUsablePlannerStructure(result)) return false;
  return (
    planner.qualityIssues.includes("technical_fallback_only") ||
    planner.qualityStatus === "generic" ||
    planner.qualityStatus === "needs_confirmation" ||
    planner.qualityStatus === "failed"
  );
}

function hasProvisionalPlannerStructure(result: CreateIntelligentFollowupResult): boolean {
  const planner = result.meta?.planner;
  if (!planner) return false;
  return planner.plannerDegraded && hasUsablePlannerStructure(result);
}

function isTechnicalPlannerFallback(result: CreateIntelligentFollowupResult): boolean {
  const planner = result.meta?.planner;
  if (!planner) return false;
  return planner.qualityIssues.includes("technical_fallback_only") || planner.qualityStatus === "failed";
}

function hasTechnicalPlannerFallbackMeta(result?: CreateIntelligentFollowupResult | null): boolean {
  if (!result) return false;
  const planner = result.meta?.planner;
  if (!planner) return false;
  return planner.qualityIssues.includes("technical_fallback_only") || planner.qualityStatus === "failed";
}

function hasUsablePlannerStructure(result: CreateIntelligentFollowupResult): boolean {
  const planner = result.meta?.planner;
  if (!planner || !hasValidatedCreatePlannerProviderIdentity(planner)) return false;
  const uniqueTopics = Array.from(new Set([planner.plannerTopic, ...planner.topicCandidates].map((value) => value.trim()).filter(Boolean)));
  const uniqueClusters = Array.from(new Set(planner.plannerClusters.map((value) => value.trim()).filter(Boolean)));
  const nonGenericTopics = uniqueTopics.filter((value) => !isGenericPlannerLabel(value));
  const nonGenericClusters = uniqueClusters.filter((value) => !isGenericPlannerLabel(value));
  return nonGenericTopics.length > 0 && (nonGenericClusters.length >= 3 || planner.graphSearchTerms.length >= 4);
}

function resolvePlannerClarificationReason(result: CreateIntelligentFollowupResult): string {
  const planner = result.meta?.planner;
  if (!planner) {
    return "Aus deinem Beitrag ergeben sich mehrere Stränge. Du entscheidest, wie wir weiterarbeiten.";
  }
  if (isTechnicalPlannerFallback(result)) {
    return "Aus deinem Beitrag ergeben sich mehrere Stränge. Du entscheidest, wie wir weiterarbeiten.";
  }
  if (planner.qualityStatus === "generic" || planner.qualityStatus === "needs_confirmation") {
    return "Aus deinem Beitrag ergeben sich mehrere Stränge. Du entscheidest, wie wir weiterarbeiten.";
  }
  return "Du entscheidest, wie wir weiterarbeiten.";
}

function resolvePlannerClarificationDetails(result: CreateIntelligentFollowupResult): string | null {
  const planner = result.meta?.planner;
  if (!planner) return null;
  if (planner.degradedReason === "missing_provider_key") {
    return "Die automatische Einordnung ist gerade nicht verfügbar.";
  }
  if (planner.degradedReason === "timeout") {
    return "Die automatische Einordnung hat nicht rechtzeitig geantwortet.";
  }
  if (
    planner.degradedReason === "invalid_json" ||
    planner.degradedReason === "invalid_provider_payload" ||
    planner.degradedReason === "normalization_failed"
  ) {
    return "Die automatische Einordnung konnte nicht sauber verarbeitet werden.";
  }
  if (planner.degradedReason === "quality_gate_failed") {
    return "Der Text enthält mehrere mögliche Themen oder braucht eine genauere Auswahl.";
  }
  if (planner.degradedReason === "rate_limited") {
    return "Die automatische Einordnung ist gerade ausgelastet.";
  }
  if (planner.degradedReason === "provider_error") {
    return "Die automatische Einordnung konnte gerade nicht geladen werden.";
  }
  if (planner.qualityStatus === "generic" || planner.qualityStatus === "needs_confirmation") {
    return "Der Text enthält mehrere mögliche Themen oder braucht eine genauere Auswahl.";
  }
  return null;
}

function resolvePlannerProvisionalNotice(result: CreateIntelligentFollowupResult): string | null {
  const planner = result.meta?.planner;
  if (!planner || !hasProvisionalPlannerStructure(result)) return null;
  return "Du kannst ein Thema auswählen oder den Beitrag weiter sortieren.";
}

function isGenericPlannerLabel(label: string): boolean {
  const normalized = label.trim().toLowerCase();
  if (!normalized) return true;
  return (
    normalized === "aussage" ||
    normalized === "beitrag" ||
    normalized === "hinweis" ||
    normalized === "öffentliches anliegen" ||
    normalized === "öffentliches anliegen mit klärungsbedarf" ||
    normalized === "oeffentliches anliegen mit klaerungsbedarf" ||
    normalized === "neues öffentliches thema strukturieren" ||
    normalized === "neues oeffentliches thema strukturieren"
  );
}

function extractDegradedStartPoints(result: CreateIntelligentFollowupResult): string[] {
  const planner = result.meta?.planner;
  const fromPlanner = [
    ...(planner?.plannerClusters ?? []),
    ...(planner?.clusterCandidates ?? []),
    ...(planner?.topicCandidates ?? []),
    ...(result.understanding.topics ?? []).map((topic) => topic.label),
  ]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0 && !isGenericPlannerLabel(value));
  const seen = new Set<string>();
  const startPoints: string[] = [];
  for (const entry of fromPlanner) {
    const key = entry.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    startPoints.push(entry);
    if (startPoints.length === 4) break;
  }
  return startPoints;
}

type DeterministicFallbackBranchDraft = {
  title: string;
  description: string;
  referencePoints: string[];
};

function dedupeLabelsCaseInsensitive(labels: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const label of labels) {
    const normalized = label.trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(normalized);
  }
  return deduped;
}

function buildDeterministicFallbackBranchDrafts(
  result: CreateIntelligentFollowupResult,
): DeterministicFallbackBranchDraft[] {
  const topicDrafts = result.understanding.topics.slice(0, 3).map((topic) => ({
    title: topic.label,
    description: `${topic.label} bleibt bis zur bestätigten Einordnung als technischer Themenhinweis markiert.`,
    referencePoints: [],
  }));
  return topicDrafts.length > 0
    ? topicDrafts
    : [
        {
          title: "Thema noch offen",
          description: "Ohne validierte Analyse bleibt der Arbeitsstand technisch offen.",
          referencePoints: [],
        },
      ];
}

function buildDeterministicFallbackBranches(
  result: CreateIntelligentFollowupResult,
): CreateStructureBranch[] {
  const fallbackClaim =
    result.understanding.statements[0]?.text?.trim() ||
    result.understanding.summary.trim() ||
    "Dieser Themenstrang bleibt bis zur tieferen Einordnung als Entwurf sichtbar.";
  return buildDeterministicFallbackBranchDrafts(result).map((draft, index) => {
    return {
      id: `degraded-fallback-branch-${index}`,
      topicId: `degraded-fallback-branch-${index}`,
      title: draft.title,
      summary: draft.description,
      topics: [draft.title],
      topicTags: draft.referencePoints.length > 0 ? draft.referencePoints : [draft.title],
      evidenceSnippets: [fallbackClaim],
      subtopics: draft.referencePoints,
      sourceSection: result.understanding.summary ?? null,
      confidence: "low",
      parentTopicId: null,
      relatedTopicIds: [],
      suggestedQuestions: [],
      part06CategoryKeys: [],
      part06CategoryLabels: [draft.title],
      need:
        draft.description,
      claims: [fallbackClaim],
      voteQuestions: [],
      openReviewPoints: draft.referencePoints,
      positionClusters: [],
    };
  });
}

function buildMultiTopicActionTopics(result: CreateIntelligentFollowupResult): string[] {
  return Array.from(
    new Set(
      result.understanding.topics
        .map((topic) => topic.label.trim())
        .filter(Boolean),
    ),
  ).slice(0, 5);
}

function shouldShowMultiTopicActionPanel(actionTopics: string[]): boolean {
  return actionTopics.length >= 3;
}

export function deriveCreateStructureOverviewMetrics(params: {
  result?: CreateIntelligentFollowupResult | null;
  isConfirmed?: boolean;
}): {
  prioritiesCount: number;
  clustersCount: number;
  questionsCount: number;
  nextStepsCount: number;
} {
  const result = params.result ?? null;
  if (hasTechnicalPlannerFallbackMeta(result)) {
    return {
      prioritiesCount: 0,
      clustersCount: 0,
      questionsCount: 0,
      nextStepsCount: 0,
    };
  }
  const structureBranches = result ? buildCreateStructureBranches(result, 3) : [];
  const voteQuestions = result
    ? buildVoteQuestions({
        dossierContext: result.understanding.dossierContext,
        broadTopicFields: deriveBroadTopicFields(result.understanding.topics.map((topic) => topic.label)),
        suggestions: result.suggestions,
        fallbackTopic:
          result.understanding.dossierContext ?? result.understanding.topics[0]?.label ?? "Öffentliches Thema",
      })
    : [];

  return {
    prioritiesCount: result ? Math.min(Math.max(result.understanding.topics.length, 1), 3) : 0,
    clustersCount: result ? Math.max(structureBranches.length, 1) : 0,
    questionsCount: result ? Math.max(voteQuestions.length, 1) : 0,
    nextStepsCount: result ? 1 : 0,
  };
}

function normalizeTopicLabel(label: string): string {
  return label.trim().toLowerCase();
}

function normalizeDenseText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ");
}

function isSimilarDenseText(a?: string | null, b?: string | null): boolean {
  const left = normalizeDenseText(String(a ?? ""));
  const right = normalizeDenseText(String(b ?? ""));
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.length < 18 || right.length < 18) return false;
  return left.includes(right) || right.includes(left);
}

function shouldShowAssistantLead(summary: string, assistantLead: string, coreClaim: string): boolean {
  if (!assistantLead.trim()) return false;
  if (isSimilarDenseText(assistantLead, summary)) return false;
  if (isSimilarDenseText(assistantLead, coreClaim)) return false;
  return true;
}

function buildNextStepChecklist(params: {
  isConfirmed: boolean;
  structureBranches: CreateStructureBranch[];
  voteQuestions: string[];
  sortedSuggestions: CreateConnectionSuggestion[];
}): NextStepChecklistItem[] {
  const clusterLabel =
    params.structureBranches.length > 1
      ? `${params.structureBranches.length} Themencluster prüfen`
      : "Themencluster prüfen";
  const questionLabel =
    params.voteQuestions.length > 1 ? `${params.voteQuestions.length} Fragen formulieren` : "1 Frage formulieren";
  const handoffLabel =
    params.sortedSuggestions[0]?.kind === "vote"
      ? "Abstimmung vorbereiten"
      : params.sortedSuggestions[0]?.kind === "dossier"
        ? "Thema öffnen"
        : "Ja, so einreichen";

  return [
    {
      id: "confirm",
      label: "Tiefer ins Thema gehen",
      detail: "Der vorgeschlagene Arbeitsstand wird geprüft und noch nicht veröffentlicht.",
      done: params.isConfirmed,
    },
    {
      id: "clusters",
      label: clusterLabel,
      detail: "Die wichtigsten Themen bleiben kompakt als Focus Cards zusammengefasst.",
      done: params.isConfirmed,
    },
    {
      id: "questions",
      label: questionLabel,
      detail: "Die Leitfragen werden erst nach deiner Bestätigung weiter vorbereitet.",
      done: false,
    },
    {
      id: "handoff",
      label: handoffLabel,
      detail: "Der nächste Schritt bleibt bewusst gewählt und startet nicht automatisch.",
      done: false,
    },
  ];
}

function resolveContentModuleToneClass(tone: ContentModuleTone): string {
  if (tone === "source") {
    return "border-cyan-300/35 bg-cyan-500/[0.08] text-cyan-50";
  }
  if (tone === "vote") {
    return "border-fuchsia-300/25 bg-fuchsia-500/[0.08] text-fuchsia-50";
  }
  if (tone === "topic") {
    return "border-violet-300/25 bg-violet-500/[0.08] text-violet-50";
  }
  if (tone === "stats") {
    return "border-amber-300/25 bg-amber-500/[0.08] text-amber-50";
  }
  return "border-slate-300/25 bg-slate-500/[0.08] text-slate-50";
}

function buildContentModules(params: {
  result: CreateIntelligentFollowupResult;
  sections: ReturnType<typeof buildCreateVisualSections>;
  sortedSuggestions: CreateConnectionSuggestion[];
}): CreateFollowupContentModule[] {
  const modules: CreateFollowupContentModule[] = [];
  const seen = new Set<string>();
  const sourceText = params.result.sourceText.toLowerCase();
  const statements = params.result.understanding.statements;
  const push = (module: CreateFollowupContentModule) => {
    if (seen.has(module.title)) return;
    seen.add(module.title);
    modules.push(module);
  };

  const sourceStatement = statements.find((statement) => statement.kind === "source");
  if (
    sourceStatement ||
    /https?:\/\/|www\.|quelle|quellen|artikel|bericht|studie|interview|dokument/.test(sourceText)
  ) {
    push({
      id: "sources",
      title: "Quellen & Kontext",
      lead: sourceStatement?.text ?? "Der Beitrag bringt mindestens einen Quellen- oder Kontextbezug mit.",
      detail: "Bleibt sichtbar als Kontextsignal. Es wird hier nichts automatisch veröffentlicht.",
      tone: "source",
    });
  }

  if (/youtube|youtu\.be|video|videosequenz|clip/.test(sourceText)) {
    push({
      id: "video",
      title: "Videosequenz",
      lead: "Im Beitrag steckt ein Video- oder Clip-Hinweis.",
      detail: "Die Oberfläche behandelt das als gesonderten Kontexttyp statt wie Freitext.",
      tone: "source",
    });
  }

  if (/artikel|bericht|meldung|story|interview|studie|zeitung/.test(sourceText)) {
    push({
      id: "article",
      title: "Artikel / Bericht",
      lead: "Textnahe Quellen lassen sich als eigener Arbeitskontext lesen.",
      detail: "So bleibt erkennbar, ob ein Hinweis eher Nachricht, Beobachtung oder Position ist.",
      tone: "context",
    });
  }

  const questionStatement = statements.find((statement) => statement.kind === "question" || statement.kind === "option");
  const voteSuggestion = params.sortedSuggestions.find((suggestion) => suggestion.kind === "vote");
  if (questionStatement || voteSuggestion) {
    push({
      id: "choices",
      title: "Fragen / Multiple Choice",
      lead: questionStatement?.text ?? voteSuggestion?.title ?? "Es gibt einen klaren Entscheidungspunkt.",
      detail: "Optionen und Leitfragen bleiben als eigener Baustein sichtbar statt im Freitext zu verschwinden.",
      tone: "vote",
    });
  }

  if (/\d|\bprozent\b|%|€|euro|million|milliarde/.test(sourceText)) {
    push({
      id: "stats",
      title: "Zahlen / Statistik",
      lead: "Im Beitrag tauchen quantifizierende Signale auf.",
      detail: "Zahlenhinweise werden als eigener Prüfkontext behandelt.",
      tone: "stats",
    });
  }

  if (params.sections.length > 1) {
    push({
      id: "sections",
      title: "Gelesene Sinnabschnitte",
      lead: `${params.sections.length} Abschnitte wurden getrennt gelesen.`,
      detail: "So bleibt sichtbar, welche Aussagen zusammengehören und was nur Zusatzkontext ist.",
      tone: "context",
    });
  }

  if (modules.length === 0) {
    push({
      id: "context",
      title: "Kontextsignal",
      lead: params.result.understanding.summary,
      detail: "Die Oberfläche hält den Beitrag zunächst als kompakten Arbeitskontext zusammen.",
      tone: "topic",
    });
  }

  return modules.slice(0, 4);
}

function deriveBroadTopicFields(topicLabels: string[]): string[] {
  const normalized = new Set(topicLabels.map(normalizeTopicLabel));
  return BROAD_TOPIC_FIELD_ORDER.filter((label) => normalized.has(normalizeTopicLabel(label)));
}

function buildVoteQuestions(params: {
  dossierContext?: string;
  broadTopicFields: string[];
  suggestions: CreateConnectionSuggestion[];
  fallbackTopic: string;
}): string[] {
  const questions: string[] = [];
  const pushQuestion = (value?: string | null) => {
    const normalized = String(value ?? "").trim();
    if (!normalized || questions.includes(normalized)) return;
    questions.push(normalized);
  };

  for (const suggestion of params.suggestions) {
    if (suggestion.kind !== "vote") continue;
    pushQuestion(suggestion.title);
  }
  for (const field of params.broadTopicFields) {
    pushQuestion(BROAD_TOPIC_QUESTION_BY_FIELD[field as (typeof BROAD_TOPIC_FIELD_ORDER)[number]]);
  }
  if (questions.length === 0) {
    pushQuestion(`Welche Prioritäten sollen im Kontext ${params.fallbackTopic} zuerst bearbeitet werden?`);
  }
  return questions;
}

function resolveAssistantLead(params: {
  topicLabels: string[];
  summary: string;
  statementText: string;
  dossierContext?: string;
  plannerTopic?: string | null;
}): string {
  const topicSentence = toSentenceList(params.topicLabels.slice(0, 4).map((label) => label.toLowerCase()));
  if (topicSentence) return `Du sprichst vor allem über ${topicSentence}.`;
  if (params.summary.trim().length > 0) return params.summary.trim();
  return params.statementText.trim();
}

function resolveCoreClaim(params: {
  topicLabels: string[];
  fallback: string;
  dossierContext?: string;
  plannerCore?: string | null;
}): string {
  if (params.plannerCore?.trim()) {
    return params.plannerCore.trim();
  }
  return params.fallback;
}

function sortSuggestions(
  suggestions: CreateConnectionSuggestion[],
): CreateConnectionSuggestion[] {
  const priority: Record<CreateConnectionSuggestion["kind"], number> = {
    dossier: 0,
    vote: 1,
    anlassraum: 2,
    new_anlassraum: 3,
    topic: 9,
  };
  return [...suggestions].sort((a, b) => priority[a.kind] - priority[b.kind]);
}

function derivePositionClusters(result: CreateIntelligentFollowupResult): string[] {
  if (result.understanding.positionClusters?.length) {
    return result.understanding.positionClusters.map((cluster) => cluster.label);
  }
  const haystack = `${result.understanding.summary} ${result.sourceText} ${result.understanding.topics
    .map((topic) => topic.label)
    .join(" ")}`.toLowerCase();
  const clusters: string[] = [];
  if (/bezahlbar|chancen|entlast|sozial|pflege|schutz/.test(haystack)) clusters.push("sozial/ausgleichend");
  if (/regel|leistung|sprachf[oö]rderung|sanktion|verantwort|rechtsstaat/.test(haystack)) {
    clusters.push("ordnungs-/leistungsorientiert");
  }
  if (/abw[aä]g|pragmatisch|zust[aä]ndigkeit|kosten|umsetzung|option/.test(haystack)) {
    clusters.push("pragmatisch/abwägend");
  }
  if (clusters.length === 0) clusters.push("pragmatisch/abwägend");
  return clusters.slice(0, 3);
}

function UserContributionBubble(props: {
  text: string;
  locale: CreateVoxyLocale;
}) {
  return (
    <div className="create-chat-message flex justify-end">
      <div className="w-full max-w-[46rem] min-w-0 sm:w-auto sm:min-w-[42%]">
        <p className="text-right text-[13px] font-semibold text-slate-700 dark:text-[rgb(var(--muted))]">
          {props.locale === "en" ? "You" : "Du"}
        </p>
        <div className="mt-2 rounded-[1.5rem] rounded-tl-sm border border-slate-200/90 bg-[color-mix(in_oklab,white_76%,rgb(var(--card))_24%)] px-5 py-4 shadow-sm shadow-slate-950/5 dark:border-[rgb(var(--border))] dark:bg-[rgb(var(--card))] dark:shadow-none">
          <p className="text-[15px] leading-relaxed text-slate-900 md:text-base dark:text-[rgb(var(--fg))]">{props.text}</p>
        </div>
      </div>
    </div>
  );
}

function AssistantUnderstandingBubble(props: {
  eyebrow: string;
  headline: string;
  summary: string;
  assistantLead: string;
  coreClaim: string;
  showCoreBlock: boolean;
  showAssistantLead: boolean;
  stanceLabel: string;
  scopeLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="create-chat-message flex gap-3">
      <div className="mt-1 shrink-0">
        <VoxyAvatar appearance="inline" variant="presenting" />
      </div>
      <div className="w-full max-w-[54rem] min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-slate-700 dark:text-[rgb(var(--muted))]">Voxy</p>
        <div className="mt-2 rounded-[1.6rem] rounded-tl-sm border border-[rgb(var(--border))] bg-[color-mix(in_oklab,rgb(var(--card))_94%,rgb(var(--bg))_6%)] px-5 py-5 md:px-6 dark:bg-[color-mix(in_oklab,rgb(var(--card))_95%,rgb(var(--bg))_5%)]">
          <p className="text-[13px] font-medium text-cyan-900 dark:text-cyan-200">{props.eyebrow}</p>
          <p className="mt-1.5 text-xl font-semibold tracking-[-0.01em] text-[rgb(var(--fg))] md:text-[1.35rem]">{props.headline}</p>
          <p className="mt-4 text-[15px] leading-relaxed text-cyan-950 md:text-base dark:text-cyan-100">{props.summary || props.assistantLead}</p>
          {props.showAssistantLead ? (
            <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-cyan-900/80 dark:text-cyan-100/80">{props.assistantLead}</p>
          ) : null}
          {props.showCoreBlock ? (
            <div className="mt-5 rounded-[1.5rem] border border-cyan-200/40 bg-cyan-500/[0.07] px-5 py-4 dark:border-cyan-300/20 dark:bg-cyan-500/[0.08]">
              <p className="text-[14px] font-medium text-cyan-900 dark:text-cyan-200">{CREATE_VISUAL_FOLLOWUP_COPY.coreTitle}</p>
              <p className="mt-2 text-[15px] font-semibold leading-relaxed text-cyan-950 md:text-[1.1rem] dark:text-cyan-50">{props.coreClaim}</p>
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2 opacity-90">
            <span className="rounded-full border border-emerald-500/30 bg-emerald-50 px-3 py-1.5 text-[14px] text-emerald-950 dark:border-emerald-300/40 dark:bg-emerald-500/10 dark:text-emerald-50">
              Haltung: {props.stanceLabel}
            </span>
            <span className="rounded-full border border-amber-500/35 bg-amber-50 px-3 py-1.5 text-[14px] text-amber-950 dark:border-amber-300/40 dark:bg-amber-500/10 dark:text-amber-50">
              Ebene: {props.scopeLabel}
            </span>
          </div>
          {props.children}
        </div>
      </div>
    </div>
  );
}

function WorkspaceActionEventBubble(props: { message: string }) {
  return (
    <div className="create-chat-message flex justify-center">
      <div className="max-w-3xl rounded-full border border-cyan-300/30 bg-cyan-500/[0.08] px-4 py-2 text-sm text-cyan-950 dark:border-cyan-300/20 dark:bg-cyan-500/[0.12] dark:text-cyan-100">
        {props.message}
      </div>
    </div>
  );
}

function TopicFieldList(props: { labels: string[]; onPick: (label: string) => void }) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {props.labels.map((label) => (
        <button
          key={`topic-${label}`}
          type="button"
          onClick={() => props.onPick(`Thema: ${label}`)}
          className={`rounded-full border px-2.5 py-1 text-sm ${resolveNodeTone("topic")}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function resolveFollowupChatHeadline(params: {
  plannerClarificationRequired: boolean;
  branchCount: number;
  issueMode?: "single_issue" | "multi_issue";
}): string {
  if (params.issueMode === "multi_issue") {
    return "Das ist kein einzelnes Anliegen, sondern ein Vorschlagspaket.";
  }
  if (params.plannerClarificationRequired) {
    return "Ich habe diese Themen erkannt.";
  }
  if (params.branchCount > 1) {
    return "Ich habe diese Themen erkannt.";
  }
  return CREATE_VISUAL_FOLLOWUP_COPY.headline;
}

function PositionClusterList(props: { labels: string[]; onPick: (label: string) => void }) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {props.labels.map((cluster) => (
        <button
          key={cluster}
          type="button"
          onClick={() => props.onPick(`Blickrichtung: ${cluster}`)}
          className={`rounded-full border px-2.5 py-1 text-sm ${resolveNodeTone("stance")}`}
        >
          {cluster}
        </button>
      ))}
    </div>
  );
}

function VoteQuestionList(props: { questions: string[] }) {
  return (
    <ol className="mt-2 space-y-1 text-sm text-[rgb(var(--fg))]">
      {props.questions.map((question, index) => (
        <li key={`vote-question-${index}`}>{index + 1}. {question}</li>
      ))}
    </ol>
  );
}

function StructureBranchCard(props: {
  branch: CreateStructureBranch;
  onEdit: (focus: string) => void;
}) {
  const primaryClaim = props.branch.claims[0] ?? props.branch.need;
  const primaryQuestion = props.branch.voteQuestions[0] ?? "Welche Leitfrage soll zuerst geklärt werden?";
  const visibleTopicTags = props.branch.topicTags.slice(0, 3);
  const visiblePositionClusters = props.branch.positionClusters.slice(0, 2);
  const visibleVoteQuestions = props.branch.voteQuestions.slice(0, 2);
  const showNeedBlock =
    props.branch.need.trim().length > 0 &&
    !isSimilarDenseText(props.branch.need, props.branch.title) &&
    !isSimilarDenseText(props.branch.need, props.branch.claims[0] ?? "");
  const statusLabel = `${Math.max(1, visibleTopicTags.length)} Schwerpunkte · ${props.branch.openReviewPoints.length} Prüfpunkte`;

  return (
    <article
      data-focus-card-detail
      className="overflow-hidden rounded-[28px] border border-cyan-200/45 bg-[color-mix(in_oklab,rgb(var(--card))_94%,rgb(var(--bg))_6%)] px-4 py-5 shadow-[0_24px_56px_rgba(8,145,178,0.08)] transition-all duration-300 ease-out dark:border-cyan-300/20 dark:bg-[color-mix(in_oklab,rgb(var(--card))_94%,rgb(var(--bg))_6%)] dark:shadow-none sm:rounded-[32px]"
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-800 dark:text-cyan-200">Focus Card</p>
            <p className="break-words text-lg font-semibold text-cyan-950 md:text-[1.75rem] dark:text-cyan-50">{props.branch.title}</p>
            {visibleTopicTags.length ? (
              <p className="max-w-3xl text-sm leading-relaxed text-cyan-900/85 dark:text-cyan-100/85">
                Schwerpunkt: {toSentenceList(visibleTopicTags)}
              </p>
            ) : null}
          </div>
          <span className="self-start rounded-full border border-cyan-300/50 bg-cyan-500/[0.07] px-3 py-1.5 text-left text-[11px] font-semibold leading-relaxed text-cyan-900 dark:border-cyan-300/35 dark:bg-cyan-500/10 dark:text-cyan-100 sm:max-w-[12rem] sm:text-right">
            {statusLabel}
          </span>
        </div>
        {visiblePositionClusters.length ? (
          <div className="flex flex-wrap gap-2">
            {visiblePositionClusters.map((cluster) => (
              <span
                key={`${props.branch.id}-cluster-${cluster}`}
                className={`rounded-full border px-2.5 py-1 text-xs ${resolveNodeTone("stance")}`}
              >
                {cluster}
              </span>
            ))}
          </div>
        ) : null}
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(240px,0.9fr)]">
          <div className="rounded-[24px] border border-slate-200/40 bg-[color-mix(in_oklab,rgb(var(--card))_90%,rgb(var(--bg))_10%)] px-4 py-4 dark:border-white/10 dark:bg-[rgb(var(--card))]/70">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-800 dark:text-cyan-200">Knapper Bedarf</p>
            <p className="mt-2 break-words text-sm leading-7 text-cyan-950 dark:text-cyan-50">{showNeedBlock ? props.branch.need : primaryClaim}</p>
          </div>
          <div className="rounded-[24px] border border-cyan-200/45 bg-cyan-500/[0.08] px-4 py-4 dark:border-cyan-300/25 dark:bg-cyan-500/12">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-800 dark:text-cyan-200">Wichtigste Frage</p>
            <p className="mt-2 break-words text-sm font-medium leading-7 text-cyan-950 dark:text-cyan-50">{primaryQuestion}</p>
          </div>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {props.branch.part06CategoryLabels.map((label) => (
          <span
            key={`${props.branch.id}-part06-${label}`}
            className={`rounded-full border px-2.5 py-1 text-xs opacity-80 ${resolveNodeTone("dossier")}`}
          >
            {label}
          </span>
        ))}
      </div>
      <div className="mt-5 space-y-3 border-t border-slate-200/80 pt-4 dark:border-[rgb(var(--border))]">
        <div className="rounded-2xl border border-slate-200/70 bg-[color-mix(in_oklab,rgb(var(--card))_90%,rgb(var(--bg))_10%)] px-3 py-3 dark:border-[rgb(var(--border))] dark:bg-[rgb(var(--bg))]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--muted))]">Wichtige Abstimmungsfragen</p>
          <ul className="mt-2 space-y-2 text-sm leading-relaxed text-[rgb(var(--fg))]">
            {visibleVoteQuestions.map((question) => (
              <li
                key={`${props.branch.id}-question-${question}`}
                className="rounded-xl border border-slate-200/70 bg-[color-mix(in_oklab,rgb(var(--card))_92%,rgb(var(--bg))_8%)] px-4 py-3 dark:border-[rgb(var(--border))] dark:bg-[rgb(var(--card))]"
              >
                {question}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <details className="mt-4 rounded-2xl border border-slate-200/80 bg-[color-mix(in_oklab,rgb(var(--card))_90%,rgb(var(--bg))_10%)] px-3 py-3 dark:border-[rgb(var(--border))] dark:bg-[rgb(var(--bg))]">
        <summary className="cursor-pointer text-sm font-semibold text-[rgb(var(--fg))]">Ast bearbeiten</summary>
        <div className="mt-3 flex flex-wrap gap-2">
          {["Thema ändern", "Haltung ändern", "Ebene ändern", "Aussage ergänzen", "Abstimmungsfrage bearbeiten"].map((label) => (
            <button
              key={`${props.branch.id}-${label}`}
              type="button"
              className="rounded-full border border-[rgb(var(--border))] px-2.5 py-1 text-xs text-[rgb(var(--fg))] hover:border-cyan-300/60"
              onClick={() => props.onEdit(`${props.branch.title}: ${label}`)}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-[rgb(var(--muted))]">Änderungsvorschläge werden zur Prüfung vorbereitet.</p>
      </details>
      <details className="mt-3 rounded-2xl border border-slate-200/80 bg-[color-mix(in_oklab,rgb(var(--card))_90%,rgb(var(--bg))_10%)] px-3 py-3 dark:border-[rgb(var(--border))] dark:bg-[rgb(var(--bg))]">
        <summary className="cursor-pointer text-sm font-semibold text-[rgb(var(--fg))]">Weitere Details zum Ast</summary>
        <div className="mt-3 space-y-3">
          {visibleTopicTags.length ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--muted))]">Einordnung im Themenkatalog</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {visibleTopicTags.map((topic) => (
                  <span
                    key={`${props.branch.id}-topic-${topic}`}
                    className={`rounded-full border px-2.5 py-1 text-xs ${resolveNodeTone("topic")}`}
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--muted))]">Themenfelder im Ast</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {props.branch.topics.map((topic) => (
                <span
                  key={`${props.branch.id}-field-${topic}`}
                  className="rounded-full border border-[rgb(var(--border))] px-2.5 py-1 text-xs text-[rgb(var(--muted))]"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--muted))]">Mögliche Aussagen</p>
            <ul className="mt-2 space-y-1.5 text-sm text-[rgb(var(--fg))]">
              {props.branch.claims.map((claim) => (
                <li key={`${props.branch.id}-claim-${claim}`}>{claim}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--muted))]">Offene Prüfpunkte</p>
            <ul className="mt-2 space-y-1.5 text-sm text-[rgb(var(--muted))]">
              {props.branch.openReviewPoints.map((point) => (
                <li key={`${props.branch.id}-review-${point}`}>{point}</li>
              ))}
            </ul>
          </div>
          {props.branch.overflowTopics?.length ? (
            <details className="rounded-lg border border-[rgb(var(--border))] bg-[color-mix(in_oklab,rgb(var(--card))_92%,rgb(var(--bg))_8%)] px-3 py-2 dark:bg-[rgb(var(--card))]">
              <summary className="cursor-pointer text-xs font-semibold text-[rgb(var(--muted))]">
                + weitere Themen
              </summary>
              <div className="mt-2 flex flex-wrap gap-2">
                {props.branch.overflowTopics.map((topic) => (
                  <span
                    key={`${props.branch.id}-overflow-${topic}`}
                    className="rounded-full border border-[rgb(var(--border))] px-2 py-1 text-xs text-[rgb(var(--muted))]"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </details>
          ) : null}
        </div>
      </details>
    </article>
  );
}

function StructureBranchList(props: {
  branches: CreateStructureBranch[];
  onEdit: (focus: string) => void;
  resetKey: string;
}) {
  const [activeBranchId, setActiveBranchId] = React.useState<string | null>(props.branches[0]?.id ?? null);
  const branchTabRefs = React.useRef<Record<string, React.ElementRef<"button"> | null>>({});

  React.useEffect(() => {
    if (!props.branches.some((branch) => branch.id === activeBranchId)) {
      setActiveBranchId(props.branches[0]?.id ?? null);
    }
  }, [activeBranchId, props.branches]);

  React.useEffect(() => {
    setActiveBranchId(props.branches[0]?.id ?? null);
  }, [props.branches, props.resetKey]);

  const handleBranchTabKeyDown = React.useCallback(
    (event: React.KeyboardEvent<React.ElementRef<"button">>, branchId: string) => {
      const currentIndex = props.branches.findIndex((branch) => branch.id === branchId);
      const nextIndex = resolveNextIndexFromKey(currentIndex, event.key, props.branches.length);
      if (nextIndex === null) return;
      event.preventDefault();
      const nextBranch = props.branches[nextIndex];
      if (!nextBranch) return;
      setActiveBranchId(nextBranch.id);
      window.requestAnimationFrame(() => {
        branchTabRefs.current[nextBranch.id]?.focus();
      });
    },
    [props.branches],
  );

  if (props.branches.length === 0) return null;
  const activeBranch =
    props.branches.find((branch) => branch.id === activeBranchId) ?? props.branches[0] ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--muted))]">Strukturäste</p>
        <p className="text-xs text-[rgb(var(--muted))]">Ein Ast im Detail, die anderen als Auswahl</p>
      </div>
      <div
        data-focus-card-rail
        className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
        role="tablist"
        aria-label="Fokusbereiche der Struktur"
      >
        {props.branches.map((branch) => (
          <button
            key={branch.id}
            data-focus-card-branch-selector
            type="button"
            ref={(node) => {
              branchTabRefs.current[branch.id] = node;
            }}
            onClick={() => setActiveBranchId(branch.id)}
            onKeyDown={(event) => handleBranchTabKeyDown(event, branch.id)}
            role="tab"
            id={`create-branch-tab-${branch.id}`}
            aria-selected={activeBranch?.id === branch.id}
            aria-controls={`create-branch-panel-${branch.id}`}
            tabIndex={activeBranch?.id === branch.id ? 0 : -1}
            className={`w-full rounded-[24px] border px-3 py-3 text-left transition-all duration-300 ease-out ${
              activeBranch?.id === branch.id
                ? "border-cyan-400/70 bg-cyan-500/[0.08] shadow-[0_18px_40px_rgba(8,145,178,0.12)] dark:border-cyan-300/45 dark:bg-cyan-500/12"
                : "border-slate-200/80 bg-[color-mix(in_oklab,rgb(var(--card))_92%,rgb(var(--bg))_8%)] dark:border-[rgb(var(--border))] dark:bg-[rgb(var(--card))]"
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-300/60 bg-cyan-500/[0.06] dark:border-cyan-300/30 dark:bg-cyan-500/10">
                <FocusAreaIcon area="branch" active={activeBranch?.id === branch.id} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-[rgb(var(--muted))]">Focus Card</p>
                  <span className="rounded-full border border-slate-200/80 px-2 py-1 text-[11px] font-semibold text-[rgb(var(--muted))] dark:border-[rgb(var(--border))]">
                    {Math.max(1, branch.topicTags.length)} Schwerpunkte
                  </span>
                </div>
                <p className="mt-2 break-words text-lg font-semibold leading-snug text-[rgb(var(--fg))]">{branch.title}</p>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[rgb(var(--muted))]">{branch.need}</p>
                <div className="mt-3 flex items-center gap-2 text-[11px] text-[rgb(var(--muted))]">
                  <span>{branch.voteQuestions.length} Fragen</span>
                  <span>·</span>
                  <span>{branch.openReviewPoints.length} Prüfpunkte</span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
      {props.branches.map((branch) => {
        const isActive = activeBranch?.id === branch.id;
        return (
          <div
            key={branch.id}
            className="pt-1"
            role="tabpanel"
            id={`create-branch-panel-${branch.id}`}
            aria-labelledby={`create-branch-tab-${branch.id}`}
            hidden={!isActive}
          >
            <StructureBranchCard branch={branch} onEdit={props.onEdit} />
          </div>
        );
      })}
    </div>
  );
}

function CreateStructureOverviewCard(props: {
  title: string;
  description: string;
  pillLabel: string;
  unreadLabel?: string;
  area: "priorities" | "clusters" | "questions" | "next_steps";
  onClick?: () => void;
}) {
  const content = (
    <div data-mobile-structure-card className="flex items-start gap-4">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.2rem] border border-cyan-300/45 bg-cyan-500/[0.06] text-cyan-900 dark:border-cyan-300/20 dark:bg-cyan-500/10 dark:text-cyan-100">
        <FocusAreaIcon area={props.area} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[1.02rem] font-semibold tracking-[-0.01em] text-[rgb(var(--fg))]">{props.title}</p>
        <p className="mt-1.5 text-[15px] leading-relaxed text-[rgb(var(--muted))]">{props.description}</p>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-[rgb(var(--muted))]">
          <span>{props.pillLabel}</span>
          {props.unreadLabel ? <span aria-hidden="true">•</span> : null}
          {props.unreadLabel ? <span>{props.unreadLabel}</span> : null}
        </div>
      </div>
      {props.onClick ? (
        <span className="pt-1 text-[1.05rem] text-[rgb(var(--muted))]" aria-hidden="true">
          →
        </span>
      ) : null}
    </div>
  );

  const className =
    "flex min-h-[6.5rem] items-start rounded-[1.55rem] border border-[rgb(var(--border))] bg-[color-mix(in_oklab,rgb(var(--card))_86%,rgb(var(--bg))_14%)] px-4 py-4";

  if (!props.onClick) {
    return <article className={className}>{content}</article>;
  }

  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`${className} text-left transition hover:border-cyan-300/45 hover:text-[rgb(var(--fg))]`}
    >
      {content}
    </button>
  );
}

export function CreateStructureOverview(props: CreateStructureOverviewProps) {
  const isEnglish = props.locale === "en";
  const openLabel = isEnglish ? "open" : "offen";
  const nextStepDescription = props.nextStepLabel?.trim() || (isEnglish ? "Review the contribution" : "Beitrag prüfen");
  return (
    <section data-mobile-structure-overview className="space-y-3 px-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[1rem] font-semibold text-[rgb(var(--fg))] md:text-[1.05rem]">
          {isEnglish ? "Your structure at a glance" : CREATE_VISUAL_FOLLOWUP_COPY.overviewTitle}
        </p>
        <p className="text-[15px] leading-relaxed text-[rgb(var(--muted))]">
          {isEnglish
            ? "Compact first, details only on demand."
            : "Kompakt zuerst, Details bei Bedarf."}
        </p>
      </div>
      <div data-structure-overview-grid className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <CreateStructureOverviewCard
          area="priorities"
          title={isEnglish ? "Priorities" : "Prioritäten"}
          description={isEnglish ? "What matters most?" : "Was zählt zuerst?"}
          pillLabel={props.prioritiesCount > 0 ? String(props.prioritiesCount) : isEnglish ? "Open" : "Offen"}
          unreadLabel={
            props.prioritiesCount > 0 ? (isEnglish ? "new" : "neu") : props.showOpenLabels ? openLabel : undefined
          }
          onClick={props.onOpenSection ? () => props.onOpenSection?.("priorities") : undefined}
        />
        <CreateStructureOverviewCard
          area="clusters"
          title={isEnglish ? "Topics" : "Themen"}
          description={isEnglish ? "Recognized clusters" : "Erkannte Schwerpunkte"}
          pillLabel={props.clustersCount > 0 ? String(props.clustersCount) : isEnglish ? "Open" : "Offen"}
          unreadLabel={props.clustersCount > 0 ? (isEnglish ? "new" : "neu") : props.showOpenLabels ? openLabel : undefined}
          onClick={props.onOpenSection ? () => props.onOpenSection?.("clusters") : undefined}
        />
        <CreateStructureOverviewCard
          area="questions"
          title={isEnglish ? "Questions" : "Fragen"}
          description={isEnglish ? "Open questions" : "Offene Fragen"}
          pillLabel={props.questionsCount > 0 ? String(props.questionsCount) : isEnglish ? "Open" : "Offen"}
          unreadLabel={props.questionsCount > 0 ? (isEnglish ? "new" : "neu") : props.showOpenLabels ? openLabel : undefined}
          onClick={props.onOpenSection ? () => props.onOpenSection?.("questions") : undefined}
        />
        <CreateStructureOverviewCard
          area="next_steps"
          title={isEnglish ? "Next step" : "Nächster Schritt"}
          description={nextStepDescription}
          pillLabel={
            props.nextStepsCount > 0
              ? isEnglish
                ? "Now"
                : "Jetzt"
              : isEnglish
                ? "Open"
                : "Offen"
          }
          unreadLabel={props.nextStepsCount > 0 ? (isEnglish ? "new" : "neu") : props.showOpenLabels ? openLabel : undefined}
          onClick={props.onOpenSection ? () => props.onOpenSection?.("next_steps") : undefined}
        />
      </div>
    </section>
  );
}

function InlineStructureSummary(props: {
  visibleTopicCount: number;
  hiddenTopicCount: number;
  nextStepLabel: string;
  modeLabel?: string;
}) {
  const hiddenTopicLabel =
    props.hiddenTopicCount === 1
      ? "+1 weiteres Thema"
      : `+${props.hiddenTopicCount} weitere Themen`;
  const visibleTopicLabel =
    props.visibleTopicCount === 1
      ? "1 Thema sichtbar"
      : `${props.visibleTopicCount} Themen sichtbar`;

  return (
    <section data-create-inline-structure-summary data-create-structure-rail className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[1rem] font-semibold text-[rgb(var(--fg))]">Deine Struktur</p>
        <span className="rounded-full border border-[rgb(var(--border))] px-3 py-1 text-[12px] font-medium text-[rgb(var(--muted))]">
          {props.modeLabel ?? "kompakt"}
        </span>
      </div>
      <div className="flex flex-wrap gap-2.5">
        <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2 text-[13px] text-[rgb(var(--fg))]">
          {visibleTopicLabel}
        </span>
        {props.hiddenTopicCount > 0 ? (
          <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2 text-[13px] text-[rgb(var(--fg))]">
            {hiddenTopicLabel}
          </span>
        ) : null}
        <span className="rounded-full border border-cyan-300/45 bg-cyan-500/[0.08] px-3 py-2 text-[13px] text-cyan-950 dark:text-cyan-100">
          Nächster Schritt: {props.nextStepLabel}
        </span>
      </div>
    </section>
  );
}

function resolveTopicExpansionCostLabel(
  access: NonNullable<CreateVisualFollowupProps["expandedTopicAccess"]> | undefined,
): string {
  if (!access) return "";
  if (access.costState === "uses_search_credit") {
    return "Die vollständige Quellenprüfung nutzt 1 Recherche-Kontingent.";
  }
  if (access.costState === "addon_required") {
    return "Für die vollständige Quellenprüfung ist ein Recherche-Kontingent erforderlich.";
  }
  return "";
}

function resolveDocumentTypeLead(type: DocumentAnalysisSummary["documentType"]): string {
  if (type === "party_program") return "Es handelt sich um ein Parteiprogramm.";
  if (type === "law") return "Es handelt sich um einen Gesetzestext oder Entwurf.";
  if (type === "study") return "Es handelt sich um eine Studie.";
  if (type === "report") return "Es handelt sich um einen Bericht.";
  if (type === "article") return "Es handelt sich um einen Artikel.";
  return "Es handelt sich um ein Dokument.";
}

function resolveDocumentAnalysisLabel(
  value:
    | DocumentAnalysisSummary["subjectDepth"]
    | DocumentAnalysisSummary["balanceAssessment"]
    | DocumentAnalysisSummary["sourceSpecificity"]
    | DocumentAnalysisSummary["sourceVerificationStatus"]
    | DocumentAnalysisSummary["counterpositionCoverage"],
): string {
  if (value === "low") return "niedrig";
  if (value === "medium") return "mittel";
  if (value === "high") return "hoch";
  if (value === "mixed") return "mittel bis hoch";
  if (value === "balanced") return "ausgewogen";
  if (value === "mostly_balanced") return "überwiegend ausgewogen";
  if (value === "programmatic") return "überwiegend programmatisch";
  if (value === "one_sided") return "überwiegend einseitig";
  if (value === "specific") return "spezifisch";
  if (value === "partly_specific") return "teilweise spezifisch";
  if (value === "mostly_unspecific") return "häufig ohne direkte Primärquelle";
  if (value === "none") return "keine direkten Quellenangaben";
  if (value === "not_started") return "noch nicht erfolgt";
  if (value === "prepared") return "vorbereitet";
  if (value === "in_review") return "in Prüfung";
  if (value === "completed") return "abgeschlossen";
  if (value === "strong") return "stark vertreten";
  if (value === "partial") return "teilweise enthalten";
  if (value === "weak") return "schwach vertreten";
  return "unklar";
}

function formatDocumentMetric(value: number, singular: string, plural: string): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

function DocumentAnalysisBubble(props: {
  analysis: DocumentAnalysisSummary;
  onOpenTopics?: () => void;
}) {
  const analysis = normalizeDocumentAnalysisSummary(props.analysis);
  const metrics = [
    analysis.pageCount !== null
      ? formatDocumentMetric(analysis.pageCount, "Seite", "Seiten")
      : null,
    formatDocumentMetric(analysis.topicCount, "Thema", "Themen"),
    formatDocumentMetric(analysis.subtopicCount, "Unterthema", "Unterthemen"),
  ].filter(Boolean) as string[];

  return (
    <div className="create-chat-message flex gap-3">
      <div className="mt-1 shrink-0">
        <VoxyAvatar appearance="inline" variant="presenting" />
      </div>
      <div className="w-full max-w-[78%] min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[12px] font-semibold text-[rgb(var(--muted))]">
            Dokument eingeordnet
          </p>
          <p className="text-[13px] font-semibold text-slate-700 dark:text-[rgb(var(--muted))]">
            Voxy
          </p>
        </div>
        <div className="mt-2 rounded-[1.9rem] rounded-tl-sm border border-cyan-500/18 bg-[color-mix(in_oklab,rgb(var(--card))_95%,rgb(var(--bg))_5%)] px-5 py-5 shadow-[0_22px_52px_rgba(2,6,23,0.06)] md:px-7 md:py-6 dark:border-cyan-300/20 dark:bg-[color-mix(in_oklab,rgb(var(--card))_95%,rgb(var(--bg))_5%)] dark:shadow-none">
          <p className="text-[14px] font-medium text-cyan-900 dark:text-cyan-200">Dokument erkannt</p>
          <p className="mt-1.5 text-[1.35rem] font-semibold tracking-[-0.01em] text-cyan-950 md:text-[1.6rem] dark:text-cyan-50">
            {analysis.documentTitle?.trim() || "Dokument"}
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-cyan-950 md:text-base dark:text-cyan-100">
            {resolveDocumentTypeLead(analysis.documentType)}
          </p>
          {metrics.length > 0 ? (
            <p className="mt-2 text-[15px] leading-relaxed text-cyan-900/85 md:text-base dark:text-cyan-100/85">
              {metrics.join(" · ")}
            </p>
          ) : null}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[24px] border border-cyan-200/45 bg-cyan-500/[0.07] px-4 py-4 dark:border-cyan-300/25 dark:bg-cyan-500/12">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-800 dark:text-cyan-200">Erkannt wurden</p>
              <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-cyan-950 dark:text-cyan-50">
                <li>{formatDocumentMetric(analysis.topicCount, "Themenbereich", "Themenbereiche")}</li>
                <li>{formatDocumentMetric(analysis.subtopicCount, "Unterthema", "Unterthemen")}</li>
                <li>{formatDocumentMetric(analysis.keyStatementCount, "Kernaussage", "Kernaussagen")}</li>
                <li>{formatDocumentMetric(analysis.verifiableClaimCount, "überprüfbare Tatsachenbehauptung", "überprüfbare Tatsachenbehauptungen")}</li>
                <li>{formatDocumentMetric(analysis.policyProposalCount, "politisches Vorhaben", "politische Vorhaben")}</li>
              </ul>
            </div>
            <div className="rounded-[24px] border border-slate-200/40 bg-[color-mix(in_oklab,rgb(var(--card))_90%,rgb(var(--bg))_10%)] px-4 py-4 dark:border-white/10 dark:bg-[rgb(var(--card))]/70">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-800 dark:text-cyan-200">Kurz eingeordnet</p>
              <dl className="mt-3 space-y-1.5 text-sm leading-relaxed text-cyan-950 dark:text-cyan-50">
                <div className="flex items-start justify-between gap-3">
                  <dt>Fachliche Tiefe</dt>
                  <dd className="text-right">{resolveDocumentAnalysisLabel(analysis.subjectDepth)}</dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt>Ausgewogenheit</dt>
                  <dd className="text-right">{resolveDocumentAnalysisLabel(analysis.balanceAssessment)}</dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt>Quellenangaben</dt>
                  <dd className="text-right">{resolveDocumentAnalysisLabel(analysis.sourceSpecificity)}</dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt>Gegenpositionen</dt>
                  <dd className="text-right">{resolveDocumentAnalysisLabel(analysis.counterpositionCoverage)}</dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt>Quellenprüfung</dt>
                  <dd className="text-right">{resolveDocumentAnalysisLabel(analysis.sourceVerificationStatus)}</dd>
                </div>
              </dl>
            </div>
          </div>
          <div className="mt-5 rounded-[24px] border border-slate-200/40 bg-[color-mix(in_oklab,rgb(var(--card))_90%,rgb(var(--bg))_10%)] px-4 py-4 dark:border-white/10 dark:bg-[rgb(var(--card))]/70">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-800 dark:text-cyan-200">Kurzfassung</p>
            <p className="mt-3 text-[15px] leading-relaxed text-cyan-950 dark:text-cyan-50">
              {analysis.summary}
            </p>
          </div>
          {props.onOpenTopics ? (
            <div className="mt-5">
              <button
                type="button"
                className="btn-primary min-h-[42px] px-4 py-2 text-sm"
                onClick={props.onOpenTopics}
              >
                Themenübersicht öffnen
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AnalysisStateBubble(props: {
  state: NonNullable<CreateIntelligentFollowupResult["meta"]>["analysis"]["state"];
  message: string;
  onPrimaryAction?: () => void;
  onSaveOnly?: () => void;
  onDeferWork?: () => void;
  locale: CreateVoxyLocale;
  supportHandoff?: CreateSupportHandoffPublic | null;
  statusRef?: React.Ref<React.ElementRef<"div">>;
}) {
  const analysisFailed =
    props.state === "fetch_failed" || props.state === "ai_failed";
  const copy = getCreateVoxyCopy(props.locale, null);
  const failureCopy = buildCreateSupportFailureCopy({
    locale: props.locale,
    handoff: props.supportHandoff ?? null,
  });
  const safeFailureStateMessage = (() => {
    const normalizedMessage = props.message.trim();
    if (!normalizedMessage) return null;
    const isApprovedProductMessage =
      props.locale === "en"
        ? /^(The AI analysis could not be completed\.|No topics were derived\.|The linked content could not be loaded completely\.|The content was loaded but could not yet be analyzed by the AI orchestrator\.)/i.test(
            normalizedMessage,
          )
        : /^(Die KI-Analyse konnte (?:nicht abgeschlossen|noch nicht durchgeführt) werden\.|Keine Themen wurden abgeleitet\.|Der (?:verlinkte Inhalt|Linkinhalt) konnte nicht vollständig geladen werden\.|Der Inhalt wurde geladen, konnte aber noch nicht durch das KI-Orchester analysiert werden\.)/i.test(
            normalizedMessage,
          );
    return isApprovedProductMessage ? props.message : null;
  })();
  const primaryLabel =
    props.state === "link_detected"
      ? props.locale === "en"
        ? "Analyze link"
        : "Link analysieren"
      : props.state === "entitlement_required"
        ? props.locale === "en"
          ? "Start analysis"
          : "Analyse starten"
        : analysisFailed
          ? copy.retry
          : null;
  return (
    <div
      ref={props.statusRef}
      className="create-chat-message flex min-w-0 gap-3 rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"
      role={
        analysisFailed && props.supportHandoff?.status === "created"
          ? "status"
          : analysisFailed
            ? "alert"
            : "status"
      }
      aria-live={
        analysisFailed && props.supportHandoff?.status !== "created"
          ? undefined
          : "polite"
      }
      aria-atomic="true"
      tabIndex={-1}
    >
      <div className="mt-1 shrink-0">
        <VoxyAvatar appearance="inline" variant="presenting" />
      </div>
      <div className="w-full min-w-0 max-w-full flex-1 sm:max-w-[78%]">
        <p className="text-[13px] font-semibold text-slate-700 dark:text-[rgb(var(--muted))]">Voxy</p>
        <div className="mt-2 rounded-[1.6rem] rounded-tl-sm border border-[rgb(var(--border))] bg-[color-mix(in_oklab,rgb(var(--card))_94%,rgb(var(--bg))_6%)] px-5 py-5 md:px-6 dark:bg-[color-mix(in_oklab,rgb(var(--card))_95%,rgb(var(--bg))_5%)]">
          <p className="text-[14px] font-medium text-cyan-900 dark:text-cyan-200">
            {props.state === "link_detected" || props.state === "entitlement_required"
              ? props.locale === "en"
                ? "Link detected"
                : "Link erkannt"
              : analysisFailed
                ? failureCopy.title
                : props.locale === "en"
                  ? "Analysis not yet complete"
                  : "Analyse noch nicht abgeschlossen"}
          </p>
          {analysisFailed ? (
            <div className="mt-3 space-y-2 break-words text-[15px] leading-relaxed text-cyan-950 [overflow-wrap:anywhere] md:text-base dark:text-cyan-100">
              {failureCopy.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {safeFailureStateMessage &&
              !failureCopy.paragraphs.some(
                (paragraph) =>
                  paragraph === safeFailureStateMessage ||
                  paragraph.includes(safeFailureStateMessage) ||
                  safeFailureStateMessage.includes(paragraph),
              ) ? (
                <p>{safeFailureStateMessage}</p>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 break-words text-[15px] leading-relaxed text-cyan-950 [overflow-wrap:anywhere] md:text-base dark:text-cyan-100">
              {props.message}
            </p>
          )}
          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
            {primaryLabel && props.onPrimaryAction ? (
              <button
                type="button"
                className="btn-primary min-h-[42px] w-full px-4 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-auto"
                onClick={props.onPrimaryAction}
              >
                {primaryLabel}
              </button>
            ) : null}
            {failureCopy.ticketHref ? (
              <a
                className="btn-secondary min-h-[40px] w-full break-words px-3 py-2 text-sm [overflow-wrap:anywhere] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-auto"
                href={failureCopy.ticketHref}
              >
                {copy.viewTicket}
              </a>
            ) : null}
            {props.onSaveOnly && !analysisFailed ? (
              <button
                type="button"
                className="btn-secondary min-h-[40px] w-full px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-auto"
                onClick={props.onSaveOnly}
              >
                {props.locale === "en" ? "Save input" : "Eingabe speichern"}
              </button>
            ) : null}
            {props.onDeferWork ? (
              <button
                type="button"
                className="btn-secondary min-h-[40px] w-full px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-auto"
                onClick={props.onDeferWork}
              >
                {copy.continueLater}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function TopicExpansionPrompt(props: {
  showLinkReviewPrompt: boolean;
  totalTopicCount: number;
  totalSubtopicCount: number;
  visibleTopicCount: number;
  overflowCount: number;
  costLabel: string;
  onExpandTopicPreview?: () => void;
  onKeepCompactTopicPreview?: () => void;
  onDeferExpandedReview?: () => void;
  onPrepareLinkReview?: () => void;
}) {
  const expandButtonLabel = `Alle ${props.totalTopicCount} Themen anzeigen`;
  const overflowNotice =
    props.overflowCount === 1
      ? "Ein weiteres Thema wurde erkannt."
      : `${props.overflowCount} weitere Themen wurden erkannt.`;
  const intro =
    props.overflowCount > 0
      ? props.totalSubtopicCount > 0
        ? `Ich habe ${props.totalTopicCount} Themenbereiche und ${props.totalSubtopicCount} Unterthemen erkannt. ${props.visibleTopicCount === 4 ? "Vier" : props.visibleTopicCount} zeige ich dir als Einstieg.`
        : `Ich habe ${props.totalTopicCount} Themen erkannt. ${props.visibleTopicCount === 4 ? "Vier" : props.visibleTopicCount} zeige ich dir kompakt.`
      : "Link erkannt";

  return (
    <div className="create-chat-message flex gap-3">
      <div className="mt-1 shrink-0">
        <VoxyAvatar appearance="inline" variant="presenting" />
      </div>
      <div className="max-w-5xl min-w-0 flex-1 rounded-[24px] rounded-tl-sm border border-cyan-300/35 bg-cyan-500/[0.06] px-4 py-4 dark:border-cyan-300/20 dark:bg-cyan-500/[0.1]">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[12px] font-semibold text-cyan-900 dark:text-cyan-100">Deine Entscheidung</p>
          <p className="text-[13px] font-semibold text-cyan-900 dark:text-cyan-100">Voxy</p>
        </div>
        <p className="mt-2 text-base font-semibold text-cyan-950 dark:text-cyan-50">{intro}</p>
        {props.overflowCount > 0 ? (
          <p className="mt-2 text-sm leading-relaxed text-cyan-900 dark:text-cyan-100">
            {overflowNotice}
          </p>
        ) : null}
        {props.showLinkReviewPrompt ? (
          <p className="mt-2 text-sm leading-relaxed text-cyan-900 dark:text-cyan-100">
            Ich habe den Inhalt noch nicht vollständig geladen. Für eine belastbare Dokumentanalyse muss der Linkinhalt zuerst geprüft werden.
          </p>
        ) : null}
        {props.costLabel ? (
          <p className="mt-2 text-sm leading-relaxed text-cyan-900 dark:text-cyan-100">
            {props.costLabel}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2.5">
          {props.overflowCount > 0 ? (
            <button
              type="button"
              className="btn-primary min-h-[42px] px-4 py-2 text-sm"
              onClick={props.onExpandTopicPreview}
            >
              {expandButtonLabel}
            </button>
          ) : null}
          {props.overflowCount > 0 ? (
            <button
              type="button"
              className="btn-secondary min-h-[40px] px-3 py-2 text-sm"
              onClick={props.onKeepCompactTopicPreview}
            >
              {`Nur mit diesen ${props.visibleTopicCount} weiterarbeiten`}
            </button>
          ) : null}
          {props.showLinkReviewPrompt && !props.overflowCount ? (
            <button
              type="button"
              className="btn-primary min-h-[42px] px-4 py-2 text-sm"
              onClick={props.onPrepareLinkReview}
            >
              Dokument prüfen
            </button>
          ) : null}
          {props.overflowCount > 0 ? (
            <button
              type="button"
              className="btn-secondary min-h-[40px] px-3 py-2 text-sm"
              onClick={props.onDeferExpandedReview}
            >
              Später
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StructureOverviewRail(props: {
  cards: FocusOverviewCard[];
  activeCardId: FocusAreaId;
  onSelect: (id: FocusAreaId) => void;
}) {
  const overviewTabRefs = React.useRef<Record<FocusAreaId, React.ElementRef<"button"> | null>>({
    priorities: null,
    clusters: null,
    questions: null,
    sections: null,
    next_steps: null,
  });

  const handleOverviewTabKeyDown = React.useCallback(
    (event: React.KeyboardEvent<React.ElementRef<"button">>, cardId: FocusAreaId) => {
      const currentIndex = FOCUS_AREA_ORDER.indexOf(cardId);
      const nextIndex = resolveNextIndexFromKey(currentIndex, event.key, FOCUS_AREA_ORDER.length);
      if (nextIndex === null) return;
      event.preventDefault();
      const nextCardId = FOCUS_AREA_ORDER[nextIndex];
      props.onSelect(nextCardId);
      window.requestAnimationFrame(() => {
        overviewTabRefs.current[nextCardId]?.focus();
      });
    },
    [props],
  );

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--muted))]">
        {CREATE_VISUAL_FOLLOWUP_COPY.overviewTitle}
      </p>
      <div
        data-focus-card-overview
        className="grid gap-2 sm:grid-cols-2"
        role="tablist"
        aria-label="Überblick über den vorgeschlagenen Arbeitsstand"
      >
        {props.cards.map((card) => {
          const isActive = props.activeCardId === card.id;
          return (
            <button
              key={card.id}
              type="button"
              ref={(node) => {
                overviewTabRefs.current[card.id] = node;
              }}
              onClick={() => props.onSelect(card.id)}
              onKeyDown={(event) => handleOverviewTabKeyDown(event, card.id)}
              role="tab"
              id={`create-overview-tab-${card.id}`}
              aria-selected={isActive}
              aria-controls={`create-overview-panel-${card.id}`}
              tabIndex={isActive ? 0 : -1}
              className={`w-full rounded-[22px] border px-4 py-3 text-left transition-all duration-300 ease-out ${
                isActive
                  ? "border-cyan-400/70 bg-cyan-500/[0.08] shadow-[0_16px_36px_rgba(8,145,178,0.12)] dark:border-cyan-300/45 dark:bg-cyan-500/12"
                  : "border-slate-200/75 bg-[color-mix(in_oklab,rgb(var(--card))_92%,rgb(var(--bg))_8%)] dark:border-[rgb(var(--border))] dark:bg-[rgb(var(--card))]"
              }`}
            >
              <div className="flex flex-col gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full border border-cyan-300/60 bg-cyan-500/[0.06] dark:border-cyan-300/30 dark:bg-cyan-500/10">
                    <FocusAreaIcon area={card.id} active={isActive} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-[rgb(var(--fg))]">{card.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-[rgb(var(--muted))]">{card.lead}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full border border-slate-200/80 px-2 py-1 text-[11px] font-semibold text-[rgb(var(--muted))] dark:border-[rgb(var(--border))]">
                    {card.status}
                  </span>
                  <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M7 4.5 13 10l-6 5.5" />
                  </svg>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SummarySnapshotCard(props: {
  keyStatement: string;
  rootTopic: string;
  positionClusters: string[];
  topicLabels: string[];
  voteQuestionCount: number;
  sectionCount: number;
}) {
  return (
    <div className="rounded-[30px] border border-cyan-300/18 bg-[linear-gradient(180deg,rgba(8,20,46,0.92),rgba(13,25,49,0.96))] px-4 py-4 shadow-[0_20px_48px_rgba(2,6,23,0.28)] dark:border-cyan-300/16 dark:bg-[linear-gradient(180deg,rgba(8,20,46,0.92),rgba(13,25,49,0.96))]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200/80">Kurzfassung</p>
      <p className="mt-3 text-lg font-semibold leading-tight text-white">{props.keyStatement}</p>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">
        Der Arbeitsstand wird jetzt entlang eines Hauptthemas geführt und hält Nebensignale bewusst im Hintergrund.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className={`rounded-full border px-2.5 py-1 text-xs ${resolveNodeTone("topic")}`}>{props.rootTopic}</span>
        {props.positionClusters.slice(0, 2).map((cluster) => (
          <span key={`summary-cluster-${cluster}`} className={`rounded-full border px-2.5 py-1 text-xs ${resolveNodeTone("stance")}`}>
            {cluster}
          </span>
        ))}
      </div>
      <div className="mt-5 rounded-[24px] border border-white/8 bg-slate-950/20 px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">Signalbild</p>
          <div className="flex flex-wrap gap-2 text-[11px] text-slate-300">
            <span className="rounded-full border border-white/10 px-2 py-1">{props.voteQuestionCount} Fragen</span>
            <span className="rounded-full border border-white/10 px-2 py-1">{props.sectionCount} Abschnitte</span>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {props.topicLabels.slice(0, 4).map((label, index) => (
            <div key={`signal-${label}`} className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-xs text-slate-300">
                <span className="truncate">{label}</span>
                <span>{Math.max(1, 4 - index)}/4</span>
              </div>
              <div className="h-2 rounded-full bg-white/6">
                <div
                  className="h-2 rounded-full bg-[linear-gradient(90deg,rgba(34,211,238,0.95),rgba(45,212,191,0.75),rgba(168,85,247,0.7))] transition-all duration-500 ease-out"
                  style={{ width: `${88 - index * 18}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TopicBranchPreviewGrid(props: {
  rootTopic: string;
  branches: CreateStructureBranch[];
  totalTopicCount: number;
  sourceKind?: "contribution" | "document";
  activeTopicLabel?: string | null;
  selectedPrimaryTopic?: string | null;
  groupedTopicLabels?: string[];
  parkedTopicLabels?: string[];
  onFocusTopic?: (topicLabel: string) => void;
  onSelectPrimaryTopic?: (topicLabel: string) => void;
  onGroupTopics?: (topicLabels: string[]) => void;
  onSeparateTopics?: () => void;
  onParkTopic?: (topicLabel: string) => void;
}) {
  if (props.branches.length === 0) return null;
  const isDocumentSource = props.sourceKind === "document";
  const showsAllTopics = props.branches.length >= props.totalTopicCount;
  const hasSingleTopic = props.totalTopicCount === 1;
  const leadText = isDocumentSource
    ? `Die Analyse hat ${props.totalTopicCount} Themenbereiche erkannt. ${showsAllTopics ? `Alle ${props.totalTopicCount} Themen sind geöffnet.` : `${props.branches.length} von ${props.totalTopicCount} Themen sichtbar.`}`
    : hasSingleTopic
      ? `Aus „${props.rootTopic}“ erkenne ich ein gemeinsames Anliegen. Prüfe kurz, ob diese Einordnung passt.`
    : `Aus „${props.rootTopic}“ erkenne ich ${props.totalTopicCount} Themen. ${props.branches.length} davon sind gerade sichtbar. Prüfe kurz, ob diese Einordnung passt.`;

  return (
    <div data-create-topic-branches className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold text-[rgb(var(--muted))]">Voxys Einordnung</p>
          <p className="mt-1 text-[1.02rem] font-semibold text-[rgb(var(--fg))]">
            {isDocumentSource
              ? "Im Dokument erkannt"
              : hasSingleTopic
                ? "Erkanntes Anliegen"
                : "Erkannte Themen"}
          </p>
          <p className="mt-1 max-w-3xl text-[15px] leading-relaxed text-[rgb(var(--muted))]">
            {leadText}
          </p>
        </div>
        <span className="rounded-full border border-[rgb(var(--border))] px-3 py-1.5 text-[13px] font-medium text-[rgb(var(--muted))]">
          {isDocumentSource ? "im Dokument erkannt" : "aus deinem Beitrag erkannt"}
        </span>
      </div>
      <div
        data-create-topic-list-mobile
        className="space-y-2 md:hidden"
      >
        {props.branches.map((branch, index) => {
          const isActive = props.activeTopicLabel === branch.title;
          return (
            <div
              key={`mobile-${branch.id}`}
              className={`rounded-[1.25rem] border px-3.5 py-3 ${
                isActive
                  ? "border-cyan-400/70 bg-cyan-500/[0.1]"
                  : "border-cyan-200/40 bg-cyan-500/[0.04] dark:border-cyan-300/20"
              }`}
            >
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 text-left"
                onClick={() => props.onFocusTopic?.(branch.title)}
                aria-pressed={isActive}
              >
                <span className="text-[15px] font-semibold leading-snug text-[rgb(var(--fg))]">
                  {branch.title}
                </span>
                <span className="shrink-0 text-xs font-medium text-[rgb(var(--muted))]">
                  Thema {index + 1}
                </span>
              </button>
              <details className="mt-2 border-t border-[rgb(var(--border))] pt-2">
                <summary className="cursor-pointer text-xs font-medium text-[rgb(var(--muted))]">
                  Einordnung ansehen
                </summary>
                <p className="mt-2 text-[13px] leading-relaxed text-[rgb(var(--muted))]">
                  {branch.need || branch.claims[0] || "Dieses Thema bleibt als eigener Arbeitsstrang sichtbar."}
                </p>
              </details>
            </div>
          );
        })}
      </div>
      <div
        data-create-topic-grid
        data-grid-mobile-columns="1"
        data-grid-tablet-columns="2"
        data-grid-desktop-columns="3"
        className="hidden gap-3 md:grid md:grid-cols-2 lg:grid-cols-3"
      >
        {props.branches.map((branch, index) => (
          <article
            key={branch.id}
            data-create-topic-branch-card=""
            data-active-topic={props.activeTopicLabel === branch.title ? "true" : undefined}
            data-selected-primary-topic={props.selectedPrimaryTopic === branch.title ? "true" : undefined}
            data-grouped-topic={props.groupedTopicLabels?.includes(branch.title) ? "true" : undefined}
            data-parked-topic={props.parkedTopicLabels?.includes(branch.title) ? "true" : undefined}
            className={`rounded-[1.6rem] border px-4 py-4 shadow-[0_18px_40px_rgba(8,145,178,0.08)] dark:bg-[linear-gradient(180deg,rgba(10,29,52,0.94),rgba(12,24,45,0.98))] ${
              props.activeTopicLabel === branch.title || props.selectedPrimaryTopic === branch.title
                ? "border-cyan-400/75 bg-[linear-gradient(180deg,color-mix(in_oklab,rgb(var(--card))_74%,rgb(var(--grad-from))_26%),color-mix(in_oklab,rgb(var(--card))_90%,rgb(var(--bg))_10%))] ring-2 ring-cyan-300/35 dark:border-cyan-300/55"
                : props.groupedTopicLabels?.includes(branch.title)
                  ? "border-emerald-300/65 bg-[linear-gradient(180deg,color-mix(in_oklab,rgb(var(--card))_82%,rgb(var(--grad-from))_18%),color-mix(in_oklab,rgb(var(--card))_94%,rgb(var(--bg))_6%))] dark:border-emerald-300/35"
                : props.parkedTopicLabels?.includes(branch.title)
                  ? "border-amber-300/65 bg-[linear-gradient(180deg,color-mix(in_oklab,rgb(var(--card))_82%,rgb(var(--grad-from))_18%),color-mix(in_oklab,rgb(var(--card))_94%,rgb(var(--bg))_6%))] dark:border-amber-300/35"
                : "border-cyan-200/45 bg-[linear-gradient(180deg,color-mix(in_oklab,rgb(var(--card))_86%,rgb(var(--grad-from))_14%),color-mix(in_oklab,rgb(var(--card))_94%,rgb(var(--bg))_6%))] dark:border-cyan-300/20"
            }`}
          >
            {(() => {
              const referencePoints = dedupeLabelsCaseInsensitive(
                isDocumentSource ? branch.topicTags : [...branch.openReviewPoints, ...branch.topicTags],
              ).slice(0, 4);
              const isSelected = props.selectedPrimaryTopic === branch.title;
              const isActive = props.activeTopicLabel === branch.title;
              const isGrouped = props.groupedTopicLabels?.includes(branch.title) ?? false;
              const isParked = props.parkedTopicLabels?.includes(branch.title) ?? false;
              const visibleMetrics = dedupeLabelsCaseInsensitive(branch.subtopics).slice(0, 2);
              const recommendedAction = isSelected
                ? "Dieses Thema ist bestätigt und bleibt gerade dein Fokus."
                : isActive
                  ? "Dieses Thema ist geöffnet. Darunter siehst du Aussagen, Fragen und den nächsten Schritt."
                  : isGrouped
                    ? "Dieses Thema wird gemeinsam mit den anderen sichtbaren Themen weitergeführt."
                : isParked
                  ? "Dieser Zweig bleibt sichtbar geparkt, bis du ihn wieder aufgreifen willst."
                  : "Klicke auf die Karte, wenn du diesen Themenstamm direkt im Chat fokussieren willst.";
              return (
                <>
                  <div className="flex flex-wrap items-center gap-2 text-[13px] text-cyan-900 dark:text-cyan-100">
                    <span className="rounded-full border border-[rgb(var(--border))] px-3 py-1 text-[rgb(var(--muted))]">
                      Thema {index + 1}
                    </span>
                    {isGrouped ? (
                      <span className="rounded-full border border-emerald-300/50 px-3 py-1 text-emerald-900 dark:text-emerald-100">
                        Gemeinsam
                      </span>
                    ) : null}
                    {isParked ? (
                      <span className="rounded-full border border-amber-300/50 px-3 py-1 text-amber-900 dark:text-amber-100">
                        Geparkt
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="mt-3 w-full text-left"
                    onClick={() => props.onFocusTopic?.(branch.title)}
                    aria-pressed={isActive}
                    aria-label={`Thema ${branch.title} fokussieren`}
                  >
                    <p className="text-[1.15rem] font-semibold leading-snug tracking-[-0.01em] text-[rgb(var(--fg))]">{branch.title}</p>
                    <p className="mt-2.5 text-[15px] leading-relaxed text-[rgb(var(--muted))]">
                      {branch.need || branch.claims[0] || "Dieses Thema bleibt als eigenständiger Arbeitsstrang sichtbar."}
                    </p>
                  </button>
                  <details className="mt-3 border-t border-[rgb(var(--border))] pt-3">
                    <summary className="cursor-pointer text-sm font-medium text-[rgb(var(--muted))]">
                      Details zum Thema
                    </summary>
                    <div className="mt-3 space-y-3">
                      {referencePoints.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-[rgb(var(--fg))]">Bezugspunkte</p>
                          <div className="flex flex-wrap gap-2">
                            {referencePoints.map((topic) => (
                              <span
                                key={`${branch.id}-${topic}`}
                                className={`rounded-full border px-3 py-1.5 text-[13px] ${resolveNodeTone("topic")}`}
                              >
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      <p className="text-[14px] leading-relaxed text-[rgb(var(--muted))]">{recommendedAction}</p>
                      <p className="text-xs text-[rgb(var(--muted))]">
                        {visibleMetrics.length > 0
                          ? visibleMetrics.join(" · ")
                          : `${branch.evidenceSnippets.length} Belegstellen`}
                      </p>
                      <button
                        type="button"
                        className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-[rgb(var(--border))] px-4 py-1.5 text-sm font-semibold text-[rgb(var(--muted))] transition hover:border-cyan-300/55 hover:text-[rgb(var(--fg))]"
                        onClick={() => props.onParkTopic?.(branch.title)}
                        aria-pressed={isParked}
                        aria-label={`Thema ${branch.title} als Zweig parken`}
                      >
                        {isParked ? "Als Zweig geparkt" : "Thema parken"}
                      </button>
                    </div>
                  </details>
                </>
              );
            })()}
          </article>
        ))}
      </div>
    </div>
  );
}

function TopicFocusPanel(props: {
  activeBranch: CreateStructureBranch;
  activeTopicIndex: number;
  onConfirm: () => void;
  onOpenManualTopicChooser: () => void;
  onParkTopic?: (topicLabel: string) => void;
}) {
  const focusQuestions = props.activeBranch.openReviewPoints.slice(0, 3);
  const focusClaims = props.activeBranch.claims.slice(0, 2);

  return (
    <div className="create-chat-message flex gap-3">
      <div className="mt-1 shrink-0">
        <VoxyAvatar appearance="inline" variant="presenting" />
      </div>
      <div className="max-w-5xl min-w-0 flex-1 rounded-[24px] rounded-tl-sm border border-cyan-300/35 bg-cyan-500/[0.06] px-4 py-4 dark:border-cyan-300/20 dark:bg-cyan-500/[0.1]">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[12px] font-semibold text-cyan-900 dark:text-cyan-100">Deine Entscheidung</p>
          <p className="text-[13px] font-semibold text-cyan-900 dark:text-cyan-100">Voxy</p>
        </div>
        <p className="mt-2 text-base font-semibold text-cyan-950 dark:text-cyan-50">
          Du schaust Thema {props.activeTopicIndex + 1}: {props.activeBranch.title}.
        </p>
        {focusClaims.length > 0 ? (
          <div className="mt-3 space-y-2">
            <p className="text-sm font-medium text-cyan-950 dark:text-cyan-50">Erkannte Aussagen</p>
            <ul className="space-y-2 text-sm leading-relaxed text-cyan-950 dark:text-cyan-100">
              {focusClaims.map((claim) => (
                <li key={`${props.activeBranch.id}-${claim}`} className="rounded-2xl border border-cyan-300/20 bg-white/60 px-3 py-2 dark:bg-slate-950/20">
                  {claim}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {focusQuestions.length > 0 ? (
          <div className="mt-3 space-y-2">
            <p className="text-sm font-medium text-cyan-950 dark:text-cyan-50">Offene Fragen</p>
            <ul className="space-y-2 text-sm leading-relaxed text-cyan-950 dark:text-cyan-100">
              {focusQuestions.map((question) => (
                <li key={`${props.activeBranch.id}-${question}`} className="rounded-2xl border border-cyan-300/20 bg-white/60 px-3 py-2 dark:bg-slate-950/20">
                  {question}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="mt-3 space-y-2">
          <p className="text-sm font-medium text-cyan-950 dark:text-cyan-50">Mögliche nächste Aktion</p>
          <p className="text-sm leading-relaxed text-cyan-900 dark:text-cyan-100">
            Bestätige dieses Thema oder ändere die Themenstruktur, bevor der nächste Arbeitsschritt freigeschaltet wird.
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2.5">
          <button type="button" className="btn-primary min-h-[44px] px-4 py-2 text-sm" onClick={props.onConfirm}>
            Themenstruktur bestätigen
          </button>
          <button type="button" className="btn-secondary min-h-[40px] px-3 py-2 text-sm" onClick={props.onOpenManualTopicChooser}>
            Themen ändern
          </button>
          <button
            type="button"
            className="btn-secondary min-h-[40px] px-3 py-2 text-sm"
            onClick={() => props.onParkTopic?.(props.activeBranch.title)}
          >
            Thema parken
          </button>
        </div>
      </div>
    </div>
  );
}

function OpenQuestionCards(props: { questions: string[] }) {
  if (props.questions.length === 0) return null;
  return (
    <div className="space-y-3">
      <p className="text-[1.02rem] font-semibold text-[rgb(var(--fg))]">Offene Fragen</p>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {props.questions.slice(0, 5).map((question) => (
          <article
            key={question}
            className="rounded-[1.35rem] border border-slate-200/75 bg-[color-mix(in_oklab,rgb(var(--card))_93%,rgb(var(--bg))_7%)] px-4 py-4 text-[15px] leading-relaxed text-[rgb(var(--fg))] dark:border-[rgb(var(--border))] dark:bg-[rgb(var(--card))]"
          >
            {question}
          </article>
        ))}
      </div>
    </div>
  );
}

function SourceHintsAndNextStepsGrid(props: {
  modules: CreateFollowupContentModule[];
  nextStepTitles: string[];
}) {
  const sourceHints = props.modules
    .filter((module) => module.tone === "source" || module.tone === "context" || module.tone === "stats")
    .slice(0, 3);
  const nextSteps = props.nextStepTitles.slice(0, 4);

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="rounded-[1.45rem] border border-slate-200/75 bg-[rgb(var(--bg))] px-4 py-4 dark:border-[rgb(var(--border))]">
        <p className="text-[1.02rem] font-semibold text-[rgb(var(--fg))]">Quellen & Hinweise</p>
        <div className="mt-3 space-y-3">
          {sourceHints.length > 0 ? (
            sourceHints.map((module) => (
              <article
                key={module.id}
                className="rounded-[1.1rem] bg-[color-mix(in_oklab,rgb(var(--card))_93%,rgb(var(--bg))_7%)] px-3.5 py-3 dark:bg-[rgb(var(--card))]"
              >
                <p className="text-[15px] font-semibold text-[rgb(var(--fg))]">{module.title}</p>
                <p className="mt-1 text-[14px] leading-relaxed text-[rgb(var(--muted))]">{module.lead}</p>
              </article>
            ))
          ) : (
            <p className="text-[15px] leading-relaxed text-[rgb(var(--muted))]">
              Zusätzliche Quellen bleiben optional und werden erst nach deiner Auswahl ergänzt.
            </p>
          )}
        </div>
      </div>
      <div className="rounded-[1.45rem] border border-slate-200/75 bg-[rgb(var(--bg))] px-4 py-4 dark:border-[rgb(var(--border))]">
        <p className="text-[1.02rem] font-semibold text-[rgb(var(--fg))]">Vorgeschlagene nächste Schritte</p>
        <ol className="mt-3 space-y-3">
          {nextSteps.length > 0 ? (
            nextSteps.map((step, index) => (
              <li
                key={`${step}-${index}`}
                className="rounded-[1.1rem] bg-[color-mix(in_oklab,rgb(var(--card))_93%,rgb(var(--bg))_7%)] px-3.5 py-3 text-[15px] leading-relaxed text-[rgb(var(--fg))] dark:bg-[rgb(var(--card))]"
              >
                {step}
              </li>
            ))
          ) : (
            <li className="text-[15px] leading-relaxed text-[rgb(var(--muted))]">
              Themenstruktur bestätigen und danach den Entwurf bewusst weiterführen.
            </li>
          )}
        </ol>
      </div>
    </div>
  );
}

function SectionFlowDiagram(props: { sections: ReturnType<typeof buildCreateVisualSections> }) {
  if (props.sections.length === 0) return null;
  return (
    <div className="rounded-[24px] border border-slate-200/70 bg-[color-mix(in_oklab,rgb(var(--card))_90%,rgb(var(--bg))_10%)] px-4 py-4 dark:border-[rgb(var(--border))] dark:bg-[rgb(var(--bg))]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">Lesefluss</p>
      <div className="mt-3 space-y-3">
        {props.sections.map((section, index) => (
          <div key={`flow-${section.id}`} className="flex items-start gap-3">
            <div className="flex flex-col items-center pt-0.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-cyan-300/45 text-[11px] font-semibold text-cyan-100">
                {index + 1}
              </span>
              {index < props.sections.length - 1 ? <span className="mt-1 h-6 w-px bg-[rgb(var(--border))]" /> : null}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[rgb(var(--fg))]">{section.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-[rgb(var(--muted))]">
                {section.statementLabel ?? section.topicLabel ?? "Einordnung"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContentModuleGrid(props: { modules: CreateFollowupContentModule[] }) {
  if (props.modules.length === 0) return null;
  return (
    <div className="rounded-[30px] border border-slate-200/80 bg-[color-mix(in_oklab,rgb(var(--card))_92%,rgb(var(--bg))_8%)] px-4 py-5 dark:border-[rgb(var(--border))] dark:bg-[rgb(var(--card))]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">Lesemodus</p>
          <p className="mt-1 text-sm font-semibold text-[rgb(var(--fg))]">Was der Beitrag außerdem mitbringt</p>
        </div>
        <span className="rounded-full border border-slate-200/80 px-2.5 py-1 text-[11px] font-semibold text-[rgb(var(--muted))] dark:border-[rgb(var(--border))]">
          Modular gelesen
        </span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {props.modules.map((module) => (
          <article
            key={module.id}
            className={`rounded-[24px] border px-4 py-4 ${resolveContentModuleToneClass(module.tone)}`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-80">{module.title}</p>
            <p className="mt-2 text-base font-semibold leading-snug">{module.lead}</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">{module.detail}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function SecondaryFollowupNote(props: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200/75 bg-[color-mix(in_oklab,rgb(var(--card))_88%,rgb(var(--bg))_12%)] px-4 py-3 text-xs leading-relaxed text-[rgb(var(--muted))] dark:border-[rgb(var(--border))] dark:bg-[rgb(var(--bg))]">
      {props.children}
    </div>
  );
}

function NextStepChecklist(props: { items: NextStepChecklistItem[] }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-[rgb(var(--fg))]">Deine nächsten Schritte</p>
      <div className="space-y-2">
        {props.items.map((item) => (
          <div
            key={item.id}
            className={`rounded-2xl border px-3 py-3 ${
              item.done
                ? "border-emerald-300/60 bg-emerald-500/[0.08] dark:border-emerald-300/30 dark:bg-emerald-500/10"
                : "border-slate-200/80 bg-[color-mix(in_oklab,rgb(var(--card))_92%,rgb(var(--bg))_8%)] dark:border-[rgb(var(--border))] dark:bg-[rgb(var(--card))]"
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                  item.done
                    ? "border-emerald-400/70 bg-emerald-100 text-emerald-900 dark:border-emerald-300/40 dark:bg-emerald-500/20 dark:text-emerald-100"
                    : "border-slate-300/80 bg-slate-100 text-slate-700 dark:border-slate-500/60 dark:bg-slate-500/10 dark:text-slate-200"
                }`}
              >
                {item.done ? "✓" : "○"}
              </span>
              <div>
                <p className="text-sm font-medium text-[rgb(var(--fg))]">{item.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-[rgb(var(--muted))]">{item.detail}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StructureFocusPanel(props: {
  activeFocusArea: FocusAreaId;
  rootTopic: string;
  topicLabels: string[];
  positionClusters: string[];
  voteQuestions: string[];
  keyStatement: string;
  structureBranches: CreateStructureBranch[];
  checklistItems: NextStepChecklistItem[];
  onEdit: (focus: string) => void;
  resultChangeKey: string;
  sections: ReturnType<typeof buildCreateVisualSections>;
  modules: CreateFollowupContentModule[];
}) {
  if (props.activeFocusArea === "priorities") {
    return (
      <div className="space-y-4 rounded-[30px] border border-slate-200/80 bg-[color-mix(in_oklab,rgb(var(--card))_92%,rgb(var(--bg))_8%)] px-4 py-5 shadow-[0_20px_48px_rgba(2,6,23,0.06)] dark:border-[rgb(var(--border))] dark:bg-[rgb(var(--card))] dark:shadow-none">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">Einordnung</p>
          <p className="text-base font-semibold text-[rgb(var(--fg))]">Was im Beitrag gerade die Richtung vorgibt</p>
        </div>
        <div className={`rounded-[24px] border px-4 py-4 ${resolveNodeTone("topic")}`}>
          <p className="text-sm font-semibold">Übergeordnetes Thema</p>
          <p className="mt-1 text-base font-semibold">{props.rootTopic}</p>
        </div>
        <div className={`rounded-[24px] border px-4 py-4 ${resolveNodeTone("statement")}`}>
          <p className="text-xs font-semibold uppercase tracking-[0.14em]">Kern erkannt</p>
          <p className="mt-2 text-base font-semibold leading-relaxed">{props.keyStatement}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--muted))]">Themenfelder</p>
          <TopicFieldList labels={props.topicLabels.slice(0, 6)} onPick={props.onEdit} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--muted))]">Blickrichtungen</p>
          <PositionClusterList labels={props.positionClusters} onPick={props.onEdit} />
        </div>
        <ContentModuleGrid modules={props.modules.slice(0, 2)} />
      </div>
    );
  }

  if (props.activeFocusArea === "clusters") {
    return props.structureBranches.length > 0 ? (
      <StructureBranchList branches={props.structureBranches} onEdit={props.onEdit} resetKey={props.resultChangeKey} />
    ) : (
      <div className="space-y-3 rounded-[30px] border border-slate-200/80 bg-[color-mix(in_oklab,rgb(var(--card))_92%,rgb(var(--bg))_8%)] px-4 py-5 shadow-[0_20px_48px_rgba(2,6,23,0.06)] dark:border-[rgb(var(--border))] dark:bg-[rgb(var(--card))] dark:shadow-none">
        <p className="text-sm font-semibold text-[rgb(var(--fg))]">Themencluster</p>
        <p className="text-sm text-[rgb(var(--muted))]">Für diesen Beitrag reicht zunächst ein kompakter Themenfokus statt mehrerer Cluster.</p>
        <TopicFieldList labels={props.topicLabels.slice(0, 6)} onPick={props.onEdit} />
      </div>
    );
  }

  if (props.activeFocusArea === "questions") {
    return (
      <div className="space-y-4 rounded-[30px] border border-slate-200/80 bg-[color-mix(in_oklab,rgb(var(--card))_92%,rgb(var(--bg))_8%)] px-4 py-5 shadow-[0_20px_48px_rgba(2,6,23,0.06)] dark:border-[rgb(var(--border))] dark:bg-[rgb(var(--card))] dark:shadow-none">
        <div className="rounded-[24px] border border-fuchsia-200/70 bg-fuchsia-50/70 px-4 py-4 dark:border-fuchsia-300/25 dark:bg-fuchsia-500/10">
          <p className="text-sm font-semibold text-fuchsia-950 dark:text-fuchsia-50">Fragen & Abstimmung</p>
          <p className="mt-2 text-sm leading-relaxed text-fuchsia-900 dark:text-fuchsia-100">
            Diese Leitfragen bleiben sichtbar, aber erst nach deiner Bestätigung werden sie weiter vorbereitet.
          </p>
        </div>
        <VoteQuestionList questions={props.voteQuestions} />
        <ContentModuleGrid modules={props.modules.filter((module) => module.tone === "vote" || module.tone === "stats").slice(0, 2)} />
      </div>
    );
  }

  if (props.activeFocusArea === "sections") {
    return (
      <div className="space-y-4 rounded-[30px] border border-slate-200/80 bg-[color-mix(in_oklab,rgb(var(--card))_92%,rgb(var(--bg))_8%)] px-4 py-5 shadow-[0_20px_48px_rgba(2,6,23,0.06)] dark:border-[rgb(var(--border))] dark:bg-[rgb(var(--card))] dark:shadow-none">
        <div className="rounded-[24px] border border-sky-200/60 bg-sky-500/[0.06] px-4 py-4 dark:border-sky-300/25 dark:bg-sky-500/10">
          <p className="text-sm font-semibold text-sky-950 dark:text-sky-50">Gelesene Sinnabschnitte</p>
          <p className="mt-2 text-sm leading-relaxed text-sky-900 dark:text-sky-100">
            Hier siehst du, welche Abschnitte ich getrennt gelesen und wie ich sie jeweils eingeordnet habe.
          </p>
        </div>
        <div className="space-y-2">
          {props.sections.length > 0 ? (
            props.sections.map((section) => (
              <details
                key={section.id}
                className="rounded-2xl border border-slate-200/75 bg-[color-mix(in_oklab,rgb(var(--card))_90%,rgb(var(--bg))_10%)] px-3 py-3 dark:border-[rgb(var(--border))] dark:bg-[rgb(var(--bg))]"
              >
                <summary className="cursor-pointer text-sm font-semibold text-[rgb(var(--fg))]">
                  {section.label}
                </summary>
                <div className="mt-3 space-y-2 text-sm">
                  <p className="text-[rgb(var(--fg))]"><span className="font-semibold">Du sagst:</span> {section.sourceText}</p>
                  {section.statementLabel ? (
                    <p className="text-[rgb(var(--muted))]"><span className="font-semibold text-[rgb(var(--fg))]">Erkannt als:</span> {section.statementLabel}</p>
                  ) : null}
                  {section.topicLabel ? (
                    <p className="text-[rgb(var(--muted))]"><span className="font-semibold text-[rgb(var(--fg))]">Gehört zu:</span> {section.topicLabel}</p>
                  ) : null}
                  {section.connectionLabel ? (
                    <p className="text-[rgb(var(--muted))]"><span className="font-semibold text-[rgb(var(--fg))]">Passender nächster Schritt:</span> {section.connectionLabel}</p>
                  ) : null}
                </div>
              </details>
            ))
          ) : (
            <SecondaryFollowupNote>
              Für diesen Beitrag reichen im Moment kompakte Sinnabschnitte ohne weitere Unterteilung.
            </SecondaryFollowupNote>
          )}
        </div>
        <SectionFlowDiagram sections={props.sections} />
        <ContentModuleGrid modules={props.modules.filter((module) => module.tone === "source" || module.tone === "context")} />
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-[30px] border border-slate-200/80 bg-[color-mix(in_oklab,rgb(var(--card))_92%,rgb(var(--bg))_8%)] px-4 py-5 shadow-[0_20px_48px_rgba(2,6,23,0.06)] dark:border-[rgb(var(--border))] dark:bg-[rgb(var(--card))] dark:shadow-none">
      <NextStepChecklist items={props.checklistItems} />
      <SecondaryFollowupNote>
        Guardrails bleiben kompakt sichtbar: keine automatische Stimme, keine automatische Veröffentlichung, keine automatische Kostenbuchung.
      </SecondaryFollowupNote>
    </div>
  );
}

function StructuredWorkstateBlock(props: {
  locale: CreateVoxyLocale;
  rootTopic: string;
  topicLabels: string[];
  positionClusters: string[];
  voteQuestions: string[];
  keyStatement: string;
  structureBranches: CreateStructureBranch[];
  sortedSuggestions: CreateConnectionSuggestion[];
  isConfirmed: boolean;
  onEdit: (focus: string) => void;
  resultChangeKey: string;
  sections: ReturnType<typeof buildCreateVisualSections>;
  modules: CreateFollowupContentModule[];
}) {
  const initialFocusArea: FocusAreaId = props.structureBranches.length > 0 ? "clusters" : "priorities";
  const [activeFocusArea, setActiveFocusArea] = React.useState<FocusAreaId>(initialFocusArea);
  const overviewCards = React.useMemo<FocusOverviewCard[]>(
    () => {
      const checklist = buildNextStepChecklist({
        isConfirmed: props.isConfirmed,
        structureBranches: props.structureBranches,
        voteQuestions: props.voteQuestions,
        sortedSuggestions: props.sortedSuggestions,
      });
      const doneChecklistCount = checklist.filter((item) => item.done).length;
      return [
        {
          id: "priorities",
          title: "Prioritäten",
          lead: "Was ist dir besonders wichtig?",
          status: `${Math.max(1, Math.min(props.topicLabels.length, 3))} Prioritäten`,
        },
        {
          id: "clusters",
          title: "Themencluster",
          lead: "Deine Schwerpunkte im Detail",
          status: `${Math.max(1, props.structureBranches.length || 1)} Cluster`,
        },
        {
          id: "questions",
          title: "Fragen & Abstimmung",
          lead: "Was denkst du? Mach mit!",
          status: `${Math.max(1, props.voteQuestions.length)} Fragen`,
        },
        {
          id: "next_steps",
          title: "Nächste Schritte",
          lead: "So geht es weiter",
          status: `${Math.min(doneChecklistCount, 3)}/3 erledigt`,
        },
      ];
    },
    [
      props.isConfirmed,
      props.sortedSuggestions,
      props.structureBranches,
      props.topicLabels.length,
      props.voteQuestions,
    ],
  );
  const checklistItems = React.useMemo(
    () =>
      buildNextStepChecklist({
        isConfirmed: props.isConfirmed,
        structureBranches: props.structureBranches,
        voteQuestions: props.voteQuestions,
        sortedSuggestions: props.sortedSuggestions,
      }),
    [props.isConfirmed, props.sortedSuggestions, props.structureBranches, props.voteQuestions],
  );

  React.useEffect(() => {
    setActiveFocusArea(initialFocusArea);
  }, [initialFocusArea, props.resultChangeKey]);

  return (
    <div className="mt-5 min-w-0 space-y-5 border-t border-slate-200 pt-5 dark:border-[rgb(var(--border))]">
      <div className="space-y-3">
        <p className="text-sm font-semibold text-[rgb(var(--fg))] md:text-base">Vorgeschlagener Arbeitsstand</p>
        <p className="max-w-3xl text-sm leading-relaxed text-[rgb(var(--muted))] md:text-base">
          {CREATE_VISUAL_FOLLOWUP_COPY.graphTitle}
        </p>
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(18rem,0.82fr)_minmax(0,1.18fr)]">
        <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <SummarySnapshotCard
            keyStatement={props.keyStatement}
            rootTopic={props.rootTopic}
            positionClusters={props.positionClusters}
            topicLabels={props.topicLabels}
            voteQuestionCount={props.voteQuestions.length}
            sectionCount={props.sections.length}
          />
          <StructureOverviewRail cards={overviewCards} activeCardId={activeFocusArea} onSelect={setActiveFocusArea} />
        </div>

        {FOCUS_AREA_ORDER.map((focusArea) => {
          const isActive = activeFocusArea === focusArea;
          return (
            <div
              key={focusArea}
              role="tabpanel"
              id={`create-overview-panel-${focusArea}`}
              aria-labelledby={`create-overview-tab-${focusArea}`}
              className="space-y-4"
              hidden={!isActive}
            >
              <StructureFocusPanel
                activeFocusArea={focusArea}
                rootTopic={props.rootTopic}
                topicLabels={props.topicLabels}
                positionClusters={props.positionClusters}
                voteQuestions={props.voteQuestions}
                keyStatement={props.keyStatement}
                structureBranches={props.structureBranches}
                checklistItems={checklistItems}
                onEdit={props.onEdit}
                resultChangeKey={props.resultChangeKey}
                sections={props.sections}
                modules={props.modules}
              />
              {focusArea !== "priorities" ? <ContentModuleGrid modules={props.modules.slice(0, 4)} /> : null}
              <details className="rounded-[24px] border border-slate-200/80 bg-[color-mix(in_oklab,rgb(var(--card))_92%,rgb(var(--bg))_8%)] px-4 py-4 dark:border-[rgb(var(--border))] dark:bg-[rgb(var(--card))]">
                <summary className="cursor-pointer text-sm font-semibold text-[rgb(var(--fg))]">
                  Gelesene Sinnabschnitte und Lesemodus
                </summary>
                <div className="mt-4 space-y-4">
                  <div className="rounded-[24px] border border-sky-200/60 bg-sky-500/[0.06] px-4 py-4 dark:border-sky-300/25 dark:bg-sky-500/10">
                    <p className="text-sm font-semibold text-sky-950 dark:text-sky-50">Gelesene Sinnabschnitte</p>
                    <p className="mt-2 text-sm leading-relaxed text-sky-900 dark:text-sky-100">
                      Diese Analysebausteine bleiben bewusst hinter Details und tauchen nicht im ersten Bürger-Flow auf.
                    </p>
                  </div>
                  <SectionFlowDiagram sections={props.sections} />
                  <div className="space-y-2">
                    {props.sections.map((section) => (
                      <details
                        key={section.id}
                        className="rounded-2xl border border-slate-200/75 bg-[color-mix(in_oklab,rgb(var(--card))_90%,rgb(var(--bg))_10%)] px-3 py-3 dark:border-[rgb(var(--border))] dark:bg-[rgb(var(--bg))]"
                      >
                        <summary className="cursor-pointer text-sm font-semibold text-[rgb(var(--fg))]">{section.label}</summary>
                        <div className="mt-3 space-y-2 text-sm">
                          <p className="text-[rgb(var(--fg))]"><span className="font-semibold">Du sagst:</span> {section.sourceText}</p>
                          {section.statementLabel ? (
                            <p className="text-[rgb(var(--muted))]"><span className="font-semibold text-[rgb(var(--fg))]">Erkannt als:</span> {section.statementLabel}</p>
                          ) : null}
                          {section.topicLabel ? (
                            <p className="text-[rgb(var(--muted))]"><span className="font-semibold text-[rgb(var(--fg))]">Gehört zu:</span> {section.topicLabel}</p>
                          ) : null}
                          {section.connectionLabel ? (
                            <p className="text-[rgb(var(--muted))]"><span className="font-semibold text-[rgb(var(--fg))]">Passender nächster Schritt:</span> {section.connectionLabel}</p>
                          ) : null}
                        </div>
                      </details>
                    ))}
                  </div>
                  <ContentModuleGrid modules={props.modules} />
                </div>
              </details>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PlaceClarificationPanel(props: {
  question: string;
  privacyHint?: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onSkip?: () => void;
  submitDisabled: boolean;
}) {
  return (
    <div className="create-chat-message flex items-start gap-3">
      <div className="mt-1 shrink-0">
        <VoxyAvatar appearance="inline" compact variant="presenting" />
      </div>
      <div className="w-full max-w-[46rem] min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-slate-700 dark:text-[rgb(var(--muted))]">Voxy</p>
        <div className="mt-2 rounded-[1.6rem] rounded-tl-sm border border-amber-300/45 bg-amber-500/[0.07] px-4 py-4">
          <p className="text-base font-semibold text-amber-950 dark:text-amber-50">Um welchen Ort geht es?</p>
          <p className="mt-2 text-sm leading-relaxed text-amber-950/90 dark:text-amber-100/90">{props.question}</p>
          {props.privacyHint ? (
            <p className="mt-2 text-xs leading-relaxed text-amber-900/80 dark:text-amber-100/80">{props.privacyHint}</p>
          ) : null}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={props.value}
              onChange={(event) => props.onChange(event.target.value)}
              placeholder="Ort, Bezirk oder Kommune ergänzen"
              className="min-w-0 flex-1 rounded-xl border border-amber-300/60 bg-white/80 px-3 py-2 text-sm text-slate-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:bg-slate-950/50 dark:text-white"
            />
            <button
              type="button"
              className="btn-primary min-h-[42px] px-4 py-2 text-sm"
              onClick={props.onSubmit}
              disabled={props.submitDisabled}
              aria-disabled={props.submitDisabled}
            >
              Ort ergänzen
            </button>
          </div>
          {props.onSkip ? (
            <button
              type="button"
              className="mt-3 text-sm font-medium text-amber-900 underline-offset-4 hover:underline dark:text-amber-100"
              onClick={props.onSkip}
            >
              Ort später ergänzen
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StructureProposalPanel(props: {
  onConfirm: () => void;
  onOpenManualTopicChooser: () => void;
  onEdit: () => void;
  onContinuePackage: () => void;
  multiIssue: boolean;
}) {
  return (
    <div data-mobile-inline-create-actions className="space-y-3 border-t border-slate-200/80 pt-4 dark:border-[rgb(var(--border))]">
      <div className="space-y-3">
        <div className="max-w-2xl space-y-1">
          <p className="text-[12px] font-semibold text-[rgb(var(--muted))]">Deine Entscheidung</p>
          <p className="text-sm font-semibold text-[rgb(var(--fg))]">Was du jetzt tun kannst</p>
          <p className="text-[15px] leading-relaxed text-[rgb(var(--muted))]">
            {props.multiIssue
              ? "Du kannst das Paket gemeinsam weiterführen oder zunächst einen Themenbereich auswählen."
              : "Bestätige zuerst die Themenstruktur. Alles Weitere bleibt bewusst nachgeordnet."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5 xl:max-w-4xl">
          <button
            type="button"
            className="btn-primary min-h-[46px] px-4 py-2 text-sm"
            onClick={props.multiIssue ? props.onContinuePackage : props.onConfirm}
          >
            {props.multiIssue ? "Als Gesamtkonzept weiterarbeiten" : "Themenstruktur bestätigen"}
          </button>
          <button type="button" className="btn-secondary min-h-[42px] px-3 py-2 text-sm" onClick={props.onOpenManualTopicChooser}>
            {props.multiIssue ? "Ein Thema auswählen" : "Themen ändern"}
          </button>
          {props.multiIssue ? (
            <button type="button" className="btn-secondary min-h-[42px] px-3 py-2 text-sm" onClick={props.onEdit}>
              Struktur ändern
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PlannerClarificationPanel(props: {
  reason: string;
  details?: string | null;
  onConfirm: () => void;
  onOpenManualTopicChooser: () => void;
}) {
  return (
    <div className="space-y-3 rounded-[28px] border border-slate-200/75 bg-[color-mix(in_oklab,rgb(var(--card))_92%,rgb(var(--bg))_8%)] px-4 py-4 dark:border-[rgb(var(--border))] dark:bg-[rgb(var(--card))]">
      <div className="space-y-1">
        <p className="text-[12px] font-semibold text-[rgb(var(--muted))]">Deine Entscheidung</p>
        <p className="text-sm font-semibold text-[rgb(var(--fg))]">
          Was du jetzt tun kannst
        </p>
        <p className="text-[15px] leading-relaxed text-[rgb(var(--muted))]">
          {props.reason}
        </p>
        {props.details ? (
          <p className="text-sm leading-relaxed text-[rgb(var(--muted))]">{props.details}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2.5">
        <button
          type="button"
          className="btn-primary min-h-[46px] px-4 py-2 text-sm"
          onClick={props.onConfirm}
        >
          Themenstruktur bestätigen
        </button>
        <button
          type="button"
          className="btn-secondary min-h-[42px] px-3 py-2 text-sm"
          onClick={props.onOpenManualTopicChooser}
        >
          Themen ändern
        </button>
      </div>
    </div>
  );
}

function WorkspaceActionThreadNote(props: {
  mode: "default" | "edit" | "source" | "manual_topic";
  selectedPrimaryTopic?: string | null;
  factcheckMessage?: string | null;
}) {
  if (props.mode === "default") return null;

  const copy =
    props.mode === "edit"
      ? {
          title: "Aussage schärfen aktiv",
          body: "Welche Aussage möchtest du schärfen?",
        }
      : props.mode === "source"
        ? {
            title: "Quellenmodus geöffnet",
            body:
              props.factcheckMessage ??
              "Ergänze unten Hinweise, Links oder Dokumente. Eine externe Quellenprüfung startet erst nach deiner ausdrücklichen Bestätigung.",
          }
        : {
            title: "Thema selbst wählen",
            body:
              props.selectedPrimaryTopic
                ? `Der Workspace ist gerade auf „${props.selectedPrimaryTopic}“ fokussiert. Du kannst unten ein anderes Hauptthema benennen.`
                : "Wähle unten ein eigenes Hauptthema oder greife eines der sichtbaren Themen direkt auf.",
          };

  return (
    <div className="create-chat-message flex justify-end">
      <div className="w-full max-w-[46rem] min-w-0 rounded-[24px] rounded-tr-sm border border-slate-200/75 bg-[color-mix(in_oklab,rgb(var(--card))_90%,rgb(var(--bg))_10%)] px-4 py-4 shadow-sm dark:border-[rgb(var(--border))] dark:bg-[rgb(var(--card))] dark:shadow-none">
        <p className="text-[12px] font-semibold text-[rgb(var(--muted))]">Deine Präzisierung</p>
        <p className="mt-1 text-base font-semibold text-[rgb(var(--fg))]">{copy.title}</p>
        <p className="mt-1 text-sm leading-relaxed text-[rgb(var(--muted))]">{copy.body}</p>
      </div>
    </div>
  );
}

function ManualTopicChooser(props: {
  topicOptions: string[];
  selectedPrimaryTopic?: string | null;
  onSelectPrimaryTopic?: (topicLabel: string) => void;
}) {
  const [manualTopic, setManualTopic] = React.useState("");

  return (
    <div className="rounded-[24px] border border-slate-200/80 bg-[color-mix(in_oklab,rgb(var(--card))_94%,rgb(var(--bg))_6%)] px-4 py-4 dark:border-[rgb(var(--border))] dark:bg-[rgb(var(--card))]">
      <p className="text-sm font-semibold text-[rgb(var(--fg))]">Thema selbst wählen</p>
      <p className="mt-1 text-sm leading-relaxed text-[rgb(var(--muted))]">
        Du kannst eines der sichtbaren Themen übernehmen oder unten ein eigenes Hauptthema setzen.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {props.topicOptions.map((topicLabel) => (
          <button
            key={`manual-topic-option-${topicLabel}`}
            type="button"
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              props.selectedPrimaryTopic === topicLabel
                ? "border-cyan-400/70 bg-cyan-500/[0.12] text-cyan-950 dark:text-cyan-50"
                : "border-[rgb(var(--border))] bg-[rgb(var(--bg))] text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))]"
            }`}
            onClick={() => props.onSelectPrimaryTopic?.(topicLabel)}
          >
            {topicLabel}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={manualTopic}
          onChange={(event) => setManualTopic(event.target.value)}
          placeholder="Eigenes Hauptthema benennen"
          className="min-w-0 flex-1 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2 text-sm text-[rgb(var(--fg))] focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-200"
        />
        <button
          type="button"
          className="btn-secondary min-h-[42px] px-4 py-2 text-sm"
          onClick={() => {
            const normalizedTopic = manualTopic.trim();
            if (!normalizedTopic) return;
            props.onSelectPrimaryTopic?.(normalizedTopic);
            setManualTopic("");
          }}
          disabled={!manualTopic.trim()}
          aria-disabled={!manualTopic.trim()}
        >
          Thema setzen
        </button>
      </div>
    </div>
  );
}

function NextStepPanel(props: {
  onEdit: () => void;
  onSaveQuestion?: () => void;
  onSaveTopic?: () => void;
  onSaveSource?: () => void;
  onSaveInternal?: () => void;
  onPrepareCommunity?: () => void;
  onDeferWork?: () => void;
  canCreateInternalWorkstate?: boolean;
  reviewRequestState: CreateReviewRequestState;
  reviewRequestMessage?: string | null;
  factcheckMessage?: string | null;
}) {
  return (
    <div className="space-y-3 rounded-[28px] border border-cyan-300/28 bg-[linear-gradient(180deg,rgba(9,20,42,0.98),rgba(11,24,46,0.95))] px-4 py-4 shadow-[0_18px_42px_rgba(8,145,178,0.12)]">
      <div className="space-y-1">
        <p className="text-[12px] font-semibold text-slate-400">Nächster Schritt</p>
        <p className="text-sm font-semibold text-white">Was du jetzt tun kannst</p>
        <p className="text-[15px] leading-relaxed text-slate-300">
          Du entscheidest, wie wir mit dem gewählten Thema weiterarbeiten.
        </p>
      </div>
      <div className="flex flex-wrap gap-2.5">
        <button type="button" className="btn-primary min-h-[46px] px-4 py-2 text-sm" onClick={props.onEdit}>
          Aussage schärfen
        </button>
        <button
          type="button"
          className="btn-secondary min-h-[42px] px-3 py-2 text-sm"
          onClick={props.onSaveQuestion}
        >
          Frage vormerken
        </button>
        <button type="button" className="btn-secondary min-h-[42px] px-3 py-2 text-sm" onClick={props.onSaveTopic}>
          Thema vormerken
        </button>
        <button type="button" className="btn-secondary min-h-[42px] px-3 py-2 text-sm" onClick={props.onSaveSource}>
          Quelle vormerken
        </button>
        {props.canCreateInternalWorkstate ? (
          <button type="button" className="btn-secondary min-h-[42px] px-3 py-2 text-sm" onClick={props.onSaveInternal}>
            Intern notieren
          </button>
        ) : null}
        <button type="button" className="btn-secondary min-h-[42px] px-3 py-2 text-sm" onClick={props.onPrepareCommunity}>
          Für Community vorbereiten
        </button>
        <button type="button" className="btn-secondary min-h-[42px] px-3 py-2 text-sm" onClick={props.onDeferWork}>
          Später weiterarbeiten
        </button>
      </div>
      <p className="text-xs leading-relaxed text-slate-400">Kein Auto-Publish.</p>
      {props.reviewRequestMessage ? (
        <p className="rounded-xl border border-cyan-300/20 bg-cyan-500/[0.08] px-3 py-2 text-xs leading-relaxed text-cyan-100">
          {props.reviewRequestMessage}
        </p>
      ) : null}
      {props.factcheckMessage ? (
        <p className="text-xs leading-relaxed text-slate-400">{props.factcheckMessage}</p>
      ) : null}
    </div>
  );
}

function ContinueWritingComposer(props: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  submitDisabled: boolean;
}) {
  return (
    <div className="create-chat-message flex gap-3">
      <div className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-slate-400 ring-4 ring-white dark:bg-slate-500 dark:ring-[rgb(var(--bg))]" />
      <div className="max-w-5xl min-w-0 flex-1 rounded-[24px] rounded-tl-sm border border-slate-200/75 bg-[color-mix(in_oklab,rgb(var(--card))_88%,rgb(var(--bg))_12%)] px-4 py-4 shadow-sm dark:border-[rgb(var(--border))] dark:bg-[rgb(var(--card))] dark:shadow-none">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">Korrektur oder Ergänzung</p>
        <p className="mt-1 text-base font-semibold text-[rgb(var(--fg))]">Schreib einfach weiter</p>
        <p className="mt-1 text-sm text-[rgb(var(--muted))]">
          Ergänze hier, was anders gemeint war, welche Quelle noch fehlt oder welchen nächsten Schritt ich anpassen soll.
        </p>
        <textarea
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
          rows={4}
          placeholder="Bitte ändere das Thema auf Pflege. Formuliere die Abstimmungsfrage neutraler. Ich möchte noch eine Quelle ergänzen."
          className="mt-3 w-full resize-y rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2 text-sm text-[rgb(var(--fg))] shadow-sm focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-200"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn-secondary min-h-[40px] px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            onClick={props.onSubmit}
            disabled={props.submitDisabled}
            aria-disabled={props.submitDisabled}
          >
            Antwort fortsetzen
          </button>
          <span className="text-xs text-[rgb(var(--muted))]">Dein neuer Hinweis ergänzt den bisherigen Chatverlauf.</span>
        </div>
      </div>
    </div>
  );
}

export default function CreateVisualFollowup({
  result,
  actionNotice,
  isConfirmed = false,
  embedInWorkspaceShell = false,
  activeTopicLabel = null,
  selectedPrimaryTopic = null,
  groupedTopicLabels = [],
  parkedTopicLabels = [],
  composerMode = "default",
  reviewRequestState = "idle",
  reviewRequestMessage = null,
  factcheckMessage = null,
  showCorrectionComposer = false,
  onConfirm,
  onEdit,
  onFocusTopic,
  onSelectPrimaryTopic,
  onGroupTopics = () => {},
  onSeparateTopics = () => {},
  onParkTopic,
  onOpenManualTopicChooser = () => {},
  onPrepareSubmission,
  onPrepareAnlassraum,
  onOpenDossierAppend,
  onOpenDossierCreate,
  onPrepareVote,
  onRequestEditorialReview = () => {},
  onStartOptionalService = () => {},
  onDeepenAllTopics = () => {},
  onDeepenTopic = () => {},
  onContinueInAccount = () => {},
  onSaveQuestion = () => {},
  onSaveTopic = () => {},
  onSaveSource = () => {},
  onSaveInternal = () => {},
  onPrepareCommunity = () => {},
  onDeferWork,
  canCreateInternalWorkstate = false,
  onRetryPlanner,
  isRetryPlannerPending = false,
  locale = "de",
  supportHandoff = null,
  dynamicStatusRef,
  onSaveOnly = () => {},
  onSkipPlaceClarification = () => {},
  linkDetection = null,
  compactBranchLimit: compactBranchLimitProp = 4,
  expandedBranchLimit: expandedBranchLimitProp = 4,
  documentTopicOverviewOpened = false,
  showExpandedTopicPreview = false,
  topicExpansionDecision = "idle",
  expandedTopicAccess,
  onOpenDocumentTopicOverview,
  onExpandTopicPreview,
  onKeepCompactTopicPreview,
  onPrepareLinkReview,
  onDeferExpandedReview,
  continuationValue,
  onContinuationChange,
  onContinueConversation,
  continueConversationDisabled = false,
  handoffRuntimeDossierId = null,
  handoffRuntimeAnlassraumId = null,
  handoffRuntimeSourceUrls,
  handoffRuntimeMaterialItems,
}: CreateVisualFollowupProps) {
  const sections = React.useMemo(() => buildCreateVisualSections(result, 4), [result]);
  const resultChangeKey = React.useMemo(
    () =>
      [
        result.generatedAt,
        result.understanding.summary,
        result.sourceText,
        result.understanding.dossierContext,
      ]
        .filter(Boolean)
        .join("::"),
    [
      result.generatedAt,
      result.sourceText,
      result.understanding.dossierContext,
      result.understanding.summary,
    ],
  );

  const topicLabels = result.understanding.topics.map((topic) => topic.label);
  const analysisState = result.meta?.analysis?.state ?? "result_ready";
  const analysisMessage = result.meta?.analysis?.userMessage ?? "";
  const hasValidatedAnalysis =
    analysisState === "analysis_validated" || analysisState === "result_ready";
  const broadTopicFields = React.useMemo(
    () => (hasValidatedAnalysis ? deriveBroadTopicFields(topicLabels) : []),
    [hasValidatedAnalysis, topicLabels],
  );
  const dominantStance = hasValidatedAnalysis
    ? deriveDominantUnderstandingStance(result.understanding)
    : "offen/unklar";
  const sortedSuggestions = hasValidatedAnalysis
    ? sortSuggestions(result.suggestions)
        .filter((suggestion) => suggestion.kind !== "topic")
        .slice(0, 4)
    : [];
  const compactBranchLimit = Math.max(1, compactBranchLimitProp ?? 3);
  const expandedBranchLimit = Math.max(
    compactBranchLimit,
    expandedBranchLimitProp ?? compactBranchLimit,
  );
  const documentAnalysis = React.useMemo(
    () => (result.meta?.documentAnalysis ? normalizeDocumentAnalysisSummary(result.meta.documentAnalysis) : null),
    [result.meta?.documentAnalysis],
  );
  const documentTopicCount = documentAnalysis?.topicCount ?? 0;
  const compactStructureBranches = React.useMemo(
    () => (hasValidatedAnalysis ? buildCreateStructureBranches(result, compactBranchLimit) : []),
    [compactBranchLimit, hasValidatedAnalysis, result],
  );
  const semanticTopicCount = Math.max(
    result.understanding.topics.length,
    documentTopicCount,
  );
  const fullStructureBranchLimit = documentAnalysis
    ? Math.max(1, documentTopicCount)
    : Math.max(expandedBranchLimit, semanticTopicCount);
  const fullStructureBranches = React.useMemo(
    () => (hasValidatedAnalysis ? buildCreateStructureBranches(result, fullStructureBranchLimit) : []),
    [fullStructureBranchLimit, hasValidatedAnalysis, result],
  );
  const structureBranches =
    documentAnalysis && documentTopicOverviewOpened
      ? fullStructureBranches
      : showExpandedTopicPreview
        ? fullStructureBranches
        : compactStructureBranches;
  const semanticTopicLabels =
    documentTopicCount > 0
      ? documentAnalysis?.topics.map((topic) => topic.label) ?? topicLabels
      : fullStructureBranches.length > 0
      ? fullStructureBranches.map((branch) => branch.title)
      : topicLabels;
  const visibleUnderstandingAspects = React.useMemo(
    () =>
      dedupeLabelsCaseInsensitive(
        (result.understanding.aspects ?? []).filter(
          (aspect) =>
            typeof aspect === "string" &&
            !/\[object\s+(?:Object|Array)\]|^(?:undefined|null|nan|infinity)$/i.test(
              aspect.trim(),
            ),
        ),
      ).slice(0, 4),
    [result.understanding.aspects],
  );
  const multiTopicActionTopics = React.useMemo(() => buildMultiTopicActionTopics(result), [result]);
  const showMultiTopicActionPanel = shouldShowMultiTopicActionPanel(multiTopicActionTopics);
  const contentModules = React.useMemo(
    () =>
      buildContentModules({
        result,
        sections,
        sortedSuggestions,
      }),
    [result, sections, sortedSuggestions],
  );
  const voteQuestions = React.useMemo(
    () =>
      hasValidatedAnalysis
        ? buildVoteQuestions({
            dossierContext: result.understanding.dossierContext,
            broadTopicFields,
            suggestions: sortedSuggestions,
            fallbackTopic: result.understanding.dossierContext ?? topicLabels[0] ?? "Öffentliches Thema",
          })
        : [],
    [broadTopicFields, hasValidatedAnalysis, result.understanding.dossierContext, sortedSuggestions, topicLabels],
  );
  const scopeChip = result.understanding.scopes[0] ?? "unclear";
  const multiIssueMode = result.meta?.planner?.issueMode === "multi_issue";
  const plannerClarificationRequired = hasValidatedAnalysis ? needsPlannerClarification(result) : false;
  const plannerClarificationReason = hasValidatedAnalysis ? resolvePlannerClarificationReason(result) : "";
  const plannerClarificationDetails = hasValidatedAnalysis ? resolvePlannerClarificationDetails(result) : null;
  const plannerProvisionalNotice = hasValidatedAnalysis ? resolvePlannerProvisionalNotice(result) : null;
  const plannerUsesProvisionalStructure = Boolean(plannerProvisionalNotice);
  const plannerTechnicalFallback = hasValidatedAnalysis ? isTechnicalPlannerFallback(result) : true;
  const showDocumentTopicOverview = hasValidatedAnalysis && (!documentAnalysis || documentTopicOverviewOpened);
  const fallbackBranches = React.useMemo(
    () => (plannerClarificationRequired ? buildDeterministicFallbackBranches(result) : []),
    [plannerClarificationRequired, result],
  );
  const totalStructureTopicCount = documentAnalysis
    ? documentTopicCount
    : Math.max(fullStructureBranches.length, result.understanding.topics.length);
  const structureOverflowCount =
    plannerClarificationRequired && (plannerTechnicalFallback || structureBranches.length === 0)
      ? 0
      : Math.max(0, totalStructureTopicCount - structureBranches.length);
  const displayedBranches =
    plannerClarificationRequired && (plannerTechnicalFallback || structureBranches.length === 0)
      ? fallbackBranches
      : structureBranches;
  const degradedStartPoints = React.useMemo(() => {
    const plannerPoints = extractDegradedStartPoints(result);
    if (plannerPoints.length > 0) return plannerPoints;
    return fallbackBranches.map((branch) => branch.title);
  }, [fallbackBranches, result]);
  const dialogIntelligenceRuntimeResult = React.useMemo(
    () => runDialogIntelligenceRuntime({ result, isConfirmed }),
    [isConfirmed, result],
  );
  const dialogOutcomePreview = dialogIntelligenceRuntimeResult.outcome;
  const existingTopicMatchesPreview = React.useMemo(
    () => createExistingTopicMatchPanelPreviewFromDialogOutcome(dialogOutcomePreview),
    [dialogOutcomePreview],
  );
  const [existingTopicMatchesRuntimeResult, setExistingTopicMatchesRuntimeResult] =
    React.useState<ResolveExistingTopicMatchesFromRuntimeResult>({
      status: "preview",
      blockers: [],
      usedSources: ["preview"],
      model: existingTopicMatchesPreview,
    });
  const existingTopicMatchesModel: ExistingTopicMatchPanelModel =
    existingTopicMatchesRuntimeResult.model;
  const topicDeduplicationCandidates = React.useMemo(
    () =>
      buildTopicDeduplicationCandidates({
        existingMatches: existingTopicMatchesModel.matches,
        dialogOutcome: dialogOutcomePreview,
      }),
    [dialogOutcomePreview, existingTopicMatchesModel.matches],
  );
  const primaryTopicDeduplicationCandidate = topicDeduplicationCandidates[0] ?? null;
  const primaryTopicDeduplicationState = React.useMemo(
    () =>
      primaryTopicDeduplicationCandidate
        ? summarizeTopicDeduplicationReviewState(primaryTopicDeduplicationCandidate)
        : null,
    [primaryTopicDeduplicationCandidate],
  );
  const primaryTopicGraphEdgeDraft = React.useMemo(
    () =>
      primaryTopicDeduplicationCandidate
        ? mapDeduplicationCandidateToGraphEdgeDraft(primaryTopicDeduplicationCandidate)
        : null,
    [primaryTopicDeduplicationCandidate],
  );
  const primaryTopicGraphMutationState = React.useMemo(
    () =>
      primaryTopicGraphEdgeDraft
        ? summarizeTopicGraphMutationState(primaryTopicGraphEdgeDraft)
        : null,
    [primaryTopicGraphEdgeDraft],
  );
  const dialogIntelligenceUiSource = React.useMemo(
    () =>
      resolveDialogIntelligenceUiSourceState({
        runtimeResult: dialogIntelligenceRuntimeResult,
        existingTopicMatchesRuntimeStatus: existingTopicMatchesRuntimeResult.status,
      }),
    [dialogIntelligenceRuntimeResult, existingTopicMatchesRuntimeResult.status],
  );
  const plannerClarificationLeadText = displayedBranches.length === 3
    ? "Ich sehe drei Themenstränge. Du kannst sie zusammen lassen oder einzeln weiterführen."
    : "Aus deinem Beitrag ergeben sich mehrere Stränge. Du entscheidest, wie wir weiterarbeiten.";
  const multiIssueLeadText = `Ich erkenne ${totalStructureTopicCount} Themenbereiche. Du entscheidest, wie wir weiterarbeiten.`;
  const assistantLead = resolveAssistantLead({
    topicLabels: semanticTopicLabels,
    summary: hasValidatedAnalysis ? result.understanding.summary : "",
    statementText: result.understanding.statements[0]?.text ?? "",
    dossierContext: result.understanding.dossierContext,
    plannerTopic: result.meta?.planner?.plannerTopic ?? null,
  });
  const positionClusters = React.useMemo(
    () => (hasValidatedAnalysis ? derivePositionClusters(result) : []),
    [hasValidatedAnalysis, result],
  );
  const keyStatement = resolveCoreClaim({
    topicLabels: semanticTopicLabels,
    fallback: hasValidatedAnalysis ? result.understanding.statements[0]?.text ?? result.understanding.summary : "",
    dossierContext: result.understanding.dossierContext,
    plannerCore: result.meta?.planner?.plannerCore ?? null,
  });
  const dedupedCopy = dedupeCreateFollowupSections({
    summary: hasValidatedAnalysis ? result.understanding.summary : result.sourceText,
    coreClaim: hasValidatedAnalysis ? keyStatement : result.sourceText,
    sourceText: result.sourceText,
    statementText: result.understanding.statements[0]?.text ?? "",
  });
  const showCoreBlock = dedupedCopy.prominentCoreClaim !== dedupedCopy.prominentSummary;
  const showAssistantLeadText = shouldShowAssistantLead(
    dedupedCopy.prominentSummary,
    assistantLead,
    dedupedCopy.prominentCoreClaim,
  );
  const rootTopic = plannerClarificationRequired
    ? displayedBranches[0]?.title ??
      result.understanding.dossierContext ??
      semanticTopicLabels.find((label) => !/Öffentliches Anliegen/i.test(label)) ??
      "Öffentliches Thema"
    : result.understanding.dossierContext ?? semanticTopicLabels[0] ?? "Öffentliches Thema";
  const openQuestion = result.understanding.openQuestion ?? null;
  const placeClarification = hasValidatedAnalysis && isPlaceClarificationQuestion(openQuestion)
    ? {
        kind: "place" as const,
        question: openQuestion,
        requiredBeforeFinalize: true,
        privacyHint:
          "Bitte nenne Ort, Bezirk oder Kommune nur so genau wie nötig. Private Wohnadressen werden nicht öffentlich übernommen.",
      }
    : null;
  const nextStepTitles = sortedSuggestions.map((suggestion) => suggestion.title).filter(Boolean);
  const activeBranch = React.useMemo(
    () =>
      displayedBranches.find((branch) => branch.title === activeTopicLabel) ??
      displayedBranches.find((branch) => branch.title === selectedPrimaryTopic) ??
      null,
    [activeTopicLabel, displayedBranches, selectedPrimaryTopic],
  );
  const activeTopicIndex = activeBranch
    ? displayedBranches.findIndex((branch) => branch.title === activeBranch.title)
    : -1;
  const workspaceMetrics = React.useMemo(
    () => [
        {
          label: locale === "en" ? "Priorities" : "Prioritäten",
          value: String(
            hasValidatedAnalysis
              ? documentAnalysis
                ? documentTopicCount
                : Math.max(0, Math.min(topicLabels.length, 3))
              : 0,
          ),
          detail:
            locale === "en"
              ? "What to refine first"
              : "Was du zuerst schärfen solltest",
        },
        {
          label: locale === "en" ? "Topics" : "Themen",
          value: String(hasValidatedAnalysis ? totalStructureTopicCount : 0),
          detail:
            locale === "en"
              ? "Distinct visible areas of focus"
              : "Sichtbar getrennte Schwerpunkte",
        },
      {
        label: locale === "en" ? "Open questions" : "Offene Fragen",
        value: String(hasValidatedAnalysis ? voteQuestions.length : 0),
        detail:
          locale === "en"
            ? "Remain visible for review first"
            : "Bleiben review-first sichtbar",
      },
        {
          label: locale === "en" ? "Next step" : "Nächster Schritt",
          value: !hasValidatedAnalysis
            ? analysisState === "entitlement_required"
              ? locale === "en"
                ? "Start analysis"
                : "Analyse starten"
              : analysisState === "link_detected"
                ? locale === "en"
                  ? "Analyze link"
                  : "Link analysieren"
                : locale === "en"
                  ? "Try again"
                  : "Erneut versuchen"
            : plannerClarificationRequired
            ? "Themenstruktur bestätigen"
            : groupedTopicLabels.length > 1
              ? "Gemeinsam weiterführen"
              : selectedPrimaryTopic || isConfirmed
                ? "Aussage schärfen"
                : activeBranch
                  ? "Themenstruktur bestätigen"
                  : showMultiTopicActionPanel
                    ? "Thema fokussieren"
                    : "Themenstruktur bestätigen",
        detail:
          locale === "en"
            ? "Only after a deliberate decision"
            : "Nur nach bewusster Entscheidung",
      },
    ],
    [
      activeBranch,
      isConfirmed,
      documentAnalysis,
      documentTopicCount,
      groupedTopicLabels.length,
      locale,
      plannerClarificationRequired,
      hasValidatedAnalysis,
      analysisState,
      selectedPrimaryTopic,
      showMultiTopicActionPanel,
      totalStructureTopicCount,
      topicLabels.length,
      voteQuestions.length,
    ],
  );
  const inlineNextStepLabel = workspaceMetrics[3]?.value ?? "Themenstruktur bestätigen";
  const showLinkReviewPrompt =
    Boolean(linkDetection?.hasLink) &&
    !hasValidatedAnalysis &&
    (analysisState === "link_detected" || analysisState === "entitlement_required");
  const showTopicExpansionPrompt =
    !documentAnalysis &&
    showDocumentTopicOverview &&
    (showLinkReviewPrompt || structureOverflowCount > 0) &&
    topicExpansionDecision === "idle";
  const topicExpansionCostLabel = resolveTopicExpansionCostLabel(expandedTopicAccess);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [deepDiveOpen, setDeepDiveOpen] = React.useState(false);
  const [preparedHandoffDraft, setPreparedHandoffDraft] = React.useState<CreateHandoffDraft | null>(null);
  const [existingMatchDecisions, setExistingMatchDecisions] = React.useState<
    Record<string, CitizenMatchDecision>
  >({});
  const [preparedReviewQueueItem, setPreparedReviewQueueItem] =
    React.useState<CreateHandoffReviewQueueItem | null>(null);
  const [reviewQueueRuntimeState, setReviewQueueRuntimeState] = React.useState<
    "idle" | "submitting" | "submitted" | "blocked" | "error"
  >("idle");
  const [reviewQueueRuntimeMessage, setReviewQueueRuntimeMessage] =
    React.useState<string | null>(null);

  const openCorrection = React.useCallback(
    (_focus: string) => {
      onEdit();
    },
    [onEdit],
  );

  React.useEffect(() => {
    setDetailsOpen(false);
    setDeepDiveOpen(false);
  }, [resultChangeKey]);

  React.useEffect(() => {
    setPreparedHandoffDraft(null);
    setExistingMatchDecisions({});
    setPreparedReviewQueueItem(null);
    setReviewQueueRuntimeState("idle");
    setReviewQueueRuntimeMessage(null);
  }, [resultChangeKey]);

  React.useEffect(() => {
    let cancelled = false;
    setExistingTopicMatchesRuntimeResult({
      status: "preview",
      blockers: [],
      usedSources: ["preview"],
      model: existingTopicMatchesPreview,
    });

    if (!isConfirmed) {
      return () => {
        cancelled = true;
      };
    }

    void resolveExistingTopicMatchesFromRuntime({ result }).then((resolved) => {
      if (cancelled) return;
      setExistingTopicMatchesRuntimeResult(resolved);
    }).catch(() => {
      if (cancelled) return;
      setExistingTopicMatchesRuntimeResult({
        status: "blocked",
        blockers: [],
        usedSources: [],
        model: existingTopicMatchesPreview,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [existingTopicMatchesPreview, isConfirmed, result]);

  const prepareDialogHandoffDraft = React.useCallback(
    (target: DialogHandoffTarget) => {
      setPreparedReviewQueueItem(null);
      setReviewQueueRuntimeState("idle");
      setReviewQueueRuntimeMessage(null);
      setPreparedHandoffDraft(
        createHandoffDraftFromDialogOutcome(
          dialogOutcomePreview,
          mapDialogHandoffTargetToCreateHandoffDraftTarget(target),
        ),
      );
    },
    [dialogOutcomePreview],
  );

  const prepareDialogBranchDraft = React.useCallback(
    (branchId: string) => {
      const branch = dialogOutcomePreview.branches.find((entry) => entry.id === branchId);
      const baseDraft = createHandoffDraftFromDialogOutcome(
        dialogOutcomePreview,
        "existing_branch_connection",
      );

      setPreparedReviewQueueItem(null);
      setReviewQueueRuntimeState("idle");
      setReviewQueueRuntimeMessage(null);
      setPreparedHandoffDraft({
        ...baseDraft,
        title: branch
          ? `An bestehenden Zweig anknüpfen: ${branch.title}`
          : baseDraft.title,
        summary: branch?.reason ?? baseDraft.summary,
        selectedBranchIds: branch ? [branch.id] : [],
      });
    },
    [dialogOutcomePreview],
  );

  const prepareExistingMatchDraft = React.useCallback(
    (
      matchId: string,
      explicitTarget?: CreateHandoffDraftTarget,
      explicitDecision?: CitizenMatchDecision,
    ) => {
      const match = existingTopicMatchesModel.matches.find((entry) => entry.id === matchId);
      if (!match) return;
      const decision = explicitDecision ?? existingMatchDecisions[matchId] ?? null;

      setPreparedReviewQueueItem(null);
      setReviewQueueRuntimeState("idle");
      setReviewQueueRuntimeMessage(null);
      setPreparedHandoffDraft(
        createHandoffDraftFromExistingTopicMatch(
          match,
          explicitTarget ?? resolveCitizenMatchDecisionDraftTarget(match, decision),
          decision,
        ),
      );
    },
    [existingMatchDecisions, existingTopicMatchesModel.matches],
  );

  const prepareNewBranchDraft = React.useCallback(() => {
    setPreparedReviewQueueItem(null);
    setReviewQueueRuntimeState("idle");
    setReviewQueueRuntimeMessage(null);
    setPreparedHandoffDraft(
      createHandoffDraftFromDialogOutcome(dialogOutcomePreview, "new_branch"),
    );
  }, [dialogOutcomePreview]);

  const prepareTopicDeduplicationDraft = React.useCallback(() => {
    if (!primaryTopicDeduplicationCandidate) return;
    setPreparedReviewQueueItem(null);
    setReviewQueueRuntimeState("idle");
    setReviewQueueRuntimeMessage(null);
    setPreparedHandoffDraft(
      createTopicDeduplicationReviewDraft(primaryTopicDeduplicationCandidate),
    );
  }, [primaryTopicDeduplicationCandidate]);

  const queuePreparedHandoffDraftForReview = React.useCallback(async () => {
    if (!preparedHandoffDraft) return;
    if (!canQueueHandoffDraftForReview(preparedHandoffDraft)) return;
    const localReviewQueueItem = createReviewQueueItemFromHandoffDraft(preparedHandoffDraft);
    setReviewQueueRuntimeState("submitting");
    setReviewQueueRuntimeMessage(null);

    const submission = await submitCreateHandoffReviewQueueItemToRuntime(
      localReviewQueueItem,
      {
        result,
        dossierId: handoffRuntimeDossierId ?? null,
        anlassraumId: handoffRuntimeAnlassraumId ?? null,
        sourceUrls: handoffRuntimeSourceUrls,
        materialItems: handoffRuntimeMaterialItems,
      },
    );

    if (submission.ok === true) {
      setPreparedReviewQueueItem(
        markReviewQueueItemSubmittedToRuntime(
          markReviewQueueItemQueued(localReviewQueueItem),
        ),
      );
      setReviewQueueRuntimeState("submitted");
      setReviewQueueRuntimeMessage(null);
      return;
    }

    setPreparedReviewQueueItem(null);
    setReviewQueueRuntimeState(submission.blocked ? "blocked" : "error");
    setReviewQueueRuntimeMessage(submission.message);
  }, [
    preparedHandoffDraft,
    result,
    handoffRuntimeDossierId,
    handoffRuntimeAnlassraumId,
    handoffRuntimeSourceUrls,
    handoffRuntimeMaterialItems,
  ]);

  return (
    <section
      data-create-embedded-followup={embedInWorkspaceShell ? "true" : undefined}
      className={`create-chat-workspace relative mx-auto min-w-0 max-w-full overflow-x-clip ${embedInWorkspaceShell ? "space-y-4" : "pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] md:pb-10"}`}
    >
      <div
        className={
          embedInWorkspaceShell
            ? "space-y-4"
            : "grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,22rem)] lg:gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(20rem,24rem)]"
        }
      >
        <div className="space-y-4">
          <div
            className={
              embedInWorkspaceShell
                ? "space-y-4"
                : "rounded-[28px] border border-slate-200/80 bg-[color-mix(in_oklab,rgb(var(--card))_94%,rgb(var(--bg))_6%)] px-4 py-4 shadow-[0_18px_42px_rgba(2,6,23,0.06)] dark:border-[rgb(var(--border))] dark:bg-[rgb(var(--card))]"
            }
          >
            {!embedInWorkspaceShell ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <VoxyAvatar appearance="inline" variant="presenting" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
                        Voxy
                      </p>
                      <p className="mt-1 text-lg font-semibold text-[rgb(var(--fg))]">
                        {plannerClarificationRequired
                          ? locale === "en"
                            ? "I detected these topics."
                            : "Ich habe diese Themen erkannt."
                          : plannerUsesProvisionalStructure
                            ? CREATE_VISUAL_FOLLOWUP_COPY.headlineProvisional
                            : locale === "en"
                              ? "Chat workspace for your contribution"
                              : "Chat-Arbeitsstand für deinen Beitrag"}
                      </p>
                      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[rgb(var(--muted))]">
                        {plannerClarificationRequired
                          ? locale === "en"
                            ? "These strands emerge from your contribution. You decide how to continue."
                            : "Aus deinem Beitrag ergeben sich diese Stränge. Du entscheidest, wie wir weiterarbeiten."
                          : locale === "en"
                            ? "I keep the input, topics, questions, and next steps together in one workspace."
                            : "Ich halte Eingabe, Themen, Fragen und nächste Schritte in einem gemeinsamen Workspace zusammen."}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full border border-cyan-300/35 bg-cyan-500/[0.08] px-3 py-1 text-[11px] font-semibold text-cyan-950 dark:border-cyan-300/25 dark:bg-cyan-500/[0.12] dark:text-cyan-100">
                    {locale === "en" ? "Not published" : "Noch nicht veröffentlicht"}
                  </span>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-[rgb(var(--muted))]">
                  {locale === "en"
                    ? "You decide what to confirm or clarify next."
                    : "Du entscheidest als Nächstes, was stimmt oder präzisiert werden soll."}
                </p>
              </>
            ) : null}

            <div
              data-create-chat-thread
              className={`relative min-w-0 space-y-5 ${embedInWorkspaceShell ? "" : "mt-5"}`}
            >
              <UserContributionBubble text={result.sourceText} locale={locale} />
              {!hasValidatedAnalysis ? (
                <AnalysisStateBubble
                  state={analysisState}
                  message={analysisMessage}
                  onPrimaryAction={
                    analysisState === "fetch_failed" || analysisState === "ai_failed"
                      ? onRetryPlanner
                      : onPrepareLinkReview
                  }
                  onSaveOnly={onSaveOnly}
                  onDeferWork={onDeferWork}
                  locale={locale}
                  supportHandoff={supportHandoff}
                  statusRef={dynamicStatusRef}
                />
              ) : null}
              {hasValidatedAnalysis && documentAnalysis ? (
                <DocumentAnalysisBubble
                  analysis={documentAnalysis}
                  onOpenTopics={
                    showDocumentTopicOverview ? undefined : onOpenDocumentTopicOverview
                  }
                />
              ) : null}
              {hasValidatedAnalysis && showDocumentTopicOverview ? (
                <AssistantUnderstandingBubble
                  eyebrow={plannerClarificationRequired ? "Einordnung offen" : "Verstanden"}
                  headline={resolveFollowupChatHeadline({
                    plannerClarificationRequired,
                    branchCount: structureBranches.length,
                    issueMode: result.meta?.planner?.issueMode,
                  })}
                  summary={multiIssueMode
                    ? multiIssueLeadText
                    : plannerClarificationRequired
                      ? plannerClarificationLeadText
                      : dedupedCopy.prominentSummary}
                  assistantLead={assistantLead}
                  coreClaim={dedupedCopy.prominentCoreClaim}
                  showCoreBlock={showCoreBlock && !plannerClarificationRequired}
                  showAssistantLead={showAssistantLeadText && !plannerClarificationRequired}
                  stanceLabel={resolveStanceLead(dominantStance)}
                  scopeLabel={resolveScopeLabel(scopeChip)}
                >
                  {plannerUsesProvisionalStructure ? (
                    <p className="mt-3 text-sm leading-relaxed text-amber-900 dark:text-amber-100">
                      {plannerProvisionalNotice}
                    </p>
                  ) : null}
                  <InlineStructureSummary
                    visibleTopicCount={Math.max(1, displayedBranches.length)}
                    hiddenTopicCount={structureOverflowCount}
                    nextStepLabel={inlineNextStepLabel}
                    modeLabel={
                      documentAnalysis && showDocumentTopicOverview
                        ? "vollständig"
                        : showExpandedTopicPreview
                          ? "erweitert"
                          : "kompakt"
                    }
                  />
                  {visibleUnderstandingAspects.length > 0 ? (
                    <div
                      data-create-understanding-aspects
                      className="mt-4 rounded-[1.25rem] border border-cyan-200/40 bg-cyan-500/[0.05] px-4 py-3 dark:border-cyan-300/20"
                    >
                      <p className="text-[12px] font-semibold text-cyan-900 dark:text-cyan-100">
                        Aspekte
                      </p>
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {visibleUnderstandingAspects.map((aspect) => (
                          <li
                            key={aspect}
                            className="rounded-full border border-cyan-300/40 bg-[rgb(var(--bg))] px-3 py-1.5 text-[13px] text-[rgb(var(--fg))]"
                          >
                            {aspect}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {plannerClarificationRequired ? (
                    <div className="mt-4">
                      <TopicBranchPreviewGrid
                        rootTopic={rootTopic}
                        branches={displayedBranches}
                        totalTopicCount={Math.max(totalStructureTopicCount, displayedBranches.length)}
                        sourceKind={documentAnalysis ? "document" : "contribution"}
                        activeTopicLabel={activeTopicLabel}
                        selectedPrimaryTopic={selectedPrimaryTopic}
                        groupedTopicLabels={groupedTopicLabels}
                        parkedTopicLabels={parkedTopicLabels}
                        onFocusTopic={onFocusTopic}
                        onSelectPrimaryTopic={onSelectPrimaryTopic}
                        onGroupTopics={onGroupTopics}
                        onSeparateTopics={onSeparateTopics}
                        onParkTopic={onParkTopic}
                      />
                    </div>
                  ) : (
                    <div className="mt-5">
                      <TopicBranchPreviewGrid
                        rootTopic={rootTopic}
                        branches={displayedBranches}
                        totalTopicCount={Math.max(totalStructureTopicCount, displayedBranches.length)}
                        sourceKind={documentAnalysis ? "document" : "contribution"}
                        activeTopicLabel={activeTopicLabel}
                        selectedPrimaryTopic={selectedPrimaryTopic}
                        groupedTopicLabels={groupedTopicLabels}
                        parkedTopicLabels={parkedTopicLabels}
                        onFocusTopic={onFocusTopic}
                        onSelectPrimaryTopic={onSelectPrimaryTopic}
                        onGroupTopics={onGroupTopics}
                        onSeparateTopics={onSeparateTopics}
                        onParkTopic={onParkTopic}
                      />
                    </div>
                  )}
                </AssistantUnderstandingBubble>
              ) : null}
              {hasValidatedAnalysis && showTopicExpansionPrompt ? (
                <TopicExpansionPrompt
                  showLinkReviewPrompt={showLinkReviewPrompt}
                  totalTopicCount={
                    documentAnalysis?.topicCount ??
                    Math.max(displayedBranches.length + structureOverflowCount, displayedBranches.length)
                  }
                  totalSubtopicCount={
                    documentAnalysis?.subtopicCount ??
                    fullStructureBranches.reduce((sum, branch) => sum + branch.subtopics.length, 0)
                  }
                  visibleTopicCount={Math.max(1, displayedBranches.length)}
                  overflowCount={structureOverflowCount}
                  costLabel={topicExpansionCostLabel}
                  onExpandTopicPreview={onExpandTopicPreview}
                  onKeepCompactTopicPreview={onKeepCompactTopicPreview}
                  onDeferExpandedReview={onDeferExpandedReview}
                  onPrepareLinkReview={onPrepareLinkReview}
                />
              ) : null}
              {actionNotice ? <WorkspaceActionEventBubble message={actionNotice} /> : null}
              {hasValidatedAnalysis && showDocumentTopicOverview && !isConfirmed && !plannerClarificationRequired && activeBranch && activeTopicIndex > -1 ? (
                <TopicFocusPanel
                  activeBranch={activeBranch}
                  activeTopicIndex={activeTopicIndex}
                  onConfirm={onConfirm}
                  onOpenManualTopicChooser={onOpenManualTopicChooser}
                  onParkTopic={onParkTopic}
                />
              ) : null}
              {hasValidatedAnalysis && showDocumentTopicOverview ? (
                <WorkspaceActionThreadNote
                  mode={composerMode}
                  selectedPrimaryTopic={selectedPrimaryTopic}
                  factcheckMessage={factcheckMessage}
                />
              ) : null}
            </div>

            {hasValidatedAnalysis &&
            showDocumentTopicOverview &&
            !isConfirmed &&
            (!placeClarification || multiIssueMode) &&
            !plannerClarificationRequired &&
            (!activeBranch || activeTopicIndex < 0) ? (
              <div className="mt-4">
                <StructureProposalPanel
                  onConfirm={onConfirm}
                  onOpenManualTopicChooser={onOpenManualTopicChooser}
                  onEdit={onEdit}
                  onContinuePackage={onDeepenAllTopics}
                  multiIssue={multiIssueMode}
                />
              </div>
            ) : null}
            {hasValidatedAnalysis && showDocumentTopicOverview && !placeClarification && plannerClarificationRequired ? (
              <div className="mt-4">
                <PlannerClarificationPanel
                  reason={plannerClarificationReason}
                  details={plannerClarificationDetails}
                  onConfirm={onConfirm}
                  onOpenManualTopicChooser={onOpenManualTopicChooser}
                />
              </div>
            ) : null}
          </div>

          {hasValidatedAnalysis && placeClarification ? (
            <PlaceClarificationPanel
              question={placeClarification.question}
              privacyHint={placeClarification.privacyHint}
              value={continuationValue}
              onChange={onContinuationChange}
              onSubmit={onContinueConversation}
              onSkip={onSkipPlaceClarification}
              submitDisabled={continueConversationDisabled}
            />
          ) : null}

          {isConfirmed && !plannerClarificationRequired ? (
            <NextStepPanel
              onEdit={onEdit}
              onSaveQuestion={onSaveQuestion}
              onSaveTopic={onSaveTopic}
              onSaveSource={onSaveSource}
              onSaveInternal={onSaveInternal}
              onPrepareCommunity={onPrepareCommunity}
              onDeferWork={onDeferWork ?? onContinueInAccount}
              canCreateInternalWorkstate={canCreateInternalWorkstate}
              reviewRequestState={reviewRequestState}
              reviewRequestMessage={reviewRequestMessage}
              factcheckMessage={factcheckMessage}
            />
          ) : null}

          {hasValidatedAnalysis && composerMode === "manual_topic" && !placeClarification ? (
            <ManualTopicChooser
              topicOptions={Array.from(new Set(displayedBranches.map((branch) => branch.title))).slice(0, 4)}
              selectedPrimaryTopic={selectedPrimaryTopic}
              onSelectPrimaryTopic={onSelectPrimaryTopic}
            />
          ) : null}

          {showCorrectionComposer && !placeClarification && !embedInWorkspaceShell ? (
            <ContinueWritingComposer
              value={continuationValue}
              onChange={onContinuationChange}
              onSubmit={onContinueConversation}
              submitDisabled={continueConversationDisabled}
            />
          ) : null}

            {!embedInWorkspaceShell ? (
              <div className="rounded-[24px] border border-slate-200/80 bg-[color-mix(in_oklab,rgb(var(--card))_94%,rgb(var(--bg))_6%)] px-4 py-4 dark:border-[rgb(var(--border))] dark:bg-[rgb(var(--card))]">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 text-left text-sm font-semibold text-[rgb(var(--fg))]"
              aria-expanded={detailsOpen}
              onClick={() => setDetailsOpen((current) => !current)}
            >
              <span>
                {locale === "en" ? "Details & transparency" : "Details & Transparenz"}
              </span>
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${detailsOpen ? "rotate-90" : ""}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M7 4.5 13 10l-6 5.5" />
              </svg>
            </button>
            {detailsOpen ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-[24px] border border-slate-200/80 bg-[rgb(var(--bg))] px-4 py-4 dark:border-[rgb(var(--border))]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgb(var(--muted))]">
                    Kompakte Einordnung
                  </p>
                  <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[rgb(var(--fg))]">
                    {hasValidatedAnalysis ? (
                      <>
                        <li>{Math.max(1, displayedBranches.length)} sichtbare Themen bleiben getrennt im Chat.</li>
                        <li>{Math.max(1, voteQuestions.length)} offene Fragen bleiben review-first.</li>
                        <li>Quellenprüfung startet erst nach deiner Bestätigung.</li>
                        <li>Entwürfe bleiben unveröffentlicht und werden nicht automatisch übergeben.</li>
                      </>
                    ) : (
                      <>
                        <li>Ohne validierten KI-Run werden keine Themenkarten oder Zusammenfassungen gezeigt.</li>
                        <li>Der Link- oder Texteingang bleibt bis zur erfolgreichen Analyse technisch gerahmt.</li>
                        <li>Quellenprüfung wurde noch nicht durchgeführt.</li>
                      </>
                    )}
                    {plannerClarificationDetails ? <li>{plannerClarificationDetails}</li> : null}
                  </ul>
                  {hasValidatedAnalysis && plannerClarificationRequired && onRetryPlanner ? (
                    <div className="mt-4">
                      <button
                        type="button"
                        className="btn-secondary min-h-[40px] px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={onRetryPlanner}
                        disabled={isRetryPlannerPending}
                        aria-disabled={isRetryPlannerPending}
                      >
                        {isRetryPlannerPending
                          ? "Einordnung wird erneut versucht …"
                          : "Einordnung erneut versuchen"}
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-3">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 text-left text-sm font-medium text-[rgb(var(--fg))]"
                    aria-expanded={deepDiveOpen}
                    onClick={() => setDeepDiveOpen((current) => !current)}
                  >
                    <span>Vertiefte Analyse anzeigen</span>
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 20 20"
                      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${deepDiveOpen ? "rotate-90" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M7 4.5 13 10l-6 5.5" />
                    </svg>
                  </button>
                  {deepDiveOpen && hasValidatedAnalysis ? (
                    <div className="mt-4 space-y-4">
                      {plannerClarificationRequired ? (
                        <div className="rounded-[24px] border border-amber-300/30 bg-amber-500/[0.08] px-4 py-4 text-sm leading-relaxed text-amber-950 dark:border-amber-300/20 dark:bg-amber-500/[0.1] dark:text-amber-50">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-900 dark:text-amber-100">
                            {plannerTechnicalFallback ? "Vorläufige Einordnung" : "Einordnung offen"}
                          </p>
                          <p className="mt-1 text-base font-semibold">Warum wir hier noch nicht weiter automatisieren</p>
                          <p className="mt-2">
                            Wir zeigen hier bewusst keine normale Struktur mit Kern, Thema und Anschlüssen, solange die automatische Einordnung noch nicht belastbar genug ist.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <StructuredWorkstateBlock
                            locale={locale}
                            rootTopic={rootTopic}
                            topicLabels={topicLabels}
                            positionClusters={positionClusters}
                            voteQuestions={voteQuestions}
                            keyStatement={dedupedCopy.prominentCoreClaim}
                            structureBranches={structureBranches}
                            sortedSuggestions={sortedSuggestions}
                            isConfirmed={isConfirmed}
                            onEdit={openCorrection}
                            resultChangeKey={resultChangeKey}
                            sections={sections}
                            modules={contentModules}
                          />
                          <OpenQuestionCards questions={voteQuestions} />
                          <SourceHintsAndNextStepsGrid modules={contentModules} nextStepTitles={nextStepTitles} />
                        </div>
                      )}
                      <div className="space-y-3">
                        <div
                          className="rounded-2xl border border-slate-200/80 bg-[rgb(var(--bg))] px-4 py-3 dark:border-[rgb(var(--border))]"
                          data-dialog-runtime-status={dialogIntelligenceUiSource.kind}
                        >
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[rgb(var(--muted))]">
                            Dialog Intelligence
                          </p>
                          <p className="mt-2 text-sm font-medium text-[rgb(var(--fg))]">
                            {dialogIntelligenceUiSource.title}
                          </p>
                          <p className="mt-1 text-sm leading-relaxed text-[rgb(var(--muted))]">
                            {dialogIntelligenceUiSource.detail}
                          </p>
                        </div>

                        <DialogResultsHandoffPanel
                          outcome={dialogOutcomePreview}
                          onConfirmStandpoint={onConfirm}
                          onSelectHandoff={prepareDialogHandoffDraft}
                          onSelectBranch={prepareDialogBranchDraft}
                        />
                      </div>

                      <div className="mt-4">
                        <ExistingTopicMatchesPanel
                          model={existingTopicMatchesModel}
                          decisions={existingMatchDecisions}
                          onSelectMatch={(matchId) => prepareExistingMatchDraft(matchId)}
                          onCountSimilarOpinion={(matchId) =>
                            prepareExistingMatchDraft(matchId, "opinion_count")
                          }
                          onPrepareReview={(matchId) => prepareExistingMatchDraft(matchId)}
                          onMatchDecision={(matchId, decision) => {
                            const match = existingTopicMatchesModel.matches.find(
                              (entry) => entry.id === matchId,
                            );
                            if (!match) return;
                            setExistingMatchDecisions((current) => ({
                              ...current,
                              [matchId]: decision,
                            }));
                            prepareExistingMatchDraft(
                              matchId,
                              resolveCitizenMatchDecisionDraftTarget(
                                match,
                                decision,
                              ),
                              decision,
                            );
                          }}
                          onStartNewBranch={prepareNewBranchDraft}
                        />
                      </div>

                      {primaryTopicDeduplicationCandidate ? (
                        <div className="mt-4 rounded-[24px] border border-amber-300/35 bg-amber-500/[0.08] px-4 py-4 text-sm dark:border-amber-300/20 dark:bg-amber-500/[0.1]">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-950 dark:text-amber-100">
                            Mögliche Dopplung erkannt
                          </p>
                          <h3 className="mt-2 text-base font-semibold text-[rgb(var(--fg))]">
                            {primaryTopicDeduplicationCandidate.title}
                          </h3>
                          <p className="mt-2 text-sm leading-relaxed text-[rgb(var(--fg))]">
                            Ähnliche Beiträge können redaktionell zusammengeführt oder getrennt gehalten werden.
                            Es wurde noch nichts automatisch zusammengeführt.
                          </p>
                          <p className="mt-2 text-sm leading-relaxed text-[rgb(var(--muted))]">
                            {primaryTopicDeduplicationCandidate.summary}
                          </p>
                          {primaryTopicDeduplicationState ? (
                            <p className="mt-2 text-xs leading-relaxed text-[rgb(var(--muted))]">
                              {primaryTopicDeduplicationState}
                            </p>
                          ) : null}
                          {primaryTopicGraphMutationState ? (
                            <p className="mt-2 text-xs leading-relaxed text-[rgb(var(--muted))]">
                              {primaryTopicGraphMutationState}
                            </p>
                          ) : null}
                          {canQueueTopicDeduplicationReview(primaryTopicDeduplicationCandidate) ? (
                            <div className="mt-3">
                              <button
                                type="button"
                                onClick={prepareTopicDeduplicationDraft}
                                className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/[0.14] px-3 py-1.5 text-xs font-medium text-amber-950 transition hover:bg-amber-500/[0.2] dark:border-amber-300/30 dark:bg-amber-500/[0.18] dark:text-amber-50"
                              >
                                Mögliche Zusammenführung prüfen
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {preparedHandoffDraft ? (
                        <div className="mt-4">
                          <CreateHandoffDraftSummary
                            draft={preparedHandoffDraft}
                            reviewQueueItem={preparedReviewQueueItem}
                            onQueueForReview={queuePreparedHandoffDraftForReview}
                            runtimeSubmissionState={reviewQueueRuntimeState}
                            runtimeSubmissionMessage={reviewQueueRuntimeMessage}
                          />
                        </div>
                      ) : null}
                    </div>
                  ) : deepDiveOpen ? (
                    <div className="mt-4 rounded-[24px] border border-slate-200/80 bg-[rgb(var(--bg))] px-4 py-4 text-sm leading-relaxed text-[rgb(var(--fg))] dark:border-[rgb(var(--border))]">
                      Vertiefte Analyse erscheint erst nach einem validierten KI-Run auf dem tatsächlichen Quellinhalt.
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
              </div>
            ) : null}
        </div>
      </div>
    </section>
  );
}
