import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { redactCreateSafetySensitiveText } from "@/features/create/safety/createSafetyLexicon";

const mocks = vi.hoisted(() => ({
  buildCreateIntelligentFollowup: vi.fn(),
  evaluateCreateInputSafety: vi.fn(),
  enforceCreateMutationSecurity: vi.fn(),
  verifyAnonymousSession: vi.fn(),
  runCreateOrchestrationSingleFlight: vi.fn(),
}));

vi.mock("@/features/create/intelligentFollowup", () => ({
  buildCreateIntelligentFollowup: (...args: unknown[]) =>
    mocks.buildCreateIntelligentFollowup(...args),
}));

vi.mock("@/features/create/safety/createInputSafety", () => ({
  evaluateCreateInputSafety: (...args: unknown[]) =>
    mocks.evaluateCreateInputSafety(...args),
}));

vi.mock("@/features/create/createRouteSecurity", () => ({
  enforceCreateMutationSecurity: (...args: unknown[]) =>
    mocks.enforceCreateMutationSecurity(...args),
}));

vi.mock("@/features/create/createAnonymousSession", () => ({
  CREATE_ANON_SESSION_COOKIE: "edebatte_create_session",
  verifyAnonymousSession: (...args: unknown[]) => mocks.verifyAnonymousSession(...args),
}));

vi.mock("@/features/create/createOrchestrationSingleFlight", () => ({
  runCreateOrchestrationSingleFlight: (...args: unknown[]) =>
    mocks.runCreateOrchestrationSingleFlight(...args),
}));

import { POST } from "@/app/api/create/intake/route";

function request(body: Record<string, unknown>, ip = "203.0.113.15") {
  return new NextRequest("http://localhost/api/create/intake", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
      origin: "http://localhost",
      "sec-fetch-site": "same-origin",
      "x-edebatte-create-csrf": "create-mutation-v1",
      "x-edebatte-create-client": "browser-session-12345678",
      cookie: "edebatte_create_session=signed-anonymous-session",
    },
    body: JSON.stringify(body),
  });
}

function allowedSafety(overrides: Record<string, unknown> = {}) {
  return {
    decision: "allow",
    severity: "low",
    findings: [],
    quality: { readability: 0.8, structure: 0.8, civicIntent: 0.8, overall: 0.8, notes: [] },
    redactedText: "Tempo 30 vor der Schule in Wuppertal prüfen.",
    safeRewrite: "",
    factCheckCandidates: [],
    graphReviewHints: [],
    reviewItems: [],
    telemetry: {},
    requiresHumanReview: false,
    noAutoPublish: true,
    noSilentMerge: true,
    blockedReasons: [],
    nextActions: [],
    sourceLanguage: "de",
    contentLanguage: "de",
    crossLingualRisk: false,
    createdAt: "2026-09-04T08:00:00.000Z",
    ...overrides,
  };
}

