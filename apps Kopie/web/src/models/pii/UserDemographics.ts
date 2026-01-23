import { Schema, Document, Types } from "mongoose";
import { piiConn } from "@lib/db/pii";
import { modelOn } from "@lib/db/modelOn";

// Wissenschaftlich brauchbare Felder (optional, sauber benannt)
const GENDERS = ["male", "female", "diverse", "n/a"] as const;
type Gender = (typeof GENDERS)[number];

export interface IUserDemographics extends Document {
  userId: { type: Schema.Types.ObjectId; ref: "UserProfile"; required: true };
  address?: {
    street?: string;
    houseNumber?: string;
    postalCode?: string;
    city?: string;
    region?: string;
    country?: string;
  };
  dateOfBirth?: Date; // **Date statt string**
  gender?: Gender;
  nationality?: string;
  education?: string; // ISCED optional später
  profession?: string; // Standardisierung später
  incomeGroup?: string; // z.B. Quintile oder Baskets
  householdSize?: number;
  // Forschungs-/Validitätsfelder (optional)
  householdChildren?: number;
  householdAdults?: number;
  residenceType?: "urban" | "suburban" | "rural";
  // Mitgliedschaften/Politik (nur mit Opt-in)
  partyMembership?: {
    partyId?: string;
    since?: Date;
    confirmed?: boolean;
    postIdentId?: string;
  };
  // Einwilligungen / Audit
  consentLog: Array<{
    date: Date;
    field: string;
    action: "given" | "revoked";
    details?: any;
  }>;
  // Survey-Metadaten (optional; für wissenschaftl. Auswertungen)
  surveyMeta?: {
    wave?: string; // z.B. "2025Q3"
    weight?: number; // Sampling-Gewicht
    mode?: "web" | "app" | "phone";
  };

  createdAt: Date;
  updatedAt: Date;
}

const UserDemographicsSchema = new Schema<IUserDemographics>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "UserProfile", required: true },
    address: {
      street: { type: String, default: null, trim: true },
      houseNumber: { type: String, default: null, trim: true },
      postalCode: { type: String, default: null, trim: true },
      city: { type: String, default: null, trim: true },
      region: { type: String, default: null, trim: true },
      country: { type: String, default: null, trim: true },
    },
    dateOfBirth: { type: Date, default: null }, // **Date**
    gender: { type: String, enum: GENDERS, default: "n/a" },
    nationality: { type: String, default: null, trim: true },
    education: { type: String, default: null, trim: true },
    profession: { type: String, default: null, trim: true },
    incomeGroup: { type: String, default: null, trim: true },
    householdSize: { type: Number, default: null, min: 1, max: 20 },
    householdChildren: { type: Number, default: null, min: 0, max: 20 },
    householdAdults: { type: Number, default: null, min: 0, max: 20 },
    residenceType: {
      type: String,
      enum: ["urban", "suburban", "rural"],
      default: null,
    },

    partyMembership: {
      partyId: { type: String, default: null, trim: true },
      since: { type: Date, default: null },
      confirmed: { type: Boolean, default: false },
      postIdentId: { type: String, default: null, trim: true },
    },

    consentLog: {
      type: [
        {
          date: { type: Date, required: true },
          field: { type: String, required: true },
          action: { type: String, enum: ["given", "revoked"], required: true },
          details: { type: Schema.Types.Mixed, default: null },
        },
      ],
      default: [],
    },

    surveyMeta: {
      wave: { type: String, default: null, trim: true },
      weight: { type: Number, default: null, min: 0 },
      mode: { type: String, enum: ["web", "app", "phone"], default: "web" },
    },
  },
  { timestamps: true },
);

// Indizes
UserDemographicsSchema.index({ userId: 1 }); // 1:1 zu UserProfile
UserDemographicsSchema.index({ "address.country": 1, "address.region": 1 });
UserDemographicsSchema.index({ gender: 1 });
UserDemographicsSchema.index({ "surveyMeta.wave": 1 });
export default modelOn(
  conn,
  "UserDemographics",
  UserDemographicsSchema,
  "user_demographics",
);
