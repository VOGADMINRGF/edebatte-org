import {
  buildCreateHandoffDraft,
  saveCreateHandoffDraft,
  type CreateHandoffAction,
  type CreateHandoffDraft,
} from "@/features/create/createHandoff";
import {
  submitFactcheckSourceReviewRequest,
  type FactcheckSourceReviewSubmit,
} from "@/features/create/factcheckSourceAdapterBridge";
import type { CreateHandoffReviewQueueItem } from "@/features/create/createHandoffReviewQueue";
import type { CreateIntelligentFollowupResult } from "@/features/create/intelligentFollowupContract";
import type { NormalizedMaterialItem } from "@/features/create/materialRouting";
import type { RequestScopeSummary } from "@/lib/server/auth/requestScope";

export const CREATE_HANDOFF_REVIEW_QUEUE_RUNTIME_BLOCKERS = [
  "missing_review_queue_item",
  "unsafe_auto_create_flag",
  "unsafe_auto_publish_flag",
  "missing_followup_planner",
  "missing_followup_graph_match",
] as const;

export type CreateHandoffReviewQueueRuntimeBlocker =
  (typeof CREATE_HANDOFF_REVIEW_QUEUE_RUNTIME_BLOCKERS)[number];

export type CreateHandoffReviewQueueRuntimeContext = {
  result: CreateIntelligentFollowupResult;
  dossierId?: string | null;
  anlassraumId?: string | null;
  sourceUrls?: string[];
  materialItems?: NormalizedMaterialItem[];
};

export type CreateHandoffReviewQueueRuntimeInput = {
  selectedAction: CreateHandoffAction;
  draft: CreateHandoffDraft;
  dossierId: string | null;
  anlassraumId: string | null;
};

type RuntimePersistSuccess = {
  ok: true;
  record?: {
    id?: string;
    regionId?: string | null;
    organizationId?: string | null;
    dossierId?: string | null;
    anlassraumId?: string | null;
    reviewState?: string | null;
    intakeClassification?: string | null;
  } | null;
  requestScope?: RequestScopeSummary | null;
};

type RuntimePersistFailure = {
  ok: false;
  error: string;
  accessDecision?: {
    title?: string;
    body?: string;
  } | null;
};

type RuntimePersistResponse = RuntimePersistSuccess | RuntimePersistFailure;

export type CreateHandoffReviewQueueRuntimePersist = (
  input: CreateHandoffReviewQueueRuntimeInput,
) => Promise<RuntimePersistResponse>;

export type SubmitCreateHandoffReviewQueueItemToRuntimeResult =
  | ({
      ok: true;
      requestScope: RequestScopeSummary | null;
      record: RuntimePersistSuccess["record"] | null;
    } & CreateHandoffReviewQueueRuntimeInput)
  | {
      ok: false;
      blocked: true;
      blockers: CreateHandoffReviewQueueRuntimeBlocker[];
      error: "blocked_unwired" | "runtime_access_denied";
      message: string;
    }
  | {
      ok: false;
      blocked: false;
      blockers: [];
      error: "runtime_submit_failed";
      message: string;
    };

function mapCreateHandoffReviewQueueItemToSelectedAction(
  item: CreateHandoffReviewQueueItem,
): CreateHandoffAction {
  if (item.target === "dossier_candidate") return "create_dossier";
  if (item.target === "anlassraum_candidate") return "prepare_anlassraum";
  if (item.target === "participation_space_candidate") {
    return "prepare_participation_space";
  }
  if (item.target === "factcheck_request") return "request_factcheck";
  return "request_review";
}

function defaultBlockedMessage(
  blockers: readonly CreateHandoffReviewQueueRuntimeBlocker[],
): string {
  if (
    blockers.includes("missing_followup_planner") ||
    blockers.includes("missing_followup_graph_match")
  ) {
    return "Der Entwurf kann noch nicht sicher an die bestehende Review Queue übergeben werden, weil der belastbare Create-Handoff-Kontext fehlt.";
  }
  if (
    blockers.includes("unsafe_auto_create_flag") ||
    blockers.includes("unsafe_auto_publish_flag")
  ) {
    return "Der Entwurf bleibt blockiert, weil automatische Laufzeit-Effekte nicht in die Review Queue übernommen werden dürfen.";
  }
  return "Der Entwurf bleibt lokal, weil der sichere Review-Queue-Submit-Contract noch nicht belastbar nachgewiesen ist.";
}

async function persistCreateHandoffReviewQueueInput(
  input: CreateHandoffReviewQueueRuntimeInput,
): Promise<RuntimePersistResponse> {
  const response = await fetch("/api/create/handoffs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      draft: input.draft,
      dossierId: input.dossierId,
      anlassraumId: input.anlassraumId,
    }),
  });
  const body = (await response.json().catch(() => null)) as
    | {
        ok?: boolean;
        error?: string;
        record?: RuntimePersistSuccess["record"];
        requestScope?: RequestScopeSummary | null;
        accessDecision?: {
          title?: string;
          body?: string;
        } | null;
      }
    | null;

  if (!response.ok || !body?.ok) {
    return {
      ok: false,
      error: body?.error ?? "create_handoff_persist_failed",
      accessDecision: body?.accessDecision ?? null,
    };
  }

  return {
    ok: true,
    record: body.record ?? null,
    requestScope: body.requestScope ?? null,
  };
}

