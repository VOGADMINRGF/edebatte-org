import { coreCol, shouldUseInMemoryMongoFallback } from "@core/db/triMongo";
import { stableHash } from "@core/utils/hash";
import {
  dossierClaimsCol,
  openQuestionsCol,
  ensureDossierForStatement,
  updateDossierCounts,
} from "@features/dossier/db";
import { mutateDossierWithRevision } from "@features/dossier/revisions";
import { getDossierStudioWorkspaceRepo } from "@features/dossier/server/studioPersistence";
import type { DossierClaimKind } from "@features/dossier/schemas";
import {
  buildDossierRuntimeDraftFromHandoff,
  createDossierRuntimeAfterReview,
  getDossierRuntimeCreationBlockers,
  type DossierRuntimeAuditContext,
  type DossierRuntimeAuditEntry,
  type DossierRuntimeCreationBlocker,
  type DossierRuntimeRecord,
} from "@/features/create/dossierRuntime";
import type { CommunitySourceReviewContribution } from "@/features/create/communitySourceReviewContribution";
import { listCommunitySourceReviewRecords } from "@/features/create/communitySourceReviewServer";
import {
  getPersistedCreateHandoffRecord,
  listPersistedCreateHandoffRecords,
  type PersistedCreateHandoffRecord,
} from "@/features/create/persistedHandoffReviewQueue";

export type DossierRuntimePersistenceState = {
  mode: "persistent_primary" | "in_memory_fallback";
  label: string;
  summary: string;
  repositoryInterface: "DossierRuntimeRepository";
  storeKind: "mongo_collection" | "in_memory";
  productionTruth: boolean;
  restartReconstructable: boolean;
  deploymentReconstructable: boolean;
};

export type DossierRuntimeHandoffSummary = {
  sourceReviewItemId: string;
  dossierRuntimeId: string | null;
  runtimeStatus: DossierRuntimeRecord["status"];
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
    | "persisted_dossier_runtime_record"
    | "missing_dossier_runtime_truth";
  reviewState: "review_required";
  publishState: "not_published" | "no_auto_publish";
  graphTargetState: "planned_not_active";
  auditRef: string | null;
  missingRuntimeTruth: string[];
};

type DossierRuntimeRepository = {
  get(sourceHandoffId: string): Promise<DossierRuntimeRecord | null>;
  save(record: DossierRuntimeRecord): Promise<DossierRuntimeRecord>;
  list(limit?: number): Promise<DossierRuntimeRecord[]>;
  insertAudit(entry: DossierRuntimeAuditEntry): Promise<DossierRuntimeAuditEntry>;
  listAudits(params?: {
    sourceHandoffId?: string | null;
    limit?: number;
  }): Promise<DossierRuntimeAuditEntry[]>;
  getPersistenceState(): DossierRuntimePersistenceState;
};

const RUNTIME_COLLECTION = "dossier_runtime_records";
const AUDIT_COLLECTION = "dossier_runtime_audits";

let repoSingleton: DossierRuntimeRepository | null = null;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso() {
  return new Date().toISOString();
}

