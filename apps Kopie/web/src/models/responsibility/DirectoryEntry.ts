import { Schema, Document } from "mongoose";
import { coreConn } from "@/lib/db/core";
import { modelOn } from "@/lib/db/modelOn";

const levels = [
  "municipality",
  "district",
  "state",
  "federal",
  "eu",
  "ngo",
  "private",
  "unknown",
] as const;

export type ResponsibilityLevel = (typeof levels)[number];

export interface ResponsibilityDirectoryEntryDoc extends Document {
  actorKey: string;
  level: ResponsibilityLevel;
  locale: string;
  regionCode?: string;
  displayName: string;
  description?: string;
  contactUrl?: string;
  meta?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

const ResponsibilityDirectoryEntrySchema = new Schema<ResponsibilityDirectoryEntryDoc>(
  {
    actorKey: { type: String, required: true, unique: true, trim: true },
    level: { type: String, enum: levels, required: true },
    locale: { type: String, default: "de" },
    regionCode: { type: String, trim: true },
    displayName: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    contactUrl: { type: String, trim: true },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

ResponsibilityDirectoryEntrySchema.index({ level: 1, locale: 1 });

const conn = coreConn();

export default modelOn<ResponsibilityDirectoryEntryDoc>(
  conn,
  "ResponsibilityDirectoryEntry",
  ResponsibilityDirectoryEntrySchema,
  "responsibilityDirectory",
);
