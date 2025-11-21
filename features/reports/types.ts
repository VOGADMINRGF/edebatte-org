// apps/web/src/features/reports/types.ts

export type RegionCode = string; // z.B. "DE-BB", "DE-BE", ...

export type TopicDecisionSummary = {
  yesShare: number;
  noShare: number;
  abstainShare?: number;
  decidedAt?: string | null;
  majorityKind?: string;
};

export type TopicReport = {
  id: string;
  label: string;
  description: string;
  statements: number;
  evidenceSlots: number;
  openQuestions: number;
  countries: string[];
  lastUpdated: string; // ISO-Date
  regionCode: RegionCode;
  rank: number; // 1 = meist diskutiert
  decisionSummary?: TopicDecisionSummary | null;
  newsSourceCount?: number;
};

export type RegionReportOverview = {
  region: RegionCode;
  topics: TopicReport[];
  generatedAt: string;
};