function trimOrNull(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function buildPersistenceState(
  mode: DossierRuntimePersistenceState["mode"],
): DossierRuntimePersistenceState {
  const persistent = mode === "persistent_primary";
  return {
    mode,
    label: persistent
      ? "Persistente Dossier-Runtime-Creation"
      : "In-Memory-Fallback für Dossier-Runtime-Creation",
    summary: persistent
      ? "Review-bestätigte Dossier-Creation-Drafts, Freigaben und Audit-Spuren liegen dauerhaft vor. Erstellung bleibt strikt von Publish, Wahrheit, Verifikation und Anlassraum-/Beteiligungsraum-Erzeugung getrennt."
      : "Nur Dev-/Test-Fallback: Dossier-Creation-Drafts und Audit-Spuren leben pro Runtime und sind keine belastbare Produktionswahrheit.",
    repositoryInterface: "DossierRuntimeRepository",
    storeKind: persistent ? "mongo_collection" : "in_memory",
    productionTruth: persistent,
    restartReconstructable: persistent,
    deploymentReconstructable: persistent,
  };
}

function auditIdFor(input: {
  sourceHandoffId: string;
  action: DossierRuntimeAuditEntry["action"];
  at: string;
}) {
  return `dossier-runtime-audit-${stableHash(
    `${input.sourceHandoffId}:${input.action}:${input.at}`,
  ).slice(0, 22)}`;
}

function runtimeRecordId(sourceHandoffId: string) {
  return `dossier-runtime:${stableHash(String(sourceHandoffId).trim()).slice(0, 18)}`;
}

function getRepo() {
  if (repoSingleton) return repoSingleton;
  repoSingleton = shouldUseInMemoryMongoFallback()
    ? createInMemoryDossierRuntimeRepository()
    : createMongoDossierRuntimeRepository();
  return repoSingleton;
}

export function setDossierRuntimeRepositoryForTests(
  repo: DossierRuntimeRepository | null,
) {
  repoSingleton = repo;
}

export function createInMemoryDossierRuntimeRepository(): DossierRuntimeRepository {
  const records = new Map<string, DossierRuntimeRecord>();
  const audits = new Map<string, DossierRuntimeAuditEntry>();

  return {
    async get(sourceHandoffId) {
      const record = records.get(sourceHandoffId);
      return record ? clone(record) : null;
    },
    async save(record) {
      records.set(record.sourceHandoffId, clone(record));
      return clone(record);
    },
    async list(limit) {
      const list = Array.from(records.values()).sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt),
      );
      return (typeof limit === "number" ? list.slice(0, limit) : list).map(clone);
    },
    async insertAudit(entry) {
      audits.set(entry.id, clone(entry));
      return clone(entry);
    },
    async listAudits(params) {
      const list = Array.from(audits.values())
        .filter((entry) => {
          if (
            params?.sourceHandoffId &&
            entry.sourceHandoffId !== params.sourceHandoffId
          ) {
            return false;
          }
          return true;
        })
        .sort((left, right) => right.at.localeCompare(left.at));
      return (typeof params?.limit === "number" ? list.slice(0, params.limit) : list).map(
        clone,
      );
    },
    getPersistenceState() {
      return buildPersistenceState("in_memory_fallback");
    },
  };
}

function createMongoDossierRuntimeRepository(): DossierRuntimeRepository {
  return {
    async get(sourceHandoffId) {
      const col = await coreCol<{ _id: string; record: DossierRuntimeRecord }>(
        RUNTIME_COLLECTION,
      );
      const doc = await col.findOne({ _id: runtimeRecordId(sourceHandoffId) } as any);
      return doc?.record ? clone(doc.record) : null;
    },
    async save(record) {
      const col = await coreCol<{ _id: string; record: DossierRuntimeRecord }>(
        RUNTIME_COLLECTION,
      );
      await col.updateOne(
        { _id: runtimeRecordId(record.sourceHandoffId) } as any,
        {
          $set: {
            record: clone(record),
            sourceHandoffId: record.sourceHandoffId,
            status: record.status,
            updatedAt: record.updatedAt,
            createdDossierId: record.createdDossierId,
          } as any,
        },
        { upsert: true },
      );
      return clone(record);
    },
    async list(limit) {
      const col = await coreCol<{ _id: string; record: DossierRuntimeRecord }>(
        RUNTIME_COLLECTION,
      );
      const cursor = col.find({} as any).sort({ updatedAt: -1 });
      if (typeof limit === "number") cursor.limit(limit);
      const docs = await cursor.toArray();
      return docs
        .map((doc) => clone(doc.record))
        .filter((record): record is DossierRuntimeRecord => Boolean(record));
    },
    async insertAudit(entry) {
      const col = await coreCol<DossierRuntimeAuditEntry>(AUDIT_COLLECTION);
      await col.updateOne({ id: entry.id } as any, { $set: clone(entry) as any }, { upsert: true });
      return clone(entry);
    },
    async listAudits(params) {
      const col = await coreCol<DossierRuntimeAuditEntry>(AUDIT_COLLECTION);
      const filter: Record<string, unknown> = {};
      if (params?.sourceHandoffId) {
        filter.sourceHandoffId = params.sourceHandoffId;
      }
      const cursor = col.find(filter as any).sort({ at: -1 });
      if (typeof params?.limit === "number") cursor.limit(params.limit);
      const docs = await cursor.toArray();
      return docs.map(clone);
    },
    getPersistenceState() {
      return buildPersistenceState("persistent_primary");
    },
  };
}

async function recordAudit(
  sourceHandoffId: string,
  entry: Omit<DossierRuntimeAuditEntry, "id" | "sourceHandoffId">,
) {
  const auditEntry: DossierRuntimeAuditEntry = {
    ...entry,
    sourceHandoffId,
    id: auditIdFor({
      sourceHandoffId,
      action: entry.action,
      at: entry.at,
    }),
  };
  return getRepo().insertAudit(auditEntry);
}

