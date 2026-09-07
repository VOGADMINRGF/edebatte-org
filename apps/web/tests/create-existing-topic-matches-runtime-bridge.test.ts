import { describe, expect, it } from "vitest";

import {
  getExistingTopicMatchesRuntimeBlockers,
  inferExistingTopicMatchRelation,
  mapRuntimeEntityToExistingTopicMatch,
  resolveExistingTopicMatchesFromRuntime,
  type ExistingTopicMatchesRuntimeEntity,
} from "@/features/create/existingTopicMatchesRuntimeBridge";
import type { CreateIntelligentFollowupResult } from "@/features/create/intelligentFollowupContract";

function buildFollowup(params: {
  summary?: string;
  sourceText?: string;
} = {}): CreateIntelligentFollowupResult {
  return {
    understanding: {
      summary: params.summary ?? "Du möchtest sichere Schulwege im Quartier verbessern.",
      dossierContext: "Sichere Schulwege",
      categories: [{ id: "claim", label: "Aussage", confidence: "high" }],
      topics: [
        { id: "mobility", label: "Sichere Schulwege", confidence: "high" },
      ],
      statements: [
        {
          id: "statement-1",
          text: "Vor der Schule fehlen sichere Querungen und klare Tempokontrollen.",
          kind: "claim",
          stance: "pro",
          confidence: "high",
        },
      ],
      scopes: ["district"],
      openQuestion: "Welche Kreuzungen sind zuerst gemeint?",
      confidence: "high",
    },
    suggestions: [
      {
        id: "dossier:auto",
        kind: "dossier",
        title: "Sichere Schulwege",
        reason: "Das Thema passt zu einem bestehenden Arbeitsstand.",
        confidence: "high",
        href: "/dossier?topic=schulwege",
        requiresConfirmation: true,
      },
    ],
    sourceText:
      params.sourceText ??
      "https://beispiel.de Vor der Schule fehlen sichere Querungen und klare Tempokontrollen.",
    generatedAt: "2026-06-28T12:00:00.000Z",
  };
}

