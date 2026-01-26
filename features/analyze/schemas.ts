import { z } from "zod";
import { I18nStringSchema } from "@features/i18n/i18nText";

/* ---------- Redaktionelle Domains (Zuordnung) ---------- */

export const DOMAIN_KEYS = [
  "gesellschaft",
  "nachbarschaft",

  "aussenbeziehungen_nachbarlaender",
  "aussenbeziehungen_eu",
  "aussenbeziehungen_schengen",
  "aussenbeziehungen_g7",
  "aussenbeziehungen_g20",
  "aussenbeziehungen_un",
  "aussenbeziehungen_nato",
  "aussenbeziehungen_oecd",
  "aussenbeziehungen_global",

  "innenpolitik",
  "wirtschaft",
  "bildung",
  "gesundheit",
  "sicherheit",
  "klima_umwelt",
  "digitales",
  "infrastruktur",
  "justiz",
  "kultur_medien",
  "sonstiges",
] as const;

export type DomainKey = (typeof DOMAIN_KEYS)[number];

export function coerceStringArray(v: unknown): string[] | undefined {
  if (!v) return undefined;
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string" && x.trim().length > 0);
  if (typeof v === "string" && v.trim().length > 0) return [v.trim()];
  return undefined;
}

/**
 * Vereinheitlicht domain/domains: domain = primäre, domains = Array oder null.
 * Nimmt beliebige Eingaben und liefert saubere String-Werte (getrimmt) zurück.
 */
export function normalizeDomains(
  domainValue: unknown,
  domainsValue: unknown,
): { domain: string | null; domains: string[] | null } {
  const domains =
    coerceStringArray(domainsValue) ??
    coerceStringArray(domainValue) ??
    null;
  const domain =
    (typeof domainValue === "string" && domainValue.trim()) ||
    (domains && domains.length ? domains[0] : null) ||
    null;
  return { domain: domain || null, domains };
}

/* ---------- Editorial Audit (optional) ---------- */

export const EDITORIAL_SOURCE_CLASSES = [
  "gov",
  "military",
  "party_political",
  "wire_service",
  "independent_media",
  "ngo",
  "igo_un",
  "academic",
  "osint",
  "affected_witness",
  "corporate",
  "unknown",
] as const;

export type EditorialSourceClass = (typeof EDITORIAL_SOURCE_CLASSES)[number];

export const EditorialSourceClassSchema = z.enum(EDITORIAL_SOURCE_CLASSES);

export const EditorialFlagSeveritySchema = z.enum(["low", "medium", "high"]);
export type EditorialFlagSeverity = z.infer<typeof EditorialFlagSeveritySchema>;

export const EditorialAgencyFlagSchema = z
  .object({
    sentence: z.string(),
    reason: z.string(),
    suggestion: z.string().optional(),
    severity: EditorialFlagSeveritySchema.default("low"),
  })
  .strict();
export type EditorialAgencyFlag = z.infer<typeof EditorialAgencyFlagSchema>;

export const EditorialTermFlagSchema = z
  .object({
    term: z.string(),
    matchedText: z.string().optional(),
    suggestion: z.string().optional(),
    rationale: z.string(),
    severity: EditorialFlagSeveritySchema.default("low"),
  })
  .strict();
export type EditorialTermFlag = z.infer<typeof EditorialTermFlagSchema>;

export const EditorialPowerFlagSchema = z
  .object({
    snippet: z.string(),
    reason: z.string(),
    suggestion: z.string().optional(),
    severity: EditorialFlagSeveritySchema.default("medium"),
  })
  .strict();
export type EditorialPowerFlag = z.infer<typeof EditorialPowerFlagSchema>;

export const EditorialSourceBalanceSchema = z
  .object({
    countsByClass: z.record(z.string(), z.number().int().nonnegative()),
    total: z.number().int().nonnegative(),
    dominantClass: z.string().optional(),
    balanceScore: z.number().min(0).max(1),
    missingVoices: z.array(z.string()).default([]),
  })
  .strict();
export type EditorialSourceBalance = z.infer<typeof EditorialSourceBalanceSchema>;

