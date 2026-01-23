// apps/web/src/models/core/Report.ts
// Migriert auf coreConn + modelOn
import { Schema, Document } from "mongoose";
import { coreConn } from "@/lib/db/core";
import { modelOn } from "@/lib/db/modelOn";
import { MediaItemSchema, type MediaItem } from "./MediaItem";

// --- Subschemas ---
const VotingRuleSchema = new Schema(
  {
    type: { type: String, default: "simple-majority", trim: true },
    description: { type: String, trim: true },
    weightMap: Schema.Types.Mixed,
    minQuorum: Number,
  },
  { _id: false },
);

const RegionObjSchema = new Schema(
  {
    ags: { type: String, trim: true },
    nuts1: { type: String, trim: true },
    nuts2: { type: String, trim: true },
    nuts3: { type: String, trim: true },
    iso: { type: String, trim: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, trim: true },
    population: { type: Number, min: 0 },
    areaKm2: { type: Number, min: 0 },
  },
  { _id: false },
);

const ReportChartSchema = new Schema(
  {
    type: { type: String, required: true, trim: true },
    data: { type: Schema.Types.Mixed, required: true },
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    source: { type: String, trim: true },
    colorscheme: { type: String, trim: true },
  },
  { _id: false },
);

const RegionalVoiceSchema = new Schema(
  {
    region: { type: String, trim: true },
    author: { type: String, trim: true },
    role: { type: String, trim: true },
    medium: { type: String, trim: true },
    verified: { type: Boolean, default: false },
    statement: { type: String, trim: true },
    impactAssessment: Schema.Types.Mixed,
    submittedAt: Date,
    redaktionFreigabe: { type: Boolean, default: false },
  },
  { _id: false },
);

// --- Hauptschema ---
const ReportSchema = new Schema(
  {
    statementIds: [{ type: String, trim: true }],
    statementId: { type: String, trim: true },
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, trim: true },
    summary: { type: String, required: true, trim: true },
    details: { type: String, trim: true },
    recommendation: { type: String, trim: true },
    topArguments: Schema.Types.Mixed,
    trends: [{ type: String, trim: true }],
    facts: [{ type: String, trim: true }],
    internationalComparison: [Schema.Types.Mixed],
    methodology: { type: String, trim: true },
    optAnalysis: Schema.Types.Mixed,
    regionalVoices: [RegionalVoiceSchema],
    voices: [Schema.Types.Mixed],
    charts: [ReportChartSchema],
    chartUrls: [Schema.Types.Mixed],
    media: [MediaItemSchema], // eigenes Subschema oder import
    images: [{ type: String, trim: true }], // Legacy
    imageUrl: { type: String, trim: true }, // Legacy
    trailerUrl: { type: String, trim: true },

    regionScope: { type: [RegionObjSchema], required: false },
    region: { type: String, trim: true },
    regions: [{ type: String, trim: true }],
    languages: [{ type: String, trim: true }],
    tags: [{ type: String, trim: true }],
    focusGroups: [{ type: String, trim: true }],
    sources: [{ type: Schema.Types.ObjectId, ref: "Source" }],
    relatedStatements: [{ type: String, trim: true }],
    relatedReports: [{ type: String, trim: true }],
    author: { type: String, trim: true },

    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    votingRule: {
      type: VotingRuleSchema,
      default: { type: "simple-majority" },
    },
    reportAvailable: { type: Boolean, default: false },
    redaktionFreigabe: { type: Boolean, default: false },
    reviewedBy: [{ type: String, trim: true }],
    reviewStatus: { type: String, trim: true },
    modLog: [Schema.Types.Mixed],
    version: { type: Number, default: 1 },
    deleted: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },

    // *** Analytics-Bereich ***
    analytics: Schema.Types.Mixed,
  },
  { timestamps: true },
);

// Indizes
ReportSchema.index({ createdAt: -1 });
ReportSchema.index({ status: 1 });
ReportSchema.index({ "regionScope.name": 1 });

export interface IRegionScope {
  ags?: string;
  nuts1?: string;
  nuts2?: string;
  nuts3?: string;
  iso?: string;
  name: string;
  type?: string;
  population?: number;
  areaKm2?: number;
}

export interface IReportChart {
  type: string;
  data: any;
  title?: string;
  description?: string;
  source?: string;
  colorscheme?: string;
}

export interface IRegionalVoice {
  region: string;
  author?: string;
  role?: string;
  medium?: string;
  verified?: boolean;
  statement: string;
  impactAssessment?: any;
  submittedAt?: Date;
  redaktionFreigabe?: boolean;
}

export interface IReport extends Document {
  statementIds: string[];
  statementId?: string;
  title: string;
  subtitle?: string;
  summary: string;
  details?: string;
  recommendation?: string;
  topArguments?: any;
  trends?: string[];
  facts?: string[];
  internationalComparison?: any[];
  methodology?: string;
  optAnalysis?: any;
  regionalVoices?: IRegionalVoice[];
  voices?: any[];
  charts?: IReportChart[];
  chartUrls?: any[];
  media?: MediaItem[];
  images?: string[];
  imageUrl?: string;
  trailerUrl?: string;
  regionScope?: IRegionScope[];
  region?: string;
  regions?: string[];
  languages?: string[];
  tags?: string[];
  focusGroups?: string[];
  sources?: any[];
  relatedStatements?: string[];
  relatedReports?: string[];
  author?: string;
  status?: string;
  votingRule?: any;
  reportAvailable?: boolean;
  redaktionFreigabe?: boolean;
  reviewedBy?: string[];
  reviewStatus?: string;
  modLog?: any[];
  version?: number;
  deleted?: boolean;
  archived?: boolean;
  analytics?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

// Export an coreConn binden
const conn = coreConn();
export default modelOn<IReport>(conn, "Report", ReportSchema, "reports");
