import "server-only";

import crypto from "node:crypto";
import { coreCol, shouldUseInMemoryMongoFallback } from "@core/db/triMongo";
import { persistCreateSavedWorkstate } from "@/features/create/createSavedWorkstateRepo";
import {
  evaluatePublicQuestionGeneralization,
  type PublicQuestionActorContext,
  type PublicQuestionGeneralizationResult,
  type PublicQuestionProcedureContext,
} from "@/features/create/safety/publicQuestionGeneralization";
import type { MaterialExtractionJob } from "./materialExtractionJobs";
import type { MaterialGraphFirstContext, MaterialGraphRecommendedAction } from "./materialGraphFirstContext";
import type { MaterialStructuredDraftResult } from "./materialStructuredDrafts";

export type MaterialReviewAction = MaterialGraphRecommendedAction;

export type MaterialReviewSelection = {
  questionId: string;
  selected: boolean;
  action: MaterialReviewAction | null;
  theme: string;
  text: string;
  rationale: string;
  sourceAnchors: string[];
  questionGuard: PublicQuestionGeneralizationResult;
  options: Array<{
    text: string;
    source: "document" | "ai_suggestion" | "human_edit";
  }>;
};

export type MaterialDocumentReviewSession = {
  id: string;
  materialId: string;
  materialLabel: string;
  jobId: string;
  actorId: string;
  organizationId: string | null;
  status: "awaiting_review" | "prepared";
  provider: "mistral" | "anthropic" | "mixed";
  graphFirst: MaterialGraphFirstContext;
  themes: string[];
  decisionPoints: string[];
  claimsOrSourceHints: Array<{ text: string; sourceAnchors: string[] }>;
  uncertainties: string[];
  provenance: string[];
  selections: MaterialReviewSelection[];
  preparedWorkstateIds: string[];
  reviewRequired: true;
  draftOnly: true;
  publicOutputAllowed: false;
  noAutoPublish: true;
  noAutoCreateRound: true;
  noAutoGraphWrite: true;
  noAutoMerge: true;
  createdAt: string;
  updatedAt: string;
};

type MaterialReviewRepository = {
  save(session: MaterialDocumentReviewSession): Promise<void>;
  get(id: string): Promise<MaterialDocumentReviewSession | null>;
};

const COLLECTION = "edebatte_material_document_reviews";
const memory = new Map<string, MaterialDocumentReviewSession>();
let repositoryOverride: MaterialReviewRepository | null = null;
let indexesReady = false;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeQuestionText(value: string): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringValues(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((entry) => normalizeQuestionText(String(entry ?? ""))).filter(Boolean)
    : [];
}

const ACTOR_TYPES = new Set<PublicQuestionActorContext["type"]>([
  "person",
  "company",
  "party",
  "organization",
  "public_body",
  "media",
  "other",
]);
const ACTOR_ROLES = new Set<PublicQuestionActorContext["role"]>([
  "source",
  "initiator",
  "affected_party",
  "competent_authority",
  "position_holder",
  "documented_case",
  "procedure_subject",
  "context",
  "target",
]);
const PROCEDURE_KINDS = new Set<PublicQuestionProcedureContext["kind"]>([
  "permit",
  "procurement",
  "merger",
  "statute",
  "parliamentary_procedure",
  "administrative_procedure",
  "other",
]);

function persistedActorContexts(selection: Record<string, unknown>) {
  const legacyGeneralization = recordValue(selection.generalization);
  const value = selection.actorContexts ?? legacyGeneralization?.actorContexts;
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry): PublicQuestionActorContext[] => {
    const actor = recordValue(entry);
    if (!actor) return [];
    const id = normalizeQuestionText(String(actor.id ?? ""));
    const name = normalizeQuestionText(String(actor.name ?? ""));
    const type = String(actor.type ?? "") as PublicQuestionActorContext["type"];
    const role = String(actor.role ?? "") as PublicQuestionActorContext["role"];
    const evidenceRefs = stringValues(actor.evidenceRefs);
    if (
      !id ||
      !name ||
      !ACTOR_TYPES.has(type) ||
      !ACTOR_ROLES.has(role) ||
      evidenceRefs.length === 0
    ) {
      return [];
    }
    return [{ id, name, type, role, evidenceRefs }];
  });
}

function persistedProcedure(
  selection: Record<string, unknown>,
): PublicQuestionProcedureContext | null {
  const legacyGeneralization = recordValue(selection.generalization);
  const procedure = recordValue(
    selection.procedure ?? legacyGeneralization?.procedure,
  );
  if (!procedure) return null;
  const kind = String(
    procedure.kind ?? "",
  ) as PublicQuestionProcedureContext["kind"];
  const evidenceRefs = stringValues(procedure.evidenceRefs);
  if (
    !PROCEDURE_KINDS.has(kind) ||
    typeof procedure.entityBindingNecessary !== "boolean" ||
    evidenceRefs.length === 0
  ) {
    return null;
  }
  return {
    kind,
    entityBindingNecessary: procedure.entityBindingNecessary,
    evidenceRefs,
  };
}