export const EditorialBurdenOfProofSchema = z
  .object({
    unmetClaims: z.array(z.string()).default([]),
    claimEvidence: z
      .array(
        z
          .object({
            claim: z.string(),
            evidenceScore: z.number().min(0).max(1).default(0),
            linkedSources: z
              .array(
                z
                  .object({
                    url: z.string().optional(),
                    title: z.string().optional(),
                    publisher: z.string().optional(),
                    sourceClass: z.string().optional(),
                    score: z.number().min(0).max(1),
                  })
                  .strict(),
              )
              .default([]),
          })
          .strict(),
      )
      .default([]),
    notes: z.array(z.string()).default([]),
  })
  .strict();
export type EditorialBurdenOfProof = z.infer<typeof EditorialBurdenOfProofSchema>;

export const EditorialContrastFindingSchema = z
  .object({
    outlet: z.string(),
    url: z.string().optional(),
    localeHint: z.enum(["de_like", "international_like", "unknown"]).default("unknown"),
    hasAttribution: z.boolean().default(false),
    hasEvidenceCaveat: z.boolean().default(false),
    usesPassiveAgency: z.boolean().default(false),
    headlineOrTitle: z.string().optional(),
  })
  .strict();
export type EditorialContrastFinding = z.infer<typeof EditorialContrastFindingSchema>;

export const EditorialInternationalContrastSchema = z
  .object({
    findings: z.array(EditorialContrastFindingSchema).default([]),
    differences: z.array(z.string()).default([]),
    notes: z.array(z.string()).default([]),
  })
  .strict();
export type EditorialInternationalContrast = z.infer<typeof EditorialInternationalContrastSchema>;

export const EuphemismFindingSchema = z
  .object({
    kind: z.enum(["lexicon", "pattern"]),
    key: z.string(),
    severity: z.enum(["low", "medium", "high"]).default("medium"),
    matched: z.string(),
    preferredWording: z.string().optional(),
    rationale: z.string().optional(),
    preferredWordingI18n: I18nStringSchema.optional(),
    rationaleI18n: I18nStringSchema.optional(),
  })
  .strict();
export type EuphemismFinding = z.infer<typeof EuphemismFindingSchema>;

export const VoiceRoleSchema = z.enum([
  "power_government",
  "power_military",
  "affected_local",
  "medical_on_ground",
  "human_rights_monitor",
  "international_law",
  "independent_academic",
  "on_the_ground_journalist",
  "opposition_alt_position",
  "other",
]);
export type VoiceRole = z.infer<typeof VoiceRoleSchema>;

export const VoiceCoverageSchema = z
  .object({
    required: z.array(VoiceRoleSchema).default([]),
    present: z.array(VoiceRoleSchema).default([]),
    missing: z.array(VoiceRoleSchema).default([]),
    score: z.number().min(0).max(1).default(0),
    notes: z.array(z.string()).default([]),
  })
  .strict();
export type VoiceCoverage = z.infer<typeof VoiceCoverageSchema>;

export const ContextGapSchema = z
  .object({
    key: z.enum(["timeframe", "location", "actors", "agency", "evidence", "legal_frame", "numbers", "definitions"]),
    severity: z.enum(["low", "medium", "high"]).default("medium"),
    rationale: z.string().optional(),
    rationaleI18n: I18nStringSchema.optional(),
  })
  .strict();
export type ContextGap = z.infer<typeof ContextGapSchema>;

export const ContextPackRefSchema = z
  .object({
    id: z.string(),
    version: z.string(),
    title: z.string(),
    scope: z
      .object({
        domains: z.array(z.string()).default([]),
        region: z.string().optional(),
        topic: z.string().optional(),
      })
      .strict(),
    summary: z.string().optional(),
    titleI18n: I18nStringSchema.optional(),
    summaryI18n: I18nStringSchema.optional(),
  })
  .strict();
export type ContextPackRef = z.infer<typeof ContextPackRefSchema>;

export const PolicyPackInfoSchema = z
  .object({
    id: z.string(),
    version: z.string(),
    updatedAt: z.string().optional(),
  })
  .strict();
export type PolicyPackInfo = z.infer<typeof PolicyPackInfoSchema>;

