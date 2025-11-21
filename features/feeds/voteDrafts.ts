import { ObjectId } from "@core/db/triMongo";
import type {
  StatementCandidate,
  StatementCandidateAnalyzeResultDoc,
  VoteDraftDoc,
} from "./types";
import { voteDraftsCol } from "./db";

export async function createDraftFromAnalyzeResult(
  candidate: StatementCandidate,
  analyzeResult: StatementCandidateAnalyzeResultDoc,
): Promise<ObjectId> {
  if (!candidate._id) {
    throw new Error("createDraftFromAnalyzeResult: candidate hat keine _id");
  }
  if (!analyzeResult._id) {
    throw new Error("createDraftFromAnalyzeResult: analyzeResult hat keine _id");
  }

  const col = await voteDraftsCol();
  const existing = await col.findOne({
    statementCandidateId: candidate._id,
  });
  if (existing?._id) {
    return existing._id;
  }

  const claims = (analyzeResult.claims ?? []).slice(0, 3);
  const title =
    (claims[0]?.title && claims[0].title.trim()) ||
    claims[0]?.text?.slice(0, 140) ||
    candidate.sourceTitle ||
    "Neues Statement";
  const summary =
    candidate.sourceSummary ??
    analyzeResult.notes?.[0]?.text ??
    candidate.sourceContent?.slice(0, 240) ??
    null;

  const doc: VoteDraftDoc = {
    statementCandidateId: candidate._id,
    analyzeResultId: analyzeResult._id,
    createdAt: new Date(),
    updatedAt: new Date(),
    status: "draft",
    analyzeCompletedAt: candidate.analyzeCompletedAt ?? null,
    title,
    summary,
    claims,
    pipeline: "feeds_to_statementCandidate",
    sourceUrl: candidate.sourceUrl,
    sourceLocale: candidate.sourceLocale ?? analyzeResult.language,
    regionCode: candidate.regionCode ?? null,
    tags: candidate.topic ? [candidate.topic] : [],
    createdBy: "system",
  };

  const insert = await col.insertOne(doc);
  return insert.insertedId;
}
