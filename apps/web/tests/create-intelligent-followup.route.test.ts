import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  buildCreateIntelligentFollowup: vi.fn(),
  ensureCreateSupportTicket: vi.fn(),
  getSessionUser: vi.fn(),
  enforceCreateMutationSecurity: vi.fn(),
  verifyCreateDraftBinding: vi.fn(),
  runCreateOrchestrationSingleFlight: vi.fn(),
  markExternalExecutionStarted: vi.fn(),
}));

vi.mock("@/features/create/intelligentFollowup", () => ({
  buildCreateIntelligentFollowup: (...args: unknown[]) => mocks.buildCreateIntelligentFollowup(...args),
}));
vi.mock("@/features/support/createSupportTickets", () => ({
  ensureCreateSupportTicket: (...args: unknown[]) => mocks.ensureCreateSupportTicket(...args),
}));
vi.mock("@/lib/server/auth/sessionUser", () => ({
  getSessionUser: (...args: unknown[]) => mocks.getSessionUser(...args),
}));
vi.mock("@/features/create/createRouteSecurity", () => ({
  enforceCreateMutationSecurity: (...args: unknown[]) =>
    mocks.enforceCreateMutationSecurity(...args),
  verifyCreateDraftBinding: (...args: unknown[]) =>
    mocks.verifyCreateDraftBinding(...args),
}));
vi.mock("@/features/create/createOrchestrationSingleFlight", () => ({
  runCreateOrchestrationSingleFlight: (...args: unknown[]) =>
    mocks.runCreateOrchestrationSingleFlight(...args),
}));

import { POST } from "@/app/api/create/intelligent-followup/route";

const SECURE_HEADERS = {
  "content-type": "application/json",
  origin: "http://localhost",
  "sec-fetch-site": "same-origin",
  "x-edebatte-create-csrf": "create-mutation-v1",
};

function request(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/create/intelligent-followup", {
    method: "POST",
    headers: SECURE_HEADERS,
    body: JSON.stringify(body),
  });
}

function streamRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/create/intelligent-followup", {
    method: "POST",
    headers: { ...SECURE_HEADERS, accept: "text/event-stream" },
    body: JSON.stringify({ ...body, stream: true }),
  });
}

