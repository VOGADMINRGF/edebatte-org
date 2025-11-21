import type { ObjectId } from "@core/db/triMongo";
import type { AnalyzeResult } from "@features/analyze/schemas";
import { evidenceClaimsCol } from "@core/evidence/db";
import type { EvidenceClaimDoc, EvidenceSourceType } from "@core/evidence/types";

export interface EvidenceSyncContext {
  sourceType: EvidenceSourceType;
  sourceRef: {
    contributionId?: string;
    feedStatementId?: ObjectId;
    statementId?: string;
  };
  regionCode?: string;
  locale: string;
  pipeline: string;
}

export async function syncAnalyzeResultToEvidenceGraph(
  analyze: AnalyzeResult,
  ctx: EvidenceSyncContext,
): Promise<EvidenceClaimDoc[]> {
  const claimsCol = await evidenceClaimsCol();
  const results: EvidenceClaimDoc[] = [];
  const now = new Date();

  const sourceBase =
    ctx.sourceRef.feedStatementId?.toHexString?.() ??
    ctx.sourceRef.statementId ??
    ctx.sourceRef.contributionId ??
    "source";

  const locale = ctx.locale || analyze.language || "de";

  for (let idx = 0; idx < (analyze.claims?.length ?? 0); idx += 1) {
    const claim = analyze.claims[idx];
    const text = claim?.text?.trim();
    if (!text) continue;

    const stableId = buildClaimId(claim?.id, sourceBase, idx);
    const importance = typeof claim?.importance === "number" ? claim.importance : undefined;
    const confidence = importance && importance > 0 ? Math.min(1, importance / 5) : undefined;

    const updateResult = await claimsCol.findOneAndUpdate(
      { claimId: stableId },
      {
        $set: {
          claimId: stableId,
          text,
          topicKey: claim?.topic ?? null,
          domainKey: claim?.domain ?? null,
          regionCode: ctx.regionCode ?? null,
          locale,
          updatedAt: now,
          meta: {
            pipeline: ctx.pipeline,
            confidence,
            sourceLocale: ctx.locale ?? analyze.language,
          },
        },
        $setOnInsert: {
          sourceType: ctx.sourceType,
          sourceRef: ctx.sourceRef,
          createdAt: now,
        },
      },
      { upsert: true, returnDocument: "after" },
    );

    if (updateResult.value) {
      results.push(updateResult.value as EvidenceClaimDoc);
    }
  }

  return results;
}

function buildClaimId(claimId: string | undefined, sourceBase: string, index: number): string {
  const candidate = claimId?.trim();
  if (candidate) return candidate;
  return `${sourceBase}:${index}`;
}
