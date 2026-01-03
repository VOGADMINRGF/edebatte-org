import type { Collection, OptionalId } from "mongodb";
import { votesCol, ObjectId } from "@core/db/triMongo";

export type VoteChoice = "yes" | "no" | "skip" | string;

export type VoteDoc = {
  _id?: ObjectId;
  statementId: string | ObjectId;
  choice?: VoteChoice;
  /** legacy field name from VPM */
  vote?: VoteChoice;
  /** another legacy alias */
  value?: VoteChoice;
  sessionId?: string;
  userHash?: string;
  locale?: string;
  region?: { country?: string };
  day?: Date;
  deletedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  streamSessionId?: string | ObjectId | null;
  agendaItemId?: string | ObjectId | null;
  qrSetId?: string | ObjectId | null;
  qrQuestionId?: string | ObjectId | null;
};

export async function VoteModel(): Promise<Collection<VoteDoc>> {
  return votesCol<VoteDoc>("votes");
}

export async function insertVote(doc: OptionalId<VoteDoc>) {
  const votes = await VoteModel();
  return votes.insertOne({ ...doc, createdAt: doc.createdAt ?? new Date(), updatedAt: doc.updatedAt ?? new Date() });
}

export { ObjectId };