export const EditorialAuditSchema = z
  .object({
    sourceBalance: EditorialSourceBalanceSchema,
    agencyOpacityFlags: z.array(EditorialAgencyFlagSchema).default([]),
    euphemismTermFlags: z.array(EditorialTermFlagSchema).default([]),
    powerStenographyFlags: z.array(EditorialPowerFlagSchema).default([]),
    burdenOfProof: EditorialBurdenOfProofSchema,
    internationalContrast: EditorialInternationalContrastSchema.optional(),
    policyPack: PolicyPackInfoSchema.optional(),
    euphemismFindings: z.array(EuphemismFindingSchema).default([]),
    voiceCoverage: VoiceCoverageSchema.optional(),
    contextGaps: z.array(ContextGapSchema).default([]),
    attachedContextPacks: z.array(ContextPackRefSchema).default([]),
    notesForTraining: z.array(z.string()).default([]),
    confidence: z.number().min(0).max(1).default(0.6),
  })
  .strict();
export type EditorialAudit = z.infer<typeof EditorialAuditSchema>;

export const EvidenceNodeSchema = z
  .object({
    id: z.string(),
    type: z.enum(["claim", "evidence"]),
    label: z.string(),
    url: z.string().optional(),
    publisher: z.string().optional(),
    sourceClass: z.string().optional(),
    weight: z.number().min(0).max(1).optional(),
  })
  .strict();

export const EvidenceEdgeSchema = z
  .object({
    from: z.string(),
    to: z.string(),
    kind: z.enum(["supports", "refutes", "mentions"]).default("supports"),
    weight: z.number().min(0).max(1).default(0.5),
  })
  .strict();

export const EvidenceGraphSchema = z
  .object({
    nodes: z.array(EvidenceNodeSchema).default([]),
    edges: z.array(EvidenceEdgeSchema).default([]),
    summary: z
      .object({
        claimCount: z.number().int().nonnegative().default(0),
        evidenceCount: z.number().int().nonnegative().default(0),
        linkedClaimCount: z.number().int().nonnegative().default(0),
        unlinkedClaimCount: z.number().int().nonnegative().default(0),
      })
      .strict(),
  })
  .strict();

export type EvidenceGraph = z.infer<typeof EvidenceGraphSchema>;

export const RunReceiptSourceSchema = z
  .object({
    canonicalUrl: z.string(),
    host: z.string().optional(),
    publisher: z.string().optional(),
    publisherKey: z.string().optional(),
    sourceClass: z.string().optional(),
    fetchedAt: z.string().optional(),
    title: z.string().optional(),
  })
  .strict();

export const RunReceiptSchema = z
  .object({
    id: z.string(),
    createdAt: z.string(),
    pipelineVersion: z.string(),
    provider: z.string().optional(),
    model: z.string().optional(),
    promptVersion: z.string().optional(),
    language: z.string().optional(),
    inputHash: z.string(),
    sourcesHash: z.string(),
    outputHash: z.string(),
    receiptHash: z.string(),
    snapshotId: z.string().optional(),
    sourceSet: z.array(RunReceiptSourceSchema).default([]),
    contentPolicy: z
      .object({
        maxSnippetChars: z.number().int().positive().default(240),
        storeFullText: z.boolean().default(false),
        storeSnippets: z.boolean().default(false),
        storeTitles: z.boolean().default(true),
      })
      .strict(),
  })
  .strict();

export type RunReceipt = z.infer<typeof RunReceiptSchema>;

/* ---------- Statements / Claims ---------- */

export const DebateLevelSchema = z.enum(["global", "eu", "neighbour", "national", "local"]);
export type DebateLevel = z.infer<typeof DebateLevelSchema>;

export const PolicyDomainSchema = z.enum([
  "human_rights",
  "labor",
  "social",
  "health",
  "education",
  "justice",
  "religion_freedom",
  "trade",
  "tariffs",
  "security",
  "migration",
  "integration",
  "housing",
  "infrastructure",
  "economy",
  "governance",
]);
export type PolicyDomain = z.infer<typeof PolicyDomainSchema>;

const MetricSchema = z.object({
  name: z.string().min(2),
  direction: z.enum(["up", "down", "neutral"]),
  horizonMonths: z.number().int().min(1).max(240),
});

const EnforcementStageSchema = z.object({
  stage: z.number().int().min(1).max(10),
  type: z.enum(["monitoring", "incentives", "restrictions", "targeted_sanctions", "sectoral_sanctions"]),
  description: z.string().min(4),
  exitCriteria: z.string().min(4),
});

