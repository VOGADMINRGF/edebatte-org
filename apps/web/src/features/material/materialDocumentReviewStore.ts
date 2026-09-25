import "server-only";

import crypto from "node:crypto";
import { coreCol, shouldUseInMemoryMongoFallback } from "@core/db/triMongo";
import { persistCreateSavedWorkstate } from "@/features/create/createSavedWorkstateRepo";
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
  return normalized ? repository().get(normalized) : null;
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
  session.selections = clone(input.selections);
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

  const records = await Promise.all(
    selected.map((selection) =>
      persistCreateSavedWorkstate({
        ownerUserId: input.actorId,
        organizationId: session.organizationId,
        visibility: session.organizationId ? "organization_internal" : "private",
        type: "question_candidate",
        status: "prepared",
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