function mapClaimKind(
  kind: PersistedCreateHandoffRecord["claims"][number]["kind"],
): DossierClaimKind {
  if (kind === "policy_claim") return "interpretation";
  if (kind === "normative_claim") return "value";
  return "fact";
}

async function materializeRuntimeDossier(input: {
  record: DossierRuntimeRecord;
  auditContext: DossierRuntimeAuditContext;
}) {
  const actorUserId = trimOrNull(input.auditContext.actorUserId) ?? "admin";
  const dossier = await ensureDossierForStatement(input.record.statementId, {
    title: input.record.title,
  });
  if (!dossier) {
    return { ok: false, error: "dossier_runtime_target_missing" } as const;
  }

  const claimsCol = await dossierClaimsCol();
  const questionsCol = await openQuestionsCol();

  const sourceRecord = await getPersistedCreateHandoffRecord(input.record.sourceHandoffId);
  if (!sourceRecord) {
    return { ok: false, error: "source_handoff_missing" } as const;
  }

  for (const [index, claim] of sourceRecord.claims.entries()) {
    const claimId = `handoff-claim-${stableHash(
      `${sourceRecord.id}:${index}:${claim.text}`,
    ).slice(0, 18)}`;
    await mutateDossierWithRevision({
      dossierId: dossier.dossierId,
      mutate: async (session) => {
        const result = await claimsCol.updateOne(
          { dossierId: dossier.dossierId, claimId } as any,
          {
            $set: {
              dossierId: dossier.dossierId,
              claimId,
              text: claim.text,
              kind: mapClaimKind(claim.kind),
              status: "open",
              createdByRole: "admin",
              authorRef: actorUserId ? { userId: actorUserId } : undefined,
              updatedAt: new Date(),
            },
            $setOnInsert: {
              createdAt: new Date(),
            },
          } as any,
          { upsert: true, session },
        );
        const created = Boolean(result.upsertedId);
        return {
          result: null,
          revision: {
            entityType: "claim",
            entityId: claimId,
            action: created ? "create" : "update",
            diffSummary: created
              ? "Claim aus review-bestätigtem Create-Handoff erstellt."
              : "Claim aus review-bestätigtem Create-Handoff aktualisiert.",
            byRole: "admin",
            byUserId: actorUserId,
          },
        };
      },
    });
  }

  for (const [index, question] of input.record.openQuestions.entries()) {
    const questionId = `handoff-question-${stableHash(
      `${sourceRecord.id}:${index}:${question}`,
    ).slice(0, 18)}`;
    await mutateDossierWithRevision({
      dossierId: dossier.dossierId,
      mutate: async (session) => {
        const result = await questionsCol.updateOne(
          { dossierId: dossier.dossierId, questionId } as any,
          {
            $set: {
              dossierId: dossier.dossierId,
              questionId,
              text: question,
              status: "open",
              updatedAt: new Date(),
            },
            $setOnInsert: {
              createdAt: new Date(),
            },
          } as any,
          { upsert: true, session },
        );
        const created = Boolean(result.upsertedId);
        return {
          result: null,
          revision: {
            entityType: "open_question",
            entityId: questionId,
            action: created ? "create" : "update",
            diffSummary: created
              ? "Offene Frage aus review-bestätigtem Create-Handoff erstellt."
              : "Offene Frage aus review-bestätigtem Create-Handoff aktualisiert.",
            byRole: "admin",
            byUserId: actorUserId,
          },
        };
      },
    });
  }

  await updateDossierCounts(
    dossier.dossierId,
    "Review-bestätigte Dossier-Runtime-Creation hat Claims und offene Fragen übernommen.",
  );

  const workspace = await getDossierStudioWorkspaceRepo().createOrGetDossierStudioWorkspace(
    {
      dossierId: dossier.dossierId,
      regionId: sourceRecord.regionId,
      organizationId: sourceRecord.organizationId,
      source: "manual_admin",
      title: input.record.title,
      createdBy: actorUserId,
      updatedBy: actorUserId,
      provenance: {
        sourceDraftId: sourceRecord.id,
      },
      seed: {
        status: "needs_review",
        reviewNotes: [
          "Dieses Dossier wurde nur nach redaktioneller Freigabe erstellt.",
          "Erstellung bedeutet nicht Veröffentlichung.",
          "Quellen, Community-Hinweise und Graph-Bezüge sind Review-Kontext, keine automatische Wahrheit.",
          "Es wird kein Anlassraum und kein Beteiligungsraum automatisch erstellt.",
        ].join(" "),
      },
    },
  );

  return {
    ok: true,
    dossierId: dossier.dossierId,
    workspaceId: workspace.id,
    createdAt: nowIso(),
  } as const;
}

