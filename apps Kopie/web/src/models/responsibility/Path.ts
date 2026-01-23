import { Schema, Document } from "mongoose";
import { coreConn } from "@/lib/db/core";
import { modelOn } from "@/lib/db/modelOn";
import type { ResponsibilityLevel } from "./DirectoryEntry";

export interface ResponsibilityPathNodeDoc {
  level: ResponsibilityLevel;
  actorKey: string;
  displayName: string;
  description?: string;
  contactUrl?: string;
  processHint?: string;
  relevance?: number;
}

export interface ResponsibilityPathDoc extends Document {
  statementId: string;
  locale: string;
  nodes: ResponsibilityPathNodeDoc[];
  createdAt?: Date;
  updatedAt?: Date;
}

const ResponsibilityPathNodeSchema = new Schema<ResponsibilityPathNodeDoc>(
  {
    level: {
      type: String,
      enum: [
        "municipality",
        "district",
        "state",
        "federal",
        "eu",
        "ngo",
        "private",
        "unknown",
      ],
      required: true,
    },
    actorKey: { type: String, required: true, trim: true },
    displayName: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    contactUrl: { type: String, trim: true },
    processHint: { type: String, trim: true },
    relevance: { type: Number, min: 0, max: 1 },
  },
  { _id: false },
);

const ResponsibilityPathSchema = new Schema<ResponsibilityPathDoc>(
  {
    statementId: { type: String, required: true },
    locale: { type: String, default: "de" },
    nodes: { type: [ResponsibilityPathNodeSchema], default: [] },
  },
  { timestamps: true },
);

ResponsibilityPathSchema.index({ statementId: 1, locale: 1 }, { unique: true });

const conn = coreConn();

export default modelOn<ResponsibilityPathDoc>(
  conn,
  "ResponsibilityPath",
  ResponsibilityPathSchema,
  "responsibilityPaths",
);
