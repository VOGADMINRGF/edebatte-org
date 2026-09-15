import { describe, expect, it } from "vitest";
import {
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
