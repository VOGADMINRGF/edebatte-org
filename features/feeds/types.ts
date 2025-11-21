import type { ObjectId } from "mongodb";
import type { RegionCode } from "@core/regions/types";
import type {
  StatementRecord,
  NoteRecord,
  QuestionRecord,
  KnotRecord,
} from "@features/analyze/schemas";

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

export interface VoteDraftDoc {
  _id?: ObjectId;
  statementCandidateId: ObjectId;
  analyzeResultId: ObjectId;
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
