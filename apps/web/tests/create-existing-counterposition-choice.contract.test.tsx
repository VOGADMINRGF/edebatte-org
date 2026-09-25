// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import ExistingTopicMatchesPanel from "@/features/create/ExistingTopicMatchesPanel";
import {
  mapCreateExistingMatchDecisionToDraftTarget,
  normalizeCreateExistingMatchDecision,
} from "@/features/create/createExistingMatchDecision";
import type { ExistingTopicMatchPanelModel } from "@/features/create/existingTopicMatches";

const MODEL: ExistingTopicMatchPanelModel = {
  topicTitle: "Tempo 30 vor Schulen",
  introText: "Ein ähnliches Anliegen wurde gefunden.",
  matches: [
    {
      id: "counterposition-1",
      kind: "topic",
      title: "Tempo 50 auf Hauptstraßen beibehalten",
      summary:
        "Die bestehende Position spricht sich gegen eine allgemeine Absenkung aus.",
      strength: "strong",
      status: "suggested",
      reason: "Gleiches Thema, mögliche Gegenposition.",
      requiresReview: false,
    },
  ],
  suggestedDecision: "connect_to_existing",
  openQuestions: [],
  guardrailNote: "Keine automatische Zusammenführung.",
};

afterEach(cleanup);

describe("Create match with an explicit citizen stance", () => {
  it("offers exactly the four explicit choices and keeps opposition descriptive", () => {
    const onDecision = vi.fn();

    render(
      <ExistingTopicMatchesPanel
        model={MODEL}
        matchRelations={{ "counterposition-1": "opposing" }}
        matchDecisions={{ "counterposition-1": "count_as_opposition" }}
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

    expect(
      screen.getByRole("button", { name: "Widersprechen" }).getAttribute(
        "aria-pressed",
      ),
    ).toBe("true");
    expect(screen.getByRole("status").textContent).toContain(
      "nichts zusammengeführt",
    );

    fireEvent.click(screen.getByRole("button", { name: "Unterstützen" }));
    expect(onDecision).toHaveBeenCalledWith(
      "counterposition-1",
      "count_my_position",
    );
  });

  it("keeps missing and invalid choices null and maps only explicit choices", () => {
    expect(normalizeCreateExistingMatchDecision(undefined)).toBeNull();
    expect(normalizeCreateExistingMatchDecision("request_review")).toBeNull();
    expect(normalizeCreateExistingMatchDecision("opposing")).toBeNull();

    expect(mapCreateExistingMatchDecisionToDraftTarget("count_my_position")).toBe(
      "opinion_count",
    );
    expect(
      mapCreateExistingMatchDecisionToDraftTarget("count_as_opposition"),
    ).toBe("opinion_count");
    expect(mapCreateExistingMatchDecisionToDraftTarget("add_as_nuance")).toBe(
      "existing_branch_connection",
    );
    expect(mapCreateExistingMatchDecisionToDraftTarget("keep_separate")).toBe(
      "new_branch",
    );
  });
});
