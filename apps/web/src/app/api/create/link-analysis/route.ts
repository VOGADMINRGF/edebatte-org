import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  buildCreateTechnicalFollowup,
  buildCreateValidatedDocumentFollowup,
} from "@/features/create/intelligentFollowupResults";
import type { DocumentAnalysisSummary } from "@/features/create/intelligentFollowupContract";
import {
  CreateExternalAnalysisError,
  runCreateExternalSourceAnalysis,
} from "@/features/create/externalSourceAnalysis";
import {
  loadCreateExternalSource,
  validateCreateExternalSourceUrl,
} from "@/features/create/externalSourceIntake";
import { runCreateOrchestrationSingleFlight } from "@/features/create/createOrchestrationSingleFlight";
import { getSessionUser } from "@/lib/server/auth/sessionUser";
import {
  enforceCreateMutationSecurity,
  verifyCreateDraftBinding,
} from "@/features/create/createRouteSecurity";
import {
  CREATE_MAX_CONTEXT_LENGTH,
  CREATE_MAX_TEXT_LENGTH,
  CREATE_MAX_URL_LENGTH,
} from "@/features/create/createMutationSecurityContract";
import {
  ensureCreateSupportTicket,
  type CreateSupportHandoffPublic,
} from "@/features/support/createSupportTickets";
import { upsertCreateDraftSourceEvidence } from "@/server/serverDrafts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  text: z.string().trim().min(1).max(CREATE_MAX_TEXT_LENGTH),
  url: z.string().trim().url().max(CREATE_MAX_URL_LENGTH),
  locale: z.string().trim().max(10).optional().nullable(),
  additionalContext: z.string().trim().max(CREATE_MAX_CONTEXT_LENGTH).optional().nullable(),
  correlationId: z.string().trim().min(8).max(160).optional().nullable(),
  draftId: z.string().trim().min(1).max(160),
});

type CreateLinkStage = "fetch" | "analysis" | "evidence" | "recovery";

class CreateLinkOperationError extends Error {
  constructor(
    public readonly stage: CreateLinkStage,
    public readonly sourceLoaded: boolean,
    public readonly technicalErrorCode: string,
    public readonly safeReason: string,
  ) {
    super(safeReason);
    this.name = "CreateLinkOperationError";
  }
}

type CreateLinkOperationResult = {
  analysis: DocumentAnalysisSummary;
  source: {
    finalUrl: string;
    contentHash: string;
    sourceKind: "html" | "pdf" | "youtube_transcript";
  };
  evidence: {
    sourceKey: string;
    artifactId: string;
  };
};

function buildOperationFingerprint(input: {
  draftId: string;
  url: string;
  text: string;
  locale: string;
  additionalContext: string;
}): string {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex");
}

