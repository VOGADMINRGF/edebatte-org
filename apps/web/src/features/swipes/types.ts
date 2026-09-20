// features/swipes/types.ts

// eDebatte-Paket aus Account-Kontext
export type EDebattePackage =
  | "basis"
  | "start"
  | "pro"
  | "b2b_basis"
  | "b2b_pro"
  | "b2g_basis"
  | "b2g_pro"
  | "none";

export type SwipeDecision = "agree" | "neutral" | "disagree";

export type SwipeNeutralReason =
  | "missing_sources"
  | "responsibility_unclear"
  | "impacts_unclear"
  | "missing_option"
  | "decide_later";

export type SwipeScopeLevel = "Bund" | "Land" | "Kommune" | "EU";
export type PublicTopicSupplyBucket =
  | "public_general"
  | "public_recent"
  | "regional"
  | "organization"
  | "from_create"
  | "from_feed"
  | "from_dossier"
  | "needs_review";
export type SwipeSourceKind = "proposal" | "feed" | "dossier" | "anlassraum" | "create" | "seed";

/**
 * Evidenzstatus einer möglichen Folge. `supported` und `mixed` benötigen im
 * Finalizer konkrete sourceRefs. `unverified`/`hypothesis` dürfen nie als
 * gesicherte Kausalprognose dargestellt werden.
 */
export type SwipeConsequenceEvidenceStatus = "supported" | "mixed" | "unverified" | "hypothesis";

export type SwipeConsequence = {
  /** Kurze, menschlich lesbare Folge; keine Prognosebehauptung ohne Evidenz. */
  title: string;
  /** Optionaler Kontext, Unsicherheit oder Mechanismus hinter der Folge. */
  detail?: string;
  /** Expliziter Evidenzstatus, sobald eine Folge aus einem Runtime-Finalizer stammt. */
  evidenceStatus?: SwipeConsequenceEvidenceStatus;
  /** Stabile Provenienz-/Evidenzreferenzen, keine frei erfundenen URLs. */
  sourceRefs?: string[];
};

export type SwipeDecisionConsequences = {
  /** Mögliche Folgen, wenn die Frage eher mit Ja beantwortet wird. */
  agree: SwipeConsequence[];
  /** Mögliche Folgen, wenn die Frage eher mit Nein beantwortet wird. */
  disagree: SwipeConsequence[];
};

export type SwipeItem = {
  id: string; // Statement-ID
  title: string;
  /** Optionaler Volltext fuer Detail-/Dossier-Ansicht und Swipe-Excerpt. */
  text?: string;
  /** Kurzer Alltags-/Problemkontext vor der eigentlichen Entscheidung. */
  humanContext?: string;
  /** Der zentrale Zielkonflikt, möglichst ohne eine Seite sprachlich zu bevorzugen. */
  tradeoff?: string;
  /** Richtungsbezogene mögliche Folgen. Maximal 5 je Richtung in der kompakten Swipe-UI. */
  decisionConsequences?: SwipeDecisionConsequences;
  category: string;
  level: SwipeScopeLevel;
  topicTags: string[];
  evidenceCount: number;
  responsibilityLabel: string;
  domainLabel: string;
  hasEventualities: boolean;
  eventualitiesCount: number;
  sourceType?: SwipeSourceKind;
  sourceLabel?: string | null;
  sourceDraftId?: string | null;
  anlassraumId?: string | null;
  contextHref?: string | null;
  dossierHref?: string | null;
  statusLabel?: string | null;
  statusHint?: string | null;
  supplyBuckets?: PublicTopicSupplyBucket[];
  supplyLabel?: string | null;
  supplyHint?: string | null;
  fromDraftMatch?: boolean;
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
  fromDraftId?: string;
  regionId?: string;
  viewerRegionIds?: string[];
  organizationId?: string;
  organizationIds?: string[];
  adminContext?: boolean;
  reviewContext?: boolean;
};

export type SwipeFeedRequest = {
  userId?: string;
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
  userId?: string;
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
  neutralReason?: SwipeNeutralReason;
  variantWeight?: 1 | 3 | 5;
  variantReason?: string;
  variantRankedIds?: string[];
  excludedEventualityIds?: string[];
  source: "swipes";
};
