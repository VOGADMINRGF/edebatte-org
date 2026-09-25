import { describe, expect, it } from "vitest";
import {
  PROTECTED_CANONICAL_OWNERS,
  classifyWebFeatureFile,
  evaluateRepositoryIntegrity,
  isProtectedDocument,
} from "../../../scripts/ci/check-repository-integrity-guards.mjs";

describe("repository integrity guards", () => {
  it("requires an explicit web-only classification for a new file in a root-owned domain", () => {
    const errors = evaluateRepositoryIntegrity({
      changes: [{ status: "A", path: "apps/web/src/features/create/newContract.ts" }],
      exists: (candidate: string) => candidate === "features/create",
      readBase: () => "",
      readHead: () => "export type NewContract = {};",
    });

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("root features/create owns this domain");
  });

  it("allows a new web-only adapter, readmodel, runtime bridge, or UI file when marked", () => {
    expect(classifyWebFeatureFile("// @repository-integrity-classification: adapter\nexport {};"))
      .toBe("adapter");
    expect(
      evaluateRepositoryIntegrity({
        changes: [{ status: "A", path: "apps/web/src/features/create/createAdapter.ts" }],
        exists: (candidate: string) => candidate === "features/create",
        readBase: () => "",
        readHead: () => "// @repository-integrity-classification: adapter\nexport {};",
      }),
    ).toEqual([]);
  });

  it("fails duplicate definitions of every protected canonical symbol outside its owner", () => {
    for (const [symbol, owner] of PROTECTED_CANONICAL_OWNERS) {
      const errors = evaluateRepositoryIntegrity({
        changes: [{ status: "A", path: `features/collision/${symbol}.ts` }],
        exists: () => false,
        readBase: () => "",
        readHead: () => `export interface ${symbol} {}`,
      });

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain(`${symbol} is canonically owned by ${owner}`);
    }
  });

  it("allows protected canonical definitions at their registered owner", () => {
    for (const [symbol, owner] of PROTECTED_CANONICAL_OWNERS) {
      const errors = evaluateRepositoryIntegrity({
        changes: [{ status: "M", path: owner }],
        exists: () => false,
        readBase: () => "",
        readHead: () => `export interface ${symbol} {}`,
      });

      expect(errors).toEqual([]);
    }
  });

  it("allows compatibility re-exports because they do not create a second canonical definition", () => {
    const errors = evaluateRepositoryIntegrity({
      changes: [{
        status: "M",
        path: "apps/web/src/features/create/canonicalTopicResolutionContract.ts",
      }],
      exists: () => false,
      readBase: () => "",
      readHead: () =>
        'export type { CanonicalTopic, DecisionQuestion, JurisdictionContext } from "@features/topic/canonicalTopicResolutionContract";',
    });

    expect(errors).toEqual([]);
  });

  it("rejects new product imports of canonical topic types through the legacy web compatibility owner", () => {
    const errors = evaluateRepositoryIntegrity({
      changes: [{ status: "A", path: "features/topic/newConsumer.ts" }],
      exists: () => false,
      readBase: () => "",
      readHead: () =>
        'import type { CanonicalTopic, DecisionQuestion } from "@/features/create/canonicalTopicResolutionContract";',
    });

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain(
      "must import directly from @features/topic/canonicalTopicResolutionContract",
    );
  });

  it("allows direct imports from the canonical topic owner", () => {
    const errors = evaluateRepositoryIntegrity({
      changes: [{ status: "A", path: "features/topic/newConsumer.ts" }],
      exists: () => false,
      readBase: () => "",
      readHead: () =>
        'import type { CanonicalTopic, DecisionQuestion } from "@features/topic/canonicalTopicResolutionContract";',
    });

    expect(errors).toEqual([]);
  });

  it("fails canonical runtime collisions for T9, C13, G6, and Observation ownership", () => {
    const forbiddenIdentifiers = [
      "T9Runner",
      "T9Composer",
      "T9ProviderRouter",
      "C13YoutubeLoader",
      "C13TranscriptRuntime",
      "G6EvidenceCollection",
      "G6GraphStore",
      "ObservationStore",
    ];

    for (const identifier of forbiddenIdentifiers) {
      const errors = evaluateRepositoryIntegrity({
        changes: [{ status: "A", path: `features/collision/${identifier}.ts` }],
        exists: () => false,
        readBase: () => "",
        readHead: () => `export class ${identifier} {}`,
      });

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain(identifier);
      expect(errors[0]).toContain("runtime/owner collision");
    }
  });

  it("does not ban generic runtime names that are not tied to the protected C13/T9/G6 roles", () => {
    const errors = evaluateRepositoryIntegrity({
      changes: [{ status: "A", path: "features/media/genericMediaLoader.ts" }],
      exists: () => false,
      readBase: () => "",
      readHead: () => "export class MediaLoader {}",
    });

    expect(errors).toEqual([]);
  });

  it("protects evidence classes including runbooks, architecture/security evidence, and foundation canon", () => {
    expect(isProtectedDocument("docs/E150/CREATE_PREFLIGHT_2026-09-14.md")).toBe(true);
    expect(isProtectedDocument("docs/E150/RELEASE_RUNBOOK_2026-09-14.md")).toBe(true);
    expect(isProtectedDocument("docs/architecture/DOMAIN_CONTRACT.md")).toBe(true);
    expect(isProtectedDocument("docs/E150/SECURITY_EVIDENCE.md")).toBe(true);
    expect(isProtectedDocument("docs/foundation/Engineering-Canon.md")).toBe(true);
  });

  it("fails a silent replacement that removes a protected document section", () => {
    const errors = evaluateRepositoryIntegrity({
      changes: [{ status: "M", path: "docs/E150/SAMPLE_AUDIT_2026-09-14.md" }],
      exists: () => false,
      readBase: () => "# Audit\n\n## Evidence\n\nFull technical evidence.\n\n## Result\n\nPass.",
      readHead: () => "# Audit\n\n## Result\n\nShort summary.",
    });

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("SUMMARY != REPLACEMENT");
  });

  it("requires complete explicit authorization metadata for an evidence rewrite", () => {
    const errors = evaluateRepositoryIntegrity({
      changes: [{ status: "M", path: "docs/E150/SAMPLE_AUDIT_2026-09-14.md" }],
      exists: () => false,
      readBase: () => "# Audit\n\n## Evidence\n\nFull technical evidence.",
      readHead: () => [
        "# Audit",
        "",
        "Replacement evidence.",
        "DOCUMENT_REWRITE_AUTHORIZED=true",
        "DOCUMENT_REWRITE_RATIONALE=The original evidence was technically incorrect.",
        "DOCUMENT_REWRITE_SUPERSESSION=docs/E150/SAMPLE_AUDIT_V2_2026-09-14.md",
      ].join("\n"),
    });

    expect(errors).toEqual([]);
  });
});