function normalizePersistedSelection(
  selection: MaterialReviewSelection,
): MaterialReviewSelection {
  const raw = selection as unknown as Record<string, unknown>;
  if (recordValue(raw.questionGuard)) return clone(selection);

  const legacyGeneralization = recordValue(raw.generalization);
  const text = normalizeQuestionText(
    String(raw.text ?? raw.publicQuestion ?? raw.originalInput ?? ""),
  );
  const originalInput = normalizeQuestionText(
    String(
      raw.originalInput ??
        legacyGeneralization?.originalInput ??
        raw.text ??
        raw.publicQuestion ??
        "",
    ),
  );
  const evidenceRefs = Array.from(
    new Set([
      ...stringValues(raw.sourceAnchors),
      ...stringValues(raw.evidenceRefs),
      ...stringValues(legacyGeneralization?.evidenceRefs),
    ]),
  );

  // Legacy material selections predate the independent extraction contract.
  // Persisted anchors remain available as private evidence, but never become
  // an invented independent clearance. Safety/fact blockers still win before
  // the missing-extraction review gate.
  const questionGuard = evaluatePublicQuestionGeneralization({
    originalInput: originalInput || text,
    candidatePublicQuestion: text || originalInput,
    actorContexts: persistedActorContexts(raw),
    actorExtraction: {
      status: "unverified",
      source: "material_provider",
      independentFromCandidateProvider: false,
      evidenceRefs,
    },
    procedure: persistedProcedure(raw),
  });

  return {
    ...clone(selection),
    text,
    questionGuard,
    options: clone(Array.isArray(selection.options) ? selection.options : []),
  };
}

export function normalizeMaterialDocumentReviewSession(
  session: MaterialDocumentReviewSession,
): MaterialDocumentReviewSession {
  return {
    ...clone(session),
    selections: (Array.isArray(session.selections) ? session.selections : []).map(
      normalizePersistedSelection,
    ),
  };
}

function guardUpdatedSelection(
  existing: MaterialReviewSelection,
  selection: MaterialReviewSelection,
): MaterialReviewSelection {
  const nextText = normalizeQuestionText(selection.text);
  const guardedText = normalizeQuestionText(
    existing.questionGuard.publicQuestion ?? existing.questionGuard.candidatePublicQuestion,
  );
  if (nextText === guardedText) {
    return {
      ...clone(selection),
      sourceAnchors: clone(existing.sourceAnchors),
      questionGuard: clone(existing.questionGuard),
    };
  }

  const questionGuard = evaluatePublicQuestionGeneralization({
    originalInput: existing.questionGuard.originalInput,
    candidatePublicQuestion: nextText,
    actorContexts: existing.questionGuard.actorContexts,
    actorExtraction: {
      status: "unverified",
      source: "human_review",
      independentFromCandidateProvider: false,
      evidenceRefs: existing.questionGuard.evidenceRefs,
    },
    procedure: existing.questionGuard.procedure,
  });

  return {
    ...clone(selection),
    text: nextText,
    sourceAnchors: clone(existing.sourceAnchors),
    questionGuard,
    options: questionGuard.releaseState === "blocked" ? [] : clone(selection.options),
  };
}

function createInMemoryRepo(): MaterialReviewRepository {
  return {
    async save(session) {
      memory.set(session.id, clone(session));
    },
    async get(id) {
      return memory.has(id) ? clone(memory.get(id) as MaterialDocumentReviewSession) : null;
    },
  };
}

async function ensureIndexes() {
  if (indexesReady || shouldUseInMemoryMongoFallback()) return;
  const col = await coreCol(COLLECTION);
  await Promise.all([
    col.createIndex({ actorId: 1, updatedAt: -1 }),
    col.createIndex({ organizationId: 1, updatedAt: -1 }),
    col.createIndex({ materialId: 1, createdAt: -1 }),
  ]).catch(() => undefined);
  indexesReady = true;
}

function mongoRepo(): MaterialReviewRepository {
  return {
    async save(session) {
      await ensureIndexes();
      const col = await coreCol<any>(COLLECTION);
      await col.updateOne(
        { _id: session.id },
        { $set: { ...clone(session), _id: session.id } },
        { upsert: true },
      );
    },
    async get(id) {
      await ensureIndexes();
      const col = await coreCol<any>(COLLECTION);
      const doc = await col.findOne({ _id: id });
      if (!doc) return null;
      const { _id: _ignored, ...session } = doc;
      return clone(session as MaterialDocumentReviewSession);
    },
  };
}

function repository() {
  if (repositoryOverride) return repositoryOverride;
  return shouldUseInMemoryMongoFallback() ? createInMemoryRepo() : mongoRepo();
}

