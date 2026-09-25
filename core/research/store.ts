import { ObjectId, coreCol } from "@core/db/triMongo";
import type { Collection, Filter, WithId } from "mongodb";
import type {
  ResearchContribution,
  ResearchContributionDoc,
  ResearchContributionStatus,
  ResearchTask,
  ResearchTaskDossierBinding,
  ResearchTaskKind,
  ResearchTaskLevel,
  ResearchTaskStatus,
} from "./types";
import type { AnalyzeResult } from "@features/analyze/schemas";

type ResearchTaskDoc = Omit<ResearchTask, "id"> & { _id: ObjectId };

type TaskFilter = {
  status?: ResearchTaskStatus;
  level?: ResearchTaskLevel;
  tag?: string;
  kind?: ResearchTaskKind;
  sort?: "newest" | "oldest" | "level" | "status";
  limit?: number;
};

type SaveTaskInput = Omit<
  ResearchTask,
  "id" | "createdAt" | "updatedAt" | "dossierBinding"
> & { id?: string };

type CreateContributionInput = Omit<ResearchContribution, "id" | "status" | "createdAt" | "updatedAt">;

type UpdateContributionStatusInput = {
  contributionId: string;
  status: ResearchContributionStatus;
  reviewNote?: string;
};

type UpdateContributionFeedbackInput = {
  contributionId: string;
  feedbackHelpful?: boolean | null;
  feedbackNote?: string | null;
  feedbackBy?: string | null;
};

type SeedTasksInput = {
  analysis: AnalyzeResult;
  source?: ResearchTask["source"];
  createdBy?: string | null;
  level?: ResearchTaskLevel;
  tags?: string[];
  status?: ResearchTaskStatus;
};

export type BindResearchTaskDossierResult =
  | { ok: true; status: "bound" | "already_bound" }
  | {
      ok: false;
      reason:
        | "invalid_task_id"
        | "invalid_binding"
        | "task_not_found"
        | "malformed_existing_binding"
        | "binding_conflict";
    };

const DOSSIER_REVISION_HASH_RE = /^[a-f0-9]{64}$/i;

async function researchTasksCol(): Promise<Collection<ResearchTaskDoc>> {
  return coreCol<ResearchTaskDoc>("researchTasks");
}

async function researchContributionsCol(): Promise<Collection<ResearchContributionDoc>> {
  return coreCol<ResearchContributionDoc>("researchContributions");
}

function sanitizeTask(doc: WithId<ResearchTaskDoc>): ResearchTask {
  const { _id, ...rest } = doc;
  return {
    ...rest,
    id: _id.toHexString(),
  };
}

function sanitizeContribution(doc: WithId<ResearchContributionDoc>): ResearchContribution {
  const { _id, taskId, authorId, ...rest } = doc;
  return {
    ...rest,
    id: _id.toHexString(),
    taskId: taskId.toHexString(),
    authorId: authorId.toHexString(),
  };
}

function buildTaskFilter(filter?: TaskFilter): Filter<ResearchTaskDoc> {
  const query: Filter<ResearchTaskDoc> = {};
  if (filter?.status) query.status = filter.status;
  if (filter?.level) query.level = filter.level;
  if (filter?.tag) query.tags = { $in: [filter.tag] };
  if (filter?.kind) query.kind = filter.kind;
  return query;
}

function buildTaskSort(filter?: TaskFilter): Record<string, 1 | -1> {
  if (filter?.sort === "oldest") return { createdAt: 1 };
  return { createdAt: -1 };
}

function normalizeLimit(limit?: number): number | undefined {
  if (!limit || Number.isNaN(limit)) return undefined;
  const safe = Math.min(Math.max(Math.floor(limit), 1), 200);
  return safe > 0 ? safe : undefined;
}

function isValidDossierBinding(value: unknown): value is ResearchTaskDossierBinding {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const binding = value as Partial<ResearchTaskDossierBinding>;
  return (
    typeof binding.dossierId === "string" &&
    binding.dossierId.length > 0 &&
    binding.dossierId === binding.dossierId.trim() &&
    typeof binding.dossierRevisionSeq === "number" &&
    Number.isInteger(binding.dossierRevisionSeq) &&
    binding.dossierRevisionSeq > 0 &&
    typeof binding.dossierRevisionHash === "string" &&
    DOSSIER_REVISION_HASH_RE.test(binding.dossierRevisionHash)
  );
}

function isSameDossierBinding(
  left: ResearchTaskDossierBinding,
  right: ResearchTaskDossierBinding,
): boolean {
  return (
    left.dossierId === right.dossierId &&
    left.dossierRevisionSeq === right.dossierRevisionSeq &&
    left.dossierRevisionHash === right.dossierRevisionHash
  );
}

