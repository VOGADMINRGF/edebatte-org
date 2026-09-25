import { describe, expect, it } from "vitest";
import { getMarketingRegistry } from "@/features/marketing/registry/data";
import {
  buildMarketingBrandControlReadModel,
  selectMarketingBrandControlRow,
} from "@/features/marketing/multibrand/brandControlReadModel";

describe("marketing brand control", () => {
  it("keeps eDebatte, VoiceOpenGov and Vote4Gov as distinct operator rows", () => {
    const model = buildMarketingBrandControlReadModel();
    expect(model.rows.map((row) => row.brand)).toEqual([
      "edebatte",
      "voiceopengov",
      "vote4gov",
    ]);
  });

  it("routes VoiceOpenGov campaigns and assets to the VoiceOpenGov profile", () => {
    const model = buildMarketingBrandControlReadModel();
    const row = selectMarketingBrandControlRow(model, "voiceopengov");
    expect(row).not.toBeNull();
    expect(row?.campaigns.length).toBeGreaterThan(0);
    expect(row?.campaigns.every((campaign) => campaign.brandProfileId === "brand-voiceopengov")).toBe(true);
    expect(row?.assets.every((asset) => asset.brandProfileId === "brand-voiceopengov")).toBe(true);
  });

  it("materializes Vote4Gov as its own campaign brand", () => {
    const model = buildMarketingBrandControlReadModel();
    const row = selectMarketingBrandControlRow(model, "vote4gov");
    expect(row?.profile?.mode).toBe("vote4gov");
    expect(row?.campaigns.map((campaign) => campaign.id)).toContain("CAM-V4G-14");
    expect(row?.campaigns.every((campaign) => campaign.brandProfileId === "brand-vote4gov")).toBe(true);
  });

  it("does not let VOG or Vote4Gov campaigns inherit the eDebatte profile", () => {
    const registry = getMarketingRegistry();
    for (const campaign of registry.campaigns.filter((item) =>
      item.id.startsWith("CAM-VOG") || item.id.startsWith("CAM-V4G"),
    )) {
      expect(campaign.brandProfileId).not.toBe("brand-edebatte-light");
      expect(campaign.brandProfileId).not.toBe("brand-edebatte-dark");
    }
  });
});
