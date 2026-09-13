import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  analyzeContribution: vi.fn(),
}));

vi.mock("@features/analyze/analyzeContribution", () => ({
  analyzeContribution: (...args: unknown[]) => mocks.analyzeContribution(...args),
}));

import { buildCreateIntelligentFollowup } from "@/features/create/intelligentFollowup";
import { buildCreateHandoffDraft } from "@/features/create/createHandoff";

const TIERWOHL_TEXT =
  "Ich bin für besseren Tierschutz und Tierhaltung. Das sollte Europa und weltweit einheitlich umgesetzt werden, mindestens in den Ländern, aus denen wir importieren oder in die wir exportieren. Das sollte für Fleisch, Geflügel und Fisch gelten. Es geht um Tierwohl, Agrar, Bio-Label und Haltungsstufen.";

describe("create handoff draft contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = "";
    mocks.analyzeContribution.mockRejectedValue(new Error("provider_failed"));
  });

  it("builds a reviewable handoff draft from create follow-up state", async () => {
    const followup = await buildCreateIntelligentFollowup({
      text: TIERWOHL_TEXT,
      locale: "de",
      intent: "contribute",
    });
    if (!followup.meta?.planner) throw new Error("missing_planner_fixture");
    followup.understanding.statements = [
      {
        id: "statement-1",
        text: "Einheitliche Tierwohlstandards sollen geprüft werden.",
        kind: "claim",
        stance: "open",
        confidence: "high",
      },
    ];
    followup.understanding.openQuestion =
      "Welche Regeln sollten für Tierwohlstandards gelten?";
    followup.meta.planner.plannerTopic = "Tierwohlstandards";
    followup.meta.planner.shortSummary =
      "Einheitliche Standards werden als Review-Entwurf vorbereitet.";
    followup.meta.planner.plannerOpenQuestions = [
      "Welche Regeln sollten für Tierwohlstandards gelten?",
    ];
    followup.meta.planner.openQuestions = [];
    const draft = buildCreateHandoffDraft({
      result: followup,
      selectedAction: "create_dossier",
      id: "handoff-1",
      createdAt: "2026-05-10T10:00:00.000Z",
    });

    expect(draft.id).toBe("handoff-1");
    expect(draft.source).toBe("create");
    expect(draft.sourceText).toContain("Tierschutz");
    expect(draft.plannerResult.plannerTopic).toBe("Tierwohlstandards");
    expect(draft.graphMatches.stage).toBe("after_structure");
    expect(draft.claims.length).toBeGreaterThan(0);
    expect(draft.arguments.length).toBeGreaterThan(0);
    expect(draft.openQuestions.length).toBeGreaterThan(0);
    expect(draft.openQuestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          generalization: expect.objectContaining({
            originalInput: TIERWOHL_TEXT,
            releaseState: "review_required",
            outcome: "actor_extraction_review_required",
          }),
        }),
      ]),
    );
    expect(draft.topicSeed).toEqual({
      topicKey: "tierwohlstandards",
      topicLabel: "Tierwohlstandards",
      jurisdiction: "mixed",
      themenradarSourceType: "create_intake",
    });
    expect(draft.resumeHref).toBe("/create?resume=create_handoff&handoffId=handoff-1");
    expect(draft.requiresConfirmation).toBe(true);
    expect(draft.createdAt).toBe("2026-05-10T10:00:00.000Z");
  });

  it("keeps link and material provenance inside handoff source grounding", async () => {
    const followup = await buildCreateIntelligentFollowup({
      text: `${TIERWOHL_TEXT} https://example.org/tierwohl-standard`,
      locale: "de",
      intent: "contribute",
    });
    const draft = buildCreateHandoffDraft({
      result: followup,
      selectedAction: "request_factcheck",
      id: "handoff-2",
      sourceUrls: ["https://example.org/tierwohl-standard"],
      materialItems: [
        {
          id: "mat-1",
          kind: "pdf_document",
          label: "tierwohl-bericht.pdf",
          url: null,
          uploadId: null,
          mimeType: "application/pdf",
          fileName: "tierwohl-bericht.pdf",
          text: null,
          pageRef: null,
          timestampRef: null,
          extractedBy: null,
          extractionStatus: "none",
        },
      ],
    });

    expect(draft.sourceGrounding).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: "link_reference",
          detail: "https://example.org/tierwohl-standard",
        }),
        expect.objectContaining({
          status: "link_reference",
          label: "tierwohl-bericht.pdf",
        }),
      ]),
    );
  });
});
