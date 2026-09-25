import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/components/analyze/AnalyzeWorkspace", () => ({
  __esModule: true,
  default: () => null,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

import CreateClient, { type CreateClientProps } from "@/app/create/CreateClient";
import { LocaleProvider } from "@/context/LocaleContext";

const BASE_PROPS: CreateClientProps = {
  initialEntitlements: {
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
    serverTimeIso: "2026-04-18T12:00:00.000Z",
  },
  overview: {
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
  },
};

function renderCreate(locale: "de" | "en") {
  return renderToStaticMarkup(
    <LocaleProvider initialLocale={locale}>
      <CreateClient
        {...BASE_PROPS}
        overview={{
          ...BASE_PROPS.overview,
          preferredLocale: locale,
        }}
      />
    </LocaleProvider>,
  );
}

describe("create i18n no mixed locale contract", () => {
  it("keeps EN entry copy free from DE leftovers", () => {
    const html = renderCreate("en");

    expect(html).toContain("Organize concern");
    expect(html).toContain("Write or speak");
    expect(html).toContain("Hello neighbor,");
    expect(html).toContain("No auto-publishing");

    expect(html).not.toContain("Deine");
    expect(html).not.toContain("Meinung");
    expect(html).not.toContain("Beitragen");
    expect(html).not.toContain("Prüfen");
    expect(html).not.toContain("Entwerfen");
    expect(html).not.toContain("Anderer Arbeitsmodus");
  });

  it("keeps DE entry copy free from EN leftovers", () => {
    const html = renderCreate("de");

    expect(html).toContain("Anliegen einordnen");
    expect(html).toContain("Schreiben oder sprechen");
    expect(html).toContain("Hallo Nachbar,");
    expect(html).toContain("Kein Auto-Publish");

    expect(html).not.toContain("Different mode");
    expect(html).not.toContain("Organize concern");
  });
});
