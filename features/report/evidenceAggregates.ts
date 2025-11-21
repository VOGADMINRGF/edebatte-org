import { evidenceClaimsCol, evidenceDecisionsCol, evidenceLinksCol } from "@core/evidence/db";
import type { EvidenceDecisionDoc } from "@core/evidence/types";

export interface EvidenceDecisionSummary {
  yesShare: number;
  noShare: number;
  abstainShare?: number;
  decidedAt?: Date | null;
  quorumReached: boolean;
  majorityKind: EvidenceDecisionDoc["outcome"]["majorityKind"];
}

export interface RegionEvidenceTopicEntry {
  topicKey: string;
  claimCount: number;
  latestDecision?: EvidenceDecisionSummary | null;
  newsSourceCount?: number;
}

export interface RegionEvidenceSummary {
  regionCode: string;
  claimCount: number;
  decisionCount: number;
  lastUpdated?: Date | null;
  latestDecision?: EvidenceDecisionSummary | null;
  newsSourceCount?: number;
  topics: RegionEvidenceTopicEntry[];
}

export interface RegionEvidenceSummaryInput {
  regionCode?: string | null;
  locale?: string | null;
  limitTopics?: number;
  dateFrom?: Date | string | null;
  dateTo?: Date | string | null;
}

export interface EvidenceRegionHeatmapEntry {
  regionCode: string;
  claimCount: number;
  lastUpdated?: Date | null;
}

export interface EvidenceRegionHeatmapInput {
  locale?: string | null;
  limit?: number;
  dateFrom?: Date | string | null;
  dateTo?: Date | string | null;
}

function buildLocaleMatch(locale?: string | null) {
  if (!locale || locale === "all") return {};
  return { locale };
}

function normalizeDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildDateRangeMatch(dateFrom?: Date | string | null, dateTo?: Date | string | null) {
  const range: Record<string, Date> = {};
  const from = normalizeDate(dateFrom);
  const to = normalizeDate(dateTo);
  if (from) range.$gte = from;
  if (to) range.$lte = to;
  return Object.keys(range).length ? { createdAt: range } : {};
}

function mapDecision(decision?: EvidenceDecisionDoc | null): EvidenceDecisionSummary | null {
  if (!decision) return null;
  return {
    yesShare: decision.outcome.yesShare,
    noShare: decision.outcome.noShare,
    abstainShare: decision.outcome.abstainShare,
    decidedAt: decision.decidedAt ?? null,
    quorumReached: decision.outcome.quorumReached,
    majorityKind: decision.outcome.majorityKind,
  };
}

export async function getRegionEvidenceSummary(
  input: RegionEvidenceSummaryInput,
): Promise<RegionEvidenceSummary> {
  const { regionCode, locale, limitTopics = 5, dateFrom, dateTo } = input;
  const claims = await evidenceClaimsCol();

  const match: Record<string, any> = {
    ...(regionCode && regionCode !== "all" ? { regionCode } : { regionCode: { $exists: true } }),
    ...buildLocaleMatch(locale),
    ...buildDateRangeMatch(dateFrom, dateTo),
  };

  const [facet] = await claims
    .aggregate<{
      counts: Array<{ total: number }>;
      topics: Array<{ _id: string; total: number }>;
      lastUpdated: Array<{ updatedAt: Date }>;
    }>([
      { $match: match },
      {
        $facet: {
          counts: [{ $count: "total" }],
          topics: [
            { $match: { topicKey: { $exists: true, $ne: null, $ne: "" } } },
            { $group: { _id: "$topicKey", total: { $sum: 1 } } },
            { $sort: { total: -1 } },
            { $limit: limitTopics },
          ],
          lastUpdated: [
            { $sort: { updatedAt: -1 } },
            { $limit: 1 },
            { $project: { updatedAt: 1 } },
          ],
        },
      },
    ])
    .toArray();

  const totalClaims = facet?.counts?.[0]?.total ?? 0;
  let topics: RegionEvidenceTopicEntry[] =
    facet?.topics?.map((topic) => ({
      topicKey: topic._id || "general",
      claimCount: topic.total,
    })) ?? [];
  const lastUpdated = facet?.lastUpdated?.[0]?.updatedAt ?? null;

  const decisionsMatch: Record<string, any> = {};
  if (regionCode && regionCode !== "all") decisionsMatch.regionCode = regionCode;
  if (locale && locale !== "all") decisionsMatch.locale = locale;
  const decisionDateRange = buildDateRangeMatch(dateFrom, dateTo);
  if (decisionDateRange.createdAt) {
    decisionsMatch.decidedAt = decisionDateRange.createdAt;
  }

  const decisionsCol = await evidenceDecisionsCol();
  const decisionCount = await decisionsCol.countDocuments(decisionsMatch);

  const latestRegionDecisionDoc = await decisionsCol
    .find(decisionsMatch)
    .sort({ decidedAt: -1 })
    .limit(1)
    .toArray();
  const latestRegionDecision = mapDecision(latestRegionDecisionDoc[0]);

  const topicKeys = topics.map((t) => t.topicKey).filter((key) => key && key !== "general");
  if (topicKeys.length > 0) {
    const topicDecisions = await claims
      .aggregate<{ _id: string; decision: EvidenceDecisionDoc }>([
        {
          $match: {
            ...match,
            topicKey: { $in: topicKeys },
          },
        },
        {
          $lookup: {
            from: "evidence_decisions",
            localField: "_id",
            foreignField: "claimId",
            as: "decisions",
          },
        },
        { $unwind: "$decisions" },
        { $sort: { "decisions.decidedAt": -1 } },
        {
          $group: {
            _id: "$topicKey",
            decision: { $first: "$decisions" },
          },
        },
      ])
      .toArray();

    const topicDecisionMap = new Map<string, EvidenceDecisionSummary>();
    topicDecisions.forEach((row) => {
      if (row._id) topicDecisionMap.set(row._id, mapDecision(row.decision));
    });
    topics = topics.map((topic) => ({
      ...topic,
      latestDecision: topic.topicKey ? topicDecisionMap.get(topic.topicKey) ?? null : null,
    }));
  }

  const newsStats = await computeNewsSourceStats(match, topicKeys);
  topics = topics.map((topic) => ({
    ...topic,
    newsSourceCount: topic.topicKey ? newsStats.topicCounts.get(topic.topicKey) ?? 0 : 0,
  }));

  return {
    regionCode: regionCode || "all",
    claimCount: totalClaims,
    decisionCount,
    lastUpdated,
    latestDecision: latestRegionDecision,
    newsSourceCount: newsStats.regionTotal,
    topics,
  };
}