export async function listTasks(filter?: TaskFilter): Promise<ResearchTask[]> {
  const col = await researchTasksCol();
  const query = buildTaskFilter(filter);
  const sort = buildTaskSort(filter);
  const limit = normalizeLimit(filter?.limit);
  const cursor = col.find(query).sort(sort);
  if (limit) cursor.limit(limit);
  const docs = await cursor.toArray();
  let tasks = docs.map(sanitizeTask);
  if (filter?.sort === "level") {
    const order: Record<ResearchTaskLevel, number> = { basic: 1, advanced: 2, expert: 3 };
    tasks = tasks.sort((a, b) => (order[a.level ?? "basic"] ?? 9) - (order[b.level ?? "basic"] ?? 9));
  }
  if (filter?.sort === "status") {
    const order: Record<ResearchTaskStatus, number> = {
      open: 1,
      in_progress: 2,
      completed: 3,
      archived: 4,
    };
    tasks = tasks.sort((a, b) => (order[a.status ?? "open"] ?? 9) - (order[b.status ?? "open"] ?? 9));
  }
  return tasks;
}

export async function getTaskById(id: string): Promise<ResearchTask | null> {
  if (!ObjectId.isValid(id)) return null;
  const col = await researchTasksCol();
  const doc = await col.findOne({ _id: new ObjectId(id) });
  return doc ? sanitizeTask(doc) : null;
}

export async function bindResearchTaskToDossier(
  taskId: string,
  binding: ResearchTaskDossierBinding,
): Promise<BindResearchTaskDossierResult> {
  if (!ObjectId.isValid(taskId)) return { ok: false, reason: "invalid_task_id" };
  if (!isValidDossierBinding(binding)) return { ok: false, reason: "invalid_binding" };

  const col = await researchTasksCol();
  const _id = new ObjectId(taskId);
  const result = await col.updateOne(
    { _id, dossierBinding: { $exists: false } },
    { $set: { dossierBinding: binding, updatedAt: new Date() } },
    { upsert: false },
  );

  if (result.modifiedCount === 1) {
    return { ok: true, status: "bound" };
  }

  const current = await col.findOne({ _id });
  if (!current) return { ok: false, reason: "task_not_found" };
  if (!("dossierBinding" in current)) return { ok: false, reason: "binding_conflict" };
  if (!isValidDossierBinding(current.dossierBinding)) {
    return { ok: false, reason: "malformed_existing_binding" };
  }
  if (isSameDossierBinding(current.dossierBinding, binding)) {
    return { ok: true, status: "already_bound" };
  }
  return { ok: false, reason: "binding_conflict" };
}

export async function saveTask(input: SaveTaskInput): Promise<ResearchTask> {
  const col = await researchTasksCol();
  const now = new Date();
  const id = input.id && ObjectId.isValid(input.id) ? new ObjectId(input.id) : undefined;

  const payload: Partial<ResearchTaskDoc> = {
    kind: input.kind ?? "custom",
    source: input.source,
    title: input.title?.trim() || "Unbenannte Research-Task",
    description: input.description?.trim() || "",
    hints: input.hints?.filter(Boolean) ?? [],
    level: input.level ?? "basic",
    status: input.status ?? "open",
    createdBy: input.createdBy ?? null,
    dueAt: input.dueAt ?? null,
    tags: input.tags ?? [],
    updatedAt: now,
  };

  if (id) {
    const result = await col.findOneAndUpdate(
      { _id: id },
      { $set: payload, $setOnInsert: { createdAt: now } },
      { upsert: true, returnDocument: "after", includeResultMetadata: true },
    );
    const doc = result.value ?? ({ _id: id, ...payload, createdAt: now } as ResearchTaskDoc);
    return sanitizeTask(doc);
  }

  const insertResult = await col.insertOne({ ...payload, createdAt: now } as ResearchTaskDoc);
  return sanitizeTask({ _id: insertResult.insertedId, ...payload, createdAt: now } as ResearchTaskDoc);
}

export async function getContributionsByTaskId(taskId: string): Promise<ResearchContribution[]> {
  if (!ObjectId.isValid(taskId)) return [];
  const col = await researchContributionsCol();
  const docs = await col.find({ taskId: new ObjectId(taskId) }).sort({ createdAt: -1 }).toArray();
  return docs.map(sanitizeContribution);
}

export async function getContributionById(id: string): Promise<ResearchContribution | null> {
  if (!ObjectId.isValid(id)) return null;
  const col = await researchContributionsCol();
  const doc = await col.findOne({ _id: new ObjectId(id) });
  return doc ? sanitizeContribution(doc) : null;
}

export async function createContribution(input: CreateContributionInput): Promise<ResearchContribution | null> {
  if (!ObjectId.isValid(input.taskId) || !ObjectId.isValid(input.authorId)) return null;
  const col = await researchContributionsCol();
  const now = new Date();

  const doc: ResearchContributionDoc = {
    _id: new ObjectId(),
    taskId: new ObjectId(input.taskId),
    authorId: new ObjectId(input.authorId),
    summary: input.summary?.trim() ?? "",
    details: input.details?.trim() || "",
    sources: input.sources?.length ? input.sources : [],
    status: "submitted",
    reviewNote: input.reviewNote?.trim() || undefined,
    feedbackHelpful: null,
    feedbackNote: null,
    feedbackBy: null,
    feedbackAt: null,
    createdAt: now,
    updatedAt: now,
    acceptedAt: null,
    rejectedAt: null,
  };

  await col.insertOne(doc);
  return sanitizeContribution(doc);
}