async function communitySignalsForHandoff(sourceHandoffId: string) {
  const records = await listCommunitySourceReviewRecords(200).catch(() => []);
  return records.filter(
    (record) =>
      record.target === "handoff_review_item" &&
      record.targetId === sourceHandoffId,
  );
}

async function buildRuntimeRecord(
  handoff: PersistedCreateHandoffRecord,
): Promise<DossierRuntimeRecord> {
  const [existing, communityContributions, audits] = await Promise.all([
    getRepo().get(handoff.id),
    communitySignalsForHandoff(handoff.id),
    getRepo().listAudits({ sourceHandoffId: handoff.id, limit: 40 }),
  ]);

  const draft = buildDossierRuntimeDraftFromHandoff(handoff, {
    communityContributions,
    status: existing?.status ?? "queued_for_review",
    createdDossierId: existing?.createdDossierId ?? null,
    createdWorkspaceId: existing?.createdWorkspaceId ?? null,
    approvedForSetup: true,
    visibility: existing?.visibility ?? "internal_review",
    auditContext: existing?.auditContext ?? {},
  });

  const record: DossierRuntimeRecord = {
    ...draft,
    id: existing?.id ?? draft.id,
    blockers:
      existing?.status === "approved_for_creation" ||
      existing?.status === "created"
        ? getDossierRuntimeCreationBlockers(draft)
        : draft.blockers,
    auditTrail:
      audits.length > 0
        ? audits
        : [
            {
              id: `dossier-runtime-derived-${handoff.id}`,
              sourceHandoffId: handoff.id,
              at: handoff.updatedAt,
              action: "draft_derived",
              actorUserId: handoff.createdByUserId,
              note:
                "Dossier-Creation-Draft aus bestehendem Create-Handoff abgeleitet. Noch nicht erstellt und nicht veröffentlicht.",
              blockers: draft.blockers,
              status: draft.status,
            },
          ],
    approvedForCreationAt: existing?.approvedForCreationAt ?? null,
    approvedForCreationBy: existing?.approvedForCreationBy ?? null,
    rejectedAt: existing?.rejectedAt ?? null,
    rejectedBy: existing?.rejectedBy ?? null,
  };

  return record;
}

function mapDossierRuntimeDraftState(
  record: DossierRuntimeRecord,
): DossierRuntimeHandoffSummary["dossierRuntimeState"] {
  if (record.status === "created") return "persisted_dossier_runtime_record";
  if (record.status === "queued_for_review" || record.status === "draft") {
    return "dossier_review_draft";
  }
  return "dossier_runtime_draft";
}

function buildDraftDerivedAudit(record: DossierRuntimeRecord) {
  return {
    at: record.updatedAt,
    action: "draft_derived" as const,
    actorUserId: record.auditContext.actorUserId ?? null,
    note:
      "Persistierter Dossier-Runtime-Draft aus bestehendem Create-Handoff abgeleitet. Weiterhin review-first, nicht veröffentlicht und ohne Graph-Write.",
    blockers: record.blockers,
    status: record.status,
  };
}

function buildDossierRuntimeHandoffSummary(params: {
  handoff: PersistedCreateHandoffRecord;
  record: DossierRuntimeRecord | null;
}) {
  if (!params.record) {
    return {
      sourceReviewItemId: params.handoff.id,
      dossierRuntimeId: null,
      runtimeStatus: "queued_for_review",
      dossierRuntimeState: "dossier_review_draft",
      dossierTargetState: "dossier_review_draft",
      persistenceState: "missing_dossier_runtime_truth",
      reviewState: "review_required",
      publishState: "no_auto_publish",
      graphTargetState: "planned_not_active",
      auditRef: null,
      missingRuntimeTruth: [
        "missing_dossier_runtime_truth",
        "dossier_runtime_record_not_created_yet",
      ],
    } satisfies DossierRuntimeHandoffSummary;
  }

  const draftState = mapDossierRuntimeDraftState(params.record);
  return {
    sourceReviewItemId: params.handoff.id,
    dossierRuntimeId: params.record.id,
    runtimeStatus: params.record.status,
    dossierRuntimeState: draftState,
    dossierTargetState: draftState,
    persistenceState: "persisted_dossier_runtime_record",
    reviewState: "review_required",
    publishState: "not_published",
    graphTargetState: "planned_not_active",
    auditRef: params.record.auditTrail[0]?.id ?? null,
    missingRuntimeTruth: [],
  } satisfies DossierRuntimeHandoffSummary;
}

