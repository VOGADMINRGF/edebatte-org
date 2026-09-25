import { describe, expect, it } from "vitest";
import { estimateMaterialEconomics } from "@/features/material/materialKnowledgeEconomics";

describe("material knowledge economics", () => {
  it("prices reuse independently from a full source re-analysis", () => {
    const estimate = estimateMaterialEconomics({
      operation: "reuse_existing_material",
      characterCount: 12_000,
    });
    expect(estimate.internalAnalysisUnits).toBe(1);
    expect(estimate.commercialCredits).toBe(1);
    expect(estimate.requiresExplicitApproval).toBe(false);
    expect(estimate.pricingPublished).toBe(false);
    expect(estimate.checkoutAvailable).toBe(false);
  });

  it("requires approval for multi-unit new material", () => {
    const estimate = estimateMaterialEconomics({
      operation: "ingest_new_material",
      characterCount: 180_001,
    });
    expect(estimate.internalAnalysisUnits).toBe(4);
    expect(estimate.requiresExplicitApproval).toBe(true);
    expect(estimate.commercialCredits).toBe(4);
  });
});
