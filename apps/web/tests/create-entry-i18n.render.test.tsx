import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
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

describe("create entry i18n render", () => {
  it("renders the EN entry surface with localized mode + helper labels", () => {
    const modeDefinitions = getCreateSurfaceModeDefinitions("en");
    const html = renderToStaticMarkup(
      <SharedCreateComposer
        badge="Canonical entry"
        subline="Share your statement in one field."
        texts={getCreateComposerTexts("en")}
        modeOrder={["analyze", "media", "guided"]}
        modeDefinitions={modeDefinitions}
        activeMode="analyze"
        onModeChange={() => {}}
        helperText={modeDefinitions.analyze.helperText}
        inputId="entry"
        inputValue=""
        inputPlaceholder={modeDefinitions.analyze.placeholder}
        onInputChange={() => {}}
        onStart={() => {}}
        startLabel={modeDefinitions.analyze.ctaLabel}
        secondaryAction={{ href: "/runden", label: "Open rounds" }}
        contextAnchors={getCreateContextAnchorDefinitions("en")}
        activeContextAnchorId={null}
        onContextAnchorSelect={() => {}}
        helperLinks={getCreateHelperLinks("en")}
      />, 
    );

    expect(html).toContain("Contribute");
    expect(html).toContain("Review");
    expect(html).toContain("Draft together");
    expect(html).toContain("Mode selection");
    expect(html).toContain("Attach");
  });

  it("renders busy start state with disabled button label", () => {
    const modeDefinitions = getCreateSurfaceModeDefinitions("en");
    const html = renderToStaticMarkup(
      <SharedCreateComposer
        badge="Canonical entry"
        subline="Share your statement in one field."
        texts={getCreateComposerTexts("en")}
        modeOrder={["analyze", "media", "guided"]}
        modeDefinitions={modeDefinitions}
        activeMode="analyze"
        onModeChange={() => {}}
        helperText={modeDefinitions.analyze.helperText}
        inputId="entry"
        inputValue="Road safety around schools"
        inputPlaceholder={modeDefinitions.analyze.placeholder}
        onInputChange={() => {}}
        onStart={() => {}}
        startLabel={modeDefinitions.analyze.ctaLabel}
        startBusy
        startBusyLabel="Classifying …"
        secondaryAction={{ href: "/runden", label: "Open rounds" }}
        contextAnchors={getCreateContextAnchorDefinitions("en")}
        activeContextAnchorId={null}
        onContextAnchorSelect={() => {}}
        helperLinks={getCreateHelperLinks("en")}
      />,
    );

    expect(html).toContain("Classifying …");
    expect(html).toContain("disabled=\"\"");
    expect(html).toContain("aria-busy=\"true\"");
  });

  it("renders the emergency notice in the active English UI language", () => {
    const modeDefinitions = getCreateSurfaceModeDefinitions("en");
    const citizenContext = resolveCreateCitizenIntakeContext({
      text: "There is a fire right now, call 112 immediately.",
      locale: "en",
    });
    const html = renderToStaticMarkup(
      <SharedCreateComposer
        badge="Canonical entry"
        subline="Share your statement in one field."
        texts={getCreateComposerTexts("en")}
        modeOrder={["analyze", "media", "guided"]}
        modeDefinitions={modeDefinitions}
        activeMode="analyze"
        onModeChange={() => {}}
        helperText={modeDefinitions.analyze.helperText}
        inputId="emergency-entry"
        inputValue="There is a fire right now, call 112 immediately."
        inputPlaceholder={modeDefinitions.analyze.placeholder}
        onInputChange={() => {}}
        onStart={() => {}}
        startLabel={modeDefinitions.analyze.ctaLabel}
        secondaryAction={{ href: "/runden", label: "Open rounds" }}
        contextAnchors={getCreateContextAnchorDefinitions("en")}
        activeContextAnchorId={null}
        onContextAnchorSelect={() => {}}
        helperLinks={getCreateHelperLinks("en")}
        citizenContext={citizenContext}
        locale="en"
        experienceVariant="workspace_shell"
      />,
    );

    expect(html).toContain("eDebatte is not the right emergency channel");
    expect(html).toContain("Call 112");
    expect(html).not.toContain("Bei akuter Gefahr");
  });
});