async function ensurePersistedDossierRuntimeDraftForRecord(
  handoff: PersistedCreateHandoffRecord,
) {
  if (handoff.selectedAction !== "create_dossier") return null;

  const existingAudits = await getRepo().listAudits({
    sourceHandoffId: handoff.id,
    limit: 1,
  });
  const record = await buildRuntimeRecord(handoff);
  await saveRecord(record);

  if (existingAudits.length === 0) {
    await recordAudit(handoff.id, buildDraftDerivedAudit(record));
    return buildRuntimeRecord(handoff);
  }

  return record;
}

export async function ensurePersistedDossierRuntimeDraft(
  sourceHandoffId: string,
) {
  const handoff = await getPersistedCreateHandoffRecord(sourceHandoffId);
  if (!handoff || handoff.selectedAction !== "create_dossier") return null;
  return ensurePersistedDossierRuntimeDraftForRecord(handoff);
}

export async function getDossierRuntimeHandoffSummary(
  sourceHandoffId: string,
): Promise<DossierRuntimeHandoffSummary | null> {
  const handoff = await getPersistedCreateHandoffRecord(sourceHandoffId);
  if (!handoff || handoff.selectedAction !== "create_dossier") return null;

  const existing = await getRepo().get(handoff.id);
  return buildDossierRuntimeHandoffSummary({
    handoff,
    record: existing ? await buildRuntimeRecord(handoff) : null,
  });
}

async function saveRecord(record: DossierRuntimeRecord) {
  return getRepo().save(record);
}

export function getDossierRuntimePersistenceState() {
  return getRepo().getPersistenceState();
}

