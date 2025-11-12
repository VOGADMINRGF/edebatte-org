import { Schema, Types } from "mongoose";
import { getDbs, safeModel } from "@/lib/triMongo";

const OutlineItem = new Schema(
  {
    id: String,
    label: String,
    start: Number,
    end: Number,
    summary: String,
  },
  { _id: false }
);

const Claim = new Schema(
  {
    text: { type: String, required: true },
    sachverhalt: String,
    zeitraum: String,
    ort: String,
    zustaendigkeit: { type: String, enum: ["EU", "Bund", "Land", "Kommune", "-"], default: "-" },
    betroffene: [String],
    messgroesse: String,
    unsicherheiten: String,
    sources: [String],
    topic: String,
    followups: [String],
  },
  { _id: false }
);

const DraftSchema = new Schema(
  {
    status: { type: String, enum: ["draft", "analyzed", "published"], default: "draft", index: true },
    locale: { type: String, default: "de", index: true },
    text: { type: String, required: true },
    outline: [OutlineItem],
    claims: [Claim],
    sessionId: { type: String, index: true }, // keine PII
  },
  { timestamps: true }
);

DraftSchema.index({ createdAt: -1 });

export type DraftDoc = {
  _id: Types.ObjectId;
  status: "draft" | "analyzed" | "published";
  locale: "de" | "en";
  text: string;
  outline: Array<{ id: string; label: string; start: number; end: number; summary?: string }>;
  claims: Array<any>;
  sessionId?: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function DraftModel() {
  const { core } = await getDbs();
  return safeModel<DraftDoc>(core, "Draft", DraftSchema);
}