const AntiPopulismGateSchema = z.object({
  id: z.enum([
    "no_scapegoat",
    "policy_decision",
    ">=2_options",
    "has_metrics",
    "shows_tradeoffs",
    "rights_duties_symmetry",
    "sanctions_are_staged",
    "defines_terms",
    "no_person_targeting",
    "dossier_required",
  ]),
  pass: z.boolean(),
});

export const DebateFrameSchema = z.object({
  version: z.literal("v1").default("v1"),
  level: DebateLevelSchema.optional(),
  policyDomain: PolicyDomainSchema.optional(),
  jurisdiction: z
    .object({
      actors: z.array(z.string()).default([]),
      region: z.string().optional(),
    })
    .default({ actors: [] }),
  objective: z.string().optional(),
  rights: z.array(z.string()).default([]),
  duties: z.array(z.string()).default([]),
  minimumStandards: z
    .array(
      z.object({
        label: z.string(),
        threshold: z.string(),
      }),
    )
    .default([]),
  enforcement: z
    .object({
      stages: z.array(EnforcementStageSchema).default([]),
      humanitarianExceptions: z.boolean().default(true),
      legalSafeguards: z.array(z.string()).default([]),
    })
    .default(() => ({
      stages: [],
      humanitarianExceptions: true,
      legalSafeguards: [],
    })),
  metrics: z.array(MetricSchema).default([]),
  options: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        type: z
          .enum(["status_quo", "reform_moderate", "reform_strong", "pilot", "sovereignty", "custom"])
          .default("custom"),
      }),
    )
    .default([]),
  antiPopulism: z
    .object({
      score: z.number().min(0).max(1).default(0),
      gates: z.array(AntiPopulismGateSchema).default([]),
      status: z.enum(["pass", "fail", "needs_review"]).default("needs_review"),
      notes: z.string().optional(),
    })
    .default(() => ({
      score: 0,
      gates: [],
      status: "needs_review",
    })),
});
export type DebateFrame = z.infer<typeof DebateFrameSchema>;

export const StatementRecordSchema = z.object({
  id: z.string(),
  text: z.string(),

  // NEU: kurzer Oberbegriff / Titel des Claims
  title: z.string().nullable().optional(),

  // Grobe Zuständigkeit, z.B. "EU", "Bund", "Land", "Kommune", "privat", "unbestimmt"
  responsibility: z.string().nullable().optional(),

  importance: z.number().int().min(1).max(5).nullable().optional(),
  topic: z.string().nullable().optional(),
  domain: z.string().nullable().optional(),
  // NEU: mehrere redaktionelle Domains möglich (Multi-Tag); domain bleibt kompatibel als "primäre" Domain
  domains: z.array(z.string()).nullable().optional(),
  stance: z.enum(["pro", "neutral", "contra"]).nullable().optional(),
  debateFrame: DebateFrameSchema.optional(),
});

export type StatementRecord = z.infer<typeof StatementRecordSchema>;

/* ---------- Notes / Fragen / Knoten ---------- */

export const NoteRecordSchema = z.object({
  id: z.string(),
  text: z.string(),
  kind: z.string().nullable().optional(),
});
export type NoteRecord = z.infer<typeof NoteRecordSchema>;

export const QuestionRecordSchema = z.object({
  id: z.string(),
  text: z.string(),
  dimension: z.string().nullable().optional(),
});
export type QuestionRecord = z.infer<typeof QuestionRecordSchema>;

export const MissingPerspectiveSchema = z
  .object({
    id: z.string().optional(),
    text: z.string(),
    dimension: z.string().optional(),
  })
  .strict();
export type MissingPerspective = z.infer<typeof MissingPerspectiveSchema>;

export const ParticipationCandidateSchema = z
  .object({
    id: z.string().optional(),
    text: z.string(),
    rationale: z.string().optional(),
    stance: z.enum(["pro", "neutral", "contra"]).optional(),
    dimension: z.string().optional(),
  })
  .strict();
export type ParticipationCandidate = z.infer<typeof ParticipationCandidateSchema>;

export const KnotRecordSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
});
export type KnotRecord = z.infer<typeof KnotRecordSchema>;

