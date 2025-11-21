import type { WithId } from "mongodb";
import { ObjectId } from "@core/db/triMongo";
import { analyzeContribution } from "@features/analyze/analyzeContribution";
import { syncAnalyzeResultToEvidenceGraph } from "@features/evidence/syncFromAnalyze";
import { syncNewsEvidenceForCandidate } from "@features/evidence/syncNewsEvidence";
import type {
  AnalyzeStatus,
  StatementCandidate,
  StatementCandidateAnalyzeResultDoc,
} from "./types";
import { createDraftFromAnalyzeResult } from "./voteDrafts";
import { analyzeResultsCol, statementCandidatesCol } from "./db";

type CandidateDoc = WithId<StatementCandidate>;

export async function analyzePendingStatementCandidates(opts: {
  limit?: number;
  timeoutMs?: number;
} = {}): Promise<{ analyzed: number; errors: number }> {
  const { limit = 10, timeoutMs = 30_000 } = opts;
  const candidateCol = await statementCandidatesCol();
  const resultCol = await analyzeResultsCol();

  let analyzed = 0;
  let errors = 0;
  const started = Date.now();

  while (analyzed + errors < limit) {
    if (Date.now() - started > timeoutMs) break;

    const claimed = await candidateCol.findOneAndUpdate(
      { analyzeStatus: "pending" as AnalyzeStatus },
      {
        $set: {
          analyzeStatus: "processing" as AnalyzeStatus,
          analyzeStartedAt: new Date(),
          analyzeError: null,
        },
      },
      {
        sort: { analyzeRequestedAt: 1, createdAt: 1 },
        returnDocument: "after",
      },
    );

    const candidate = claimed.value as CandidateDoc | null;
    if (!candidate) break;

    try {
      const locale = determineLocale(candidate);
      const text = extractSourceText(candidate);
      if (!text) {
        throw new Error("Kein Text für Analyse vorhanden");
      }

      const analyzeResult = await analyzeContribution({
        text,
        locale,
        pipeline: "feeds_to_statementCandidate",
      });

      const resultDoc: StatementCandidateAnalyzeResultDoc = {
        statementCandidateId: candidate._id,
        mode: analyzeResult.mode,
        sourceText: analyzeResult.sourceText,
        language: analyzeResult.language,
        claims: analyzeResult.claims,
        notes: analyzeResult.notes,
        questions: analyzeResult.questions,
        knots: analyzeResult.knots,
        pipelineMeta: analyzeResult._meta ?? {
          pipeline: "feeds_to_statementCandidate",
        },
        createdAt: new Date(),
      };

      const insertResult = await resultCol.insertOne(resultDoc);
      const analyzeResultId = insertResult.insertedId;

      await candidateCol.updateOne(
        { _id: candidate._id },
        {
          $set: {
            analyzeStatus: "success" as AnalyzeStatus,
            analyzeCompletedAt: new Date(),
            analyzeLocale: locale,
            analyzeResultId,
            analyzeError: null,
          },
        },
      );

      const syncedClaims = await syncAnalyzeResultToEvidenceGraph(analyzeResult, {
        sourceType: "feed",
        sourceRef: {
          statementId: candidate.id,
        },
        regionCode: candidate.regionCode ? String(candidate.regionCode) : undefined,
        locale,
        pipeline: "feeds_to_statementCandidate",
      });

      if (candidate.sourceType === "news_article" || candidate.sourceName) {
        await syncNewsEvidenceForCandidate({ candidate, claims: syncedClaims });
      }

      await createDraftFromAnalyzeResult(candidate, {
        ...resultDoc,
        _id: analyzeResultId,
      });

      analyzed += 1;
    } catch (error: any) {
      const message =
        typeof error?.message === "string"
          ? error.message
          : "Unbekannter Fehler in analyzeContribution";
      await candidateCol.updateOne(
        { _id: candidate._id },
        {
          $set: {
            analyzeStatus: "error" as AnalyzeStatus,
            analyzeError: message,
            analyzeCompletedAt: new Date(),
          },
        },
      );
      errors += 1;
    }
  }

  return { analyzed, errors };
}

function determineLocale(candidate: StatementCandidate): string {
  const locale = candidate.sourceLocale?.toLowerCase();
  if (!locale) return "de";
  if (locale.startsWith("de")) return "de";
  if (locale.startsWith("en")) return "en";
  return locale.length === 2 ? locale : "en";
}

function extractSourceText(candidate: StatementCandidate): string | null {
  return (
    candidate.sourceContent?.trim() ??
    candidate.sourceSummary?.trim() ??
    candidate.sourceTitle?.trim() ??
    null
  );
}
