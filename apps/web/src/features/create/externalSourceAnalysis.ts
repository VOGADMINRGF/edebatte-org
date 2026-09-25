// @repository-integrity-classification: adapter
import { z } from "zod";
import { callOpenAIJson } from "@features/ai";
import { resolveCreatePlannerModelCandidates } from "@/features/create/createPlanner";
import type { DocumentAnalysisSummary } from "@/features/create/intelligentFollowupContract";

const DocumentTopicSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  subtopicCount: z.number().int().nonnegative().nullable().optional(),
  keyStatementCount: z.number().int().nonnegative().nullable().optional(),
  verifiableClaimCount: z.number().int().nonnegative().nullable().optional(),
  policyProposalCount: z.number().int().nonnegative().nullable().optional(),
  summary: z.string().trim().nullable().optional(),
});

const DocumentAnalysisSchema = z.object({
  documentTitle: z.string().trim().nullable(),
  documentType: z.enum(["party_program", "law", "study", "report", "article", "unknown"]),
  pageCount: z.number().int().positive().nullable(),
  wordCount: z.number().int().positive().nullable(),
  topicCount: z.number().int().nonnegative(),
  subtopicCount: z.number().int().nonnegative(),
  keyStatementCount: z.number().int().nonnegative(),
  verifiableClaimCount: z.number().int().nonnegative(),
  policyProposalCount: z.number().int().nonnegative(),
  subjectBreadth: z.enum(["narrow", "medium", "broad", "very_broad"]),
  subjectDepth: z.enum(["low", "medium", "high", "mixed"]),
  balanceAssessment: z.enum(["balanced", "mostly_balanced", "programmatic", "one_sided", "unclear"]),
  sourceSpecificity: z.enum(["specific", "partly_specific", "mostly_unspecific", "none", "unclear"]),
  sourceVerificationStatus: z.enum(["not_started", "prepared", "in_review", "completed"]),
  counterpositionCoverage: z.enum(["strong", "partial", "weak", "none", "unclear"]),
  summary: z.string().trim().min(1),
  topics: z.array(DocumentTopicSchema).min(1),
});

const documentAnalysisJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "documentTitle",
    "documentType",
    "pageCount",
    "wordCount",
    "topicCount",
    "subtopicCount",
    "keyStatementCount",
    "verifiableClaimCount",
    "policyProposalCount",
    "subjectBreadth",
    "subjectDepth",
    "balanceAssessment",
    "sourceSpecificity",
    "sourceVerificationStatus",
    "counterpositionCoverage",
    "summary",
    "topics",
  ],
  properties: {
    documentTitle: { type: ["string", "null"] },
    documentType: { type: "string", enum: ["party_program", "law", "study", "report", "article", "unknown"] },
    pageCount: { type: ["integer", "null"] },
    wordCount: { type: ["integer", "null"] },
    topicCount: { type: "integer" },
    subtopicCount: { type: "integer" },
    keyStatementCount: { type: "integer" },
    verifiableClaimCount: { type: "integer" },
    policyProposalCount: { type: "integer" },
    subjectBreadth: { type: "string", enum: ["narrow", "medium", "broad", "very_broad"] },
    subjectDepth: { type: "string", enum: ["low", "medium", "high", "mixed"] },
    balanceAssessment: { type: "string", enum: ["balanced", "mostly_balanced", "programmatic", "one_sided", "unclear"] },
    sourceSpecificity: { type: "string", enum: ["specific", "partly_specific", "mostly_unspecific", "none", "unclear"] },
    sourceVerificationStatus: { type: "string", enum: ["not_started", "prepared", "in_review", "completed"] },
    counterpositionCoverage: { type: "string", enum: ["strong", "partial", "weak", "none", "unclear"] },
    summary: { type: "string" },
    topics: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "label", "subtopicCount", "keyStatementCount", "verifiableClaimCount", "policyProposalCount", "summary"],
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          subtopicCount: { type: ["integer", "null"] },
          keyStatementCount: { type: ["integer", "null"] },
          verifiableClaimCount: { type: ["integer", "null"] },
          policyProposalCount: { type: ["integer", "null"] },
          summary: { type: ["string", "null"] },
        },
      },
    },
  },
} as const;

function isModelNotFoundError(error: unknown): boolean {
  const errorObject = error as {
    status?: number;
    message?: string;
    meta?: { code?: string; status?: number };
  } | null;
  const message = error instanceof Error ? error.message : String(errorObject?.message ?? "");
  return (
    errorObject?.status === 404 ||
    errorObject?.meta?.status === 404 ||
    errorObject?.meta?.code === "MODEL_NOT_FOUND" ||
    (/model/i.test(message) && /404|not found/i.test(message))
  );
}

export type CreateExternalAnalysisRun = {
  analysis: DocumentAnalysisSummary;
  attempts: Array<{
    durationMs: number;
    model: string;
    status: "failed" | "succeeded";
  }>;
};

export class CreateExternalAnalysisError extends Error {
  readonly attempts: CreateExternalAnalysisRun["attempts"];

  constructor(message: string, attempts: CreateExternalAnalysisRun["attempts"]) {
    super(message);
    this.name = "CreateExternalAnalysisError";
    this.attempts = attempts.map((attempt) => ({ ...attempt }));
  }
}

