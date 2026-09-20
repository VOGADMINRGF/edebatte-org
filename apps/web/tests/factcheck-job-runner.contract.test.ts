import { beforeEach, describe, expect, it } from "vitest";
import {
  createInMemoryFactcheckWorkflowRepo,
  setFactcheckWorkflowRepoForTests,
  type FactcheckJobDoc,
} from "@features/factcheck/db";
import { runFactcheckJob } from "@features/factcheck/jobRunner";

function baseJob(overrides: Partial<FactcheckJobDoc> = {}): FactcheckJobDoc {
  return {
    jobId: "job-1",
    sourceType: "factcheck_request",
    sourceId: "contribution-1",
    requestedAction: "source_check",
    inputText: "Bitte prüft diese Behauptung.",
    normalizedText: "bitte prüft diese behauptung.",
    language: "de",
    status: "queued",
    gate: {
      loginConfirmed: true,
      entitlementConfirmed: true,
      pricingConfirmed: true,
      userConfirmed: true,
      noSilentCost: true,
    },
    verdict: "UNDETERMINED",
    confidenceScore: 0,
    claims: [{ id: "1", text: "Behauptung A" } as any],
    sourceRefs: [],
    materialRefs: [],
    factcheckVerificationMode: "intake_only",
    factcheckResearchMode: "provider_assisted",
    factcheckSealEligibility: "needs_review",
    factcheckSealDecision: "none",
    publicSealVisible: false,
    limitations: ["Kein automatischer DeepSearch-Lauf."],
    auditEvents: [],
    createdAt: new Date("2026-06-06T09:00:00.000Z"),
    noAutoPublish: true,
    noAutoGraphPromotion: true,
    noAutoDossier: true,
    noAutoAnlassraum: true,
    noAutoVote: true,
    ...overrides,
  };
}

const sourceRef = {
  id: "s1",
  label: "Quelle",
  url: "https://example.org",
  sourceType: "link" as const,
};

const completeExecutionEvidence = {
  observedAt: "2026-09-20T09:00:00.000Z",
  retrievedSourceRefIds: ["s1"],
  claimSourceLinks: [
    { claimId: "1", sourceRefId: "s1", relation: "supports" as const },
  ],
  researchUsed: "search" as const,
  providerRuns: [{ provider: "search", runId: "run-1" }],
};

