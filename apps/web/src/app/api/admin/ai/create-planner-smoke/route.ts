import { NextRequest, NextResponse } from "next/server";
import {
  buildCreatePlanner,
  resolveCreatePlannerTimeoutMs,
} from "@/features/create/createPlanner";
import { resolveCreateIntakeTiming } from "@/features/create/createFastIntakeTiming";
import { getAiRuntimePolicy } from "@features/ai/aiRuntimePolicy";

const CREATE_PLANNER_SMOKE_TEXT = [
  "In Rahnsdorf sollen mehrere kommunale Themen gemeinsam eingeordnet werden.",
  "Diskutiert werden eine sichere Schulwegquerung, der Bus-Takt, bezahlbares Wohnen,",
  "der Erhalt von Grünflächen, die Finanzierung eines Jugendtreffs, digitale Bürgerservices",
  "und transparente Regeln für neue Bauvorhaben. Bitte strukturiere die Themen getrennt",
  "und benenne die wichtigste offene Rückfrage.",
].join(" ");


function plannerModelCandidates(): string[] {
  return [...getAiRuntimePolicy().openai.plannerModelCandidates];
}

function safeRootCause(result: Awaited<ReturnType<typeof buildCreatePlanner>>): string {
  if (
    result.source === "openai" &&
    result.providerCallSucceeded &&
    !result.plannerDegraded &&
    result.qualityStatus === "specific"
  ) {
    return "CREATE_PLANNER_OK";
  }
  return (
    result.plannerDebug.providerErrorCode ??
    result.degradedReason?.toUpperCase() ??
    "CREATE_PLANNER_DEGRADED"
  );
}

function nextActionFor(rootCause: string): string {
  if (rootCause === "CREATE_PLANNER_OK") {
    return "Keine Aktion nötig; bei Modell- oder ENV-Änderungen erneut prüfen.";
  }
  if (rootCause === "MODEL_NOT_FOUND") {
    return "Planner-Modellzugriff und Fallback-Kandidaten für die aktuelle OpenAI-Umgebung prüfen.";
  }
  if (rootCause === "TIMEOUT") {
    return "CREATE_PLANNER_TIMEOUT_MS und Provider-Latenz prüfen.";
  }
  if (rootCause === "MISSING_PROVIDER_KEY") {
    return "OPENAI_API_KEY in der aktiven Runtime konfigurieren.";
  }
  return "Create-Planner-Konfiguration und sicheren Providerpfad prüfen.";
}

