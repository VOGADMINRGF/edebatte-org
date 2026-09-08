import { after, NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { stableHash } from "@core/utils/hash";
import { buildCreateIntelligentFollowup } from "@/features/create/intelligentFollowup";
import {
  buildCreateTechnicalFollowup,
  buildCreateUnloadedLinkFollowup,
} from "@/features/create/intelligentFollowupResults";
import { detectCreateLinkIntake } from "@/features/create/linkIntake";
import { resolveCreateCitizenIntakeContextFromOfficialDirectory } from "@/features/create/createCitizenIntakeContextServer";
import { runCreateOrchestrationSingleFlight } from "@/features/create/createOrchestrationSingleFlight";
import { evaluateCreateInputSafety } from "@/features/create/safety/createInputSafety";
import { CREATE_MAX_TEXT_LENGTH } from "@/features/create/createMutationSecurityContract";
import type { CreateIntent } from "@/features/create/intentFlows";
import { enforceCreateMutationSecurity } from "@/features/create/createRouteSecurity";
import {
  CREATE_ANON_SESSION_COOKIE,
  verifyAnonymousSession,
} from "@/features/create/createAnonymousSession";

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
});

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
  const linkDetection = detectCreateLinkIntake(text);
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

  if (linkDetection.hasLink && linkDetection.primaryUrl) {
    return json({
      ok: true,
      result: buildCreateUnloadedLinkFollowup({
        text,
        sourceUrl: linkDetection.primaryUrl,
        remainingText: linkDetection.remainingText,
        locale,
      }),
      safety: safeSafetySummary(safety),
      meta: {
        mode: "anonymous_unloaded_source",
        requestId,
        persisted: false,
        accountRequired: false,
        sourceValidationRequired: true,
        deepSearchUsed: false,
        researchUsed: "none",
        noAutoPublish: true,
        noSilentMerge: true,
        ownershipBoundary: "validate_source_before_durable_write",
      },
    });
  }

  try {
    const singleFlight = await runCreateOrchestrationSingleFlight({
      actorKey: `anonymous:${anonymousSession.id}`,
      draftId: `anonymous:${anonymousSession.id}`,
      correlationId: requestId,
      operationType: "create_intelligent_followup_planner",
      inputHash: stableHash({ text: modelText, locale, intent }),
      waitMs: 25_000,
      run: async ({ recoveryWithoutExternalCall, markExternalExecutionStarted }) => {
        if (recoveryWithoutExternalCall) {
          return buildCreateTechnicalFollowup({
            text: modelText,
            analysisState: "ai_failed",
            sourceType: "text",
            sourceLoaded: true,
            userMessage:
              locale.startsWith("en")
                ? "The earlier classification attempt could not be resumed safely. Your text remains in this browser; please retry."
                : "Der frühere Einordnungsversuch konnte nicht sicher fortgesetzt werden. Dein Text bleibt in diesem Browser; bitte versuche es erneut.",
            citizenContext: resolveCreateCitizenIntakeContextFromOfficialDirectory({
              text: modelText,
              locale,
            }),
          });
        }
        await markExternalExecutionStarted();
        return buildCreateIntelligentFollowup({
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
          schedulePostResponseTask: after,
        });
      },
    });

    return json({
      ok: true,
      result: singleFlight.result,
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
      },
    });
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
