import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { stableHash } from "@core/utils/hash";
import { buildCreateIntelligentFollowup } from "@/features/create/intelligentFollowup";
import { buildCreateTechnicalFollowup } from "@/features/create/intelligentFollowupResults";
import { runCreateOrchestrationSingleFlight } from "@/features/create/createOrchestrationSingleFlight";
import { evaluateCreateInputSafety } from "@/features/create/safety/createInputSafety";
import { CREATE_MAX_TEXT_LENGTH } from "@/features/create/createMutationSecurityContract";
import type { CreateIntent } from "@/features/create/intentFlows";
import { enforceCreateMutationSecurity } from "@/features/create/createRouteSecurity";
import {
  CREATE_ANON_SESSION_COOKIE,
  verifyAnonymousSession,
} from "@/features/create/createAnonymousSession";
import {
  buildCreateInitialProgressEvents,
  buildCreateStructureConsolidatingEvent,
  buildCreateValidatedProgressEvents,
  type CreateProgressEvent,
} from "@/features/create/createProgressEventContract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const ANONYMOUS_INTAKE_MAX_TEXT_LENGTH = Math.min(CREATE_MAX_TEXT_LENGTH, 6_000);
const ALLOWED_INTENTS = new Set<CreateIntent>(["contribute", "check", "draft"]);
const RequestSchema = z.object({
  text: z.string().trim().min(1).max(ANONYMOUS_INTAKE_MAX_TEXT_LENGTH),
  locale: z.string().trim().max(10).optional().nullable(),
  intent: z.string().trim().max(80).optional().nullable(),
  correlationId: z.string().trim().min(8).max(160),
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
  return (
    stream === true ||
    (req.headers.get("accept")?.toLowerCase() ?? "").includes("text/event-stream")
  );
}

function encodeCreateProgressStreamEvent(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "cache-control": "no-store, max-age=0",
      "x-content-type-options": "nosniff",
    },
  });
}

function safeLocale(value: unknown): string {
  if (typeof value !== "string") return "de";
  const normalized = value.trim().toLowerCase().replace("_", "-");
  return /^[a-z]{2}(?:-[a-z]{2})?$/.test(normalized) ? normalized : "de";
}

function safeIntent(value: unknown): CreateIntent {
  if (typeof value !== "string") return "contribute";
  return ALLOWED_INTENTS.has(value as CreateIntent) ? (value as CreateIntent) : "contribute";
}

function safeSafetySummary(safety: ReturnType<typeof evaluateCreateInputSafety>) {
  return {
    decision: safety.decision,
    severity: safety.severity,
    requiresHumanReview: safety.requiresHumanReview,
    nextActions: safety.nextActions.slice(0, 4),
    noAutoPublish: true as const,
    noSilentMerge: true as const,
  };
}

/**
 * Public, read-only citizen intake.
 *
 * This is intentionally NOT a second Create runtime. It projects the same
 * canonical AI planner used by authenticated `/create`, but without draft,
 * handoff, ticket or publication mutations. Durable ownership begins only
 * after authentication.
 */
