import { ObjectId, coreCol } from "@core/db/triMongo";
import { anlassraumCol } from "@features/anlassraum/db";
import { canActorAccessAnlassraum } from "@features/anlassraum/governance";
import type { GovernanceActor } from "@features/trust/types";
import { dossierSuggestionsCol, dossiersCol, openQuestionsCol } from "./db";
import { mutateDossierWithRevision } from "./revisions";
import type { SuggestionType } from "./schemas";

export type ProtocolDossierUpsertLinkStatus =
  | "mapped_to_existing_dossier"
  | "pending_dossier_link";

export type ProtocolDossierUpsertStatus =
  | "pending_review"
  | "partially_applied"
  | "applied"
  | "rejected";

export type ProtocolDossierUpsertAction = "created" | "applied" | "rejected" | "backfilled";

type ProtocolEventRef = {
  id: string;
  title?: string | null;
  startAt?: string | null;
};

type ProtocolDossierUpsertSelection = {
  summary?: boolean;
  openQuestionIndexes?: number[];
  decisionIndexes?: number[];
  nextStepIndexes?: number[];
};

type ProtocolContractAuditEntry = {
  action: ProtocolDossierUpsertAction;
  contractId: string;
  sourceType: "protocol";
  qrSetCode: string;
  protocolEntryId: string;
  anlassraumId: string | null;
  dossierId: string | null;
  actorId: string | null;
  timestamp: string;
  details?: Record<string, unknown>;
};

type ProtocolDossierUpsertContractDoc = {
  _id?: ObjectId;
  contractId: string;
  protocolEntryId: ObjectId;
  qrSetCode: string;
  anlassraumId: string | null;
  targetDossierId: string | null;
  targetDossierRef: string | null;
  status: ProtocolDossierUpsertStatus;
  linkStatus: ProtocolDossierUpsertLinkStatus;
  material: {
    summaryNotes: string[];
    openQuestions: string[];
    decisions: string[];
    nextSteps: string[];
    tags: string[];
    eventRefs: ProtocolEventRef[];
  };
  suggestionCount: number;
  appliedSuggestionCount: number;
  provenance: {
    sourceType: "protocol";
    protocolEntryId: string;
    qrSetCode: string;
    anlassraumId: string | null;
    eventIds: string[];
    actorId: string | null;
    timestamp: string;
  };
  createdBy: string | null;
  appliedBy: string | null;
  appliedAt: Date | null;
  rejectedBy: string | null;
  rejectedAt: Date | null;
  lastAction: ProtocolDossierUpsertAction;
  lastActionBy: string | null;
  lastActionAt: Date;
  lastActionNote: string | null;
  auditTrail: ProtocolContractAuditEntry[];
  createdAt: Date;
  updatedAt: Date;
};

export type ProtocolDossierUpsertContractSummary = {
  contractId: string;
  status: ProtocolDossierUpsertStatus;
  linkStatus: ProtocolDossierUpsertLinkStatus;
  targetDossierId: string | null;
  targetDossierRef: string | null;
  suggestionCount: number;
  appliedSuggestionCount: number;
  lastAction: ProtocolDossierUpsertAction;
  lastActionAt: string | null;
  updatedAt: string | null;
};

export type ProtocolDossierUpsertContractDetail = ProtocolDossierUpsertContractSummary & {
  qrSetCode: string;
  anlassraumId: string | null;
  material: ProtocolDossierUpsertContractDoc["material"];
  provenance: ProtocolDossierUpsertContractDoc["provenance"];
  createdBy: string | null;
  appliedBy: string | null;
  appliedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  lastActionBy: string | null;
  lastActionNote: string | null;
  auditTrail: ProtocolContractAuditEntry[];
  createdAt: string | null;
};

type CreateProtocolDossierUpsertInput = {
  protocolEntryId: ObjectId | string;
  qrSetCode: string;
  anlassraumId?: ObjectId | string | null;
  dossierId?: ObjectId | string | null;
  summary: string;
  openQuestions?: string[];
  decisions?: string[];
  nextSteps?: string[];
  tags?: string[];
  eventRefs?: ProtocolEventRef[];
  createdBy?: string | null;
};

type ListDossierUpsertContractsInput = {
  status?: ProtocolDossierUpsertStatus;
  qrSetCode?: string;
  anlassraumId?: string;
  targetDossierId?: string;
  limit?: number;
};

type ListLegacyDossierUpsertContractsInput = {
  limit?: number;
};

type ApplyDossierUpsertContractInput = {
  contractId: string;
  actor: GovernanceActor;
  targetDossierId?: string | null;
  selection?: ProtocolDossierUpsertSelection;
  actionNote?: string | null;
};

type RejectDossierUpsertContractInput = {
  contractId: string;
  actor: GovernanceActor;
  reason?: string | null;
};

type BackfillDossierUpsertContractInput = {
  contractId: string;
  actor: GovernanceActor;
  anlassraumId?: string | null;
  targetDossierId?: string | null;
  actionNote?: string | null;
};

const DOSSIER_UPSERT_CONTRACTS_COLLECTION = "dossier_upsert_contracts";

const ensured = {
  contracts: false,
};

function normalizeTextList(values: string[] | undefined, maxEntries = 20, maxLength = 280) {
  const dedupe = new Set<string>();
  const out: string[] = [];
  for (const value of values ?? []) {
    const normalized = String(value || "").trim().slice(0, maxLength);
    if (!normalized || dedupe.has(normalized)) continue;
    dedupe.add(normalized);
    out.push(normalized);
    if (out.length >= maxEntries) break;
  }
  return out;
}

