import "server-only";

import { coreCol, getCol, ObjectId } from "@core/db/triMongo";
import { stableHash } from "@core/utils/hash";
import type { CreateMode } from "@/features/create/intents";
import type { SourceArtifact } from "@features/analyze/atomicClaimSourceRelationContract";

export const CANONICAL_SERVER_DRAFTS_COLLECTION = "drafts";
export const LEGACY_CREATE_CONTRIBUTION_DRAFTS_COLLECTION = "contribution_drafts";
export const MANUAL_ANLASSRAUM_SERVER_DRAFT_SOURCE = "runden_manual_anlassraum";
export const CANONICAL_SERVER_DRAFT_SCHEMA_VERSION = "draft_ssot_runtime.v1";
export const CANONICAL_CREATE_DRAFT_KIND = "create_contribution";
export const MANUAL_ANLASSRAUM_DRAFT_KIND = "manual_anlassraum";
export const GENERIC_SERVER_DRAFT_KIND = "generic";

type DraftStatus = "draft" | "finalized";
type DraftKind =
  | typeof CANONICAL_CREATE_DRAFT_KIND
  | typeof MANUAL_ANLASSRAUM_DRAFT_KIND
  | typeof GENERIC_SERVER_DRAFT_KIND;
type DraftUseCase = "civic" | "journalism" | "agenda";

type DraftWriteRuntime = {
  schemaVersion: string;
  kind: DraftKind;
  sourceCollection: typeof CANONICAL_SERVER_DRAFTS_COLLECTION;
  route: string;
  reviewFirstOnly: true;
  noAutoPublish: true;
  noSilentMerge: true;
  packageId: string | null;
  idempotencyKey: string | null;
  payloadHash: string | null;
};

type DraftAnalysisRecord = Record<string, unknown> & {
  draftWriteRuntime?: DraftWriteRuntime;
};

export type CanonicalServerDraftDoc = {
  _id: ObjectId;
  userId: string;
  locale?: string | null;
  source?: string | null;
  text: string;
  textOriginal?: string | null;
  textPrepared?: string | null;
  evidenceInput?: string | null;
  createMode?: CreateMode | null;
  anlassraumId?: string | null;
  authorName?: string | null;
  useCase?: DraftUseCase | null;
  analysis?: unknown;
  status: DraftStatus;
  createdAt: Date;
  updatedAt: Date;
  finalizedAt?: Date | null;
  proposalIds?: string[];
};

type LegacyCreateContributionDraftDoc = {
  _id: ObjectId;
  authorId: string;
  locale?: string | null;
  source?: string | null;
  text?: string | null;
  textOriginal?: string | null;
  textPrepared?: string | null;
  evidenceInput?: string | null;
  createMode?: CreateMode | null;
  anlassraumId?: string | null;
  authorName?: string | null;
  useCase?: DraftUseCase | null;
  analysis?: unknown;
  status?: DraftStatus;
  createdAt?: Date;
  updatedAt?: Date;
  finalizedAt?: Date | null;
  proposalIds?: string[];
};

export type NormalizedCreateContributionDraft = {
  id: string;
  userId: string;
  text: string;
  textOriginal: string | null;
  textPrepared: string | null;
  evidenceInput: string | null;
  locale: string | null;
  source: string | null;
  createMode: CreateMode | null;
  anlassraumId: string | null;
  authorName: string | null;
  useCase: DraftUseCase | null;
  analysis: unknown;
  status: DraftStatus;
  createdAt: Date | null;
  updatedAt: Date | null;
  finalizedAt: Date | null;
  proposalIds: string[];
  storage: "drafts" | "contribution_drafts_legacy";
  missingFields: string[];
};

