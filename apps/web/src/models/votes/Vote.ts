import { Schema, Types } from "mongoose";
import { getDbs, safeModel } from "@/lib/triMongo";

const VoteSchema = new Schema(
  {
    statementId: { type: String, required: true, index: true },
    choice: { type: String, enum: ["yes", "no", "skip"], required: true },
    sessionId: { type: String, required: true }, // Pseudonym (kein PII)
  },
  { timestamps: true }
);

VoteSchema.index({ statementId: 1, sessionId: 1 }, { unique: true });

export type VoteDoc = {
  _id: Types.ObjectId;
  statementId: string;
  choice: "yes" | "no" | "skip";
  sessionId: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function VoteModel() {
  const { votes } = await getDbs();
  return safeModel<VoteDoc>(votes, "Vote", VoteSchema);
}