function normalizeEventRefs(values: ProtocolEventRef[] | undefined): ProtocolEventRef[] {
  const out: ProtocolEventRef[] = [];
  const seen = new Set<string>();
  for (const item of values ?? []) {
    const id = String(item?.id || "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      title: item?.title ? String(item.title).slice(0, 240) : null,
      startAt: item?.startAt ? String(item.startAt) : null,
    });
    if (out.length >= 10) break;
  }
  return out;
}

function toObjectId(value: ObjectId | string): ObjectId {
  return typeof value === "string" ? new ObjectId(value) : value;
}

function toOptionalObjectId(value: ObjectId | string | null | undefined): ObjectId | null {
  if (!value) return null;
  if (value instanceof ObjectId) return value;
  if (!ObjectId.isValid(value)) return null;
  return new ObjectId(value);
}

function toOptionalHex(value: ObjectId | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof ObjectId) return value.toHexString();
  if (!ObjectId.isValid(value)) return null;
  return new ObjectId(value).toHexString();
}

function parseObjectId(value: string): ObjectId | null {
  if (!ObjectId.isValid(value)) return null;
  return new ObjectId(value);
}

function normalizeContractId(value: string) {
  return String(value || "").trim();
}

function normalizeListLimit(value: number | undefined) {
  if (!value || !Number.isFinite(value)) return 40;
  return Math.max(1, Math.min(100, Math.floor(value)));
}

function normalizeSelectionIndexes(indexes: number[] | undefined, max: number) {
  const set = new Set<number>();
  for (const index of indexes ?? []) {
    if (!Number.isInteger(index)) continue;
    if (index < 0 || index >= max) continue;
    set.add(index);
  }
  return Array.from(set).sort((a, b) => a - b);
}

function appendAuditEntry(
  contract: ProtocolDossierUpsertContractDoc,
  entry: ProtocolContractAuditEntry,
): ProtocolContractAuditEntry[] {
  const trail = Array.isArray(contract.auditTrail) ? contract.auditTrail : [];
  return [...trail, entry].slice(-50);
}

function toSummary(
  contract: ProtocolDossierUpsertContractDoc | null,
): ProtocolDossierUpsertContractSummary | null {
  if (!contract) return null;
  return {
    contractId: contract.contractId,
    status: contract.status,
    linkStatus: contract.linkStatus,
    targetDossierId: contract.targetDossierId ?? null,
    targetDossierRef: contract.targetDossierRef ?? null,
    suggestionCount: Number(contract.suggestionCount ?? 0),
    appliedSuggestionCount: Number(contract.appliedSuggestionCount ?? 0),
    lastAction: contract.lastAction,
    lastActionAt: contract.lastActionAt?.toISOString?.() ?? null,
    updatedAt: contract.updatedAt?.toISOString?.() ?? null,
  };
}

function toDetail(
  contract: ProtocolDossierUpsertContractDoc | null,
): ProtocolDossierUpsertContractDetail | null {
  if (!contract) return null;
  const summary = toSummary(contract);
  if (!summary) return null;
  return {
    ...summary,
    qrSetCode: contract.qrSetCode,
    anlassraumId: contract.anlassraumId,
    material: contract.material,
    provenance: contract.provenance,
    createdBy: contract.createdBy,
    appliedBy: contract.appliedBy,
    appliedAt: contract.appliedAt?.toISOString?.() ?? null,
    rejectedBy: contract.rejectedBy,
    rejectedAt: contract.rejectedAt?.toISOString?.() ?? null,
    lastActionBy: contract.lastActionBy,
    lastActionNote: contract.lastActionNote,
    auditTrail: Array.isArray(contract.auditTrail) ? contract.auditTrail : [],
    createdAt: contract.createdAt?.toISOString?.() ?? null,
  };
}

async function dossierUpsertContractsCol() {
  if (!ensured.contracts) {
    const col = await coreCol<ProtocolDossierUpsertContractDoc>(
      DOSSIER_UPSERT_CONTRACTS_COLLECTION,
    );
    await col.createIndex({ contractId: 1 }, { unique: true });
    await col.createIndex({ protocolEntryId: 1 }, { unique: true });
    await col.createIndex({ qrSetCode: 1, updatedAt: -1 });
    await col.createIndex({ status: 1, updatedAt: -1 });
    await col.createIndex({ anlassraumId: 1, status: 1 }, { sparse: true });
    await col.createIndex({ targetDossierId: 1, status: 1 }, { sparse: true });
    ensured.contracts = true;
    return col;
  }
  return coreCol<ProtocolDossierUpsertContractDoc>(DOSSIER_UPSERT_CONTRACTS_COLLECTION);
}

async function resolveDossierReference(value: ObjectId | string | null | undefined) {
  const docs = await dossiersCol();
  const objectId = toOptionalObjectId(value);
  if (objectId) {
    const dossier = await docs.findOne(
      { _id: objectId },
      { projection: { _id: 1, dossierId: 1, statementId: 1 } },
    );
    return {
      targetDossierId: objectId.toHexString(),
      targetDossierRef: dossier?.dossierId ?? dossier?.statementId ?? null,
    };
  }

  const normalized = String(value || "").trim();
  if (!normalized) {
    return { targetDossierId: null, targetDossierRef: null };
  }

  const dossier = await docs.findOne(
    { $or: [{ dossierId: normalized }, { statementId: normalized }] } as Record<string, unknown>,
    { projection: { _id: 1, dossierId: 1, statementId: 1 } },
  );

  return {
    targetDossierId: dossier?._id?.toHexString?.() ?? null,
    targetDossierRef: dossier?.dossierId ?? dossier?.statementId ?? null,
  };
}

