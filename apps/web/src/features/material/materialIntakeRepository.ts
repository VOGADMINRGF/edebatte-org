import { coreCol, shouldUseInMemoryMongoFallback } from "@core/db/triMongo";
import { stableHash } from "@core/utils/hash";
import {
  buildMaterialIntakeContract,
  type MaterialIntakeInputItem,
  type MaterialIntakeItem,
} from "./materialIntakeContract";

export const MATERIAL_INTAKE_WORKFLOW_STATES = [
  "verification_required",
  "limited_intake",
  "review_queue_ready",
] as const;

export type MaterialIntakeWorkflowState =
  (typeof MATERIAL_INTAKE_WORKFLOW_STATES)[number];

export const MATERIAL_INTAKE_SCAN_STATES = [
  "not_required",
  "required",
  "pending_external_scan",
  "passed",
  "failed",
] as const;

export type MaterialIntakeScanState =
  (typeof MATERIAL_INTAKE_SCAN_STATES)[number];

export const MATERIAL_INTAKE_EXTRACTION_STATES = [
  "not_required",
  "not_started",
  "submitted_text_only",
  "local_document_extraction",
  "pending_external_extraction",
  "failed",
] as const;

export type MaterialIntakeExtractionState =
  (typeof MATERIAL_INTAKE_EXTRACTION_STATES)[number];

export const MATERIAL_INTAKE_REVIEW_STATES = [
  "queued",
  "in_review",
  "approved_internal",
  "approved_public_reference",
  "rejected",
  "archived",
] as const;

export type MaterialIntakeReviewState =
  (typeof MATERIAL_INTAKE_REVIEW_STATES)[number];

export type MaterialIntakeRecord = {
  id: string;
  organizationId: string | null;
  regionId: string | null;
  actorId: string;
  workflowState: MaterialIntakeWorkflowState;
  intakeItem: MaterialIntakeItem;
  label: string;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  url: string | null;
  uploadId: string | null;
  textPreview: string | null;
  pageRef: string | null;
  timestampRef: string | null;
  scanState: MaterialIntakeScanState;
  extractionState: MaterialIntakeExtractionState;
  reviewState: MaterialIntakeReviewState;
  metadataPersisted: boolean;
  rawObjectStored: false;
  scanProviderConfigured: false;
  extractionProviderConfigured: false;
  publicReferenceAllowed: false;
  noAutoResearch: true;
  noAutoPublish: true;
  noAutoPublicOfficial: true;
  createdAt: string;
  updatedAt: string;
};

export const MATERIAL_INTAKE_AUDIT_EVENT_TYPES = [
  "submitted",
  "scan_required",
  "extraction_required",
  "review_queued",
  "review_updated",
  "archived",
] as const;

export type MaterialIntakeAuditEventType =
  (typeof MATERIAL_INTAKE_AUDIT_EVENT_TYPES)[number];

export type MaterialIntakeAuditEvent = {
  id: string;
  recordId: string;
  organizationId: string | null;
  regionId: string | null;
  actorId: string;
  eventType: MaterialIntakeAuditEventType;
  at: string;
  note: string | null;
  noAutoResearch: true;
  noAutoPublish: true;
  noAutoPublicOfficial: true;
};

export type MaterialIntakePersistenceState = {
  mode: "persistent_primary" | "in_memory_fallback";
  label: string;
  summary: string;
  repositoryInterface: "MaterialIntakeRepository";
  storeKind: "mongo_collection" | "in_memory";
  productionTruth: boolean;
  metadataDurable: boolean;
  reviewStateDurable: boolean;
  rawObjectStorageDurable: false;
  scanProviderConfigured: false;
  extractionProviderConfigured: false;
};

export type MaterialIntakeRepository = {
  createRecords(input: CreateMaterialIntakeRecordsInput): Promise<{
    records: MaterialIntakeRecord[];
    auditEvents: MaterialIntakeAuditEvent[];
    persistence: MaterialIntakePersistenceState;
  }>;
  getRecord(recordId: string): Promise<MaterialIntakeRecord | null>;
  listRecords(query?: {
    organizationIds?: string[];
    actorId?: string | null;
    limit?: number;
  }): Promise<MaterialIntakeRecord[]>;
  listAuditEvents(recordId: string): Promise<MaterialIntakeAuditEvent[]>;
  getPersistenceState(): MaterialIntakePersistenceState;
};

