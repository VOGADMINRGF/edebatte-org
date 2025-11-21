import type { Collection } from "mongodb";
import { coreCol } from "@core/db/triMongo";

export type EditorialReportDoc = {
  _id?: string;
  submissionId?: string;
  trace: string;
  userNote: string;
  flags: Array<Record<string, unknown>>;
  createdAt: Date;
};

export async function getEditorialReportCollection(): Promise<Collection<EditorialReportDoc>> {
  return coreCol<EditorialReportDoc>("editorialreports");
}
