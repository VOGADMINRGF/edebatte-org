"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { type UseCaseId } from "@/components/analyze/AnalyzeWorkspace";
import type { AccountOverview } from "@features/account/types";
import type { CreateEntitlements } from "@/lib/server/entitlements/createEntitlements";
import type { CreateMode } from "@/features/create/intents";
import { useLocale } from "@/context/LocaleContext";
import { type CreateIntakeContext } from "@/features/create/intakeContext";
import {
  resolveCreateOrchestratorIntentContract,
  type CreateEntryIntent,
  type CreateEntryMode,
} from "@/features/create/orchestratorIntentContract";
import {
  CREATE_PRODUCT_MODE_VALUES,
  type CreateProductMode,
} from "@/features/create/createProductModes";
import type { CreateIntent as CreateContextIntent } from "@/features/create/intents";
import {
  mapCreateIntentToProductMode,
  mapProductModeToCreateIntent,
  resolveInitialCreateIntent,
  type CreateIntent,
} from "@/features/create/intentFlows";
import { normalizeInternalRedirectPath } from "@/features/create/finalizeRedirect";
import type { RundenCreateHandoffIntegrityState } from "@/features/create/rundenCreateHandoffIntegrity";
import {
  getCreateComposerTexts,
  getCreateContextAnchorDefinitions,
  type CreateSurfaceTexts,
  type CreateContextAnchorDefinition,
  getCreateHelperLinks,
  getCreateSurfaceModeDefinitions,
  getCreateSurfaceTexts,
  resolveCreateSurfaceLocale,
  resolveCreateContextAnchorById,
  resolveCreateModeDefinition,
} from "@/features/create/createSurfaceConfig";
import {
  getOperatorCreateTexts,
  resolveOperatorLocale,
  type OperatorCreateTexts,
} from "@/features/i18n/operatorSystemTexts";
import SharedCreateComposer from "@/features/create/SharedCreateComposer";
import FrontendAiTransparencyPanel from "@/features/create/FrontendAiTransparencyPanel";
import { buildCreateFrontendAiTransparencyReadModel } from "@/features/create/frontendAiTransparency";
import {
  buildCreateCandidatePreviewReadModel,
  hasValidatedCreateSemanticOutput,
} from "@/features/create/createCandidatePreview";
import CreateWorkspaceShell from "@/features/create/CreateWorkspaceShell";
import type { CreateWorkspaceShellPhase } from "@/features/create/CreateWorkspaceShell";
import { buildCreateWorkspaceStages } from "@/features/create/CreateWorkspaceShell";
import type {
  CreateAnalyzeRuntimeTrace,
  CreatePlannerRuntimeTrace,
} from "@/features/create/aiOrchestrationProvenanceTrace";
import { usePrivacyGate } from "@/components/privacy/PrivacyGateProvider";
import {
  buildCreateStructureBranches,
  normalizeDocumentAnalysisSummary,
  type CreateIntelligentFollowupResult,
} from "@/features/create/intelligentFollowupContract";
import { buildCreateTechnicalFollowup } from "@/features/create/intelligentFollowupResults";
import { createMutationRequestHeaders } from "@/features/create/createMutationSecurityContract";
import {
  buildCreateFollowupPrimaryCtaHref,
  buildCreateFollowupTargetHref,
} from "@/features/create/followupTargetHref";
import CreateVisualFollowup, {
  deriveCreateStructureOverviewMetrics,
} from "@/features/create/CreateVisualFollowup";
import CreateDebattenstandSidecar, {
  CreateDebattenstandStatusBar,
} from "@/features/create/CreateDebattenstandSidecar";
import { deriveCreateDebattenstandModel } from "@/features/create/createDebattenstandSelector";
import {
  buildCreateHandoffDraft,
  buildCreateHandoffTargetHref,
  readCreateHandoffDraft,
  saveCreateHandoffDraft,
  type CreateHandoffAction,
} from "@/features/create/createHandoff";
import { resolveCreateHandoffJourneySummary } from "@/features/b2cJourney/statusContract";
import CreateLinkIntakeClarification from "@/features/create/CreateLinkIntakeClarification";
import {
  buildCreateLinkIntakeMeta,
  buildCreateLinkSourceNotice,
  detectCreateLinkIntake,
  type CreateLinkIntentOptionId,
  type CreateLinkIntakeDetection,
} from "@/features/create/linkIntake";
import { buildCanonicalDossierHref } from "@/components/dossier/runtimeTruth";
import {
  buildCreateAttachmentMaterialItems,
  resolveMaterialRouting,
} from "@/features/create/materialRouting";
import type { RequestScopeSummary } from "@/lib/server/auth/requestScope";
import {
  createStartDraftContext,
  saveStartDraftContext,
  type StartDraftPreview,
} from "@/features/start/startDraftContext";
import CreateDraftNextActionGate from "./CreateDraftNextActionGate";
import CreateStartDraftHandoff from "./CreateStartDraftHandoff";
import { useCreateStartDraftRestore } from "./createStartDraftRestore";
import { VoxyAvatar } from "@/components/voxy/VoxyGuide";
import {
  buildCreateSupportFailureCopy,
  getCreateVoxyCopy,
  type CreateVoxyLocale,
} from "@/features/create/createVoxySupportCopy";
import type { CreateSupportHandoffPublic } from "@/features/support/createSupportTicketContract";
import {
  isCreateIntelligentFollowupAbortError,
  resolveCreateIntakeTiming,
  startCreateIntelligentFollowupDeadline,
  type CreateIntelligentFollowupDeadline,
} from "@/features/create/createFastIntakeTiming";

export type CreateClientProps = {
  initialEntitlements: CreateEntitlements;
  overview: AccountOverview;
  dossierId?: string | null;
  initialAnlassraumId?: string | null;
  initialMode?: CreateMode;
  initialIntentParam?: string | null;
  initialModeParam?: string | null;
  initialEntryIntent?: CreateEntryIntent;
  initialEntryMode?: CreateEntryMode;
  initialText?: string | null;
  initialIntakeContext?: CreateIntakeContext | null;
  initialReturnTo?: string | null;
  initialNextActionParam?: string | null;
  initialRequestScope?: RequestScopeSummary | null;
  initialRundenCreateHandoff?: RundenCreateHandoffIntegrityState | null;
};

export const CREATE_PRODUCT_MODES = CREATE_PRODUCT_MODE_VALUES;

const MIN_INTENT_INPUT_LENGTH = 24;

