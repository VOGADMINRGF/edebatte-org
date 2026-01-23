// apps/web/src/models/core/VotingRule.ts
import { Schema } from "mongoose";

export type VotingRuleType =
  | "simple-majority"
  | "absolute-majority"
  | "two-thirds"
  | "unanimity"
  | "weighted"
  | "payroll-weighted"
  | "custom";

export interface VotingRule {
  type: VotingRuleType;
  description?: string;
  weightMap?: Record<string, number>;
  minQuorum?: number;
}

export const VotingRuleSchema = new Schema<VotingRule>(
  {
    type: {
      type: String,
      enum: [
        "simple-majority",
        "absolute-majority",
        "two-thirds",
        "unanimity",
        "weighted",
        "payroll-weighted",
        "custom",
      ],
      required: true,
      default: "simple-majority",
      index: true,
    },
    description: { type: String, trim: true },
    weightMap: { type: Object },
    minQuorum: { type: Number, min: 0 },
  },
  { _id: false },
);
