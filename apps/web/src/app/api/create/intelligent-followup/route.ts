import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { stableHash } from "@core/utils/hash";
import { buildCreateIntelligentFollowup } from "@/features/create/intelligentFollowup";
import { buildCreateTechnicalFollowup } from "@/features/create/intelligentFollowupResults";
import { parseCreateIntent } from "@/features/create/intentFlows";
import { runCreateOrchestrationSingleFlight } from "@/features/create/createOrchestrationSingleFlight";
import {
  enforceCreateMutationSecurity,
  verifyCreateDraftBinding,
} from "@/features/create/createRouteSecurity";
import {
  CREATE_MAX_CONTEXT_LENGTH,
  CREATE_MAX_TEXT_LENGTH,
} from "@/features/create/createMutationSecurityContract";
import { getSessionUser } from "@/lib/server/auth/sessionUser";
import {
  ensureCreateSupportTicket,
  type CreateSupportHandoffPublic,
} from "@/features/support/createSupportTickets";
import { scheduleSupportTicketNotification } from "@/features/operator/operatorNotifications";
import {
  buildCreateInitialProgressEvents,
  buildCreateStructureConsolidatingEvent,
  buildCreateValidatedProgressEvents,
  type CreateProgressEvent,
} from "@/features/create/createProgressEventContract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readTextAlias(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const record = body as Record<string, unknown>;
  const value =
    typeof record.text === "string"
      ? record.text
      : typeof record.sourceText === "string"
        ? record.sourceText
        : typeof record.intakeText === "string"
          ? record.intakeText
          : typeof record.input === "string"
            ? record.input
            : "";
  return value.trim();
}

const RequestSchema = z.object({
  text: z.string().trim().min(1).max(CREATE_MAX_TEXT_LENGTH),
  locale: z.string().trim().max(10).optional().nullable(),
  anlassraumId: z.string().trim().max(160).optional().nullable(),
  dossierId: z.string().trim().max(160).optional().nullable(),
  intent: z.string().trim().max(CREATE_MAX_CONTEXT_LENGTH).optional().nullable(),
  correlationId: z.string().trim().min(8).max(160),
  draftId: z.string().trim().min(1).max(160),
  stream: z.boolean().optional(),
  resumeOnly: z.boolean().optional(),
});

const CREATE_PROGRESS_STREAM_HEADERS = {
  "content-type": "text/event-stream; charset=utf-8",
  "cache-control": "no-cache, no-transform",
  connection: "keep-alive",
  "x-accel-buffering": "no",
} as const;

function wantsCreateProgressStream(req: NextRequest, stream?: boolean) {
  if (stream === true) return true;
  return (req.headers.get("accept")?.toLowerCase() ?? "").includes(
    "text/event-stream",
  );
}

