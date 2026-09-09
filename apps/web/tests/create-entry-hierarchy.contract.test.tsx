import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

vi.mock("@/components/analyze/AnalyzeWorkspace", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: () => {},
    replace: () => {},
    refresh: () => {},
  }),
}));

import CreateClient, { type CreateClientProps } from "@/app/create/CreateClient";
import { LocaleProvider } from "@/context/LocaleContext";

const PROPS: CreateClientProps = {
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

function renderCreateDe() {
  return renderToStaticMarkup(
    <LocaleProvider initialLocale="de">
      <CreateClient {...PROPS} />
    </LocaleProvider>,
  );
}

describe("create entry hierarchy contract", () => {
  it("keeps the initial create state reduced to one intake and one primary action", () => {
    const html = renderCreateDe();
    const composerSource = readFileSync(
      resolve(process.cwd(), "src/features/create/SharedCreateComposer.tsx"),
      "utf8",
    );
    const clientSource = readFileSync(
      resolve(process.cwd(), "src/app/create/CreateClient.tsx"),
      "utf8",
    );
    const followupSource = readFileSync(
      resolve(process.cwd(), "src/features/create/CreateVisualFollowup.tsx"),
      "utf8",
    );

    expect((html.match(/<textarea/g) ?? []).length).toBe(1);
    expect((html.match(/data-create-workspace-shell="true"/g) ?? []).length).toBe(1);
    expect((html.match(/data-create-composer-bar="true"/g) ?? []).length).toBe(1);
    expect(html).toContain("id=\"create-primary-intake\"");
    expect(html).toContain("Sag mir, was dich beschäftigt");
    expect(html).toContain("Danach bestätigst oder präzisierst du");
    expect(html).toContain("Schreiben oder sprechen");
    expect(html).toContain("Anliegen einordnen");
    expect(html).not.toContain("Thema ordnen");
    expect(html).not.toContain("Frage schärfen");
    expect(html).not.toContain("Debattenstand");
    expect(html).toContain("Anhang");
    expect(html).toContain("Sprechen");
    expect(html).toContain('data-create-workspace-shell="true"');
    expect(html).toContain('data-create-workspace-host="wide-screen"');
    expect(html).toContain('data-create-shell-layout="wide"');
    expect(html).toContain('data-create-workspace-size="wide-screen"');
    expect(html).toContain('data-create-workspace-phase="initial"');
    expect(html).not.toContain('data-create-shell-pipeline="true"');
    expect(html).not.toContain('data-create-shell-structure-rail="true"');
    expect(html).toContain('data-create-shell-thread="true"');
    expect(html).toContain('data-create-thread-phase="initial"');
    expect(html).toContain('data-create-composer-bar="true"');
    expect(html).toContain('data-create-shell-secondary-details="true"');
    expect(html).not.toContain('data-create-debattenstand-statusbar');
    expect(html).not.toContain("1 · Beitrag aufgenommen");
    expect(html).not.toContain("2 · Themen erkannt");
    expect(html).not.toContain("3 · Entscheidung offen");
    expect(html).not.toContain("4 · Quellen optional");
    expect(html).not.toContain("5 · Entwurf");
    expect(html).not.toContain("Deine Struktur");
    expect(html).not.toContain("Prioritäten");
    expect(html).not.toContain("Erkannte Schwerpunkte");
    expect(html).not.toContain("Themenäste");
    expect(html).not.toContain("Fragen");
    expect(html).not.toContain("Offene Fragen");
    expect((html.match(/data-mobile-structure-card/g) ?? []).length).toBe(0);
    expect(followupSource).toContain("data-mobile-structure-card className=\"flex items-start gap-4\"");
    expect(followupSource).toContain("data-structure-overview-grid");
    expect(followupSource).toContain("data-create-structure-rail");
    expect(followupSource).toContain("data-create-inline-structure-summary");
    expect(followupSource).toContain("data-create-embedded-followup");
    expect(composerSource).toContain("data-create-composer-bar");
    expect(composerSource).toContain("experienceVariant === \"workspace_shell\"");
    expect(composerSource).toContain("workspacePhase === \"continuation\"");
    expect(composerSource).toContain("resize-y");
    expect(composerSource).toContain('data-create-input-methods="shared-intake"');
    expect(clientSource).toContain("const workspaceShellPhase: CreateWorkspaceShellPhase = !hasStarted");
    expect(clientSource).toContain("workspacePhase={hasStarted ? \"continuation\" : \"initial\"}");
    expect(clientSource).toContain("data-create-shell-secondary-details");
    expect(clientSource).toContain("renderSidecar");
    expect(clientSource).toContain("renderMobileSidecarSummary");
    expect(clientSource).toContain("data-create-workspace-host=\"wide-screen\"");
    expect(clientSource).toContain("max-w-none");
    expect(clientSource).not.toContain("startLabel={productModeConfig.ctaLabel}");
    const workspaceShellSource = readFileSync(
      resolve(process.cwd(), "src/features/create/CreateWorkspaceShell.tsx"),
      "utf8",
    );
    expect(workspaceShellSource).toContain("data-create-workspace-size=\"wide-screen\"");
    expect(workspaceShellSource).toContain("data-create-workspace-phase={phase}");
    expect(workspaceShellSource).toContain("max-w-[min(92vw,96rem)]");
    expect(workspaceShellSource).toContain("min-h-[calc(100vh-7.5rem)]");
    expect(workspaceShellSource).not.toContain("data-create-shell-pipeline");
    expect(workspaceShellSource).toContain("data-create-thread-phase={phase}");
    expect(workspaceShellSource).toContain("data-create-shell-sidecar");
    expect(workspaceShellSource).toContain("data-create-debattenstand-sheet");
    expect(workspaceShellSource).toContain("md:min-h-[15rem]");
    expect(workspaceShellSource).not.toContain("md:min-h-[46rem]");
    expect(clientSource).not.toContain("min-h-[30rem]");
    expect(clientSource).not.toContain("md:min-h-[36rem]");
    expect(workspaceShellSource).toContain("overflow-y-auto");
    expect(workspaceShellSource).toContain("sticky bottom-0");
    expect(workspaceShellSource).not.toContain("max-w-[82.5rem]");
    expect(html).not.toContain("Geführter Ablauf");
    expect(html).not.toContain("Signalbild");
    expect(html).not.toContain("Gelesene Sinnabschnitte");
    expect(html).not.toContain("Lesemodus");
    expect(html).not.toContain("Du/eDebatte-Protokoll");
    expect(html).not.toContain("Visual Map");
    expect(html).not.toContain("Vorgeschlagener Arbeitsstand");
    expect(html).not.toContain("Test stadt");
    expect(html).not.toContain("Checkliste");
    expect(html).not.toContain("Kontingente und Zugriff");
    expect(html).not.toContain("Beitrag sortieren");
    expect(html).not.toContain("Kurzer Einstieg");
    expect(html).not.toContain("Beitrag einreichen");
    expect(html).not.toContain("Composer</p>");
    expect(html).not.toContain(">Beitragen<");
    expect(html).not.toContain(">Entwerfen<");
    expect(html).toMatch(/>Anliegen einordnen</);
    expect(html).not.toContain("Welche KI im aktuellen Schritt sichtbar arbeitet");
    expect(html).not.toContain("Developer-Hinweis");
    expect(html).not.toContain("Operator");
    expect(html).not.toContain("Provider");
    expect(clientSource).toContain('experienceVariant="workspace_shell"');
    expect(clientSource).not.toContain('experienceVariant="create_minimal"');
    expect(clientSource).toContain("showSceneRail={false}");
  });
});
