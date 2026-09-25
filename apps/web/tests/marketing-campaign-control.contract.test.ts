import { describe, expect, it } from "vitest";
import { getMarketingRegistry } from "@/features/marketing/registry/data";
import {
  MarketingCampaignControlProfileSchema,
  MarketingMetricSnapshotSchema,
} from "@/features/marketing/campaignControl/contracts";
import {
  getMarketingCampaignControlProfiles,
  getMarketingMetricSnapshots,
} from "@/features/marketing/campaignControl/data";
import {
  buildMarketingCampaignControlReadModel,
  channelScope,
} from "@/features/marketing/campaignControl/readModel";

describe("marketing campaign control contract", () => {
  it("classifies every canonical campaign by market segment, reach and channels", () => {
    const registry = getMarketingRegistry();
    const profiles = getMarketingCampaignControlProfiles();

    expect(profiles).toHaveLength(registry.campaigns.length);
    expect(new Set(profiles.map((profile) => profile.campaignId))).toEqual(
      new Set(registry.campaigns.map((campaign) => campaign.id)),
    );
    expect(profiles.some((profile) => profile.primarySegment === "b2c")).toBe(true);
    expect(profiles.some((profile) => profile.primarySegment === "b2b")).toBe(true);
    expect(profiles.some((profile) => profile.primarySegment === "b2g")).toBe(true);
    expect(profiles.some((profile) => profile.reachScopes.includes("international"))).toBe(true);
    expect(profiles.every((profile) => profile.plannedChannels.length > 0)).toBe(true);
  });

  it("keeps real performance empty until verified snapshots exist", () => {
    const snapshots = getMarketingMetricSnapshots();
    const model = buildMarketingCampaignControlReadModel();

    expect(snapshots).toEqual([]);
    expect(model.summary.campaigns).toBe(getMarketingRegistry().campaigns.length);
    expect(model.summary.contentItems).toBe(2);
    expect(model.summary.scheduledItems).toBe(0);
    expect(model.summary.publishedItems).toBe(0);
    expect(model.summary.campaignsWithPerformance).toBe(0);
    expect(model.summary.connectedSourceKinds).toBe(0);
    expect(model.sourceStates.every((source) => source.quality === "missing")).toBe(true);
    expect(model.campaigns.every((campaign) => campaign.hasPerformanceData === false)).toBe(true);
  });

  it("rejects inconsistent campaign segmentation", () => {
    const valid = getMarketingCampaignControlProfiles()[0];

    expect(() =>
      MarketingCampaignControlProfileSchema.parse({
        ...valid,
        primarySegment: "b2g",
        segments: ["b2c"],
      }),
    ).toThrow(/primarySegment must be included/i);
  });

  it("rejects metric snapshots without actual values", () => {
    expect(() =>
      MarketingMetricSnapshotSchema.parse({
        id: "MMS-TEST-01",
        campaignId: "CAM-EDB-01",
        contentId: null,
        distributionRecordId: null,
        sourceKind: "social",
        providerKey: "manual-test",
        sourceRef: "manual:test",
        quality: "verified",
        channel: "linkedin",
        segment: "b2b",
        regionKey: "germany",
        reachScope: "national",
        locale: "de-DE",
        promotion: "organic",
        periodStart: "2026-07-01T00:00:00+02:00",
        periodEnd: "2026-07-07T23:59:59+02:00",
        capturedAt: "2026-07-08T08:00:00+02:00",
        attribution: "platform_reported",
        confidence: 1,
        values: {},
      }),
    ).toThrow(/requires at least one value/i);
  });

  it("separates eDebatte-owned surfaces from external channels", () => {
    expect(channelScope("edebatte")).toBe("internal");
    expect(channelScope("website")).toBe("internal");
    expect(channelScope("instagram")).toBe("external");
    expect(channelScope("linkedin_ads")).toBe("external");
  });
});
