import { getConn } from "@/lib/triMongo";
import { Schema } from "mongoose";

const SubmissionArchiveSchema = new Schema({
  submissionId:   { type: String, required: true },  // your synthetic id/trace
  authorPseudoId: { type: String, required: false }, // hashed/pseudonymized
  locale:         { type: String, default: "de" },
  originalText:   { type: String, required: true },  // (can be encrypted at rest)
  archivedAt:     { type: Date, default: () => new Date() },
});

export default async function SubmissionArchiveModel() {
  const conn = await getConn("votes");
  return conn.models.SubmissionArchive || conn.model("SubmissionArchive", SubmissionArchiveSchema);
}
