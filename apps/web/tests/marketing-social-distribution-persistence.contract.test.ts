import { describe, expect, it } from "vitest";
import { createInMemorySocialDistributionRepo } from "@features/outputEngine/socialDistributionRuntime";
import { getMarketingContentOperations } from "@/features/marketing/contentOperations/data";
import type { MarketingContentOperation } from "@/features/marketing/contentOperations/contracts";
import { persistMarketingSocialDistribution } from "@/features/marketing/multibrand/socialDistributionPersistence";

describe("marketing social distribution persistence bridge", () => {
  it("persists review-first eDebatte marketing content in the existing social queue", async () => {
    const repo = createInMemorySocialDistributionRepo();
    const content = getMarketingContentOperations().find((item) => item.id === "MCO-CONTENT-02-DE-01");
    expect(content).toBeTruthy();

    const result = await persistMarketingSocialDistribution({
      content: content!,
      organizationId: "org-marketing",
      actorUserId: "admin-1",
      repo,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.reason);

    expect(result.post).toMatchObject({
      organizationId: "org-marketing",
      sourceContextType: "marketing_campaign",
      sourceContextId: "CAM-CONTENT-02",
      publicBrand: "edebatte",
      marketingCampaignId: "CAM-CONTENT-02",
      marketingContentId: "MCO-CONTENT-02-DE-01",
      status: "needs_review",
      noAutoPublish: true,
      noAutoPublicationApproved: true,
      externalPosting: false,
    });
    expect(result.post.channels).toEqual(expect.arrayContaining(["instagram_asset", "linkedin_draft"]));
    expect(result.post.approval.reviewRequired).toBe(true);

    await expect(repo.listAllPosts()).resolves.toHaveLength(1);
    await expect(
      repo.listPostsBySourceContext({
        sourceContextType: "marketing_campaign",
        sourceContextId: "CAM-CONTENT-02",
      }),
    ).resolves.toHaveLength(1);

    const audit = await repo.listAuditEventsByPostIds([result.post.id]);
    expect(audit.get(result.post.id)?.[0]).toMatchObject({
      action: "create_draft",
      nextStatus: "needs_review",
    });
  });

  it.each([
    {
      publicBrand: "voiceopengov" as const,
      campaignId: "CAM-VOG-11",
      contentId: "MCO-VOG-11-DE-TEST",
      ctaUrl: "https://voiceopengov.org/",
      referenceLabel: "VoiceOpenGov · Marketing-Referenz",
    },
    {
      publicBrand: "vote4gov" as const,
      campaignId: "CAM-V4G-14",
      contentId: "MCO-V4G-14-DE-TEST",
      ctaUrl: "https://vote4gov.eu/",
      referenceLabel: "Vote4Gov · Marketing-Referenz",
    },
  ])("persists $publicBrand as its own public sender instead of eDebatte", async (brandCase) => {
    const repo = createInMemorySocialDistributionRepo();
    const base = getMarketingContentOperations()[0];
    const content: MarketingContentOperation = {
      ...base,
      id: brandCase.contentId,
      campaignId: brandCase.campaignId,
      title: `${brandCase.publicBrand} · Testinhalt`,
      channels: ["instagram", "linkedin"],
      cta: {
        label: "Mehr erfahren",
        url: brandCase.ctaUrl,
        status: "verified",
      },
    };

    const result = await persistMarketingSocialDistribution({
      content,
      organizationId: "org-marketing",
      actorUserId: "admin-1",
      repo,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.reason);
    expect(result.post.publicBrand).toBe(brandCase.publicBrand);
    expect(result.post.marketingCampaignId).toBe(brandCase.campaignId);
    expect(result.post.marketingContentId).toBe(brandCase.contentId);
    expect(result.post.sourceContextType).toBe("marketing_campaign");
    expect(result.post.assets.some((asset) => asset.label === brandCase.referenceLabel)).toBe(true);
    expect(result.post.assets.some((asset) => asset.label === "Share-Referenz")).toBe(false);
    expect(result.post.noAutoPublish).toBe(true);
    expect(result.post.externalPosting).toBe(false);
  });

  it("keeps two content items in one marketing campaign as distinct queue records", async () => {
    const repo = createInMemorySocialDistributionRepo();
    const original = getMarketingContentOperations().find((item) => item.id === "MCO-CONTENT-02-DE-01");
    expect(original).toBeTruthy();

    const first = await persistMarketingSocialDistribution({
      content: original!,
      organizationId: "org-marketing",
      actorUserId: "admin-1",
      repo,
    });
    const second = await persistMarketingSocialDistribution({
      content: {
        ...original!,
        id: "MCO-CONTENT-02-DE-02",
        title: "Debattenstand der Woche · LinkedIn Variante",
      },
      organizationId: "org-marketing",
      actorUserId: "admin-1",
      repo,
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) throw new Error("expected persisted marketing records");
    expect(first.post.id).not.toBe(second.post.id);

    await expect(
      repo.listPostsBySourceContext({
        sourceContextType: "marketing_campaign",
        sourceContextId: "CAM-CONTENT-02",
      }),
    ).resolves.toHaveLength(2);
  });
});
