import { describe, expect, it } from "vitest";
import { buildMarketingSocialDistributionPreparation } from "@/features/marketing/multibrand/socialDistributionPreparation";
import { getMarketingContentOperations } from "@/features/marketing/contentOperations/data";
import type { MarketingContentOperation } from "@/features/marketing/contentOperations/contracts";

describe("marketing social distribution preparation", () => {
  it("prepares supported review-first channels and surfaces unsupported ones", () => {
    const content = getMarketingContentOperations().find((item) => item.id === "MCO-CONTENT-02-DE-01");
    expect(content).toBeDefined();

    const result = buildMarketingSocialDistributionPreparation(content!);

    expect(result.brand).toBe("edebatte");
    expect(result.status).toBe("distribution_prepare");
    expect(result.supportedTargets.map((item) => item.queueChannel)).toEqual(
      expect.arrayContaining(["instagram_asset", "linkedin_draft"]),
    );
    expect(result.unsupportedChannels).toContain("facebook");
    expect(result.autoPublishEligible).toBe(false);
    expect(result.supportedTargets.every((item) => item.requiresReview)).toBe(true);
    expect(result.supportedTargets.every((item) => item.externalPublishAllowed === false)).toBe(true);
  });

  it("keeps short-video channels fail-closed when the existing queue has no connector contract", () => {
    const content = getMarketingContentOperations().find((item) => item.id === "MCO-VOXY-03-DE-01");
    expect(content).toBeDefined();

    const result = buildMarketingSocialDistributionPreparation(content!);

    expect(result.status).toBe("distribution_prepare");
    expect(result.supportedTargets.map((item) => item.queueChannel)).toEqual(["instagram_asset"]);
    expect(result.unsupportedChannels).toEqual(expect.arrayContaining(["tiktok", "youtube_shorts"]));
  });

  it("blocks a mismatched CTA instead of sending one brand through another brand domain", () => {
    const base = getMarketingContentOperations()[0];
    const content: MarketingContentOperation = {
      ...base,
      cta: { label: "Falscher CTA", url: "https://voiceopengov.org/", status: "verified" },
    };

    const result = buildMarketingSocialDistributionPreparation(content);

    expect(result.brand).toBe("edebatte");
    expect(result.status).toBe("blocked");
    expect(result.blockers).toContain("brand_safe_verified_cta_required");
  });

  it("blocks draft content before distribution preparation", () => {
    const base = getMarketingContentOperations()[0];
    const content: MarketingContentOperation = { ...base, status: "draft" };

    const result = buildMarketingSocialDistributionPreparation(content);

    expect(result.status).toBe("blocked");
    expect(result.blockers).toContain("content_not_review_ready");
  });
});
