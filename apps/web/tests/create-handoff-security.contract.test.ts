import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("C9 handoff route security contract", () => {
  it("uses the shared C3B mutation security scope before parsing the body", () => {
    const route = source("src/app/api/create/handoffs/route.ts");
    const security = source("src/features/create/createRouteSecurity.ts");
    expect(security).toContain('"create_handoff_persistence"');
    expect(security).toContain('"draft", "draftId", "dossierId", "anlassraumId"');
    expect(route).toContain('scope: "create_handoff_persistence"');
    expect(route.indexOf("enforceCreateMutationSecurity")).toBeLessThan(route.indexOf("CreateHandoffBodySchema.parse(await req.json())"));
  });

  it("uses the existing CSRF/header contract in the browser runtime bridge", () => {
    const bridge = source("src/features/create/createHandoffReviewQueueRuntimeBridge.ts");
    expect(bridge).toContain('createMutationRequestHeaders()');
    expect(bridge).not.toContain('headers: { "content-type": "application/json" }');
    expect(bridge).toContain("selectedAction: input.selectedAction");
    expect(bridge).not.toContain("plannerResult: input.draft.plannerResult");
  });

  it("rebuilds durable handoff truth from the canonical account draft", () => {
    const route = source("src/app/api/create/handoffs/route.ts");
    expect(route).toContain("resolveCanonicalCreateHandoffDraftBinding");
    expect(route).toContain("result: binding.followup");
    expect(route).toContain("canonicalDraftId: binding.draftId");
    expect(route).toContain("canonicalDraftBindingHash: binding.bindingHash");
    expect(route).toContain("canonicalDraftPayloadHash: binding.payloadHash");
    expect(route).toContain("canonicalSourceEvidenceRefs: binding.sourceEvidenceRefs");
    expect(route).not.toContain("normalizePlannerResult(body.draft");
    expect(route).not.toContain("normalizeGraphMatches(body.draft");
  });

  it("binds every generated open question to the current G1 contract and never publishes", () => {
    const route = source("src/app/api/create/handoffs/route.ts");
    const persistence = source("src/features/create/persistedHandoffReviewQueue.ts");
    expect(route).toContain("bindQuestionGuardToCurrentContract");
    expect(route).toContain('source: "create_analysis"');
    expect(route).toContain("independentFromCandidateProvider: false");
    expect(persistence).toContain("reviewRequired: true");
    expect(persistence).toContain("noAutoPublish: true");
    expect(persistence).toContain("noPublicOfficial: true");
    expect(persistence).toContain("noAutoFinalization: true");
  });

  it("derives a retry-safe handoff id from actor, canonical draft, revision and action", () => {
    const route = source("src/app/api/create/handoffs/route.ts");
    expect(route).toContain('scope: "create_c9_handoff"');
    expect(route).toContain("userId: input.userId");
    expect(route).toContain("canonicalDraftId: input.canonicalDraftId");
    expect(route).toContain("payloadHash: input.payloadHash");
    expect(route).toContain("selectedAction: input.selectedAction");
  });
});