const responsibilityLevelEnum = z.enum([
  "municipality",
  "district",
  "state",
  "federal",
  "eu",
  "ngo",
  "private",
  "unknown",
]);

export const ConsequenceRecordSchema = z.object({
  id: z.string(),
  scope: z.enum(["local_short", "local_long", "national", "global", "systemic"]),
  statementIndex: z.number().int().min(0),
  text: z.string(),
  confidence: z.number().min(0).max(1).nullable().optional(),
});
export type ConsequenceRecord = z.infer<typeof ConsequenceRecordSchema>;

export const ResponsibilityRecordSchema = z.object({
  id: z.string(),
  level: responsibilityLevelEnum,
  actor: z.string().nullable().optional(),
  text: z.string(),
  relevance: z.number().min(0).max(1).nullable().optional(),
});
export type ResponsibilityRecord = z.infer<typeof ResponsibilityRecordSchema>;

export const ResponsibilityPathNodeSchema = z.object({
  level: responsibilityLevelEnum,
  actorKey: z.string(),
  displayName: z.string(),
  description: z.string().nullable().optional(),
  contactUrl: z.string().nullable().optional(),
  processHint: z.string().nullable().optional(),
  relevance: z.number().min(0).max(1).optional(),
});
export type ResponsibilityPathNode = z.infer<typeof ResponsibilityPathNodeSchema>;

export const ResponsibilityPathSchema = z.object({
  id: z.string(),
  statementId: z.string(),
  locale: z.string(),
  nodes: z.array(ResponsibilityPathNodeSchema),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type ResponsibilityPath = z.infer<typeof ResponsibilityPathSchema>;

export const ConsequenceBundleSchema = z.object({
  consequences: z.array(ConsequenceRecordSchema),
  responsibilities: z.array(ResponsibilityRecordSchema),
});
export type ConsequenceBundle = z.infer<typeof ConsequenceBundleSchema>;

export const ImpactRecordSchema = z.object({
  type: z.string(),
  description: z.string(),
  confidence: z.number().min(0).max(1).nullable().optional(),
});
export type ImpactRecord = z.infer<typeof ImpactRecordSchema>;

export const ResponsibleActorSchema = z.object({
  level: z.string(),
  hint: z.string(),
  confidence: z.number().min(0).max(1).nullable().optional(),
});
export type ResponsibleActor = z.infer<typeof ResponsibleActorSchema>;

export const ImpactAndResponsibilitySchema = z.object({
  impacts: z.array(ImpactRecordSchema),
  responsibleActors: z.array(ResponsibleActorSchema),
});
export type ImpactAndResponsibility = z.infer<typeof ImpactAndResponsibilitySchema>;

export const ReportFactsSchema = z.object({
  local: z.array(z.string()),
  international: z.array(z.string()),
});
export type ReportFacts = z.infer<typeof ReportFactsSchema>;

export const ReportSchema = z.object({
  summary: z.string().nullable(),
  keyConflicts: z.array(z.string()),
  facts: ReportFactsSchema,
  openQuestions: z.array(z.string()),
  takeaways: z.array(z.string()),
});
export type Report = z.infer<typeof ReportSchema>;

/* ---------- Eventualities & Decision Trees ---------- */

const ScenarioOptionEnum = z.enum(["pro", "neutral", "contra"]);
export type ScenarioOption = z.infer<typeof ScenarioOptionEnum>;

export type EventualityNode = {
  id: string;
  statementId: string;
  label: string;
  narrative: string;
  stance?: ScenarioOption | null;
  likelihood?: number;
  impact?: number;
  consequences: ConsequenceRecord[];
  responsibilities: ResponsibilityRecord[];
  children: EventualityNode[];
};

export const EventualityNodeSchema: z.ZodType<EventualityNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    statementId: z.string(),
    label: z.string(),
    narrative: z.string(),
    stance: ScenarioOptionEnum.nullable().optional(),
    likelihood: z.number().min(0).max(1).optional(),
    impact: z.number().min(0).max(1).optional(),
    consequences: z.array(ConsequenceRecordSchema).default([]),
    responsibilities: z.array(ResponsibilityRecordSchema).default([]),
    children: z.array(EventualityNodeSchema).default([]),
  })
);