export type CreateMaterialIntakeRecordsInput = {
  items: Array<MaterialIntakeInputItem & { sizeBytes?: number | null }>;
  actorId: string;
  organizationId?: string | null;
  regionId?: string | null;
  workflowState: MaterialIntakeWorkflowState;
};

const MATERIAL_RECORDS_COLLECTION = "edebatte_material_intake_records";
const MATERIAL_AUDIT_COLLECTION = "edebatte_material_intake_audit";

let repoSingleton: MaterialIntakeRepository | null = null;
let indexesReady = false;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso() {
  return new Date().toISOString();
}

function uniqueNonEmpty(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean)));
}

function normalizeLimit(value: unknown, fallback = 50) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  return Math.max(1, Math.min(200, Math.floor(numeric)));
}

function persistenceState(mode: MaterialIntakePersistenceState["mode"]): MaterialIntakePersistenceState {
  const persistent = mode === "persistent_primary";
  return {
    mode,
    label: persistent ? "Persistente Material-Metadaten-Registry" : "In-Memory-Material-Fallback",
    summary: persistent
      ? "Material-Metadaten, Review-State und Audit-Events liegen dauerhaft in Core-Collections. Rohdateien, Malware-Scanner und Extraktionsanbieter sind weiterhin separate, nicht automatisch gestartete Integrationen."
      : "Nur Dev-/Test-/Build-Fallback: Material-Metadaten leben pro Prozess und duerfen nicht als Produktionswahrheit ausgegeben werden.",
    repositoryInterface: "MaterialIntakeRepository",
    storeKind: persistent ? "mongo_collection" : "in_memory",
    productionTruth: persistent,
    metadataDurable: persistent,
    reviewStateDurable: persistent,
    rawObjectStorageDurable: false,
    scanProviderConfigured: false,
    extractionProviderConfigured: false,
  };
}

function scanStateFor(item: MaterialIntakeItem): MaterialIntakeScanState {
  return item.riskFlags.includes("malware_scan_required") ? "required" : "not_required";
}

function extractionStateFor(item: MaterialIntakeItem): MaterialIntakeExtractionState {
  if (
    item.extractedBy === "pdf-parse@2" ||
    item.extractedBy === "mammoth@1"
  ) {
    return "local_document_extraction";
  }
  if (item.extractionStatus === "full" || item.extractionStatus === "partial") return "submitted_text_only";
  if (item.riskFlags.includes("extraction_missing")) return "pending_external_extraction";
  return "not_required";
}

function recordIdFor(input: {
  actorId: string;
  organizationId: string | null;
  regionId: string | null;
  item: MaterialIntakeInputItem;
  at: string;
}) {
  const seed = [
    input.actorId,
    input.organizationId,
    input.regionId,
    input.item.id,
    input.item.uploadId,
    input.item.fileName,
    input.item.url,
    input.at,
  ].join(":");
  return `material-${stableHash(seed).slice(0, 20)}`;
}

function auditIdFor(recordId: string, eventType: MaterialIntakeAuditEventType, at: string) {
  return `material-audit-${stableHash(`${recordId}:${eventType}:${at}`).slice(0, 20)}`;
}

function auditEvent(input: {
  record: MaterialIntakeRecord;
  eventType: MaterialIntakeAuditEventType;
  at: string;
  note?: string | null;
}): MaterialIntakeAuditEvent {
  return {
    id: auditIdFor(input.record.id, input.eventType, input.at),
    recordId: input.record.id,
    organizationId: input.record.organizationId,
    regionId: input.record.regionId,
    actorId: input.record.actorId,
    eventType: input.eventType,
    at: input.at,
    note: input.note ?? null,
    noAutoResearch: true,
    noAutoPublish: true,
    noAutoPublicOfficial: true,
  };
}