export async function listDossierRuntimeRecords(limit = 40) {
  const records = await listPersistedCreateHandoffRecords();
  const handoffs = records
    .filter((record) => record.selectedAction === "create_dossier")
    .slice(0, limit);
  const runtimeRecords = await Promise.all(handoffs.map(buildRuntimeRecord));
  return runtimeRecords.sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

export async function getDossierRuntimeRecord(sourceHandoffId: string) {
  const handoff = await getPersistedCreateHandoffRecord(sourceHandoffId);
  if (!handoff || handoff.selectedAction !== "create_dossier") return null;
  return buildRuntimeRecord(handoff);
}

export async function listDossierRuntimeAudits(params?: {
  sourceHandoffId?: string | null;
  limit?: number;
}) {
  return getRepo().listAudits(params);
}

export async function approveDossierCreation(input: {
  sourceHandoffId: string;
  actorUserId: string;
  note?: string | null;
}) {
  const record = await getDossierRuntimeRecord(input.sourceHandoffId);
  if (!record) throw new Error("dossier_runtime_record_not_found");

  const approvedAt = nowIso();
  const candidate: DossierRuntimeRecord = {
    ...record,
    status: "approved_for_creation",
    auditContext: {
      actorUserId: input.actorUserId,
      reason:
        trimOrNull(input.note) ??
        "Review-approved Dossier-Creation im bestehenden Admin-Review freigegeben.",
      origin: "admin_review",
      approvedAt,
    },
    approvedForCreationAt: approvedAt,
    approvedForCreationBy: input.actorUserId,
    updatedAt: approvedAt,
  };

  const blockers = getDossierRuntimeCreationBlockers(candidate).filter(
    (blocker) => blocker !== "review_not_approved",
  );
  if (blockers.length > 0) {
    const blockedRecord: DossierRuntimeRecord = {
      ...candidate,
      status: "blocked",
      blockers,
    };
    await saveRecord(blockedRecord);
    await recordAudit(input.sourceHandoffId, {
      at: approvedAt,
      action: "creation_blocked",
      actorUserId: input.actorUserId,
      note:
        trimOrNull(input.note) ??
        "Freigabeversuch blockiert, weil Guardrail- oder Review-Blocker offen sind.",
      blockers,
      status: "blocked",
    });
    return blockedRecord;
  }

  const approvedRecord: DossierRuntimeRecord = {
    ...candidate,
    blockers: [],
  };
  await saveRecord(approvedRecord);
  await recordAudit(input.sourceHandoffId, {
    at: approvedAt,
    action: "creation_approved",
    actorUserId: input.actorUserId,
    note:
      trimOrNull(input.note) ??
      "Dossier-Erstellung explizit freigegeben. Erstellung bleibt getrennt von Veröffentlichung.",
    blockers: [],
    status: "approved_for_creation",
  });
  return approvedRecord;
}

export async function rejectDossierCreation(input: {
  sourceHandoffId: string;
  actorUserId: string;
  note?: string | null;
}) {
  const record = await getDossierRuntimeRecord(input.sourceHandoffId);
  if (!record) throw new Error("dossier_runtime_record_not_found");

  const rejectedAt = nowIso();
  const rejectedRecord: DossierRuntimeRecord = {
    ...record,
    status: "rejected",
    blockers: [],
    rejectedAt,
    rejectedBy: input.actorUserId,
    auditContext: {
      actorUserId: input.actorUserId,
      reason:
        trimOrNull(input.note) ??
        "Dossier-Erstellung im Review zurückgewiesen.",
      origin: "admin_review",
      approvedAt: record.auditContext.approvedAt,
    },
    updatedAt: rejectedAt,
  };

  await saveRecord(rejectedRecord);
  await recordAudit(input.sourceHandoffId, {
    at: rejectedAt,
    action: "creation_rejected",
    actorUserId: input.actorUserId,
    note:
      trimOrNull(input.note) ??
      "Dossier-Erstellung abgelehnt. Kein Dossier und keine Veröffentlichung wurden erzeugt.",
    blockers: [],
    status: "rejected",
  });
  return rejectedRecord;
}

export async function createApprovedDossier(input: {
  sourceHandoffId: string;
  actorUserId: string;
  note?: string | null;
}) {
  const record = await getDossierRuntimeRecord(input.sourceHandoffId);
  if (!record) throw new Error("dossier_runtime_record_not_found");

  const result = await createDossierRuntimeAfterReview(record, {
    auditContext: {
      actorUserId: input.actorUserId,
      reason:
        trimOrNull(input.note) ??
        record.auditContext.reason ??
        "Review-approved Dossier-Creation in bestehende Runtime geschrieben.",
      origin: "dossier_runtime",
      approvedAt: record.approvedForCreationAt ?? nowIso(),
    },
    creator: materializeRuntimeDossier,
  });

  if (result.ok === false) {
    const blockedRecord: DossierRuntimeRecord = {
      ...record,
      status: result.error === "blocked" ? "blocked" : record.status,
      blockers: result.blockers,
      updatedAt: nowIso(),
    };
    await saveRecord(blockedRecord);
    await recordAudit(input.sourceHandoffId, {
      at: blockedRecord.updatedAt,
      action: "creation_blocked",
      actorUserId: input.actorUserId,
      note: trimOrNull(input.note) ?? result.message,
      blockers: result.blockers,
      status: blockedRecord.status,
    });
    return blockedRecord;
  }

  const createdRecord: DossierRuntimeRecord = {
    ...result.record,
    blockers: [],
    approvedForCreationAt: record.approvedForCreationAt,
    approvedForCreationBy: record.approvedForCreationBy,
    rejectedAt: record.rejectedAt,
    rejectedBy: record.rejectedBy,
    auditTrail: record.auditTrail,
  };
  await saveRecord(createdRecord);
  await recordAudit(input.sourceHandoffId, {
    at: createdRecord.updatedAt,
    action: "runtime_created",
    actorUserId: input.actorUserId,
    note:
      trimOrNull(input.note) ??
      "Dossier-Runtime erstellt. Der Status bleibt redaktioneller Arbeitsstand und nicht veröffentlicht.",
    blockers: [],
    status: "created",
    dossierId: createdRecord.createdDossierId,
    workspaceId: createdRecord.createdWorkspaceId,
  });
  return createdRecord;
}

export async function syncDossierRuntimePublicationVisibility(input: {
  sourceHandoffId: string;
  visibility: DossierRuntimeRecord["visibility"];
}) {
  const record = await getDossierRuntimeRecord(input.sourceHandoffId);
  if (!record) {
    throw new Error("dossier_runtime_record_not_found");
  }
  const updatedRecord: DossierRuntimeRecord = {
    ...record,
    visibility: input.visibility,
    updatedAt: nowIso(),
  };
  await saveRecord(updatedRecord);
  return updatedRecord;
}
