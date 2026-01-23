// apps/web/src/models/core/Contribution.ts
// Finale Version (Core-DB, TS, mit deinen Indizes)
import { Schema, Document } from "mongoose";
import { coreConn } from "@/lib/db/core";
import { modelOn } from "@/lib/db/modelOn";

// --- MediaObject (separat zu MediaItem: hier eher Uploads/OCR) ---
// --- Provenance/Audit ---
const ProvenanceEntrySchema = new Schema(
  {
    by: { type: String, required: true, trim: true }, // userPublicId / service
    action: { type: String, required: true, trim: true }, // created|edited|moderated|ai-annotated|published|archived
    date: { type: Date, default: Date.now },
    notes: { type: String, trim: true },
    meta: { type: Schema.Types.Mixed },
  },
  { _id: false },
);

// TTL-Beispiel (1 Jahr) – aus deinem Ausschnitt:
ProvenanceEntrySchema.index(
  { date: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 365 },
);

// --- Hauptschema ---
export interface IContribution extends Document {
  authorId: string; // pseudonymisierte Nutzer-ID (keine PII)
  content: string;
  summary?: string;
  media?: Array<{
    type: string;
    url: string;
    filename?: string;
    size?: number;
    mimeType?: string;
    previewUrl?: string;
    extractedText?: string;
  }>;
  language?: string; // detected/original
  status?: "draft" | "pending" | "review" | "published" | "archived";
  reviewStatus?: "none" | "queued" | "in-review" | "approved" | "rejected";
  userContext?: {
    region?: string; // z. B. "DE-BE"
    country?: string; // ISO
    locale?: string; // "de", "en"
    client?: "web" | "mobile" | "api";
  };
  analysis?: {
    topics?: string[];
    keyPhrases?: string[];
    sentiment?: number; // -1..1
    entities?: Array<{ text: string; type?: string; score?: number }>;
    language?: string;
    factsExtracted?: Array<{ text: string; sourceUrl?: string }>;
  };
  provenance?: Array<{
    by: string;
    action: string;
    date: Date;
    notes?: string;
    meta?: any;
  }>;
  createdAt: Date;
  updatedAt?: Date;
}

const ContributionSchema = new Schema<IContribution>(
  {
    authorId: { type: String, required: true, index: true },
    content: { type: String, required: true },
    summary: { type: String },
    media: [MediaObjectSchema],
    language: { type: String, trim: true },

    status: {
      type: String,
      enum: ["draft", "pending", "review", "published", "archived"],
      default: "pending",
      index: true,
    },
    reviewStatus: {
      type: String,
      enum: ["none", "queued", "in-review", "approved", "rejected"],
      default: "none",
      index: true,
    },

    userContext: {
      region: { type: String, trim: true, index: true },
      country: { type: String, trim: true },
      locale: { type: String, trim: true },
      client: { type: String, enum: ["web", "mobile", "api"], default: "web" },
    },

    analysis: {
      topics: [{ type: String, trim: true }],
      keyPhrases: [{ type: String, trim: true }],
      sentiment: { type: Number, min: -1, max: 1 },
      entities: [
        {
          text: { type: String, trim: true },
          type: { type: String, trim: true },
          score: { type: Number, min: 0, max: 1 },
        },
      ],
      language: { type: String, trim: true },
      factsExtracted: [
        {
          text: { type: String, trim: true },
          sourceUrl: { type: String, trim: true },
        },
      ],
    },

    provenance: [ProvenanceEntrySchema],

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
  },
  { timestamps: true },
);

// --- Indizes (deine + sinnvolle Ergänzungen) ---
ContributionSchema.index({ status: 1, reviewStatus: 1, createdAt: -1 });
ContributionSchema.index({ "analysis.topics": 1, "userContext.region": 1 });
ContributionSchema.index({
  content: "text",
  summary: "text",
  "media.extractedText": "text",
});
ContributionSchema.index({ authorId: 1, createdAt: -1 });
ContributionSchema.index({ "provenance.by": 1, "provenance.date": -1 });

// Export
export default modelOn<IContribution>(
  conn,
  "Contribution",
  ContributionSchema,
  "contributions",
);