export async function POST(req: NextRequest) {
  const anonymousSession = verifyAnonymousSession(
    req.cookies.get(CREATE_ANON_SESSION_COOKIE)?.value,
  );
  if (!anonymousSession) {
    return json({ ok: false, errorCode: "CREATE_REQUEST_REJECTED" }, 403);
  }
  const securityFailure = await enforceCreateMutationSecurity({
    req,
    scope: "create_intelligent_followup",
    actorKey: `anonymous:${anonymousSession.id}`,
  });
  if (securityFailure) return securityFailure;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ ok: false, errorCode: "INVALID_JSON", message: "Ungültige Eingabe." }, 400);
  }

  const parsed = RequestSchema.safeParse(raw);
  if (!parsed.success) {
    const rawText =
      raw && typeof raw === "object" && !Array.isArray(raw) && typeof (raw as Record<string, unknown>).text === "string"
        ? String((raw as Record<string, unknown>).text).trim()
        : "";
    if (rawText.length > ANONYMOUS_INTAKE_MAX_TEXT_LENGTH) {
      return json(
        {
          ok: false,
          errorCode: "TEXT_TOO_LONG",
          message: `Für die erste Einordnung sind maximal ${ANONYMOUS_INTAKE_MAX_TEXT_LENGTH} Zeichen möglich.`,
        },
        413,
      );
    }
    return json(
      {
        ok: false,
        errorCode: "TEXT_REQUIRED",
        message: "Bitte beschreibe kurz dein Anliegen.",
      },
      400,
    );
  }
  const text = parsed.data.text;
  const locale = safeLocale(parsed.data.locale);
  const intent = safeIntent(parsed.data.intent);
  const requestId = parsed.data.correlationId;
  const safety = evaluateCreateInputSafety({
    text,
    locale,
    uiLocale: locale,
    sourceLanguage: locale,
    contentLanguage: locale,
    routeStage: "analyze",
    runId: requestId,
    correlationId: requestId,
  });

  if (safety.decision === "blocked" || safety.decision === "moderation_required") {
    return json(
      {
        ok: false,
        errorCode: "INTAKE_REVIEW_REQUIRED",
        message:
          locale.startsWith("en")
            ? "This contribution needs a safer framing before AI classification."
            : "Dieser Beitrag braucht vor der KI-Einordnung eine sichere Überarbeitung.",
        safety: safeSafetySummary(safety),
      },
      422,
    );
  }

  // The original citizen text remains in the browser guest workstate. PII that
  // can be safely removed is not forwarded to the model unnecessarily.
  const modelText = safety.redactedText.trim();
  if (!modelText) {
    return json(
      {
        ok: false,
        errorCode: "INTAKE_REVIEW_REQUIRED",
        message:
          locale.startsWith("en")
            ? "This contribution needs a safer framing before AI classification."
            : "Dieser Beitrag braucht vor der KI-Einordnung eine sichere Überarbeitung.",
        safety: safeSafetySummary(safety),
      },
      422,
    );
  }

  try {
    const runOperation = (onProgress?: (event: CreateProgressEvent) => void | Promise<void>) =>
      runCreateOrchestrationSingleFlight({
      actorKey: `anonymous:${anonymousSession.id}`,
      draftId: `anonymous:${anonymousSession.id}`,
      correlationId: requestId,
      operationType: "create_intelligent_followup_planner",
      inputHash: stableHash({ text: modelText, locale, intent }),
      waitMs: 25_000,
      resumeOnly: parsed.data.resumeOnly === true,
      onProgress,
      run: async ({
        recoveryWithoutExternalCall,
        markExternalExecutionStarted,
        publishProgressEvent,
      }) => {
        const initialProgress = buildCreateInitialProgressEvents({
          text: modelText,
          operationId: requestId,
          correlationId: requestId,
          locale,
          persistence: "browser",
          // Only the browser can verify its own storage write. The client adds
          // draft.saved after that write succeeds.
          draftSaved: false,
        });
        for (const event of initialProgress.events) {
          await publishProgressEvent(event);
        }
        if (recoveryWithoutExternalCall) {
          for (const event of buildCreateValidatedProgressEvents({
            operationId: requestId,
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
          return {
            result: buildCreateTechnicalFollowup({
              text: modelText,
              analysisState: "ai_failed",
              sourceType: "text",
              sourceLoaded: true,
              userMessage:
                locale.startsWith("en")
                  ? "The earlier classification attempt could not be resumed safely. Your text remains in this browser; please retry."
                  : "Der frühere Einordnungsversuch konnte nicht sicher fortgesetzt werden. Dein Text bleibt in diesem Browser; bitte versuche es erneut.",
            }),
            recoveredWithoutProvider: true,
          };
        }
        await markExternalExecutionStarted();
        const consolidatingEvent = buildCreateStructureConsolidatingEvent({
          operationId: requestId,
          correlationId: requestId,
          locale,
          structure: initialProgress.structure,
        });
        if (consolidatingEvent) await publishProgressEvent(consolidatingEvent);
        try {
          const result = await buildCreateIntelligentFollowup({
            text: modelText,
            locale,
            intent,
            userId: null,
            requestId,
            operationId: requestId,
            operationType: "create_anonymous_ai_intake",
            organizationId: null,
            anlassraumId: null,
            dossierId: null,
            maxSuggestions: 6,
          });
          const analysisState = result.meta?.analysis?.state ?? null;
          const qualityPassed =
            result.meta?.planner?.qualityStatus === "specific" &&
            result.meta.planner.plannerDegraded === false &&
            analysisState === "result_ready";
          for (const event of buildCreateValidatedProgressEvents({
            operationId: requestId,
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
          return { result, recoveredWithoutProvider: false };
        } catch (error) {
          for (const event of buildCreateValidatedProgressEvents({
            operationId: requestId,
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
          throw error;
        }
      },
    });

    const buildResponsePayload = (
      singleFlight: Awaited<ReturnType<typeof runOperation>>,
    ) => ({
      ok: true,
      result: singleFlight.result.result,
      safety: safeSafetySummary(safety),
      meta: {
        mode: "anonymous_ai_micro_pass",
        requestId,
        persisted: false,
        accountRequired: false,
        inputRedactedForAi: modelText !== text,
        deepSearchUsed: false,
        researchUsed: "none",
        noAutoPublish: true,
        noSilentMerge: true,
        ownershipBoundary: "authenticate_before_durable_write",
        singleFlightReused: singleFlight.reused,
        singleFlightRecovered: singleFlight.recovered,
        recoveredWithoutProvider: singleFlight.result.recoveredWithoutProvider,
      },
    });

    if (wantsCreateProgressStream(req, parsed.data.stream)) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          const send = (event: string, data: unknown) => {
            try {
              controller.enqueue(
                encoder.encode(encodeCreateProgressStreamEvent(event, data)),
              );
            } catch {
              // The short-lived operation continues after a browser disconnect.
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
                locale.startsWith("en")
                  ? "The browser-local classification could not be resumed. You can retry it explicitly."
                  : "Die browserlokale Einordnung konnte nicht fortgesetzt werden. Du kannst sie ausdrücklich erneut starten.",
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
    return json(buildResponsePayload(singleFlight));
  } catch {
    return json(
      {
        ok: false,
        errorCode: "AI_INTAKE_UNAVAILABLE",
        message:
          locale.startsWith("en")
            ? "I couldn’t complete the classification just now. Your text stays in this browser so you can try again."
            : "Ich konnte die Einordnung gerade nicht abschließen. Dein Text bleibt in diesem Browser erhalten und du kannst es erneut versuchen.",
        retryable: true,
        meta: {
          mode: "anonymous_ai_micro_pass",
          persisted: false,
          noAutoPublish: true,
          noSilentMerge: true,
        },
      },
      503,
    );
  }
}