export async function POST(req: NextRequest) {
  const fallbackCorrelationId = crypto.randomUUID();
  const sessionUser = await getSessionUser(req).catch(() => null);
  const userId = sessionUser?._id?.toString() ?? null;
  if (!sessionUser?.sessionValid || !userId) {
    return NextResponse.json(
      { ok: false, errorCode: "CREATE_REQUEST_NOT_ALLOWED" },
      { status: 401 },
    );
  }

  const securityFailure = await enforceCreateMutationSecurity({
    req,
    scope: "create_link_analysis",
    actorKey: \`user:\${userId}\`,
  });
  if (securityFailure) return securityFailure;

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, errorCode: "INVALID_JSON" },
      { status: 400 },
    );
  }

  const parsed = RequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, errorCode: "INVALID_INPUT" },
      { status: 400 },
    );
  }

  const body = parsed.data;
  const draftBinding = await verifyCreateDraftBinding({
    draftId: body.draftId,
    userId,
    text: body.text,
    locale: body.locale,
  });
  if (!draftBinding) {
    return NextResponse.json(
      { ok: false, errorCode: "CREATE_REQUEST_NOT_ALLOWED" },
      { status: 403 },
    );
  }

  const correlationId = body.correlationId ?? fallbackCorrelationId;
  const buildFailureResponse = async (input: {
    analysisState: "ai_failed" | "fetch_failed";
    sourceLoaded: boolean;
    technicalErrorCode: string;
    reason: string;
    provider: "openai" | null;
  }) => {
    let supportHandoff: CreateSupportHandoffPublic;
    try {
      const ticket = await ensureCreateSupportTicket({
        affectedUserId: userId,
        orchestrationPhase: "link_analysis",
        correlationId,
        traceId: correlationId,
        technicalErrorCode: input.technicalErrorCode,
        provider: input.provider,
        reason: input.reason,
        attemptCount: 1,
        draftId: draftBinding.draftId,
        locale: body.locale ?? "de",
      });
      supportHandoff = { status: "created", ticket };
    } catch {
      supportHandoff = {
        status: "failed",
        technicalReference: correlationId,
        safeUserMessage:
          body.locale?.toLowerCase().startsWith("en")
            ? "Your contribution is saved. Please try again and use the technical reference if the problem persists."
            : "Dein Beitrag ist gespeichert. Bitte versuche es erneut und nutze die technische Fehlerreferenz, falls das Problem bestehen bleibt.",
      };
    }

    return NextResponse.json({
      ok: true,
      result: buildCreateTechnicalFollowup({
        text: body.text,
        analysisState: input.analysisState,
        sourceType: input.sourceLoaded ? "document" : "link",
        sourceLoaded: input.sourceLoaded,
        userMessage:
          supportHandoff.status === "created"
            ? supportHandoff.ticket.safeUserMessage
            : supportHandoff.safeUserMessage,
      }),
      supportHandoff,
      trace: { correlationId },
    });
  };

  try {
    validateCreateExternalSourceUrl(body.url);

    const locale = body.locale ?? "de";
    const additionalContext = body.additionalContext ?? "";
    const operationFingerprint = buildOperationFingerprint({
      draftId: draftBinding.draftId,
      url: body.url,
      text: body.text,
      locale,
      additionalContext,
    });

    const singleFlight =
      await runCreateOrchestrationSingleFlight<CreateLinkOperationResult>({
        actorKey: \`user:\${userId}\`,
        draftId: draftBinding.draftId,
        correlationId: \`c8:\${operationFingerprint}\`,
        operationType: "create_authenticated_source_link_analysis",
        inputHash: operationFingerprint,
        run: async ({
          recoveryWithoutExternalCall,
          markExternalExecutionStarted,
        }) => {
          if (recoveryWithoutExternalCall) {
            throw new CreateLinkOperationError(
              "recovery",
              false,
              "CREATE_LINK_RECOVERY_BLOCKED",
              "source_operation_recovery_blocked",
            );
          }

          await markExternalExecutionStarted();

          let source;
          try {
            source = await loadCreateExternalSource(body.url);
          } catch {
            throw new CreateLinkOperationError(
              "fetch",
              false,
              "CREATE_LINK_FETCH_FAILED",
              "source_fetch_failed",
            );
          }

          if (source.text.trim().length < 180) {
            throw new CreateLinkOperationError(
              "fetch",
              false,
              "CREATE_LINK_CONTENT_INCOMPLETE",
              "source_content_too_short",
            );
          }

          let analysis: DocumentAnalysisSummary;
          try {
            const analysisRun = await runCreateExternalSourceAnalysis({
              sourceUrl: source.finalUrl,
              text: source.text,
              locale,
              pageCount: source.pageCount,
              documentTitle: source.documentTitle,
              documentType: source.documentType,
              additionalContext,
            });
            analysis = analysisRun.analysis;
          } catch (error) {
            const reason =
              error instanceof CreateExternalAnalysisError
                ? error.message
                : "create_link_analysis_failed";
            throw new CreateLinkOperationError(
              "analysis",
              true,
              "CREATE_LINK_AI_FAILED",
              reason,
            );
          }

          const evidence = await upsertCreateDraftSourceEvidence({
            draftId: draftBinding.draftId,
            userId,
            canonicalRef: source.finalUrl,
            contentHash: source.contentHash,
            originalLocale: source.sourceLocale,
          });
          if (!evidence.ok) {
            throw new CreateLinkOperationError(
              "evidence",
              true,
              "CREATE_LINK_EVIDENCE_PERSIST_FAILED",
              "source_evidence_persist_failed",
            );
          }

          return {
            analysis,
            source: {
              finalUrl: source.finalUrl,
              contentHash: source.contentHash,
              sourceKind: source.sourceKind,
            },
            evidence: {
              sourceKey: evidence.sourceKey,
              artifactId: evidence.artifact.id,
            },
          };
        },
      });

    return NextResponse.json({
      ok: true,
      result: buildCreateValidatedDocumentFollowup({
        text: body.text,
        sourceUrl: singleFlight.result.source.finalUrl,
        documentAnalysis: singleFlight.result.analysis,
      }),
      sourceEvidence: singleFlight.result.evidence,
      supportHandoff: null,
      trace: {
        correlationId,
        sourceOperationReused: singleFlight.reused,
        sourceOperationRecovered: singleFlight.recovered,
      },
    });
  } catch (error) {
    const failure =
      error instanceof CreateLinkOperationError
        ? error
        : new CreateLinkOperationError(
            "fetch",
            false,
            "CREATE_LINK_FETCH_FAILED",
            "source_operation_unavailable",
          );
    return buildFailureResponse({
      analysisState:
        failure.stage === "analysis" || failure.stage === "evidence"
          ? "ai_failed"
          : "fetch_failed",
      sourceLoaded: failure.sourceLoaded,
      technicalErrorCode: failure.technicalErrorCode,
      reason: failure.safeReason,
      provider: failure.stage === "analysis" ? "openai" : null,
    });
  }
}
