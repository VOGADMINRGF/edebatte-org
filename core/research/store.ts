import { ObjectId, coreCol } from "@core/db/triMongo";
import type { Collection, Filter, WithId } from "mongodb";
import type {
  ResearchContribution,
  ResearchContributionStatus,
  ResearchTask,
  ResearchTaskLevel,
  ResearchTaskStatus,
} from "./types";

type ResearchTaskDoc = Omit<ResearchTask, "id"> & { _id: ObjectId };
type ResearchContributionDoc = Omit<ResearchContribution, "id"> & {
  _id: ObjectId;
  taskId: ObjectId;
  authorId: ObjectId;
};

type TaskFilter = {
  status?: ResearchTaskStatus;
  level?: ResearchTaskLevel;
  tag?: string;
};

type SaveTaskInput = Omit<ResearchTask, "id" | "createdAt" | "updatedAt"> & { id?: string };

type CreateContributionInput = Omit<ResearchContribution, "id" | "status" | "createdAt" | "updatedAt">;

type UpdateContributionStatusInput = {
  contributionId: string;
  status: ResearchContributionStatus;
  reviewNote?: string;
};

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
  return query;
}

export async function listTasks(filter?: TaskFilter): Promise<ResearchTask[]> {
  const col = await researchTasksCol();
  const query = buildTaskFilter(filter);
  const docs = await col.find(query).sort({ createdAt: -1 }).toArray();
  return docs.map(sanitizeTask);
}

export async function getTaskById(id: string): Promise<ResearchTask | null> {
  if (!ObjectId.isValid(id)) return null;
  const col = await researchTasksCol();
  const doc = await col.findOne({ _id: new ObjectId(id) });
  return doc ? sanitizeTask(doc) : null;
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
      { upsert: true, returnDocument: "after" },
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
    createdAt: now,
    updatedAt: now,
    acceptedAt: null,
    rejectedAt: null,
  };

  await col.insertOne(doc);
  return sanitizeContribution(doc);
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
    { returnDocument: "after" },
  );

  return result.value ? sanitizeContribution(result.value) : null;
}