describe("POST /api/create/intake", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyAnonymousSession.mockReturnValue({ id: "anonymous-1" });
    mocks.enforceCreateMutationSecurity.mockResolvedValue(null);
    mocks.runCreateOrchestrationSingleFlight.mockImplementation(async (input) => ({
      result: await input.run({
        recoveryWithoutExternalCall: false,
        markExternalExecutionStarted: vi.fn().mockResolvedValue(undefined),
      }),
      reused: false,
      recovered: false,
    }));
    mocks.evaluateCreateInputSafety.mockReturnValue(allowedSafety());
    mocks.buildCreateIntelligentFollowup.mockResolvedValue({
      understanding: {
        summary: "Sicherer Schulweg und mögliche Geschwindigkeitsbegrenzung.",
        categories: [{ id: "demand", label: "Forderung", confidence: "high" }],
        topics: [{ id: "topic-1", label: "Schulwegsicherheit", confidence: "high" }],
        statements: [],
        scopes: ["municipal"],
        openQuestion: null,
        confidence: "high",
      },
      suggestions: [],
      sourceText: "Tempo 30 vor der Schule in Wuppertal prüfen.",
      generatedAt: "2026-09-04T08:00:00.000Z",
      degraded: false,
      degradedReason: null,
      meta: {
        analysis: { state: "result_ready" },
        citizenContext: { explicitPlaces: [{ label: "Wuppertal" }] },
      },
    });
  });

  it("runs the real canonical AI planner without requiring a user or draft", async () => {
    const response = await POST(request({
      text: "Tempo 30 vor der Schule in Wuppertal prüfen.",
      locale: "de",
      intent: "contribute",
      correlationId: "request-12345678",
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      meta: {
        mode: "anonymous_ai_micro_pass",
        persisted: false,
        accountRequired: false,
        deepSearchUsed: false,
        researchUsed: "none",
        noAutoPublish: true,
        noSilentMerge: true,
        ownershipBoundary: "authenticate_before_durable_write",
      },
    });
    expect(mocks.buildCreateIntelligentFollowup).toHaveBeenCalledTimes(1);
    expect(mocks.buildCreateIntelligentFollowup).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: null,
        organizationId: null,
        dossierId: null,
        anlassraumId: null,
        operationType: "create_anonymous_ai_intake",
        requestId: "request-12345678",
      }),
    );
    expect(mocks.runCreateOrchestrationSingleFlight).toHaveBeenCalledWith(
      expect.objectContaining({
        actorKey: "anonymous:anonymous-1",
        draftId: "anonymous:anonymous-1",
        correlationId: "request-12345678",
        operationType: "create_intelligent_followup_planner",
        inputHash: expect.any(String),
      }),
    );
  });

  it.each([
    "https://example.com/mindestlohn-behindertenwerkstatt",
    "Schau dir das an: https://example.com/foo",
    "https://example.com/in-wuppertal-verkehr",
  ])(
    "routes an anonymous unloaded link to source review without a planner call: %s",
    async (text) => {
      mocks.evaluateCreateInputSafety.mockReturnValue(
        allowedSafety({ redactedText: text }),
      );
      const response = await POST(request({
        text,
        locale: "de",
        intent: "contribute",
        correlationId: "request-link-12345678",
      }));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toMatchObject({
        ok: true,
        result: {
          understanding: { topics: [], statements: [], scopes: ["unclear"] },
          suggestions: [],
          meta: {
            planner: null,
            citizenContext: { jurisdictionCandidates: [] },
            analysis: {
              state: "link_detected",
              sourceType: "link",
              sourceLoaded: false,
              validationStatus: "not_started",
            },
          },
          degraded: true,
        },
        meta: {
          mode: "anonymous_unloaded_source",
          guestOperationId: "request-link-12345678",
          operationState: "source_pending",
          persisted: false,
          sourceValidationRequired: true,
          ownershipBoundary: "validate_source_before_durable_write",
        },
      });
      expect(mocks.buildCreateIntelligentFollowup).not.toHaveBeenCalled();
      expect(mocks.runCreateOrchestrationSingleFlight).toHaveBeenCalledTimes(1);
      expect(mocks.runCreateOrchestrationSingleFlight).toHaveBeenCalledWith(
        expect.objectContaining({
          actorKey: "anonymous:anonymous-1",
          draftId: "anonymous:anonymous-1",
          correlationId: "request-link-12345678",
          operationType: "create_intelligent_followup_planner",
          inputHash: expect.any(String),
        }),
      );
      expect(
        mocks.runCreateOrchestrationSingleFlight.mock.calls[0]?.[0]?.run,
      ).toEqual(expect.any(Function));
    },
  );

  it.each([
    {
      label: "email",
      contact: "Kontakt: max@example.org",
      forbidden: ["max@example.org"],
      markers: ["[E-MAIL ENTFERNT]"],
    },
    {
      label: "phone number",
      contact: "Kontakt: 0171 1234567",
      forbidden: ["0171", "1234567"],
      markers: ["[TELEFON ENTFERNT]"],
    },
    {
      label: "email and phone number",
      contact: "Kontakt: max@example.org, 0171 1234567",
      forbidden: ["max@example.org", "0171", "1234567"],
      markers: ["[E-MAIL ENTFERNT]", "[TELEFON ENTFERNT]"],
    },
  ])("keeps the complete pending-link claim recursively PII-free for $label", async ({
    contact,
    forbidden,
    markers,
  }) => {
    const sourceUrl = "https://example.org/foo";
    const text = `Bitte prüfen: [${sourceUrl}](${sourceUrl})\n${contact}`;
    mocks.evaluateCreateInputSafety.mockReturnValue(
      allowedSafety({
        decision: "revise_required",
        redactedText: redactCreateSafetySensitiveText(text),
        requiresHumanReview: true,
      }),
    );

    const response = await POST(request({
      text,
      locale: "de",
      intent: "contribute",
      correlationId: "request-link-pii-abcdefgh",
    }));
    const body = await response.json();
    const serializedClaim = JSON.stringify(body.result);
    const serializedClaimMetadata = JSON.stringify(
      mocks.runCreateOrchestrationSingleFlight.mock.calls[0]?.[0],
    );

    expect(response.status).toBe(200);
    expect(body.result.sourceText).toContain(sourceUrl);
    for (const marker of markers) {
      expect(body.result.sourceText).toContain(marker);
    }
    expect(body.result.meta.analysis).toMatchObject({
      sourceUrl,
      evidenceReferences: [sourceUrl],
      state: "link_detected",
      sourceLoaded: false,
    });
    for (const fragment of forbidden) {
      expect(serializedClaim).not.toContain(fragment);
      expect(serializedClaimMetadata).not.toContain(fragment);
    }
    expect(mocks.buildCreateIntelligentFollowup).not.toHaveBeenCalled();
  });

  it.each([
    {
      label: "email query value",
      sourceUrl: "https://example.org/?email=max@example.org",
      forbidden: ["max@example.org"],
    },
    {
      label: "phone query value",
      sourceUrl: "https://example.org/?phone=01711234567",
      forbidden: ["01711234567"],
    },
    {
      label: "credentials",
      sourceUrl: "https://max@example.org:secret@example.org/foo",
      forbidden: ["max@example.org", "secret"],
    },
    {
      label: "email path",
      sourceUrl: "https://example.org/max@example.org/foo",
      forbidden: ["max@example.org"],
    },
    {
      label: "email fragment",
      sourceUrl: "https://example.org/foo#max@example.org",
      forbidden: ["max@example.org"],
    },
  ])("rejects a guest source URL containing $label before claim persistence", async ({
    sourceUrl,
    forbidden,
  }) => {
    const text = `Bitte prüfen: ${sourceUrl}`;
    mocks.evaluateCreateInputSafety.mockReturnValue(
      allowedSafety({
        decision: "revise_required",
        redactedText: redactCreateSafetySensitiveText(text),
        requiresHumanReview: true,
      }),
    );

    const response = await POST(request({
      text,
      locale: "de",
      intent: "contribute",
      correlationId: "request-link-component-pii",
    }));
    const body = await response.json();
    const serializedResponse = JSON.stringify(body);

    expect(response.status).toBe(422);
    expect(body).toMatchObject({
      ok: false,
      errorCode: "SOURCE_URL_REVIEW_REQUIRED",
      retryable: false,
      meta: {
        mode: "anonymous_unloaded_source",
        persisted: false,
        sourceValidationRequired: true,
      },
    });
    for (const fragment of forbidden) {
      expect(serializedResponse).not.toContain(fragment);
    }
    expect(serializedResponse).not.toContain(sourceUrl);
    expect(mocks.runCreateOrchestrationSingleFlight).not.toHaveBeenCalled();
    expect(mocks.buildCreateIntelligentFollowup).not.toHaveBeenCalled();
  });

  it("keeps the canonical PII-free guest URL in the pending-source claim", async () => {
    const sourceUrl = "https://example.org/article?id=123";
    mocks.evaluateCreateInputSafety.mockReturnValue(
      allowedSafety({ redactedText: sourceUrl }),
    );

    const response = await POST(request({
      text: sourceUrl,
      locale: "de",
      intent: "contribute",
      correlationId: "request-link-safe-canonical",
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.result).toMatchObject({
      sourceText: sourceUrl,
      meta: {
        analysis: {
          sourceUrl,
          evidenceReferences: [sourceUrl],
          state: "link_detected",
        },
      },
    });
    expect(mocks.runCreateOrchestrationSingleFlight).toHaveBeenCalledTimes(1);
    expect(mocks.buildCreateIntelligentFollowup).not.toHaveBeenCalled();
  });

  it("redacts avoidable PII before the AI call while keeping the route read-only", async () => {
    mocks.evaluateCreateInputSafety.mockReturnValue(
      allowedSafety({
        decision: "revise_required",
        redactedText: "Bitte sichere Querung an [ADRESSE] prüfen.",
        requiresHumanReview: true,
        nextActions: ["Adresse entfernen"],
      }),
    );

    const response = await POST(request({
      text: "Bitte sichere Querung an Musterstraße 1 prüfen.",
      locale: "de",
      correlationId: "request-12345678",
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.meta.inputRedactedForAi).toBe(true);
    expect(mocks.buildCreateIntelligentFollowup).toHaveBeenCalledWith(
      expect.objectContaining({ text: "Bitte sichere Querung an [ADRESSE] prüfen." }),
    );
  });

  it("fails closed when safety redaction leaves no provider-safe text", async () => {
    mocks.evaluateCreateInputSafety.mockReturnValue(
      allowedSafety({
        decision: "revise_required",
        redactedText: "   ",
        requiresHumanReview: true,
        nextActions: ["Personendaten entfernen"],
      }),
    );

    const response = await POST(request({
      text: "Musterstraße 1, 12345 Musterstadt",
      correlationId: "request-12345678",
    }));

    expect(response.status).toBe(422);
    expect(mocks.buildCreateIntelligentFollowup).not.toHaveBeenCalled();
  });

  it("blocks unsafe intake before a provider call", async () => {
    mocks.evaluateCreateInputSafety.mockReturnValue(
      allowedSafety({
        decision: "blocked",
        severity: "critical",
        requiresHumanReview: true,
        nextActions: ["Sicher formulieren"],
      }),
    );

    const response = await POST(request({ text: "unsafe input", correlationId: "request-12345678" }));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body).toMatchObject({
      ok: false,
      errorCode: "INTAKE_REVIEW_REQUIRED",
      safety: { decision: "blocked", severity: "critical" },
    });
    expect(mocks.buildCreateIntelligentFollowup).not.toHaveBeenCalled();
  });

  it("applies the canonical anonymous/browser/IP/duplicate abuse guard before the provider call", async () => {
    mocks.enforceCreateMutationSecurity.mockResolvedValue(
      NextResponse.json(
        { ok: false, errorCode: "CREATE_RATE_LIMITED" },
        { status: 429 },
      ),
    );

    const response = await POST(request({
      text: "Ein ausreichend konkretes öffentliches Anliegen.",
      correlationId: "request-12345678",
    }));
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.errorCode).toBe("CREATE_RATE_LIMITED");
    expect(mocks.enforceCreateMutationSecurity).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: "create_intelligent_followup",
        actorKey: "anonymous:anonymous-1",
      }),
    );
    expect(mocks.buildCreateIntelligentFollowup).not.toHaveBeenCalled();
  });

  it("fails honestly without heuristic topic invention when the AI planner is unavailable", async () => {
    mocks.buildCreateIntelligentFollowup.mockRejectedValue(new Error("provider raw secret detail"));

    const response = await POST(request({
      text: "Ein neues Thema, das es so noch nicht gibt.",
      correlationId: "request-12345678",
    }));
    const raw = await response.text();
    const body = JSON.parse(raw);

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      ok: false,
      errorCode: "AI_INTAKE_UNAVAILABLE",
      retryable: true,
      meta: {
        mode: "anonymous_ai_micro_pass",
        persisted: false,
        noAutoPublish: true,
        noSilentMerge: true,
      },
    });
    expect(raw).not.toContain("provider raw secret detail");
  });

  it("rejects empty and oversized inputs without spending an AI call", async () => {
    const empty = await POST(request({ text: "   ", correlationId: "request-12345678" }));
    expect(empty.status).toBe(400);

    const oversized = await POST(request({ text: "x".repeat(6_001), correlationId: "request-12345678" }));
    expect(oversized.status).toBe(413);
    expect(mocks.buildCreateIntelligentFollowup).not.toHaveBeenCalled();
  });

  it("rejects a missing or invalid signed anonymous session before abuse checks and AI", async () => {
    mocks.verifyAnonymousSession.mockReturnValue(null);

    const response = await POST(request({
      text: "Ein neues lokales Anliegen.",
      correlationId: "request-12345678",
    }));

    expect(response.status).toBe(403);
    expect(mocks.enforceCreateMutationSecurity).not.toHaveBeenCalled();
    expect(mocks.buildCreateIntelligentFollowup).not.toHaveBeenCalled();
  });
});