function createClientCorrelationId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `create-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildCreateToRundenHref(text: string): string {
  const normalized = text.trim();
  if (!normalized) return "/runden";
  const params = new URLSearchParams();
  params.set("prefill", normalized.slice(0, 2000));
  params.set("from", "create");
  return `/runden?${params.toString()}`;
}

function dedupeCreatePlannerTopicLabels(labels: string[]): string[] {
  const seen = new Set<string>();
  const topics: string[] = [];
  for (const entry of labels) {
    const normalized = entry.trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    topics.push(normalized);
  }
  return topics;
}

function buildCreatePlannerFollowupTopicLabels(
  followup: CreateIntelligentFollowupResult,
): string[] {
  return dedupeCreatePlannerTopicLabels(
    followup.understanding.topics.map((topic) => topic.label),
  ).slice(0, 5);
}

function buildCreatePlannerFollowupPreview(params: {
  followup: CreateIntelligentFollowupResult;
  topicLabel?: string | null;
}): StartDraftPreview {
  const topicLabels = params.topicLabel
    ? [params.topicLabel]
    : buildCreatePlannerFollowupTopicLabels(params.followup);
  const structureBranches = buildCreateStructureBranches(params.followup, 3);
  const focusedBranch = params.topicLabel
    ? structureBranches.find(
        (branch) =>
          branch.title === params.topicLabel ||
          branch.topics.includes(params.topicLabel) ||
          branch.topicTags.includes(params.topicLabel),
      ) ?? null
    : null;
  const plannerQuestions = params.followup.meta?.planner
    ? [
        ...params.followup.meta.planner.plannerOpenQuestions,
        ...params.followup.meta.planner.openQuestions,
      ]
    : [];
  const openQuestions = dedupeCreatePlannerTopicLabels(
    [
      ...(focusedBranch?.voteQuestions ?? []),
      ...(focusedBranch?.openReviewPoints ?? []),
      params.followup.understanding.openQuestion ?? "",
      ...plannerQuestions,
    ].filter(Boolean),
  ).slice(0, 4);

  return {
    contributionType: params.topicLabel ? "Themenvertiefung" : "Mehrthemen-Entwurf",
    possibleTopics: topicLabels,
    openQuestions,
    suggestedNextSteps: params.topicLabel
      ? [
          `${params.topicLabel} im Entwurf vertiefen`,
          "Dossier vorbereiten",
          "Quellenprüfung vorbereiten",
        ]
      : [
          "Alle Themen im Entwurf vertiefen",
          "Einzelnes Thema gezielt vertiefen",
          "Später im Account weiterarbeiten",
        ],
  };
}

export const CREATE_INTELLIGENT_FOLLOWUP_SECTION_LABELS = {
  understanding: "eDebatte hat deinen Beitrag strukturiert",
  extracted: "So hängt dein Beitrag zusammen",
  connections: "Passende nächste Schritte",
  voteNotice: "Deine Stimme wird nicht automatisch abgegeben.",
} as const;

export function shouldRenderCreateIntelligentFollowup(params: {
  hasStarted: boolean;
  followup: CreateIntelligentFollowupResult | null;
}): boolean {
  if (!params.hasStarted) return false;
  return Boolean(params.followup);
}

export function shouldShowCreateFollowupQuestionCard(params: {
  showPostInputModules: boolean;
  productMode: CreateProductMode;
}): boolean {
  if (!params.showPostInputModules) return false;
  return params.productMode !== "analyze";
}

export function resolveCreatePostStartSectionOrder(params: {
  showIntelligentFollowup: boolean;
  showPostInputModules: boolean;
  showFollowupQuestionCard: boolean;
  pickerEnabled: boolean;
}): string[] {
  const sections: string[] = [];
  if (params.showIntelligentFollowup) sections.push("intelligent-followup");
  if (params.showPostInputModules && !params.showIntelligentFollowup) sections.push("post-start-meta");
  if (params.showFollowupQuestionCard) sections.push("followup-question");
  if (params.showPostInputModules && params.pickerEnabled) sections.push("context-picker");
  return sections;
}

export function resolveCreateAnlassraumTargetHref(
  followup: CreateIntelligentFollowupResult | null,
): string {
  if (!followup) return "/runden?view=active&from=create";
  const roomSuggestion =
    followup.suggestions.find((suggestion) => suggestion.kind === "anlassraum") ??
    followup.suggestions.find((suggestion) => suggestion.kind === "new_anlassraum") ??
    null;
  const suggestedHref = roomSuggestion?.href?.trim() ?? "";
  if (suggestedHref && !suggestedHref.startsWith("/create")) {
    return suggestedHref;
  }
  if (followup.meta?.planner?.plannerTopic) {
    return `/runden?view=active&from=create&topic=${encodeURIComponent(followup.meta.planner.plannerTopic)}`;
  }
  return "/runden?view=active&from=create";
}

function isPlannerReadyForStructuredHandoff(
  followup: CreateIntelligentFollowupResult | null,
): boolean {
  const planner = followup?.meta?.planner ?? null;
  if (!planner) return false;
  return planner.qualityStatus === "specific" && planner.plannerDegraded === false;
}

type CreateProductModeConfig = ReturnType<typeof resolveCreateModeDefinition> & {
  preferredUseCase: UseCaseId;
  preferredCreateMode?: CreateMode;
};

const CREATE_PRODUCT_MODE_INTERNAL_CONFIG: Record<
  CreateProductMode,
  Pick<CreateProductModeConfig, "preferredUseCase" | "preferredCreateMode">
> = {
  analyze: {
    preferredUseCase: "civic",
    preferredCreateMode: "source",
  },
  media: {
    preferredUseCase: "journalism",
    preferredCreateMode: "source",
  },
  guided: {
    preferredUseCase: "agenda",
    preferredCreateMode: "ai",
  },
};

type CreateContextPickerItem = {
  anlassraumId: string;
  title: string;
  summary: string;
  topicKey: string | null;
  anlassraumType: string | null;
  anlassraumStatus: string | null;
  sourceMode: string | null;
  outputStatus: string;
  updatedAt: string | null;
};

type ContextLoadState = "idle" | "loading" | "ready" | "error";

type GateState =
  | { status: "loading" }
  | { status: "anon" }
  | { status: "allowed"; entitlements: CreateEntitlements }
  | { status: "blocked"; entitlements: CreateEntitlements };

type CreatePrimaryIntakeSnapshot = {
  intakeText: string;
  hasStarted: boolean;
  updatedAt: string;
};

type CreateFollowupSurface = "none" | "lightweight" | "analysis";
export type { CreateFollowupSurface };

type CreateReviewRequestState = "idle" | "saving" | "saved" | "error";

type PersistedCandidateDossierReviewRecordState = {
  reviewRecordId: string;
  selectedAction: CreateHandoffAction;
  sourceText: string | null;
  dossierRuntime?: {
    sourceReviewItemId: string;
    dossierRuntimeId: string | null;
    runtimeStatus:
      | "draft"
      | "queued_for_review"
      | "approved_for_creation"
      | "created"
      | "rejected"
      | "blocked"
      | "archived";
    dossierRuntimeState:
      | "dossier_runtime_draft"
      | "dossier_review_draft"
      | "persisted_dossier_runtime_record";
    dossierTargetState:
      | "dossier_runtime_draft"
      | "dossier_review_draft"
      | "persisted_dossier_runtime_record";
    persistenceState:
      | "persisted_review_record"
      | "persisted_dossier_runtime_record";
    reviewState: "review_required";
    publishState: "not_published" | "no_auto_publish";
    graphTargetState: "planned_not_active";
    auditRef: string | null;
    missingRuntimeTruth: string[];
  } | null;
};

type CreateLinkClarificationState = {
  detection: CreateLinkIntakeDetection;
  selectedIntentId: CreateLinkIntentOptionId | null;
  additionalContext: string;
};

export type CreateLightweightFollowupSnapshot = {
  originalText: string;
  understandingLine: string;
};

export function buildCreateLightweightFollowupSnapshot(params: {
  intakeText: string;
  modeLabel: string;
  contextAnchorLabel?: string | null;
  surfaceTexts: Pick<CreateSurfaceTexts, "followupUnderstandingLine">;
}): CreateLightweightFollowupSnapshot {
  const originalText = params.intakeText.trim();
  const understandingLabel = String(params.contextAnchorLabel ?? "").trim() || params.modeLabel;
  return {
    originalText,
    understandingLine: params.surfaceTexts.followupUnderstandingLine(understandingLabel),
  };
}

const EN_ACTION_NOTICE_BY_DE = new Map<string, string>([
  ["Vorbereiteter Arbeitsstand geladen. Du kannst jetzt überarbeiten und neu einordnen.", "Your prepared workspace has loaded. You can now revise and classify it again."],
  ["Vorbereiteter Arbeitsstand geladen. Du kannst jetzt weiterbearbeiten.", "Your prepared workspace has loaded. You can continue editing it."],
  ["Schreib kurz, was ich anpassen oder ergänzen soll.", "Briefly describe what I should change or add."],
  ["Aussage schärfen geöffnet.", "Statement refinement opened."],
  ["Die Themen werden wieder getrennt weitergeführt.", "The topics will be continued separately."],
  ["Themen ändern geöffnet.", "Topic editing opened."],
  ["Bitte beschreibe zuerst deinen Beitrag.", "Please describe your contribution first."],
  ["Dieser Schritt ist in diesem Arbeitsstand noch nicht verfügbar.", "This step is not available in the current workspace yet."],
  ["Prüfstatus konnte nicht gespeichert werden. Bitte erneut versuchen.", "The review status could not be saved. Please try again."],
  ["Dieser Schritt braucht zuerst einen bestätigbaren Arbeitsstand.", "This step requires a confirmable workspace first."],
  ["Bitte bestätige das Thema zuerst genauer oder sende einen Bericht an die Redaktion.", "Please confirm the topic more precisely or send a report to the editorial team."],
  ["Der vorbereitete Beitrag konnte nicht gespeichert werden. Bitte erneut versuchen.", "The prepared contribution could not be saved. Please try again."],
  ["Bitte wähle zuerst ein Hauptthema, bevor wir einen Anlassraum vorbereiten.", "Please choose a main topic before we prepare a discussion space."],
  ["Dein Beitrag ist vorbereitet. Wähle jetzt einen Anlassraum oder starte einen neuen.", "Your contribution is prepared. Choose a discussion space or start a new one."],
  ["Bitte wähle ein Thema für die Vertiefung.", "Please choose a topic to explore."],
  ["Das weitere Thema wird jetzt angezeigt.", "The additional topic is now visible."],
  ["Alle erkannten Themen sind jetzt geöffnet.", "All detected topics are now open."],
  ["Du arbeitest zunächst mit der kompakten Themenansicht weiter.", "You will continue with the compact topic view for now."],
  ["Ich habe gerade keinen Link erkannt.", "I could not detect a link."],
  ["Vollständige Auswertung bleibt vorerst zurückgestellt.", "The full analysis remains deferred for now."],
  ["Interne Notizen sind nur im Admin-Kontext verfügbar.", "Internal notes are available only in the admin context."],
  ["Quellenmodus geöffnet.", "Source mode opened."],
]);

function localizeCreateActionNotice(
  locale: CreateVoxyLocale,
  notice: string | null,
) {
  if (!notice || locale !== "en") return notice;
  const exact = EN_ACTION_NOTICE_BY_DE.get(notice);
  if (exact) return exact;
  if (notice.endsWith(" wurde fokussiert.")) {
    return `${notice.slice(0, -" wurde fokussiert.".length)} is now focused.`;
  }
  if (notice.endsWith(" ist jetzt dein Fokus.")) {
    return `${notice.slice(0, -" ist jetzt dein Fokus.".length)} is now your focus.`;
  }
  if (notice.endsWith(" wurde geparkt.")) {
    return `${notice.slice(0, -" wurde geparkt.".length)} has been set aside.`;
  }
  if (notice.endsWith(" werden gemeinsam weitergeführt.")) {
    return `${notice.slice(0, -" werden gemeinsam weitergeführt.".length)} will be continued together.`;
  }
  if (/\b(Bitte|Beitrag|Entwurf|Prüfung|Arbeitsstand|wurde|werden|konnte|geöffnet|vorbereitet)\b/.test(notice)) {
    return "The requested action could not be completed. Please try again.";
  }
  return notice;
}

function CreateSubmittedContributionBubble(props: {
  text: string;
  locale: CreateVoxyLocale;
}) {
  return (
    <div className="create-chat-message flex min-w-0 justify-end">
      <div className="w-full min-w-0 max-w-[46rem] sm:w-auto sm:min-w-[42%]">
        <p className="text-sm font-semibold text-[rgb(var(--muted))]">
          {props.locale === "en" ? "You" : "Du"}
        </p>
        <div className="mt-2 rounded-2xl rounded-tl-sm border border-[rgb(var(--border))] bg-[color-mix(in_oklab,rgb(var(--card))_88%,rgb(var(--bg))_12%)] px-4 py-3">
          <p className="whitespace-pre-wrap break-words text-base leading-relaxed text-[rgb(var(--fg))] [overflow-wrap:anywhere] md:text-[17px]">
            {props.text}
          </p>
        </div>
      </div>
    </div>
  );
}

function CreateAssistantStatusBubble(props: {
  eyebrow?: string;
  title: string;
  body: string;
  notice?: string | null;
  announce?: boolean;
}) {
  return (
    <div
      className="create-chat-message flex items-start gap-3"
      data-create-voxy-intro="dialog"
      role={props.announce ? "status" : undefined}
      aria-live={props.announce ? "polite" : undefined}
      aria-atomic={props.announce ? "true" : undefined}
    >
      <div className="mt-1 shrink-0">
        <VoxyAvatar
          appearance="inline"
          compact
          variant="presenting"
        />
      </div>
      <div className="w-full min-w-0 max-w-[46rem] flex-1 break-words [overflow-wrap:anywhere]">
        <p className="text-sm font-semibold text-[rgb(var(--muted))]">Voxy</p>
        <div className="mt-2 rounded-2xl rounded-tl-sm border border-[rgb(var(--border))] bg-[color-mix(in_oklab,rgb(var(--card))_92%,rgb(var(--bg))_8%)] px-4 py-3.5 md:px-5 md:py-4">
          {props.eyebrow ? (
            <p className="text-sm font-medium text-[rgb(var(--muted))]">
              {props.eyebrow}
            </p>
          ) : null}
          <p className="mt-1 text-base font-semibold text-[rgb(var(--fg))] md:text-lg">{props.title}</p>
          <p className="mt-2 text-[15px] leading-relaxed text-[rgb(var(--fg))] md:text-base">{props.body}</p>
          {props.notice ? (
            <p className="mt-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2 text-sm text-[rgb(var(--fg))]">
              {props.notice}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const CREATE_PRIMARY_INTAKE_STORAGE_KEY_PREFIX = "vog_create_primary_intake_v1";

export function buildCreatePrimaryIntakeStorageKey(userId?: string | null): string {
  const normalizedUserId = String(userId ?? "").trim();
  if (!normalizedUserId) {
    throw new Error("authenticated_create_user_required");
  }
  return `${CREATE_PRIMARY_INTAKE_STORAGE_KEY_PREFIX}:${normalizedUserId}`;
}

export function parseCreatePrimaryIntakeSnapshot(raw: string | null): CreatePrimaryIntakeSnapshot | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CreatePrimaryIntakeSnapshot>;
    if (!parsed || typeof parsed !== "object") return null;
    const intakeText = typeof parsed.intakeText === "string" ? parsed.intakeText : "";
    const hasStarted = parsed.hasStarted === true;
    if (!hasPrimaryIntakeText(intakeText) && !hasStarted) return null;
    return {
      intakeText,
      hasStarted,
      updatedAt:
        typeof parsed.updatedAt === "string" && parsed.updatedAt.trim()
          ? parsed.updatedAt
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function deriveGate(entitlements: CreateEntitlements): GateState {
  if (!entitlements.isAuthenticated) return { status: "anon" };
  if (!entitlements.canSubmitStatement && !entitlements.canSubmitContribution) {
    return { status: "blocked", entitlements };
  }
  return { status: "allowed", entitlements };
}

function normalizeAnlassraumId(value?: string | null): string | null {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return null;
  if (!/^[a-f0-9]{24}$/.test(normalized)) return null;
  return normalized;
}

function membershipStatusLabel(value: RequestScopeSummary["membershipStatus"] | string | null | undefined): string {
  switch (value) {
    case "verified":
    case "organization_verified":
    case "unit_verified":
      return "Organisations-verifiziert";
    case "limited":
      return "Zugriff eingeschränkt";
    case "pending":
    case "evidence_required":
    case "operator_review_required":
      return "In Prüfung";
    case "suspended":
      return "Zugang pausiert";
    case "revoked":
      return "Widerrufen";
    default:
      return "Noch kein bestätigter Scope";
  }
}

function buildCreateScopeNotice(scope: RequestScopeSummary | null): {
  title: string;
  body: string;
  tone: "neutral" | "operator" | "limited";
} | null {
  if (!scope) return null;
  if (scope.isOperatorMode) {
    return {
      title: "Entwurf wird geprüft",
      body:
        "Dein Beitrag wird nicht automatisch veröffentlicht. Er bleibt als Entwurf erhalten, bis du vor Veröffentlichung bewusst weitergehst.",
      tone: "operator",
    };
  }
  if (scope.organizationId) {
    const organizationLabel = scope.organizationLabel ?? "deiner Organisation";
    const regionPart =
      scope.regionIds.length > 0
        ? ` ${scope.regionIds.length} Regionen sind im bestätigten Scope vorhanden.`
        : " Ein Regionsscope ist noch nicht bestätigt.";
    return {
      title: `${organizationLabel} · ${membershipStatusLabel(scope.membershipStatus)}`,
      body:
        "Wenn du hier speicherst oder weiterführst, bleibt der Arbeitsstand im Bereich deiner Organisation und wird vor Veröffentlichung geprüft." +
        regionPart,
      tone: "neutral",
    };
  }
  return {
    title: membershipStatusLabel(scope.membershipStatus),
    body:
      "Du kannst den Arbeitsstand vorbereiten, aber noch ohne bestätigten Organisationsbereich. Nichts wird automatisch veröffentlicht.",
    tone: "limited",
  };
}

export function hasPrimaryIntakeText(value?: string | null): boolean {
  return Boolean(String(value ?? "").trim());
}

export function shouldShowCreatePostInputModules(params: {
  hasStarted: boolean;
  intakeText: string;
  hasMaterialContext?: boolean;
}): boolean {
  if (!params.hasStarted) return false;
  return hasPrimaryIntakeText(params.intakeText) || params.hasMaterialContext === true;
}

export function getCreateContextAnchorsForMode(params: {
  anchors: readonly CreateContextAnchorDefinition[];
  mode: CreateProductMode;
  maxItems?: number;
}): readonly CreateContextAnchorDefinition[] {
  const maxItems = Math.max(1, params.maxItems ?? 3);
  const modeAnchors = params.anchors.filter((anchor) => anchor.mode === params.mode);
  if (modeAnchors.length > 0) {
    return modeAnchors.slice(0, maxItems);
  }
  return params.anchors.slice(0, maxItems);
}

export function buildGuidedWorkspaceText(params: {
  intakeText: string;
  guidedBridgeAnswer: string;
  guidedWorkspacePrefix?: string;
}): string {
  const intake = params.intakeText.trim();
  const guidedAnswer = params.guidedBridgeAnswer.trim();
  const prefix = params.guidedWorkspacePrefix?.trim() || "Geführter Fokus";
  if (!guidedAnswer) return intake;
  if (!intake) return guidedAnswer;
  return `${intake}\n\n${prefix}:\n${guidedAnswer}`;
}

export function shouldRenderCreateAnalyzeWorkspace(params: {
  followupActivated: boolean;
  hasStarted: boolean;
  intakeText: string;
  hasMaterialContext?: boolean;
  productMode: CreateProductMode;
  guidedBridgeConfirmed: boolean;
}): boolean {
  if (!params.followupActivated) return false;
  const postInputReady = shouldShowCreatePostInputModules({
    hasStarted: params.hasStarted,
    intakeText: params.intakeText,
    hasMaterialContext: params.hasMaterialContext,
  });
  if (!postInputReady) return false;
  if (params.productMode !== "guided") return true;
  return params.guidedBridgeConfirmed;
}

export function resolveFollowupSurfaceOnStart(productMode: CreateProductMode): CreateFollowupSurface {
  if (productMode === "media") return "analysis";
  if (productMode === "analyze") return "lightweight";
  return "none";
}

export function resolveInitialCreateProductMode(params: {
  initialIntentParam?: string | null;
  initialModeParam?: string | null;
  initialEntryIntent?: CreateEntryIntent;
  initialEntryMode?: CreateEntryMode;
  initialMode?: CreateMode;
}): CreateProductMode {
  return mapCreateIntentToProductMode(
    resolveInitialCreateIntent({
      rawIntentParam: params.initialIntentParam,
      rawModeParam: params.initialModeParam,
      initialEntryIntent: params.initialEntryIntent,
      initialEntryMode: params.initialEntryMode,
      initialMode: params.initialMode,
    }),
  );
}

export function resolveCreateProductModeConfig(
  mode: CreateProductMode,
  locale: string = "de",
): CreateProductModeConfig {
  const surfaceConfig = resolveCreateModeDefinition(mode, resolveCreateSurfaceLocale(locale));
  const internalConfig = CREATE_PRODUCT_MODE_INTERNAL_CONFIG[mode];
  return {
    ...surfaceConfig,
    ...internalConfig,
  };
}

function renderRundenContextLabel(context?: CreateIntakeContext | null): string | null {
  if (!context) return null;
  const primaryLabel =
    String(context.signalTitle ?? "").trim() ||
    String(context.sourceLabel ?? "").trim() ||
    String(context.clusterHint ?? "").trim();
  if (!primaryLabel) return null;
  return primaryLabel;
}

function isRundenSourceContext(context?: CreateIntakeContext | null): boolean {
  const source = String(context?.source ?? "").trim().toLowerCase();
  const reason = String(context?.reason ?? "").trim().toLowerCase();
  return source === "runden" || reason.startsWith("round_");
}

function buildRundenReturnHref(anlassraumId?: string | null): string {
  const params = new URLSearchParams();
  params.set("view", "active");
  const normalizedAnlassraumId = normalizeAnlassraumId(anlassraumId);
  if (normalizedAnlassraumId) {
    params.set("anlassraumId", normalizedAnlassraumId);
  }
  return `/runden?${params.toString()}`;
}

export default function CreateClient({
  initialEntitlements,
  overview,
  dossierId,
  initialAnlassraumId,
  initialMode,
  initialIntentParam,
  initialModeParam,
  initialEntryIntent,
  initialEntryMode,
  initialText,
  initialIntakeContext,
  initialReturnTo,
  initialNextActionParam,
  initialRequestScope,
  initialRundenCreateHandoff,
}: CreateClientProps) {
  const privacyGate = usePrivacyGate();
  const router = useRouter();
  const { locale } = useLocale();
  const surfaceLocale = resolveCreateSurfaceLocale(locale);
  const voxyCopy = React.useMemo(
    () =>
      getCreateVoxyCopy(
        surfaceLocale as CreateVoxyLocale,
        overview.displayName,
      ),
    [overview.displayName, surfaceLocale],
  );
  const surfaceTexts = React.useMemo(() => getCreateSurfaceTexts(surfaceLocale), [surfaceLocale]);
  const surfaceComposerTexts = React.useMemo(
    () => getCreateComposerTexts(surfaceLocale),
    [surfaceLocale],
  );
  const surfaceModeDefinitions = React.useMemo(
    () => getCreateSurfaceModeDefinitions(surfaceLocale),
    [surfaceLocale],
  );
  const allSurfaceContextAnchors = React.useMemo(
    () => getCreateContextAnchorDefinitions(surfaceLocale),
    [surfaceLocale],
  );
  const surfaceHelperLinks = React.useMemo(() => getCreateHelperLinks(surfaceLocale), [surfaceLocale]);
  const operatorLocale = resolveOperatorLocale(locale);
  const text = getOperatorCreateTexts(operatorLocale);
  const scopeNotice = React.useMemo(
    () => buildCreateScopeNotice(initialRequestScope ?? null),
    [initialRequestScope],
  );

  const [entitlements, setEntitlements] = React.useState<CreateEntitlements>(initialEntitlements);
  const [gate, setGate] = React.useState<GateState>(() => deriveGate(initialEntitlements));
  const [productMode, setProductMode] = React.useState<CreateProductMode>(() =>
    resolveInitialCreateProductMode({
      initialIntentParam,
      initialModeParam,
      initialEntryIntent,
      initialEntryMode,
      initialMode,
    }),
  );

  const [contextItems, setContextItems] = React.useState<CreateContextPickerItem[]>([]);
  const [, setContextLoadState] = React.useState<ContextLoadState>("idle");
  const [, setContextLoadError] = React.useState<string | null>(null);
  const [selectedAnlassraumId, setSelectedAnlassraumId] = React.useState<string | null>(() =>
    normalizeAnlassraumId(initialAnlassraumId),
  );
  const [, setSelectionInfo] = React.useState<string | null>(() => {
    if (!initialAnlassraumId) return null;
    if (normalizeAnlassraumId(initialAnlassraumId)) return null;
    return text.selectionInfoInvalidContext;
  });
  const intakeStorageKey = React.useMemo(
    () => buildCreatePrimaryIntakeStorageKey(overview.userId),
    [overview.userId],
  );
  const intakeRestoreInfoText =
    surfaceLocale === "en"
      ? "Your draft was restored from local browser storage."
      : "Dein Entwurf wurde wiederhergestellt.";
  const contextLoadedRef = React.useRef(false);
  const intakeHydratedRef = React.useRef(false);
  const [intakeText, setIntakeText] = React.useState(initialText ?? "");
  const [composerAttachments, setComposerAttachments] = React.useState<File[]>([]);
  const [activeContextAnchorId, setActiveContextAnchorId] = React.useState<CreateContextIntent | null>(null);
  const [hasStarted, setHasStarted] = React.useState<boolean>(false);
  const [isStarting, setIsStarting] = React.useState(false);
  const [linkClarificationState, setLinkClarificationState] =
    React.useState<CreateLinkClarificationState | null>(null);
  const [followupSurface, setFollowupSurface] = React.useState<CreateFollowupSurface>("none");
  const [followupSnapshot, setFollowupSnapshot] =
    React.useState<CreateLightweightFollowupSnapshot | null>(null);
  const [intelligentFollowup, setIntelligentFollowup] =
    React.useState<CreateIntelligentFollowupResult | null>(null);
  const [supportHandoff, setSupportHandoff] =
    React.useState<CreateSupportHandoffPublic | null>(null);
  const [plannerTrace, setPlannerTrace] = React.useState<CreatePlannerRuntimeTrace | null>(null);
  const [analyzeTrace, setAnalyzeTrace] = React.useState<CreateAnalyzeRuntimeTrace | null>(null);
  const [analysisAutoRunToken, setAnalysisAutoRunToken] = React.useState<number>(0);
  const [intakeError, setIntakeError] = React.useState<string | null>(null);
  const [intakeRestoreInfo, setIntakeRestoreInfo] = React.useState<string | null>(null);
  const [guidedBridgeAnswer] = React.useState("");
  const [guidedBridgeConfirmed, setGuidedBridgeConfirmed] = React.useState(false);
  const [understandingConfirmed, setUnderstandingConfirmed] = React.useState<boolean>(false);
  const [activeTopicLabel, setActiveTopicLabel] = React.useState<string | null>(null);
  const [selectedPrimaryTopic, setSelectedPrimaryTopic] = React.useState<string | null>(null);
  const [groupedTopicLabels, setGroupedTopicLabels] = React.useState<string[]>([]);
  const [parkedTopicLabels, setParkedTopicLabels] = React.useState<string[]>([]);
  const [documentTopicOverviewOpened, setDocumentTopicOverviewOpened] = React.useState(false);
  const [showExpandedTopicPreview, setShowExpandedTopicPreview] = React.useState(false);
  const [topicExpansionDecision, setTopicExpansionDecision] = React.useState<
    "idle" | "expanded" | "compact" | "link" | "later"
  >("idle");
  const [workspaceActionMode, setWorkspaceActionMode] = React.useState<
    "default" | "edit" | "source" | "manual_topic"
  >("default");
  const [savedDraftId, setSavedDraftId] = React.useState<string | null>(null);
  const [persistedCandidateDossierReviewRecord, setPersistedCandidateDossierReviewRecord] =
    React.useState<PersistedCandidateDossierReviewRecordState | null>(null);
  const [reviewRequestState, setReviewRequestState] = React.useState<CreateReviewRequestState>("idle");
  const [reviewRequestMessage, setReviewRequestMessage] = React.useState<string | null>(null);
  const [factcheckMessage, setFactcheckMessage] = React.useState<string | null>(null);
  const [actionNotice, setActionNotice] = React.useState<string | null>(null);
  const [isRetryPlannerPending, setIsRetryPlannerPending] = React.useState(false);
  const analysisRunInFlightRef = React.useRef(false);
  const plannerDeadlineRef = React.useRef<CreateIntelligentFollowupDeadline | null>(null);
  const [chatContinuationText, setChatContinuationText] = React.useState("");
  const [showFollowupCorrectionComposer, setShowFollowupCorrectionComposer] = React.useState(false);
  const [workspaceTransparencyOpen, setWorkspaceTransparencyOpen] = React.useState(false);
  const intelligentFollowupResultRef = React.useRef<HTMLDivElement | null>(null);
  const dynamicStatusFocusRef = React.useRef<HTMLDivElement | null>(null);
  const intakeErrorFocusRef = React.useRef<HTMLParagraphElement | null>(null);
  const lastFocusedDynamicStatusRef = React.useRef<string | null>(null);
  const analysisSceneRef = React.useRef<HTMLDivElement | null>(null);
  const [analysisSceneMode, setAnalysisSceneMode] = React.useState<CreateProductMode | null>(null);
  const readStoredPrimaryIntake = React.useCallback(
    () => parseCreatePrimaryIntakeSnapshot(window.localStorage.getItem(intakeStorageKey)),
    [intakeStorageKey],
  );

  const startDraftRestore = useCreateStartDraftRestore({
    locale: surfaceLocale,
    initialText,
    intakeText,
    readStoredIntake: readStoredPrimaryIntake,
    setIntakeText,
    setIntakeRestoreInfo,
    setActionNotice,
  });

  React.useEffect(() => {
    if (intakeHydratedRef.current) return;
    intakeHydratedRef.current = true;
    try {
      const snapshot = parseCreatePrimaryIntakeSnapshot(window.localStorage.getItem(intakeStorageKey));
      if (!snapshot) return;

      const hasServerPrefill = hasPrimaryIntakeText(initialText);
      if (hasServerPrefill) return;

      if (hasPrimaryIntakeText(snapshot.intakeText)) {
        setIntakeText(snapshot.intakeText);
        setIntakeRestoreInfo(intakeRestoreInfoText);
      }
      // Do not auto-open follow-up surfaces from local restore.
      // We restore text only; activation stays explicit via CTA.
    } catch {
      // ignore local restore issues
    }
  }, [initialText, intakeRestoreInfoText, intakeStorageKey]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (hasPrimaryIntakeText(initialText)) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("resume") !== "create_handoff") return;
    const handoffId = params.get("handoffId");
    if (!handoffId) return;

    let cancelled = false;
    setPersistedCandidateDossierReviewRecord(null);
    async function hydratePersistedHandoff() {
      const localDraft = readCreateHandoffDraft(handoffId);
      if (localDraft) {
        if (cancelled) return;
        setIntakeText(localDraft.sourceText);
        setActionNotice("Vorbereiteter Arbeitsstand geladen. Du kannst jetzt überarbeiten und neu einordnen.");
        setIntakeRestoreInfo("Vorbereiteter Arbeitsstand zur Weiterbearbeitung geladen.");
      }

      try {
        const response = await fetch(`/api/create/handoffs/${encodeURIComponent(handoffId)}`, {
          cache: "no-store",
        });
        const body = await response.json().catch(() => null);
        if (!response.ok || !body?.ok || !body?.draft) return;
        const draft = body.draft;
        saveCreateHandoffDraft(draft);
        if (cancelled) return;
        setIntakeText(String(draft.sourceText ?? ""));
        if (draft.selectedAction === "create_dossier") {
          setPersistedCandidateDossierReviewRecord({
            reviewRecordId: String(draft.id ?? handoffId),
            selectedAction: "create_dossier",
            sourceText: String(draft.sourceText ?? ""),
            dossierRuntime: body?.dossierRuntime ?? null,
          });
        } else {
          setPersistedCandidateDossierReviewRecord(null);
        }
        setActionNotice("Vorbereiteter Arbeitsstand geladen. Du kannst jetzt weiterbearbeiten.");
        setIntakeRestoreInfo("Vorbereiteter Arbeitsstand zur Weiterbearbeitung geladen.");
      } catch {
        // ignore persisted resume errors here; local flow still works when available
      }
    }

    void hydratePersistedHandoff();
    return () => {
      cancelled = true;
    };
  }, [initialText]);

  React.useEffect(() => {
    try {
      if (!hasPrimaryIntakeText(intakeText) && !hasStarted) {
        window.localStorage.removeItem(intakeStorageKey);
        return;
      }

      const snapshot: CreatePrimaryIntakeSnapshot = {
        intakeText,
        hasStarted,
        updatedAt: new Date().toISOString(),
      };
      window.localStorage.setItem(intakeStorageKey, JSON.stringify(snapshot));
    } catch {
      // ignore local draft persistence errors
    }
  }, [hasStarted, intakeStorageKey, intakeText]);

  React.useEffect(() => {
    let ignore = false;
    async function refresh() {
      try {
        const res = await fetch("/api/create/entitlements", { cache: "no-store" });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body?.entitlements) return;
        if (ignore) return;
        const next = body.entitlements as CreateEntitlements;
        setEntitlements(next);
        setGate(deriveGate(next));
      } catch {
        // ignore
      }
    }
    refresh();
    return () => {
      ignore = true;
    };
  }, []);

  const productModeConfig = React.useMemo(
    () => resolveCreateProductModeConfig(productMode, surfaceLocale),
    [productMode, surfaceLocale],
  );
  const activeIntent = React.useMemo(() => mapProductModeToCreateIntent(productMode), [productMode]);
  const surfaceContextAnchors = React.useMemo(
    () =>
      getCreateContextAnchorsForMode({
        anchors: allSurfaceContextAnchors,
        mode: productMode,
        maxItems: 3,
      }),
    [allSurfaceContextAnchors, productMode],
  );
  const activeContextAnchor = React.useMemo(
    () => resolveCreateContextAnchorById(activeContextAnchorId, surfaceLocale),
    [activeContextAnchorId, surfaceLocale],
  );
  const intakeHelperText = activeContextAnchor?.helperText ?? productModeConfig.helperText;
  const intakePlaceholder = activeContextAnchor?.placeholder ?? productModeConfig.placeholder;
  const currentLinkDetection = React.useMemo(() => detectCreateLinkIntake(intakeText), [intakeText]);
  const hasPrivilegedTopicPreview = React.useMemo(
    () => entitlements.roles.some((role) => ["admin", "superadmin", "staff"].includes(role)),
    [entitlements.roles],
  );
  const canCreateInternalWorkstate = hasPrivilegedTopicPreview;
  const canPreviewAllDetectedTopics = React.useMemo(
    () =>
      hasPrivilegedTopicPreview ||
      entitlements.canUseExternalExtraction ||
      ["citizenPro", "citizenUltra", "institutionPremium"].includes(entitlements.tier) ||
      ["pro", "mitgestaltend", "b2b_pro", "b2g_pro"].includes(entitlements.edebattePackage),
    [
      entitlements.canUseExternalExtraction,
      entitlements.edebattePackage,
      entitlements.tier,
      hasPrivilegedTopicPreview,
    ],
  );
  const expandedTopicCostState = canPreviewAllDetectedTopics
    ? "inactive"
    : "addon_required";
  const composerAttachmentMaterialItems = React.useMemo(
    () => buildCreateAttachmentMaterialItems(composerAttachments),
    [composerAttachments],
  );
  const currentMaterialRouting = React.useMemo(
    () =>
      resolveMaterialRouting({
        text: intakeText,
        materialItems: composerAttachmentMaterialItems,
      }),
    [composerAttachmentMaterialItems, intakeText],
  );
  const hasMaterialContext = currentMaterialRouting.materialItems.length > 0;

  const createOrchestration = React.useMemo(
    () =>
      resolveCreateOrchestratorIntentContract({
        rawEntryIntent: productModeConfig.entryIntent,
        rawEntryMode: productModeConfig.entryMode,
        canSubmitContribution: entitlements.canSubmitContribution,
        canSubmitStatement: entitlements.canSubmitStatement,
        dossierId,
        selectedAnlassraumId,
      }),
    [
      dossierId,
      entitlements.canSubmitContribution,
      entitlements.canSubmitStatement,
      productModeConfig.entryIntent,
      productModeConfig.entryMode,
      selectedAnlassraumId,
    ],
  );

  const canonicalIntent: "statement" | "contribution" = createOrchestration.workspaceMode;
  const canonicalCreateMode: CreateMode =
    productModeConfig.preferredCreateMode ??
    (productMode === "guided" && createOrchestration.workspaceMode === "contribution"
      ? "ai"
      : createOrchestration.createMode);
  const pickerEnabled = canonicalIntent === "contribution";

  const loadContextItems = React.useCallback(async () => {
    setContextLoadState("loading");
    setContextLoadError(null);
    try {
      const selected = selectedAnlassraumId ? `&selectedAnlassraumId=${encodeURIComponent(selectedAnlassraumId)}` : "";
      const res = await fetch(`/api/create/context?limit=40${selected}`, { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.ok) {
        throw new Error(body?.error || "create_context_source_unavailable");
      }
      const nextItems = Array.isArray(body.items) ? (body.items as CreateContextPickerItem[]) : [];
      setContextItems(nextItems);
      setContextLoadState("ready");
      contextLoadedRef.current = true;

      if (selectedAnlassraumId) {
        const found = nextItems.some((item) => item.anlassraumId === selectedAnlassraumId);
        if (!found) {
          setSelectedAnlassraumId(null);
          setSelectionInfo(text.selectionInfoUnavailableContext);
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "create_context_source_unavailable";
      setContextLoadState("error");
      setContextLoadError(message);
    }
  }, [selectedAnlassraumId, text.selectionInfoUnavailableContext]);

  React.useEffect(() => {
    if (!hasStarted) return;
    if (!pickerEnabled) return;
    if (contextLoadedRef.current) return;
    void loadContextItems();
  }, [hasStarted, pickerEnabled, loadContextItems]);

  React.useEffect(() => {
    if (!pickerEnabled && selectedAnlassraumId) {
      setSelectedAnlassraumId(null);
    }
  }, [pickerEnabled, selectedAnlassraumId]);

  React.useEffect(() => {
    if (!hasStarted) return;
    if (!intelligentFollowup) return;
    intelligentFollowupResultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hasStarted, intelligentFollowup]);

  React.useEffect(
    () => () => {
      plannerDeadlineRef.current?.cancel();
      plannerDeadlineRef.current = null;
    },
    [],
  );

  const startCreateFlow = React.useCallback(async (rawText: string) => {
    if (isStarting || analysisRunInFlightRef.current) return;
    const normalizedText = rawText.trim();
    const linkDetection = detectCreateLinkIntake(normalizedText);
    const materialRouting = resolveMaterialRouting({
      text: normalizedText,
      materialItems: composerAttachmentMaterialItems,
    });
    const hasStartMaterialContext = materialRouting.materialItems.length > 0;
    if (!normalizedText && !hasStartMaterialContext) {
      setIntakeError(surfaceTexts.intakeMissingError);
      return;
    }
    if (normalizedText.length > 0 && normalizedText.length < MIN_INTENT_INPUT_LENGTH && !linkDetection.hasLink) {
      setIntakeError(productModeConfig.minimumInputHint);
      return;
    }
    analysisRunInFlightRef.current = true;
    let draftSavedForRun = false;
    const submitStartedAt = performance.now();
    let saveMs: number | null = null;
    let plannerCorrelationId: string | null = null;
    let plannerDeadline: CreateIntelligentFollowupDeadline | null = null;
    try {
      setIntakeRestoreInfo(null);
      setIntakeError(null);
      setReviewRequestState("idle");
      setReviewRequestMessage(null);
      setFactcheckMessage(null);
      setShowFollowupCorrectionComposer(false);

      const snapshot = buildCreateLightweightFollowupSnapshot({
        intakeText: rawText,
        modeLabel: productModeConfig.label,
        contextAnchorLabel: activeContextAnchor?.label,
        surfaceTexts,
      });
      setFollowupSnapshot(snapshot);
      setIntelligentFollowup(null);
      setSupportHandoff(null);
      setPlannerTrace(null);
      setAnalyzeTrace(null);
      setUnderstandingConfirmed(false);
      setActiveTopicLabel(null);
      setSelectedPrimaryTopic(null);
      setGroupedTopicLabels([]);
      setDocumentTopicOverviewOpened(false);
      setShowExpandedTopicPreview(false);
      setTopicExpansionDecision("idle");
      setParkedTopicLabels([]);
      setWorkspaceActionMode("default");
      setHasStarted(true);
      setGuidedBridgeConfirmed(productMode !== "guided");
      setFollowupSurface("none");
      setAnalysisSceneMode(null);
      setActionNotice(
        linkDetection.hasLink
          ? null
          : null,
      );
      setIsStarting(true);
      setLinkClarificationState((current) =>
        linkDetection.hasLink
          ? {
              detection: linkDetection,
              selectedIntentId: current?.selectedIntentId ?? null,
              additionalContext: current?.additionalContext ?? "",
            }
          : null,
      );

      const saveStartedAt = performance.now();
      const saveResponse = await fetch("/api/create/save", {
        method: "POST",
        headers: createMutationRequestHeaders(),
        // Save remains non-abortable so the UX deadline cannot break resume safety.
        // The same deadline only cancels analysis after a durable draft exists.
        body: JSON.stringify({
          draftId: savedDraftId ?? undefined,
          text: normalizedText,
          locale: surfaceLocale,
          source: "create_auto_before_analysis",
          createMode: canonicalCreateMode,
          anlassraumId:
            canonicalIntent === "contribution"
              ? selectedAnlassraumId ?? undefined
              : undefined,
          useCase: productModeConfig.preferredUseCase,
          sourceUrls: materialRouting.sourceUrls,
          materialItems: materialRouting.materialItems,
          analysis: {
            orchestration: {
              phase: "saved_before_analysis",
              autoPublish: false,
            },
          },
        }),
      });
      saveMs = performance.now() - saveStartedAt;
      const saveBody = await saveResponse.json().catch(() => ({}));
      if (!saveResponse.ok || !saveBody?.ok || typeof saveBody?.draftId !== "string") {
        throw new Error("create_auto_save_failed");
      }
      const runDraftId = saveBody.draftId as string;
      setSavedDraftId(runDraftId);
      draftSavedForRun = true;

      if (linkDetection.hasLink && linkDetection.primaryUrl) {
        setIntelligentFollowup(
          buildCreateTechnicalFollowup({
            text: normalizedText,
            analysisState: "link_detected",
            sourceType: "link",
            sourceUrl: linkDetection.primaryUrl,
            sourceLoaded: false,
            userMessage:
              surfaceLocale === "en"
                ? "I need to load the linked content in full and analyze it with the AI orchestrator first. No topics are derived before that."
                : "Ich muss den verlinkten Inhalt zuerst vollständig laden und mit dem KI-Orchester analysieren. Vorher leite ich keine Themen ab.",
          }),
        );
        setPlannerTrace(null);
        setAnalyzeTrace(null);
        setIsStarting(false);
        return;
      }

      let nextIntelligentFollowup: CreateIntelligentFollowupResult | null = null;
      let nextPlannerTrace: CreatePlannerRuntimeTrace | null = null;
      const correlationId = createClientCorrelationId();
      plannerCorrelationId = correlationId;
      const intakeTiming = resolveCreateIntakeTiming(normalizedText);
      plannerDeadline = startCreateIntelligentFollowupDeadline(intakeTiming.clientTimeoutMs);
      plannerDeadlineRef.current = plannerDeadline;
      const response = await fetch("/api/create/intelligent-followup", {
        method: "POST",
        headers: createMutationRequestHeaders(),
        signal: plannerDeadline.signal,
        body: JSON.stringify({
          text: normalizedText,
          locale: surfaceLocale,
          anlassraumId: selectedAnlassraumId,
          dossierId: dossierId ?? null,
          intent: activeIntent,
          sourceUrls: materialRouting.sourceUrls,
          materialItems: materialRouting.materialItems,
          correlationId,
          draftId: runDraftId,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body?.ok || !body?.result) {
        throw new Error("create_intelligent_followup_failed");
      }
      nextIntelligentFollowup = body.result as CreateIntelligentFollowupResult;
      nextPlannerTrace = body.trace
        ? {
            ...body.trace,
            timings: body.trace.timings
              ? {
                  ...body.trace.timings,
                  saveMs,
                  submitToResultMs: performance.now() - submitStartedAt,
                }
              : undefined,
          }
        : null;

      setIntelligentFollowup(nextIntelligentFollowup);
      setSupportHandoff(body.supportHandoff ?? null);
      setPlannerTrace(nextPlannerTrace);
      setAnalyzeTrace(null);
      setUnderstandingConfirmed(false);
      setActiveTopicLabel(null);
      setSelectedPrimaryTopic(null);
      setGroupedTopicLabels([]);
      setDocumentTopicOverviewOpened(false);
      setShowExpandedTopicPreview(false);
      setTopicExpansionDecision("idle");

      const nextFollowupSurface = resolveFollowupSurfaceOnStart(productMode);
      setFollowupSurface(nextFollowupSurface);
      setAnalysisSceneMode(nextFollowupSurface === "analysis" ? productMode : null);
      if (nextFollowupSurface === "analysis") {
        setAnalysisAutoRunToken((current) => current + 1);
      }
      setIsStarting(false);
    } catch (error: unknown) {
      const plannerTimedOut =
        draftSavedForRun &&
        plannerDeadline?.didTimeout() === true &&
        isCreateIntelligentFollowupAbortError(error);
      if (!draftSavedForRun) {
        setIntakeError(
          surfaceLocale === "en"
            ? "Your contribution could not be saved securely. Please try again."
            : "Dein Beitrag konnte nicht sicher gespeichert werden. Bitte versuche es erneut.",
        );
      } else {
        const failedHandoff: CreateSupportHandoffPublic | null =
          plannerCorrelationId
            ? {
                status: "failed",
                technicalReference: plannerCorrelationId,
                safeUserMessage: plannerTimedOut
                  ? surfaceLocale === "en"
                    ? "The classification took longer than expected. Your contribution remains saved."
                    : "Die Einordnung hat länger als erwartet gedauert. Dein Beitrag bleibt gespeichert."
                  : surfaceLocale === "en"
                    ? "The support handoff could not be confirmed."
                    : "Die technische Übergabe konnte nicht bestätigt werden.",
              }
            : null;
        setSupportHandoff(failedHandoff);
        setIntelligentFollowup(
          buildCreateTechnicalFollowup({
            text: normalizedText,
            analysisState: "ai_failed",
            sourceType: "text",
            sourceLoaded: true,
            userMessage: buildCreateSupportFailureCopy({
              locale: surfaceLocale as CreateVoxyLocale,
              handoff: failedHandoff,
            }).paragraphs.join(" "),
          }),
        );
      }
      if (plannerTimedOut) {
        setActionNotice(
          surfaceLocale === "en"
            ? "The classification took longer than expected. Your contribution is saved; you can try the classification again."
            : "Die Einordnung hat länger als erwartet gedauert. Dein Beitrag ist gespeichert; du kannst die Einordnung erneut versuchen.",
        );
        setIntakeError(null);
      } else if (draftSavedForRun && productMode === "analyze") {
        setActionNotice(
          surfaceLocale === "en"
            ? "I could not complete the automatic classification. You can refine the statement or review details again later."
            : "Ich konnte die automatische Einordnung gerade nicht abschließen. Du kannst die Aussage schärfen oder Details später erneut prüfen.",
        );
        setIntakeError(
          surfaceLocale === "en"
            ? "The system check is currently unavailable. Your text is retained."
            : "Die Systemprüfung ist gerade nicht verfügbar. Dein Text bleibt erhalten.",
        );
      } else if (draftSavedForRun) {
        setIntakeError(null);
      }
    } finally {
      plannerDeadline?.clear();
      if (plannerDeadlineRef.current === plannerDeadline) {
        plannerDeadlineRef.current = null;
      }
      analysisRunInFlightRef.current = false;
      setIsStarting(false);
    }
  }, [
    activeContextAnchor?.label,
    activeIntent,
    composerAttachmentMaterialItems,
    dossierId,
    isStarting,
    canonicalCreateMode,
    canonicalIntent,
    productMode,
    productModeConfig.label,
    productModeConfig.minimumInputHint,
    productModeConfig.preferredUseCase,
    savedDraftId,
    selectedAnlassraumId,
    surfaceLocale,
    surfaceTexts,
  ]);

  const handleStart = React.useCallback(async () => {
    if (!privacyGate.ensureActiveProcessingAllowed("create-start")) return;
    await startCreateFlow(intakeText);
  }, [intakeText, privacyGate, startCreateFlow]);

  const handleContinueConversation = React.useCallback(async () => {
    if (!privacyGate.ensureActiveProcessingAllowed("create-continue")) return;
    const normalizedContinuation = chatContinuationText.trim();
    if (!normalizedContinuation) {
      setActionNotice("Schreib kurz, was ich anpassen oder ergänzen soll.");
      return;
    }

    const baseText = intakeText.trim();
    const combinedText = baseText ? `${baseText}\n\n${normalizedContinuation}` : normalizedContinuation;
    setChatContinuationText("");
    setIntakeText(combinedText);
    setUnderstandingConfirmed(false);
    setActiveTopicLabel(null);
    setSelectedPrimaryTopic(null);
    setGroupedTopicLabels([]);
    setDocumentTopicOverviewOpened(false);
    setShowExpandedTopicPreview(false);
    setTopicExpansionDecision("idle");
    setParkedTopicLabels([]);
    setWorkspaceActionMode("default");
    setShowFollowupCorrectionComposer(false);
    await startCreateFlow(combinedText);
  }, [chatContinuationText, intakeText, privacyGate, startCreateFlow]);

  const handleSkipPlaceClarification = React.useCallback(async () => {
    const normalizedContinuation = "Ort später ergänzen.";
    const baseText = intakeText.trim();
    const combinedText = baseText ? `${baseText}\n\n${normalizedContinuation}` : normalizedContinuation;
    setChatContinuationText("");
    setIntakeText(combinedText);
    setUnderstandingConfirmed(false);
    setActiveTopicLabel(null);
    setSelectedPrimaryTopic(null);
    setGroupedTopicLabels([]);
    setDocumentTopicOverviewOpened(false);
    setShowExpandedTopicPreview(false);
    setTopicExpansionDecision("idle");
    setParkedTopicLabels([]);
    setWorkspaceActionMode("default");
    setShowFollowupCorrectionComposer(false);
    await startCreateFlow(combinedText);
  }, [intakeText, startCreateFlow]);

  const effectiveSelectedAnlassraumId = canonicalIntent === "statement" ? null : selectedAnlassraumId;
  const normalizedReturnTo = normalizeInternalRedirectPath(initialReturnTo);
  const fromRundenFlow =
    isRundenSourceContext(initialIntakeContext) || Boolean(normalizedReturnTo?.startsWith("/runden"));
  const fromManualAnlassraumContinueCreate =
    initialIntakeContext?.reason === "manual_anlassraum_continue_create" ||
    Boolean(normalizedReturnTo?.startsWith("/runden/new"));
  const contextualReturnHref =
    normalizedReturnTo ??
    (fromRundenFlow
      ? buildRundenReturnHref(effectiveSelectedAnlassraumId ?? initialAnlassraumId)
      : null);
  const readableRundenContextLabel = renderRundenContextLabel(initialIntakeContext);
  const showPostInputModules = shouldShowCreatePostInputModules({
    hasStarted,
    intakeText,
    hasMaterialContext,
  });
  const showLinkClarification =
    Boolean(linkClarificationState?.detection.hasLink) &&
    Boolean(linkClarificationState?.detection.mostlyLinkOnly) &&
    !intelligentFollowup;
  const showIntelligentFollowup = shouldRenderCreateIntelligentFollowup({
    hasStarted,
    followup: intelligentFollowup,
  });
  const showFollowupQuestionCard = shouldShowCreateFollowupQuestionCard({
    showPostInputModules,
    productMode,
  });
  const analyzeFollowupActivated = followupSurface === "analysis";
  const showAnalyzeWorkspace = shouldRenderCreateAnalyzeWorkspace({
    followupActivated: analyzeFollowupActivated,
    hasStarted,
    intakeText,
    hasMaterialContext,
    productMode,
    guidedBridgeConfirmed,
  });
  React.useEffect(() => {
    if (!showAnalyzeWorkspace) return;
    const node = analysisSceneRef.current;
    if (!node) return;
    window.requestAnimationFrame(() => {
      node.scrollIntoView({ behavior: "smooth", block: "start" });
      node.focus({ preventScroll: true });
    });
  }, [analysisAutoRunToken, showAnalyzeWorkspace]);
  const workspaceInitialText =
    productMode === "guided"
      ? buildGuidedWorkspaceText({
          intakeText,
          guidedBridgeAnswer: guidedBridgeConfirmed ? guidedBridgeAnswer : "",
          guidedWorkspacePrefix: surfaceTexts.guidedWorkspacePrefix,
        })
      : intakeText;
  const normalizedIntakeText = intakeText.trim();
  const startDisabled =
    (!normalizedIntakeText && !hasMaterialContext) ||
    ((normalizedIntakeText.length > 0 &&
      !currentLinkDetection.hasLink &&
      normalizedIntakeText.length < MIN_INTENT_INPUT_LENGTH) ||
      isStarting);
  const showTooShortHint =
    normalizedIntakeText.length > 0 &&
    normalizedIntakeText.length < MIN_INTENT_INPUT_LENGTH &&
    !currentLinkDetection.hasLink;
  const startBusyStatusLabel =
    productMode === "analyze"
      ? surfaceLocale === "en"
        ? "We’re organizing your contribution …"
        : "Wir ordnen deinen Beitrag ein …"
      : surfaceTexts.startBusyStatus;
  const showStartChatPreview =
    Boolean(followupSnapshot) && hasStarted && !showIntelligentFollowup && !showLinkClarification;
  const startChatAssistantTitle = isStarting
    ? surfaceLocale === "en"
      ? "I’m organizing this briefly"
      : "Ich ordne das kurz ein"
    : productMode === "guided"
      ? surfaceTexts.followupGuidedTitle
      : productMode === "media"
        ? productModeConfig.postStartTitle
        : surfaceTexts.followupContributeTitle;
  const startChatAssistantBody = isStarting
    ? surfaceTexts.startBusyLead
    : productMode === "guided"
      ? surfaceTexts.followupGuidedLead
      : productMode === "media"
        ? productModeConfig.postStartLead
        : followupSnapshot?.understandingLine ?? surfaceTexts.followupContributeLead;
  const analysisState = intelligentFollowup?.meta?.analysis?.state ?? null;
  const analysisFailed = analysisState === "ai_failed" || analysisState === "fetch_failed";
  const localizedActionNotice = localizeCreateActionNotice(
    surfaceLocale,
    actionNotice,
  );
  const localizedReviewRequestMessage = localizeCreateActionNotice(
    surfaceLocale,
    reviewRequestMessage,
  );
  const localizedFactcheckMessage = localizeCreateActionNotice(
    surfaceLocale,
    factcheckMessage,
  );
  React.useEffect(() => {
    const focusKey = intakeError
      ? `intake:${intakeError}`
      : analysisFailed
        ? `analysis:${analysisState}:${supportHandoff?.status ?? "none"}:${
            supportHandoff?.status === "created"
              ? supportHandoff.ticket.ticketNumber
              : ""
          }`
        : null;
    if (!focusKey || lastFocusedDynamicStatusRef.current === focusKey) return;

    const activeElement = document.activeElement;
    const isActivelyTyping =
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement ||
      (activeElement instanceof HTMLElement && activeElement.isContentEditable);

    const target = intakeError
      ? intakeErrorFocusRef.current
      : dynamicStatusFocusRef.current;
    if (!target) return;
    const focusTargetOnce = () => {
      if (lastFocusedDynamicStatusRef.current === focusKey) return;
      lastFocusedDynamicStatusRef.current = focusKey;
      window.requestAnimationFrame(() => {
        target.focus({ preventScroll: true });
      });
    };
    if (isActivelyTyping && activeElement instanceof HTMLElement) {
      activeElement.addEventListener("blur", focusTargetOnce, { once: true });
      return () => {
        activeElement.removeEventListener("blur", focusTargetOnce);
      };
    }
    focusTargetOnce();
  }, [analysisFailed, analysisState, intakeError, supportHandoff]);
  const hasValidatedTopics =
    hasValidatedCreateSemanticOutput(intelligentFollowup) &&
    (intelligentFollowup?.understanding.topics.length ?? 0) > 0;
  const workspaceActiveStage =
    !hasStarted
      ? "input"
      : isStarting
        ? "understanding"
        : showLinkClarification
          ? "understanding"
          : analysisFailed
            ? "understanding"
          : showIntelligentFollowup
            ? !understandingConfirmed
              ? "topics"
              : workspaceActionMode === "source"
                ? "sources"
                : workspaceActionMode === "edit"
                  ? "draft"
                  : "sources"
        : "draft";
  const workspaceStages = React.useMemo(
    () =>
      buildCreateWorkspaceStages({
        activeStage: workspaceActiveStage,
        isBusy: isStarting,
        analysisState,
        hasValidatedTopics,
        locale: surfaceLocale,
      }),
    [analysisState, hasValidatedTopics, isStarting, surfaceLocale, workspaceActiveStage],
  );
  const workspaceShellPhase: CreateWorkspaceShellPhase = !hasStarted
    ? "initial"
    : isStarting
      ? "loading"
      : showIntelligentFollowup || showLinkClarification || showStartChatPreview
        ? "result"
        : "continuation";
  const workspaceNotice = showTooShortHint
    ? productModeConfig.minimumInputHint
    : !hasStarted
      ? localizedActionNotice
      : null;
  const workspaceComposerValue = hasStarted ? chatContinuationText : intakeText;
  const workspaceComposerPlaceholder = hasStarted
    ? analysisFailed
      ? surfaceLocale === "en"
        ? "You can add to the contribution or continue later."
        : "Du kannst den Beitrag ergänzen oder später fortsetzen."
      : workspaceActionMode === "source"
        ? surfaceLocale === "en"
          ? "Add a source, decision, or example …"
          : "Füge eine Quelle, einen Beschluss oder ein Beispiel hinzu …"
        : !understandingConfirmed
          ? surfaceLocale === "en"
            ? "Would you like to change, add, or group a topic?"
            : "Möchtest du ein Thema ändern, ergänzen oder zusammenführen?"
          : workspaceActionMode === "edit"
            ? surfaceLocale === "en"
              ? "Which statement would you like to refine?"
              : "Welche Aussage möchtest du schärfen?"
            : workspaceActionMode === "manual_topic"
              ? surfaceLocale === "en"
                ? "Would you like to change, add, or group a topic?"
                : "Möchtest du ein Thema ändern, ergänzen oder zusammenführen?"
              : surfaceLocale === "en"
                ? "Which statement would you like to refine?"
                : "Welche Aussage möchtest du schärfen?"
    : intakePlaceholder;
  const workspaceComposerStartLabel = hasStarted
    ? surfaceLocale === "en"
      ? "Send reply"
      : "Antwort senden"
    : surfaceLocale === "en"
      ? "Organize concern"
      : "Anliegen einordnen";
  const workspaceComposerStartBusyLabel = hasStarted
    ? surfaceLocale === "en"
      ? "I’m organizing your addition …"
      : "Ich ordne deine Ergänzung gerade …"
    : startBusyStatusLabel;
  const workspaceComposerStartDisabled = hasStarted
    ? isStarting || !chatContinuationText.trim()
    : startDisabled;
  const handleWorkspaceComposerChange = (value: string) => {
    if (hasStarted) {
      setChatContinuationText(value);
    } else {
      setIntakeText(value);
    }
    if (intakeRestoreInfo) setIntakeRestoreInfo(null);
    if (intakeError) setIntakeError(null);
    if (actionNotice) setActionNotice(null);
    setLinkClarificationState((current) => {
      if (!current || hasStarted) return current;
      const nextDetection = detectCreateLinkIntake(value);
      if (!nextDetection.hasLink) return null;
      return {
        ...current,
        detection: nextDetection,
      };
    });
  };
  const renderWorkspaceThread = () =>
    showLinkClarification && linkClarificationState ? (
      <div className="min-w-0 space-y-5">
        <CreateSubmittedContributionBubble
          text={followupSnapshot?.originalText ?? normalizedIntakeText}
          locale={surfaceLocale}
        />
        <CreateLinkIntakeClarification
          locale={surfaceLocale}
          detection={linkClarificationState.detection}
          selectedIntentId={linkClarificationState.selectedIntentId}
          additionalContext={linkClarificationState.additionalContext}
          onSelectIntent={(intentId) => {
            setLinkClarificationState((current) =>
              current
                ? {
                    ...current,
                    selectedIntentId: intentId,
                  }
                : current,
            );
          }}
          onAdditionalContextChange={(value) => {
            setLinkClarificationState((current) =>
              current
                ? {
                    ...current,
                    additionalContext: value,
                  }
                : current,
            );
          }}
        />
      </div>
    ) : showIntelligentFollowup && intelligentFollowup ? (
      <div ref={intelligentFollowupResultRef} className="scroll-mt-24">
        <CreateVisualFollowup
          result={intelligentFollowup}
          locale={surfaceLocale as CreateVoxyLocale}
          supportHandoff={supportHandoff}
          dynamicStatusRef={dynamicStatusFocusRef}
          actionNotice={localizedActionNotice}
          isConfirmed={understandingConfirmed}
          embedInWorkspaceShell
          activeTopicLabel={activeTopicLabel}
          selectedPrimaryTopic={selectedPrimaryTopic}
          groupedTopicLabels={groupedTopicLabels}
          parkedTopicLabels={parkedTopicLabels}
          composerMode={workspaceActionMode}
          reviewRequestState={reviewRequestState}
          reviewRequestMessage={localizedReviewRequestMessage}
          factcheckMessage={localizedFactcheckMessage}
          showCorrectionComposer={showFollowupCorrectionComposer}
          onConfirm={() => {
            const defaultPrimaryTopic =
              selectedPrimaryTopic ??
              activeTopicLabel ??
              buildCreateStructureBranches(intelligentFollowup, 3)[0]?.title ??
              intelligentFollowup.understanding.dossierContext ??
              intelligentFollowup.understanding.topics[0]?.label ??
              null;
            if (defaultPrimaryTopic) {
              setActiveTopicLabel(defaultPrimaryTopic);
              setSelectedPrimaryTopic(defaultPrimaryTopic);
              setGroupedTopicLabels([]);
              setParkedTopicLabels((current) =>
                current.filter((topicLabel) => topicLabel !== defaultPrimaryTopic),
              );
            }
            setUnderstandingConfirmed(true);
            setWorkspaceActionMode("default");
            setChatContinuationText("");
            setShowFollowupCorrectionComposer(false);
            setActionNotice(
              defaultPrimaryTopic
                ? `Themenstruktur bestätigt. ${defaultPrimaryTopic} bleibt als aktueller Fokus sichtbar.`
                : "Themenstruktur bestätigt. Der nächste Schritt ist jetzt freigeschaltet.",
            );
          }}
          onEdit={() => {
            setWorkspaceActionMode("edit");
            setChatContinuationText("");
            setShowFollowupCorrectionComposer(true);
            setActionNotice("Aussage schärfen geöffnet.");
          }}
          onFocusTopic={(topicLabel) => {
            const normalizedTopicLabel = topicLabel.trim();
            if (!normalizedTopicLabel) return;
            setActiveTopicLabel(normalizedTopicLabel);
            setWorkspaceActionMode("default");
            setShowFollowupCorrectionComposer(false);
            setActionNotice(`${normalizedTopicLabel} wurde fokussiert.`);
          }}
          onSelectPrimaryTopic={(topicLabel) => {
            const normalizedTopicLabel = topicLabel.trim();
            if (!normalizedTopicLabel) return;
            setActiveTopicLabel(normalizedTopicLabel);
            setSelectedPrimaryTopic(normalizedTopicLabel);
            setGroupedTopicLabels([]);
            setParkedTopicLabels((current) =>
              current.filter((topicLabelEntry) => topicLabelEntry !== normalizedTopicLabel),
            );
            setUnderstandingConfirmed(true);
            setWorkspaceActionMode("default");
            setShowFollowupCorrectionComposer(false);
            setActionNotice(`${normalizedTopicLabel} ist jetzt dein Fokus.`);
          }}
          onGroupTopics={(topicLabels) => {
            const normalizedTopicLabels = Array.from(
              new Set(topicLabels.map((topicLabel) => topicLabel.trim()).filter(Boolean)),
            );
            if (normalizedTopicLabels.length < 2) return;
            setGroupedTopicLabels(normalizedTopicLabels);
            setActiveTopicLabel(normalizedTopicLabels[0] ?? null);
            setSelectedPrimaryTopic(null);
            setUnderstandingConfirmed(false);
            setWorkspaceActionMode("default");
            setShowFollowupCorrectionComposer(false);
            setActionNotice(`${normalizedTopicLabels.join(", ")} werden gemeinsam weitergeführt.`);
          }}
          onSeparateTopics={() => {
            setGroupedTopicLabels([]);
            setUnderstandingConfirmed(false);
            setWorkspaceActionMode("default");
            setActionNotice("Die Themen werden wieder getrennt weitergeführt.");
          }}
          onParkTopic={(topicLabel) => {
            const normalizedTopicLabel = topicLabel.trim();
            if (!normalizedTopicLabel) return;
            setParkedTopicLabels((current) =>
              current.includes(normalizedTopicLabel)
                ? current
                : [...current, normalizedTopicLabel],
            );
            setGroupedTopicLabels((current) =>
              current.filter((topicLabelEntry) => topicLabelEntry !== normalizedTopicLabel),
            );
            setActiveTopicLabel((current) =>
              current === normalizedTopicLabel ? null : current,
            );
            setSelectedPrimaryTopic((current) =>
              current === normalizedTopicLabel ? null : current,
            );
            setUnderstandingConfirmed(false);
            setWorkspaceActionMode("default");
            setShowFollowupCorrectionComposer(false);
            setActionNotice(`${normalizedTopicLabel} wurde geparkt.`);
            void persistSavedWorkstate({
              type: "parked_topic",
              visibility: "private",
              status: "parked",
              title: `Geparktes Thema: ${normalizedTopicLabel}`,
              content: `Der Themenstrang „${normalizedTopicLabel}“ bleibt geparkt und kann später wieder aufgenommen werden.`,
              topicLabel: normalizedTopicLabel,
              successMessage: `${normalizedTopicLabel} wurde geparkt und in deinen Arbeitsständen gespeichert.`,
            });
          }}
          onOpenManualTopicChooser={() => {
            setWorkspaceActionMode("manual_topic");
            setChatContinuationText("");
            setActionNotice("Themen ändern geöffnet.");
          }}
          onPrepareSubmission={handlePrepareSubmission}
          onPrepareAnlassraum={handlePrepareAnlassraum}
          onOpenDossierAppend={handleOpenDossierAppend}
          onOpenDossierCreate={handleOpenDossierCreate}
          onPrepareVote={handlePrepareVote}
          onRequestEditorialReview={handleRequestEditorialReview}
          onStartOptionalService={confirmFactcheckServiceStart}
          onDeepenAllTopics={handleDeepenAllTopics}
          onDeepenTopic={handleDeepenSingleTopic}
          onContinueInAccount={handleContinueInAccount}
          onSaveQuestion={handleSaveQuestion}
          onSaveTopic={handleSaveTopic}
          onSaveSource={handleSaveSource}
          onSaveInternal={handleSaveInternal}
          onPrepareCommunity={handlePrepareCommunity}
          onDeferWork={handleDeferWork}
          canCreateInternalWorkstate={canCreateInternalWorkstate}
          onRetryPlanner={handleRetryPlanner}
          isRetryPlannerPending={isRetryPlannerPending}
          onSaveOnly={handleSaveOnly}
          onSkipPlaceClarification={handleSkipPlaceClarification}
          linkDetection={currentLinkDetection}
          compactBranchLimit={compactTopicPreviewCount}
          expandedBranchLimit={Math.max(
            compactTopicPreviewCount,
            entitlements.maxVisibleAiProposals,
            debattenstandTopicLabels.length,
          )}
          documentTopicOverviewOpened={documentTopicOverviewOpened}
          showExpandedTopicPreview={showExpandedTopicPreview}
          topicExpansionDecision={topicExpansionDecision}
          expandedTopicAccess={{
            canPreviewAllTopics: canPreviewAllDetectedTopics,
            isPrivilegedPreview: hasPrivilegedTopicPreview,
            costState: expandedTopicCostState,
          }}
          onOpenDocumentTopicOverview={handleOpenDocumentTopicOverview}
          onExpandTopicPreview={handleExpandTopicPreview}
          onKeepCompactTopicPreview={handleKeepCompactTopicPreview}
          onPrepareLinkReview={handlePrepareLinkReview}
          onDeferExpandedReview={handleDeferExpandedReview}
          continuationValue={chatContinuationText}
          onContinuationChange={setChatContinuationText}
          onContinueConversation={handleContinueConversation}
          continueConversationDisabled={isStarting || !chatContinuationText.trim()}
          handoffRuntimeDossierId={dossierId ?? null}
          handoffRuntimeAnlassraumId={effectiveSelectedAnlassraumId ?? null}
          handoffRuntimeSourceUrls={currentMaterialRouting.sourceUrls}
          handoffRuntimeMaterialItems={currentMaterialRouting.materialItems}
        />
      </div>
    ) : showStartChatPreview && followupSnapshot ? (
      <div
        data-create-loading-thread={isStarting ? "true" : undefined}
        className="min-w-0 space-y-5"
      >
        <CreateSubmittedContributionBubble
          text={followupSnapshot.originalText}
          locale={surfaceLocale}
        />
        <CreateAssistantStatusBubble
          eyebrow={
            isStarting
              ? surfaceLocale === "en"
                ? "Understanding"
                : "Verstehen"
              : surfaceTexts.followupUnderstandingLabel
          }
          title={
            isStarting
              ? surfaceLocale === "en"
                ? "I’m organizing your contribution …"
                : "Ich ordne deinen Beitrag gerade …"
              : startChatAssistantTitle
          }
          body={startChatAssistantBody}
          notice={isStarting ? null : localizedActionNotice}
          announce={isStarting}
        />
      </div>
    ) : (
      <div
        data-create-initial-thread="true"
        className="relative flex min-h-[10rem] min-w-0 items-start pt-1 md:min-h-[12rem] md:pt-2"
      >
        <CreateAssistantStatusBubble
          title={voxyCopy.greeting}
          body={voxyCopy.intro}
          notice={localizedActionNotice}
        />
      </div>
    );
  const frontendAiTransparency = React.useMemo(
    () => {
      const candidatePreview = buildCreateCandidatePreviewReadModel({
        followup: intelligentFollowup,
        createAnalyze: analyzeTrace?.createAnalyze ?? null,
        runReceipt: analyzeTrace?.runReceipt ?? null,
        intakeContext: initialIntakeContext,
        draftId: initialIntakeContext?.draftId ?? initialRundenCreateHandoff?.draftId ?? null,
        sourceUrls: currentMaterialRouting.sourceUrls,
        materialItems: currentMaterialRouting.materialItems,
        persistedReviewRecord: persistedCandidateDossierReviewRecord,
      });
      return {
        candidatePreview,
        transparency: buildCreateFrontendAiTransparencyReadModel({
          hasStarted,
          isStarting,
          hasIntelligentFollowup: Boolean(intelligentFollowup),
          showAnalyzeWorkspace,
          isRetryPlannerPending,
          fromManualAnlassraumContinueCreate,
          startBusyStatusLabel,
          rundenCreateHandoffStatus: initialRundenCreateHandoff?.status ?? null,
          rundenCreateHandoffDetail: initialRundenCreateHandoff?.detail ?? null,
          rundenCreateHandoff: initialRundenCreateHandoff,
          initialText: intakeText,
          intakeContext: initialIntakeContext,
          draftId: initialIntakeContext?.draftId ?? initialRundenCreateHandoff?.draftId ?? null,
          dossierId: dossierId ?? null,
          anlassraumId: effectiveSelectedAnlassraumId ?? initialAnlassraumId ?? null,
          plannerResult: intelligentFollowup,
          plannerTrace,
          analyzeTrace,
          materialItems: currentMaterialRouting.materialItems,
          analysisState: intelligentFollowup?.meta?.analysis?.state ?? null,
          hasValidatedSemanticResult:
            candidatePreview.availability.kind === "semantic_preview_ready",
          hasCandidatePreview: candidatePreview.hasPreview,
          hasCandidateReviewHandoff: candidatePreview.reviewHandoff.hasPreparedHandoff,
          hasClaimToDossierPipeline:
            candidatePreview.claimToDossierPipeline.hasPreparedPipeline,
          hasFeedEnrichmentSuggestions:
            candidatePreview.feedEnrichmentSuggestions.hasSuggestions,
        }),
      };
    },
    [
      analyzeTrace,
      currentMaterialRouting.materialItems,
      currentMaterialRouting.sourceUrls,
      dossierId,
      effectiveSelectedAnlassraumId,
      fromManualAnlassraumContinueCreate,
      hasStarted,
      initialAnlassraumId,
      initialIntakeContext,
      initialRundenCreateHandoff,
      intakeText,
      intelligentFollowup,
      initialRundenCreateHandoff?.detail,
      initialRundenCreateHandoff?.status,
      isRetryPlannerPending,
      isStarting,
      plannerTrace,
      persistedCandidateDossierReviewRecord,
      showAnalyzeWorkspace,
      startBusyStatusLabel,
    ],
  );
  const frontendAiTransparencyModel = frontendAiTransparency.transparency;
  const structureOverviewMetrics = React.useMemo(
    () =>
      deriveCreateStructureOverviewMetrics({
        result: intelligentFollowup,
        isConfirmed: understandingConfirmed,
      }),
    [intelligentFollowup, understandingConfirmed],
  );
  const workspaceNextStepLabel = React.useMemo(() => {
    if (!hasStarted) return "Beitrag prüfen";
    if (!understandingConfirmed) return "Themenstruktur bestätigen";
    if (workspaceActionMode === "source") return "Quellen prüfen";
    if (workspaceActionMode === "manual_topic") return "Themen ändern";
    if (workspaceActionMode === "edit") return "Aussage schärfen";
    if (groupedTopicLabels.length > 1) return "Themen gemeinsam weiterführen";
    if (selectedPrimaryTopic || understandingConfirmed) return "Aussage schärfen";
    if (intelligentFollowup) {
      const branchCount = buildCreateStructureBranches(intelligentFollowup, 3).length;
      if (branchCount > 1) return "Themenstruktur bestätigen";
    }
    return "Beitrag prüfen";
  }, [
    groupedTopicLabels.length,
    hasStarted,
    intelligentFollowup,
    selectedPrimaryTopic,
    understandingConfirmed,
    workspaceActionMode,
  ]);
  const compactTopicPreviewCount = 4;
  const debattenstandTopicLabels = React.useMemo(() => {
    if (!intelligentFollowup) return [];
    const documentTopicLabels = intelligentFollowup.meta?.documentAnalysis
      ? normalizeDocumentAnalysisSummary(intelligentFollowup.meta.documentAnalysis).topics.map(
          (topic) => topic.label,
        )
      : [];
    if (documentTopicLabels.length > 0) {
      return dedupeCreatePlannerTopicLabels(documentTopicLabels);
    }
    const semanticTopicCount = Math.max(
      intelligentFollowup.understanding.topics.length,
      documentTopicLabels.length,
    );
    const fullBranchLabels = buildCreateStructureBranches(
      intelligentFollowup,
      Math.max(compactTopicPreviewCount, semanticTopicCount),
    ).map((branch) => branch.title);
    return dedupeCreatePlannerTopicLabels(fullBranchLabels);
  }, [intelligentFollowup]);
  const visibleDebattenstandTopicLabels = React.useMemo(() => {
    if (documentTopicOverviewOpened || showExpandedTopicPreview) {
      return debattenstandTopicLabels;
    }
    return debattenstandTopicLabels.slice(0, compactTopicPreviewCount);
  }, [
    debattenstandTopicLabels,
    documentTopicOverviewOpened,
    showExpandedTopicPreview,
  ]);
  const debattenstandModel = React.useMemo(
    () =>
      deriveCreateDebattenstandModel({
        hasStarted,
        isStarting,
        understandingConfirmed,
        workspaceActionMode,
        analysisState:
          analysisState ??
          (showLinkClarification
            ? "link_detected"
            : intelligentFollowup
              ? "result_ready"
              : hasStarted
                ? "ai_failed"
                : "idle"),
        sourceKind: intelligentFollowup?.meta?.documentAnalysis
          ? "document"
          : currentLinkDetection.hasLink
            ? "link"
            : "text",
        hasSourceMaterial:
          currentLinkDetection.hasLink ||
          currentMaterialRouting.sourceUrls.length > 0 ||
          currentMaterialRouting.materialItems.length > 0,
        requestedSourceReview:
          workspaceActionMode === "source" || Boolean(factcheckMessage),
        activeTopicLabel,
        selectedPrimaryTopic,
        groupedTopicLabels,
        parkedTopicLabels,
        allTopicLabels: debattenstandTopicLabels,
        visibleTopicLabels: visibleDebattenstandTopicLabels,
        compactTopicCount: compactTopicPreviewCount,
      }),
    [
      activeTopicLabel,
      analysisState,
      currentLinkDetection.hasLink,
      currentMaterialRouting.materialItems.length,
      currentMaterialRouting.sourceUrls.length,
      debattenstandTopicLabels,
      factcheckMessage,
      groupedTopicLabels,
      hasStarted,
      intelligentFollowup,
      intelligentFollowup?.meta?.documentAnalysis,
      isStarting,
      parkedTopicLabels,
      selectedPrimaryTopic,
      showLinkClarification,
      understandingConfirmed,
      visibleDebattenstandTopicLabels,
      workspaceActionMode,
    ],
  );

  const persistSavedWorkstate = React.useCallback(
    async (params: {
      type:
        | "topic_candidate"
        | "question_candidate"
        | "source_list"
        | "internal_note"
        | "community_candidate"
        | "deferred_work"
        | "parked_topic";
      visibility:
        | "private"
        | "admin_internal"
        | "organization_internal"
        | "community_candidate";
      status: "saved" | "parked" | "needs_review";
      title: string;
      content: string;
      topicLabel?: string | null;
      successMessage: string;
      sourceUrl?: string | null;
      metadata?: Record<string, unknown>;
    }) => {
      if (!intelligentFollowup) {
        setActionNotice("Bitte beschreibe zuerst deinen Beitrag.");
        return false;
      }

      const branches = buildCreateStructureBranches(
        intelligentFollowup,
        Math.max(4, entitlements.maxVisibleAiProposals),
      );
      const resolvedTopicLabel =
        params.topicLabel?.trim() ||
        selectedPrimaryTopic ||
        activeTopicLabel ||
        branches[0]?.title ||
        intelligentFollowup.understanding.dossierContext ||
        intelligentFollowup.understanding.topics[0]?.label ||
        null;
      const activeBranch =
        branches.find((branch) => branch.title === resolvedTopicLabel) ?? branches[0] ?? null;
      const sourceUrl =
        params.sourceUrl ??
        currentLinkDetection.primaryUrl ??
        currentMaterialRouting.sourceUrls[0] ??
        null;

      try {
        const response = await fetch("/api/create/workstates", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            visibility: params.visibility,
            type: params.type,
            status: params.status,
            sourceUrl,
            sourceAnalysisId: intelligentFollowup.generatedAt,
            parentTopicId: activeBranch?.topicId ?? null,
            title: params.title,
            content: params.content,
            metadata: {
              topicId: activeBranch?.topicId ?? null,
              topicTitle: activeBranch?.title ?? resolvedTopicLabel,
              summary: activeBranch?.summary ?? intelligentFollowup.understanding.summary,
              evidenceSnippets: activeBranch?.evidenceSnippets ?? [],
              subtopics: activeBranch?.subtopics ?? [],
              suggestedQuestions:
                activeBranch?.suggestedQuestions ?? activeBranch?.voteQuestions ?? [],
              sourceSection: activeBranch?.sourceSection ?? intelligentFollowup.understanding.summary,
              sourceLabel: sourceUrl ?? "aktueller Beitrag",
              linkLoaded: false,
              ...params.metadata,
            },
            resumeHref: "/create",
          }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok || !body?.ok) {
          throw new Error(body?.error || "create_saved_workstate_failed");
        }
        setReviewRequestMessage(params.successMessage);
        setActionNotice(params.successMessage);
        return true;
      } catch {
        setReviewRequestMessage(
          "Der Arbeitsstand konnte gerade nicht gespeichert werden. Bitte erneut versuchen.",
        );
        setActionNotice(
          "Der Arbeitsstand konnte gerade nicht gespeichert werden. Bitte erneut versuchen.",
        );
        return false;
      }
    },
    [
      activeTopicLabel,
      currentLinkDetection.primaryUrl,
      currentMaterialRouting.sourceUrls,
      entitlements.maxVisibleAiProposals,
      intelligentFollowup,
      selectedPrimaryTopic,
    ],
  );

  const persistFollowupWorkstate = React.useCallback(async (manualReviewRequested: boolean) => {
    if (!showIntelligentFollowup) {
      setReviewRequestState("error");
      setReviewRequestMessage("Dieser Schritt ist in diesem Arbeitsstand noch nicht verfügbar.");
      setActionNotice("Dieser Schritt ist in diesem Arbeitsstand noch nicht verfügbar.");
      return;
    }

    const normalizedText = intakeText.trim();
    if (!normalizedText) {
      setReviewRequestState("error");
      setReviewRequestMessage("Bitte beschreibe zuerst deinen Beitrag.");
      setActionNotice("Bitte beschreibe zuerst deinen Beitrag.");
      return;
    }

    const linkIntakeMeta = buildCreateLinkIntakeMeta({
      detection: linkClarificationState?.detection ?? currentLinkDetection,
      selectedIntentId: linkClarificationState?.selectedIntentId,
      additionalContext: linkClarificationState?.additionalContext,
    });

    setReviewRequestState("saving");
    setReviewRequestMessage("Prüfstatus wird gespeichert …");
    try {
      const response = await fetch("/api/create/save", {
        method: "POST",
        headers: createMutationRequestHeaders(),
        body: JSON.stringify({
          draftId: savedDraftId ?? undefined,
          text: normalizedText,
          locale: surfaceLocale,
          source: "create_followup",
          createMode: canonicalCreateMode,
          anlassraumId: effectiveSelectedAnlassraumId ?? undefined,
          useCase: productModeConfig.preferredUseCase,
          manualReviewRequested,
          sourceUrls: currentMaterialRouting.sourceUrls,
          materialItems: currentMaterialRouting.materialItems,
          analysis: intelligentFollowup
            ? {
                intelligentFollowup,
                understandingConfirmed,
                linkIntake: linkIntakeMeta ?? undefined,
              }
            : undefined,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body?.ok || typeof body?.draftId !== "string") {
        throw new Error(body?.error || "save_failed");
      }
      const requestScope = body?.requestScope as RequestScopeSummary | null | undefined;
      const scopedSavedMessage = requestScope?.isOperatorMode
        ? "Arbeitsstand gespeichert. Entwurf wird geprüft und nicht automatisch veröffentlicht."
        : requestScope?.organizationId
          ? "Arbeitsstand gespeichert. Der Entwurf wird im Bereich deiner Organisation geprüft."
          : null;
      const successMessage =
        manualReviewRequested
          ? "Arbeitsstand zur Prüfung vorgemerkt. Keine automatische Veröffentlichung."
          : scopedSavedMessage ??
            "Arbeitsstand gesichert. Noch nicht veröffentlicht. Du kannst ihn weiter schärfen oder in Dossier, Anlassraum oder Swipes weiterführen.";
      setSavedDraftId(body.draftId);
      setReviewRequestState("saved");
      setReviewRequestMessage(successMessage);
      setActionNotice(successMessage);
    } catch {
      setReviewRequestState("error");
      setReviewRequestMessage("Prüfstatus konnte nicht gespeichert werden. Bitte erneut versuchen.");
      setActionNotice("Prüfstatus konnte nicht gespeichert werden. Bitte erneut versuchen.");
    }
  }, [
    canonicalCreateMode,
    effectiveSelectedAnlassraumId,
    intakeText,
    intelligentFollowup,
    productModeConfig.preferredUseCase,
    savedDraftId,
    showIntelligentFollowup,
    surfaceLocale,
    understandingConfirmed,
    currentLinkDetection,
    currentMaterialRouting.materialItems,
    currentMaterialRouting.sourceUrls,
    linkClarificationState,
  ]);

  const navigateWithCreateHandoff = React.useCallback(
    async (selectedAction: CreateHandoffAction, baseHref: string) => {
      if (!privacyGate.ensureActiveProcessingAllowed(`create-handoff:${selectedAction}`)) return;
      if (!hasValidatedCreateSemanticOutput(intelligentFollowup)) {
        setActionNotice("Dieser Schritt braucht zuerst einen bestätigbaren Arbeitsstand.");
        return;
      }
      if (
        ["append_to_dossier", "create_dossier", "request_factcheck", "prepare_vote", "prepare_anlassraum"].includes(selectedAction) &&
        !isPlannerReadyForStructuredHandoff(intelligentFollowup)
      ) {
        setActionNotice("Bitte bestätige das Thema zuerst genauer oder sende einen Bericht an die Redaktion.");
        return;
      }
      const draft = buildCreateHandoffDraft({
        result: intelligentFollowup,
        selectedAction,
        sourceUrls: currentMaterialRouting.sourceUrls,
        materialItems: currentMaterialRouting.materialItems,
      });
      const journeySummary = resolveCreateHandoffJourneySummary(draft);
      saveCreateHandoffDraft(draft);
      setActionNotice(
        `Dein Beitrag wird vorbereitet für ${journeySummary.destinationLabel}. Er wird nicht automatisch veröffentlicht.`,
      );
      let successMessage = `Beitrag vorbereitet. ${journeySummary.nextStepTitle}.`;
      try {
        const response = await fetch("/api/create/handoffs", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            draft,
            dossierId: dossierId ?? null,
            anlassraumId: effectiveSelectedAnlassraumId ?? null,
          }),
        });
        const body = await response.json().catch(() => null) as
          | {
              ok?: boolean;
              error?: string;
              record?: {
                id?: string;
              } | null;
              dossierRuntime?: PersistedCandidateDossierReviewRecordState["dossierRuntime"] | null;
              requestScope?: RequestScopeSummary | null;
              accessDecision?: {
                title?: string;
                body?: string;
              } | null;
            }
          | null;
        if (!response.ok || !body?.ok) {
          if (body?.accessDecision?.title || body?.accessDecision?.body) {
            const title = body.accessDecision.title?.trim() ?? "Freischaltung nötig";
            const detail =
              body.accessDecision.body?.trim() ??
              "Der Arbeitsstand kann weiter vorbereitet werden, aber noch nicht produktiv in den Organisationspfad übergeben werden.";
            setActionNotice(`${title}. ${detail}`);
            return;
          }
          throw new Error(body?.error ?? "create_handoff_persist_failed");
        }
        const requestScope = body?.requestScope as RequestScopeSummary | null | undefined;
        if (requestScope?.isOperatorMode) {
          successMessage =
            `Beitrag vorbereitet. ${journeySummary.nextStepTitle}. Der Entwurf wird geprüft.`;
        } else if (requestScope?.organizationId) {
          successMessage =
            `Beitrag vorbereitet. ${journeySummary.destinationLabel} bleibt im Bereich deiner Organisation und wird geprüft.`;
        }
        if (selectedAction === "create_dossier" && body?.record?.id) {
          setPersistedCandidateDossierReviewRecord({
            reviewRecordId: String(body.record.id),
            selectedAction,
            sourceText: draft.sourceText,
            dossierRuntime: body?.dossierRuntime ?? null,
          });
        }
      } catch {
        setActionNotice("Der vorbereitete Beitrag konnte nicht gespeichert werden. Bitte erneut versuchen.");
        return;
      }
      setShowFollowupCorrectionComposer(false);
      setActionNotice(successMessage);
      const targetHref = buildCreateHandoffTargetHref({
        baseHref,
        handoffId: draft.id,
        action: selectedAction,
      });
      router.push(targetHref as Parameters<typeof router.push>[0]);
    },
    [
      currentMaterialRouting.materialItems,
      currentMaterialRouting.sourceUrls,
      dossierId,
      effectiveSelectedAnlassraumId,
      intelligentFollowup,
      privacyGate,
      router,
    ],
  );

  const handleRetryPlanner = React.useCallback(async () => {
    const sourceText = (intelligentFollowup?.sourceText ?? followupSnapshot?.originalText ?? normalizedIntakeText).trim();
    if (!sourceText) {
      setActionNotice(
        surfaceLocale === "en"
          ? "Please describe your contribution first."
          : "Bitte beschreibe zuerst deinen Beitrag.",
      );
      return;
    }
    if (isRetryPlannerPending || analysisRunInFlightRef.current) return;
    if (!privacyGate.ensureActiveProcessingAllowed("create-retry-planner")) return;

    analysisRunInFlightRef.current = true;
    setIsRetryPlannerPending(true);
    setSupportHandoff(null);
    const correlationId = createClientCorrelationId();
    const intakeTiming = resolveCreateIntakeTiming(sourceText);
    const plannerDeadline = startCreateIntelligentFollowupDeadline(intakeTiming.clientTimeoutMs);
    plannerDeadlineRef.current = plannerDeadline;
    try {
      const response = await fetch("/api/create/intelligent-followup", {
        method: "POST",
        headers: createMutationRequestHeaders(),
        signal: plannerDeadline.signal,
        body: JSON.stringify({
          text: sourceText,
          locale: surfaceLocale,
          anlassraumId: selectedAnlassraumId,
          dossierId: dossierId ?? null,
          intent: activeIntent,
          sourceUrls: currentMaterialRouting.sourceUrls,
          materialItems: currentMaterialRouting.materialItems,
          correlationId,
          draftId: savedDraftId,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body?.ok || !body?.result) {
        throw new Error("create_intelligent_followup_failed");
      }
      const nextFollowup = body.result as CreateIntelligentFollowupResult;
      setIntelligentFollowup(nextFollowup);
      setSupportHandoff(body.supportHandoff ?? null);
      setPlannerTrace(body.trace ?? null);
      setUnderstandingConfirmed(false);
      setActiveTopicLabel(null);
      setSelectedPrimaryTopic(null);
      setGroupedTopicLabels([]);
      setDocumentTopicOverviewOpened(false);
      setShowExpandedTopicPreview(false);
      setTopicExpansionDecision("idle");
      setParkedTopicLabels([]);
      setWorkspaceActionMode("default");
      setShowFollowupCorrectionComposer(false);
      setActionNotice(
        isPlannerReadyForStructuredHandoff(nextFollowup)
          ? surfaceLocale === "en"
            ? "Classification updated. Please confirm which part we should prepare first."
            : "Einordnung aktualisiert. Bitte bestätige, welchen Teil wir zuerst vorbereiten sollen."
          : surfaceLocale === "en"
            ? "The classification remains pending. You can continue manually and choose the next step yourself."
            : "Die Einordnung bleibt noch offen. Du kannst jetzt manuell fortfahren und den nächsten Schritt selbst wählen.",
      );
    } catch (error: unknown) {
      const plannerTimedOut =
        plannerDeadline.didTimeout() &&
        isCreateIntelligentFollowupAbortError(error);
      setSupportHandoff({
        status: "failed",
        technicalReference: correlationId,
        safeUserMessage: plannerTimedOut
          ? surfaceLocale === "en"
            ? "The classification took longer than expected. Your contribution remains saved."
            : "Die Einordnung hat länger als erwartet gedauert. Dein Beitrag bleibt gespeichert."
          : surfaceLocale === "en"
            ? "The support handoff could not be confirmed."
            : "Die technische Übergabe konnte nicht bestätigt werden.",
      });
      setActionNotice(
        plannerTimedOut
          ? surfaceLocale === "en"
            ? "The classification took longer than expected. Your contribution is saved; you can try again."
            : "Die Einordnung hat länger als erwartet gedauert. Dein Beitrag ist gespeichert; du kannst es erneut versuchen."
          : null,
      );
    } finally {
      plannerDeadline.clear();
      if (plannerDeadlineRef.current === plannerDeadline) {
        plannerDeadlineRef.current = null;
      }
      analysisRunInFlightRef.current = false;
      setIsRetryPlannerPending(false);
    }
  }, [
    activeIntent,
    currentMaterialRouting.materialItems,
    currentMaterialRouting.sourceUrls,
    dossierId,
    followupSnapshot?.originalText,
    intelligentFollowup?.sourceText,
    isRetryPlannerPending,
    normalizedIntakeText,
    privacyGate,
    savedDraftId,
    selectedAnlassraumId,
    surfaceLocale,
  ]);

  const handleRequestEditorialReview = React.useCallback(() => {
    void navigateWithCreateHandoff("request_review", "/community/contributions");
  }, [navigateWithCreateHandoff]);

  const handlePrepareSubmission = React.useCallback(() => {
    void navigateWithCreateHandoff("submit_draft", "/community/contributions");
  }, [navigateWithCreateHandoff]);

  const handlePrepareAnlassraum = React.useCallback(() => {
    if (!intelligentFollowup) {
      setActionNotice("Bitte beschreibe zuerst deinen Beitrag.");
      return;
    }
    if (!selectedPrimaryTopic) {
      setActionNotice("Bitte wähle zuerst ein Hauptthema, bevor wir einen Anlassraum vorbereiten.");
      return;
    }
    const baseHref = resolveCreateAnlassraumTargetHref(intelligentFollowup);
    void navigateWithCreateHandoff("prepare_anlassraum", baseHref);
  }, [intelligentFollowup, navigateWithCreateHandoff, selectedPrimaryTopic]);

  const handleOpenExistingAnlassraum = React.useCallback(() => {
    const prefill = normalizedIntakeText.trim();
    if (prefill) {
      setActionNotice("Dein Beitrag ist vorbereitet. Wähle jetzt einen Anlassraum oder starte einen neuen.");
    } else {
      setActionNotice(null);
    }
    router.push(buildCreateToRundenHref(prefill) as Parameters<typeof router.push>[0]);
  }, [normalizedIntakeText, router]);

  const handleOpenDossierAppend = React.useCallback(() => {
    if (!intelligentFollowup) {
      setActionNotice("Bitte beschreibe zuerst deinen Beitrag.");
      return;
    }
    const baseHref = buildCreateFollowupPrimaryCtaHref({
      ctaHref:
        buildCanonicalDossierHref(dossierId, {
          allowIndexFallback: true,
        }) ?? "/dossier",
      topics: intelligentFollowup.understanding.topics,
      statements: intelligentFollowup.understanding.statements,
      suggestions: intelligentFollowup.suggestions,
    });
    void navigateWithCreateHandoff("append_to_dossier", baseHref);
  }, [dossierId, intelligentFollowup, navigateWithCreateHandoff]);

  const handleOpenDossierCreate = React.useCallback(() => {
    const baseHref =
      buildCanonicalDossierHref(dossierId, {
        allowIndexFallback: true,
      }) ?? "/dossier";
    void navigateWithCreateHandoff("create_dossier", baseHref);
  }, [dossierId, navigateWithCreateHandoff]);

  const handlePrepareVote = React.useCallback(() => {
    if (!intelligentFollowup) {
      setActionNotice("Bitte beschreibe zuerst deinen Beitrag.");
      return;
    }
    const voteSuggestion = intelligentFollowup.suggestions.find((suggestion) => suggestion.kind === "vote");
    const baseHref = voteSuggestion
      ? buildCreateFollowupTargetHref({
          kind: "vote",
          ctaHref: "/swipes",
          topics: intelligentFollowup.understanding.topics,
          statements: intelligentFollowup.understanding.statements,
          suggestionTitle: voteSuggestion.title,
          suggestionHref: voteSuggestion.href ?? null,
        })
      : "/swipes?from=create";
    void navigateWithCreateHandoff("prepare_vote", baseHref);
  }, [intelligentFollowup, navigateWithCreateHandoff]);

  const handleDeepenAllTopics = React.useCallback(() => {
    if (!intelligentFollowup) {
      setActionNotice("Bitte beschreibe zuerst deinen Beitrag.");
      return;
    }
    saveStartDraftContext(
      createStartDraftContext({
        text: intelligentFollowup.sourceText,
        normalizedText: intelligentFollowup.sourceText,
        origin: "create_handoff",
        intent: "contribution",
        targetHint: "create",
        preview: buildCreatePlannerFollowupPreview({
          followup: intelligentFollowup,
        }),
      }),
    );
    setUnderstandingConfirmed(true);
    setShowFollowupCorrectionComposer(true);
    setActionNotice(
      "Mehrthemen-Arbeitsstand vorbereitet. Du kannst jetzt alle erkannten Themen im Draft vertiefen oder später im Account unter „Meine Arbeitsstände“ fortsetzen. Kein Auto-Publish, kein Auto-Dossier, kein Auto-Anlassraum und kein Auto-Graph.",
    );
  }, [intelligentFollowup]);

  const handleDeepenSingleTopic = React.useCallback((topicLabel: string) => {
    if (!intelligentFollowup) {
      setActionNotice("Bitte beschreibe zuerst deinen Beitrag.");
      return;
    }
    const normalizedTopicLabel = topicLabel.trim();
    if (!normalizedTopicLabel) {
      setActionNotice("Bitte wähle ein Thema für die Vertiefung.");
      return;
    }
    saveStartDraftContext(
      createStartDraftContext({
        text: intelligentFollowup.sourceText,
        normalizedText: intelligentFollowup.sourceText,
        origin: "create_handoff",
        intent: "theme_suggestion",
        targetHint: "create",
        preview: buildCreatePlannerFollowupPreview({
          followup: intelligentFollowup,
          topicLabel: normalizedTopicLabel,
        }),
      }),
    );
    setUnderstandingConfirmed(true);
    setShowFollowupCorrectionComposer(true);
    setActionNotice(
      `Thema „${normalizedTopicLabel}“ als Vertiefung vorgemerkt. Du kannst diesen Themenstrang jetzt im Draft weiter ausarbeiten. Nichts wird automatisch veröffentlicht, ins Dossier überführt oder als Faktenbehauptung bestätigt.`,
    );
  }, [intelligentFollowup]);

  const handleExpandTopicPreview = React.useCallback(() => {
    setShowExpandedTopicPreview(true);
    setTopicExpansionDecision("expanded");
    setActionNotice("Das weitere Thema wird jetzt angezeigt.");
  }, []);

  const handleOpenDocumentTopicOverview = React.useCallback(() => {
    setDocumentTopicOverviewOpened(true);
    setShowExpandedTopicPreview(true);
    setTopicExpansionDecision("expanded");
    setActionNotice("Alle erkannten Themen sind jetzt geöffnet.");
  }, []);

  const handleKeepCompactTopicPreview = React.useCallback(() => {
    setShowExpandedTopicPreview(false);
    setTopicExpansionDecision("compact");
    setActionNotice("Du arbeitest zunächst mit der kompakten Themenansicht weiter.");
  }, []);

  const handlePrepareLinkReview = React.useCallback(async () => {
    if (!privacyGate.ensureActiveProcessingAllowed("create-link-analysis")) return;
    if (!currentLinkDetection.hasLink || !currentLinkDetection.primaryUrl) {
      setActionNotice(
        surfaceLocale === "en"
          ? "I could not detect a link."
          : "Ich habe gerade keinen Link erkannt.",
      );
      return;
    }
    const currentState = intelligentFollowup?.meta?.analysis?.state ?? "link_detected";
    if (currentState === "link_detected") {
      setIntelligentFollowup(
        buildCreateTechnicalFollowup({
          text: normalizedIntakeText,
          analysisState: "entitlement_required",
          sourceType: "link",
          sourceUrl: currentLinkDetection.primaryUrl,
          sourceLoaded: false,
          userMessage:
            surfaceLocale === "en"
              ? "The full link and document analysis uses your available analysis or research allowance."
              : "Die vollständige Link- und Dokumentanalyse nutzt dein verfügbares Analyse-/Recherche-Kontingent.",
        }),
      );
      setActionNotice(null);
      return;
    }

    if (isStarting || analysisRunInFlightRef.current) return;
    analysisRunInFlightRef.current = true;
    setIsStarting(true);
    setSupportHandoff(null);
    setActionNotice(null);
    setDocumentTopicOverviewOpened(false);
    setTopicExpansionDecision("link");
    setIntelligentFollowup(
      buildCreateTechnicalFollowup({
        text: normalizedIntakeText,
        analysisState: "fetching",
        sourceType: "link",
        sourceUrl: currentLinkDetection.primaryUrl,
        sourceLoaded: false,
        userMessage:
          surfaceLocale === "en"
            ? "I’m loading the linked content and preparing the analysis. No topics are derived before that."
            : "Ich lade den Linkinhalt und bereite die Analyse vor. Vorher leite ich keine Themen ab.",
      }),
    );

    try {
      const correlationId = createClientCorrelationId();
      const response = await fetch("/api/create/link-analysis", {
        method: "POST",
        headers: createMutationRequestHeaders(),
        body: JSON.stringify({
          text: normalizedIntakeText,
          url: currentLinkDetection.primaryUrl,
          locale: surfaceLocale,
          additionalContext: linkClarificationState?.additionalContext ?? "",
          correlationId,
          draftId: savedDraftId,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body?.ok || !body?.result) {
        throw new Error("create_link_analysis_failed");
      }
      setIntelligentFollowup(body.result as CreateIntelligentFollowupResult);
      setSupportHandoff(body.supportHandoff ?? null);
      setWorkspaceActionMode("default");
      setChatContinuationText("");
      setShowFollowupCorrectionComposer(false);
      setDocumentTopicOverviewOpened(false);
    } catch {
      const failedHandoff: CreateSupportHandoffPublic = {
        status: "failed",
        technicalReference: createClientCorrelationId(),
        safeUserMessage:
          surfaceLocale === "en"
            ? "The support handoff could not be confirmed."
            : "Die technische Übergabe konnte nicht bestätigt werden.",
      };
      setSupportHandoff(failedHandoff);
      setIntelligentFollowup(
        buildCreateTechnicalFollowup({
          text: normalizedIntakeText,
          analysisState: "ai_failed",
          sourceType: "link",
          sourceUrl: currentLinkDetection.primaryUrl,
          sourceLoaded: false,
          userMessage: buildCreateSupportFailureCopy({
            locale: surfaceLocale as CreateVoxyLocale,
            handoff: failedHandoff,
          }).paragraphs.join(" "),
        }),
      );
    } finally {
      analysisRunInFlightRef.current = false;
      setIsStarting(false);
    }
  }, [
    currentLinkDetection,
    intelligentFollowup?.meta?.analysis?.state,
    isStarting,
    linkClarificationState?.additionalContext,
    normalizedIntakeText,
    privacyGate,
    savedDraftId,
    surfaceLocale,
  ]);

  const handleDeferExpandedReview = React.useCallback(() => {
    setShowExpandedTopicPreview(false);
    setTopicExpansionDecision("later");
    setActionNotice("Vollständige Auswertung bleibt vorerst zurückgestellt.");
  }, []);

  const handleContinueInAccount = React.useCallback(() => {
    if (!intelligentFollowup) {
      setActionNotice("Bitte beschreibe zuerst deinen Beitrag.");
      return;
    }
    saveStartDraftContext(
      createStartDraftContext({
        text: intelligentFollowup.sourceText,
        normalizedText: intelligentFollowup.sourceText,
        origin: "create_handoff",
        intent: "contribution",
        targetHint: "create",
        preview: buildCreatePlannerFollowupPreview({
          followup: intelligentFollowup,
        }),
      }),
    );
    router.push("/account");
  }, [intelligentFollowup, router]);

  const handleSaveQuestion = React.useCallback(async () => {
    const branches = intelligentFollowup
      ? buildCreateStructureBranches(
          intelligentFollowup,
          Math.max(4, entitlements.maxVisibleAiProposals),
        )
      : [];
    const activeBranch =
      branches.find((branch) => branch.title === selectedPrimaryTopic) ??
      branches.find((branch) => branch.title === activeTopicLabel) ??
      branches[0] ??
      null;
    const question =
      activeBranch?.suggestedQuestions[0] ??
      activeBranch?.voteQuestions[0] ??
      "Welche Aussage oder Frage soll als Nächstes geklärt werden?";
    await persistSavedWorkstate({
      type: "question_candidate",
      visibility: "private",
      status: "saved",
      title: activeBranch ? `Frage zu ${activeBranch.title}` : "Eigene Frage",
      content: question,
      topicLabel: activeBranch?.title ?? null,
      successMessage: "Die Frage wurde gespeichert und erscheint jetzt in deinem Konto unter „Eigene Fragen“.",
    });
  }, [
    activeTopicLabel,
    entitlements.maxVisibleAiProposals,
    intelligentFollowup,
    persistSavedWorkstate,
    selectedPrimaryTopic,
  ]);

  const handleSaveTopic = React.useCallback(async () => {
    const branches = intelligentFollowup
      ? buildCreateStructureBranches(
          intelligentFollowup,
          Math.max(4, entitlements.maxVisibleAiProposals),
        )
      : [];
    const activeBranch =
      branches.find((branch) => branch.title === selectedPrimaryTopic) ??
      branches.find((branch) => branch.title === activeTopicLabel) ??
      branches[0] ??
      null;
    await persistSavedWorkstate({
      type: "topic_candidate",
      visibility: "private",
      status: "saved",
      title: activeBranch?.title ?? "Vorgemerktes Thema",
      content:
        activeBranch?.summary ??
        intelligentFollowup?.understanding.summary ??
        "Das Thema bleibt als persönlicher Arbeitsstand gespeichert.",
      topicLabel: activeBranch?.title ?? null,
      successMessage: "Das Thema wurde gespeichert und erscheint jetzt in deinem Konto unter „Vorgemerkte Themen“.",
    });
  }, [
    activeTopicLabel,
    entitlements.maxVisibleAiProposals,
    intelligentFollowup,
    persistSavedWorkstate,
    selectedPrimaryTopic,
  ]);

  const handleSaveSource = React.useCallback(async () => {
    const sourceUrl =
      currentLinkDetection.primaryUrl ?? currentMaterialRouting.sourceUrls[0] ?? null;
    await persistSavedWorkstate({
      type: "source_list",
      visibility: "private",
      status: "saved",
      title: sourceUrl ? "Vorgemerkte Quelle" : "Quellenhinweis",
      content: sourceUrl
        ? "Der Link wurde als Quellenhinweis gespeichert. Der Linkinhalt wurde noch nicht automatisch geladen."
        : "Zum aktuellen Beitrag wurde ein Quellenhinweis ohne extern geladenen Link gespeichert.",
      successMessage: "Der Quellenhinweis wurde gespeichert und erscheint jetzt in deinem Konto unter „Quellenlisten“.",
      sourceUrl,
    });
  }, [
    currentLinkDetection.primaryUrl,
    currentMaterialRouting.sourceUrls,
    persistSavedWorkstate,
  ]);

  const handleSaveInternal = React.useCallback(async () => {
    if (!canCreateInternalWorkstate) {
      setActionNotice("Interne Notizen sind nur im Admin-Kontext verfügbar.");
      return;
    }
    const branches = intelligentFollowup
      ? buildCreateStructureBranches(
          intelligentFollowup,
          Math.max(4, entitlements.maxVisibleAiProposals),
        )
      : [];
    const activeBranch =
      branches.find((branch) => branch.title === selectedPrimaryTopic) ??
      branches.find((branch) => branch.title === activeTopicLabel) ??
      branches[0] ??
      null;
    await persistSavedWorkstate({
      type: "internal_note",
      visibility: "admin_internal",
      status: "saved",
      title: activeBranch ? `Interne Notiz zu ${activeBranch.title}` : "Interne Notiz",
      content:
        activeBranch?.summary ??
        intelligentFollowup?.understanding.summary ??
        "Interner Arbeitsstand ohne Veröffentlichung.",
      topicLabel: activeBranch?.title ?? null,
      successMessage: "Die interne Notiz wurde gespeichert und erscheint jetzt im Admin-Bereich deiner Arbeitsstände.",
    });
  }, [
    activeTopicLabel,
    canCreateInternalWorkstate,
    entitlements.maxVisibleAiProposals,
    intelligentFollowup,
    persistSavedWorkstate,
    selectedPrimaryTopic,
  ]);

  const handlePrepareCommunity = React.useCallback(async () => {
    const branches = intelligentFollowup
      ? buildCreateStructureBranches(
          intelligentFollowup,
          Math.max(4, entitlements.maxVisibleAiProposals),
        )
      : [];
    const activeBranch =
      branches.find((branch) => branch.title === selectedPrimaryTopic) ??
      branches.find((branch) => branch.title === activeTopicLabel) ??
      branches[0] ??
      null;
    const question =
      activeBranch?.suggestedQuestions[0] ??
      activeBranch?.voteQuestions[0] ??
      "Welche Leitfrage soll für die Community überprüfbar vorbereitet werden?";
    const success = await persistSavedWorkstate({
      type: "community_candidate",
      visibility: "community_candidate",
      status: "needs_review",
      title: activeBranch
        ? `Community-Kandidat: ${activeBranch.title}`
        : "Community-Kandidat",
      content: `Ich bereite daraus einen überprüfbaren Community-Beitrag vor. Leitfrage: ${question}`,
      topicLabel: activeBranch?.title ?? null,
      successMessage:
        "Ich bereite daraus einen überprüfbaren Community-Beitrag vor. Er bleibt als Kandidat gespeichert und wird nicht automatisch veröffentlicht.",
    });
    if (success) {
      setShowFollowupCorrectionComposer(true);
      setWorkspaceActionMode("edit");
    }
  }, [
    activeTopicLabel,
    entitlements.maxVisibleAiProposals,
    intelligentFollowup,
    persistSavedWorkstate,
    selectedPrimaryTopic,
  ]);

  const handleDeferWork = React.useCallback(async () => {
    const branches = intelligentFollowup
      ? buildCreateStructureBranches(
          intelligentFollowup,
          Math.max(4, entitlements.maxVisibleAiProposals),
        )
      : [];
    const activeBranch =
      branches.find((branch) => branch.title === selectedPrimaryTopic) ??
      branches.find((branch) => branch.title === activeTopicLabel) ??
      branches[0] ??
      null;
    const success = await persistSavedWorkstate({
      type: "deferred_work",
      visibility: "private",
      status: "saved",
      title: activeBranch
        ? `Später weiterarbeiten: ${activeBranch.title}`
        : "Später weiterarbeiten",
      content:
        activeBranch?.summary ??
        intelligentFollowup?.understanding.summary ??
        "Dieser Arbeitsstand bleibt für später gespeichert.",
      topicLabel: activeBranch?.title ?? null,
      successMessage:
        "Der Arbeitsstand wurde gespeichert und erscheint jetzt in deinem Konto unter „Noch nicht veröffentlichte Entwürfe“.",
    });
    if (success) router.push("/account");
  }, [
    activeTopicLabel,
    entitlements.maxVisibleAiProposals,
    intelligentFollowup,
    persistSavedWorkstate,
    router,
    selectedPrimaryTopic,
  ]);

  const confirmFactcheckServiceStart = React.useCallback(() => {
    setFactcheckMessage(
      "Quellenmodus aktiv. Ergänze unten Hinweise, Links oder Dokumente. Eine externe Quellenanalyse startet erst nach deiner ausdrücklichen Bestätigung.",
    );
    setWorkspaceActionMode("source");
    setChatContinuationText("");
    setShowFollowupCorrectionComposer(true);
    setActionNotice("Quellenmodus geöffnet.");
  }, []);

  const handleSaveOnly = React.useCallback(async () => {
    if (!privacyGate.ensureActiveProcessingAllowed("create-save")) return;
    await persistFollowupWorkstate(false);
  }, [persistFollowupWorkstate, privacyGate]);

  if (gate.status === "loading") {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 text-center text-[rgb(var(--muted))]">
        {text.loadingAccess}
      </main>
    );
  }
  if (gate.status === "anon") {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 text-center text-[rgb(var(--muted))]">
        {text.loginRequired}
      </main>
    );
  }
  if (gate.status === "blocked") {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 text-center text-[rgb(var(--muted))]">
        {text.submissionBlocked}
      </main>
    );
  }

  return (
    <section className="public-canvas vog-page-stage min-h-screen">
      <div
        data-create-workspace-host="wide-screen"
        className="public-shell vog-main-shell min-h-screen w-full max-w-none space-y-3 px-[clamp(0.75rem,2vw,1.5rem)] py-2 md:space-y-4 md:px-[clamp(1rem,2.4vw,2rem)]"
      >
        <section
          className="create-public-shell create-dialog-workspace mx-auto w-full max-w-none overflow-visible px-0 py-1 md:py-2"
          data-create-stage-shell="true"
        >
          <CreateWorkspaceShell
            locale={surfaceLocale === "en" ? "en" : "de"}
            activeStage={workspaceActiveStage}
            stages={workspaceStages}
            phase={workspaceShellPhase}
            isBusy={isStarting}
            notice={workspaceNotice}
            structureOverview={{
              ...structureOverviewMetrics,
              nextStepLabel: workspaceNextStepLabel,
            }}
            chatThread={renderWorkspaceThread()}
            footer={
              <div
                data-create-shell-secondary-details
                className="text-sm"
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 py-0.5 text-left text-[10px] font-medium text-[rgb(var(--muted))]"
                  aria-expanded={workspaceTransparencyOpen}
                  onClick={() => setWorkspaceTransparencyOpen((current) => !current)}
                >
                  Details & Transparenz
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${workspaceTransparencyOpen ? "rotate-90" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M7 4.5 13 10l-6 5.5" />
                  </svg>
                </button>
                {workspaceTransparencyOpen ? (
                  <div className="pt-2">
                    <FrontendAiTransparencyPanel model={frontendAiTransparencyModel} />
                  </div>
                ) : null}
              </div>
            }
            renderSidecar={(density) => (
              <CreateDebattenstandSidecar
                model={debattenstandModel}
                density={density}
                onExpandTopics={
                  debattenstandModel.hiddenTopicCount > 0
                    ? handleOpenDocumentTopicOverview
                    : undefined
                }
              />
            )}
            renderMobileSidecarSummary={(onOpen) => (
              <CreateDebattenstandStatusBar model={debattenstandModel} onOpen={onOpen} />
            )}
            composer={
              <SharedCreateComposer
                badge={surfaceTexts.badgeCanonical}
                subline={surfaceTexts.sublineCanonical}
                texts={surfaceComposerTexts}
                topMeta={
                  !hasStarted || intakeRestoreInfo || scopeNotice ? (
                    <div className="space-y-2">
                      {startDraftRestore.draft ? (
                        <>
                          <CreateStartDraftHandoff
                            draft={startDraftRestore.draft}
                            pendingImport={startDraftRestore.pendingImport}
                            onApplyPendingImport={startDraftRestore.applyPendingImport}
                            onDismissPendingImport={startDraftRestore.dismissPendingImport}
                            onClearDraftState={startDraftRestore.clearDraftState}
                          />
                          <CreateDraftNextActionGate
                            draft={startDraftRestore.draft}
                            initialNextActionParam={initialNextActionParam}
                            hasStarted={hasStarted}
                            isAuthenticated={entitlements.isAuthenticated}
                            canDeepResearch={entitlements.canDeepResearch}
                            onStartLightAnalysis={() => void handleStart()}
                            onConfirmFactcheck={confirmFactcheckServiceStart}
                          />
                        </>
                      ) : null}
                      {intakeRestoreInfo ? (
                        <p className="max-w-2xl text-xs text-[rgb(var(--muted))]">{intakeRestoreInfo}</p>
                      ) : null}
                      {scopeNotice ? (
                        <div
                          className={`rounded-2xl border px-3 py-2 text-xs ${
                            scopeNotice.tone === "operator"
                              ? "border-[rgb(var(--border))] bg-[rgb(var(--bg))] text-[rgb(var(--fg))]"
                              : scopeNotice.tone === "limited"
                                ? "border-[rgb(var(--border))] bg-[rgb(var(--bg))] text-[rgb(var(--muted))]"
                                : "border-[rgb(var(--border))] bg-[rgb(var(--bg))] text-[rgb(var(--fg))]"
                          }`}
                        >
                          <p className="font-semibold">{scopeNotice.title}</p>
                          <p className="mt-1">{scopeNotice.body}</p>
                        </div>
                      ) : null}
                      {fromManualAnlassraumContinueCreate && initialRundenCreateHandoff ? (
                        <div
                          className={`rounded-2xl border px-3 py-2 text-xs ${
                            initialRundenCreateHandoff.status === "loaded"
                              ? "border-emerald-300/60 bg-emerald-50/80 text-emerald-800"
                              : "border-amber-300/60 bg-amber-50/80 text-amber-800"
                          }`}
                          data-create-runden-handoff-status={initialRundenCreateHandoff.status}
                        >
                          <p className="font-semibold">{initialRundenCreateHandoff.title}</p>
                          <p className="mt-1">{initialRundenCreateHandoff.detail}</p>
                        </div>
                      ) : null}
                    </div>
                  ) : undefined
                }
                modeOrder={CREATE_PRODUCT_MODES}
                modeDefinitions={surfaceModeDefinitions}
                activeMode={productMode}
                onModeChange={(modeOption) => {
                  setProductMode(modeOption);
                  setActiveContextAnchorId(null);
                  setIntelligentFollowup(null);
                  setUnderstandingConfirmed(false);
                  setActiveTopicLabel(null);
                  setSelectedPrimaryTopic(null);
                  setGroupedTopicLabels([]);
                  setDocumentTopicOverviewOpened(false);
                  setShowExpandedTopicPreview(false);
                  setTopicExpansionDecision("idle");
                  setParkedTopicLabels([]);
                  setWorkspaceActionMode("default");
                  setLinkClarificationState(null);
                  setChatContinuationText("");
                  setAnalysisSceneMode(null);
                  if (!hasStarted) return;
                  setFollowupSurface("none");
                  setGuidedBridgeConfirmed(modeOption !== "guided");
                }}
                helperText={intakeHelperText}
                inputId="create-primary-intake"
                inputLabel={productModeConfig.inputLabel}
                inputValue={workspaceComposerValue}
                inputPlaceholder={workspaceComposerPlaceholder}
                onInputChange={handleWorkspaceComposerChange}
                onAttachmentsChange={setComposerAttachments}
                onStart={hasStarted ? handleContinueConversation : handleStart}
                startLabel={workspaceComposerStartLabel}
                startDisabled={workspaceComposerStartDisabled}
                startBusy={isStarting}
                startBusyLabel={workspaceComposerStartBusyLabel}
                inputAutoFocus={hasStarted && workspaceActionMode !== "default"}
                secondaryAction={{
                  href: contextualReturnHref ?? "/account",
                  label: !hasStarted && contextualReturnHref ? surfaceTexts.returnToContextLabel : "",
                }}
                contextAnchors={surfaceContextAnchors}
                activeContextAnchorId={activeContextAnchorId}
                onContextAnchorSelect={(anchorId) => {
                  const anchor = resolveCreateContextAnchorById(anchorId, surfaceLocale);
                  setActiveContextAnchorId(anchorId);
                  setIntelligentFollowup(null);
                  setUnderstandingConfirmed(false);
                  setActiveTopicLabel(null);
                  setSelectedPrimaryTopic(null);
                  setGroupedTopicLabels([]);
                  setDocumentTopicOverviewOpened(false);
                  setShowExpandedTopicPreview(false);
                  setTopicExpansionDecision("idle");
                  setParkedTopicLabels([]);
                  setWorkspaceActionMode("default");
                  setLinkClarificationState(null);
                  setChatContinuationText("");
                  if (!anchor) return;
                  setProductMode(anchor.mode);
                  if (!hasStarted) return;
                  setFollowupSurface("none");
                  setGuidedBridgeConfirmed(anchor.mode !== "guided");
                }}
                activeContextAnchorLead={activeContextAnchor?.lead}
                helperLinks={surfaceHelperLinks}
                error={intakeError}
                errorRef={intakeErrorFocusRef}
                contextBanner={
                  fromRundenFlow ? (
                    <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2 text-xs text-[rgb(var(--fg))]">
                      <p className="font-semibold">{surfaceTexts.rundenContextTitle}</p>
                      <p className="mt-1">
                        {readableRundenContextLabel
                          ? surfaceTexts.rundenContextWithLabel(readableRundenContextLabel)
                          : surfaceTexts.rundenContextFallback}{" "}
                        {surfaceTexts.rundenContextReturnHint}
                      </p>
                    </div>
                  ) : null
                }
                minRows={7}
                collapseModeSelector
                embeddedWorkspace
                showSceneRail={false}
                experienceVariant="workspace_shell"
                workspacePhase={hasStarted ? "continuation" : "initial"}
                hideAlternateModeDisclosure
                locale={surfaceLocale}
              />
            }
          />
        </section>
      </div>
    </section>
  );
}
