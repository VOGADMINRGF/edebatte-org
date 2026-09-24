import "server-only";

import { coreCol, shouldUseInMemoryMongoFallback } from "@core/db/triMongo";
import { stableHash } from "@core/utils/hash";
import type { VoxyStudioDraft } from "./studioDraft";

export const VOXY_STUDIO_DRAFT_AUDIT_ACTIONS = [
  "created",
  "edited",
  "submitted_for_review",
  "review_changes_requested",
  "approved_for_render",
  "render_bound",
  "approved_for_publish",
] as const;

export type VoxyStudioDraftAuditAction =
  (typeof VOXY_STUDIO_DRAFT_AUDIT_ACTIONS)[number];

export type VoxyStudioDraftAuditEvent = {
  auditId: string;
  draftId: string;
  draftRevision: number;
  storyPlanRevision: number;
  action: VoxyStudioDraftAuditAction;
  byUserId: string;
  at: string;
  reviewDecisionRecordId: string | null;
  renderJobId: string | null;
  renderOutputId: string | null;
  note: string | null;
};

export type VoxyStudioDraftPersistenceState = {
  mode: "persistent_primary" | "in_memory_fallback";
  productionTruth: boolean;
  restartReconstructable: boolean;
  deploymentReconstructable: boolean;
};

export type VoxyStudioDraftListParams = {
  dossierId?: string | null;
  briefingId?: string | null;
  status?: VoxyStudioDraft["status"] | null;
  limit?: number;
};

export type VoxyStudioDraftRepository = {
  createOrGetDraft(input: {
    draft: VoxyStudioDraft;
    idempotencyKey: string;
  }): Promise<VoxyStudioDraft>;
  getDraft(draftId: string): Promise<VoxyStudioDraft | null>;
  listDrafts(params?: VoxyStudioDraftListParams): Promise<VoxyStudioDraft[]>;
  replaceDraftIfRevision(input: {
    draftId: string;
    expectedRevision: number;
    expectedStatus: VoxyStudioDraft["status"];
    next: VoxyStudioDraft;
  }): Promise<boolean>;
  appendAuditEvent(event: VoxyStudioDraftAuditEvent): Promise<void>;
  listAuditEvents(draftId: string): Promise<VoxyStudioDraftAuditEvent[]>;
  getPersistenceState(): VoxyStudioDraftPersistenceState;
};

type DraftDoc = {
  _id: string;
  idempotencyKey: string;
  dossierId: string | null;
  briefingId: string;
  status: VoxyStudioDraft["status"];
  revision: number;
  updatedAt: string;
  record: VoxyStudioDraft;
};

type AuditDoc = {
  _id: string;
  draftId: string;
  at: string;
  event: VoxyStudioDraftAuditEvent;
};

const DRAFTS_COLLECTION = "voxy_studio_drafts";
const AUDIT_COLLECTION = "voxy_studio_draft_audits";

