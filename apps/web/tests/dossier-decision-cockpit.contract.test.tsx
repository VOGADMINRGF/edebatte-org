import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { chatkontrolleDossier } from "@features/dossier/data/chatkontrolleDossier";
import DossierDecisionCockpit from "@/components/dossier/DossierDecisionCockpit";

describe("Dossier Decision Cockpit contract", () => {
  it("keeps voting fail-closed while exposing orientation and real participation paths", () => {
    render(<DossierDecisionCockpit dossier={chatkontrolleDossier} />);

    expect(screen.getByTestId("dossier-decision-cockpit")).toBeTruthy();
    expect(screen.getByText("In 30 Sekunden")).toBeTruthy();
    expect(screen.getByText("Abstimmung noch nicht freigegeben")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Quelle ergänzen" }).getAttribute("href")).toContain("intent=source");
    expect(screen.getByRole("link", { name: "Frage einreichen" }).getAttribute("href")).toContain("intent=question");
  });

  it("separates decision/research state from synthetic sentiment", () => {
    render(<DossierDecisionCockpit dossier={chatkontrolleDossier} />);

    expect(screen.getByTestId("dossier-decision-research-layer")).toBeTruthy();
    expect(screen.getByText("Was steht zur Entscheidung?")).toBeTruthy();
    expect(screen.getByText("Was wird gerade geprüft?")).toBeTruthy();
    expect(screen.getByText("Nicht aus Dossierinhalten abgeleitet")).toBeTruthy();
    expect(screen.getByText("Fehlende Perspektiven")).toBeTruthy();
    expect(screen.getByText("Konflikte")).toBeTruthy();
  });
});
