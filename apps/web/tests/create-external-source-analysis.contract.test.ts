import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  callOpenAIJson: vi.fn(),
  resolveCreatePlannerModelCandidates: vi.fn(),
}));

vi.mock("@features/ai", () => ({
  callOpenAIJson: (...args: unknown[]) => mocks.callOpenAIJson(...args),
}));

vi.mock("@/features/create/createPlanner", () => ({
  resolveCreatePlannerModelCandidates: (...args: unknown[]) =>
    mocks.resolveCreatePlannerModelCandidates(...args),
}));

import {
  buildCreateExternalAnalysisExcerpt,
  CreateExternalAnalysisError,
  runCreateExternalSourceAnalysis,
} from "@/features/create/externalSourceAnalysis";

function validResponse() {
  return JSON.stringify({
    documentTitle: "Source",
    documentType: "article",
    pageCount: null,
    wordCount: 220,
    topicCount: 1,
    subtopicCount: 1,
    keyStatementCount: 1,
    verifiableClaimCount: 1,
    policyProposalCount: 0,
    subjectBreadth: "narrow",
    subjectDepth: "medium",
    balanceAssessment: "unclear",
    sourceSpecificity: "specific",
    sourceVerificationStatus: "completed",
    counterpositionCoverage: "unclear",
    summary: "Grounded summary",
    topics: [{
      id: "topic-1",
      label: "Grounded topic",
      subtopicCount: 1,
      keyStatementCount: 1,
      verifiableClaimCount: 1,
      policyProposalCount: 0,
      summary: "Grounded topic summary",
    }],
  });
}

describe("C8 external source analysis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveCreatePlannerModelCandidates.mockReturnValue([
      "model-one",
      "model-two",
      "model-three",
    ]);
  });

  it("uses at most two controlled provider candidates and keeps verification not_started", async () => {
    mocks.callOpenAIJson
      .mockRejectedValueOnce(Object.assign(new Error("model not found"), { status: 404 }))
      .mockResolvedValueOnce({ text: validResponse() });

    const result = await runCreateExternalSourceAnalysis({
      sourceUrl: "https://example.org/source",
      text: "grounded source ".repeat(30),
      locale: "en",
      pageCount: null,
      documentTitle: "Source",
      documentType: "article",
      additionalContext: "",
    });

    expect(mocks.callOpenAIJson).toHaveBeenCalledTimes(2);
    expect(mocks.callOpenAIJson.mock.calls[0]?.[0]).toMatchObject({ model: "model-one" });
    expect(mocks.callOpenAIJson.mock.calls[1]?.[0]).toMatchObject({ model: "model-two" });
    expect(result.analysis.sourceVerificationStatus).toBe("not_started");
    expect(result.attempts.map((attempt) => attempt.status)).toEqual([
      "failed",
      "succeeded",
    ]);
  });

  it("fails with a bounded typed error for an invalid model response", async () => {
    mocks.callOpenAIJson.mockResolvedValue({ text: "{\"invented\":true}" });
    await expect(
      runCreateExternalSourceAnalysis({
        sourceUrl: "https://example.org/source",
        text: "grounded source ".repeat(30),
        locale: "de",
        pageCount: null,
        documentTitle: null,
        documentType: "unknown",
        additionalContext: "",
      }),
    ).rejects.toBeInstanceOf(CreateExternalAnalysisError);
  });

  it("samples beginning, middle and end rather than pretending a clipped prefix is complete", () => {
    const text = "A".repeat(20_000) + "MIDDLE" + "B".repeat(20_000) + "END";
    const excerpt = buildCreateExternalAnalysisExcerpt(text, 12_000);
    expect(excerpt).toContain("[Dokumentanfang]");
    expect(excerpt).toContain("[Dokumentmitte]");
    expect(excerpt).toContain("[Dokumentende des extrahierten Bereichs]");
    expect(excerpt.length).toBeLessThanOrEqual(12_000);
  });
});