let repoSingleton: VoxyStudioDraftRepository | null = null;
let indexesReady = false;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalize(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function persistenceState(
  mode: VoxyStudioDraftPersistenceState["mode"],
): VoxyStudioDraftPersistenceState {
  const persistent = mode === "persistent_primary";
  return {
    mode,
    productionTruth: persistent,
    restartReconstructable: persistent,
    deploymentReconstructable: persistent,
  };
}

async function ensureIndexes() {
  if (indexesReady || shouldUseInMemoryMongoFallback()) return;
  const [drafts, audits] = await Promise.all([
    coreCol<DraftDoc>(DRAFTS_COLLECTION),
    coreCol<AuditDoc>(AUDIT_COLLECTION),
  ]);
  await Promise.all([
    drafts.createIndex({ idempotencyKey: 1 }, { unique: true }),
    drafts.createIndex({ dossierId: 1, updatedAt: -1 }),
    drafts.createIndex({ briefingId: 1, updatedAt: -1 }),
    drafts.createIndex({ status: 1, updatedAt: -1 }),
    audits.createIndex({ draftId: 1, at: -1 }),
  ]);
  indexesReady = true;
}

function createMongoRepository(): VoxyStudioDraftRepository {
  return {
    async createOrGetDraft(input) {
      await ensureIndexes();
      const col = await coreCol<DraftDoc>(DRAFTS_COLLECTION);
      await col.updateOne(
        { idempotencyKey: input.idempotencyKey },
        {
          $setOnInsert: {
            _id: input.draft.draftId,
            idempotencyKey: input.idempotencyKey,
            dossierId: input.draft.dossierId,
            briefingId: input.draft.briefingId,
            status: input.draft.status,
            revision: input.draft.revision,
            updatedAt: input.draft.updatedAt,
            record: clone(input.draft),
          },
        },
        { upsert: true },
      );
      const doc = await col.findOne({ idempotencyKey: input.idempotencyKey });
      if (!doc?.record) throw new Error("voxy_studio_draft_create_readback_failed");
      return clone(doc.record);
    },
    async getDraft(draftId) {
      await ensureIndexes();
      const col = await coreCol<DraftDoc>(DRAFTS_COLLECTION);
      const doc = await col.findOne({ _id: draftId });
      return doc?.record ? clone(doc.record) : null;
    },
    async listDrafts(params) {
      await ensureIndexes();
      const col = await coreCol<DraftDoc>(DRAFTS_COLLECTION);
      const query: Record<string, unknown> = {};
      if (normalize(params?.dossierId)) query.dossierId = normalize(params?.dossierId);
      if (normalize(params?.briefingId)) query.briefingId = normalize(params?.briefingId);
      if (params?.status) query.status = params.status;
      const docs = await col
        .find(query)
        .sort({ updatedAt: -1 })
        .limit(Math.max(1, Math.min(100, params?.limit ?? 50)))
        .toArray();
      return docs.map((doc) => clone(doc.record));
    },
    async replaceDraftIfRevision(input) {
      await ensureIndexes();
      const col = await coreCol<DraftDoc>(DRAFTS_COLLECTION);
      const result = await col.updateOne(
        {
          _id: input.draftId,
          revision: input.expectedRevision,
          status: input.expectedStatus,
        },
        {
          $set: {
            dossierId: input.next.dossierId,
            briefingId: input.next.briefingId,
            status: input.next.status,
            revision: input.next.revision,
            updatedAt: input.next.updatedAt,
            record: clone(input.next),
          },
        },
      );
      return result.modifiedCount === 1;
    },
    async appendAuditEvent(event) {
      await ensureIndexes();
      const col = await coreCol<AuditDoc>(AUDIT_COLLECTION);
      await col.updateOne(
        { _id: event.auditId },
        {
          $set: {
            _id: event.auditId,
            draftId: event.draftId,
            at: event.at,
            event: clone(event),
          },
        },
        { upsert: true },
      );
    },
    async listAuditEvents(draftId) {
      await ensureIndexes();
      const col = await coreCol<AuditDoc>(AUDIT_COLLECTION);
      const docs = await col
        .find({ draftId })
        .sort({ at: -1 })
        .limit(200)
        .toArray();
      return docs.map((doc) => clone(doc.event));
    },
    getPersistenceState() {
      return persistenceState("persistent_primary");
    },
  };
}

export function createInMemoryVoxyStudioDraftRepository(seed?: {
  drafts?: VoxyStudioDraft[];
  idempotencyKeys?: Record<string, string>;
  audits?: VoxyStudioDraftAuditEvent[];
}): VoxyStudioDraftRepository {
  const drafts = new Map<string, VoxyStudioDraft>();
  const idempotency = new Map<string, string>();
  const audits = new Map<string, VoxyStudioDraftAuditEvent>();
  for (const draft of seed?.drafts ?? []) drafts.set(draft.draftId, clone(draft));
  for (const [key, draftId] of Object.entries(seed?.idempotencyKeys ?? {})) {
    idempotency.set(key, draftId);
  }
  for (const audit of seed?.audits ?? []) audits.set(audit.auditId, clone(audit));
  return {
    async createOrGetDraft(input) {
      const existingId = idempotency.get(input.idempotencyKey);
      if (existingId) {
        const existing = drafts.get(existingId);
        if (!existing) throw new Error("voxy_studio_idempotency_corrupt");
        return clone(existing);
      }
      drafts.set(input.draft.draftId, clone(input.draft));
      idempotency.set(input.idempotencyKey, input.draft.draftId);
      return clone(input.draft);
    },
    async getDraft(draftId) {
      const value = drafts.get(draftId);
      return value ? clone(value) : null;
    },
    async listDrafts(params) {
      return Array.from(drafts.values())
        .filter((draft) => !params?.dossierId || draft.dossierId === params.dossierId)
        .filter((draft) => !params?.briefingId || draft.briefingId === params.briefingId)
        .filter((draft) => !params?.status || draft.status === params.status)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, Math.max(1, Math.min(100, params?.limit ?? 50)))
        .map(clone);
    },
    async replaceDraftIfRevision(input) {
      const current = drafts.get(input.draftId);
      if (
        !current ||
        current.revision !== input.expectedRevision ||
        current.status !== input.expectedStatus
      ) {
        return false;
      }
      drafts.set(input.draftId, clone(input.next));
      return true;
    },
    async appendAuditEvent(event) {
      audits.set(event.auditId, clone(event));
    },
    async listAuditEvents(draftId) {
      return Array.from(audits.values())
        .filter((event) => event.draftId === draftId)
        .sort((a, b) => b.at.localeCompare(a.at))
        .map(clone);
    },
    getPersistenceState() {
      return persistenceState("in_memory_fallback");
    },
  };
}

