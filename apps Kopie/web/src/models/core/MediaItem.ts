// apps/web/src/models/core/MediaItem.ts
import { Schema } from "mongoose";

export type MediaKind = "image" | "video" | "audio" | "other";

export interface MediaItem {
  src: string;
  alt?: string; // manuell vergeben
  gptSuggestedAlt?: string; // KI-Vorschlag
  approvedAlt?: string; // redaktionell bestätigt
  type?: MediaKind;
  createdBy?: string;
  createdAt?: Date;
}

export const MediaItemSchema = new Schema<MediaItem>(
  {
    src: { type: String, required: true, trim: true },
    alt: { type: String, trim: true },
    gptSuggestedAlt: { type: String, trim: true },
    approvedAlt: { type: String, trim: true },
    type: {
      type: String,
      enum: ["image", "video", "audio", "other"],
      default: "image",
    },
    createdBy: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);