async function upsertSuggestionWithStatus(input: {
  dossierRef: string;
  suggestionId: string;
  type: SuggestionType;
  payload: Record<string, unknown>;
  status: "pending" | "accepted" | "rejected";
  moderationNote?: string | null;
  now: Date;
  byUserId?: string | null;
}) {
  const suggestions = await dossierSuggestionsCol();
  const transaction = await mutateDossierWithRevision({
    dossierId: input.dossierRef,
    mutate: async (session) => {
      const prev = await suggestions.findOneAndUpdate(
        { dossierId: input.dossierRef, suggestionId: input.suggestionId },
        {
          $set: {
            type: input.type,
            payload: input.payload,
            status: input.status,
            moderationNote: input.moderationNote ?? undefined,
            updatedAt: input.now,
          },
          $setOnInsert: {
            dossierId: input.dossierRef,
            suggestionId: input.suggestionId,
            createdAt: input.now,
          },
        },
        { upsert: true, returnDocument: "before", includeResultMetadata: true, session },
      );
      const created = !prev.value;
      const statusChanged = Boolean(prev.value && prev.value.status !== input.status);
      return {
        result: { created, statusChanged },
        revision: {
          entityType: "suggestion",
          entityId: input.suggestionId,
          action: created ? "create" : statusChanged ? "status_change" : "update",
          diffSummary: created
            ? "Protokoll-Vorschlag erstellt."
            : statusChanged
              ? `Protokoll-Vorschlag auf ${input.status} gesetzt.`
              : "Protokoll-Vorschlag aktualisiert.",
          byRole: "system",
          byUserId: input.byUserId ?? undefined,
        },
      };
    },
  });
  return transaction.result;
}

async function upsertPendingSuggestion(input: {
  dossierRef: string;
  suggestionId: string;
  type: SuggestionType;
  payload: Record<string, unknown>;
  now: Date;
  byUserId?: string | null;
}) {
  const result = await upsertSuggestionWithStatus({
    ...input,
    status: "pending",
  });
  return result.created;
}

async function rejectPendingSuggestion(input: {
  dossierRef: string;
  suggestionId: string;
  moderationNote: string;
  now: Date;
  byUserId?: string | null;
}) {
  const suggestions = await dossierSuggestionsCol();
  const transaction = await mutateDossierWithRevision({
    dossierId: input.dossierRef,
    mutate: async (session) => {
      const prev = await suggestions.findOneAndUpdate(
        {
          dossierId: input.dossierRef,
          suggestionId: input.suggestionId,
          status: "pending",
        },
        {
          $set: {
            status: "rejected",
            moderationNote: input.moderationNote,
            updatedAt: input.now,
          },
        },
        { returnDocument: "before", includeResultMetadata: true, session },
      );
      if (!prev.value) {
        return { result: false, revision: null };
      }
      return {
        result: true,
        revision: {
          entityType: "suggestion",
          entityId: input.suggestionId,
          action: "status_change",
          diffSummary: "Protokoll-Vorschlag abgelehnt.",
          byRole: "system",
          byUserId: input.byUserId ?? undefined,
        },
      };
    },
  });
  return transaction.result;
}

function buildSuggestionIds(contract: ProtocolDossierUpsertContractDoc) {
  const prefix = contract.provenance.protocolEntryId.slice(-10);
  const summaryId = `qr_${prefix}_summary`;
  const questionIds = contract.material.openQuestions.map(
    (_value, idx) => `qr_${prefix}_question_${idx + 1}`,
  );
  const decisionIds = contract.material.decisions.map(
    (_value, idx) => `qr_${prefix}_decision_${idx + 1}`,
  );
  const nextStepIds = contract.material.nextSteps.map(
    (_value, idx) => `qr_${prefix}_next_${idx + 1}`,
  );
  return { summaryId, questionIds, decisionIds, nextStepIds };
}

function selectContractMaterial(
  contract: ProtocolDossierUpsertContractDoc,
  selection?: ProtocolDossierUpsertSelection,
) {
  const summaryIncluded = selection?.summary ?? true;
  const questionIndexes =
    selection?.openQuestionIndexes && selection.openQuestionIndexes.length > 0
      ? normalizeSelectionIndexes(selection.openQuestionIndexes, contract.material.openQuestions.length)
      : contract.material.openQuestions.map((_value, idx) => idx);
  const decisionIndexes =
    selection?.decisionIndexes && selection.decisionIndexes.length > 0
      ? normalizeSelectionIndexes(selection.decisionIndexes, contract.material.decisions.length)
      : contract.material.decisions.map((_value, idx) => idx);
  const nextStepIndexes =
    selection?.nextStepIndexes && selection.nextStepIndexes.length > 0
      ? normalizeSelectionIndexes(selection.nextStepIndexes, contract.material.nextSteps.length)
      : contract.material.nextSteps.map((_value, idx) => idx);

  return {
    summaryIncluded,
    questionIndexes,
    decisionIndexes,
    nextStepIndexes,
  };
}

