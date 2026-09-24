import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  getCreateEntitlementsForRequest: vi.fn(),
  getAccountOverview: vi.fn(),
  getDraft: vi.fn(),
}));

vi.mock("@/lib/server/entitlements/createEntitlements", () => ({
  getCreatePageBootstrapForRequest: async (...args: unknown[]) => {
    const entitlements = await mocks.getCreateEntitlementsForRequest(...args);
    const accountContext =
      entitlements?.isAuthenticated && entitlements?.userId
        ? await mocks.getAccountOverview(entitlements.userId)
        : null;
    return { entitlements, accountContext };
  },
}));

vi.mock("@features/account/service", () => ({
  getAccountOverview: (...args: unknown[]) => mocks.getAccountOverview(...args),
}));

vi.mock("@/server/draftStore", () => ({
  getDraft: (...args: unknown[]) => mocks.getDraft(...args),
}));

import CreatePage from "@/app/create/page";

describe("create primary surface dedupe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCreateEntitlementsForRequest.mockResolvedValue({
      userId: "user-1",
      isAuthenticated: true,
      tier: "citizenBasic",
      edebattePackage: "basis",
      roles: [],
      maxVisibleAiProposals: 3,
      maxFinalizeClaimsPerInput: 3,
      monthlyContributionLimit: null,
      canSubmitStatement: true,
      canSubmitContribution: true,
      canUseAttachments: false,
      canUseExternalExtraction: false,
      canDeepResearch: false,
      swipesPerCredit: 100,
      contributionCredits: 12,
      nextCreditIn: null,
      creditRequiredForContribution: false,
      reasons: {},
      serverTimeIso: "2026-03-19T12:00:00.000Z",
    });
    mocks.getAccountOverview.mockResolvedValue({
      userId: "user-1",
      email: "u@example.org",
      displayName: "User",
      accessTier: "citizenBasic",
      roles: [],
      groups: [],
      vogMembershipStatus: "none",
      hasVogMembership: false,
      pricingTier: "citizenBasic",
      stats: {
        swipesThisMonth: 0,
        remainingPostsLevel1: 0,
        remainingPostsLevel2: 0,
        swipeCountTotal: 0,
        xp: 0,
        contributionCredits: 12,
        engagementLevel: "starter",
        nextCreditIn: 0,
        lastSwipeAt: null,
      },
      preferredLocale: "de",
      newsletterOptIn: false,
      emailVerified: true,
      verificationLevel: "none",
      verificationMethods: [],
    });
    mocks.getDraft.mockResolvedValue(null);
  });

  it("renders one primary intake workspace before start", async () => {
    const tree = await CreatePage({
      searchParams: Promise.resolve({}),
    });
    const html = renderToStaticMarkup(tree);

    expect((html.match(/<textarea/g) ?? []).length).toBe(1);
    expect(html).toContain("Deine");
    expect(html).toContain("Meinung");
    expect(html).not.toContain("Beitrag erfassen");
  });
});
