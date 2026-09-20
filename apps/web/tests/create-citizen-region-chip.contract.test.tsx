// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import SharedCreateComposer from "@/features/create/SharedCreateComposer";
import { resolveCreateCitizenIntakeContext } from "@/features/create/createCitizenIntakeContext";
import {
  getCreateComposerTexts,
  getCreateContextAnchorDefinitions,
  getCreateHelperLinks,
  getCreateSurfaceModeDefinitions,
} from "@/features/create/createSurfaceConfig";

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

afterEach(cleanup);

function renderComposer(input: {
  citizenContext: ReturnType<typeof resolveCreateCitizenIntakeContext>;
  locale?: "de" | "en";
  confirmedJurisdictionKey?: string | null;
  onConfirm?: (candidateKey: string) => void;
  onEdit?: () => void;
  onEditJurisdiction?: () => void;
}) {
  const locale = input.locale ?? "de";
  const definitions = getCreateSurfaceModeDefinitions(locale);
  return render(
    <SharedCreateComposer
      badge="Beitragen"
      subline="Ein Satz reicht."
      texts={getCreateComposerTexts(locale)}
      modeOrder={["analyze", "media", "guided"]}
      modeDefinitions={definitions}
      activeMode="analyze"
      onModeChange={() => {}}
      helperText={definitions.analyze.helperText}
      inputId="create-primary-intake-c5"
      inputValue="Der Schulweg sollte sicherer werden."
      inputPlaceholder="Was sollte sich ändern?"
      onInputChange={() => {}}
      onStart={() => {}}
      startLabel="Einordnen"
      secondaryAction={{ href: "/account", label: "" }}
      contextAnchors={getCreateContextAnchorDefinitions(locale)}
      activeContextAnchorId={null}
      onContextAnchorSelect={() => {}}
      helperLinks={getCreateHelperLinks(locale)}
      experienceVariant="workspace_shell"
      locale={locale}
      citizenContext={input.citizenContext}
      confirmedJurisdictionKey={input.confirmedJurisdictionKey}
      onConfirmCitizenJurisdiction={input.onConfirm}
      onEditCitizenJurisdiction={input.onEditJurisdiction}
      onEditCitizenRegion={input.onEdit}
    />,
  );
}

describe("C5/C7 citizen region, jurisdiction and emergency UI", () => {
  it("keeps a profile location as an editable, non-confirmable suggestion", () => {
    const citizenContext = resolveCreateCitizenIntakeContext({
      text: "Der Schulweg sollte sicherer werden.",
      profileRegion: "Berlin",
    });
    const onEdit = vi.fn();
    const onConfirm = vi.fn();

    renderComposer({ citizenContext, onEdit, onConfirm });

    const button = screen.getByRole("button", {
      name: /Berlin · aus Profil vorgeschlagen.*Region bearbeiten/,
    });
    expect(button).toBeTruthy();
    expect(button.closest("[data-create-region-context]")?.getAttribute("data-create-region-context"))
      .toBe("profile_suggestion");

    fireEvent.click(button);
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(screen.getByRole("textbox"));

    expect(screen.getByText(/Vermutlich zuständig:/)).toBeTruthy();
    const confirm = screen.getByRole("button", { name: "Ja, das passt" });
    expect(confirm).toHaveProperty("disabled", true);
    fireEvent.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toContain("JurisdictionCandidate");
  });

  it("shows contribution-derived place as contribution evidence", () => {
    const citizenContext = resolveCreateCitizenIntakeContext({
      text: "In Wuppertal sollte der Schulweg sicherer werden.",
      directoryEntries: [{
        id: "de-nw-wuppertal",
        municipalityName: "Wuppertal, Stadt",
        state: "Nordrhein-Westfalen",
        country: "DE",
        registryId: "05124000",
      }],
      profileRegion: "Berlin",
    });

    renderComposer({ citizenContext });

    expect(screen.getByText("Wuppertal · aus deinem Text")).toBeTruthy();
    expect(
      screen.getByText("Wuppertal · aus deinem Text").closest("[data-create-region-context]")
        ?.getAttribute("data-create-region-context"),
    ).toBe("contribution_text");
  });

  it("confirms a contribution-derived jurisdiction explicitly and supports editing", () => {
    const citizenContext = resolveCreateCitizenIntakeContext({
      text: "In Wuppertal sollte der Schulweg sicherer werden.",
      directoryEntries: [{
        id: "de-nw-wuppertal",
        municipalityName: "Wuppertal, Stadt",
        state: "Nordrhein-Westfalen",
        country: "DE",
        registryId: "05124000",
        administrativeUnitType: "kreisfreie_stadt",
        administrativeSeat: "Wuppertal",
        authorityName: "Stadt Wuppertal",
      }],
    });
    const onConfirm = vi.fn();
    const onEditJurisdiction = vi.fn();

    renderComposer({
      citizenContext,
      onConfirm,
      onEditJurisdiction,
    });

    const confirm = screen.getByRole("button", { name: "Ja, das passt" });
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm.mock.calls[0]?.[0]).toMatch(/^municipality:/);

    fireEvent.click(
      screen.getByRole("button", { name: "Im Beitrag präzisieren" }),
    );
    expect(onEditJurisdiction).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(screen.getByRole("textbox"));
  });

  it("renders the C7 confirmation semantics fully localized in English", () => {
    const citizenContext = resolveCreateCitizenIntakeContext({
      text: "In Wuppertal the school route should be safer.",
      directoryEntries: [{
        id: "de-nw-wuppertal",
        municipalityName: "Wuppertal, Stadt",
        state: "North Rhine-Westphalia",
        country: "DE",
        registryId: "05124000",
      }],
      locale: "en",
    });

    renderComposer({
      citizenContext,
      locale: "en",
      onConfirm: vi.fn(),
      onEditJurisdiction: vi.fn(),
    });

    expect(screen.getByText(/Likely responsible:/)).toBeTruthy();
    expect(screen.getByText(/remains a proposal until you confirm it/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Yes, that fits" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Clarify in contribution" })).toBeTruthy();
  });

  it("renders a truthful localized emergency alert", () => {
    const citizenContext = resolveCreateCitizenIntakeContext({
      text: "There is a fire right now, call 112 immediately.",
      locale: "en",
    });

    renderComposer({ citizenContext, locale: "en" });

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("not an emergency channel");
    expect(alert.textContent).toContain("112");
  });
});
