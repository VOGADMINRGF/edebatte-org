import "server-only";

import { coreCol, ObjectId } from "@core/db/triMongo";
import { stableHash } from "@core/utils/hash";
import type { CreateIntelligentFollowupResult } from "@/features/create/intelligentFollowupContract";
import {
  CANONICAL_SERVER_DRAFTS_COLLECTION,
  type CanonicalServerDraftDoc,
} from "@/server/serverDrafts";

export type CanonicalCreateHandoffSourceEvidenceRef = {
  sourceArtifactId: string;
  contentHash: string;
  verificationStatus: string;
};

export type CanonicalCreateHandoffDraftBinding = {
  draftId: string;
  userId: string;
  locale: string | null;
  anlassraumId: string | null;
  payloadHash: string;
  bindingHash: string;
  createdAt: string;
  updatedAt: string;
  followup: CreateIntelligentFollowupResult;
  sourceEvidenceRefs: CanonicalCreateHandoffSourceEvidenceRef[];
};

export type ResolveCanonicalCreateHandoffDraftBindingResult =
  | { ok: true; binding: CanonicalCreateHandoffDraftBinding }
  | {
      ok: false;
      error:
        | "invalid_draft_id"
        | "draft_not_found"
        | "draft_binding_ambiguous"
        | "draft_not_open"
        | "draft_text_mismatch"
        | "draft_runtime_binding_missing"
        | "draft_followup_missing";
    };

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalized(value: unknown): string {
  return String(value ?? "").trim();
}

function dateIso(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  const parsed = new Date(String(value ?? ""));
  return Number.isNaN(parsed.getTime()) ? new Date(0).toISOString() : parsed.toISOString();
}

function toDraftId(value: unknown): string {
  if (value instanceof ObjectId) return value.toHexString();
  if (
    value &&
    typeof value === "object" &&
    typeof (value as { toHexString?: unknown }).toHexString === "function"
  ) {
    return (value as { toHexString: () => string }).toHexString();
  }
  return normalized(value);
}

function storedTexts(doc: CanonicalServerDraftDoc): string[] {
  return [doc.text, doc.textOriginal, doc.textPrepared]
    .map(normalized)
    .filter(Boolean);
}

function readPayloadHash(analysis: unknown): string | null {
  const analysisRecord = record(analysis);
  const runtime = record(analysisRecord?.draftWriteRuntime);
  const hash = normalized(runtime?.payloadHash);
  return hash || null;
}

function readFollowup(analysis: unknown): CreateIntelligentFollowupResult | null {
  const analysisRecord = record(analysis);
  const value = record(analysisRecord?.intelligentFollowup);
  if (!value) return null;
  const sourceText = normalized(value.sourceText);
  const understanding = record(value.understanding);
  const meta = record(value.meta);
  if (!sourceText || !understanding || !record(meta?.planner) || !record(meta?.graphMatch)) {
    return null;
  }
  return value as unknown as CreateIntelligentFollowupResult;
}

function readSourceEvidenceRefs(
  analysis: unknown,
): CanonicalCreateHandoffSourceEvidenceRef[] {
  const analysisRecord = record(analysis);
  const evidence = record(analysisRecord?.createSourceEvidence);
  const items = record(evidence?.items);
  if (!items) return [];
  const refs: CanonicalCreateHandoffSourceEvidenceRef[] = [];
  for (const itemValue of Object.values(items)) {
    const item = record(itemValue);
    const analysisReference = record(item?.analysisReference);
    const sourceArtifactId = normalized(analysisReference?.sourceArtifactId);
    const contentHash = normalized(analysisReference?.contentHash).toLowerCase();
    const verificationStatus = normalized(item?.verificationStatus) || "not_checked";
    if (!sourceArtifactId || !/^[a-f0-9]{64}$/.test(contentHash)) continue;
    refs.push({ sourceArtifactId, contentHash, verificationStatus: verificationStatus.slice(0, 80) });
  }
  return refs
    .sort((left, right) => left.sourceArtifactId.localeCompare(right.sourceArtifactId))
    .slice(0, 20);
}

async function resolveDraftDoc(input: {
  userId: string;
  requestedDraftId?: string | null;
  sourceText: string;
}): Promise<CanonicalServerDraftDoc | "ambiguous" | null> {
  const Drafts = await coreCol<CanonicalServerDraftDoc>(CANONICAL_SERVER_DRAFTS_COLLECTION);
  const requestedDraftId = normalized(input.requestedDraftId);
  if (requestedDraftId) {
    if (!ObjectId.isValid(requestedDraftId)) return null;
    return Drafts.findOne({
      _id: new ObjectId(requestedDraftId),
      userId: input.userId,
    } as any);
  }

  const sourceText = normalized(input.sourceText);
  if (!sourceText) return null;
  const candidates = await Drafts.find({
    userId: input.userId,
    status: "draft",
    $or: [
      { text: sourceText },
      { textOriginal: sourceText },
      { textPrepared: sourceText },
    ],
  } as any)
    .sort({ updatedAt: -1, _id: 1 })
    .limit(2)
    .toArray();
  if (candidates.length > 1) return "ambiguous";
  return candidates[0] ?? null;
}

export async function resolveCanonicalCreateHandoffDraftBinding(input: {
  userId: string;
  requestedDraftId?: string | null;
  sourceText: string;
}): Promise<ResolveCanonicalCreateHandoffDraftBindingResult> {
  const requestedDraftId = normalized(input.requestedDraftId);
  if (requestedDraftId && !ObjectId.isValid(requestedDraftId)) {
    return { ok: false, error: "invalid_draft_id" };
  }
  const doc = await resolveDraftDoc(input);
  if (doc === "ambiguous") return { ok: false, error: "draft_binding_ambiguous" };
  if (!doc) return { ok: false, error: "draft_not_found" };
  if (doc.status !== "draft") return { ok: false, error: "draft_not_open" };

  const sourceText = normalized(input.sourceText);
  if (!sourceText || !storedTexts(doc).includes(sourceText)) {
    return { ok: false, error: "draft_text_mismatch" };
  }
  const payloadHash = readPayloadHash(doc.analysis);
  if (!payloadHash) return { ok: false, error: "draft_runtime_binding_missing" };
  const followup = readFollowup(doc.analysis);
  if (!followup || normalized(followup.sourceText) !== sourceText) {
    return { ok: false, error: "draft_followup_missing" };
  }

  const draftId = toDraftId(doc._id);
  const createdAt = dateIso(doc.createdAt);
  const updatedAt = dateIso(doc.updatedAt);
  const locale = normalized(doc.locale) || null;
  const anlassraumId = normalized(doc.anlassraumId) || null;
  const sourceEvidenceRefs = readSourceEvidenceRefs(doc.analysis);
  return {
    ok: true,
    binding: {
      draftId,
      userId: input.userId,
      locale,
      anlassraumId,
      payloadHash,
      bindingHash: stableHash({
        scope: "create_c9_handoff_binding",
        userId: input.userId,
        draftId,
        payloadHash,
        updatedAt,
        sourceEvidenceRefs,
      }),
      createdAt,
      updatedAt,
      followup,
      sourceEvidenceRefs,
    },
  };
}