function getRepo(): VoxyStudioDraftRepository {
  if (repoSingleton) return repoSingleton;
  repoSingleton = shouldUseInMemoryMongoFallback()
    ? createInMemoryVoxyStudioDraftRepository()
    : createMongoRepository();
  return repoSingleton;
}

export function getVoxyStudioDraftRepository() {
  return getRepo();
}

export function setVoxyStudioDraftRepositoryForTests(
  repo: VoxyStudioDraftRepository,
) {
  repoSingleton = repo;
}

export function buildVoxyStudioDraftIdempotencyKey(input: {
  clientRequestId: string;
  briefingId: string;
  createdByUserId: string;
}) {
  return `voxy-studio-draft-idempotency:${stableHash(
    [input.clientRequestId, input.briefingId, input.createdByUserId]
      .map(normalize)
      .join(":"),
  ).slice(0, 32)}`;
}

export function buildVoxyStudioDraftId(input: {
  clientRequestId: string;
  briefingId: string;
  createdByUserId: string;
}) {
  return `voxy-studio-${stableHash(
    [input.clientRequestId, input.briefingId, input.createdByUserId]
      .map(normalize)
      .join(":"),
  ).slice(0, 28)}`;
}

export function buildVoxyStudioDraftAuditEvent(input: {
  draft: VoxyStudioDraft;
  action: VoxyStudioDraftAuditAction;
  byUserId: string;
  at: string;
  reviewDecisionRecordId?: string | null;
  renderJobId?: string | null;
  renderOutputId?: string | null;
  note?: string | null;
}): VoxyStudioDraftAuditEvent {
  return {
    auditId: `voxy-studio-audit-${stableHash(
      [
        input.draft.draftId,
        input.draft.revision,
        input.action,
        input.byUserId,
        input.at,
        input.reviewDecisionRecordId ?? "",
        input.renderOutputId ?? "",
      ].join(":"),
    ).slice(0, 28)}`,
    draftId: input.draft.draftId,
    draftRevision: input.draft.revision,
    storyPlanRevision: input.draft.storyPlan.revision,
    action: input.action,
    byUserId: input.byUserId,
    at: input.at,
    reviewDecisionRecordId: input.reviewDecisionRecordId ?? null,
    renderJobId: input.renderJobId ?? null,
    renderOutputId: input.renderOutputId ?? null,
    note: normalize(input.note) || null,
  };
}