type SaveUserScopedServerDraftInput = {
  userId: string;
  route: string;
  kind: DraftKind;
  status?: DraftStatus;
  draftId?: string | null;
  locale?: string | null;
  source?: string | null;
  text: string;
  textOriginal?: string | null;
  textPrepared?: string | null;
  evidenceInput?: string | null;
  createMode?: CreateMode | null;
  anlassraumId?: string | null;
  authorName?: string | null;
  useCase?: DraftUseCase | null;
  analysis?: unknown;
  packageId?: string | null;
  idempotencyKey?: string | null;
};

type SaveUserScopedServerDraftResult =
  | {
      ok: true;
      draftId: string;
      createdAt: Date;
      updatedAt: Date;
      createdNew: boolean;
    }
  | {
      ok: false;
      error:
        | "invalid_draft_id"
        | "draft_not_found"
        | "draft_finalized"
        | "idempotency_conflict";
    };

type UpdateStoredCreateContributionDraftPatch = {
  status?: DraftStatus;
  finalizedAt?: Date | null;
  proposalIds?: string[];
  createMode?: CreateMode | null;
  anlassraumId?: string | null;
  updatedAt?: Date;
};

function toDraftId(value: unknown) {
  if (typeof value === "string") return value;
  if (
    value &&
    typeof value === "object" &&
    "toHexString" in (value as Record<string, unknown>) &&
    typeof (value as { toHexString?: () => string }).toHexString === "function"
  ) {
    return (value as { toHexString: () => string }).toHexString();
  }
  return "";
}

function asDateOrNull(value: unknown) {
  if (value instanceof Date) return value;
  const date = new Date(String(value ?? ""));
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeOptionalString(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

function normalizeAnalysisRecord(value: unknown): DraftAnalysisRecord {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) };
  }
  return {};
}

function buildMissingFields(input: {
  textOriginal: string | null;
  textPrepared: string | null;
  locale: string | null;
  analysis: unknown;
}) {
  const missing: string[] = [];
  if (!input.textOriginal) missing.push("textOriginal");
  if (!input.textPrepared) missing.push("textPrepared");
  if (!input.locale) missing.push("locale");
  if (!input.analysis || typeof input.analysis !== "object" || Array.isArray(input.analysis)) {
    missing.push("analysis");
  }
  return missing;
}

function buildDraftWriteRuntime(input: {
  analysis: unknown;
  route: string;
  kind: DraftKind;
  packageId?: string | null;
  idempotencyKey?: string | null;
  payloadHash?: string | null;
}) {
  const analysis = normalizeAnalysisRecord(input.analysis);
  const previousRuntime =
    analysis.draftWriteRuntime &&
    typeof analysis.draftWriteRuntime === "object" &&
    !Array.isArray(analysis.draftWriteRuntime)
      ? (analysis.draftWriteRuntime as Record<string, unknown>)
      : {};

  return {
    ...analysis,
    draftWriteRuntime: {
      schemaVersion: CANONICAL_SERVER_DRAFT_SCHEMA_VERSION,
      kind: input.kind,
      sourceCollection: CANONICAL_SERVER_DRAFTS_COLLECTION,
      route: input.route,
      reviewFirstOnly: true as const,
      noAutoPublish: true as const,
      noSilentMerge: true as const,
      packageId:
        normalizeOptionalString(input.packageId) ??
        normalizeOptionalString(previousRuntime.packageId) ??
        null,
      idempotencyKey:
        normalizeOptionalString(input.idempotencyKey) ??
        normalizeOptionalString(previousRuntime.idempotencyKey) ??
        null,
      payloadHash:
        normalizeOptionalString(input.payloadHash) ??
        normalizeOptionalString(previousRuntime.payloadHash) ??
        null,
    } satisfies DraftWriteRuntime,
  };
}

function maybeAssign(target: Record<string, unknown>, key: string, value: unknown) {
  if (value !== undefined) {
    target[key] = value;
  }
}

function looksLikeCreateContributionDraft(doc: CanonicalServerDraftDoc | null) {
  if (!doc) return false;
  if (doc.source === MANUAL_ANLASSRAUM_SERVER_DRAFT_SOURCE) return false;
  return true;
}

