import type { ObjectId } from "@core/db/triMongo";

export const ENTITY_TYPES = [
  "municipality",
  "district",
  "government",
  "party",
  "organization",
  "association",
  "ngo",
  "company",
  "media",
  "initiative",
  "other",
  "political_party",
  "parliamentary_group",
  "parliamentary_caucus",
  "civic_initiative",
  "trade_union",
  "professional_association",
  "foundation",
  "public_administration",
  "ministry",
  "agency",
  "public_body",
  "research_institution",
  "media_publisher",
  "media_outlet",
  "public_broadcaster",
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export const ENTITY_SCOPES = ["local", "regional", "national", "eu", "global"] as const;
export type EntityScope = (typeof ENTITY_SCOPES)[number];

export const ENTITY_STATUSES = [
  "draft",
  "curated",
  "reviewed",
  "approved",
  "published",
  "archived",
] as const;
export type EntityStatus = (typeof ENTITY_STATUSES)[number];

export const ENTITY_OWNER_TYPES = [
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
  "user",
  "system",
  "other",
] as const;
export type EntityOwnerType = (typeof ENTITY_OWNER_TYPES)[number];

export interface EntityDoc {
  _id?: ObjectId;
  type: EntityType;
  slug: string;
  name: string;
  regionKey: string | null;
  scope: EntityScope;
  status: EntityStatus;
  ownerType: EntityOwnerType;
  ownerId: string;
  stewardUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date | null;
  publishedAt?: Date | null;
  archivedAt?: Date | null;
}
