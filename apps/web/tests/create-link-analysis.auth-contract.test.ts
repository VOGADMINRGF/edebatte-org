import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  buildCreateTechnicalFollowup: vi.fn(),
  buildCreateValidatedDocumentFollowup: vi.fn(),
  ensureCreateSupportTicket: vi.fn(),
  enforceCreateMutationSecurity: vi.fn(),
  getSessionUser: vi.fn(),
  loadCreateExternalSource: vi.fn(),
  runCreateExternalSourceAnalysis: vi.fn(),
  runCreateOrchestrationSingleFlight: vi.fn(),
  upsertCreateDraftSourceEvidence: vi.fn(),
  validateCreateExternalSourceUrl: vi.fn(),
  verifyCreateDraftBinding: vi.fn(),
}));

vi.mock("@/features/create/intelligentFollowupResults", () => ({
  buildCreateTechnicalFollowup: (...args: unknown[]) =>
    mocks.buildCreateTechnicalFollowup(...args),
  buildCreateValidatedDocumentFollowup: (...args: unknown[]) =>
    mocks.buildCreateValidatedDocumentFollowup(...args),
}));

vi.mock("@/features/create/externalSourceAnalysis", () => ({
  CreateExternalAnalysisError: class CreateExternalAnalysisError extends Error {},
  runCreateExternalSourceAnalysis: (...args: unknown[]) =>
    mocks.runCreateExternalSourceAnalysis(...args),
}));

vi.mock("@/features/create/externalSourceIntake", () => ({
  loadCreateExternalSource: (...args: unknown[]) =>
    mocks.loadCreateExternalSource(...args),
  validateCreateExternalSourceUrl: (...args: unknown[]) =>
    mocks.validateCreateExternalSourceUrl(...args),
}));

vi.mock("@/features/create/createOrchestrationSingleFlight", () => ({
  runCreateOrchestrationSingleFlight: (...args: unknown[]) =>
    mocks.runCreateOrchestrationSingleFlight(...args),
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

vi.mock("@/features/support/createSupportTickets", () => ({
  ensureCreateSupportTicket: (...args: unknown[]) =>
    mocks.ensureCreateSupportTicket(...args),
}));

vi.mock("@/server/createDraftSourceEvidence", () => ({
  upsertCreateDraftSourceEvidence: (...args: unknown[]) =>
    mocks.upsertCreateDraftSourceEvidence(...args),
}));

import { POST } from "@/app/api/create/link-analysis/route";

function request(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/create/link-analysis", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost",
      "sec-fetch-site": "same-origin",
      "x-edebatte-create-csrf": "create-mutation-v1",
    },
    body: JSON.stringify(body),
  });
}

const validBody = {
  text: "A contribution that is bound to the saved draft.",
  url: "https://example.org/source",
  locale: "en",
  correlationId: "correlation-link-auth",
  draftId: "65f000000000000000000001",
};

const analysis = {
  sourceUrl: "https://example.org/final",
  documentTitle: "Source",
  documentType: "article" as const,
  pageCount: null,
  wordCount: 220,
  topicCount: 1,
  subtopicCount: 1,
  keyStatementCount: 1,
  verifiableClaimCount: 1,
  policyProposalCount: 0,
  subjectBreadth: "narrow" as const,
  subjectDepth: "medium" as const,
  balanceAssessment: "unclear" as const,
  sourceSpecificity: "specific" as const,
  sourceVerificationStatus: "not_started" as const,
  counterpositionCoverage: "unclear" as const,
  summary: "A bounded source summary.",
  topics: [{ id: "topic-1", label: "Topic", summary: "Topic summary" }],
};

