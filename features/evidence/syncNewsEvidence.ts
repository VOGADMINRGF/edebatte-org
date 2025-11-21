import type { ObjectId } from "@core/db/triMongo";
import { evidenceItemsCol, evidenceLinksCol } from "@core/evidence/db";
import type { EvidenceClaimDoc, EvidenceItemDoc } from "@core/evidence/types";
import type { StatementCandidate } from "@features/feeds/types";
import { summariseForEvidence } from "./summariseForEvidence";

interface SyncNewsEvidenceParams {
  candidate: StatementCandidate;
  claims: EvidenceClaimDoc[];
}

export async function syncNewsEvidenceForCandidate({
  candidate,
  claims,
}: SyncNewsEvidenceParams): Promise<void> {
  if (!candidate?.sourceUrl || !claims?.length) return;

  const itemsCol = await evidenceItemsCol();
  const now = new Date();
  const publisher = candidate.sourceName?.trim() || "News";
  const shortTitle = (candidate.sourceTitle || publisher).slice(0, 240);
  const summarySource = candidate.sourceSummary || candidate.sourceContent || candidate.sourceTitle || "";
  const shortSummary = await summariseForEvidence(summarySource, 800);
  const quoteSnippet = shortSummary ? shortSummary.slice(0, 300) : "";

  const result = await itemsCol.findOneAndUpdate(
    { url: candidate.sourceUrl },
    {
      $set: {
        url: candidate.sourceUrl,
        sourceKind: candidate.sourceType || "news_article",
        publisher,
        shortTitle,
        shortSummary,
        quoteSnippet,
        author: null,
        publishedAt: candidate.publishedAt ? new Date(candidate.publishedAt) : null,
        locale: candidate.sourceLocale ?? null,
        regionCode: candidate.regionCode ?? null,
        licenseHint: "unknown",
        reliabilityHint: "unknown",
        isActive: true,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true, returnDocument: "after" },
  );

  const evidenceItem = result.value as EvidenceItemDoc;
  if (!evidenceItem?._id) return;

  const linksCol = await evidenceLinksCol();
  const linkType = "source_context";

  for (const claim of claims) {
    if (!claim?._id) continue;
    await linksCol.updateOne(
      { fromClaimId: claim._id, toEvidenceId: evidenceItem._id },
      {
        $setOnInsert: {
          relation: "context",
          linkType,
          createdAt: now,
        },
        $set: {
          meta: { pipeline: "news_factcheck" },
        },
      },
      { upsert: true },
    );
  }
}