function buildRecords(input: CreateMaterialIntakeRecordsInput, persistence: MaterialIntakePersistenceState) {
  const at = nowIso();
  const organizationId = String(input.organizationId ?? "").trim() || null;
  const regionId = String(input.regionId ?? "").trim() || null;
  const actorId = String(input.actorId ?? "").trim() || "anonymous";
  const contract = buildMaterialIntakeContract({
    items: input.items,
    productionTruth: persistence.productionTruth,
    storageMode: persistence.productionTruth ? "persistent_metadata_store" : "local_pending",
  });

  const records = contract.items.map((item, index): MaterialIntakeRecord => {
    const rawInput = input.items[index] as (MaterialIntakeInputItem & { sizeBytes?: number | null }) | undefined;
    return {
      id: recordIdFor({
        actorId,
        organizationId,
        regionId,
        item: rawInput ?? input.items[index],
        at,
      }),
      organizationId,
      regionId,
      actorId,
      workflowState: input.workflowState,
      intakeItem: item,
      label: item.label,
      fileName: item.fileName,
      mimeType: item.mimeType,
      sizeBytes: typeof rawInput?.sizeBytes === "number" ? rawInput.sizeBytes : null,
      url: item.url,
      uploadId: item.uploadId,
      textPreview: normalizeTextPreview(rawInput?.text ?? null),
      pageRef: normalizeTextPreview(rawInput?.pageRef ?? null, 120),
      timestampRef: normalizeTextPreview(rawInput?.timestampRef ?? null, 120),
      scanState: scanStateFor(item),
      extractionState: extractionStateFor(item),
      reviewState: "queued",
      metadataPersisted: persistence.metadataDurable,
      rawObjectStored: false,
      scanProviderConfigured: false,
      extractionProviderConfigured: false,
      publicReferenceAllowed: false,
      noAutoResearch: true,
      noAutoPublish: true,
      noAutoPublicOfficial: true,
      createdAt: at,
      updatedAt: at,
    };
  });

  const auditEvents = records.flatMap((record) => {
    const events: MaterialIntakeAuditEvent[] = [
      auditEvent({ record, eventType: "submitted", at }),
      auditEvent({ record, eventType: "review_queued", at }),
    ];
    if (record.scanState === "required") events.push(auditEvent({ record, eventType: "scan_required", at }));
    if (record.extractionState === "pending_external_extraction") {
      events.push(auditEvent({ record, eventType: "extraction_required", at }));
    }
    return events;
  });

  return { records, auditEvents };
}

function normalizeTextPreview(value: string | null | undefined, maxLength = 500) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;
  return normalized.slice(0, maxLength);
}

function recordDoc(record: MaterialIntakeRecord) {
  return {
    _id: record.id,
    record: clone(record),
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
  };
}

function auditDoc(event: MaterialIntakeAuditEvent) {
  return {
    _id: event.id,
    event: clone(event),
    createdAt: new Date(event.at),
  };
}

function createMongoRepo(): MaterialIntakeRepository {
  const persistence = persistenceState("persistent_primary");
  return {
    async createRecords(input) {
      await ensureIndexes();
      const built = buildRecords(input, persistence);
      const records = await coreCol<any>(MATERIAL_RECORDS_COLLECTION);
      const audit = await coreCol<any>(MATERIAL_AUDIT_COLLECTION);
      await Promise.all([
        ...built.records.map((record) =>
          records.updateOne({ _id: record.id }, { $set: recordDoc(record) }, { upsert: true }),
        ),
        ...built.auditEvents.map((event) =>
          audit.updateOne({ _id: event.id }, { $set: auditDoc(event) }, { upsert: true }),
        ),
      ]);
      return { ...built, persistence };
    },
    async getRecord(recordId) {
      await ensureIndexes();
      const normalized = String(recordId ?? "").trim();
      if (!normalized) return null;
      const records = await coreCol<any>(MATERIAL_RECORDS_COLLECTION);
      const doc = await records.findOne({ _id: normalized });
      return doc?.record ? clone(doc.record as MaterialIntakeRecord) : null;
    },
    async listRecords(query = {}) {
      await ensureIndexes();
      const organizationIds = uniqueNonEmpty(query.organizationIds ?? []);
      const actorId = String(query.actorId ?? "").trim();
      const mongoQuery: Record<string, unknown>[] = [];
      if (organizationIds.length > 0) mongoQuery.push({ "record.organizationId": { $in: organizationIds } });
      if (actorId) mongoQuery.push({ "record.actorId": actorId, "record.organizationId": null });
      const records = await coreCol<any>(MATERIAL_RECORDS_COLLECTION);
      const docs = await records
        .find(mongoQuery.length > 0 ? { $or: mongoQuery } : {})
        .sort({ updatedAt: -1 })
        .limit(normalizeLimit(query.limit))
        .toArray();
      return docs
        .map((doc) => doc?.record)
        .filter((record): record is MaterialIntakeRecord => Boolean(record))
        .map((record) => clone(record));
    },
    async listAuditEvents(recordId) {
      await ensureIndexes();
      const audit = await coreCol<any>(MATERIAL_AUDIT_COLLECTION);
      const docs = await audit.find({ "event.recordId": recordId }).sort({ createdAt: -1 }).toArray();
      return docs
        .map((doc) => doc?.event)
        .filter((event): event is MaterialIntakeAuditEvent => Boolean(event))
        .map((event) => clone(event));
    },
    getPersistenceState() {
      return persistence;
    },
  };
}