function encodeCreateProgressStreamEvent(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

type VerifiedCreateUserActor = {
  actorKey: string;
  affectedUserId: string;
};

function supportFailureMessage(locale: string) {
  return locale.toLowerCase().startsWith("en")
    ? "Your contribution is saved. Please try again and use the technical reference if the problem persists."
    : "Dein Beitrag ist gespeichert. Bitte versuche es erneut und nutze die technische Fehlerreferenz, falls das Problem bestehen bleibt.";
}

function supportRecordedMessage(locale: string, ticketNumber: string) {
  return locale.toLowerCase().startsWith("en")
    ? `Your contribution is saved. A technical case (${ticketNumber}) was recorded for QA/Auth review.`
    : `Dein Beitrag ist gespeichert. Der technische Fall ${ticketNumber} wurde für QA/Auth erfasst.`;
}

async function createSupportHandoff(input: {
  actor: VerifiedCreateUserActor;
  requestId: string;
  analysisState: "ai_failed" | "fetch_failed";
  planner:
    | Awaited<ReturnType<typeof buildCreateIntelligentFollowup>>["meta"]["planner"]
    | null;
  draftId: string;
  locale: string;
  reasonOverride?: string;
  technicalErrorCodeOverride?: string;
}): Promise<CreateSupportHandoffPublic> {
  try {
    const technicalErrorCode =
      input.technicalErrorCodeOverride ??
      (input.analysisState === "fetch_failed"
        ? "CREATE_FETCH_FAILED"
        : "CREATE_AI_FAILED");
    const provider = input.planner?.plannerDebug?.attemptedProvider ?? null;
    const reason =
      input.reasonOverride ??
      input.planner?.degradedReason ??
      input.analysisState;
    const ticket = await ensureCreateSupportTicket({
      affectedUserId: input.actor.affectedUserId,
      orchestrationPhase: "intelligent_followup",
      correlationId: input.requestId,
      traceId: input.requestId,
      technicalErrorCode,
      provider,
      reason,
      providerErrorCode:
        input.planner?.plannerDebug?.providerErrorCode ?? null,
      attemptCount: input.planner?.providerAttemptCount ?? 1,
      draftId: input.draftId,
      locale: input.locale,
    });
    scheduleSupportTicketNotification({
      ticketNumber: ticket.ticketNumber,
      affectedUserId: input.actor.affectedUserId,
      technicalErrorCode,
      provider,
      reason,
    });
    return {
      status: "created",
      ticket: {
        ...ticket,
        safeUserMessage: supportRecordedMessage(input.locale, ticket.ticketNumber),
      },
    };
  } catch {
    return {
      status: "failed",
      technicalReference: input.requestId,
      safeUserMessage: supportFailureMessage(input.locale),
    };
  }
}

export async function POST(req: NextRequest) {
  const requestStartedAt = Date.now();
  const fallbackRequestId = crypto.randomUUID();
  const sessionUser = await getSessionUser(req).catch(() => null);
  const userId = sessionUser?._id?.toString() ?? null;
  if (!sessionUser?.sessionValid || !userId) {
    return NextResponse.json(
      {
        ok: false,
        errorCode: "CREATE_REQUEST_NOT_ALLOWED",
        message: "Die Anfrage konnte nicht verarbeitet werden.",
      },
      { status: 401 },
    );
  }
  const securityFailure = await enforceCreateMutationSecurity({
    req,
    scope: "create_intelligent_followup",
    actorKey: `user:${userId}`,
  });
  if (securityFailure) return securityFailure;

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        errorCode: "INVALID_JSON",
        message: "Die Anfrage konnte nicht gelesen werden.",
      },
      { status: 400 },
    );
  }

  try {
    const normalizedBody = {
      ...(rawBody && typeof rawBody === "object" ? (rawBody as Record<string, unknown>) : {}),
      text: readTextAlias(rawBody),
    };
    const parsed = RequestSchema.safeParse(normalizedBody);
    if (!parsed.success) {
      const hasText = readTextAlias(rawBody).length > 0;
      return NextResponse.json(
        {
          ok: false,
          errorCode: hasText ? "CREATE_CONTEXT_REQUIRED" : "TEXT_REQUIRED",
          message: hasText
            ? "Der gespeicherte Entwurf und die technische Referenz fehlen."
            : "Bitte gib zuerst einen Text ein.",
        },
        { status: 400 },
      );
    }

    const body = parsed.data;
    const draftBinding = await verifyCreateDraftBinding({
      draftId: body.draftId,
      userId,
      text: body.text,
      locale: body.locale,
      anlassraumId: body.anlassraumId,
    });
    if (!draftBinding) {
      return NextResponse.json(
        {
          ok: false,
          errorCode: "CREATE_REQUEST_NOT_ALLOWED",
          message: "Die Anfrage konnte nicht verarbeitet werden.",
        },
        { status: 403 },
      );
    }
    const accessMs = Date.now() - requestStartedAt;
    const requestId = body.correlationId;
    const normalizedIntent = parseCreateIntent(body.intent ?? undefined);
    const operationType = "create_intelligent_followup_planner" as const;
    const operationId = requestId;
    const locale = body.locale ?? "de";
    const verifiedActor: VerifiedCreateUserActor = {
      actorKey: `user:${userId}`,
      affectedUserId: userId,
    };
    const runOperation = (onProgress?: (event: CreateProgressEvent) => void | Promise<void>) =>
      runCreateOrchestrationSingleFlight({
      actorKey: verifiedActor.actorKey,
      draftId: draftBinding.draftId,
      correlationId: requestId,
      operationType,
      resumeOnly: body.resumeOnly === true,
      onProgress,
      inputHash: stableHash({
        draftBinding: draftBinding.inputHash,
        text: body.text,
        locale,
        anlassraumId: body.anlassraumId ?? null,
        dossierId: body.dossierId ?? null,
        intent: normalizedIntent,
      }),
      run: async ({
        recoveryWithoutExternalCall,
        markExternalExecutionStarted,
        publishProgressEvent,
      }) => {
        const initialProgress = buildCreateInitialProgressEvents({
          text: body.text,
          operationId,
          correlationId: requestId,
          locale,
        });
        for (const event of initialProgress.events) {
          await publishProgressEvent(event);
        }

        if (recoveryWithoutExternalCall) {
          for (const event of buildCreateValidatedProgressEvents({
            operationId,
            correlationId: requestId,
            locale,
            structure: initialProgress.structure,
            topics: [],
            scopes: ["unclear"],
            qualityPassed: false,
            partial: true,
          })) {
            await publishProgressEvent(event);
          }
          const supportHandoff = await createSupportHandoff({
            actor: verifiedActor,
            requestId,
            analysisState: "ai_failed",
            planner: null,
            draftId: draftBinding.draftId,
            locale,
            reasonOverride: "stale_single_flight_recovered",
          });
          return {
            ok: true as const,
            result: buildCreateTechnicalFollowup({
              text: body.text,
              analysisState: "ai_failed",
              sourceType: "text",
              sourceLoaded: true,
              userMessage:
                supportHandoff.status === "created"
                  ? supportHandoff.ticket.safeUserMessage
                  : supportHandoff.safeUserMessage,
            }),
            supportHandoff,
            trace: {
              requestId,
              operationId,
              operationType,
              userScope: "present" as const,
              timings: {
                accessMs,
                plannerMs: 0,
                contextMs: 0,
                totalMs: Date.now() - requestStartedAt,
              },
            },
          };
        }

        try {
          await markExternalExecutionStarted();
          const consolidatingEvent = buildCreateStructureConsolidatingEvent({
            operationId,
            correlationId: requestId,
            locale,
            structure: initialProgress.structure,
          });
          if (consolidatingEvent) {
            await publishProgressEvent(consolidatingEvent);
          }
          const orchestrationStartedAt = Date.now();
          const result = await buildCreateIntelligentFollowup({
            text: body.text,
            locale,
            requestId,
            operationId,
            operationType,
            userId: verifiedActor.affectedUserId,
            anlassraumId: body.anlassraumId ?? null,
            dossierId: body.dossierId ?? null,
            intent: normalizedIntent,
            maxSuggestions: 6,
          });
          const orchestrationMs = Date.now() - orchestrationStartedAt;
          const plannerMs = result.meta?.planner?.runtimeMs ?? null;
          const analysisState = result.meta?.analysis?.state ?? null;
          const qualityPassed =
            result.meta?.planner?.qualityStatus === "specific" &&
            result.meta.planner.plannerDegraded === false &&
            analysisState === "result_ready";
          for (const event of buildCreateValidatedProgressEvents({
            operationId,
            correlationId: requestId,
            locale,
            structure: initialProgress.structure,
            topics: result.understanding.topics,
            scopes: result.understanding.scopes,
            qualityPassed,
            partial: !qualityPassed,
          })) {
            await publishProgressEvent(event);
          }
          const supportHandoff =
            analysisState === "ai_failed" || analysisState === "fetch_failed"
              ? await createSupportHandoff({
                  actor: verifiedActor,
                  requestId,
                  analysisState,
                  planner: result.meta?.planner ?? null,
                  draftId: draftBinding.draftId,
                  locale,
                })
              : null;

          return {
            ok: true as const,
            result,
            supportHandoff,
            trace: {
              requestId,
              operationId,
              operationType,
              userScope: "present" as const,
              intake: result.meta?.planner
                ? {
                    selectedTimingLane: result.meta.planner.timingLane ?? "standard",
                    inputLength: result.meta.planner.inputLength ?? body.text.trim().length,
                    canonicalTopicCount: result.understanding.topics.length,
                    issueMode:
                      result.meta.planner.issueMode ??
                      (result.understanding.topics.length >= 3
                        ? "multi_issue"
                        : "single_issue"),
                  }
                : undefined,
              timings: {
                accessMs,
                plannerMs,
                contextMs:
                  plannerMs === null
                    ? null
                    : Math.max(0, orchestrationMs - plannerMs),
                totalMs: Date.now() - requestStartedAt,
              },
            },
          };
        } catch {
          for (const event of buildCreateValidatedProgressEvents({
            operationId,
            correlationId: requestId,
            locale,
            structure: initialProgress.structure,
            topics: [],
            scopes: ["unclear"],
            qualityPassed: false,
            partial: true,
          })) {
            await publishProgressEvent(event);
          }
          const supportHandoff = await createSupportHandoff({
            actor: verifiedActor,
            requestId,
            analysisState: "ai_failed",
            planner: null,
            draftId: draftBinding.draftId,
            locale,
            reasonOverride: "unhandled_orchestration_error",
            technicalErrorCodeOverride: "CREATE_FOLLOWUP_FAILED",
          });
          return {
            ok: true as const,
            result: buildCreateTechnicalFollowup({
              text: body.text,
              analysisState: "ai_failed",
              sourceType: "text",
              sourceLoaded: true,
              userMessage:
                supportHandoff.status === "created"
                  ? supportHandoff.ticket.safeUserMessage
                  : supportHandoff.safeUserMessage,
            }),
            supportHandoff,
            trace: {
              requestId,
              operationId,
              operationType,
              userScope: "present" as const,
              timings: {
                accessMs,
                plannerMs: null,
                contextMs: null,
                totalMs: Date.now() - requestStartedAt,
              },
            },
          };
        }
      },
    });

    const buildResponsePayload = (
      singleFlight: Awaited<ReturnType<typeof runOperation>>,
    ) => ({
      ...singleFlight.result,
      trace: {
        ...singleFlight.result.trace,
        singleFlight: singleFlight.reused
          ? "reused"
          : singleFlight.recovered
            ? "recovered"
            : "owner",
        timings: {
          ...singleFlight.result.trace.timings,
          totalMs: Date.now() - requestStartedAt,
        },
      },
    });

    if (wantsCreateProgressStream(req, body.stream)) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          const send = (event: string, data: unknown) => {
            try {
              controller.enqueue(
                encoder.encode(encodeCreateProgressStreamEvent(event, data)),
              );
            } catch {
              // The durable operation continues even if the client disconnects.
            }
          };
          try {
            const singleFlight = await runOperation((event) => {
              send("progress", { event });
            });
            send("result", buildResponsePayload(singleFlight));
          } catch (error) {
            send("error", {
              errorCode:
                error instanceof Error &&
                error.message === "create_single_flight_resume_unavailable"
                  ? "CREATE_PROGRESS_RESUME_UNAVAILABLE"
                  : "CREATE_PROGRESS_STREAM_FAILED",
              message:
                locale.toLowerCase().startsWith("en")
                  ? "The saved analysis could not be resumed. You can retry it explicitly."
                  : "Die gespeicherte Analyse konnte nicht fortgesetzt werden. Du kannst sie ausdrücklich erneut starten.",
            });
          } finally {
            try {
              controller.close();
            } catch {
              // The browser may already have closed the stream.
            }
          }
        },
      });
      return new Response(stream, {
        status: 200,
        headers: CREATE_PROGRESS_STREAM_HEADERS,
      });
    }

    const singleFlight = await runOperation();
    return NextResponse.json(buildResponsePayload(singleFlight));
  } catch {
    const normalizedBody =
      rawBody && typeof rawBody === "object"
        ? (rawBody as Record<string, unknown>)
        : {};
    const sourceText = readTextAlias(rawBody);
    const locale =
      typeof normalizedBody.locale === "string" ? normalizedBody.locale : "de";
    const requestId =
      typeof normalizedBody.correlationId === "string" &&
      normalizedBody.correlationId.trim().length >= 8
        ? normalizedBody.correlationId.trim()
        : fallbackRequestId;
    const supportHandoff: CreateSupportHandoffPublic = {
      status: "failed",
      technicalReference: requestId,
      safeUserMessage: supportFailureMessage(locale),
    };
    const response = NextResponse.json({
      ok: true,
      result: buildCreateTechnicalFollowup({
        text: sourceText,
        analysisState: "ai_failed",
        sourceType: "text",
        sourceLoaded: true,
        userMessage: supportHandoff.safeUserMessage,
      }),
      supportHandoff,
      trace: {
        requestId,
        operationId: requestId,
        operationType: "create_intelligent_followup_planner",
        userScope: "present",
        singleFlight: "unavailable",
        timings: {
          accessMs: Date.now() - requestStartedAt,
          plannerMs: null,
          contextMs: null,
          totalMs: Date.now() - requestStartedAt,
        },
      },
    });
    return response;
  }
}