function countMaterialItems(contract: ProtocolDossierUpsertContractDoc) {
  const summaryCount = contract.material.summaryNotes.length > 0 ? 1 : 0;
  return (
    summaryCount +
    contract.material.openQuestions.length +
    contract.material.decisions.length +
    contract.material.nextSteps.length
  );
}

async function upsertDossierSuggestions(input: {
  dossierRef: string;
  contractId: string;
  protocolEntryId: string;
  summary: string;
  openQuestions: string[];
  decisions: string[];
  nextSteps: string[];
  tags: string[];
  provenance: Record<string, unknown>;
  now: Date;
  byUserId?: string | null;
}) {
  let created = 0;
  const prefix = input.protocolEntryId.slice(-10);

  if (input.summary) {
    const createdNow = await upsertPendingSuggestion({
      dossierRef: input.dossierRef,
      suggestionId: `qr_${prefix}_summary`,
      type: "flag",
      payload: {
        contractId: input.contractId,
        category: "summary_note",
        text: input.summary,
        tags: input.tags,
        provenance: input.provenance,
      },
      now: input.now,
      byUserId: input.byUserId,
    });
    if (createdNow) created += 1;
  }

  for (const [idx, question] of input.openQuestions.entries()) {
    const createdNow = await upsertPendingSuggestion({
      dossierRef: input.dossierRef,
      suggestionId: `qr_${prefix}_question_${idx + 1}`,
      type: "question",
      payload: {
        contractId: input.contractId,
        category: "open_question",
        text: question,
        provenance: input.provenance,
      },
      now: input.now,
      byUserId: input.byUserId,
    });
    if (createdNow) created += 1;
  }

  for (const [idx, decision] of input.decisions.entries()) {
    const createdNow = await upsertPendingSuggestion({
      dossierRef: input.dossierRef,
      suggestionId: `qr_${prefix}_decision_${idx + 1}`,
      type: "claim",
      payload: {
        contractId: input.contractId,
        category: "decision",
        text: decision,
        provenance: input.provenance,
      },
      now: input.now,
      byUserId: input.byUserId,
    });
    if (createdNow) created += 1;
  }

  for (const [idx, nextStep] of input.nextSteps.entries()) {
    const createdNow = await upsertPendingSuggestion({
      dossierRef: input.dossierRef,
      suggestionId: `qr_${prefix}_next_${idx + 1}`,
      type: "flag",
      payload: {
        contractId: input.contractId,
        category: "next_step",
        text: nextStep,
        provenance: input.provenance,
      },
      now: input.now,
      byUserId: input.byUserId,
    });
    if (createdNow) created += 1;
  }

  return created;
}

async function resolveAccessContext(contract: ProtocolDossierUpsertContractDoc) {
  const anlassraumId = parseObjectId(String(contract.anlassraumId || ""));
  if (!anlassraumId) return null;
  return (await anlassraumCol()).findOne({ _id: anlassraumId });
}

async function assertActorCanAccessContract(
  contract: ProtocolDossierUpsertContractDoc,
  actor: GovernanceActor,
  action: "read" | "review",
) {
  if (actor.isAdmin || actor.role === "admin") return;
  if (actor.role === "community") {
    throw new Error("actor_scope_forbidden");
  }
  const room = await resolveAccessContext(contract);
  if (!room) {
    throw new Error("actor_scope_requires_anlassraum");
  }
  const allowed = canActorAccessAnlassraum(room, actor, action);
  if (!allowed) {
    throw new Error("actor_scope_forbidden");
  }
}

function assertAdminActor(actor: GovernanceActor) {
  if (actor.isAdmin || actor.role === "admin") return;
  throw new Error("forbidden_scope");
}

async function canActorReadContract(
  contract: ProtocolDossierUpsertContractDoc,
  actor: GovernanceActor,
  roomById: Map<string, Awaited<ReturnType<typeof resolveAccessContext>>>,
) {
  if (actor.isAdmin || actor.role === "admin") return true;
  if (actor.role === "community") return false;
  const roomId = String(contract.anlassraumId || "").trim();
  if (!roomId) return false;
  const room = roomById.get(roomId);
  if (!room) return false;
  return canActorAccessAnlassraum(room, actor, "read");
}

