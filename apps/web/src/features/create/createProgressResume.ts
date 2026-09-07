import { z } from "zod";

const CREATE_PROGRESS_RESUME_PREFIX = "vog_create_progress_resume_v1";
const CREATE_PROGRESS_RESUME_TTL_MS = 14 * 60 * 1000;

const CreateProgressResumeSnapshotSchema = z
  .object({
    operationId: z.string().trim().min(8).max(160),
    correlationId: z.string().trim().min(8).max(160),
    actorMode: z.enum(["authenticated", "anonymous"]),
    draftId: z.string().trim().min(1).max(160),
    inputFingerprint: z.string().trim().min(1).max(80),
    locale: z.string().trim().min(1).max(10),
    anlassraumId: z.string().trim().max(160).nullable(),
    dossierId: z.string().trim().max(160).nullable(),
    intent: z.string().trim().max(200).nullable(),
    createdAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
  })
  .strict();

export type CreateProgressResumeSnapshot = z.infer<
  typeof CreateProgressResumeSnapshotSchema
>;

type ResumeReadableStorage = {
  getItem(key: string): string | null;
  removeItem(key: string): void;
};

type ResumeWritableStorage = {
  setItem(key: string, value: string): void;
};

type ResumeRemovableStorage = {
  removeItem(key: string): void;
};

function safelyRemoveCreateProgressResumeSnapshot(
  storage: ResumeRemovableStorage,
  key: string | null | undefined,
) {
  if (!key) return;
  try {
    storage.removeItem(key);
  } catch {
    // Local resume state is best effort; durable server state remains canonical.
  }
}

export function buildCreateProgressResumeStorageKey(userId: string) {
  const normalized = userId.trim();
  if (!normalized) throw new Error("create_progress_resume_user_required");
  return `${CREATE_PROGRESS_RESUME_PREFIX}:${normalized}`;
}

export function fingerprintCreateProgressInput(text: string) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `create-${(hash >>> 0).toString(16).padStart(8, "0")}-${text.length}`;
}

export function buildCreateProgressResumeSnapshot(input: {
  operationId: string;
  correlationId: string;
  actorMode?: "authenticated" | "anonymous";
  draftId: string;
  text: string;
  locale: string;
  anlassraumId?: string | null;
  dossierId?: string | null;
  intent?: string | null;
  now?: Date;
}): CreateProgressResumeSnapshot {
  const now = input.now ?? new Date();
  return CreateProgressResumeSnapshotSchema.parse({
    operationId: input.operationId,
    correlationId: input.correlationId,
    actorMode: input.actorMode ?? "authenticated",
    draftId: input.draftId,
    inputFingerprint: fingerprintCreateProgressInput(input.text.trim()),
    locale: input.locale,
    anlassraumId: input.anlassraumId?.trim() || null,
    dossierId: input.dossierId?.trim() || null,
    intent: input.intent?.trim() || null,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + CREATE_PROGRESS_RESUME_TTL_MS).toISOString(),
  });
}

export function readCreateProgressResumeSnapshot(
  storage: ResumeReadableStorage,
  key: string | null | undefined,
  now: Date = new Date(),
): CreateProgressResumeSnapshot | null {
  if (!key) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = CreateProgressResumeSnapshotSchema.safeParse(JSON.parse(raw));
    if (!parsed.success || Date.parse(parsed.data.expiresAt) <= now.getTime()) {
      safelyRemoveCreateProgressResumeSnapshot(storage, key);
      return null;
    }
    return parsed.data;
  } catch {
    safelyRemoveCreateProgressResumeSnapshot(storage, key);
    return null;
  }
}

export function writeCreateProgressResumeSnapshot(
  storage: ResumeWritableStorage,
  key: string | null | undefined,
  snapshot: CreateProgressResumeSnapshot,
) {
  if (!key) return false;
  try {
    storage.setItem(
      key,
      JSON.stringify(CreateProgressResumeSnapshotSchema.parse(snapshot)),
    );
    return true;
  } catch {
    return false;
  }
}

export function clearCreateProgressResumeSnapshot(
  storage: ResumeRemovableStorage,
  key: string | null | undefined,
) {
  safelyRemoveCreateProgressResumeSnapshot(storage, key);
}