export const DecisionTreeSchema = z.object({
  id: z.string().optional(),
  rootStatementId: z.string(),
  locale: z.string().optional(),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().optional(),
  options: z.object({
    pro: EventualityNodeSchema,
    neutral: EventualityNodeSchema.optional(),
    contra: EventualityNodeSchema,
  }),
});
export type DecisionTree = z.infer<typeof DecisionTreeSchema>;

/* ---------- AnalyzeResult ---------- */

export const AnalyzeResultSchema = z.object({
  mode: z.literal("E150"),
  sourceText: z.string().nullable(),
  language: z.string(),
  claims: z.array(StatementRecordSchema),
  notes: z.array(NoteRecordSchema),
  questions: z.array(QuestionRecordSchema),
  missingPerspectives: z.array(MissingPerspectiveSchema).default([]),
  knots: z.array(KnotRecordSchema),
  consequences: ConsequenceBundleSchema,
  responsibilityPaths: z.array(ResponsibilityPathSchema),
  eventualities: z.array(EventualityNodeSchema),
  decisionTrees: z.array(DecisionTreeSchema),
  impactAndResponsibility: ImpactAndResponsibilitySchema,
  participationCandidates: z.array(ParticipationCandidateSchema).default([]),
  report: ReportSchema,
  editorialAudit: EditorialAuditSchema.optional(),
  evidenceGraph: EvidenceGraphSchema.optional(),
  runReceipt: RunReceiptSchema.optional(),
});

export type AnalyzeResult = z.infer<typeof AnalyzeResultSchema>;

export const EDITORIAL_SOURCE_CLASS_LABELS_DE: Record<EditorialSourceClass, string> = {
  gov: "Regierung/Behoerden",
  military: "Militaer/Sicherheitsapparat",
  party_political: "Partei/Politik",
  wire_service: "Agentur (Wire)",
  independent_media: "Medien (redaktionell)",
  ngo: "NGO/Zivilgesellschaft",
  igo_un: "UN/IGO",
  academic: "Wissenschaft",
  osint: "OSINT/Tech",
  affected_witness: "Betroffene/Zeugen",
  corporate: "Unternehmen",
  unknown: "Unklar",
};

const I18N_STRING_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    de: { type: "string" },
    en: { type: "string" },
    es: { type: "string" },
    it: { type: "string" },
    pl: { type: "string" },
    fr: { type: "string" },
    tr: { type: "string" },
  },
} as const;

/* ---------- JSON-Schema (für Responses API) ---------- */

export const ANALYZE_JSON_SCHEMA = {
  name: "AnalyzeResult",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      mode: { type: "string" },
      sourceText: { type: ["string", "null"] },
      language: { type: "string" },
      claims: { type: "array" },
      notes: { type: "array" },
      questions: { type: "array" },
      missingPerspectives: { type: "array" },
      knots: { type: "array" },
      consequences: {
        type: "object",
        additionalProperties: false,
        properties: {
          consequences: { type: "array" },
          responsibilities: { type: "array" },
        },
        required: ["consequences", "responsibilities"],
      },
      responsibilityPaths: { type: "array" },
      eventualities: { type: "array" },
      decisionTrees: { type: "array" },
      impactAndResponsibility: {
        type: "object",
        additionalProperties: false,
        properties: {
          impacts: { type: "array" },
          responsibleActors: { type: "array" },
        },
        required: ["impacts", "responsibleActors"],
      },
      participationCandidates: { type: "array" },
      report: {
        type: "object",
        additionalProperties: false,
        properties: {
          summary: { type: ["string", "null"] },
          keyConflicts: { type: "array" },
          facts: {
            type: "object",
            additionalProperties: false,
            properties: {
              local: { type: "array" },
              international: { type: "array" },
            },
            required: ["local", "international"],
          },
          openQuestions: { type: "array" },
          takeaways: { type: "array" },
        },
        required: ["summary", "keyConflicts", "facts", "openQuestions", "takeaways"],
      },
    },
    required: [
      "mode",
      "sourceText",
      "language",
      "claims",
      "notes",
      "questions",
      "knots",
      "consequences",
      "responsibilityPaths",
      "eventualities",
      "decisionTrees",
      "impactAndResponsibility",
      "report",
    ],
  },
  strict: true,
} as const;