export async function createProtocolDossierUpsertContract(
  input: CreateProtocolDossierUpsertInput,
): Promise<ProtocolDossierUpsertContractSummary> {
  const protocolEntryId = toObjectId(input.protocolEntryId);
  const now = new Date();
  const contractId = `dupc_${protocolEntryId.toHexString()}`;

  const summary = String(input.summary || "").trim().slice(0, 4000);
  const openQuestions = normalizeTextList(input.openQuestions, 30, 320);
  const decisions = normalizeTextList(input.decisions, 30, 320);
  const nextSteps = normalizeTextList(input.nextSteps, 30, 320);
  const tags = normalizeTextList(input.tags, 30, 64);
  const eventRefs = normalizeEventRefs(input.eventRefs);
  const anlassraumId = toOptionalHex(input.anlassraumId);
  const resolvedDossier = await resolveDossierReference(input.dossierId);
  const linkStatus: ProtocolDossierUpsertLinkStatus = resolvedDossier.targetDossierId
    ? "mapped_to_existing_dossier"
    : "pending_dossier_link";
  const provenance = {
    sourceType: "protocol" as const,
    protocolEntryId: protocolEntryId.toHexString(),
    qrSetCode: String(input.qrSetCode || "").trim(),
    anlassraumId,
    eventIds: eventRefs.map((item) => item.id),
    actorId: input.createdBy ? String(input.createdBy).trim() : null,
    timestamp: now.toISOString(),
  };

  let suggestionCount = 0;
  if (resolvedDossier.targetDossierRef) {
    suggestionCount = await upsertDossierSuggestions({
      dossierRef: resolvedDossier.targetDossierRef,
      contractId,
      protocolEntryId: protocolEntryId.toHexString(),
      summary,
      openQuestions,
      decisions,
      nextSteps,
      tags,
      provenance,
      now,
      byUserId: provenance.actorId,
    });
  }

  const auditEntry: ProtocolContractAuditEntry = {
    action: "created",
    contractId,
    sourceType: "protocol",
    qrSetCode: provenance.qrSetCode,
    protocolEntryId: provenance.protocolEntryId,
    anlassraumId,
    dossierId: resolvedDossier.targetDossierRef,
    actorId: provenance.actorId,
    timestamp: now.toISOString(),
    details: {
      suggestionCount,
      linkStatus,
    },
  };

  const contracts = await dossierUpsertContractsCol();
  await contracts.updateOne(
    { protocolEntryId },
    {
      $set: {
        qrSetCode: String(input.qrSetCode || "").trim(),
        anlassraumId,
        targetDossierId: resolvedDossier.targetDossierId,
        targetDossierRef: resolvedDossier.targetDossierRef,
        status: "pending_review",
        linkStatus,
        material: {
          summaryNotes: summary ? [summary] : [],
          openQuestions,
          decisions,
          nextSteps,
          tags,
          eventRefs,
        },
        suggestionCount,
        appliedSuggestionCount: 0,
        provenance,
        createdBy: input.createdBy ? String(input.createdBy).trim() : null,
        appliedBy: null,
        appliedAt: null,
        rejectedBy: null,
        rejectedAt: null,
        lastAction: "created",
        lastActionBy: input.createdBy ? String(input.createdBy).trim() : null,
        lastActionAt: now,
        lastActionNote: null,
        auditTrail: [auditEntry],
        updatedAt: now,
      },
      $setOnInsert: {
        contractId,
        protocolEntryId,
        createdAt: now,
      },
    },
    { upsert: true },
  );

  const saved = await contracts.findOne({ protocolEntryId });
  const summaryOut = toSummary(saved);
  if (!summaryOut) {
    throw new Error("dossier_upsert_contract_not_persisted");
  }
  return summaryOut;
}

export async function listDossierUpsertContractsAuthorized(
  actor: GovernanceActor,
  input: ListDossierUpsertContractsInput = {},
): Promise<ProtocolDossierUpsertContractSummary[]> {
  const contracts = await dossierUpsertContractsCol();
  const filter: Record<string, unknown> = {};

  if (input.status) filter.status = input.status;
  if (input.qrSetCode) filter.qrSetCode = String(input.qrSetCode).trim();
  if (input.anlassraumId) filter.anlassraumId = String(input.anlassraumId).trim();
  if (input.targetDossierId) {
    const parsed = parseObjectId(String(input.targetDossierId).trim());
    filter.targetDossierId = parsed ? parsed.toHexString() : String(input.targetDossierId).trim();
  }

  const docs = await contracts
    .find(filter)
    .sort({ updatedAt: -1 })
    .limit(normalizeListLimit(input.limit))
    .toArray();

  if (actor.isAdmin || actor.role === "admin") {
    return docs.map((item) => toSummary(item)).filter((item): item is ProtocolDossierUpsertContractSummary => !!item);
  }

  const roomIds = Array.from(
    new Set(docs.map((item) => String(item.anlassraumId || "").trim()).filter(Boolean)),
  );
  const roomObjectIds = roomIds
    .filter((value) => ObjectId.isValid(value))
    .map((value) => new ObjectId(value));
  const rooms = roomObjectIds.length
    ? await (await anlassraumCol()).find({ _id: { $in: roomObjectIds } }).toArray()
    : [];
  const roomById = new Map<string, (typeof rooms)[number]>(
    rooms.map((room) => [room._id?.toHexString?.() ?? "", room]),
  );

  const visible: ProtocolDossierUpsertContractSummary[] = [];
  for (const contract of docs) {
    // eslint-disable-next-line no-await-in-loop
    const allowed = await canActorReadContract(contract, actor, roomById);
    if (!allowed) continue;
    const summary = toSummary(contract);
    if (summary) visible.push(summary);
  }

  return visible;
}

export async function getDossierUpsertContractAuthorized(
  actor: GovernanceActor,
  contractId: string,
): Promise<ProtocolDossierUpsertContractDetail> {
  const normalized = normalizeContractId(contractId);
  if (!normalized) {
    throw new Error("invalid_contract_id");
  }

  const contracts = await dossierUpsertContractsCol();
  const contract = await contracts.findOne({ contractId: normalized });
  if (!contract) {
    throw new Error("contract_not_found");
  }

  await assertActorCanAccessContract(contract, actor, "read");

  const detail = toDetail(contract);
  if (!detail) {
    throw new Error("contract_not_found");
  }

  return detail;
}

