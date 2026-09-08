import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  getCreateEntitlementsForRequest: vi.fn(),
  getAccountOverview: vi.fn(),
  getDraft: vi.fn(),
  getCreateContributionDraftForResume: vi.fn(),
  readManualAnlassraumServerDraftForCurrentUser: vi.fn(),
  resolveCurrentRequestScopeContext: vi.fn(),
  summarizeRequestScopeContext: vi.fn(),
  analyzeWorkspaceCalls: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/lib/server/entitlements/createEntitlements", () => ({
  getCreateEntitlementsForRequest: (...args: unknown[]) => mocks.getCreateEntitlementsForRequest(...args),
}));

vi.mock("@features/account/service", () => ({
  getAccountOverview: (...args: unknown[]) => mocks.getAccountOverview(...args),
}));

vi.mock("@/server/draftStore", () => ({
  getDraft: (...args: unknown[]) => mocks.getDraft(...args),
}));

vi.mock("@/features/surfaces/runden/manualAnlassraumServerDraft", () => ({
  readManualAnlassraumServerDraftForCurrentUser: (...args: unknown[]) =>
    mocks.readManualAnlassraumServerDraftForCurrentUser(...args),
}));

vi.mock("@/server/createContributionDrafts", () => ({
  getCreateContributionDraftForResume: (...args: unknown[]) =>
    mocks.getCreateContributionDraftForResume(...args),
}));

vi.mock("@/lib/server/auth/requestScope", () => ({
  resolveCurrentRequestScopeContext: (...args: unknown[]) =>
    mocks.resolveCurrentRequestScopeContext(...args),
  summarizeRequestScopeContext: (...args: unknown[]) =>
    mocks.summarizeRequestScopeContext(...args),
}));

vi.mock("@/components/analyze/AnalyzeWorkspace", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    mocks.analyzeWorkspaceCalls.push(props);
    return null;
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  redirect: (href: string) => {
    throw new Error(`redirect:${href}`);
  },
}));

import CreatePage from "@/app/create/page";

const AUTH_ENTITLEMENTS = {
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
} as const;

const OVERVIEW = {
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
} as const;

