import { ObjectId } from "@core/db/triMongo";
import { evidenceClaimsCol } from "@core/evidence/db";
import { upsertEvidenceDecision } from "@features/evidence/syncFromVotes";
import { VoteModel } from "@/models/votes/Vote";
import type { VoteDraftDoc, FeedStatementDoc, StatementCandidate } from "./types";
import {
  voteDraftsCol,
  statementCandidatesCol,
  analyzeResultsCol,
  feedStatementsCol,
} from "./db";

const ALLOWED_PUBLISH_STATUS: VoteDraftDoc["status"][] = ["draft", "review"];

export async function publishVoteDraft(draftId: string) {
  let objectId: ObjectId;
  try {
    objectId = new ObjectId(draftId);
  } catch {
    return { ok: false as const, error: "invalid_id" };
  }

  const drafts = await voteDraftsCol();
  const draft = await drafts.findOne({ _id: objectId });
  if (!draft) {
    return { ok: false as const, error: "draft_not_found" };
  }
  if (draft.status === "published") {
    return { ok: false as const, error: "already_published" };
  }
  if (!ALLOWED_PUBLISH_STATUS.includes(draft.status)) {
    return { ok: false as const, error: "status_not_publishable" };
  }

  const candidates = await statementCandidatesCol();
  const candidate = await candidates.findOne({
    _id: draft.statementCandidateId,
  });
  if (!candidate) {
    return { ok: false as const, error: "candidate_not_found" };
  }

  const analyzeCol = await analyzeResultsCol();
  const analyzeResult = await analyzeCol.findOne({ _id: draft.analyzeResultId });
  if (!analyzeResult) {
    return { ok: false as const, error: "analyze_result_not_found" };
  }

  const feedStatements = await feedStatementsCol();
  const now = new Date();
  const statementDoc: FeedStatementDoc = {
    voteDraftId: draft._id!,
    statementCandidateId: draft.statementCandidateId,
    title: draft.title,
    summary: draft.summary ?? null,
    claims: draft.claims ?? analyzeResult.claims,
    regionCode: draft.regionCode ?? candidate.regionCode ?? null,
    sourceUrl: draft.sourceUrl ?? candidate.sourceUrl ?? null,
    sourceLocale: draft.sourceLocale ?? candidate.sourceLocale ?? analyzeResult.language,
    pipeline: draft.pipeline ?? "feeds_to_statementCandidate",
    status: "readyForLive",
    createdAt: now,
    updatedAt: now,
  };

  const insert = await feedStatements.insertOne(statementDoc);
  await syncDecisionFromDraft({
    draft,
    candidate,
    statementId: insert.insertedId,
    statementDoc,
  });
  await drafts.updateOne(
    { _id: draft._id },
    {
      $set: {
        status: "published",
        publishedAt: now,
        updatedAt: now,
      },
    },
  );

  return { ok: true as const, statementId: insert.insertedId.toHexString() };
}

async function syncDecisionFromDraft({
  draft,
  candidate,
  statementId,
  statementDoc,
}: {
  draft: VoteDraftDoc;
  candidate: StatementCandidate;
  statementId: ObjectId;
  statementDoc: FeedStatementDoc;
}) {
  const claimsCol = await evidenceClaimsCol();
  const claim = await claimsCol.findOne(
    { "sourceRef.statementId": candidate.id },
    { sort: { createdAt: 1 } },
  );
  if (!claim) return;

  const voteTotals = await aggregateVotes([candidate.id, statementId]);
  const totalVotes = voteTotals.yes + voteTotals.no + voteTotals.abstain;
  if (totalVotes === 0) return;

  await upsertEvidenceDecision({
    claimId: claim._id,
    regionCode: statementDoc.regionCode ? String(statementDoc.regionCode) : null,
    locale:
      statementDoc.sourceLocale ??
      candidate.sourceLocale ??
      draft.sourceLocale ??
      candidate.analyzeLocale ??
      "de",
    yes: voteTotals.yes,
    no: voteTotals.no,
    abstain: voteTotals.abstain,
    quorumReached: totalVotes > 0,
    majorityKind: "simple",
    decidedAt: candidate.publishedAt ? new Date(candidate.publishedAt) : new Date(),
    pipeline: draft.pipeline ?? "feeds_to_statementCandidate",
    voteDraftId: draft._id,
    statementId: statementId,
  });
}

async function aggregateVotes(keys: Array<string | ObjectId>): Promise<{
  yes: number;
  no: number;
  abstain: number;
}> {
  const normalizedKeys = buildStatementFilters(keys);
  if (!normalizedKeys.length) return { yes: 0, no: 0, abstain: 0 };

  const Vote = await VoteModel();
  const cursor = Vote.find(
    { $or: normalizedKeys } as any,
    { projection: { choice: 1, vote: 1, value: 1 } },
  );
  let yes = 0;
  let no = 0;
  let abstain = 0;
  for await (const doc of cursor) {
    const choice = normalizeChoice(doc.choice ?? doc.vote ?? doc.value);
    if (choice === "yes") yes += 1;
    else if (choice === "no") no += 1;
    else abstain += 1;
  }
  return { yes, no, abstain };
}

function buildStatementFilters(keys: Array<string | ObjectId>) {
  const filters: Array<Record<string, any>> = [];
  const seen = new Set<string>();
  for (const key of keys) {
    if (!key) continue;
    if (typeof key === "string") {
      if (!seen.has(key)) {
        filters.push({ statementId: key });
        seen.add(key);
      }
      if (ObjectId.isValid(key)) {
        const hex = new ObjectId(key);
        const idStr = hex.toHexString();
        if (!seen.has(idStr)) {
          filters.push({ statementId: hex });
          seen.add(idStr);
        }
      }
    } else if (key instanceof ObjectId) {
      const hex = key.toHexString();
      if (!seen.has(hex)) {
        filters.push({ statementId: key });
        seen.add(hex);
      }
      if (!seen.has(hex + ":str")) {
        filters.push({ statementId: hex });
        seen.add(hex + ":str");
      }
    }
  }
  return filters;
}

function normalizeChoice(value: any): "yes" | "no" | "neutral" {
  const val = String(value ?? "").toLowerCase();
  if (["yes", "agree", "pro", "for"].includes(val)) return "yes";
  if (["no", "disagree", "contra", "against"].includes(val)) return "no";
  return "neutral";
}