export function getCreateHandoffReviewQueueRuntimeBlockers(
  item: CreateHandoffReviewQueueItem | null | undefined,
  context: CreateHandoffReviewQueueRuntimeContext,
): CreateHandoffReviewQueueRuntimeBlocker[] {
  const blockers: CreateHandoffReviewQueueRuntimeBlocker[] = [];

  if (!item) blockers.push("missing_review_queue_item");
  if (item?.autoCreate !== false) blockers.push("unsafe_auto_create_flag");
  if (item?.autoPublish !== false) blockers.push("unsafe_auto_publish_flag");
  if (!context.result.meta?.planner) blockers.push("missing_followup_planner");
  if (!context.result.meta?.graphMatch) blockers.push("missing_followup_graph_match");

  return blockers;
}

export function canSubmitCreateHandoffReviewQueueItemToRuntime(
  item: CreateHandoffReviewQueueItem | null | undefined,
  context: CreateHandoffReviewQueueRuntimeContext,
): boolean {
  return getCreateHandoffReviewQueueRuntimeBlockers(item, context).length === 0;
}

export function mapCreateHandoffReviewQueueItemToExistingReviewQueueInput(
  item: CreateHandoffReviewQueueItem,
  context: CreateHandoffReviewQueueRuntimeContext,
): CreateHandoffReviewQueueRuntimeInput {
  const selectedAction = mapCreateHandoffReviewQueueItemToSelectedAction(item);
  const draft = buildCreateHandoffDraft({
    result: context.result,
    selectedAction,
    id: item.sourceDraftId,
    createdAt: item.createdAt,
    sourceUrls: context.sourceUrls,
    materialItems: context.materialItems,
    existingMatchDecision: item.existingMatchDecision,
    authorStandpoint: item.authorStandpoint,
    relatedMatchId: item.relatedMatchId,
    relatedMatchTitle: item.topicTitle,
  });

  return {
    selectedAction,
    draft,
    dossierId: context.dossierId ?? null,
    anlassraumId: context.anlassraumId ?? null,
  };
}

export async function submitCreateHandoffReviewQueueItemToRuntime(
  item: CreateHandoffReviewQueueItem,
  options: CreateHandoffReviewQueueRuntimeContext & {
    persist?: CreateHandoffReviewQueueRuntimePersist;
    submitFactcheck?: FactcheckSourceReviewSubmit;
  },
): Promise<SubmitCreateHandoffReviewQueueItemToRuntimeResult> {
  const blockers = getCreateHandoffReviewQueueRuntimeBlockers(item, options);
  if (blockers.length > 0) {
    return {
      ok: false,
      blocked: true,
      blockers,
      error: "blocked_unwired",
      message: defaultBlockedMessage(blockers),
    };
  }

  if (item.target === "factcheck_request") {
    const submission = await submitFactcheckSourceReviewRequest(
      {
        item,
        result: options.result,
        sourceUrls: options.sourceUrls,
        materialItems: options.materialItems,
      },
      {
        submit: options.submitFactcheck,
      },
    );

    if (submission.ok === false) {
      if (submission.blocked) {
        return {
          ok: false,
          blocked: true,
          blockers: [],
          error: submission.error,
          message: submission.message,
        };
      }

      return {
        ok: false,
        blocked: false,
        blockers: [],
        error: "runtime_submit_failed",
        message: submission.message,
      };
    }

    return {
      ok: true,
      selectedAction: "request_factcheck",
      draft: buildCreateHandoffDraft({
        result: options.result,
        selectedAction: "request_factcheck",
        id: item.sourceDraftId,
        createdAt: item.createdAt,
        sourceUrls: options.sourceUrls,
        materialItems: options.materialItems,
        existingMatchDecision: item.existingMatchDecision,
        authorStandpoint: item.authorStandpoint,
        relatedMatchId: item.relatedMatchId,
        relatedMatchTitle: item.topicTitle,
      }),
      dossierId: options.dossierId ?? null,
      anlassraumId: options.anlassraumId ?? null,
      requestScope: submission.requestScope,
      record: {
        id: submission.jobId,
        dossierId: options.dossierId ?? null,
        anlassraumId: options.anlassraumId ?? null,
        reviewState: submission.status,
        intakeClassification: "factcheck_request",
      },
    };
  }

  const input = mapCreateHandoffReviewQueueItemToExistingReviewQueueInput(item, options);
  const persist = options.persist ?? persistCreateHandoffReviewQueueInput;

  try {
    const response = await persist(input);
    if (!response.ok) {
      const accessDecision = "accessDecision" in response ? response.accessDecision : null;
      const title = accessDecision?.title?.trim();
      const detail = accessDecision?.body?.trim();
      return {
        ok: false,
        blocked: true,
        blockers: [],
        error: "runtime_access_denied",
        message:
          title || detail
            ? [title, detail].filter(Boolean).join(". ")
            : "Der Entwurf kann aktuell nicht produktiv an die bestehende Review Queue übergeben werden.",
      };
    }

    saveCreateHandoffDraft(input.draft);
    return {
      ok: true,
      ...input,
      requestScope: response.requestScope ?? null,
      record: response.record ?? null,
    };
  } catch {
    return {
      ok: false,
      blocked: false,
      blockers: [],
      error: "runtime_submit_failed",
      message: "Der Entwurf konnte nicht an die bestehende Review Queue übergeben werden. Bitte erneut versuchen.",
    };
  }
}