describe("/create start surface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCreateEntitlementsForRequest.mockResolvedValue(AUTH_ENTITLEMENTS);
    mocks.getAccountOverview.mockResolvedValue(OVERVIEW);
    mocks.getDraft.mockResolvedValue(null);
    mocks.getCreateContributionDraftForResume.mockResolvedValue(null);
    mocks.readManualAnlassraumServerDraftForCurrentUser.mockResolvedValue(null);
    mocks.resolveCurrentRequestScopeContext.mockResolvedValue(null);
    mocks.summarizeRequestScopeContext.mockReturnValue(null);
    mocks.analyzeWorkspaceCalls.length = 0;
  });

  it("renders the canonical create workspace for a guest and defers login to ownership", async () => {
    mocks.getCreateEntitlementsForRequest.mockResolvedValue({
      ...AUTH_ENTITLEMENTS,
      userId: null,
      isAuthenticated: false,
      canSubmitStatement: false,
      canSubmitContribution: false,
    });

    const tree = await CreatePage({ searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(tree);

    expect(html).toContain('data-create-workspace-shell="true"');
    expect(html).toContain('data-create-guest-ownership="browser-workstate"');
    expect(html).toContain("Ohne Konto starten");
    expect(html).toContain("Melde dich erst an, wenn du sie speichern oder weiterführen möchtest.");
    expect(html).not.toContain("Anmelden und weiterführen");
    expect(html).not.toContain("Anhang hinzufügen");
    expect(mocks.getAccountOverview).not.toHaveBeenCalled();
    expect(mocks.resolveCurrentRequestScopeContext).not.toHaveBeenCalled();
  });

  it("renders only the primary start surface on first load", async () => {
    const tree = await CreatePage({
      searchParams: Promise.resolve({}),
    });
    const html = renderToStaticMarkup(tree);

    expect(html).toContain("Hallo");
    expect(html).toContain("Sag mir, was dich beschäftigt");
    expect(html).toContain(
      "Ich ordne es kurz ein. Danach bestätigst oder präzisierst du, was ich verstanden habe.",
    );
    expect(html).toContain("Anhang");
    expect(html).toContain("Details &amp; Transparenz");
    expect(html).toContain("create-primary-intake");
    expect(html).toContain('data-create-workspace-shell="true"');
    expect(html).toContain('data-create-shell-layout="wide"');
    expect(html).toContain('data-create-shell-thread="true"');
    expect(html).not.toContain('data-create-debattenstand-statusbar="true"');
    expect(html).toContain('data-create-composer-bar="true"');
    expect(html).toContain("Anliegen einordnen");
    expect(html).toContain(
      "Auf /create erklärt Voxy Anliegenordnung, Format, Quellen- und Claims-Schritte als sichere Vorschläge",
    );
    expect(html).toContain(
      "Der Agentic Civic Pilot bleibt review-first: Beobachtung, Format, Claims, Dossier, Beteiligung und Handoff werden vorbereitet, aber nichts wird automatisch veröffentlicht oder extern benachrichtigt.",
    );
    expect(html).toContain('data-create-stage-shell="true"');
    expect(html).not.toContain("Developer-Hinweis");
    expect(html).not.toContain("Operator");
    expect(html).not.toContain("Provider");
    expect(html).not.toContain("Missing runtime truth");
    expect(html).not.toContain("runId");
    expect(html).not.toContain("Beitrag einreichen");
    expect(html).not.toContain("Beitrag sortieren");
    expect(html).not.toContain("Warum sehe ich das?");
    expect(html).not.toContain("Welche KI im aktuellen Schritt sichtbar arbeitet");
    expect(html).toContain('data-voxy-appearance="compact"');
    expect(html).not.toContain("Kurzer Einstieg");
    expect(html).not.toContain("create-start-chat-preview");


    expect(html).not.toContain("Kontext-Picker");
    expect(html).not.toContain("Intake-Kontext");
    expect(mocks.analyzeWorkspaceCalls.length).toBe(0);
  });

  it("does not leak raw query intent/source flags into visible UI", async () => {
    const tree = await CreatePage({
      searchParams: Promise.resolve({
        source: "runden",
        reason: "round_first_contribution",
        entryIntent: "content_companion",
        entryMode: "guided",
      }),
    });
    const html = renderToStaticMarkup(tree);

    expect(html).toContain("Aus laufendem Anlass gestartet");
    expect(html).not.toContain("round_first_contribution");
    expect(html).not.toContain("content_companion");
    expect(html).not.toContain("entryMode");
    expect(html).not.toContain("entryIntent");
  });

  it("keeps context query from auto-seeding technical prefill text", async () => {
    const tree = await CreatePage({
      searchParams: Promise.resolve({
        source: "feed_drafts_queue",
        signalTitle: "Signal Innenstadt",
        reason: "manual_fast_path_via_create",
      }),
    });
    const html = renderToStaticMarkup(tree);

    expect(html).not.toContain("Intake-Kontext (Anlassraum-first)");
    expect(html).not.toContain("manual_fast_path_via_create");
    expect(html).not.toContain("feed_drafts_queue");
  });

  it("shows the manual runden continue hint without auto-analyzing", async () => {
    const tree = await CreatePage({
      searchParams: Promise.resolve({
        source: "runden",
        reason: "manual_anlassraum_continue_create",
        returnTo: "/runden/new",
        signalTitle: "Verkehr im Kiez",
      }),
    });
    const html = renderToStaticMarkup(tree);

    expect(html).toContain("Kein serverseitiger Entwurf angefordert");
    expect(html).toContain(
      "Für diesen Übergang wurde noch kein serverseitiger Entwurf übernommen. Analyse und Planner arbeiten dann nur mit dem aktuell sichtbaren Text.",
    );
    expect(html).toContain('data-create-runden-handoff-status="not_requested"');
    expect(html).toContain('data-create-workspace-shell="true"');
    expect(html).toContain('data-create-stage-shell="true"');
    expect(html).toContain("Aus laufendem Anlass gestartet");
    expect(html).toContain('data-voxy-appearance="compact"');
    expect(html).not.toContain("autoAnalyze");
    expect(mocks.analyzeWorkspaceCalls.length).toBe(0);
  });

  it("loads a server-backed /runden/new draft into /create when a valid draftId is present", async () => {
    mocks.readManualAnlassraumServerDraftForCurrentUser.mockResolvedValue({
      draftId: "65a111111111111111111122",
      updatedAt: "2026-07-03T13:00:00.000Z",
      setup: {
        title: "Sichere Schulwege",
        votingQuestion: "Welche Maßnahme soll zuerst kommen?",
        description: "Eltern und Schule melden offene Querungen.",
        scope: "public",
        visibility: "private_draft",
        options: ["Zebrastreifen", "Tempo 30"],
        communityOptionsMode: "disabled",
        aiSupportMode: "disabled",
        nextStep: "continue_create",
      },
    });

    const tree = await CreatePage({
      searchParams: Promise.resolve({
        source: "runden",
        reason: "manual_anlassraum_continue_create",
        returnTo: "/runden/new",
        draftId: "65a111111111111111111122",
      }),
    });
    const html = renderToStaticMarkup(tree);

    expect(mocks.readManualAnlassraumServerDraftForCurrentUser).toHaveBeenCalledWith(
      "65a111111111111111111122",
    );
    expect(html).toContain("Serverseitiger Anlassraum-Entwurf übernommen");
    expect(html).toContain("Der serverseitig gespeicherte Entwurf aus /runden/new wurde geladen.");
    expect(html).toContain("Sichere Schulwege");
    expect(html).toContain('data-create-runden-handoff-status="loaded"');
  });

  it("shows an honest warning when a manual /runden/new draft is missing", async () => {
    const tree = await CreatePage({
      searchParams: Promise.resolve({
        source: "runden",
        reason: "manual_anlassraum_continue_create",
        returnTo: "/runden/new",
        draftId: "65a111111111111111111122",
      }),
    });
    const html = renderToStaticMarkup(tree);

    expect(html).toContain("Serverseitiger Anlassraum-Entwurf wurde nicht gefunden");
    expect(html).toContain("Es gibt keine belastbare serverseitige Draft-Wahrheit");
    expect(html).toContain('data-create-runden-handoff-status="missing"');
  });

  it("shows an honest warning for invalid manual round draft ids", async () => {
    const tree = await CreatePage({
      searchParams: Promise.resolve({
        source: "runden",
        reason: "manual_anlassraum_continue_create",
        returnTo: "/runden/new",
        draftId: "bad-draft-id",
      }),
    });
    const html = renderToStaticMarkup(tree);

    expect(mocks.readManualAnlassraumServerDraftForCurrentUser).toHaveBeenCalledWith("bad-draft-id");
    expect(html).toContain("Draft-ID ist ungültig");
    expect(html).toContain("Es wurde kein serverseitiger Entwurf übernommen.");
    expect(html).toContain('data-create-runden-handoff-status="invalid"');
  });

  it("shows the resolved organization scope when available", async () => {
    mocks.resolveCurrentRequestScopeContext.mockResolvedValue({ actorId: "user-1" });
    mocks.summarizeRequestScopeContext.mockReturnValue({
      organizationId: "org-1",
      organizationLabel: "Stadtverwaltung Nord",
      membershipStatus: "organization_verified",
      organizationRole: "communications",
      roleLabel: "Kommunikation",
      regionIds: ["kommune-nord"],
      primaryRegionId: "kommune-nord",
      isOperatorMode: false,
      operatorModeLabel: null,
      sourceOfTruth: "local_membership_store",
      confidence: "high",
    });

    const tree = await CreatePage({
      searchParams: Promise.resolve({}),
    });
    const html = renderToStaticMarkup(tree);

    expect(html).toContain("Stadtverwaltung Nord · Organisations-verifiziert");
    expect(html).toContain("im Bereich deiner Organisation und wird vor Veröffentlichung geprüft");
  });

  it("prefers the user-scoped contribution draft resume over the legacy draft store for object ids", async () => {
    mocks.getDraft.mockResolvedValue({
      id: "65a111111111111111111122",
      text: "Legacy-Draft-Text",
    });
    mocks.getCreateContributionDraftForResume.mockResolvedValue({
      id: "65a111111111111111111122",
      text: "Serverseitiger Contribution-Draft",
    });

    await CreatePage({
      searchParams: Promise.resolve({
        draftId: "65a111111111111111111122",
      }),
    });

    expect(mocks.getCreateContributionDraftForResume).toHaveBeenCalledWith(
      "65a111111111111111111122",
      "user-1",
    );
    expect(mocks.getDraft).not.toHaveBeenCalledWith("65a111111111111111111122");
  });
});
