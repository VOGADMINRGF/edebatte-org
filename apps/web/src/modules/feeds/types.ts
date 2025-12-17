import type { SupportedLocale } from "@/config/locales";

export type AnalyzeStatus = "pending" | "processing" | "success" | "error";

export type FeedBatchItem = {
  sourceId?: string;
  url: string;
  title?: string;
  summary?: string;
  content?: string;
  publishedAt?: string;
  language?: string;
  regionCode?: string;
  sourceLocale?: string;
  topicHint?: string;
};

export type StatementCandidate = {
  _id?: string;
  id: string;
  sourceUrl: string;
  sourceTitle: string;
  sourceSummary?: string;
  sourceContent?: string;
  sourceName?: string;
  region?: string;
  regionCode?: string | null;
  sourceLocale?: string;
  topic?: string;
  canonicalHash: string;
  createdAt: string;
  publishedAt?: string;
  analyzeStatus: AnalyzeStatus;
  analyzeRequestedAt?: string;
  analyzeStartedAt?: string;
  analyzeCompletedAt?: string;
  analyzeError?: string | null;
  analyzeLocale?: string | null;
  analyzeResultId?: string | null;
  priority?: "breaking" | "normal" | "low";
  extractedClaims?: any[];
  pipelineMeta?: {
    analyzed?: boolean;
    analyzeError?: string | null;
  };
};

export type VoteDraftStatus = "draft" | "review" | "published" | "discarded";

export type VoteDraft = {
  _id: string;
  statementCandidateId: string;
  analyzeResultId: string;
  status: VoteDraftStatus;
  title: string;
  summary?: string | null;
  claims: {
    id: string;
    text: string;
    title?: string | null;
    responsibility?: string | null;
    topic?: string | null;
    domain?: string | null;
    importance?: number | null;
  }[];
  regionCode?: string | null;
  regionName?: string | null;
  sourceUrl?: string | null;
  sourceLocale?: string | null;
  pipeline: string;
  createdAt: string;
  updatedAt?: string;
  analyzeCompletedAt?: string | null;
  publishedAt?: string | null;
  reviewNote?: string | null;
};

export type VoteDraftSummary = {
  id: string;
  title: string;
  status: VoteDraftStatus;
  regionCode: string | null;
  regionName: string | null;
  sourceUrl: string | null;
  pipeline: string | null;
  createdAt: string | null;
  analyzeCompletedAt: string | null;
};
