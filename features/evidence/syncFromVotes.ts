import type { ObjectId } from "@core/db/triMongo";
import { evidenceDecisionsCol } from "@core/evidence/db";
import type { EvidenceDecisionDoc } from "@core/evidence/types";

export interface VoteAggregationInput {
  claimId: ObjectId;
  regionCode?: string | null;
  locale: string;
  yes: number;
  no: number;
  abstain?: number;
  quorumReached: boolean;
  majorityKind: EvidenceDecisionDoc["outcome"]["majorityKind"];
  decidedAt: Date;
  pipeline: string;
  voteDraftId?: ObjectId;
  statementId?: string | ObjectId | null;
  streamSessionId?: string | ObjectId | null;
  agendaItemId?: string | ObjectId | null;
}

export async function upsertEvidenceDecision(
  input: VoteAggregationInput,
): Promise<EvidenceDecisionDoc> {
  const decisions = await evidenceDecisionsCol();

  const yes = Math.max(0, Math.floor(input.yes));
  const no = Math.max(0, Math.floor(input.no));
  const abstain = Math.max(0, Math.floor(input.abstain ?? 0));
  const total = Math.max(yes + no + abstain, 1);
  const yesShare = yes / total;
  const noShare = no / total;
  const abstainShare = abstain > 0 ? abstain / total : undefined;

  const voteRef =
    input.voteDraftId || input.statementId
      ? {
          voteDraftId: input.voteDraftId,
          statementId:
            typeof input.statementId === "string"
              ? input.statementId
              : input.statementId
              ? input.statementId.toHexString()
              : undefined,
        }
      : undefined;

  const update = await decisions.findOneAndUpdate(
    { claimId: input.claimId },
    {
      $set: {
        regionCode: input.regionCode ?? null,
        locale: input.locale,
        decidedAt: input.decidedAt,
        outcome: {
          yesShare,
          noShare,
          abstainShare,
          quorumReached: input.quorumReached,
          majorityKind: input.majorityKind,
        },
        voteRef,
        meta: {
          pipeline: input.pipeline,
        },
      },
      $setOnInsert: {
        claimId: input.claimId,
      },
    },
    { upsert: true, returnDocument: "after" },
  );

  return update.value as EvidenceDecisionDoc;
}

// Live-Streams: Falls streamSessionId/agendaItemId vorhanden sind, könnten zukünftige
// Evidence-Items mit sourceKind "live_stream" erstellt werden (TODO).
