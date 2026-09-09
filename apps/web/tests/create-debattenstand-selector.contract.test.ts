import { describe, expect, it } from "vitest";
import { deriveCreateDebattenstandModel } from "@/features/create/createDebattenstandSelector";

describe("create debattenstand selector contract", () => {
  it("derives a compact four-topic preview without losing the full topic count", () => {
    const model = deriveCreateDebattenstandModel({
      hasStarted: true,
      isStarting: false,
      understandingConfirmed: false,
      workspaceActionMode: "default",
      analysisState: "result_ready",
      sourceKind: "text",
      hasSourceMaterial: false,
      requestedSourceReview: false,
      allTopicLabels: [
        "ÖPNV und Mobilität",
        "Straßenraum und Radverkehr",
        "Parkraum und kommunale Planung",
        "Pendler- und Anschlussmobilität",
        "Lieferverkehr und Schulwege",
      ],
      visibleTopicLabels: [
        "ÖPNV und Mobilität",
        "Straßenraum und Radverkehr",
        "Parkraum und kommunale Planung",
        "Pendler- und Anschlussmobilität",
      ],
      compactTopicCount: 4,
    });

    expect(model.totalTopicCount).toBe(5);
    expect(model.visibleTopicCount).toBe(4);
    expect(model.hiddenTopicCount).toBe(1);
    expect(model.topicActionLabel).toBe("Alle 5 Themen anzeigen");
    expect(model.topicPreviewLabel).toBe("4 von 5 Themen sind sichtbar.");
    expect(model.nextStepLabel).toBe("Themenstruktur bestätigen");
  });

  it("keeps failed automatic analysis honest, calm and recoverable without inventing topics", () => {
    const model = deriveCreateDebattenstandModel({
      hasStarted: true,
      isStarting: false,
      understandingConfirmed: false,
      workspaceActionMode: "default",
      analysisState: "ai_failed",
      sourceKind: "link",
      hasSourceMaterial: true,
      requestedSourceReview: false,
      allTopicLabels: [],
      visibleTopicLabels: [],
      compactTopicCount: 4,
    });

    expect(model.analysisStatusLabel).toBe("Einordnung noch offen");
    expect(model.errorLabel).toBeNull();
    expect(model.topicSummaryLabel).toBe("Themen werden noch eingeordnet");
    expect(model.nextStepLabel).toBe("Erneut einordnen oder später fortsetzen");
    expect(model.visibleTopics).toHaveLength(0);
    expect(model.statusTone).toBe("warning");
  });
});
