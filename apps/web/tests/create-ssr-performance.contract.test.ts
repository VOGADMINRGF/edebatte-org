import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function functionBody(fileSource: string, signature: string, nextSignature: string) {
  const start = fileSource.indexOf(signature);
  const end = fileSource.indexOf(nextSignature, start + signature.length);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return fileSource.slice(start, end);
}

describe("CREATE-SSR-PERFORMANCE-01", () => {
  it("boots /create through one slim account context instead of full AccountOverview", () => {
    const page = source("src/app/create/page.tsx");
    expect(page).toContain("getCreatePageBootstrapForRequest");
    expect(page).not.toContain("getAccountOverview");
  });

  it("keeps the slim account read on the users truth without optional account fan-out", () => {
    const service = source("../../features/account/service.ts");
    const body = functionBody(
      service,
      "export async function getCreateAccountContext(",
      "export async function getAccountOverview(",
    );

    expect(body).toContain('getCol<UserDoc>("users")');
    expect(body).toContain("deriveDisplayName(doc)");
    expect(body).toContain("deriveTier(doc)");
    expect(body).toContain("deriveRoles(doc)");
    expect(body).toContain("deriveStats(doc)");

    for (const forbidden of [
      "loadOptionalAccountData(",
      "getUserPaymentProfile(",
      "getUserSignature(",
      "loadAccountCreateContributionLedger",
      "loadAccountGraphMergeCandidates",
      "loadAccountSavedWorkstates",
      "loadAccountManualAnlassraumServerDrafts",
      "loadAccountEditorialReviewRequests",
      "loadAccountFactcheckJobs",
      "loadAccountUserScopedRuntimeLinkage",
    ]) {
      expect(body).not.toContain(forbidden);
    }
  });

  it("keeps generic entitlement callers on their existing full-overview path", () => {
    const entitlements = source("src/lib/server/entitlements/createEntitlements.ts");
    expect(entitlements).toContain("getCreateEntitlementsForRequest");
    expect(entitlements).toContain("await getAccountOverview(userId)");
    expect(entitlements).toContain("getCreatePageBootstrapForRequest");
    expect(entitlements).toContain("await getCreateAccountContext(userId)");
  });
});
