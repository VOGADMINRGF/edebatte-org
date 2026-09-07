// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

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

describe("Create citizen region chip", () => {
  it("shows a profile location only as an editable suggestion in plain citizen language", () => {
    const definitions = getCreateSurfaceModeDefinitions("de");
    const citizenContext = resolveCreateCitizenIntakeContext({
      text: "Mehr sichere Schulwege wären wichtig.",
      profileRegion: "Berlin",
    });
    const html = renderToStaticMarkup(
      <SharedCreateComposer
        badge="Beitragen"
        subline="Ein Satz reicht."
        texts={getCreateComposerTexts("de")}
        modeOrder={["analyze", "media", "guided"]}
        modeDefinitions={definitions}
        activeMode="analyze"
        onModeChange={() => {}}
        helperText={definitions.analyze.helperText}
        inputId="create-primary-intake"
        inputValue="Mehr sichere Schulwege wären wichtig."
        inputPlaceholder="Was sollte sich ändern?"
        onInputChange={() => {}}
        onStart={() => {}}
        startLabel="Einordnen"
        secondaryAction={{ href: "/account", label: "" }}
        contextAnchors={getCreateContextAnchorDefinitions("de")}
        activeContextAnchorId={null}
        onContextAnchorSelect={() => {}}
        helperLinks={getCreateHelperLinks("de")}
        experienceVariant="workspace_shell"
        citizenContext={citizenContext}
      />,
    );

    expect(html).toContain("Berlin · aus Profil vorgeschlagen");
    expect(html).toContain('data-create-region-context="profile_suggestion"');
    expect(html).toContain("Region bearbeiten");
    expect(html).toContain("Vermutlich zuständig:");
    expect(html).toContain("Passt das?");
    expect(html).toContain("Ja, das passt");
    expect(html).toContain("data-create-jurisdiction-confirmation");
    expect(html).not.toContain("JurisdictionCandidate");
    expect(html).not.toContain("CommunitySignal");
    expect(html).not.toContain("Anlassraum");
  });

  it("forwards confirmation and edit actions without inventing another jurisdiction", () => {
    const definitions = getCreateSurfaceModeDefinitions("de");
    const citizenContext = resolveCreateCitizenIntakeContext({
      text: "Der Schulweg sollte sicherer werden.",
      profileRegion: "Wuppertal",
    });
    const onConfirm = vi.fn();
    const onEdit = vi.fn();
    render(
      <SharedCreateComposer
        badge="Beitragen"
        subline="Ein Satz reicht."
        texts={getCreateComposerTexts("de")}
        modeOrder={["analyze", "media", "guided"]}
        modeDefinitions={definitions}
        activeMode="analyze"
        onModeChange={() => {}}
        helperText={definitions.analyze.helperText}
        inputId="create-primary-intake-interaction"
        inputValue="Der Schulweg sollte sicherer werden."
        inputPlaceholder="Was sollte sich ändern?"
        onInputChange={() => {}}
        onStart={() => {}}
        startLabel="Einordnen"
        secondaryAction={{ href: "/account", label: "" }}
        contextAnchors={getCreateContextAnchorDefinitions("de")}
        activeContextAnchorId={null}
        onContextAnchorSelect={() => {}}
        helperLinks={getCreateHelperLinks("de")}
        experienceVariant="workspace_shell"
        citizenContext={citizenContext}
        onConfirmCitizenJurisdiction={onConfirm}
        onEditCitizenJurisdiction={onEdit}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ja, das passt" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith(expect.stringMatching(/^municipality:/));

    fireEvent.click(screen.getByRole("button", { name: "Im Beitrag präzisieren" }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(screen.getByRole("textbox"));
  });
});
