import { ObjectId } from "@core/db/triMongo";
import { voteDraftsCol, feedStatementsCol } from "@features/feeds/db";
import type { VoteDraftDoc } from "@features/feeds/types";
import { ensureUserMeetsVerificationLevel } from "@features/auth/verificationAccess";

export interface PublicVoteSummary {
  id: string;
  title: string;
  summary?: string | null;
  claims: VoteDraftDoc["claims"];
  claimCount?: number;
  status: VoteDraftDoc["status"];
  pipeline: string;
  regionCode?: string | null;
  regionLabel?: string | null;
  sourceUrl?: string | null;
  createdAt: string;
}

export async function listPublicVotes({
  limit = 20,
  includeDraft = false,
  userId,
}: {
  limit?: number;
  includeDraft?: boolean;
  userId?: string | null;
}): Promise<{ items: PublicVoteSummary[] }> {
  const drafts = await voteDraftsCol();
  const match: Record<string, any> = { status: "published" };
  if (includeDraft) {
    match.status = { $in: ["published", "review", "draft"] };
  }
  const rows = await drafts
    .find(match)
    .sort({ publishedAt: -1, createdAt: -1 })
    .limit(Math.min(limit, 100))
    .toArray();
  const items: PublicVoteSummary[] = rows.map((row) => ({
    id: row._id!.toHexString(),
    title: row.title,
    summary: row.summary ?? null,
    claims: row.claims ?? [],
    claimCount: row.claims?.length ?? 0,
    status: row.status,
    pipeline: row.pipeline ?? "feeds_to_statementCandidate",
    regionCode: row.regionCode ?? null,
    regionLabel: row.regionCode ?? null,
    sourceUrl: row.sourceUrl ?? null,
    createdAt: row.publishedAt?.toISOString() ?? row.createdAt.toISOString(),
  }));
  return { items };
}

export interface PublicVoteDetail {
  id: string;
  title: string;
  summary?: string | null;
  claims: VoteDraftDoc["claims"];
  pipeline: string;
  status: VoteDraftDoc["status"];
  regionCode?: string | null;
  sourceUrl?: string | null;
  statementId?: string | null;
  createdAt: string;
  publishedAt?: string | null;
}

export async function getPublicVoteDetail(id: string, userId?: string | null) {
  const result = await ensureUserMeetsVerificationLevel(userId ?? null, "email");
  if (!result.ok) {
    return { ok: false as const, error: result.error, level: result.level };
  }
  const objectId = new ObjectId(id);
  const drafts = await voteDraftsCol();
  const draft = await drafts.findOne({ _id: objectId });
  if (!draft) {
    return { ok: false as const, error: "not_found" };
  }
  const feedStatements = await feedStatementsCol();
  const feedStatement = await feedStatements.findOne({ voteDraftId: objectId });
  return {
    ok: true as const,
    vote: {
      id,
      title: draft.title,
      summary: draft.summary ?? null,
      claims: draft.claims,
      status: draft.status,
      pipeline: draft.pipeline,
      regionCode: draft.regionCode ?? null,
      sourceUrl: draft.sourceUrl ?? null,
      statementId: feedStatement?._id?.toHexString() ?? null,
      createdAt: draft.createdAt.toISOString(),
      publishedAt: draft.publishedAt ? draft.publishedAt.toISOString() : null,
    },
  };
}