export function createInMemoryMaterialIntakeRepository(seed?: {
  records?: MaterialIntakeRecord[];
  auditEvents?: MaterialIntakeAuditEvent[];
}): MaterialIntakeRepository {
  const persistence = persistenceState("in_memory_fallback");
  const records = new Map<string, MaterialIntakeRecord>();
  const auditEvents = new Map<string, MaterialIntakeAuditEvent>();
  for (const record of seed?.records ?? []) records.set(record.id, clone(record));
  for (const event of seed?.auditEvents ?? []) auditEvents.set(event.id, clone(event));
  return {
    async createRecords(input) {
      const built = buildRecords(input, persistence);
      for (const record of built.records) records.set(record.id, clone(record));
      for (const event of built.auditEvents) auditEvents.set(event.id, clone(event));
      return { ...built, persistence };
    },
    async getRecord(recordId) {
      const normalized = String(recordId ?? "").trim();
      if (!normalized) return null;
      const record = records.get(normalized);
      return record ? clone(record) : null;
    },
    async listRecords(query = {}) {
      const organizationIds = new Set(uniqueNonEmpty(query.organizationIds ?? []));
      const actorId = String(query.actorId ?? "").trim();
      return Array.from(records.values())
        .filter((record) => {
          if (record.organizationId && organizationIds.has(record.organizationId)) return true;
          return actorId && record.actorId === actorId && record.organizationId === null;
        })
        .map((record) => clone(record))
        .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)))
        .slice(0, normalizeLimit(query.limit));
    },
    async listAuditEvents(recordId) {
      return Array.from(auditEvents.values())
        .filter((event) => event.recordId === recordId)
        .map((event) => clone(event))
        .sort((left, right) => String(right.at).localeCompare(String(left.at)));
    },
    getPersistenceState() {
      return persistence;
    },
  };
}

function getRepo() {
  if (shouldUseInMemoryMongoFallback()) {
    if (!repoSingleton) repoSingleton = createInMemoryMaterialIntakeRepository();
    return repoSingleton;
  }
  if (!repoSingleton) repoSingleton = createMongoRepo();
  return repoSingleton;
}

export function getMaterialIntakeRepository(): MaterialIntakeRepository {
  return getRepo();
}

export function setMaterialIntakeRepositoryForTests(repo: MaterialIntakeRepository | null) {
  repoSingleton = repo;
  indexesReady = false;
}

export function getMaterialIntakePersistenceState() {
  return getRepo().getPersistenceState();
}

export async function createMaterialIntakeRecords(input: CreateMaterialIntakeRecordsInput) {
  return getRepo().createRecords(input);
}

export async function listMaterialIntakeRecords(query?: Parameters<MaterialIntakeRepository["listRecords"]>[0]) {
  return getRepo().listRecords(query);
}

export async function listMaterialIntakeAuditEvents(recordId: string) {
  return getRepo().listAuditEvents(recordId);
}

export async function getMaterialIntakeRecord(recordId: string) {
  return getRepo().getRecord(recordId);
}

async function ensureIndexes() {
  if (indexesReady) return;
  const records = await coreCol(MATERIAL_RECORDS_COLLECTION);
  const audit = await coreCol(MATERIAL_AUDIT_COLLECTION);
  await Promise.all([
    records.createIndex({ "record.organizationId": 1, updatedAt: -1 }),
    records.createIndex({ "record.actorId": 1, updatedAt: -1 }),
    records.createIndex({ "record.reviewState": 1, updatedAt: -1 }),
    audit.createIndex({ "event.recordId": 1, createdAt: -1 }),
  ]).catch(() => undefined);
  indexesReady = true;
}