describe("/api/create/intelligent-followup route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionUser.mockResolvedValue({
      _id: { toString: () => "user-1" },
      sessionValid: true,
    });
    mocks.enforceCreateMutationSecurity.mockResolvedValue(null);
    mocks.verifyCreateDraftBinding.mockImplementation(
      async (input: { draftId: string; userId: string }) => ({
        draftId: input.draftId,
        userId: input.userId,
        payloadHash: `payload-${input.draftId}`,
        inputHash: `draft-input-${input.draftId}`,
      }),
    );
    mocks.markExternalExecutionStarted.mockResolvedValue(undefined);
    mocks.runCreateOrchestrationSingleFlight.mockImplementation(
      async (input: {
        onProgress?: (event: unknown) => void | Promise<void>;
        run: (context: {
          recoveryWithoutExternalCall: boolean;
          markExternalExecutionStarted: () => Promise<void>;
          publishProgressEvent: (event: unknown) => Promise<void>;
        }) => Promise<unknown>;
      }) => ({
        result: await input.run({
          recoveryWithoutExternalCall: false,
          markExternalExecutionStarted: mocks.markExternalExecutionStarted,
          publishProgressEvent: async (event) => {
            await input.onProgress?.(event);
          },
        }),
        reused: false,
        recovered: false,
      }),
    );
    mocks.ensureCreateSupportTicket.mockResolvedValue({
      ticketNumber: "EDB-20260729-ROUTE001",
      status: "open",
      safeUserMessage: "Dein Beitrag ist gespeichert.",
      viewHref: "/account?ticket=EDB-20260729-ROUTE001#support-tickets",
      notificationLinked: true,
    });
  });

  it("creates a user-safe support handoff for a degraded planner result", async () => {
    mocks.buildCreateIntelligentFollowup.mockResolvedValue({
      sourceText: "Input",
      understanding: { topics: [], scopes: ["unclear"] },
      meta: {
        analysis: { state: "ai_failed" },
        planner: {
          qualityStatus: "needs_confirmation",
          plannerDegraded: true,
          degradedReason: "timeout",
          providerAttemptCount: 2,
          plannerDebug: {
            attemptedProvider: "anthropic",
            providerErrorCode: "TIMEOUT",
          },
        },
      },
    });

    const response = await POST(request({
      text: "Input",
      locale: "de",
      correlationId: "correlation-route-1",
      draftId: "draft-route-1",
    }));
    const body = await response.json();

    expect(body.ok).toBe(true);
    expect(body.supportHandoff).toMatchObject({
      status: "created",
      ticket: { ticketNumber: "EDB-20260729-ROUTE001" },
    });
    expect(mocks.ensureCreateSupportTicket).toHaveBeenCalledWith(
      expect.objectContaining({
        affectedUserId: "user-1",
        correlationId: "correlation-route-1",
        draftId: "draft-route-1",
        attemptCount: 2,
      }),
    );
  });

  it("returns 400 on empty text", async () => {
    const response = await POST(request({ text: "   " }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      errorCode: "TEXT_REQUIRED",
    });
  });

  it("returns ok result for valid input", async () => {
    mocks.buildCreateIntelligentFollowup.mockResolvedValue({
      understanding: {
        summary: "Kurzfassung",
        categories: [{ id: "hint", label: "Hinweis", confidence: "medium" }],
        topics: [{ id: "topic-1", label: "Mobilität", confidence: "medium" }],
        statements: [
          {
            id: "s1",
            text: "Mehr Schulwegsicherheit",
            kind: "demand",
            stance: "pro",
            confidence: "medium",
          },
        ],
        scopes: ["district"],
        openQuestion: null,
        confidence: "medium",
      },
      suggestions: [
        {
          id: "topic:1",
          kind: "topic",
          title: "Thema: Mobilität",
          reason: "Themennähe erkannt.",
          confidence: "medium",
          requiresConfirmation: true,
        },
      ],
      sourceText: "Input",
      generatedAt: "2026-05-05T10:00:00.000Z",
      meta: {
        analysis: { state: "result_ready" },
        planner: {
          runtimeMs: 1_234,
          issueMode: "single_issue",
          timingLane: "fast",
          inputLength: 5,
          qualityStatus: "specific",
          plannerDegraded: false,
        },
      },
      degraded: false,
      degradedReason: null,
    });

    const response = await POST(request({
      text: "Input",
      locale: "de",
      intent: "contribute",
      dossierId: "dossier-1",
      correlationId: "correlation-valid-route",
      draftId: "draft-valid-route",
    }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.result.understanding.summary).toBe("Kurzfassung");
    expect(body.trace).toMatchObject({
      requestId: "correlation-valid-route",
      operationId: "correlation-valid-route",
      operationType: "create_intelligent_followup_planner",
      userScope: "present",
      singleFlight: "owner",
      intake: {
        selectedTimingLane: "fast",
        inputLength: 5,
        canonicalTopicCount: 1,
        issueMode: "single_issue",
      },
      timings: {
        accessMs: expect.any(Number),
        plannerMs: 1_234,
        contextMs: expect.any(Number),
        totalMs: expect.any(Number),
      },
    });
    expect(mocks.buildCreateIntelligentFollowup).toHaveBeenCalledTimes(1);
    expect(mocks.buildCreateIntelligentFollowup).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: expect.any(String),
        operationId: expect.any(String),
        operationType: "create_intelligent_followup_planner",
        userId: "user-1",
        dossierId: "dossier-1",
      }),
    );
  });

  it("streams only validated public state events after security and draft binding", async () => {
    const text = Array.from(
      { length: 14 },
      (_, index) => `${index + 1}. Themenbereich ${index + 1}: Vorschlag`,
    ).join("\n");
    mocks.buildCreateIntelligentFollowup.mockResolvedValue({
      understanding: {
        summary: "Kommunalprogramm",
        categories: [],
        topics: Array.from({ length: 14 }, (_, index) => ({
          id: `topic-${index + 1}`,
          label: `Themenbereich ${index + 1}`,
          confidence: index < 4 ? "high" : "medium",
        })),
        statements: [],
        scopes: ["municipal"],
        openQuestion: null,
        confidence: "high",
      },
      suggestions: [],
      sourceText: text,
      generatedAt: "2026-09-06T09:00:00.000Z",
      meta: {
        analysis: { state: "result_ready" },
        planner: {
          runtimeMs: 2_000,
          issueMode: "multi_issue",
          timingLane: "standard",
          inputLength: text.length,
          qualityStatus: "specific",
          plannerDegraded: false,
        },
      },
      degraded: false,
      degradedReason: null,
    });

    const response = await POST(streamRequest({
      text,
      locale: "de",
      correlationId: "correlation-progress-route",
      draftId: "draft-progress-route",
    }));
    const stream = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(mocks.enforceCreateMutationSecurity).toHaveBeenCalledTimes(1);
    expect(mocks.verifyCreateDraftBinding).toHaveBeenCalledTimes(1);
    expect(stream.indexOf('"type":"draft.saved"')).toBeLessThan(
      stream.indexOf('"type":"structure.detected"'),
    );
    expect(stream.indexOf('"type":"structure.detected"')).toBeLessThan(
      stream.indexOf('"type":"topic.detected"'),
    );
    expect(stream).toContain("Struktur erkannt: 14 getrennte Abschnitte.");
    expect(stream).toContain('"type":"quality.passed"');
    expect(stream).toContain('"type":"result.ready"');
    expect(stream).toContain("event: result");
    expect(stream).not.toMatch(/research\.|graph\.|providerPayload|sessionId|userId|apiKey/);
  });

  it("converts a final unhandled orchestration error into one safe support handoff", async () => {
    mocks.buildCreateIntelligentFollowup.mockRejectedValue(
      new Error("raw upstream planner failure"),
    );

    const response = await POST(request({
      text: "Please preserve this contribution.",
      locale: "en",
      correlationId: "correlation-final-error",
      draftId: "draft-final-error",
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      result: {
        sourceText: "Please preserve this contribution.",
        meta: {
          analysis: {
            state: "ai_failed",
            validationStatus: "failed",
          },
        },
      },
      supportHandoff: {
        status: "created",
        ticket: {
          ticketNumber: "EDB-20260729-ROUTE001",
        },
      },
      trace: {
        requestId: "correlation-final-error",
      },
    });
    expect(mocks.ensureCreateSupportTicket).toHaveBeenCalledTimes(1);
    expect(mocks.ensureCreateSupportTicket).toHaveBeenCalledWith(
      expect.objectContaining({
        affectedUserId: "user-1",
        correlationId: "correlation-final-error",
        technicalErrorCode: "CREATE_FOLLOWUP_FAILED",
        reason: "unhandled_orchestration_error",
        draftId: "draft-final-error",
        locale: "en",
      }),
    );
    expect(JSON.stringify(body)).not.toContain("raw upstream planner failure");
  });

  it("rejects an anonymous direct request before security, draft, claim, provider, or ticket work", async () => {
    mocks.getSessionUser.mockResolvedValue(null);

    const response = await POST(
      new NextRequest("http://localhost/api/create/intelligent-followup", {
        method: "POST",
        body: "{malformed-json",
      }),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toBeNull();
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      errorCode: "CREATE_REQUEST_NOT_ALLOWED",
    });
    expect(mocks.enforceCreateMutationSecurity).not.toHaveBeenCalled();
    expect(mocks.verifyCreateDraftBinding).not.toHaveBeenCalled();
    expect(mocks.runCreateOrchestrationSingleFlight).not.toHaveBeenCalled();
    expect(mocks.buildCreateIntelligentFollowup).not.toHaveBeenCalled();
    expect(mocks.ensureCreateSupportTicket).not.toHaveBeenCalled();
  });

  it.each(["invented-draft", "foreign-draft"])(
    "rejects %s without disclosing draft existence or starting side effects",
    async (draftId) => {
      mocks.verifyCreateDraftBinding.mockResolvedValue(null);

      const requestBody = {
        text: "Bound input",
        locale: "de",
        correlationId: `correlation-${draftId}`,
        draftId,
      };
      const response = await POST(
        draftId === "foreign-draft"
          ? streamRequest(requestBody)
          : request(requestBody),
      );

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({
        ok: false,
        errorCode: "CREATE_REQUEST_NOT_ALLOWED",
        message: "Die Anfrage konnte nicht verarbeitet werden.",
      });
      expect(mocks.runCreateOrchestrationSingleFlight).not.toHaveBeenCalled();
      expect(mocks.buildCreateIntelligentFollowup).not.toHaveBeenCalled();
      expect(mocks.ensureCreateSupportTicket).not.toHaveBeenCalled();
    },
  );

  it("fails closed when the create-specific limiter is unavailable", async () => {
    mocks.enforceCreateMutationSecurity.mockResolvedValue(
      NextResponse.json(
        { ok: false, errorCode: "CREATE_RATE_LIMIT_UNAVAILABLE" },
        { status: 503 },
      ),
    );

    const response = await POST(request({
      text: "Input",
      locale: "de",
      correlationId: "correlation-limiter-failure",
      draftId: "draft-limiter-failure",
    }));

    expect(response.status).toBe(503);
    expect(mocks.verifyCreateDraftBinding).not.toHaveBeenCalled();
    expect(mocks.runCreateOrchestrationSingleFlight).not.toHaveBeenCalled();
    expect(mocks.buildCreateIntelligentFollowup).not.toHaveBeenCalled();
    expect(mocks.ensureCreateSupportTicket).not.toHaveBeenCalled();
  });
});
