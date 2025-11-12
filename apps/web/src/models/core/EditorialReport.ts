import { getConn } from "@/lib/triMongo";
import { Schema } from "mongoose";

const EditorialReportSchema = new Schema({
  submissionId: { type: String, required: false }, // optional link to an archive id
  trace:        { type: String, required: true },
  userNote:     { type: String, default: "" },
  flags:        { type: [Object], default: [] },   // [{type,match,start,end}]
  createdAt:    { type: Date, default: () => new Date() },
});

export default async function EditorialReportModel() {
  const conn = await getConn("core");
  return conn.models.EditorialReport || conn.model("EditorialReport", EditorialReportSchema);
}
