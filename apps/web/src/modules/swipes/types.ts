// features/swipes/types.ts

// eDebatte-Paket aus Account-Kontext
export type EDebattePackage = "basis" | "start" | "pro" | "none";

export type SwipeDecision = "agree" | "neutral" | "disagree";

export type SwipeScopeLevel = "Bund" | "Land" | "Kommune" | "EU";

export type SwipeItem = {
  id: string; // Statement-ID
  title: string;
  category: string;
  level: SwipeScopeLevel;
  topicTags: string[];
  evidenceCount: number;
  responsibilityLabel: string;
  domainLabel: string;
  hasEventualities: boolean;
  eventualitiesCount: number;
};

export type Eventuality = {
  id: string; // Eventualitäten-ID
  title: string;
  shortLabel?: string;
  description?: string;
};

export type SwipeFeedFilter = {
  topicQuery?: string;
  level?: SwipeScopeLevel | "ALL";
  statementId?: string;
};

export type SwipeFeedRequest = {
  userId: string;
  edebattePackage: EDebattePackage;
  filter?: SwipeFeedFilter;
  cursor?: string | null;
  limit?: number;
};

export type SwipeFeedResponse = {
  items: SwipeItem[];
  nextCursor?: string | null;
};

export type EventualitiesRequest = {
  userId: string;
  statementId: string;
};

export type EventualitiesResponse = {
  statementId: string;
  eventualities: Eventuality[];
};

// Vote-Endpoint
export type SwipeVotePayload = {
  userId: string;
  statementId: string;
  eventualityId?: string; // optional: Vote auf konkrete Eventualität
  decision: SwipeDecision;
  source: "swipes";
};
