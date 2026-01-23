//apps/web/src/models/core/Event.ts
import { mongoose, mongo } from "@core/mongoose";
import type { Model } from "mongoose";

/** Plain-Datenform (kein Document-Mix) */
export interface EventDoc {
  title: string;
  description?: string;
  startAt: Date;
  endAt?: Date;
  tags?: string[];
  organizationId?: string;
  location?: { type: "Point"; coordinates: [number, number] };
  createdAt?: Date;
  updatedAt?: Date;
}

// �  keine <EventDoc>-Generics an untypisierte Instanz hängen
const EventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 4000 },
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date },
    tags: { type: [String], default: undefined },
    organizationId: { type: String, index: true },
    location: {
      type: { type: String, enum: ["Point"], default: undefined },
      coordinates: {
        type: [Number],
        validate: {
          validator: (v: number[]) => Array.isArray(v) && v.length === 2,
          message: "coordinates must be [lng, lat]",
        },
        default: undefined,
      },
    },
  },
  { timestamps: true, minimize: true, versionKey: false },
);

EventSchema.index({ location: "2dsphere" });
EventSchema.index({ organizationId: 1, startAt: -1 });
EventSchema.set("toJSON", { versionKey: false, virtuals: true });

export async function EventModel(): Promise<Model<any>> {
  await mongo();
  const existing = (mongoose.models.Event as Model<any>) || undefined;
  return existing ?? mongoose.model("Event", EventSchema);
}
