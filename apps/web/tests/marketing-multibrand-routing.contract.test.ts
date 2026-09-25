import { describe, expect, it } from "vitest";
import {
  assertMarketingBrandProfileMatch,
  inferMarketingBrandFromCampaignKey,
  resolveCanonicalMarketingBrandProfile,
} from "@/features/marketing/multibrand/brandRoutingContract";

describe("marketing multi-brand routing", () => {
  it("routes eDebatte, VoiceOpenGov and Vote4Gov to distinct brand profiles", () => {
    expect(resolveCanonicalMarketingBrandProfile("edebatte").brandProfileId).toBe(
      "brand-edebatte-light",
    );
    expect(resolveCanonicalMarketingBrandProfile("voiceopengov").brandProfileId).toBe(
      "brand-voiceopengov",
    );
    expect(resolveCanonicalMarketingBrandProfile("vote4gov").brandProfileId).toBe(
      "brand-vote4gov",
    );
  });

  it("does not allow VoiceOpenGov or Vote4Gov to silently fall back to eDebatte", () => {
    expect(() =>
      assertMarketingBrandProfileMatch({
        brand: "voiceopengov",
        brandProfileId: "brand-edebatte-light",
      }),
    ).toThrow(/marketing_brand_profile_mismatch/);

    expect(() =>
      assertMarketingBrandProfileMatch({
        brand: "vote4gov",
        brandProfileId: "brand-edebatte-light",
      }),
    ).toThrow(/marketing_brand_profile_mismatch/);
  });

  it("infers brand from explicit campaign namespaces", () => {
    expect(inferMarketingBrandFromCampaignKey("vog-membership-2026")).toBe("voiceopengov");
    expect(inferMarketingBrandFromCampaignKey("voiceopengov-partner-2026")).toBe(
      "voiceopengov",
    );
    expect(inferMarketingBrandFromCampaignKey("vote4gov-governance-lab")).toBe("vote4gov");
    expect(inferMarketingBrandFromCampaignKey("v4g-systemvergleich")).toBe("vote4gov");
    expect(inferMarketingBrandFromCampaignKey("debattenstand-der-woche")).toBe("edebatte");
  });
});
