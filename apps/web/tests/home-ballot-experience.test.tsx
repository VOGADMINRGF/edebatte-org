// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HomeBallotExperience } from "@/features/home/HomeBallotExperience";

vi.mock("@/context/LocaleContext", () => ({
  useLocale: () => ({ locale: "de" }),
}));

describe("homepage ballot experience", () => {
  afterEach(() => vi.restoreAllMocks());

  it("shows the user's own position before offering deeper context and a creator CTA", async () => {
    const user = userEvent.setup();

    render(<HomeBallotExperience />);
    await user.click(screen.getByRole("button", { name: "Mehr Menschen erreichen" }));

    expect(screen.getByText(/Deine Position:/).textContent).toContain("Mehr Menschen erreichen");
    expect(screen.getByText(/Eine klassische Umfrage würde jetzt zählen/)).not.toBeNull();
    expect(screen.queryByText(/%/)).toBeNull();
    expect(screen.getByText("eigene Antwort", { exact: false })).not.toBeNull();
    expect(screen.getByText("Quelle / Erfahrung", { exact: false })).not.toBeNull();
    expect(
      screen.getByRole("link", { name: "Eigene Frage starten →" }).getAttribute("href"),
    ).toBe("/runden/new?gtm=1&source=homepage-ballot");
  });
});