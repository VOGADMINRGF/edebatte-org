import { Schema, Document } from "mongoose";
import { coreCol } from "@core/db/triMongo";
import { modelOn } from "src/lib/db/modelOn";

export type SourceType =
  | "ngo"
  | "gov"
  | "mainstream"
  | "local"
  | "academic"
  | "thinktank"
  | "blog"
  | "other";

export type SourceKind = "USER" | "NEWS" | "SOCIAL" | "API" | "SYSTEM";

export interface ISource extends Document {
  // Basis
  name: string;
  url?: string;
  type?: SourceType; // redaktionale Kategorie

  // NEU: technische Herkunft/Zuordnung
  kind?: SourceKind; // USER/NEWS/SOCIAL/API/SYSTEM
  provider?: string; // z.B. "twitter", "rss", "partnerX"
  extId?: string; // externe ID beim Provider (Tweet-ID, Feed-ID)

  // NEU: Normalisierung für Geo/Sprache/Domäne
  domain?: string; // "example.com" (lowercase)
  language?: string; // BCP-47 kurz, z.B. "de", "en"
  countryCode?: string; // ISO2, z.B. "DE"

  // Legacy/Fachliches (kann bleiben)
  country?: string; // frei (DE/DEU); behalten für Abwärtskompatibilität
  trustScore?: number; // 0..100
  tags?: string[];

  createdAt?: Date;
  updatedAt?: Date;
}

const SourceSchema = new Schema<ISource>(
  {
    name: { type: String, required: true, trim: true },

    url: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/i, "url must start with http(s)://"],
    },

    type: {
      type: String,
      enum: [
        "ngo",
        "gov",
        "mainstream",
        "local",
        "academic",
        "thinktank",
        "blog",
        "other",
      ],
      default: "other",
      index: true,
    },

    // NEU
    kind: {
      type: String,
      enum: ["USER", "NEWS", "SOCIAL", "API", "SYSTEM"],
      default: "NEWS",
      index: true,
    },
    provider: { type: String, trim: true, lowercase: true },
    extId: { type: String, trim: true },

    domain: { type: String, trim: true, lowercase: true },
    language: { type: String, trim: true, lowercase: true }, // "de", "en", "fr" …
    countryCode: { type: String, trim: true, uppercase: true }, // "DE"

    // Legacy/Fachliches
    country: { type: String, trim: true, uppercase: true }, // bleibt für Altbestände
    trustScore: { type: Number, min: 0, max: 100, default: 50 },
    tags: [{ type: String, trim: true, lowercase: true }],
  },
  { timestamps: true },
);

// --- Normalisierung/Guards ---
SourceSchema.pre("save", function (next) {
  // @ts-ignore
  if (this.domain) this.domain = String(this.domain).toLowerCase();
  // @ts-ignore
  if (this.provider) this.provider = String(this.provider).toLowerCase();
  // @ts-ignore
  if (this.language) this.language = String(this.language).toLowerCase();
  // @ts-ignore
  if (this.countryCode)
    this.countryCode = String(this.countryCode).toUpperCase();
  next();
});

// (leichtes) Pattern-Checking
SourceSchema.path("language").validate({
  validator: (v: string | undefined) =>
    !v || /^[a-z]{2}(-[a-z0-9]{2,8})?$/i.test(v),
  message: "language must be BCP-47 like 'de' or 'en-GB'",
});
SourceSchema.path("countryCode").validate({
  validator: (v: string | undefined) => !v || /^[A-Z]{2}$/.test(v),
  message: "countryCode must be ISO2 like 'DE'",
});
SourceSchema.path("domain").validate({
  validator: (v: string | undefined) =>
    !v || /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(v),
  message: "domain must be like 'example.com'",
});

// --- Indizes ---
// Suche/Fachliches
SourceSchema.index({ name: 1, country: 1 });
SourceSchema.index({ tags: 1 });
SourceSchema.index({ trustScore: -1 });
SourceSchema.index({ name: "text", tags: "text" });

// URL, wenn vorhanden, eindeutig
SourceSchema.index(
  { url: 1 },
  {
    name: "url_unique_if_set",
    unique: true,
    partialFilterExpression: { url: { $type: "string" } },
  },
);

// NEU: technische/operativ sinnvolle Indizes
SourceSchema.index({ domain: 1 });
SourceSchema.index({ countryCode: 1, language: 1 });
SourceSchema.index({ provider: 1, kind: 1 }); // Provider-Profil je Kind
SourceSchema.index(
  { kind: 1, provider: 1, extId: 1 },
  { unique: true, sparse: true }, // harte Idempotenz pro Provider/ExtId (wenn extId gesetzt)
);

// Export
export default modelOn<ISource>(conn, "Source", SourceSchema, "sources");