export async function applyDossierUpsertContractAuthorized(input: ApplyDossierUpsertContractInput) {
  const normalizedId = normalizeContractId(input.contractId);
  if (!normalizedId) {
    throw new Error("invalid_contract_id");
  }

  const contracts = await dossierUpsertContractsCol();
  const contract = await contracts.findOne({ contractId: normalizedId });
  if (!contract) {
    throw new Error("contract_not_found");
  }

  await assertActorCanAccessContract(contract, input.actor, "review");

  if (contract.status === "rejected") {
    throw new Error("contract_rejected");
  }
  if (contract.status === "applied") {
    throw new Error("contract_already_applied");
  }

  const resolvedDossier = await resolveDossierReference(
    input.targetDossierId || contract.targetDossierId || contract.targetDossierRef,
  );

  if (!resolvedDossier.targetDossierRef) {
    throw new Error("contract_missing_target_dossier");
  }

  const selection = selectContractMaterial(contract, input.selection);
  const materialIds = buildSuggestionIds(contract);

  const selectedQuestionIds = selection.questionIndexes.map((index) => materialIds.questionIds[index]);
  const selectedDecisionIds = selection.decisionIndexes.map((index) => materialIds.decisionIds[index]);
  const selectedNextStepIds = selection.nextStepIndexes.map((index) => materialIds.nextStepIds[index]);

  const selectedCount =
    (selection.summaryIncluded && contract.material.summaryNotes.length > 0 ? 1 : 0) +
    selectedQuestionIds.length +
    selectedDecisionIds.length +
    selectedNextStepIds.length;

  if (selectedCount === 0) {
    throw new Error("nothing_selected_for_apply");
  }

  const now = new Date();
  const protocolEntrySuffix = contract.provenance.protocolEntryId.slice(-10);

  if (selection.summaryIncluded && contract.material.summaryNotes.length > 0) {
    await upsertSuggestionWithStatus({
      dossierRef: resolvedDossier.targetDossierRef,
      suggestionId: materialIds.summaryId,
      type: "flag",
      payload: {
        contractId: contract.contractId,
        category: "summary_note",
        text: contract.material.summaryNotes[0],
        tags: contract.material.tags,
        provenance: contract.provenance,
        appliedFromContract: true,
      },
      status: "accepted",
      moderationNote: "Applied from protocol dossier-upsert contract",
      now,
      byUserId: input.actor.userId,
    });
  }

  for (const index of selection.questionIndexes) {
    const questionId = materialIds.questionIds[index];
    const questionText = contract.material.openQuestions[index];
    await upsertSuggestionWithStatus({
      dossierRef: resolvedDossier.targetDossierRef,
      suggestionId: questionId,
      type: "question",
      payload: {
        contractId: contract.contractId,
        category: "open_question",
        text: questionText,
        provenance: contract.provenance,
        appliedFromContract: true,
      },
      status: "accepted",
      moderationNote: "Applied from protocol dossier-upsert contract",
      now,
      byUserId: input.actor.userId,
    });

    const questions = await openQuestionsCol();
    await mutateDossierWithRevision({
      dossierId: resolvedDossier.targetDossierRef,
      mutate: async (session) => {
        const prev = await questions.findOneAndUpdate(
          {
            dossierId: resolvedDossier.targetDossierRef,
            questionId,
          },
          {
            $setOnInsert: {
              dossierId: resolvedDossier.targetDossierRef,
              questionId,
              text: questionText,
              status: "in_review",
              links: {
                sourceIds: [],
                claimIds: [],
                findingIds: [],
              },
              createdAt: now,
            },
          },
          { upsert: true, returnDocument: "before", includeResultMetadata: true, session },
        );
        if (prev.value) return { result: null, revision: null };
        return {
          result: null,
          revision: {
            entityType: "open_question",
            entityId: questionId,
            action: "create",
            diffSummary: "Offene Frage aus Protokollvertrag übernommen.",
            byRole: "system",
            byUserId: input.actor.userId,
          },
        };
      },
    });
  }

  for (const index of selection.decisionIndexes) {
    const suggestionId = materialIds.decisionIds[index];
    const decisionText = contract.material.decisions[index];
    await upsertSuggestionWithStatus({
      dossierRef: resolvedDossier.targetDossierRef,
      suggestionId,
      type: "claim",
      payload: {
        contractId: contract.contractId,
        category: "decision",
        text: decisionText,
        provenance: contract.provenance,
        appliedFromContract: true,
      },
      status: "accepted",
      moderationNote: "Applied from protocol dossier-upsert contract",
      now,
      byUserId: input.actor.userId,
    });
  }

  for (const index of selection.nextStepIndexes) {
    const suggestionId = materialIds.nextStepIds[index];
    const nextStep = contract.material.nextSteps[index];
    await upsertSuggestionWithStatus({
      dossierRef: resolvedDossier.targetDossierRef,
      suggestionId,
      type: "flag",
      payload: {
        contractId: contract.contractId,
        category: "next_step",
        text: nextStep,
        provenance: contract.provenance,
        appliedFromContract: true,
      },
      status: "accepted",
      moderationNote: "Applied from protocol dossier-upsert contract",
      now,
      byUserId: input.actor.userId,
    });
  }

  const selectedSuggestionIds = [
    ...(selection.summaryIncluded && contract.material.summaryNotes.length > 0 ? [materialIds.summaryId] : []),
    ...selectedQuestionIds,
    ...selectedDecisionIds,
    ...selectedNextStepIds,
  ];

  const allSuggestionIds = [
    ...(contract.material.summaryNotes.length > 0 ? [materialIds.summaryId] : []),
    ...materialIds.questionIds,
    ...materialIds.decisionIds,
    ...materialIds.nextStepIds,
  ];

  const suggestionsCol = await dossierSuggestionsCol();
  const selectedAcceptedCount = await suggestionsCol.countDocuments({
    dossierId: resolvedDossier.targetDossierRef,
    suggestionId: { $in: selectedSuggestionIds },
    status: "accepted",
  });
  const acceptedCount = await suggestionsCol.countDocuments({
    dossierId: resolvedDossier.targetDossierRef,
    suggestionId: { $in: allSuggestionIds },
    status: "accepted",
  });

  const totalMaterialCount = countMaterialItems(contract);
  const nextStatus: ProtocolDossierUpsertStatus =
    acceptedCount >= totalMaterialCount ? "applied" : "partially_applied";

  const auditEntry: ProtocolContractAuditEntry = {
    action: "applied",
    contractId: contract.contractId,
    sourceType: "protocol",
    qrSetCode: contract.qrSetCode,
    protocolEntryId: contract.provenance.protocolEntryId,
    anlassraumId: contract.anlassraumId,
    dossierId: resolvedDossier.targetDossierRef,
    actorId: input.actor.userId,
    timestamp: now.toISOString(),
    details: {
      selectedCount,
      selectedAcceptedCount,
      acceptedCount,
      totalMaterialCount,
    },
  };

  await contracts.updateOne(
    { _id: contract._id },
    {
      $set: {
        targetDossierId: resolvedDossier.targetDossierId,
        targetDossierRef: resolvedDossier.targetDossierRef,
        linkStatus: "mapped_to_existing_dossier",
        status: nextStatus,
        appliedBy: input.actor.userId,
        appliedAt: now,
        lastAction: "applied",
        lastActionBy: input.actor.userId,
        lastActionAt: now,
        lastActionNote: input.actionNote ? String(input.actionNote).slice(0, 400) : null,
        appliedSuggestionCount: acceptedCount,
        auditTrail: appendAuditEntry(contract, auditEntry),
        updatedAt: now,
      },
    },
  );

  const updated = await contracts.findOne({ _id: contract._id });
  const detail = toDetail(updated);
  if (!detail) {
    throw new Error("contract_not_found_after_update");
  }

  return {
    contract: detail,
    applyResult: {
      targetDossierId: resolvedDossier.targetDossierId,
      targetDossierRef: resolvedDossier.targetDossierRef,
      selectedCount,
      selectedAcceptedCount,
      acceptedCount,
      status: nextStatus,
      protocolEntryKey: `qr_${protocolEntrySuffix}`,
    },
  };
}

