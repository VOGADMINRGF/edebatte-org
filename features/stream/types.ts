import type { ObjectId } from "@core/db/triMongo";

export type StreamVisibility = "public" | "unlisted";
export type StreamAgendaKind = "statement" | "question" | "poll" | "info";
export type StreamAgendaStatus = "queued" | "live" | "archived" | "skipped";
export type StreamSessionStatus = "draft" | "scheduled" | "live" | "ended" | "cancelled";
export type StreamAttributionMode = "hidden" | "creator_only" | "public";

export interface StreamSessionDoc {
  _id?: ObjectId;
  creatorId: string;
  title: string;
  description?: string | null;
  regionCode?: string | null;
  topicKey?: string | null;
  visibility: StreamVisibility;
  status?: StreamSessionStatus;
  isLive: boolean;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date | null;
  endedAt?: Date | null;
}

export interface StreamAgendaItemDoc {
  _id?: ObjectId;
  sessionId: ObjectId;
  creatorId: string;
  kind: StreamAgendaKind;
  status: StreamAgendaStatus;
  order?: number;
  statementId?: string | null;
  evidenceClaimId?: ObjectId | null;
  reportId?: string | null;
  customQuestion?: string | null;
  description?: string | null;
  pollOptions?: string[];
  allowAnonymousVoting: boolean;
  publicAttribution: StreamAttributionMode;
  activeSince?: Date | null;
  archivedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StreamOverlayItem {
  id: string;
  kind: StreamAgendaKind;
  title: string;
  body?: string | null;
  pollOptions?: string[];
  allowAnonymousVoting: boolean;
  publicAttribution: StreamAttributionMode;
  pollTotals?: Record<string, number>;
}

export interface StreamOverlayState {
  sessionId: ObjectId;
  items: StreamOverlayItem[];
  updatedAt: Date;
}

export function resolveSessionStatus(
  session: Pick<StreamSessionDoc, "status" | "isLive" | "endedAt">,
): StreamSessionStatus {
  if (
    session.status === "draft" ||
    session.status === "scheduled" ||
    session.status === "live" ||
    session.status === "ended" ||
    session.status === "cancelled"
  ) {
    return session.status;
  }
  if (session.isLive) return "live";
  if (session.endedAt) return "ended";
  return "draft";
}
