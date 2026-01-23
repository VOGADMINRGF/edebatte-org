// apps/web/src/models/core/Stream.ts
import { Schema, Document } from "mongoose";
import { coreConn } from "@/lib/db/core";
import { modelOn } from "@/lib/db/modelOn";

export interface IStream extends Document {
  key: string;
  title: string;
  description?: string;
  languages?: string[];
  regionScope?: Array<{ iso?: string; name: string }>;
  tags?: string[];
  status?: "draft" | "active" | "archived";
  featured?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StreamSchema = new Schema<IStream>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    languages: [{ type: String, trim: true }],
    regionScope: [
      {
        iso: { type: String, trim: true },
        name: { type: String, required: true, trim: true },
      },
    ],
    tags: [{ type: String, trim: true, lowercase: true }],
    status: {
      type: String,
      enum: ["draft", "active", "archived"],
      default: "active",
      index: true,
    },
    featured: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

StreamSchema.index({ featured: 1, updatedAt: -1 });
export default modelOn<IStream>(conn, "Stream", StreamSchema, "streams");