function normalizeCanonicalCreateDraft(
  doc: CanonicalServerDraftDoc | null,
): NormalizedCreateContributionDraft | null {
  if (!looksLikeCreateContributionDraft(doc)) return null;
  const userId = normalizeOptionalString(doc?.userId);
  const id = toDraftId(doc?._id);
  if (!userId || !id) return null;
  const textOriginal = normalizeOptionalString(doc?.textOriginal) ?? null;
  const textPrepared = normalizeOptionalString(doc?.textPrepared) ?? null;
  const locale = normalizeOptionalString(doc?.locale) ?? null;
  return {
    id,
    userId,
    text: typeof doc?.text === "string" ? doc.text : "",
    textOriginal,
    textPrepared,
    evidenceInput: normalizeOptionalString(doc?.evidenceInput) ?? null,
    locale,
    source: normalizeOptionalString(doc?.source) ?? null,
    createMode:
      (normalizeOptionalString(doc?.createMode) as CreateMode | null | undefined) ?? null,
    anlassraumId: normalizeOptionalString(doc?.anlassraumId) ?? null,
    authorName: normalizeOptionalString(doc?.authorName) ?? null,
    useCase:
      (normalizeOptionalString(doc?.useCase) as DraftUseCase | null | undefined) ?? null,
    analysis: doc?.analysis ?? null,
    status: doc?.status === "finalized" ? "finalized" : "draft",
    createdAt: asDateOrNull(doc?.createdAt),
    updatedAt: asDateOrNull(doc?.updatedAt),
    finalizedAt: asDateOrNull(doc?.finalizedAt),
    proposalIds: Array.isArray(doc?.proposalIds)
      ? doc.proposalIds.map((value) => String(value))
      : [],
    storage: "drafts",
    missingFields: buildMissingFields({
      textOriginal,
      textPrepared,
      locale,
      analysis: doc?.analysis,
    }),
  };
}

function normalizeLegacyCreateDraft(
  doc: LegacyCreateContributionDraftDoc | null,
): NormalizedCreateContributionDraft | null {
  if (!doc) return null;
  const userId = normalizeOptionalString(doc.authorId);
  const id = toDraftId(doc._id);
  if (!userId || !id) return null;
  const textOriginal = normalizeOptionalString(doc.textOriginal) ?? null;
  const textPrepared = normalizeOptionalString(doc.textPrepared) ?? null;
  const locale = normalizeOptionalString(doc.locale) ?? null;
  return {
    id,
    userId,
    text: typeof doc.text === "string" ? doc.text : "",
    textOriginal,
    textPrepared,
    evidenceInput: normalizeOptionalString(doc.evidenceInput) ?? null,
    locale,
    source: normalizeOptionalString(doc.source) ?? null,
    createMode:
      (normalizeOptionalString(doc.createMode) as CreateMode | null | undefined) ?? null,
    anlassraumId: normalizeOptionalString(doc.anlassraumId) ?? null,
    authorName: normalizeOptionalString(doc.authorName) ?? null,
    useCase:
      (normalizeOptionalString(doc.useCase) as DraftUseCase | null | undefined) ?? null,
    analysis: doc.analysis ?? null,
    status: doc.status === "finalized" ? "finalized" : "draft",
    createdAt: asDateOrNull(doc.createdAt),
    updatedAt: asDateOrNull(doc.updatedAt),
    finalizedAt: asDateOrNull(doc.finalizedAt),
    proposalIds: Array.isArray(doc.proposalIds)
      ? doc.proposalIds.map((value) => String(value))
      : [],
    storage: "contribution_drafts_legacy",
    missingFields: buildMissingFields({
      textOriginal,
      textPrepared,
      locale,
      analysis: doc.analysis,
    }),
  };
}

