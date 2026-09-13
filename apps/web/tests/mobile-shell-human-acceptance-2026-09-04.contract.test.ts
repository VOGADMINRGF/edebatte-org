import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("mobile Human-Acceptance 2026-09-04", () => {
  it("routes Start to the canonical homepage and opens the real Profile tab", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/components/mobile/MobileAppShellChrome.tsx"),
      "utf8",
    );

    expect(source).toContain('id: "start"');
    expect(source).toContain('href: "/"');
    expect(source).toContain('pathname === "/" || pathname === "/start"');
    expect(source).toContain('href: "/account#profil"');
    expect(source).toContain('[data-site-header="true"]');
    expect(source).toContain("display: none !important");
  });

  it("keeps swipe progress visible without adding a third fixed bottom layer", () => {
    const summarySource = readFileSync(
      resolve(process.cwd(), "src/features/surfaces/swipes/components/SwipesOutcomeSummary.tsx"),
      "utf8",
    );
    const headerSource = readFileSync(
      resolve(process.cwd(), "src/features/surfaces/swipes/components/SwipesHeaderProgress.tsx"),
      "utf8",
    );

    expect(summarySource).toContain('id="swipes-outcome-summary"');
    expect(summarySource).toContain("Dein Zwischenstand");
    expect(summarySource).not.toContain("fixed inset-x-3");
    expect(summarySource).not.toContain('className="vog-chip vog-chip--active">Weiter</a>');
    expect(headerSource).toContain("sticky top-0");
    expect(headerSource).toContain("eingeordnet");
    expect(headerSource).toContain("deckProgressLabel");
  });

  it("keeps the public Live overview citizen-readable instead of exposing PWA implementation copy", () => {
    const source = readFileSync(resolve(process.cwd(), "src/app/stream/page.tsx"), "utf8");

    expect(source).toContain("Live dabei sein oder selbst etwas einbringen");
    expect(source).toContain('href="/create"');
    expect(source).toContain("Live ansehen");
    expect(source).not.toContain("PwaRouteStatusHint");
    expect(source).not.toContain("PWA / MOBIL");
    expect(source).not.toContain("offline zwischensynchronisiert");
    expect(source).toContain("statusSections={false}");
    expect(source).toContain("showToolbar={false}");
  });

  it("keeps the account intro concise and removes duplicate mobile navigation chrome semantically", () => {
    const source = readFileSync(resolve(process.cwd(), "src/app/account/page.tsx"), "utf8");

    expect(source).toContain("Deine Interessen, Beiträge und Nachrichten an einem Ort.");
    expect(source).not.toContain("buildAgenticCivicE2EAccountHint");
    expect(source).not.toContain("buildPersonalAccountSegmentHint");
    expect(source).not.toContain("buildVoxyExperienceShellHint");
    expect(source).not.toContain("PRODUCTION_ENTRY_COPY.accountLead");
    expect(source).toContain("data-account-mobile-hub");
    expect(source).toContain('nav:has(a[href="/swipes"]):has(a[href="/create"])');
    expect(source).toContain('button[aria-label="Inbox öffnen"]');
    expect(source).not.toContain("nav.fixed.inset-x-0.bottom-0.z-30");
    expect(source).toContain('a[href="/account/security"]');
  });
});
