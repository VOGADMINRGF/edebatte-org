export type FeedBatchItem = {
  sourceId?: string;
  url: string;
  title?: string;
  summary?: string;
  content?: string;
  publishedAt?: string;
  language?: string;
  topicHint?: string;
};

export type StatementCandidate = {
  id: string;
  sourceUrl: string;
  title?: string;
  summary?: string;
  content?: string;
  publishedAt?: string;
  canonicalHash: string;
  deduped: boolean;
  createdAt: string;
  region?: string;
  topic?: string;
  priorityScore?: number;
  // claims: später über analyzeContribution angehängt
};