export function buildCanonicalCreateDraftIdempotencyKey(input: {
  userId?: string | null;
  source?: string | null;
  text: string;
  textOriginal?: string | null;
  textPrepared?: string | null;
  evidenceInput?: string | null;
  locale?: string | null;
  createMode?: CreateMode | null;
  anlassraumId?: string | null;
  authorName?: string | null;
  useCase?: DraftUseCase | null;
  packageId?: string | null;
  sourceUrls?: string[];
  uploadIds?: string[];
  materialItems?: unknown[];
  analysis?: unknown;
  manualReviewRequested?: boolean;
}) {
  return stableHash({
    kind: CANONICAL_CREATE_DRAFT_KIND,
    userId: normalizeOptionalString(input.userId) ?? null,
    source: normalizeOptionalString(input.source) ?? null,
    text: input.text.trim(),
    textOriginal: normalizeOptionalString(input.textOriginal) ?? null,
    textPrepared: normalizeOptionalString(input.textPrepared) ?? null,
    evidenceInput: normalizeOptionalString(input.evidenceInput) ?? null,
    locale: normalizeOptionalString(input.locale) ?? null,
    createMode: normalizeOptionalString(input.createMode) ?? null,
    anlassraumId: normalizeOptionalString(input.anlassraumId) ?? null,
    authorName: normalizeOptionalString(input.authorName) ?? null,
    useCase: normalizeOptionalString(input.useCase) ?? null,
    packageId: normalizeOptionalString(input.packageId) ?? null,
    sourceUrls: Array.isArray(input.sourceUrls)
      ? input.sourceUrls.map((value) => String(value).trim()).filter(Boolean).sort()
      : [],
    uploadIds: Array.isArray(input.uploadIds)
      ? input.uploadIds.map((value) => String(value).trim()).filter(Boolean).sort()
      : [],
    materialItems: Array.isArray(input.materialItems)
      ? input.materialItems.map((value) => stableHash(value)).sort()
      : [],
    analysis: input.analysis ?? null,
    manualReviewRequested: input.manualReviewRequested === true,
  });
}

function buildDraftPayloadHash(input: SaveUserScopedServerDraftInput) {
  return stableHash({
    kind: input.kind,
    status: input.status ?? "draft",
    locale: normalizeOptionalString(input.locale) ?? null,
    source: normalizeOptionalString(input.source) ?? null,
    text: String(input.text).trim(),
    textOriginal: normalizeOptionalString(input.textOriginal) ?? null,
    textPrepared: normalizeOptionalString(input.textPrepared) ?? null,
    evidenceInput: normalizeOptionalString(input.evidenceInput) ?? null,
    createMode: normalizeOptionalString(input.createMode) ?? null,
    anlassraumId: normalizeOptionalString(input.anlassraumId) ?? null,
    authorName: normalizeOptionalString(input.authorName) ?? null,
    useCase: normalizeOptionalString(input.useCase) ?? null,
    packageId: normalizeOptionalString(input.packageId) ?? null,
  });
}

function readRuntimeMetadata(analysis: unknown) {
  if (!analysis || typeof analysis !== "object" || Array.isArray(analysis)) return null;
  const runtime = (analysis as DraftAnalysisRecord).draftWriteRuntime;
  if (!runtime || typeof runtime !== "object" || Array.isArray(runtime)) return null;
  return runtime as DraftWriteRuntime;
}

function buildDeterministicDraftObjectId(input: {
  userId: string;
  kind: DraftKind;
  idempotencyKey: string;
}) {
  return new ObjectId(
    stableHash({
      scope: "canonical_server_draft",
      userId: input.userId,
      kind: input.kind,
      idempotencyKey: input.idempotencyKey,
    }).slice(0, 24),
  );
}

