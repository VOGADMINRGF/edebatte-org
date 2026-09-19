import "server-only";

import { coreCol, ObjectId } from "@core/db/triMongo";
import { stableHash } from "@core/utils/hash";
import type { SourceArtifact } from "@features/analyze/atomicClaimSourceRelationContract";
import {
  CANONICAL_SERVER_DRAFTS_COLLECTION,
  type CanonicalServerDraftDoc,
} from "@/server/serverDrafts";

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
    id: `create-source-${sourceKey}`,
    canonicalRef,
    sourceType: "user_provided_material",
    publisherOrAuthor: null,
    publishedAt: null,
    accessedAt: accessedAt.toISOString(),
    originalLocale: String(input.originalLocale ?? "").trim().slice(0, 16) || "und",
    sourceFamilyId: `create-source-family-${sourceKey}`,
    contentHashOrRevision: contentHash,
    lineageStatus: "copy",
    rightsStatus: "unknown",
    retentionStatus: "limited",
    accessStatus: "public",
  };

  const evidencePath = `analysis.createSourceEvidence.items.${sourceKey}`;
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
