import type { ObjectId } from "@core/db/triMongo";
import type { RegionCode } from "@core/regions/types";
import type {
  StatementRecord,
  NoteRecord,
  QuestionRecord,
  KnotRecord,
} from "@features/analyze/schemas";
import type { ContentTrustLevel, RoomType } from "@features/trust/types";

export const ANLASSRAUM_TYPES = [
  "policy",
  "event",
  "conflict",
  "investigation",
  "proposal",
  "crisis",
  "community_project",
  "funding_case",
  "monitoring",
] as const;
export type AnlassraumType = (typeof ANLASSRAUM_TYPES)[number];

export const ANLASSRAUM_SCOPES = ["local", "regional", "national", "eu", "global"] as const;
export type AnlassraumScope = (typeof ANLASSRAUM_SCOPES)[number];

export const ANLASSRAUM_MATURITY_STATES = [
  "signal",
  "emerging",
  "structured",
  "decision_ready",
  "monitoring",
] as const;
export type AnlassraumMaturity = (typeof ANLASSRAUM_MATURITY_STATES)[number];

export const ANLASSRAUM_LIFECYCLE_STATUSES = [
  "draft",
  "curated",
  "reviewed",
  "approved",
  "active",
  "paused",
  "closed",
  "review_required",
  "ready_for_public_link",
  "follow_up_required",
  "archived",
] as const;
export type AnlassraumLifecycleStatus = (typeof ANLASSRAUM_LIFECYCLE_STATUSES)[number];

export const LEGACY_ANLASSRAUM_STATUSES = [
  "auto_ingested",
  "auto_clustered",
  "needs_editor_review",
  "ready_for_round",
  "published",
] as const;
export type LegacyAnlassraumStatus = (typeof LEGACY_ANLASSRAUM_STATUSES)[number];

export type AnlassraumStatus = AnlassraumLifecycleStatus | LegacyAnlassraumStatus;

export const ANLASSRAUM_OWNER_TYPES = [
  "platform",
  "municipality",
  "government",
  "party",
  "organization",
  "association",
  "ngo",
  "company",
  "media",
  "initiative",
  "community",
  "editorial",
  "user",
  "system",
  "other",
] as const;
export type AnlassraumOwnerType = (typeof ANLASSRAUM_OWNER_TYPES)[number];

export const ANLASSRAUM_SOURCE_MODES = [
  "manual",
  "feed",
  "single_source",
  "cluster",
  "ai_assist",
] as const;
export type AnlassraumSourceMode = (typeof ANLASSRAUM_SOURCE_MODES)[number];

export const ANLASSRAUM_ORIGIN_TYPES = [
  "manual",
  "feed",
  "source_anchor",
  "community",
  "event",
  "official",
  "tip",
  "system",
] as const;
export type AnlassraumOriginType = (typeof ANLASSRAUM_ORIGIN_TYPES)[number];

export const ANLASSRAUM_KINDS = [
  "event",
  "issue",
  "cluster",
  "research_window",
  "media_window",
] as const;
export type AnlassraumKind = (typeof ANLASSRAUM_KINDS)[number];

export const DOSSIER_TYPES = ["exploration_dossier", "decision_dossier"] as const;
export type DossierType = (typeof DOSSIER_TYPES)[number];

export const ANLASSRAUM_REVIEW_MODES = ["light", "standard", "strict"] as const;
export type AnlassraumReviewMode = (typeof ANLASSRAUM_REVIEW_MODES)[number];

export type AnlassraumSourceRole = "primary" | "supporting" | "counter" | "context";

export const OUTPUT_SEED_TYPES = [
  "round_seed",
  "dossier_seed",
  "embed_seed",
  "social_seed",
  "regional_briefing_seed",
  "editorial_pitch_seed",
] as const;
export type OutputSeedType = (typeof OUTPUT_SEED_TYPES)[number];

export const OUTPUT_SEED_STATUSES = [
  "draft",
  "queued",
  "review",
  "ready",
  "published",
  "discarded",
] as const;
export type OutputSeedStatus = (typeof OUTPUT_SEED_STATUSES)[number];

export const OUTPUT_SEED_REVIEW_STATES = ["pending", "approved", "rejected"] as const;
export type OutputSeedReviewState = (typeof OUTPUT_SEED_REVIEW_STATES)[number];

export interface AnlassraumDoc {
  _id?: ObjectId;
  entityId: ObjectId;
  type: AnlassraumType;
  title: string;
  summary: string;
  slug: string;
  topicKey: string;
  regionKey: string | null;
  regionCode?: RegionCode | null;
  scope: AnlassraumScope;
  decisionScope: AnlassraumScope;
  ownerType: AnlassraumOwnerType;
  ownerId: string;
  stewardUserId: string | null;
  sourceMode: AnlassraumSourceMode;
  originType: AnlassraumOriginType;
  status: AnlassraumStatus;
  maturity: AnlassraumMaturity;
  roomType: RoomType;
  contentTrust: ContentTrustLevel;
  parentAnlassraumId: ObjectId | null;
  dossierId: ObjectId | null;
  dossierType?: DossierType | null;
  isPublic: boolean;
  activationWorkflowSourceHandoffId?: string | null;
  activationWorkflowVersion?: number | null;
  createdBy: string;
  reviewedBy: string | null;
  approvedBy: string | null;
  relevanceScore: number;
  reviewMode: AnlassraumReviewMode;
  riskFlags: string[];
  clusterKey?: string | null;
  kind?: AnlassraumKind;
  pipeline?: string | null;
  publishedAt?: Date | null;
  archivedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnlassraumSourceLinkDoc {
  _id?: ObjectId;
  anlassraumId: ObjectId;
  ingestItemId?: ObjectId | null;
  statementCandidateId?: ObjectId | null;
  sourceUrl?: string | null;
  sourceWeight: number;
  role: AnlassraumSourceRole;
  publisher?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnlassraumStructureDoc {
  _id?: ObjectId;
  anlassraumId: ObjectId;
  claims: StatementRecord[];
  notes: NoteRecord[];
  questions: QuestionRecord[];
  knots: KnotRecord[];
  segments: string[];
  actors: string[];
  evidenceSummary?: string | null;
  riskFlags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OutputSeedDoc {
  _id?: ObjectId;
  anlassraumId: ObjectId;
  outputType: OutputSeedType;
  status: OutputSeedStatus;
  targetRegion?: RegionCode | null;
  targetAudience?: string | null;
  reviewState: OutputSeedReviewState;
  publishTarget?: string | null;
  reviewNote?: string | null;
  lastAction?: string | null;
  lastActionBy?: string | null;
  lastActionAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
