import { describe, expect, it } from "vitest";
import { ORGANIZATION_TYPES } from "@features/region/organizationOnboarding";
import { auditOnboardingOrganizationTypeCoverage } from "@features/region/organizationRegistryCompatibility";

describe("organization registry onboarding compatibility", () => {
  it("keeps every existing onboarding type explicitly resolvable without silently guessing ambiguous legacy values", () => {
    const coverage = auditOnboardingOrganizationTypeCoverage();

    expect(coverage.map((entry) => entry.type)).toEqual([...ORGANIZATION_TYPES]);
    expect(coverage).toHaveLength(ORGANIZATION_TYPES.length);

    const media = coverage.find((entry) => entry.type === "media");
    const school = coverage.find((entry) => entry.type === "school");
    const administration = coverage.find(
      (entry) => entry.type === "public_administration",
    );
    const districtOffice = coverage.find(
      (entry) => entry.type === "district_office",
    );

    expect(media?.resolution).toMatchObject({
      status: "review_required",
      canonicalType: null,
      reviewRequired: true,
    });
    expect(school?.resolution).toMatchObject({
      status: "review_required",
      canonicalType: null,
      reviewRequired: true,
    });
    expect(administration?.resolution).toMatchObject({
      status: "canonical",
      canonicalType: "public_administration",
      reviewRequired: false,
    });
    expect(districtOffice?.resolution).toMatchObject({
      status: "mapped_legacy",
      canonicalType: "public_administration",
      reviewRequired: false,
    });
  });
});