describe("create existing topic matches runtime bridge", () => {
  it("marks a same-topic counterposition as opposing without merging it", () => {
    expect(
      inferExistingTopicMatchRelation(
        "Vor Schulen sollte Tempo 30 gelten.",
        "Tempo 50 auf Hauptstraßen beibehalten",
      ),
    ).toBe("opposing");
  });

  it("maps every supported runtime entity kind onto the visible existing-topic-match contract", () => {
    const entities: ExistingTopicMatchesRuntimeEntity[] = [
      {
        source: "context",
        kind: "participation_space",
        id: "ar-1",
        title: "Beteiligungsraum Schulwege",
        summary: "Vorhandener Beteiligungsraum.",
        score: 0.9,
        requiresReview: true,
      },
      {
        source: "context",
        kind: "branch",
        id: "branch:ar-1",
        title: "Zweig Schulwege",
        summary: "Vorhandener Zweig.",
        score: 0.8,
        relatedTopicId: "sichere-schulwege",
        relatedBranchId: "ar-1",
        requiresReview: false,
      },
      {
        source: "context",
        kind: "dossier",
        id: "/dossier/sichere-schulwege",
        title: "Dossier Schulwege",
        summary: "Vorhandener Dossier-Kontext.",
        score: 0.78,
        relatedDossierId: "sichere-schulwege",
        requiresReview: true,
      },
      {
        source: "topics",
        kind: "topic",
        id: "/topic/sichere-schulwege",
        title: "Sichere Schulwege",
        summary: "Vorhandenes Thema.",
        score: 0.74,
        relatedTopicId: "sichere-schulwege",
        requiresReview: false,
      },
      {
        source: "topics",
        kind: "opinion_cluster",
        id: "opinion-cluster:sichere-schulwege",
        title: "Ähnliche Meinungen zu Sichere Schulwege",
        summary: "Nur vorsichtiger Cluster.",
        score: 0.71,
        countedOpinions: 4,
        requiresReview: false,
      },
      {
        source: "preview",
        kind: "source_question",
        id: "source-question-1",
        title: "Quellenfrage",
        summary: "Beleg fehlt noch.",
        score: 0.7,
        requiresReview: true,
      },
    ];

    const mapped = entities.map(mapRuntimeEntityToExistingTopicMatch);

    expect(mapped.map((match) => match.kind)).toEqual([
      "participation_space",
      "branch",
      "dossier",
      "topic",
      "opinion_cluster",
      "source_question",
    ]);
    expect(mapped[0]).toMatchObject({
      status: "needs_review",
      requiresReview: true,
      relatedParticipationSpaceId: "ar-1",
    });
    expect(mapped[1]).toMatchObject({
      status: "suggested",
      relatedBranchId: "ar-1",
      relatedTopicId: "sichere-schulwege",
    });
    expect(mapped[2]).toMatchObject({
      status: "needs_review",
      relatedDossierId: "sichere-schulwege",
    });
    expect(mapped[3]).toMatchObject({
      status: "suggested",
      relatedTopicId: "sichere-schulwege",
    });
    expect(mapped[4]).toMatchObject({
      countedOpinions: 4,
      status: "suggested",
    });
    expect(mapped[5]).toMatchObject({
      status: "needs_review",
      requiresReview: true,
    });
  });

  it("falls back to the preview model when the runtime routes are unavailable", async () => {
    const result = await resolveExistingTopicMatchesFromRuntime(
      { result: buildFollowup() },
      {
        fetchJson: async () => {
          throw new Error("route_unavailable");
        },
      },
    );

    expect(result.status).toBe("preview");
    expect(result.blockers).toEqual([
      "context_route_unavailable",
      "topics_route_unavailable",
    ]);
    expect(result.model.sourceKind).toBe("preview");
    expect(result.model.sourceLabel).toBe(
      "Preview auf Basis lokaler Beispieldaten",
    );
    expect(result.model.matches.some((match) => match.kind === "source_question")).toBe(
      true,
    );
  });

  it("builds a hybrid model from live sources and keeps source questions as preview-only review items", async () => {
    const result = await resolveExistingTopicMatchesFromRuntime(
      { result: buildFollowup() },
      {
        fetchJson: async (url) => {
          if (url.startsWith("/api/create/context")) {
            return {
              ok: true,
              items: [
                {
                  anlassraumId: "anlassraum-1",
                  title: "Sichere Schulwege in Mitte",
                  summary:
                    "Bestehender Arbeitsraum für sichere Querungen und Schulwegplanung.",
                  topicKey: "sichere-schulwege",
                  anlassraumType: "round",
                  anlassraumStatus: "active",
                  sourceMode: "runtime",
                  outputStatus: "published",
                  updatedAt: "2026-06-28T12:00:00.000Z",
                  relatedDossierHref: "/dossier/sichere-schulwege",
                  relatedDossierUpdateLabel:
                    "Dossier-Update zu sicheren Schulwegen",
                  relatedTopicPageHref: "/topic/sichere-schulwege",
                  relatedTopicPageTitle: "Sichere Schulwege",
                  relatedTopicPageVisibilityLabel: "öffentlich",
                },
              ],
            };
          }

          if (url.startsWith("/api/topics")) {
            return {
              topics: [
                {
                  id: "topic-1",
                  slug: "sichere-schulwege",
                  title: "Sichere Schulwege",
                  description: "Sichere Schulwege",
                  statements: [{ id: "s1" }, { id: "s2" }, { id: "s3" }],
                },
              ],
            };
          }

          throw new Error(`unexpected_url:${url}`);
        },
      },
    );

    expect(result.status).toBe("hybrid");
    expect(result.usedSources).toEqual(["/api/create/context", "/api/topics"]);
    expect(result.model.sourceKind).toBe("hybrid");
    expect(result.model.sourceLabel).toContain(
      "Gefundene Anschlüsse aus vorhandenen eDebatte-Strukturen",
    );
    expect(result.model.sourceLabel).toContain("Preview");
    expect(result.model.matches.map((match) => match.kind)).toEqual(
      expect.arrayContaining([
        "participation_space",
        "branch",
        "dossier",
        "topic",
        "opinion_cluster",
        "source_question",
      ]),
    );
    expect(
      result.model.matches.find((match) => match.kind === "topic")?.relatedTopicId,
    ).toBe("sichere-schulwege");
    expect(
      result.model.matches.find((match) => match.kind === "opinion_cluster")
        ?.countedOpinions,
    ).toBe(3);
  });

  it("reports an honest empty runtime state when no live match source returns a usable overlap", async () => {
    const result = await resolveExistingTopicMatchesFromRuntime(
      {
        result: buildFollowup({
          sourceText:
            "Vor der Schule fehlen sichere Querungen und klare Tempokontrollen.",
        }),
      },
      {
        fetchJson: async (url) => {
          if (url.startsWith("/api/create/context")) {
            return { ok: true, items: [] };
          }
          if (url.startsWith("/api/topics")) {
            return { topics: [] };
          }
          throw new Error(`unexpected_url:${url}`);
        },
      },
    );

    expect(result.status).toBe("runtime");
    expect(result.blockers).toEqual([]);
    expect(result.model.matches).toEqual([]);
    expect(result.model.sourceKind).toBe("runtime");
    expect(result.model.sourceLabel).toBe(
      "Gefundene Anschlüsse aus vorhandenen eDebatte-Strukturen",
    );
    expect(result.model.emptyStateText).toContain("kein belastbarer Anschluss");
  });

  it("flags missing followup summaries as a real runtime blocker", () => {
    const blockers = getExistingTopicMatchesRuntimeBlockers({
      result: buildFollowup({ summary: "   " }),
    });

    expect(blockers).toContain("missing_followup_summary");
  });
});