export async function getEvidenceRegionHeatmap(
  input: EvidenceRegionHeatmapInput = {},
): Promise<EvidenceRegionHeatmapEntry[]> {
  const { locale, limit = 200, dateFrom, dateTo } = input;
  const claims = await evidenceClaimsCol();
  const match: Record<string, any> = {
    regionCode: { $exists: true, $ne: null, $ne: "" },
    ...buildLocaleMatch(locale),
    ...buildDateRangeMatch(dateFrom, dateTo),
  };

  const rows = await claims
    .aggregate<EvidenceRegionHeatmapEntry & { _id: string | null }>([
      { $match: match },
      {
        $group: {
          _id: "$regionCode",
          claimCount: { $sum: 1 },
          lastUpdated: { $max: "$updatedAt" },
        },
      },
      { $match: { _id: { $ne: null } } },
      { $sort: { claimCount: -1 } },
      { $limit: Math.min(Math.max(limit, 1), 1000) },
    ])
    .toArray();

  return rows.map((row) => ({
    regionCode: row._id as string,
    claimCount: row.claimCount,
    lastUpdated: row.lastUpdated ?? null,
  }));
}

async function computeNewsSourceStats(
  claimMatch: Record<string, any>,
  topicKeys: string[],
): Promise<{ regionTotal: number; topicCounts: Map<string, number> }> {
  const linksCol = await evidenceLinksCol();
  const basePipeline = [
    {
      $lookup: {
        from: "evidence_items",
        localField: "toEvidenceId",
        foreignField: "_id",
        as: "item",
      },
    },
    { $unwind: "$item" },
    {
      $match: {
        "item.sourceKind": "news_article",
        $or: [{ "item.isActive": { $ne: false } }, { "item.isActive": { $exists: false } }],
      },
    },
    {
      $lookup: {
        from: "evidence_claims",
        localField: "fromClaimId",
        foreignField: "_id",
        as: "claim",
      },
    },
    { $unwind: "$claim" },
    { $match: claimMatch },
  ];

  const totalRow = await linksCol
    .aggregate([
      ...basePipeline,
      { $group: { _id: "$item._id" } },
      { $count: "total" },
    ])
    .toArray();
  const regionTotal = totalRow[0]?.total ?? 0;

  const topicCounts = new Map<string, number>();
  if (topicKeys.length) {
    const rows = await linksCol
      .aggregate([
        ...basePipeline,
        { $match: { "claim.topicKey": { $in: topicKeys } } },
        {
          $group: {
            _id: "$claim.topicKey",
            total: { $sum: 1 },
          },
        },
      ])
      .toArray();
    rows.forEach((row) => {
      if (row._id) topicCounts.set(row._id, row.total);
    });
  }

  return { regionTotal, topicCounts };
}