describe("/api/create/link-analysis C8 authenticated draft contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionUser.mockResolvedValue({
      _id: { toString: () => "user-1" },
      sessionValid: true,
    });
    mocks.enforceCreateMutationSecurity.mockResolvedValue(null);
    mocks.verifyCreateDraftBinding.mockResolvedValue({
      draftId: validBody.draftId,
      userId: "user-1",
      payloadHash: "payload-hash",
      inputHash: "input-hash",
    });
    mocks.loadCreateExternalSource.mockResolvedValue({
      sourceKind: "html",
      text: "source material ".repeat(30),
      pageCount: null,
      contentType: "text/html",
      documentType: "article",
      documentTitle: "Source",
      httpStatus: 200,
      finalUrl: "https://example.org/final",
      contentHash: "a".repeat(64),
      sourceLocale: "en",
      transcriptSegmentCount: null,
    });
    mocks.runCreateExternalSourceAnalysis.mockResolvedValue({
      analysis,
      attempts: [{ durationMs: 1, model: "gpt-test", status: "succeeded" }],
    });
    mocks.upsertCreateDraftSourceEvidence.mockResolvedValue({
      ok: true,
      sourceKey: "source-key",
      artifact: { id: "create-source-source-key" },
    });
    mocks.runCreateOrchestrationSingleFlight.mockImplementation(
      async (input: {
        run: (context: {
          recoveryWithoutExternalCall: boolean;
          markExternalExecutionStarted: () => Promise<void>;
        }) => Promise<unknown>;
      }) => ({
        result: await input.run({
          recoveryWithoutExternalCall: false,
          markExternalExecutionStarted: async () => undefined,
        }),
        reused: false,
        recovered: false,
      }),
    );
    mocks.buildCreateValidatedDocumentFollowup.mockReturnValue({
      meta: { analysis: { state: "result_ready", sourceLoaded: true } },
    });
    mocks.buildCreateTechnicalFollowup.mockReturnValue({
      meta: { analysis: { state: "fetch_failed", sourceLoaded: false } },
    });
    mocks.ensureCreateSupportTicket.mockResolvedValue({
      ticketNumber: "EDB-20260918-LINK0001",
      safeUserMessage: "Your contribution is saved.",
      viewHref: "/account?ticket=EDB-20260918-LINK0001#support-tickets",
    });
  });

  it("rejects a guest before parsing body and before network/provider work", async () => {
    mocks.getSessionUser.mockResolvedValue(null);
    const response = await POST(
      new NextRequest("http://localhost/api/create/link-analysis", {
        method: "POST",
        body: "{malformed-json",
      }),
    );
    expect(response.status).toBe(401);
    expect(mocks.enforceCreateMutationSecurity).not.toHaveBeenCalled();
    expect(mocks.verifyCreateDraftBinding).not.toHaveBeenCalled();
    expect(mocks.runCreateOrchestrationSingleFlight).not.toHaveBeenCalled();
    expect(mocks.loadCreateExternalSource).not.toHaveBeenCalled();
    expect(mocks.runCreateExternalSourceAnalysis).not.toHaveBeenCalled();
  });

  it("stops before draft and external work when mutation security fails", async () => {
    mocks.enforceCreateMutationSecurity.mockResolvedValue(
      NextResponse.json({ ok: false, errorCode: "CREATE_REQUEST_REJECTED" }, { status: 403 }),
    );
    const response = await POST(request(validBody));
    expect(response.status).toBe(403);
    expect(mocks.verifyCreateDraftBinding).not.toHaveBeenCalled();
    expect(mocks.loadCreateExternalSource).not.toHaveBeenCalled();
  });

  it("rejects missing or foreign drafts before source work", async () => {
    mocks.verifyCreateDraftBinding.mockResolvedValue(null);
    const response = await POST(request(validBody));
    expect(response.status).toBe(403);
    expect(mocks.validateCreateExternalSourceUrl).not.toHaveBeenCalled();
    expect(mocks.loadCreateExternalSource).not.toHaveBeenCalled();
    expect(mocks.runCreateExternalSourceAnalysis).not.toHaveBeenCalled();
  });

  it("single-flights source work with a server-derived key and persists evidence before success", async () => {
    const response = await POST(request(validBody));
    expect(response.status).toBe(200);
    expect(mocks.runCreateOrchestrationSingleFlight).toHaveBeenCalledWith(
      expect.objectContaining({
        actorKey: "user:user-1",
        draftId: validBody.draftId,
        operationType: "create_authenticated_source_link_analysis",
        inputHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        correlationId: expect.stringMatching(/^c8:[a-f0-9]{64}$/),
      }),
    );
    expect(mocks.loadCreateExternalSource).toHaveBeenCalledTimes(1);
    expect(mocks.runCreateExternalSourceAnalysis).toHaveBeenCalledTimes(1);
    expect(mocks.upsertCreateDraftSourceEvidence).toHaveBeenCalledWith({
      draftId: validBody.draftId,
      userId: "user-1",
      canonicalRef: "https://example.org/final",
      contentHash: "a".repeat(64),
      originalLocale: "en",
    });
    expect(mocks.buildCreateValidatedDocumentFollowup).toHaveBeenCalledWith(
      expect.objectContaining({ sourceUrl: "https://example.org/final" }),
    );
    expect(mocks.ensureCreateSupportTicket).not.toHaveBeenCalled();
  });

  it("does not let browser correlation IDs become the idempotency authority", async () => {
    await POST(request({ ...validBody, correlationId: "browser-trace-one" }));
    await POST(request({ ...validBody, correlationId: "browser-trace-two" }));
    const first = mocks.runCreateOrchestrationSingleFlight.mock.calls[0]?.[0];
    const second = mocks.runCreateOrchestrationSingleFlight.mock.calls[1]?.[0];
    expect(first.correlationId).toBe(second.correlationId);
    expect(first.inputHash).toBe(second.inputHash);
  });

  it("fails closed on recovered external execution without replaying source/provider work", async () => {
    mocks.runCreateOrchestrationSingleFlight.mockImplementationOnce(
      async (input: {
        run: (context: {
          recoveryWithoutExternalCall: boolean;
          markExternalExecutionStarted: () => Promise<void>;
        }) => Promise<unknown>;
      }) => ({
        result: await input.run({
          recoveryWithoutExternalCall: true,
          markExternalExecutionStarted: async () => undefined,
        }),
        reused: false,
        recovered: true,
      }),
    );
    const response = await POST(request(validBody));
    expect(response.status).toBe(200);
    expect(mocks.loadCreateExternalSource).not.toHaveBeenCalled();
    expect(mocks.runCreateExternalSourceAnalysis).not.toHaveBeenCalled();
    expect(mocks.upsertCreateDraftSourceEvidence).not.toHaveBeenCalled();
    expect(mocks.ensureCreateSupportTicket).toHaveBeenCalledWith(
      expect.objectContaining({
        technicalErrorCode: "CREATE_LINK_RECOVERY_BLOCKED",
        provider: null,
      }),
    );
  });

  it("does not persist false source evidence when provider analysis fails", async () => {
    mocks.runCreateExternalSourceAnalysis.mockRejectedValueOnce(
      new Error("create_link_analysis_provider_failed"),
    );
    await POST(request(validBody));
    expect(mocks.upsertCreateDraftSourceEvidence).not.toHaveBeenCalled();
    expect(mocks.ensureCreateSupportTicket).toHaveBeenCalledWith(
      expect.objectContaining({
        technicalErrorCode: "CREATE_LINK_AI_FAILED",
        provider: "openai",
      }),
    );
    expect(mocks.buildCreateTechnicalFollowup).toHaveBeenCalledWith(
      expect.not.objectContaining({ sourceUrl: validBody.url }),
    );
  });

  it("never reports durable success when source-evidence persistence fails", async () => {
    mocks.upsertCreateDraftSourceEvidence.mockResolvedValueOnce({
      ok: false,
      error: "draft_not_found",
    });
    const response = await POST(request(validBody));
    const payload = await response.json();
    expect(payload.sourceEvidence).toBeUndefined();
    expect(mocks.buildCreateValidatedDocumentFollowup).not.toHaveBeenCalled();
    expect(mocks.ensureCreateSupportTicket).toHaveBeenCalledWith(
      expect.objectContaining({
        technicalErrorCode: "CREATE_LINK_EVIDENCE_PERSIST_FAILED",
        provider: null,
      }),
    );
  });
});
