import { z } from "zod";
import type { ObjectId } from "@core/db/triMongo";
import { AnalyzeResultSchema, RunReceiptSourceSchema } from "@features/analyze/schemas";
import { DOSSIER_LIMITS } from "./limits";

export const DossierActorRoleSchema = z.enum(["pipeline", "editor", "member", "admin", "system"]);
export type DossierActorRole = z.infer<typeof DossierActorRoleSchema>;

export const DossierSourceTypeSchema = z.enum([
  "official",
  "research",
  "primary_doc",
  "quality_media",
  "stakeholder",
  "other",
]);
export type DossierSourceType = z.infer<typeof DossierSourceTypeSchema>;

export const DossierClaimKindSchema = z.enum(["fact", "interpretation", "value", "question"]);
export type DossierClaimKind = z.infer<typeof DossierClaimKindSchema>;

export const DossierClaimStatusSchema = z.enum(["open", "supported", "refuted", "unclear"]);
export type DossierClaimStatus = z.infer<typeof DossierClaimStatusSchema>;

export const DossierFindingVerdictSchema = z.enum(["supports", "refutes", "unclear", "mixed"]);
export type DossierFindingVerdict = z.infer<typeof DossierFindingVerdictSchema>;

export const DossierEdgeRelSchema = z.enum([
  "supports",
  "refutes",
  "mentions",
  "depends_on",
  "questions",
  "context_for",
]);
export type DossierEdgeRel = z.infer<typeof DossierEdgeRelSchema>;

export const DossierNodeTypeSchema = z.enum(["claim", "source", "finding", "open_question"]);
export type DossierNodeType = z.infer<typeof DossierNodeTypeSchema>;

export const OpenQuestionStatusSchema = z.enum(["open", "in_review", "answered", "closed"]);
export type OpenQuestionStatus = z.infer<typeof OpenQuestionStatusSchema>;

export const ResponsibilityTypeSchema = z.enum([
  "municipality",
  "agency",
  "association",
  "editorial",
  "other",
]);
export type ResponsibilityType = z.infer<typeof ResponsibilityTypeSchema>;

export const RevisionActionSchema = z.enum([
  "create",
  "update",
  "delete",
  "status_change",
  "system_update",
]);
export type RevisionAction = z.infer<typeof RevisionActionSchema>;

export const DisputeStatusSchema = z.enum(["open", "resolved", "rejected"]);
export type DisputeStatus = z.infer<typeof DisputeStatusSchema>;

export const SuggestionStatusSchema = z.enum(["pending", "accepted", "rejected"]);
export type SuggestionStatus = z.infer<typeof SuggestionStatusSchema>;

export const SuggestionTypeSchema = z.enum([
  "source",
  "claim",
  "counter",
  "question",
  "flag",
  "perspective",
  "update",
]);
export type SuggestionType = z.infer<typeof SuggestionTypeSchema>;

export const EvidenceIndicatorSchema = z
  .object({
    score: z.number().min(0).max(1),
    method: z.literal("rubric_v1"),
    reasons: z.array(z.string().min(1).max(140)).max(12),
  })
  .strict();
export type EvidenceIndicator = z.infer<typeof EvidenceIndicatorSchema>;

export const AuthorRefSchema = z
  .object({
    userId: z.string().min(1).optional(),
    handle: z.string().min(1).optional(),
  })
  .strict();
export type AuthorRef = z.infer<typeof AuthorRefSchema>;

export const DossierCountsSchema = z
  .object({
    claims: z.number().int().nonnegative().default(0),
    sources: z.number().int().nonnegative().default(0),
    findings: z.number().int().nonnegative().default(0),
    edges: z.number().int().nonnegative().default(0),
    openQuestions: z.number().int().nonnegative().default(0),
  })
  .strict();
export type DossierCounts = z.infer<typeof DossierCountsSchema>;

// Normative Dossier wrapper (Legitimation 2.0)
export const DossierMetaSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    jurisdiction: z.enum(["unknown", "municipal", "state", "federal", "eu", "global"]),
    region: z.string().optional(),
    status: z.enum(["draft", "review", "published", "archived"]).default("draft"),
    owner: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string().optional(),
    revision: z
      .object({
        rev: z.number().int().nonnegative(),
        lastChangeAt: z.string(),
      })
      .optional(),
  })
  .strict();
export type DossierMeta = z.infer<typeof DossierMetaSchema>;