export async function saveUserScopedServerDraft(
  input: SaveUserScopedServerDraftInput,
): Promise<SaveUserScopedServerDraftResult> {
  const Drafts = await coreCol<CanonicalServerDraftDoc>(CANONICAL_SERVER_DRAFTS_COLLECTION);
  const now = new Date();
  const normalizedDraftId = String(input.draftId ?? "").trim();
  const normalizedPackageId = normalizeOptionalString(input.packageId) ?? null;
  const normalizedIdempotencyKey = normalizeOptionalString(input.idempotencyKey) ?? null;
  const payloadHash = buildDraftPayloadHash(input);

  let existing: CanonicalServerDraftDoc | null = null;
  if (normalizedDraftId) {
    if (!ObjectId.isValid(normalizedDraftId)) {
      return { ok: false, error: "invalid_draft_id" };
    }
    existing = await Drafts.findOne({
      _id: new ObjectId(normalizedDraftId),
      userId: input.userId,
    } as any);
    if (!existing) {
      return { ok: false, error: "draft_not_found" };
    }
    if (existing.status === "finalized") {
      return { ok: false, error: "draft_finalized" };
    }
  } else if (normalizedPackageId) {
    existing = await Drafts.findOne({
      userId: input.userId,
      status: "draft",
      "analysis.createContributionLedger.packageId": normalizedPackageId,
    } as any);
  }

  if (!existing && normalizedIdempotencyKey) {
    const filter: Record<string, unknown> = {
      userId: input.userId,
      status: "draft",
      "analysis.draftWriteRuntime.kind": input.kind,
      "analysis.draftWriteRuntime.idempotencyKey": normalizedIdempotencyKey,
    };
    if (input.source !== undefined) {
      filter.source = input.source;
    }
    existing = await Drafts.findOne(filter as any);
  }

  const analysisWithRuntime = buildDraftWriteRuntime({
    analysis: input.analysis === undefined ? existing?.analysis : input.analysis,
    route: input.route,
    kind: input.kind,
    packageId: normalizedPackageId,
    idempotencyKey: normalizedIdempotencyKey,
    payloadHash,
  });

  const updateSet: Record<string, unknown> = {
    userId: input.userId,
    text: input.text,
    analysis: analysisWithRuntime,
    status: input.status ?? existing?.status ?? "draft",
    updatedAt: now,
  };
  maybeAssign(updateSet, "locale", input.locale);
  maybeAssign(updateSet, "source", input.source);
  maybeAssign(updateSet, "textOriginal", input.textOriginal);
  maybeAssign(updateSet, "textPrepared", input.textPrepared);
  maybeAssign(updateSet, "evidenceInput", input.evidenceInput);
  maybeAssign(updateSet, "createMode", input.createMode);
  maybeAssign(updateSet, "anlassraumId", input.anlassraumId);
  maybeAssign(updateSet, "authorName", input.authorName);
  maybeAssign(updateSet, "useCase", input.useCase);

  if (existing) {
    if (!normalizedDraftId) {
      const existingPayloadHash = readRuntimeMetadata(existing.analysis)?.payloadHash ?? null;
      if (existingPayloadHash && existingPayloadHash !== payloadHash) {
        return { ok: false, error: "idempotency_conflict" };
      }
    }
    await Drafts.updateOne(
      { _id: existing._id, userId: input.userId } as any,
      { $set: updateSet as any },
    );
    return {
      ok: true,
      draftId: toDraftId(existing._id),
      createdAt: asDateOrNull(existing.createdAt) ?? now,
      updatedAt: now,
      createdNew: false,
    };
  }

  const _id = normalizedIdempotencyKey
    ? buildDeterministicDraftObjectId({
        userId: input.userId,
        kind: input.kind,
        idempotencyKey: normalizedIdempotencyKey,
      })
    : new ObjectId();
  const doc: CanonicalServerDraftDoc = {
    _id,
    userId: input.userId,
    text: input.text,
    analysis: analysisWithRuntime,
    status: input.status ?? "draft",
    createdAt: now,
    updatedAt: now,
  };
  maybeAssign(doc as Record<string, unknown>, "locale", input.locale);
  maybeAssign(doc as Record<string, unknown>, "source", input.source);
  maybeAssign(doc as Record<string, unknown>, "textOriginal", input.textOriginal);
  maybeAssign(doc as Record<string, unknown>, "textPrepared", input.textPrepared);
  maybeAssign(doc as Record<string, unknown>, "evidenceInput", input.evidenceInput);
  maybeAssign(doc as Record<string, unknown>, "createMode", input.createMode);
  maybeAssign(doc as Record<string, unknown>, "anlassraumId", input.anlassraumId);
  maybeAssign(doc as Record<string, unknown>, "authorName", input.authorName);
  maybeAssign(doc as Record<string, unknown>, "useCase", input.useCase);

  try {
    await Drafts.insertOne(doc as any);
  } catch (error: any) {
    if (error?.code !== 11000) throw error;
    const duplicate = await Drafts.findOne({ _id, userId: input.userId } as any);
    if (!duplicate) throw error;
    if (duplicate.status === "finalized") {
      return { ok: false, error: "draft_finalized" };
    }
    const duplicatePayloadHash = readRuntimeMetadata(duplicate.analysis)?.payloadHash ?? null;
    if (duplicatePayloadHash && duplicatePayloadHash !== payloadHash) {
      return { ok: false, error: "idempotency_conflict" };
    }
    await Drafts.updateOne(
      { _id: duplicate._id, userId: input.userId } as any,
      { $set: updateSet as any },
    );
    return {
      ok: true,
      draftId: toDraftId(duplicate._id),
      createdAt: asDateOrNull(duplicate.createdAt) ?? now,
      updatedAt: now,
      createdNew: false,
    };
  }
  return {
    ok: true,
    draftId: _id.toHexString(),
    createdAt: now,
    updatedAt: now,
    createdNew: true,
  };
}


