import type { ObjectId } from "mongodb";
import type { RegionCode } from "@core/regions/types";
import type {
  StatementRecord,
  NoteRecord,
  QuestionRecord,
  KnotRecord,
} from "@features/analyze/schemas";
import type { FeedAnlassraumSurfaceComposition } from "@features/feeds/anlassraumSurfaceComposition";

export type AnalyzeStatus = "pending" | "processing" | "success" | "error";

export interface FeedItemInput {
  url: string;
  title: string;
  summary?: string | null;
  content?: string | null;
  publishedAt?: string | null;
  sourceName?: string | null;
  sourceType?: string | null;
  region?: string | null;
  regionCode?: RegionCode | string | null;
  sourceLocale?: string | null;
  topicHint?: string | null;
}

export interface StatementCandidate {
  _id?: ObjectId;
  id: string;
  sourceUrl: string;
  sourceTitle: string;
  sourceSummary?: string | null;
  sourceContent?: string | null;
  sourceName?: string | null;
  sourceType?: string | null;
  region?: string | null;
  regionCode?: RegionCode | null;
  sourceLocale?: string | null;
  topic?: string | null;

  canonicalHash: string;
  createdAt: string;
  publishedAt?: string | null;

  analyzeStatus: AnalyzeStatus;
  analyzeRequestedAt?: Date;
  analyzeStartedAt?: Date;
  analyzeCompletedAt?: Date;
  analyzeError?: string | null;
  analyzeLocale?: string | null;
  analyzeResultId?: ObjectId | null;
  priority?: "breaking" | "normal" | "low";

  extractedClaims?: any[];
  pipelineMeta?: {
    analyzed?: boolean;
    analyzeError?: string | null;
  };
}

export interface StatementCandidateAnalyzeResultDoc {
  _id?: ObjectId;
  statementCandidateId: ObjectId;
  mode: "E150";
  sourceText: string;
  language: string;
  claims: StatementRecord[];
  notes: NoteRecord[];
  questions: QuestionRecord[];
  knots: KnotRecord[];
  pipelineMeta?: {
    provider?: string;
    model?: string;
    durationMs?: number;
    tokensInput?: number;
    tokensOutput?: number;
    costEur?: number;
    pipeline?: string;
  } | null;
  createdAt: Date;
}

export type VoteDraftStatus = "draft" | "review" | "published" | "discarded";
export type FeedReviewState =
  | "queued"
  | "ignored"
  | "attached"
  | "candidate_created"
  | "weak_signal";

export interface VoteDraftDoc {
  _id?: ObjectId;
  statementCandidateId: ObjectId;
  analyzeResultId: ObjectId;
  anlassraumId?: ObjectId | null;
  createdAt: Date;
  updatedAt?: Date;
  publishedAt?: Date | null;
  analyzeCompletedAt?: Date | null;

  title: string;
  summary?: string | null;
  claims: StatementRecord[];
  status: VoteDraftStatus;
  pipeline: string;

  sourceUrl?: string | null;
  sourceLocale?: string | null;
  regionCode?: RegionCode | null;
  tags?: string[];

  createdBy?: string | null;
  reviewerId?: string | null;
  reviewNote?: string | null;
  feedReviewState?: FeedReviewState;
  weakSignal?: {
    flagged: boolean;
    reason?: string | null;
    flaggedBy?: string | null;
    flaggedAt?: Date | null;
  } | null;
  lastReviewAction?: string | null;
  lastReviewActionBy?: string | null;
  lastReviewActionAt?: Date | null;
}

export type FeedStatementStatus = "draft" | "readyForLive";

export interface FeedStatementDoc {
  _id?: ObjectId;
  voteDraftId: ObjectId;
  statementCandidateId: ObjectId;
  title: string;
  summary?: string | null;
  claims: StatementRecord[];
  regionCode?: RegionCode | null;
  sourceUrl?: string | null;
  sourceLocale?: string | null;
  pipeline: string;
  status: FeedStatementStatus;
  createdAt: Date;
  updatedAt?: Date;
}

export type FeedAnlassraumClusterCandidateStatus = "candidate";

export interface FeedAnlassraumClusterCandidateDoc {
  _id?: ObjectId;
  clusterKey: string;
  topicKey: string;
  regionCode: RegionCode | string | null;
  windowBucket: string;
  windowHours: number;
  source: "vote_drafts";
  status: FeedAnlassraumClusterCandidateStatus;
  draftIds: ObjectId[];
  anlassraumIds: ObjectId[];
  draftCount: number;
  sampleTitles: string[];
  fingerprint: string;
  createdAt: Date;
  updatedAt: Date;
}

// API/view transport types (string ids / ISO dates) for web clients.
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

export type VoteDraft = {
  _id: string;
  statementCandidateId: string;
  analyzeResultId: string;
  anlassraumId?: string | null;
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
  feedReviewState?: FeedReviewState | null;
  weakSignal?: {
    flagged: boolean;
    reason?: string | null;
    flaggedBy?: string | null;
    flaggedAt?: string | null;
  } | null;
};

export type VoteDraftSummary = {
  id: string;
  anlassraumId?: string | null;
  title: string;
  status: VoteDraftStatus;
  regionCode: string | null;
  regionName: string | null;
  sourceUrl: string | null;
  pipeline: string | null;
  createdAt: string | null;
  analyzeCompletedAt: string | null;
  feedReviewState?: FeedReviewState | null;
  weakSignal?: {
    flagged: boolean;
    reason?: string | null;
  } | null;
  reviewNote?: string | null;
  lastReviewAction?: string | null;
  lastReviewActionBy?: string | null;
  lastReviewActionAt?: string | null;
  queueMeta?: {
    priorityScore: number;
    priorityBucket: "high" | "medium" | "low";
    pendingHours: number;
    needsAnlassraumBackfill: boolean;
    reasons: string[];
  } | null;
  surfaceComposition?: FeedAnlassraumSurfaceComposition | null;
};
