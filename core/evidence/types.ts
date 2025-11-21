import type { ObjectId } from "../db/triMongo";

export type EvidenceRelationKind = "supports" | "refutes" | "context";
export type EvidenceSourceType = "feed" | "contribution" | "admin";
export type EvidenceLinkType =
  | "source_context"
  | "reported_by"
  | "supporting"
  | "contradicting";

export interface EvidenceClaimDoc {
  _id: ObjectId;
  claimId: string;
  text: string;
  sourceType: EvidenceSourceType;
  sourceRef: {
    feedStatementId?: ObjectId;
    contributionId?: string;
    statementId?: string;
  };
  topicKey?: string | null;
  domainKey?: string | null;
  regionCode?: string | null;
  locale: string;
  visibility?: "public" | "internal" | "hidden";
  createdAt: Date;
  updatedAt: Date;
  meta?: {
    pipeline?: string;
    confidence?: number;
    sourceLocale?: string | null;
  };
}

export type EvidenceItemSource = "press" | "ngo" | "gov" | "scientific" | "other";
export type EvidenceItemKind = "news_article" | "press_release" | "blog" | "official_doc";
export type EvidenceReliability = "high" | "medium" | "low" | "unknown";
export type EvidenceLicenseHint =
  | "unknown"
  | "cc_by"
  | "cc_by_sa"
  | "public_domain"
  | "paywalled"
  | "restricted";

export interface EvidenceItemDoc {
  _id: ObjectId;
  url: string;
  sourceKind: EvidenceItemKind;
  publisher: string;
  shortTitle: string;
  shortSummary: string;
  quoteSnippet?: string | null;
  author?: string | null;
  publishedAt?: Date | null;
  locale?: string | null;
  regionCode?: string | null;
  licenseHint?: EvidenceLicenseHint;
  reliabilityHint?: EvidenceReliability;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EvidenceLinkDoc {
  _id: ObjectId;
  fromClaimId: ObjectId;
  toEvidenceId?: ObjectId;
  toClaimId?: ObjectId;
  relation: EvidenceRelationKind;
  linkType?: EvidenceLinkType | null;
  createdAt: Date;
  createdBy?: {
    userId?: string;
    pipeline?: string;
  };
  meta?: {
    pipeline?: string;
  };
}

export type EvidenceMajorityKind = "simple" | "twoThirds" | "other";

export interface EvidenceDecisionDoc {
  _id: ObjectId;
  claimId: ObjectId;
  voteRef?: {
    voteDraftId?: ObjectId;
    statementId?: string;
  };
  regionCode?: string | null;
  locale: string;
  decidedAt: Date;
  outcome: {
    yesShare: number;
    noShare: number;
    abstainShare?: number;
    quorumReached: boolean;
    majorityKind: EvidenceMajorityKind;
  };
  meta?: {
    pipeline?: string;
  };
}
