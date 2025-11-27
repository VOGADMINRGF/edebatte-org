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
  createdAt?: Date | string;
  updatedAt?: Date | string;
  acceptedAt?: Date | string | null;
  rejectedAt?: Date | string | null;
}