export async function getLatestContributionByAuthor(
  authorId: string,
): Promise<ResearchContribution | null> {
  if (!ObjectId.isValid(authorId)) return null;
  const col = await researchContributionsCol();
  const doc = await col
    .find({ authorId: new ObjectId(authorId) })
    .sort({ createdAt: -1 })
    .limit(1)
    .next();
  return doc ? sanitizeContribution(doc) : null;
}

export async function updateContributionStatus(
  input: UpdateContributionStatusInput,
): Promise<ResearchContribution | null> {
  if (!ObjectId.isValid(input.contributionId)) return null;
  const col = await researchContributionsCol();
  const now = new Date();
  const status: ResearchContributionStatus = input.status;
  const update: Partial<ResearchContributionDoc> = {
    status,
    reviewNote: input.reviewNote?.trim() || undefined,
    updatedAt: now,
  };

  if (status === "accepted") update.acceptedAt = now;
  if (status === "rejected") update.rejectedAt = now;

  const result = await col.findOneAndUpdate(
    { _id: new ObjectId(input.contributionId) },
    { $set: update },
    { returnDocument: "after", includeResultMetadata: true },
  );

  return result.value ? sanitizeContribution(result.value) : null;
}

export async function updateContributionFeedback(
  input: UpdateContributionFeedbackInput,
): Promise<ResearchContribution | null> {
  if (!ObjectId.isValid(input.contributionId)) return null;
  const col = await researchContributionsCol();
  const now = new Date();
  const update: Partial<ResearchContributionDoc> = {
    updatedAt: now,
  };

  if (typeof input.feedbackHelpful === "boolean") {
    update.feedbackHelpful = input.feedbackHelpful;
  }
  if (input.feedbackNote !== undefined) {
    update.feedbackNote = input.feedbackNote?.trim() || null;
  }
  if (input.feedbackBy !== undefined) {
    update.feedbackBy = input.feedbackBy ?? null;
  }
  update.feedbackAt = now;

  const result = await col.findOneAndUpdate(
    { _id: new ObjectId(input.contributionId) },
    { $set: update },
    { returnDocument: "after", includeResultMetadata: true },
  );

  return result.value ? sanitizeContribution(result.value) : null;
}

export async function seedTasksFromAnalysis(input: SeedTasksInput): Promise<{
  created: ResearchTask[];
  skipped: number;
}> {
  const { analysis } = input;
  const questions = Array.isArray(analysis.questions) ? analysis.questions : [];
  const knots = Array.isArray(analysis.knots) ? analysis.knots : [];
  const questionIds = questions.map((q) => q.id).filter(Boolean);
  const knotIds = knots.map((k) => k.id).filter(Boolean);
  if (questionIds.length === 0 && knotIds.length === 0) {
    return { created: [], skipped: 0 };
  }

  const col = await researchTasksCol();
  const conditions: Filter<ResearchTaskDoc>[] = [];
  if (questionIds.length) conditions.push({ "source.questionId": { $in: questionIds } });
  if (knotIds.length) conditions.push({ "source.knotId": { $in: knotIds } });
  const existing = await col
    .find(conditions.length ? { $or: conditions } : { _id: { $exists: false } })
    .project({ "source.questionId": 1, "source.knotId": 1 })
    .toArray();

  const existingQuestionIds = new Set<string>();
  const existingKnotIds = new Set<string>();
  existing.forEach((doc) => {
    const q = doc.source?.questionId;
    const k = doc.source?.knotId;
    if (q) existingQuestionIds.add(q);
    if (k) existingKnotIds.add(k);
  });

  const created: ResearchTask[] = [];
  let skipped = 0;

  for (const question of questions) {
    if (!question?.id) continue;
    if (existingQuestionIds.has(question.id)) {
      skipped += 1;
      continue;
    }
    const tags = [...(input.tags ?? [])];
    if (question.dimension) tags.push(question.dimension);
    const task = await saveTask({
      kind: "question",
      title: question.text?.trim() || "Offene Frage",
      description: question.dimension ? `Dimension: ${question.dimension}` : "",
      level: input.level ?? "basic",
      status: input.status ?? "open",
      tags,
      createdBy: input.createdBy ?? null,
      source: {
        ...(input.source ?? {}),
        questionId: question.id,
      },
    });
    created.push(task);
  }

  for (const knot of knots) {
    if (!knot?.id) continue;
    if (existingKnotIds.has(knot.id)) {
      skipped += 1;
      continue;
    }
    const task = await saveTask({
      kind: "knot",
      title: knot.label?.trim() || "Knoten",
      description: knot.description?.trim() || "",
      level: input.level ?? "basic",
      status: input.status ?? "open",
      tags: input.tags ?? [],
      createdBy: input.createdBy ?? null,
      source: {
        ...(input.source ?? {}),
        knotId: knot.id,
      },
    });
    created.push(task);
  }

  return { created, skipped };
}
