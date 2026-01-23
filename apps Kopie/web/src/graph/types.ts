export type Id = string;

export type User = { id: Id; name: string; locale?: string };
export type Topic = { id: Id; name: string; class?: string };
export type Region = {
  id: Id;
  code: string;
  name: string;
  scope: "communal" | "regional" | "national" | "eu" | "g7" | "nato" | "global";
};
export type Statement = { id: Id; title: string; text: string; lang: string };
export type Report = { id: Id; title: string; summary?: string };
export type Vote = {
  id: Id;
  value: "agree" | "reject" | "neutral";
  userId: Id;
  statementId: Id;
  ts: string;
};

export interface GraphRepo {
  ensureSchema(): Promise<void>;
  upsertUser(u: User): Promise<void>;
  upsertTopic(t: Topic): Promise<void>;
  upsertRegion(r: Region): Promise<void>;
  upsertStatement(s: Statement): Promise<void>;
  upsertReport(r: Report): Promise<void>;
  relateStatementTopic(statementId: Id, topicId: Id): Promise<void>;
  relateStatementRegion(statementId: Id, regionId: Id): Promise<void>;
  relateReportStatement(reportId: Id, statementId: Id): Promise<void>;
  createVote(v: Vote): Promise<void>;
}