export async function rejectDossierUpsertContractAuthorized(input: RejectDossierUpsertContractInput) {
  const normalizedId = normalizeContractId(input.contractId);
  if (!normalizedId) {
    throw new Error("invalid_contract_id");
  }

  const contracts = await dossierUpsertContractsCol();
  const contract = await contracts.findOne({ contractId: normalizedId });
  if (!contract) {
    throw new Error("contract_not_found");
  }

  await assertActorCanAccessContract(contract, input.actor, "review");

  if (contract.status === "applied") {
    throw new Error("contract_already_applied");
  }
  if (contract.status === "rejected") {
    throw new Error("contract_already_rejected");
  }

  const now = new Date();
  const ids = buildSuggestionIds(contract);
  const allSuggestionIds = [
    ...(contract.material.summaryNotes.length > 0 ? [ids.summaryId] : []),
    ...ids.questionIds,
    ...ids.decisionIds,
    ...ids.nextStepIds,
  ];

  let rejectedPendingCount = 0;
  if (contract.targetDossierRef && allSuggestionIds.length > 0) {
    const moderationNote = input.reason
      ? String(input.reason).slice(0, 400)
      : "Rejected via protocol dossier-upsert contract";
    for (const suggestionId of allSuggestionIds) {
      const rejected = await rejectPendingSuggestion({
        dossierRef: contract.targetDossierRef,
        suggestionId,
        moderationNote,
        now,
        byUserId: input.actor.userId,
      });
      if (rejected) rejectedPendingCount += 1;
    }
  }

  const auditEntry: ProtocolContractAuditEntry = {
    action: "rejected",
    contractId: contract.contractId,
    sourceType: "protocol",
    qrSetCode: contract.qrSetCode,
    protocolEntryId: contract.provenance.protocolEntryId,
    anlassraumId: contract.anlassraumId,
    dossierId: contract.targetDossierRef,
    actorId: input.actor.userId,
    timestamp: now.toISOString(),
    details: {
      rejectedPendingCount,
      reason: input.reason ? String(input.reason).slice(0, 400) : null,
    },
  };

  await contracts.updateOne(
    { _id: contract._id },
    {
      $set: {
        status: "rejected",
        rejectedBy: input.actor.userId,
        rejectedAt: now,
        lastAction: "rejected",
        lastActionBy: input.actor.userId,
        lastActionAt: now,
        lastActionNote: input.reason ? String(input.reason).slice(0, 400) : null,
        auditTrail: appendAuditEntry(contract, auditEntry),
        updatedAt: now,
      },
    },
  );

  const updated = await contracts.findOne({ _id: contract._id });
  const detail = toDetail(updated);
  if (!detail) {
    throw new Error("contract_not_found_after_update");
  }

  return {
    contract: detail,
    rejectResult: {
      rejectedPendingCount,
    },
  };
}