export function buildCreateExternalAnalysisExcerpt(text: string, maxLength = 24_000): string {
  const normalized = text.trim();
  if (normalized.length <= maxLength) return normalized;
  const markerBudget = 180;
  const chunkLength = Math.floor((maxLength - markerBudget) / 3);
  const middleStart = Math.max(0, Math.floor((normalized.length - chunkLength) / 2));
  const endStart = Math.max(0, normalized.length - chunkLength);
  return [
    `[Dokumentanfang]\n${normalized.slice(0, chunkLength)}`,
    `[Dokumentmitte]\n${normalized.slice(middleStart, middleStart + chunkLength)}`,
    `[Dokumentende des extrahierten Bereichs]\n${normalized.slice(endStart)}`,
  ]
    .join("\n\n")
    .slice(0, maxLength);
}

export async function runCreateExternalSourceAnalysis(params: {
  sourceUrl: string;
  text: string;
  locale: string;
  pageCount: number | null;
  documentTitle: string | null;
  documentType: DocumentAnalysisSummary["documentType"];
  additionalContext: string;
}): Promise<CreateExternalAnalysisRun> {
  const system = [
    "Du analysierst verlinkte Dokumente oder Artikel für den review-first /create-Linkpfad von eDebatte.",
    "Nutze nur den tatsächlich extrahierten Quellinhalt.",
    "Erfinde keine Zahlen, Themen oder Seiten.",
    "Wenn pageCount technisch vorgegeben ist, übernimm genau diesen Wert.",
    "sourceVerificationStatus ist hier immer not_started.",
    "Für jedes Thema müssen label und summary konkrete Begriffe aus dem Quellinhalt aufgreifen; summary darf nicht null sein.",
    "Bewerte nur fachliche Ausarbeitung, Konkretheit, Quellenlage, Gegenpositionsabdeckung und Überprüfbarkeit.",
    "Gib strikt JSON zurück.",
  ].join("\n");
  const user = [
    `Locale: ${params.locale || "de"}`,
    `Source URL: ${params.sourceUrl}`,
    `Document title hint: ${params.documentTitle ?? "unknown"}`,
    `Document type hint: ${params.documentType}`,
    `Technically detected page count: ${params.pageCount ?? "null"}`,
    params.additionalContext ? `Additional user context: ${params.additionalContext}` : "",
    "",
    "Extrahierter Quellinhalt:",
    buildCreateExternalAnalysisExcerpt(params.text),
  ]
    .filter(Boolean)
    .join("\n");
  const analysisModels = resolveCreatePlannerModelCandidates().slice(0, 2);
  if (analysisModels.length === 0) throw new Error("create_link_analysis_model_missing");

  let response: Awaited<ReturnType<typeof callOpenAIJson>> | null = null;
  let lastError: unknown = null;
  const attempts: CreateExternalAnalysisRun["attempts"] = [];
  for (const analysisModel of analysisModels) {
    const startedAt = Date.now();
    try {
      response = await callOpenAIJson({
        system,
        user,
        model: analysisModel,
        temperature: 0.1,
        max_tokens: 2_000,
        response_format: {
          name: "create_document_analysis",
          schema: documentAnalysisJsonSchema,
          strict: true,
        },
      });
      attempts.push({ durationMs: Date.now() - startedAt, model: analysisModel, status: "succeeded" });
      break;
    } catch (error) {
      attempts.push({ durationMs: Date.now() - startedAt, model: analysisModel, status: "failed" });
      lastError = error;
      if (!isModelNotFoundError(error) || analysisModel === analysisModels[analysisModels.length - 1]) {
        throw new CreateExternalAnalysisError("create_link_analysis_provider_failed", attempts);
      }
    }
  }
  if (!response) {
    throw new CreateExternalAnalysisError(
      lastError instanceof Error ? "create_link_analysis_provider_failed" : "create_link_analysis_failed",
      attempts,
    );
  }

  let parsed: z.infer<typeof DocumentAnalysisSchema>;
  try {
    parsed = DocumentAnalysisSchema.parse(JSON.parse(response.text));
  } catch {
    throw new CreateExternalAnalysisError("create_link_analysis_response_invalid", attempts);
  }
  return {
    attempts,
    analysis: {
      sourceUrl: params.sourceUrl,
      documentTitle: parsed.documentTitle ?? params.documentTitle,
      documentType: parsed.documentType,
      pageCount: params.pageCount ?? parsed.pageCount,
      wordCount: parsed.wordCount ?? params.text.split(/\s+/).filter(Boolean).length,
      topicCount: parsed.topicCount,
      subtopicCount: parsed.subtopicCount,
      keyStatementCount: parsed.keyStatementCount,
      verifiableClaimCount: parsed.verifiableClaimCount,
      policyProposalCount: parsed.policyProposalCount,
      subjectBreadth: parsed.subjectBreadth,
      subjectDepth: parsed.subjectDepth,
      balanceAssessment: parsed.balanceAssessment,
      sourceSpecificity: parsed.sourceSpecificity,
      sourceVerificationStatus: "not_started",
      counterpositionCoverage: parsed.counterpositionCoverage,
      summary: parsed.summary,
      topics: parsed.topics,
    },
  };
}
