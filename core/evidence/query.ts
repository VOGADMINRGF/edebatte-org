import { ObjectId } from "@core/db/triMongo";
import {
  evidenceClaimsCol,
  evidenceDecisionsCol,
  evidenceItemsCol,
  evidenceLinksCol,
} from "./db";
import type {
  EvidenceClaimDoc,
  EvidenceDecisionDoc,
  EvidenceLinkDoc,
  EvidenceItemDoc,
} from "./types";

export interface EvidenceClaimFilter {
  regionCode?: string;
  locale?: string;
  topicKey?: string;
  pipeline?: string;
  sourceType?: "contribution" | "feed" | "admin";
  textQuery?: string;
  limit?: number;
  offset?: number;
  dateFrom?: Date | string | null;
  dateTo?: Date | string | null;
}

export interface EvidenceClaimWithMeta {
  claim: EvidenceClaimDoc;
  links?: EvidenceLinkDoc[];
  decisions?: EvidenceDecisionDoc[];
  latestDecision?: EvidenceDecisionDoc | null;
  evidenceItems?: EvidenceItemDoc[];
}

function buildMatch(filter: EvidenceClaimFilter) {
  const match: Record<string, any> = {};
  if (filter.regionCode && filter.regionCode !== "all") match.regionCode = filter.regionCode;
  if (filter.locale && filter.locale !== "all") match.locale = filter.locale;
  if (filter.topicKey && filter.topicKey !== "all") match.topicKey = filter.topicKey;
  if (filter.pipeline && filter.pipeline !== "all") match["meta.pipeline"] = filter.pipeline;
  if (filter.sourceType && filter.sourceType !== "all") match.sourceType = filter.sourceType;
  if (filter.textQuery) {
    const regex = new RegExp(filter.textQuery, "i");
    match.text = { $regex: regex };
  }
  const createdAt: Record<string, Date> = {};
  if (filter.dateFrom) {
    const from = new Date(filter.dateFrom);
    if (!Number.isNaN(from.getTime())) createdAt.$gte = from;
  }
  if (filter.dateTo) {
    const to = new Date(filter.dateTo);
    if (!Number.isNaN(to.getTime())) createdAt.$lte = to;
  }
  if (Object.keys(createdAt).length) match.createdAt = createdAt;
  return match;
}

export async function findEvidenceClaims(
  filter: EvidenceClaimFilter,
): Promise<{ items: EvidenceClaimWithMeta[]; total: number }> {
  const col = await evidenceClaimsCol();
  const match = buildMatch(filter);
  const limit = Math.min(filter.limit ?? 20, 100);
  const offset = Math.max(filter.offset ?? 0, 0);

  const total = await col.countDocuments(match);
  const cursor = col
    .aggregate<{
      claim: EvidenceClaimDoc;
      links: EvidenceLinkDoc[];
      decisions: EvidenceDecisionDoc[];
    }>([
      { $match: match },
      { $sort: { createdAt: -1 } },
      { $skip: offset },
      { $limit: limit },
      {
        $lookup: {
          from: "evidence_links",
          localField: "_id",
          foreignField: "fromClaimId",
          as: "links",
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
    ]);

  const docs = await cursor.toArray();
  const evidenceIds = new Set<string>();
  docs.forEach((doc) => {
    (doc.links ?? []).forEach((link) => {
      const id = link.toEvidenceId?.toString();
      if (id) evidenceIds.add(id);
    });
  });

  const evidenceItemsMap = await loadEvidenceItems(evidenceIds);

  const items: EvidenceClaimWithMeta[] = docs.map((doc) => {
    const claimLinks = doc.links ?? [];
    const linkedItems = claimLinks
      .map((link) => (link.toEvidenceId ? evidenceItemsMap.get(link.toEvidenceId.toString()) : null))
      .filter((item): item is EvidenceItemDoc => Boolean(item));

    return {
      claim: doc as EvidenceClaimDoc,
      links: claimLinks,
      decisions: doc.decisions ?? [],
      latestDecision: extractLatestDecision(doc.decisions ?? []),
      evidenceItems: linkedItems,
    };
  });

  return { items, total };
}

export async function getEvidenceClaimById(
  id: string | ObjectId,
): Promise<EvidenceClaimWithMeta | null> {
  let objectId: ObjectId;
  try {
    objectId = typeof id === "string" ? new ObjectId(id) : id;
  } catch {
    return null;
  }

  const col = await evidenceClaimsCol();
  const claim = await col.findOne({ _id: objectId });
  if (!claim) return null;

  const [links, decisions] = await Promise.all([
    (await evidenceLinksCol()).find({ fromClaimId: objectId }).toArray(),
    (await evidenceDecisionsCol()).find({ claimId: objectId }).toArray(),
  ]);
  const itemIds = new Set<string>();
  links.forEach((link) => {
    const id = link.toEvidenceId?.toString();
    if (id) itemIds.add(id);
  });
  const evidenceItems = await loadEvidenceItems(itemIds);

  return {
    claim,
    links,
    decisions,
    latestDecision: extractLatestDecision(decisions),
    evidenceItems: Array.from(evidenceItems.values()),
  };
}

function extractLatestDecision(decisions: EvidenceDecisionDoc[]): EvidenceDecisionDoc | null {
  if (!decisions?.length) return null;
  const sorted = [...decisions].sort(
    (a, b) =>
      (b.decidedAt instanceof Date ? b.decidedAt.getTime() : new Date(b.decidedAt ?? 0).getTime()) -
      (a.decidedAt instanceof Date ? a.decidedAt.getTime() : new Date(a.decidedAt ?? 0).getTime()),
  );
  return sorted[0] ?? null;
}

async function loadEvidenceItems(
  ids: Set<string>,
): Promise<Map<string, EvidenceItemDoc>> {
  if (!ids.size) return new Map();
  const objectIds = Array.from(ids).map((id) => new ObjectId(id));
  const col = await evidenceItemsCol();
  const docs = await col
    .find({
      _id: { $in: objectIds },
      $or: [{ isActive: { $ne: false } }, { isActive: { $exists: false } }],
    })
    .toArray();
  const map = new Map<string, EvidenceItemDoc>();
  docs.forEach((doc) => {
    map.set(doc._id.toString(), doc);
  });
  return map;
}
