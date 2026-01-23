import { z } from "zod";
import { Connection, Model, Schema } from "mongoose";

export type QuickSignupDoc = {
  _id: any;
  createdAt: Date;
  name?: string | null;
  email?: string | null;
  consent: boolean;
  source: string;
  ip?: string | null;
  userAgent?: string | null;
  userId?: string | null;
};

// Zod-Schema (für Request-Validierung etc.)
export const QuickSignupZod = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  consent: z.boolean().default(false),
  source: z.string().min(1),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
  userId: z.string().optional(),
});

// Mongoose-Schema (DAS gehört in conn.model, nicht das Zod-Schema)
export const QuickSignupSchema = new Schema<QuickSignupDoc>(
  {
    name: { type: String, default: null },
    email: { type: String, default: null },
    consent: { type: Boolean, required: true },
    source: { type: String, required: true },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    userId: { type: String, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

export function getQuickSignupModel(conn: Connection): Model<QuickSignupDoc> {
  return (
    (conn.models.QuickSignup as Model<QuickSignupDoc>) ||
    conn.model<QuickSignupDoc>("QuickSignup", QuickSignupSchema, "quick_signups")
  );
}