describe("factcheck job runner", () => {
  beforeEach(() => {
    setFactcheckWorkflowRepoForTests(createInMemoryFactcheckWorkflowRepo());
  });

  it("keeps source-open results review-first when sources are missing", async () => {
    const repo = createInMemoryFactcheckWorkflowRepo({
      records: [baseJob()],
    });
    setFactcheckWorkflowRepoForTests(repo);

    const job = await runFactcheckJob("job-1");

    expect(job.status).toBe("needs_manual_review");
    expect(job.result?.sourceSupport).toBe("open");
    expect(job.result?.reviewRecommended).toBe(true);
    expect(job.noAutoPublish).toBe(true);
    expect(job.noAutoGraphPromotion).toBe(true);
  });

  it("does not treat a declared sourceRef as retrieval or claim grounding", async () => {
    const repo = createInMemoryFactcheckWorkflowRepo({
      records: [baseJob({ jobId: "job-ref-only", sourceRefs: [sourceRef] })],
    });
    setFactcheckWorkflowRepoForTests(repo);

    const job = await runFactcheckJob("job-ref-only");

    expect(job.status).toBe("needs_manual_review");
    expect(job.result?.sourceSupport).toBe("open");
    expect(job.result?.sourceStatus).toContain("inhaltliche Prüfung offen");
    expect(job.result?.researchUsed).toBe("none");
    expect(job.result?.providerMatrix?.usedProviders).toEqual([]);
    expect(job.factcheckSealEligibility).toBe("not_eligible");
    expect(job.sealEligible).toBe(false);
  });

  it("does not complete when a source was retrieved but no claim-source relation was proven", async () => {
    const repo = createInMemoryFactcheckWorkflowRepo({
      records: [
        baseJob({
          jobId: "job-retrieved-only",
          sourceRefs: [sourceRef],
          executionEvidence: {
            observedAt: "2026-09-20T09:00:00.000Z",
            retrievedSourceRefIds: ["s1"],
            claimSourceLinks: [],
            researchUsed: "search",
          },
        }),
      ],
    });
    setFactcheckWorkflowRepoForTests(repo);

    const job = await runFactcheckJob("job-retrieved-only");

    expect(job.status).toBe("needs_manual_review");
    expect(job.result?.sourceStatus).toContain("Claim-Zuordnung");
    expect(job.result?.reviewRecommended).toBe(true);
    expect(job.factcheckSealEligibility).toBe("not_eligible");
  });

  it("ignores claim links to source refs that were not actually retrieved", async () => {
    const repo = createInMemoryFactcheckWorkflowRepo({
      records: [
        baseJob({
          jobId: "job-invalid-link",
          sourceRefs: [sourceRef],
          executionEvidence: {
            observedAt: "2026-09-20T09:00:00.000Z",
            retrievedSourceRefIds: [],
            claimSourceLinks: [
              { claimId: "1", sourceRefId: "s1", relation: "supports" },
            ],
            researchUsed: "search",
          },
        }),
      ],
    });
    setFactcheckWorkflowRepoForTests(repo);

    const job = await runFactcheckJob("job-invalid-link");

    expect(job.status).toBe("needs_manual_review");
    expect(job.result?.sourceSupport).toBe("open");
    expect(job.factcheckSealEligibility).toBe("not_eligible");
  });

  it("completes only when execution evidence retrieves the source and links every claim", async () => {
    const repo = createInMemoryFactcheckWorkflowRepo({
      records: [
        baseJob({
          jobId: "job-grounded",
          sourceRefs: [sourceRef],
          executionEvidence: completeExecutionEvidence,
        }),
      ],
    });
    setFactcheckWorkflowRepoForTests(repo);

    const job = await runFactcheckJob("job-grounded");

    expect(job.status).toBe("completed");
    expect(job.result?.sourceSupport).toBe("sourced");
    expect(job.result?.researchUsed).toBe("search");
    expect(job.result?.providerMatrix?.usedProviders).toEqual(["search"]);
    expect(job.result?.reviewRecommended).toBe(false);
    expect(job.factcheckSealEligibility).toBe("eligible");
  });

  it("forces manual review on fallback or disagreement", async () => {
    const repo = createInMemoryFactcheckWorkflowRepo({
      records: [
        baseJob({
          jobId: "job-2",
          sourceRefs: [sourceRef],
          executionEvidence: completeExecutionEvidence,
          fallbackUsed: true,
          disagreement: {
            present: true,
            insufficientIndependentSuccess: true,
            specialistAgreementScore: 0.22,
            specialistAgreement: "low",
            missingSpecialists: ["perplexity"],
            successfulProviders: ["perplexity"],
            failedProviders: [],
            fallbackReliance: "full",
            fallbackRelianceScore: 1,
            coverage: {
              requiredPrimary: 2,
              successfulPrimary: 1,
              missingPrimary: 1,
            },
          },
        }),
      ],
    });
    setFactcheckWorkflowRepoForTests(repo);

    const job = await runFactcheckJob("job-2");

    expect(job.status).toBe("needs_manual_review");
    expect(job.result?.reviewRecommended).toBe(true);
    expect(job.result?.disagreement?.present).toBe(true);
  });

  it("marks sealed_verified only for sealed_factcheck jobs with granted seal and execution evidence", async () => {
    const repo = createInMemoryFactcheckWorkflowRepo({
      records: [
        baseJob({
          jobId: "job-3",
          requestedAction: "sealed_factcheck",
          sourceRefs: [sourceRef],
          executionEvidence: completeExecutionEvidence,
          factcheckSealDecision: "granted",
          sealGranted: true,
          status: "completed",
        }),
        baseJob({
          jobId: "job-4",
          requestedAction: "source_check",
          sourceRefs: [sourceRef],
          executionEvidence: completeExecutionEvidence,
          factcheckSealDecision: "granted",
          sealGranted: true,
          status: "completed",
        }),
        baseJob({
          jobId: "job-5",
          requestedAction: "sealed_factcheck",
          sourceRefs: [sourceRef],
          factcheckSealDecision: "granted",
          sealGranted: true,
          publicSealVisible: true,
          status: "completed",
        }),
      ],
    });
    setFactcheckWorkflowRepoForTests(repo);

    const sealedJob = await runFactcheckJob("job-3");
    const normalJob = await runFactcheckJob("job-4");
    const ungroundedSealedJob = await runFactcheckJob("job-5");

    expect(sealedJob.result?.truthStatus).toBe("sealed_verified");
    expect(sealedJob.result?.verificationLabel).toBe("verifiziert");
    expect(normalJob.result?.truthStatus).not.toBe("sealed_verified");
    expect(ungroundedSealedJob.status).toBe("needs_manual_review");
    expect(ungroundedSealedJob.result?.truthStatus).not.toBe("sealed_verified");
    expect(ungroundedSealedJob.sealGranted).toBe(false);
    expect(ungroundedSealedJob.publicSealVisible).toBe(false);
  });
});
