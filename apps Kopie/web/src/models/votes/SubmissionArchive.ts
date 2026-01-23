import type { Collection } from "mongodb";
import { votesCol } from "@core/db/triMongo";

export type SubmissionArchiveDoc = {
  _id?: string;
  submissionId: string;
  authorPseudoId?: string;
  locale: string;
  originalText: string;
  archivedAt: Date;
};

export async function getSubmissionArchiveCollection(): Promise<Collection<SubmissionArchiveDoc>> {
  return votesCol<SubmissionArchiveDoc>("submissionarchives");
}