export type CreateDraftSourceEvidenceUpsertResult =
  | {
      ok: true;
      sourceKey: string;
      artifact: SourceArtifact;
    }
  | {
      ok: false;
      error:
        | "invalid_draft_id"
        | "draft_not_found"
        | "draft_finalized"
        | "invalid_source_reference"
        | "invalid_content_hash";
    };

export async function upsertCreateDraftSourceEvidence(input: {
  draftId: string;
  userId: string;
  canonicalRef: string;
  contentHash: string;
  originalLocale?: string | null;
  accessedAt?: Date;
}): Promise<CreateDraftSourceEvidenceUpsertResult> {
  const draftId = String(input.draftId ?? "").trim();
  if (!ObjectId.isValid(draftId)) {
    return { ok: false, error: "invalid_draft_id" };
  }

  let sourceUrl: URL;
  try {
    sourceUrl = new URL(String(input.canonicalRef ?? "").trim());
  } catch {
    return { ok: false, error: "invalid_source_reference" };
  }
  if (sourceUrl.protocol !== "http:" && sourceUrl.protocol !== "https:") {
    return { ok: false, error: "invalid_source_reference" };
  }

  const contentHash = String(input.contentHash ?? "").trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(contentHash)) {
    return { ok: false, error: "invalid_content_hash" };
  }

  const Drafts = await coreCol<CanonicalServerDraftDoc>(
    CANONICAL_SERVER_DRAFTS_COLLECTION,
  );
  const _id = new ObjectId(draftId);
  const existing = await Drafts.findOne({ _id, userId: input.userId } as any);
  if (!existing) return { ok: false, error: "draft_not_found" };
  if (existing.status === "finalized") {
    return { ok: false, error: "draft_finalized" };
  }

  const canonicalRef = sourceUrl.href;
  const sourceKey = stableHash({
    scope: "create_source_evidence",
    canonicalRef,
  }).slice(0, 40);
  const accessedAt = input.accessedAt ?? new Date();
  const artifact: SourceArtifact = {
    id: \`create-source-\${sourceKey}\`,
    canonicalRef,
    sourceType: "user_provided_material",
    publisherOrAuthor: null,
    publishedAt: null,
    accessedAt: accessedAt.toISOString(),
    originalLocale: String(input.originalLocale ?? "").trim().slice(0, 16) || "und",
    sourceFamilyId: \`create-source-family-\${sourceKey}\`,
    contentHashOrRevision: contentHash,
    lineageStatus: "copy",
    rightsStatus: "unknown",
    retentionStatus: "limited",
    accessStatus: "public",
  };

  const evidencePath = \`analysis.createSourceEvidence.items.\${sourceKey}\`;
  const updateResult = await Drafts.updateOne(
    { _id, userId: input.userId, status: "draft" } as any,
    {
      $set: {
        "analysis.createSourceEvidence.schemaVersion": "create_source_evidence.v1",
        "analysis.createSourceEvidence.reviewFirstOnly": true,
        "analysis.createSourceEvidence.noAutoPublish": true,
        "analysis.createSourceEvidence.noSilentMerge": true,
        [evidencePath]: {
          sourceKey,
          artifact,
          verificationStatus: "not_checked",
          analysisReference: {
            sourceArtifactId: artifact.id,
            canonicalRef,
            contentHash,
          },
        },
        updatedAt: accessedAt,
      },
    } as any,
  );
  if (updateResult.matchedCount !== 1) {
    return { ok: false, error: "draft_not_found" };
  }
  return { ok: true, sourceKey, artifact };
}

export async function getCreateContributionDraftForResumeRecord(
  draftId: string,
  userId: string,
) {
  if (!ObjectId.isValid(draftId)) return null;
  const Drafts = await coreCol<CanonicalServerDraftDoc>(CANONICAL_SERVER_DRAFTS_COLLECTION);
  const canonical = normalizeCanonicalCreateDraft(
    await Drafts.findOne({ _id: new ObjectId(draftId), userId } as any),
  );
  if (canonical) return canonical;

  const LegacyDrafts = await getCol<LegacyCreateContributionDraftDoc>(
    LEGACY_CREATE_CONTRIBUTION_DRAFTS_COLLECTION,
  );
  return normalizeLegacyCreateDraft(
    await LegacyDrafts.findOne({ _id: new ObjectId(draftId), authorId: userId } as any),
  );
}

export async function readCreateContributionDraftById(draftId: string) {
  if (!ObjectId.isValid(draftId)) return null;
  const Drafts = await coreCol<CanonicalServerDraftDoc>(CANONICAL_SERVER_DRAFTS_COLLECTION);
  const canonical = normalizeCanonicalCreateDraft(
    await Drafts.findOne({ _id: new ObjectId(draftId) } as any),
  );
  if (canonical) return canonical;

  const LegacyDrafts = await getCol<LegacyCreateContributionDraftDoc>(
    LEGACY_CREATE_CONTRIBUTION_DRAFTS_COLLECTION,
  );
  return normalizeLegacyCreateDraft(
    await LegacyDrafts.findOne({ _id: new ObjectId(draftId) } as any),
  );
}

export async function updateStoredCreateContributionDraft(
  draft: NormalizedCreateContributionDraft,
  patch: UpdateStoredCreateContributionDraftPatch,
) {
  if (!ObjectId.isValid(draft.id)) {
    throw new Error("invalid_draft");
  }

  const now = patch.updatedAt ?? new Date();
  const updateSet: Record<string, unknown> = {
    updatedAt: now,
  };
  maybeAssign(updateSet, "status", patch.status);
  maybeAssign(updateSet, "finalizedAt", patch.finalizedAt);
  maybeAssign(updateSet, "proposalIds", patch.proposalIds);
  maybeAssign(updateSet, "createMode", patch.createMode);
  maybeAssign(updateSet, "anlassraumId", patch.anlassraumId);

  if (draft.storage === "drafts") {
    const Drafts = await coreCol<CanonicalServerDraftDoc>(CANONICAL_SERVER_DRAFTS_COLLECTION);
    await Drafts.updateOne(
      { _id: new ObjectId(draft.id), userId: draft.userId } as any,
      { $set: updateSet as any },
    );
    return;
  }
  throw new Error("legacy_draft_read_only");
}
