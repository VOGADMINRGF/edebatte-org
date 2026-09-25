import { describe, expect, it } from "vitest";

import { buildMaterialGraphFirstContext } from "@/features/material/materialGraphFirstContext";
import type { MaterialExtractionJob } from "@/features/material/materialExtractionJobs";

function makeJob(overrides: Partial<MaterialExtractionJob> = {}): MaterialExtractionJob {
  return {
    id: "job-1",
    materialId: "material-1",
    materialLabel: "Mietendeckel und bezahlbares Wohnen",
    sourceType: "pdf",
    submittedBy: "user-1",
    organizationId: null,
    regionId: null,
    dossierId: null,
    anlassraumId: null,
    status: "needs_review",
    statusLabel: "In Prüfung",
    extractionMode: "text_extract",
    costGuard: "free",
    costGuardLabel: "Kostenfrei im vorhandenen Pfad",
    error: null,
    createdAt: "2026-08-28T10:00:00.000Z",
    updatedAt: "2026-08-28T10:00:00.000Z",
    reviewRequired: true,
    noAutoPublish: true,
    noAutoDeepSearch: true,
    noAutoOfficial: true,
    sourceHints: ["Wohnungspolitik"],
    claimDrafts: [{ text: "Mieten sollen stärker begrenzt werden.", reviewState: "draft" }],
    questionDrafts: [{ text: "Soll ein Mietendeckel eingeführt werden?", reviewState: "draft" }],
    optionDrafts: [
      { text: "Ja", reviewState: "draft" },
      { text: "Nein", reviewState: "draft" },
    ],
    evidenceHints: [],
    dossierHandoff: null,
    anlassraumHandoff: null,
    themenradarHandoff: null,
    aiOrchestration: {
      lane: "material_extraction",
      laneLabel: "Material-Extraktion",
      outputLabel: "Draft",
      reviewRequired: true,
      draftOnly: true,
      publicOutputAllowed: false,
      costApprovalRequired: false,
      researchAllowed: false,
    },
    nextSuggestedAction: {
      label: "Prüfen",
      description: "Review",
      href: "/admin/review",
    },
    ...overrides,
  };
}

describe("buildMaterialGraphFirstContext", () => {
  it("prefers reuse when a strong existing topic with rounds is found", () => {
    const result = buildMaterialGraphFirstContext({
      job: makeJob(),
      topics: [
        {
          id: "topic-1",
          slug: "mietendeckel",
          title: "Mietendeckel und bezahlbares Wohnen",
          description: "Debatte zu Mietendeckel und Mieten",
          statements: [{ id: "round-1" }, { id: "round-2" }],
        },
      ],
    });

    expect(result.matchedTopicIds).toContain("mietendeckel");
    expect(result.matchedRoundIds).toEqual(expect.arrayContaining(["round-1", "round-2"]));
    expect(result.recommendedAction).toBe("reuse");
    expect(result.noAutoGraphWrite).toBe(true);
    expect(result.noAutoMerge).toBe(true);
  });

  it("recommends create_new when no meaningful existing context is found", () => {
    const result = buildMaterialGraphFirstContext({
      job: makeJob({ materialLabel: "Neues unbekanntes Spezialthema" }),
      topics: [
        {
          id: "topic-2",
          slug: "sport",
          title: "Sportförderung",
          description: "Vereine und Sportstätten",
          statements: [],
        },
      ],
      contextItems: [],
    });

    expect(result.matchedTopicIds).toHaveLength(0);
    expect(result.recommendedAction).toBe("create_new");
    expect(result.coverageSummary).toContain("noch kein ausreichend ähnliches");
  });
});