export async function POST(req: NextRequest) {
  const { requireAdminOrResponse } = await import("@/lib/server/auth/admin");
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const runId = crypto.randomUUID();
  const correlationId = runId;
  const startedAt = Date.now();
  const modelCandidates = plannerModelCandidates();
  const intakeTiming = resolveCreateIntakeTiming(CREATE_PLANNER_SMOKE_TEXT);
  const timeoutMs = resolveCreatePlannerTimeoutMs(CREATE_PLANNER_SMOKE_TEXT);

  try {
    const planner = await buildCreatePlanner({
      text: CREATE_PLANNER_SMOKE_TEXT,
      locale: "de",
      requestId: runId,
      operationId: `admin-create-planner-smoke:${runId}`,
      operationType: "admin_create_planner_smoke",
      userId: gate._id ? String(gate._id) : null,
    });
    const durationMs = Date.now() - startedAt;
    const rootCause = safeRootCause(planner);
    const ok = rootCause === "CREATE_PLANNER_OK";
    const attemptedModel = planner.plannerDebug.attemptedModel ?? modelCandidates[0] ?? null;
    const effectiveModel = planner.plannerDebug.usedModel ?? attemptedModel;
    const selectedModel = modelCandidates[0] ?? null;

    const row = {
      provider: "openai",
      displayName: "Create Planner / OpenAI",
      model: effectiveModel,
      mode: "create_planner" as const,
      status: ok ? ("ok" as const) : ("failed" as const),
      rootCause,
      nextAction: nextActionFor(rootCause),
      providerErrorCode: planner.plannerDebug.providerErrorCode ?? planner.degradedReason?.toUpperCase() ?? null,
      httpStatus: null,
      providerStatus: planner.plannerDebug.providerAvailable ? ("reachable" as const) : ("unknown" as const),
      adapterStatus: planner.providerCallSucceeded ? ("ok" as const) : ("failed" as const),
      parseStatus: planner.plannerDebug.rawPayloadValid ? ("ok" as const) : ("failed" as const),
      schemaStatus: planner.plannerDebug.normalizedPayloadValid ? ("ok" as const) : ("failed" as const),
      schemaPath: null,
      journeyDecision: planner.providerCallAttempted ? "selected" : "config_missing",
      strictStatus: planner.plannerDebug.qualityGatePassed ? "ok" : "blocked",
      finalContractStatus: ok ? "strict_ok" : "blocked",
      durationMs,
      timeoutMs,
      maxOutputTokens: getAiRuntimePolicy().plannerMaxOutputTokens,
      tokensIn: null,
      tokensOut: null,
      estimatedCostUsd: null,
      estimatedCostEur: null,
      costKnown: false,
      selectedSmokeModel: selectedModel,
      effectiveModel,
      openAiSmokeModelMismatch:
        Boolean(selectedModel && effectiveModel) && selectedModel !== effectiveModel,
    };

    return NextResponse.json({
      ok,
      mode: "create_planner",
      runId,
      correlationId,
      rows: [row],
      directContractRows: [],
      operationalSummary: {
        normalizedLaneLabel: "Create Planner",
        normalizedLaneDescription:
          "Exakter Modell-, Fallback-, JSON- und Timeout-Pfad der Themenanalyse auf /create.",
        reviewRequired: !ok,
        publicOutputAllowed: false,
        costApprovalRequired: false,
        researchAllowed: false,
        nextResearchAction: "Keine Recherche im Planner-Smoke.",
        nextAction: row.nextAction,
      },
      createAnalyzeApi: {
        state: ok ? "ok" : "failed",
        ok,
        durationMs,
        reason: ok ? null : rootCause,
        code: ok ? null : rootCause,
      },
      plannerSmoke: {
        source: planner.source,
        qualityStatus: planner.qualityStatus,
        degradedReason: planner.degradedReason,
        topicCount: planner.topicCandidates.length,
        scopeCount: planner.scopeCandidates.length,
        providerCallAttempted: planner.providerCallAttempted,
        providerCallSucceeded: planner.providerCallSucceeded,
        modelCandidates,
        selectedTimingLane: intakeTiming.lane,
        timeoutMs,
      },
    });
  } catch {
    const durationMs = Date.now() - startedAt;
    const rootCause = "CREATE_PLANNER_SMOKE_UNHANDLED";

    return NextResponse.json({
      ok: false,
      mode: "create_planner",
      runId,
      correlationId,
      rows: [
        {
          provider: "openai",
          displayName: "Create Planner / OpenAI",
          model: modelCandidates[0] ?? null,
          mode: "create_planner",
          status: "failed",
          rootCause,
          nextAction: "Serverlauf und Create-Planner-Integration prüfen.",
          providerErrorCode: rootCause,
          httpStatus: null,
          providerStatus: "unknown",
          adapterStatus: "failed",
          parseStatus: "not_started",
          schemaStatus: "not_started",
          schemaPath: null,
          journeyDecision: "selected",
          strictStatus: "blocked",
          finalContractStatus: "blocked",
          durationMs,
          timeoutMs,
          maxOutputTokens: getAiRuntimePolicy().plannerMaxOutputTokens,
          tokensIn: null,
          tokensOut: null,
          estimatedCostUsd: null,
          estimatedCostEur: null,
          costKnown: false,
          selectedSmokeModel: modelCandidates[0] ?? null,
          effectiveModel: null,
          openAiSmokeModelMismatch: false,
        },
      ],
      directContractRows: [],
      operationalSummary: {
        normalizedLaneLabel: "Create Planner",
        normalizedLaneDescription:
          "Exakter Modell-, Fallback-, JSON- und Timeout-Pfad der Themenanalyse auf /create.",
        reviewRequired: true,
        publicOutputAllowed: false,
        costApprovalRequired: false,
        researchAllowed: false,
        nextResearchAction: "Keine Recherche im Planner-Smoke.",
        nextAction: "Serverlauf und Create-Planner-Integration prüfen.",
      },
      createAnalyzeApi: {
        state: "failed",
        ok: false,
        durationMs,
        reason: rootCause,
        code: rootCause,
      },
      plannerSmoke: {
        source: "technical_fallback",
        qualityStatus: "failed",
        degradedReason: "provider_error",
        topicCount: 0,
        scopeCount: 0,
        providerCallAttempted: true,
        providerCallSucceeded: false,
        modelCandidates,
        selectedTimingLane: intakeTiming.lane,
        timeoutMs,
      },
    });
  }
}
