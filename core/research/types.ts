import type { ObjectId } from "mongodb";

export type ResearchTaskKind = "question" | "knot" | "eventuality" | "custom";
export type ResearchTaskLevel = "basic" | "advanced" | "expert";
export type ResearchTaskStatus = "open" | "in_progress" | "completed" | "archived";

export interface ResearchTaskSource {
  statementId?: string;
  contributionId?: string;
  analyzeJobId?: string;
  questionId?: string;
  knotId?: string;
  eventualityId?: string;
}

export interface ResearchTaskDossierBinding {
  dossierId: string;
  dossierRevisionSeq: number;
  dossierRevisionHash: string;
}

export interface ResearchTask {
  id?: string;
  kind?: ResearchTaskKind;
  source?: ResearchTaskSource;
  title: string;
  description?: string;
  hints?: string[];
  level?: ResearchTaskLevel;
  status?: ResearchTaskStatus;
  createdBy?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  dueAt?: Date | string | null;
  tags?: string[];
  dossierBinding?: ResearchTaskDossierBinding;
}

export type ResearchContributionStatus = "submitted" | "accepted" | "rejected";

export interface ResearchSourceLink {
  label: string;
  url?: string;
}

export interface ResearchContribution {
  id?: string;
  taskId: string;
  authorId: string;
  summary: string;
  details?: string;
  sources?: ResearchSourceLink[];
  status?: ResearchContributionStatus;
  reviewNote?: string;
  feedbackHelpful?: boolean | null;
  feedbackNote?: string | null;
  feedbackBy?: string | null;
  feedbackAt?: Date | string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  acceptedAt?: Date | string | null;
  rejectedAt?: Date | string | null;
}

export interface ResearchContributionDoc
  extends Omit<ResearchContribution, "id" | "taskId" | "authorId"> {
  _id: ObjectId;
  taskId: ObjectId;
  authorId: ObjectId;
}
