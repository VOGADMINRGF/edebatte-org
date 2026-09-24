import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("server-only", () => ({}));

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

vi.mock("@/server/createContributionDrafts", () => ({
  getCreateContributionDraftForResume: vi.fn(async () => null),
}));

vi.mock("@/features/surfaces/runden/manualAnlassraumServerDraft", () => ({
  readManualAnlassraumServerDraftForCurrentUser: vi.fn(async () => null),
}));

vi.mock("@/lib/server/auth/requestScope", () => ({
  resolveCurrentRequestScopeContext: vi.fn(async () => null),
  summarizeRequestScopeContext: vi.fn(() => null),
}));

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<typeof import("next/navigation")>("next/navigation");
  return {
    ...actual,
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
    }),
  };
});

import CreatePage from "@/app/create/page";

describe("create UI query leak hardening", () => {
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

  it("hides raw source/reason/entry flags from the visible start surface", async () => {
    const tree = await CreatePage({
      searchParams: Promise.resolve({
        source: "runden",
        reason: "round_first_contribution",
        entry_intent: "content_companion",
        entry_mode: "guided",
        returnTo: "/runden?view=active",
      }),
    });
    const html = renderToStaticMarkup(tree);

    expect(html).toContain("Aus laufendem Anlass gestartet");
    expect(html).not.toContain("round_first_contribution");
    expect(html).not.toContain("content_companion");
    expect(html).not.toContain("entry_intent");
    expect(html).not.toContain("entry_mode");
  });
});
