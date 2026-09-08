import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  callOpenAIJson: vi.fn(),
}));

vi.mock("@features/ai", () => ({
  callOpenAIJson: (...args: unknown[]) => mocks.callOpenAIJson(...args),
}));
vi.mock("@features/ai/providers/anthropic", () => ({
  callAnthropic: vi.fn(),
}));
vi.mock("@features/ai/providers/mistral", () => ({
  callMistral: vi.fn(),
}));
vi.mock("@core/telemetry/aiUsage", () => ({
  logAiUsage: vi.fn(),
}));

import CreateVisualFollowup from "@/features/create/CreateVisualFollowup";
import { buildCreateIntelligentFollowup } from "@/features/create/intelligentFollowup";

const REGRESSION_TEXT =
  "ich bin für mindestlohn bei behindertenwerkstätten, für mehr integration innerhalb der wirtschaft aber auch für stärkere kontrollen der vorstände der jeweiligen akteure";

const EXPECTED_ASPECTS = [
  "Faire Entlohnung / Mindestlohn",
  "Integration in den allgemeinen Arbeitsmarkt",
  "Kontrolle / Governance der Träger bzw. Vorstände",
];

const ACTIONS = {
  onConfirm: () => {},
  onEdit: () => {},
  onPrepareSubmission: () => {},
  onPrepareAnlassraum: () => {},
  onOpenDossierAppend: () => {},
  onOpenDossierCreate: () => {},
  onPrepareVote: () => {},
  onRequestEditorialReview: () => {},
  onStartOptionalService: () => {},
  onSaveOnly: () => {},
  continuationValue: "",
  onContinuationChange: () => {},
  onContinueConversation: () => {},
};

describe("create planner responsive regression output", () => {
  const originalOpenAiKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = "test-openai-key";
    mocks.callOpenAIJson.mockResolvedValue({
      text: JSON.stringify({
        plannerTopic: "Mindestlohn und Integration für Menschen mit Behinderungen",
        plannerCore:
          "Faire Entlohnung, wirtschaftliche Teilhabe und verantwortliche Kontrolle gehören zu einem gemeinsamen Anliegen.",
        plannerScope: ["federal"],
        plannerStance: "open",
        plannerClusters: [
          "Mindestlohn in Behindertenwerkstätten",
          "Integration von Menschen mit Behinderungen in die Wirtschaft",
          "Stärkere Kontrollen der Vorstände der jeweiligen Akteure",
        ],
        plannerOpenQuestions: [],
        topicCandidates: ["Mindestlohn", "Integration", "Kontrolle"],
      }),
      model: "gpt-4.1-mini-2025-04-14",
      formatUsed: "json_schema",
      didFallback: false,
    });
  });

  afterEach(() => {
    if (originalOpenAiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalOpenAiKey;
  });

  it.each([
    ["desktop", 1_440, 900],
    ["mobile", 390, 844],
  ])("renders the canonical citizen-first result on %s", async (_device, width, height) => {
    const result = await buildCreateIntelligentFollowup({
      text: REGRESSION_TEXT,
      locale: "de",
    });
    const html = renderToStaticMarkup(
      <div data-test-viewport={`${width}x${height}`} style={{ width }}>
        <CreateVisualFollowup result={result} {...ACTIONS} />
      </div>,
    );

    expect(html).toContain(`data-test-viewport="${width}x${height}"`);
    expect(html).toContain("Ich sehe einen gemeinsamen Kern.");
    expect(html).toContain(
      "Arbeitsbedingungen und Teilhabe in Behindertenwerkstätten",
    );
    for (const aspect of EXPECTED_ASPECTS) {
      expect(html).toContain(aspect);
    }
    expect(html).toContain("Haltung: eher dafür");
    expect(html).toContain("1 Thema sichtbar");
    expect(html).toContain("Erkanntes Anliegen");
    expect(html).not.toContain("5 Themen");
    expect(html).not.toMatch(/\[object Object\]|&quot;undefined&quot;|&quot;null&quot;/);
    expect(mocks.callOpenAIJson).toHaveBeenCalledTimes(1);
  });
});
