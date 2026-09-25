import mongoose, { Schema } from "mongoose";
import { ORGANIZATION_STORAGE_TYPES } from "../registryContract";

const OrgSchema = new Schema({
  name: { type: String, required: true },
  type: {
    type: String,
    enum: [...ORGANIZATION_STORAGE_TYPES],
    required: true,
  },
  canonicalId: { type: String, trim: true, index: true, sparse: true },
  localeTags: [{ type: String, trim: true }],
  jurisdictionIds: [{ type: String, trim: true }],
  verified: { type: Boolean, default: false },
  region: String,
  premium: { type: Boolean, default: false },
  members: [{ userId: String, subRole: String }], // UserID + Rolle in Org
  limits: {
    reportsPerMonth: { type: Number, default: 10 },
    teamSize: { type: Number, default: 5 }
  },
  auditTrail: [{
    date: Date,
    action: String,
    details: Schema.Types.Mixed
  }],
}, { timestamps: true });

export default mongoose.models.Organization || mongoose.model("Organization", OrgSchema);
