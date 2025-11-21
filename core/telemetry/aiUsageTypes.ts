// core/telemetry/aiUsageTypes.ts

export type AiProviderName =
  | "openai"
  | "anthropic"
  | "mistral"
  | "gemini"
  | "youcom";

export type AiPipelineName =
  | "contribution_analyze"
  | "feeds_analyze"
  | "feeds_to_statementCandidate"
  | "factcheck"
  | "news_factcheck"
  | "report_summarize"
  | "content_translate"
  | "content_summarize_news"
  | "orchestrator_smoke"
  | "other";

export interface AiUsageEvent {
  _id?: string;
  createdAt: Date;

  provider: AiProviderName;
  model: string;
  pipeline: AiPipelineName;

  userId?: string | null;
  tenantId?: string | null;
  region?: string | null;
  locale?: string | null;

  tokensInput: number;
  tokensOutput: number;
  costEur: number;

  durationMs: number;
  success: boolean;
  errorKind?: string | null;
}

export interface AiUsageDailyRow {
  date: string; // YYYY-MM-DD
  provider: AiProviderName;
  pipeline: AiPipelineName;
  region?: string | null;

  tokensTotal: number;
  costTotalEur: number;
  callsTotal: number;
  callsError: number;
}