export async function listLegacyDossierUpsertContractsAuthorized(
  actor: GovernanceActor,
  input: ListLegacyDossierUpsertContractsInput = {},
): Promise<ProtocolDossierUpsertContractSummary[]> {
  assertAdminActor(actor);

  const contracts = await dossierUpsertContractsCol();
  const docs = await contracts
    .find({
      $or: [
        { anlassraumId: null },
        { anlassraumId: { $exists: false } },
        { targetDossierId: null },
        { targetDossierId: { $exists: false } },
        { targetDossierRef: null },
        { targetDossierRef: { $exists: false } },
        { "provenance.anlassraumId": null },
        { "provenance.anlassraumId": { $exists: false } },
      ],
    })
    .sort({ updatedAt: -1 })
    .limit(normalizeListLimit(input.limit))
    .toArray();

  return docs.map((item) => toSummary(item)).filter((item): item is ProtocolDossierUpsertContractSummary => !!item);
}

export async function backfillDossierUpsertContractAuthorized(
  input: BackfillDossierUpsertContractInput,
) {
  assertAdminActor(input.actor);

  const normalizedId = normalizeContractId(input.contractId);
  if (!normalizedId) {
    throw new Error("invalid_contract_id");
  }

  const contracts = await dossierUpsertContractsCol();
  const contract = await contracts.findOne({ contractId: normalizedId });
  if (!contract) {
    throw new Error("contract_not_found");
  }

  let nextAnlassraumId = contract.anlassraumId ?? null;
  if (typeof input.anlassraumId !== "undefined") {
    const normalizedRoomId = String(input.anlassraumId || "").trim();
    if (!ObjectId.isValid(normalizedRoomId)) {
      throw new Error("invalid_anlassraum_id");
    }
    const room = await (await anlassraumCol()).findOne({ _id: new ObjectId(normalizedRoomId) });
    if (!room) {
      throw new Error("anlassraum_not_found");
    }
    nextAnlassraumId = normalizedRoomId;
  }

  let resolvedDossier = await resolveDossierReference(
    contract.targetDossierId || contract.targetDossierRef,
  );
  if (typeof input.targetDossierId !== "undefined") {
    resolvedDossier = await resolveDossierReference(input.targetDossierId);
    if (!resolvedDossier.targetDossierRef) {
      throw new Error("invalid_dossier_target");
    }
  }

  const nextLinkStatus: ProtocolDossierUpsertLinkStatus = resolvedDossier.targetDossierId
    ? "mapped_to_existing_dossier"
    : "pending_dossier_link";

  const changed =
    (nextAnlassraumId ?? null) !== (contract.anlassraumId ?? null) ||
    (resolvedDossier.targetDossierId ?? null) !== (contract.targetDossierId ?? null) ||
    (resolvedDossier.targetDossierRef ?? null) !== (contract.targetDossierRef ?? null) ||
    nextLinkStatus !== contract.linkStatus;
  if (!changed) {
    throw new Error("contract_backfill_requires_change");
  }

  const now = new Date();
  const auditEntry: ProtocolContractAuditEntry = {
    action: "backfilled",
    contractId: contract.contractId,
    sourceType: "protocol",
    qrSetCode: contract.qrSetCode,
    protocolEntryId: contract.provenance.protocolEntryId,
    anlassraumId: nextAnlassraumId,
    dossierId: resolvedDossier.targetDossierRef,
    actorId: input.actor.userId,
    timestamp: now.toISOString(),
    details: {
      previousAnlassraumId: contract.anlassraumId ?? null,
      previousTargetDossierId: contract.targetDossierId ?? null,
      previousTargetDossierRef: contract.targetDossierRef ?? null,
      linkStatusBefore: contract.linkStatus,
      linkStatusAfter: nextLinkStatus,
    },
  };

  await contracts.updateOne(
    { _id: contract._id },
    {
      $set: {
        anlassraumId: nextAnlassraumId,
        targetDossierId: resolvedDossier.targetDossierId,
        targetDossierRef: resolvedDossier.targetDossierRef,
        linkStatus: nextLinkStatus,
        provenance: {
          ...contract.provenance,
          anlassraumId: nextAnlassraumId,
        },
        lastAction: "backfilled",
        lastActionBy: input.actor.userId,
        lastActionAt: now,
        lastActionNote: input.actionNote ? String(input.actionNote).slice(0, 400) : null,
        auditTrail: appendAuditEntry(contract, auditEntry),
        updatedAt: now,
      },
    },
  );

  const updated = await contracts.findOne({ _id: contract._id });
  const detail = toDetail(updated);
  if (!detail) {
    throw new Error("contract_not_found_after_update");
  }

  return {
    contract: detail,
    backfillResult: {
      anlassraumId: nextAnlassraumId,
      targetDossierId: resolvedDossier.targetDossierId,
      targetDossierRef: resolvedDossier.targetDossierRef,
      linkStatus: nextLinkStatus,
    },
  };
}

export async function getLatestDossierUpsertContractByCode(code: string) {
  const contracts = await dossierUpsertContractsCol();
  const item = await contracts
    .find({ qrSetCode: String(code || "").trim() })
    .sort({ updatedAt: -1 })
    .limit(1)
    .next();
  return toSummary(item);
}

export async function countDossierUpsertContractsByCode(code: string) {
  const contracts = await dossierUpsertContractsCol();
  return contracts.countDocuments({ qrSetCode: String(code || "").trim() });
}
