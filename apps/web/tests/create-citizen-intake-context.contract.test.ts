import { describe, expect, it } from "vitest";

import {
  applyCreateJurisdictionConfirmation,
  buildCreateJurisdictionCandidateKey,
  resolveCreateCitizenIntakeContext,
  type CreateRegionDirectoryEntry,
} from "@/features/create/createCitizenIntakeContext";

const DIRECTORY: CreateRegionDirectoryEntry[] = [
  {
    id: "de-be-berlin",
    municipalityName: "Berlin, Stadt",
    state: "Berlin",
    country: "DE",
    registryId: "11000000",
  },
  {
    id: "de-nw-wuppertal",
    municipalityName: "Wuppertal, Stadt",
    state: "Nordrhein-Westfalen",
    country: "DE",
    registryId: "05124000",
  },
  {
    id: "de-rp-neustadt",
    municipalityName: "Neustadt, Stadt",
    state: "Rheinland-Pfalz",
    country: "DE",
    registryId: "07316000",
  },
  {
    id: "de-he-neustadt",
    municipalityName: "Neustadt, Stadt",
    state: "Hessen",
    country: "DE",
    registryId: "06534016",
  },
];

describe("citizen-first Create intake context", () => {
  it("uses Wuppertal from the contribution before a Berlin profile suggestion", () => {
    const result = resolveCreateCitizenIntakeContext({
      text: "In Wuppertal sollte vor der Grundschule Tempo 30 gelten.",
      directoryEntries: DIRECTORY,
      profileRegion: "Berlin",
    });

    expect(result.regionStatus).toBe("resolved");
    expect(result.regionSource).toBe("contribution_text");
    expect(result.selectedRegionLabel).toBe("Wuppertal");
    expect(result.regionChipLabel).toBe("Wuppertal · aus deinem Text");
    expect(result.regionHierarchy).toEqual(["Wuppertal", "Nordrhein-Westfalen", "DE"]);
    expect(result.jurisdictionCandidates[0]).toMatchObject({
      level: "municipality",
      needsReview: true,
    });
  });

  it("does not force a profile region onto a nationwide concern", () => {
    const result = resolveCreateCitizenIntakeContext({
      text: "Bundesweit sollte das Wahlalter bei 16 Jahren liegen.",
      directoryEntries: DIRECTORY,
      profileRegion: "Berlin",
    });

    expect(result.regionStatus).toBe("not_location_bound");
    expect(result.regionSource).toBe("none");
    expect(result.regionChipLabel).toBeNull();
    expect(result.clarificationQuestion).toBeNull();
    expect(result.jurisdictionCandidates[0]?.level).toBe("federal");
  });

  it("keeps an EU concern at EU level without a municipal question", () => {
    const result = resolveCreateCitizenIntakeContext({
      text: "Auf EU-Ebene sollte die Kennzeichnungspflicht vereinheitlicht werden.",
      directoryEntries: DIRECTORY,
      profileRegion: "Berlin",
    });

    expect(result.regionStatus).toBe("not_location_bound");
    expect(result.clarificationQuestion).toBeNull();
    expect(result.jurisdictionCandidates[0]?.level).toBe("eu");
  });

  it("asks only for the municipality when school and street are clear but the place is missing", () => {
    const result = resolveCreateCitizenIntakeContext({
      text: "Tempo 30 sollte vor Schule X in Straße Y gelten.",
      directoryEntries: DIRECTORY,
    });

    expect(result.regionStatus).toBe("needs_clarification");
    expect(result.detectedStreetName).toBe("Straße Y");
    expect(result.clarificationQuestion).toBe("In welcher Stadt oder Gemeinde liegt Straße Y?");
    expect(result.jurisdictionCandidates[0]?.level).toBe("unknown");
  });

  it("preserves Berlin and Wuppertal as separate places instead of selecting one", () => {
    const result = resolveCreateCitizenIntakeContext({
      text: "Berlin und Wuppertal sollten beim Nahverkehr verglichen werden.",
      directoryEntries: DIRECTORY,
      profileRegion: "Berlin",
    });

    expect(result.regionStatus).toBe("needs_clarification");
    expect(result.regionSource).toBe("contribution_text");
    expect(result.selectedRegionLabel).toBeNull();
    expect(result.detectedRegionLabels).toEqual(["Berlin", "Wuppertal"]);
    expect(result.placeResolution.warnings).toContain(
      "Mehrere Orte erkannt; keine stille Reduktion auf einen Ort.",
    );
    expect(result.clarificationQuestion).toMatch(/ausdrücklich um den Vergleich/);
  });

  it("asks the smallest useful question for an ambiguous place name", () => {
    const result = resolveCreateCitizenIntakeContext({
      text: "In Neustadt sollte der Bahnhof barrierefrei werden.",
      directoryEntries: DIRECTORY,
    });

    expect(result.regionStatus).toBe("needs_clarification");
    expect(result.regionChipLabel).toBe("Neustadt · Ort klären");
    expect(result.clarificationQuestion).toBe("Welchen Ort mit dem Namen Neustadt meinst du?");
    expect(result.placeResolution.candidates).toHaveLength(2);
  });

  it("keeps PII-sensitive private input in the existing safety review contract", () => {
    const result = resolveCreateCitizenIntakeContext({
      text: "Mein Nachbar aus der Musterstraße 12 ist unter privat@example.org erreichbar.",
      directoryEntries: DIRECTORY,
    });

    expect(result.concernKind).toBe("private_case");
    expect(result.safety.sensitiveFindingKinds).toEqual(
      expect.arrayContaining(["street_address", "email"]),
    );
    expect(result.guardrails.noAutoPublish).toBe(true);
    expect(result.guardrails.noTruthDecision).toBe(true);
  });

  it("distinguishes a source without a request and an acute emergency", () => {
    const source = resolveCreateCitizenIntakeContext({
      text: "Quelle: https://example.org/studie.pdf",
      directoryEntries: DIRECTORY,
    });
    const emergency = resolveCreateCitizenIntakeContext({
      text: "Akute Gefahr, es brennt gerade in Wuppertal!",
      directoryEntries: DIRECTORY,
    });

    expect(source.concernKind).toBe("source_without_request");
    expect(source.desiredChange).toBeNull();
    expect(source.clarificationQuestion).toBe(
      "Welche konkrete Veränderung oder Prüffrage verbindest du mit dieser Quelle?",
    );
    expect(emergency.concernKind).toBe("emergency");
    expect(emergency.safety.emergencyNoticeRequired).toBe(true);
  });

  it("keeps all four explicit match decisions draft-only and requires confirmation", () => {
    const result = resolveCreateCitizenIntakeContext({
      text: "In Wuppertal sollte Tempo 30 gelten.",
      directoryEntries: DIRECTORY,
    });

    expect(result.matching).toEqual({
      requiresConfirmation: true,
      allowedDecisions: [
        "count_my_position",
        "count_as_opposition",
        "add_as_nuance",
        "keep_separate",
      ],
      noSilentMerge: true,
    });
  });

  it("requires an exact candidate confirmation and never silently chooses another authority", () => {
    const result = resolveCreateCitizenIntakeContext({
      text: "In Wuppertal sollte vor der Grundschule Tempo 30 gelten.",
      directoryEntries: DIRECTORY,
    });
    const candidate = result.jurisdictionCandidates[0]!;

    expect(result.jurisdictionConfirmation).toEqual({
      status: "unconfirmed",
      candidateKey: null,
    });
    expect(
      applyCreateJurisdictionConfirmation(result, "municipality:fremde-behörde")
        .jurisdictionConfirmation,
    ).toEqual({ status: "unconfirmed", candidateKey: null });
    expect(
      applyCreateJurisdictionConfirmation(
        result,
        buildCreateJurisdictionCandidateKey(candidate),
      ).jurisdictionConfirmation,
    ).toEqual({
      status: "confirmed",
      candidateKey: buildCreateJurisdictionCandidateKey(candidate),
    });
  });

  it("keeps federal and EU jurisdiction suggestions explicit and unconfirmed", () => {
    for (const text of [
      "Bundesweit sollte das Wahlalter bei 16 Jahren liegen.",
      "Auf EU-Ebene sollte die Kennzeichnungspflicht vereinheitlicht werden.",
    ]) {
      const result = resolveCreateCitizenIntakeContext({ text, directoryEntries: DIRECTORY });
      expect(result.jurisdictionCandidates).toHaveLength(1);
      expect(result.jurisdictionConfirmation).toEqual({
        status: "unconfirmed",
        candidateKey: null,
      });
    }
  });
});
