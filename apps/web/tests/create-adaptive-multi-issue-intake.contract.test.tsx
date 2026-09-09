import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  callOpenAIJson: vi.fn(),
}));

vi.mock("@features/ai", () => ({
  callOpenAIJson: (...args: unknown[]) => mocks.callOpenAIJson(...args),
}));
vi.mock("@features/ai/providers/anthropic", () => ({ callAnthropic: vi.fn() }));
vi.mock("@features/ai/providers/mistral", () => ({ callMistral: vi.fn() }));
vi.mock("@core/telemetry/aiUsage", () => ({ logAiUsage: vi.fn() }));

import CreateVisualFollowup from "@/features/create/CreateVisualFollowup";
import { buildCreateIntelligentFollowup } from "@/features/create/intelligentFollowup";

const SHORT_TEXT =
  "Ich bin für Mindestlohn für behinderte Menschen in Behindertenwerkstätten, aber ich bin auch für stärkere Kontrollen/Transparenz der Vorstände.";

export const LONG_COMMUNAL_PROGRAM = `Kommunales Programm für unsere Gemeinde:
1. Mobilität und Verkehr: Busverbindungen ausbauen und sichere Radwege schaffen.
2. Wohnen: Bezahlbaren Wohnraum sichern und Leerstand begrenzen.
3. Klima und Energie: Kommunale Gebäude sanieren und erneuerbare Energie nutzen.
4. Bildung: Schulen modernisieren und Ganztagsangebote stärken.
5. Gesundheit und Pflege: Lokale Versorgung und Pflegeberatung verbessern.
6. Digitale Verwaltung: Anträge verständlich und barrierefrei online anbieten.
7. Sicherheit: Beleuchtung, Prävention und erreichbare Ansprechstellen verbessern.
8. Kultur: Bibliotheken, Vereine und freie Kultur verlässlich fördern.
9. Kommunale Finanzen: Investitionen transparent priorisieren.
10. Wirtschaft: Lokale Betriebe und Ausbildung unterstützen.
11. Soziales: Beratungsangebote gegen Armut und Einsamkeit ausbauen.
12. Integration: Teilhabe und Sprachförderung stärken.
13. Stadtentwicklung: Öffentliche Räume inklusiv und klimaangepasst gestalten.
14. Bürgerbeteiligung: Entscheidungen früh erklären und Beteiligung ermöglichen.`;

function providerPayload() {
  return {
    plannerTopic: "Kommunale Entwicklung",
    plannerCore: "Das kommunale Programm bündelt konkrete Vorschläge für die Gemeinde.",
    plannerScope: ["state"],
    plannerStance: "reform_oriented",
    plannerClusters: ["Planung", "Umsetzung", "Priorisierung"],
    plannerOpenQuestions: [],
    shortSummary: "Ein kommunales Vorschlagspaket soll gemeinsam strukturiert werden.",
    topicCandidates: ["Kommunale Entwicklung"],
    clusterCandidates: ["Planung", "Umsetzung", "Priorisierung"],
    scopeCandidates: ["state"],
    stance: "reform_oriented",
    openQuestions: [],
    graphSearchTerms: ["kommunales Programm"],
    materialSignals: [],
    recommendedLane: "create_fast_followup",
  };
}

const actions = {
  onConfirm: () => {},
  onEdit: () => {},
  onPrepareSubmission: () => {},
  onPrepareAnlassraum: () => {},
  onOpenDossierAppend: () => {},
  onOpenDossierCreate: () => {},
  onPrepareVote: () => {},
  onSaveOnly: () => {},
  continuationValue: "",
  onContinuationChange: () => {},
  onContinueConversation: () => {},
};

describe("create adaptive single-/multi-issue intake", () => {
  const originalKey = process.env.OPENAI_API_KEY;
  const originalModel = process.env.OPENAI_PLANNER_MODEL;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = "test-key";
    process.env.OPENAI_PLANNER_MODEL = "gpt-4.1-mini";
    mocks.callOpenAIJson.mockResolvedValue({
      text: JSON.stringify(providerPayload()),
      model: "gpt-4.1-mini",
      formatUsed: "json_schema",
      didFallback: false,
    });
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
    if (originalModel === undefined) delete process.env.OPENAI_PLANNER_MODEL;
    else process.env.OPENAI_PLANNER_MODEL = originalModel;
  });

  it("keeps the short workshop input as one evidence-scoped concern", async () => {
    const result = await buildCreateIntelligentFollowup({ text: SHORT_TEXT, locale: "de" });
    const planner = result.meta?.planner;

    expect(planner?.issueMode).toBe("single_issue");
    expect(planner?.timingLane).toBe("fast");
    expect(planner?.plannerScope).toEqual(["unclear"]);
    expect(planner?.scopeCandidates).toEqual(["unclear"]);
    expect(planner?.topicCandidates).toEqual([
      "Mindestlohn und Kontrolle in Behindertenwerkstätten",
    ]);
    expect(planner?.plannerClusters).toEqual([
      "Faire Entlohnung / Mindestlohn",
      "Kontrolle / Governance der Träger bzw. Vorstände",
    ]);
    expect(result.understanding.topics).toHaveLength(1);
    expect(mocks.callOpenAIJson).toHaveBeenCalledWith(
      expect.objectContaining({ timeoutMs: 6_500, max_tokens: 400 }),
    );
  });

  it("preserves all 14 explicit blocks and renders a compact package decision", async () => {
    const result = await buildCreateIntelligentFollowup({
      text: LONG_COMMUNAL_PROGRAM,
      locale: "de",
    });
    const planner = result.meta?.planner;
    const html = renderToStaticMarkup(
      <CreateVisualFollowup result={result} compactBranchLimit={4} {...actions} />,
    );

    expect(planner?.issueMode).toBe("multi_issue");
    expect(planner?.timingLane).toBe("standard");
    expect(planner?.recommendedLane).toBe("standard");
    expect(planner?.topicCandidates).toHaveLength(14);
    expect(planner?.topicCandidates.slice(0, 5)).toEqual([
      "Mobilität und Verkehr",
      "Wohnen",
      "Klima und Energie",
      "Bildung",
      "Gesundheit und Pflege",
    ]);
    expect(planner?.plannerScope).toEqual(["local", "municipal"]);
    expect(planner?.plannerScope).not.toContain("state");
    expect(result.understanding.topics).toHaveLength(14);
    expect(mocks.callOpenAIJson).toHaveBeenCalledWith(
      expect.objectContaining({ timeoutMs: 10_000, max_tokens: 1_200 }),
    );
    expect(html).toContain("Das ist kein einzelnes Anliegen, sondern ein Vorschlagspaket.");
    expect(html).toContain("Ich erkenne 14 Themenbereiche.");
    expect(html).toContain("Als Gesamtkonzept weiterarbeiten");
    expect(html).toContain("Ein Thema auswählen");
    expect(html).toContain("Struktur ändern");
    expect(html).toContain("10 weitere Themen");
    expect(html).toContain("Noch nicht veröffentlicht");
  });
});
