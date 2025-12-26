import { z } from "zod";

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

/* ---------- Statements / Claims ---------- */

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
  knots: z.array(KnotRecordSchema),
  consequences: ConsequenceBundleSchema,
  responsibilityPaths: z.array(ResponsibilityPathSchema),
  eventualities: z.array(EventualityNodeSchema),
  decisionTrees: z.array(DecisionTreeSchema),
  impactAndResponsibility: ImpactAndResponsibilitySchema,
  report: ReportSchema,
});

export type AnalyzeResult = z.infer<typeof AnalyzeResultSchema>;

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

      claims: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            id: { type: "string" },
            text: { type: "string" },
            title: { type: ["string", "null"] },
            responsibility: { type: ["string", "null"] },
            importance: { type: ["integer", "null"], minimum: 1, maximum: 5 },
            topic: { type: ["string", "null"] },
            domain: { type: ["string", "null"] },
            domains: {
              type: ["array", "null"],
              items: { type: "string" },
              description:
                "Weitere redaktionelle Domains (z.B. ['gesellschaft','aussenbeziehungen_nachbarlaender']). Optional.",
            },
            stance: { type: ["string", "null"], enum: ["pro", "neutral", "contra", null] },
          },
          required: ["id", "text"],
        },
      },
      notes: { type: "array" },
      questions: { type: "array" },
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