export const VotePolicySchema = z.enum(["quick", "standard", "civic"]);
export type VotePolicy = z.infer<typeof VotePolicySchema>;

export const VoteConfigSchema = z
  .object({
    enabled: z.boolean().default(false),
    policy: VotePolicySchema.default("civic"),
    minOptions: z.number().int().min(2).optional(),
    allowCommunityOptions: z.boolean().default(true),
  })
  .strict()
  .transform((config) => ({
    ...config,
    minOptions:
      config.minOptions ??
      (config.policy === "quick" ? 2 : config.policy === "standard" ? 3 : 5),
  }));
export type VoteConfig = z.infer<typeof VoteConfigSchema>;

export const DossierSchema = z
  .object({
    meta: DossierMetaSchema,
    analyze: AnalyzeResultSchema,
    sourceSet: z.array(RunReceiptSourceSchema).default([]),
    voteConfig: VoteConfigSchema.optional(),
    auditTrail: z
      .array(
        z
          .object({
            id: z.string().min(1),
            at: z.string().min(1),
            actorRole: z.string().min(1),
            actorLabel: z.string().min(1).optional(),
            action: z.string().min(1),
            targetType: z.string().min(1),
            targetId: z.string().min(1).optional(),
            note: z.string().min(1).optional(),
          })
          .strict(),
      )
      .optional(),
    corrections: z
      .array(
        z
          .object({
            id: z.string().min(1),
            createdAt: z.string().min(1),
            kind: z.enum(["correction", "objection"]),
            targetType: z.enum(["claim", "source", "question"]),
            targetId: z.string().min(1),
            summary: z.string().min(1),
            status: z.enum(["open", "accepted", "rejected"]),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();
export type Dossier = z.infer<typeof DossierSchema>;

// Persistence/DB doc schema (legacy storage shape)
export const DossierDocSchema = z
  .object({
    dossierId: z.string().min(1),
    statementId: z.string().min(1),
    title: z.string().max(200).optional(),
    status: z.enum(["draft", "active", "archived"]).default("active"),
    counts: DossierCountsSchema.default({
      claims: 0,
      sources: 0,
      findings: 0,
      edges: 0,
      openQuestions: 0,
    }),
    lastFactcheckedAt: z.date().optional(),
    revisionSeq: z.number().int().nonnegative().optional(),
    lastRevisionHash: z.string().min(8).optional(),
    lastRevisionAt: z.date().optional(),
    createdAt: z.date(),
    updatedAt: z.date().optional(),
  })
  .strict();
export type DossierDoc = z.infer<typeof DossierDocSchema> & { _id?: ObjectId };

export const DossierSourceSchema = z
  .object({
    sourceId: z.string().min(1),
    dossierId: z.string().min(1),
    canonicalUrlHash: z.string().min(8),
    url: z.string().url(),
    title: z.string().min(1).max(DOSSIER_LIMITS.title),
    publisher: z.string().min(1).max(DOSSIER_LIMITS.publisher),
    publishedAt: z.date().optional(),
    retrievedAt: z.date().optional(),
    type: DossierSourceTypeSchema,
    snippet: z.string().max(DOSSIER_LIMITS.snippet).optional(),
    licenseNote: z.string().max(DOSSIER_LIMITS.note).optional(),
    conflictOfInterest: z
      .object({
        hasConflict: z.boolean(),
        note: z.string().max(DOSSIER_LIMITS.note).optional(),
      })
      .strict()
      .optional(),
    tags: z.array(z.string().max(48)).optional(),
    language: z.string().max(12).optional(),
    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
  })
  .strict();
export type DossierSourceDoc = z.infer<typeof DossierSourceSchema> & { _id?: ObjectId };

export const DossierClaimSchema = z
  .object({
    claimId: z.string().min(1),
    dossierId: z.string().min(1),
    text: z.string().min(1).max(600),
    kind: DossierClaimKindSchema,
    status: DossierClaimStatusSchema,
    uncertaintyNotes: z.array(z.string().max(DOSSIER_LIMITS.note)).optional(),
    createdByRole: DossierActorRoleSchema,
    authorRef: AuthorRefSchema.optional(),
    evidenceIndicator: EvidenceIndicatorSchema.optional(),
    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
  })
  .strict();
export type DossierClaimDoc = z.infer<typeof DossierClaimSchema> & { _id?: ObjectId };

export const DossierCitationSchema = z
  .object({
    sourceId: z.string().min(1),
    quote: z.string().max(DOSSIER_LIMITS.quote).optional(),
    locator: z.string().max(DOSSIER_LIMITS.locator).optional(),
  })
  .strict();
export type DossierCitation = z.infer<typeof DossierCitationSchema>;

export const DossierFindingSchema = z
  .object({
    findingId: z.string().min(1),
    dossierId: z.string().min(1),
    claimId: z.string().min(1),
    verdict: DossierFindingVerdictSchema,
    rationale: z.array(z.string().max(DOSSIER_LIMITS.rationale)).default([]),
    citations: z.array(DossierCitationSchema).default([]),
    producedBy: z.enum(["pipeline", "editor"]).default("pipeline"),
    jobId: z.string().min(1).optional(),
    updatedAt: z.date().optional(),
    createdAt: z.date().optional(),
  })
  .strict();
export type DossierFindingDoc = z.infer<typeof DossierFindingSchema> & { _id?: ObjectId };

export const DossierEdgeSchema = z
  .object({
    edgeId: z.string().min(1),
    dossierId: z.string().min(1),
    fromType: DossierNodeTypeSchema,
    fromId: z.string().min(1),
    toType: DossierNodeTypeSchema,
    toId: z.string().min(1),
    rel: DossierEdgeRelSchema,
    weight: z.number().min(0).max(1).optional(),
    justification: z.string().max(DOSSIER_LIMITS.note).optional(),
    active: z.boolean().optional(),
    archivedAt: z.date().optional(),
    archivedReason: z.string().max(DOSSIER_LIMITS.locator).optional(),
    createdBy: z.enum(["pipeline", "editor"]),
    createdAt: z.date().optional(),
  })
  .strict();
export type DossierEdgeDoc = z.infer<typeof DossierEdgeSchema> & { _id?: ObjectId };

export const OpenQuestionSchema = z
  .object({
    questionId: z.string().min(1),
    dossierId: z.string().min(1),
    text: z.string().min(1).max(400),
    status: OpenQuestionStatusSchema,
    responsibility: z
      .object({
        type: ResponsibilityTypeSchema,
        label: z.string().min(1).max(120),
        ref: z.string().max(120).optional(),
      })
      .strict()
      .optional(),
    links: z
      .object({
        sourceIds: z.array(z.string().min(1)).optional(),
        claimIds: z.array(z.string().min(1)).optional(),
        findingIds: z.array(z.string().min(1)).optional(),
      })
      .strict()
      .optional(),
    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
  })
  .strict();
export type OpenQuestionDoc = z.infer<typeof OpenQuestionSchema> & { _id?: ObjectId };

export const DossierRevisionSchema = z
  .object({
    revId: z.string().min(1),
    dossierId: z.string().min(1),
    entityType: z.string().min(1),
    entityId: z.string().min(1),
    action: RevisionActionSchema,
    diffSummary: z.string().min(1).max(400),
    byRole: DossierActorRoleSchema,
    byUserId: z.string().min(1).optional(),
    timestamp: z.date(),
    prevHash: z.string().min(8).optional(),
    hash: z.string().min(8).optional(),
    hashAlgo: z.literal("sha256").optional(),
  })
  .strict();
export type DossierRevisionDoc = z.infer<typeof DossierRevisionSchema> & { _id?: ObjectId };

export const DossierDisputeSchema = z
  .object({
    disputeId: z.string().min(1),
    dossierId: z.string().min(1),
    entityType: z.string().min(1),
    entityId: z.string().min(1),
    reason: z.string().min(1).max(500),
    requestedChange: z.string().min(1).max(500),
    status: DisputeStatusSchema,
    resolutionNote: z.string().max(500).optional(),
    resolvedBy: z.string().min(1).optional(),
    createdAt: z.date(),
    updatedAt: z.date().optional(),
    resolvedAt: z.date().optional(),
  })
  .strict();
export type DossierDisputeDoc = z.infer<typeof DossierDisputeSchema> & { _id?: ObjectId };

export const DossierSuggestionSchema = z
  .object({
    suggestionId: z.string().min(1),
    dossierId: z.string().min(1),
    type: SuggestionTypeSchema,
    payload: z.record(z.string(), z.any()),
    status: SuggestionStatusSchema,
    moderationNote: z.string().max(400).optional(),
    createdAt: z.date(),
    updatedAt: z.date().optional(),
  })
  .strict();
export type DossierSuggestionDoc = z.infer<typeof DossierSuggestionSchema> & { _id?: ObjectId };