export async function createMaterialDocumentReviewSession(input: {
  job: MaterialExtractionJob;
  actorId: string;
  graphFirst: MaterialGraphFirstContext;
  drafts: MaterialStructuredDraftResult;
}) {
  if (input.drafts.status !== "generated" || input.drafts.provider === "none") return null;
  const at = nowIso();
  const session: MaterialDocumentReviewSession = {
    id: `material-review-${crypto.randomUUID()}`,
    materialId: input.job.materialId,
    materialLabel: input.job.materialLabel,
    jobId: input.job.id,
    actorId: input.actorId,
    organizationId: input.job.organizationId,
    status: "awaiting_review",
    provider: input.drafts.provider,
    graphFirst: clone(input.graphFirst),
    themes: clone(input.drafts.themes),
    decisionPoints: clone(input.drafts.decisionPoints),
    claimsOrSourceHints: clone(input.drafts.claimsOrSourceHints),
    uncertainties: clone(input.drafts.uncertainties),
    provenance: clone(input.drafts.provenance),
    selections: input.drafts.questions.map((question) => ({
      questionId: question.id,
      selected: false,
      action: null,
      theme: question.theme,
      text: question.text,
      rationale: question.rationale,
      sourceAnchors: clone(question.sourceAnchors),
      questionGuard: clone(question.generalization),
      options: input.drafts.options
        .filter((option) => option.questionRef === question.id)
        .map((option) => ({ text: option.text, source: option.source })),
    })),
    preparedWorkstateIds: [],
    reviewRequired: true,
    draftOnly: true,
    publicOutputAllowed: false,
    noAutoPublish: true,
    noAutoCreateRound: true,
    noAutoGraphWrite: true,
    noAutoMerge: true,
    createdAt: at,
    updatedAt: at,
  };
  await repository().save(session);
  return session;
}

export async function getMaterialDocumentReviewSession(id: string) {
  const normalized = String(id ?? "").trim();
  if (!normalized) return null;
  const session = await repository().get(normalized);
  return session ? normalizeMaterialDocumentReviewSession(session) : null;
}

export async function updateMaterialDocumentReviewSelections(input: {
  reviewId: string;
  selections: MaterialReviewSelection[];
}) {
  const session = await getMaterialDocumentReviewSession(input.reviewId);
  if (!session) throw new Error("material_review_not_found");
  if (session.status === "prepared") throw new Error("material_review_already_prepared");
  const existingIds = new Set(session.selections.map((selection) => selection.questionId));
  if (input.selections.some((selection) => !existingIds.has(selection.questionId))) {
    throw new Error("material_review_question_unknown");
  }
  const existingById = new Map(
    session.selections.map((selection) => [selection.questionId, selection]),
  );
  session.selections = input.selections.map((selection) =>
    guardUpdatedSelection(existingById.get(selection.questionId)!, selection),
  );
  session.updatedAt = nowIso();
  await repository().save(session);
  return session;
}

export async function prepareSelectedMaterialQuestions(input: {
  reviewId: string;
  actorId: string;
  confirmed: true;
}) {
  const session = await getMaterialDocumentReviewSession(input.reviewId);
  if (!session) throw new Error("material_review_not_found");
  if (session.status === "prepared") return session;
  const selected = session.selections.filter((selection) => selection.selected);
  if (selected.length === 0) throw new Error("material_review_selection_required");
  if (selected.some((selection) => !selection.action)) throw new Error("material_review_action_required");
  if (selected.some((selection) => selection.questionGuard.releaseState === "blocked")) {
    throw new Error("material_review_question_blocked");
  }

  const records = await Promise.all(
    selected.map((selection) =>
      persistCreateSavedWorkstate({
        ownerUserId: input.actorId,
        organizationId: session.organizationId,
        visibility: session.organizationId ? "organization_internal" : "private",
        type: "question_candidate",
        status: selection.questionGuard.requiresHumanReview ? "needs_review" : "prepared",
        sourceAnalysisId: session.id,
        parentTopicId: session.graphFirst.matchedTopicIds[0] ?? null,
        title: selection.text,
        content: [
          selection.rationale,
          selection.options.length > 0
            ? `Antwortoptionen:\n${selection.options.map((option) => `- ${option.text}`).join("\n")}`
            : "",
        ].filter(Boolean).join("\n\n"),
        metadata: {
          topicTitle: selection.theme,
          summary: `Vorbereiteter Dokument-Review: ${selection.action}`,
          evidenceSnippets: selection.sourceAnchors.slice(0, 6),
          suggestedQuestions: [selection.text],
          sourceLabel: session.materialLabel,
          materialReviewId: session.id,
          materialId: session.materialId,
          materialReviewAction: selection.action,
          suggestedOptions: selection.options.map((option) => option.text).slice(0, 12),
        },
        privateReviewEvidence: {
          publicQuestionGuard: clone(selection.questionGuard),
        },
        resumeHref: `/create?materialReviewId=${encodeURIComponent(session.id)}`,
      }),
    ),
  );
  session.status = "prepared";
  session.preparedWorkstateIds = records.map((record) => record.id);
  session.updatedAt = nowIso();
  await repository().save(session);
  return session;
}

export function setMaterialDocumentReviewRepositoryForTests(repo: MaterialReviewRepository | null) {
  repositoryOverride = repo;
  memory.clear();
  indexesReady = false;
}

export function createInMemoryMaterialDocumentReviewRepository(): MaterialReviewRepository {
  return createInMemoryRepo();
}
