// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import ExistingTopicMatchesPanel from "@/features/create/ExistingTopicMatchesPanel";
import { resolveCitizenMatchDecisionDraftTarget } from "@/features/create/CreateVisualFollowup";
import type { ExistingTopicMatchPanelModel } from "@/features/create/existingTopicMatches";

const MODEL: ExistingTopicMatchPanelModel = {
  topicTitle: "Tempo 30 vor Schulen",
  introText: "Ein ähnliches Anliegen wurde gefunden.",
  matches: [
    {
      id: "counterposition-1",
      kind: "topic",
      title: "Tempo 50 auf Hauptstraßen beibehalten",
      summary: "Die bestehende Position spricht sich gegen eine allgemeine Absenkung aus.",
      strength: "strong",
      status: "suggested",
      reason: "Gleiches Thema, entgegengesetzte gewünschte Veränderung.",
      relation: "opposing",
      requiresReview: false,
    },
  ],
  suggestedDecision: "connect_to_existing",
  openQuestions: [],
  guardrailNote: "Keine automatische Zusammenführung.",
};

afterEach(cleanup);

describe("Create match with a counterposition", () => {
  it("offers support, opposition, nuance and separate continuation without merging", () => {
    const onDecision = vi.fn();
    render(
      <ExistingTopicMatchesPanel
        model={MODEL}
        onMatchDecision={onDecision}
        onStartNewBranch={() => {}}
      />,
    );

    expect(screen.getByText("Mögliche Gegenposition")).toBeTruthy();
    for (const label of [
      "Unterstützen",
      "Widersprechen",
      "Ergänzen / Nuance",
      "Separat weiterführen",
    ]) {
      expect(screen.getByRole("button", { name: label })).toBeTruthy();
    }

    fireEvent.click(screen.getByRole("button", { name: "Widersprechen" }));
    expect(onDecision).toHaveBeenCalledWith("counterposition-1", "count_as_opposition");
    expect(screen.getByRole("status").textContent).toContain("nichts zusammengeführt");
  });

  it("maps every explicit choice onto the production handoff target", () => {
    const match = MODEL.matches[0]!;
    expect(resolveCitizenMatchDecisionDraftTarget(match, "count_my_position")).toBe(
      "opinion_count",
    );
    expect(resolveCitizenMatchDecisionDraftTarget(match, "count_as_opposition")).toBe(
      "opinion_count",
    );
    expect(resolveCitizenMatchDecisionDraftTarget(match, "add_as_nuance")).toBe(
      "existing_branch_connection",
    );
    expect(resolveCitizenMatchDecisionDraftTarget(match, "keep_separate")).toBe(
      "new_branch",
    );
  });
});
