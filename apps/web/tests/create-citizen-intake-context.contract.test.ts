import { describe, expect, it } from "vitest";

import {
  applyCreateJurisdictionConfirmation,
  applyCreateRegionPriority,
  buildCreateJurisdictionCandidateKey,
  resolveCreateCitizenIntakeContext,
  type CreateRegionDirectoryEntry,
} from "@/features/create/createCitizenIntakeContext";
import {
  resolveCreateCitizenIntakeContextFromOfficialDirectory,
  validateCreateJurisdictionConfirmation,
} from "@/features/create/createCitizenIntakeContextServer";

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
    administrativeUnitType: "kreisfreie_stadt",
    rawAdministrativeUnitLabel: "Kreisfreie Stadt",
    administrativeSeat: "Wuppertal",
    authorityName: "Stadt Wuppertal",
  },
  {
    id: "de-sh-dithmarschen",
    municipalityName: "Dithmarschen",
    state: "Schleswig-Holstein",
    country: "DE",
    registryId: "01051",
    administrativeUnitType: "kreis",
    rawAdministrativeUnitLabel: "Kreis",
    administrativeSeat: "Heide",
    authorityName: "Heide",
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

describe("C5 citizen-first Create intake context", () => {
  it("uses an explicit Wuppertal contribution before a Berlin profile suggestion", () => {
    const result = resolveCreateCitizenIntakeContext({
      text: "In Wuppertal sollte vor der Grundschule Tempo 30 gelten.",
      directoryEntries: DIRECTORY,
      profileRegion: "Berlin",
    });

    expect(result.regionStatus).toBe("resolved");
    expect(result.regionSource).toBe("contribution_text");
    expect(result.selectedRegionLabel).toBe("Wuppertal");
    expect(result.regionHierarchy).toEqual(["Wuppertal", "Nordrhein-Westfalen", "DE"]);
    expect(result.guardrails.noProfileRegionAsFact).toBe(true);
    expect(result.jurisdictionCandidates[0]).toMatchObject({
      level: "municipality",
      administrativeUnitType: "kreisfreie_stadt",
    });
  });

  it("keeps Dithmarschen as the explicit place instead of a profile fallback", () => {
    const result = resolveCreateCitizenIntakeContext({
      text: "In Dithmarschen sollte der Nahverkehr häufiger fahren.",
      directoryEntries: DIRECTORY,
      profileRegion: "Berlin",
    });

    expect(result.regionSource).toBe("contribution_text");
    expect(result.selectedRegionLabel).toBe("Dithmarschen");
    expect(result.regionHierarchy).toEqual(["Dithmarschen", "Schleswig-Holstein", "DE"]);
    expect(result.jurisdictionCandidates[0]).toMatchObject({
      level: "district",
      authorityName: "Heide",
      administrativeUnitType: "kreis",
    });
  });

  it("confirms only an exact server-offered candidate key", () => {
    const context = resolveCreateCitizenIntakeContext({
      text: "In Wuppertal sollte der Schulweg sicherer werden.",
      directoryEntries: DIRECTORY,
    });
    const candidate = context.jurisdictionCandidates[0]!;
    const candidateKey = buildCreateJurisdictionCandidateKey(candidate);

    expect(
      applyCreateJurisdictionConfirmation(context, candidateKey)
        .jurisdictionConfirmation,
    ).toEqual({ status: "confirmed", candidateKey });
    expect(
      applyCreateJurisdictionConfirmation(
        context,
        "municipality:frei erfundene behörde",
      ).jurisdictionConfirmation,
    ).toEqual({ status: "unconfirmed", candidateKey: null });
  });

  it("preserves official Wuppertal and Dithmarschen administrative levels in server validation", () => {
    for (const [sourceText, expectedLevel] of [
      ["In Wuppertal sollte der Schulweg sicherer werden.", "municipality"],
      ["In Dithmarschen muss der Busverkehr besser werden.", "district"],
    ] as const) {
      const context =
        resolveCreateCitizenIntakeContextFromOfficialDirectory({
          text: sourceText,
        });
      const candidate = context.jurisdictionCandidates[0]!;
      const candidateKey = buildCreateJurisdictionCandidateKey(candidate);
      const validated = validateCreateJurisdictionConfirmation({
        sourceText,
        candidateKey,
      });

      expect(candidate.level).toBe(expectedLevel);
      expect(validated?.jurisdictionConfirmation).toEqual({
        status: "confirmed",
        candidateKey,
      });
      expect(validated?.jurisdictionCandidates[0]?.level).toBe(expectedLevel);
      expect(
        validateCreateJurisdictionConfirmation({
          sourceText,
          candidateKey: candidateKey.replace(
            /^[^:]+:/,
            expectedLevel === "district" ? "municipality:" : "district:",
          ),
        }),
      ).toBeNull();
    }
  });

  it("does not force a profile region onto federal or EU concerns", () => {
    const federal = resolveCreateCitizenIntakeContext({
      text: "Bundesweit sollte das Wahlalter bei 16 Jahren liegen.",
      directoryEntries: DIRECTORY,
      profileRegion: "Berlin",
    });
    const eu = resolveCreateCitizenIntakeContext({
      text: "Auf EU-Ebene sollte die Kennzeichnungspflicht vereinheitlicht werden.",
      directoryEntries: DIRECTORY,
      profileRegion: "Berlin",
    });

    expect(federal.regionStatus).toBe("not_location_bound");
    expect(federal.selectedRegionLabel).toBeNull();
    expect(federal.jurisdictionCandidates[0]?.level).toBe("federal");
    expect(eu.regionStatus).toBe("not_location_bound");
    expect(eu.selectedRegionLabel).toBeNull();
    expect(eu.jurisdictionCandidates[0]?.level).toBe("eu");
  });

  it("keeps ambiguous same-name places in clarification", () => {
    const result = resolveCreateCitizenIntakeContext({
      text: "In Neustadt sollte der Bahnhof barrierefrei werden.",
      directoryEntries: DIRECTORY,
    });

    expect(result.regionStatus).toBe("needs_clarification");
    expect(result.selectedRegionLabel).toBeNull();
    expect(result.placeResolution.candidates).toHaveLength(2);
    expect(result.clarificationQuestion).toContain("Welchen Ort");
  });

  it("keeps multiple places in clarification instead of selecting the first", () => {
    const result = resolveCreateCitizenIntakeContext({
      text: "Berlin und Wuppertal sollten beim Nahverkehr verglichen werden.",
      directoryEntries: DIRECTORY,
    });

    expect(result.regionStatus).toBe("needs_clarification");
    expect(result.detectedRegionLabels).toEqual(["Berlin", "Wuppertal"]);
    expect(result.selectedRegionLabel).toBeNull();
    expect(result.placeResolution.warnings).toContain(
      "Mehrere Orte erkannt; keine stille Reduktion auf einen Ort.",
    );
  });

  it("treats a profile location only as a suggestion when no explicit place exists", () => {
    const base = resolveCreateCitizenIntakeContext({
      text: "Der Schulweg sollte sicherer werden.",
      directoryEntries: DIRECTORY,
    });
    const result = applyCreateRegionPriority(base, { profileRegion: "Berlin" });

    expect(result.regionSource).toBe("profile_suggestion");
    expect(result.regionStatus).toBe("suggested");
    expect(result.regionChipLabel).toBe("Berlin · aus Profil vorgeschlagen");
    expect(result.placeResolution.needsUserConfirmation).toBe(true);
  });

  it("does not treat ordinary nouns that share municipality names as places", () => {
    for (const text of [
      "Das Essen in der Schule muss besser werden.",
      "Wir brauchen mehr Wissen über Pflege.",
      "Fisch und Fleisch sollen bessere Standards erfüllen.",
      "Schutz von Kindern muss Vorrang haben.",
    ]) {
      const result = resolveCreateCitizenIntakeContextFromOfficialDirectory({ text });
      expect(result.regionSource).toBe("none");
      expect(result.selectedRegionLabel).toBeNull();
      expect(result.detectedRegionLabels).toEqual([]);
    }
  });

  it("accepts a lexically ambiguous municipality with explicit place syntax", () => {
    const result = resolveCreateCitizenIntakeContextFromOfficialDirectory({
      text: "In Essen muss das Schulessen besser werden.",
    });

    expect(result.regionSource).toBe("contribution_text");
    expect(result.selectedRegionLabel).toBe("Essen");
  });

  it("detects German and English emergency wording", () => {
    for (const text of [
      "Feuer in der Schule, bitte 112 wählen.",
      "Brand im Wohnhaus.",
      "Rauch aus dem Keller, bitte sofort 112 anrufen.",
    ]) {
      const result = resolveCreateCitizenIntakeContext({
        text,
        locale: "de",
        directoryEntries: DIRECTORY,
      });
      expect(result.concernKind).toBe("emergency");
      expect(result.safety.emergencyNoticeRequired).toBe(true);
    }

    const english = resolveCreateCitizenIntakeContext({
      text: "There is a fire right now, call 112 immediately.",
      locale: "en",
      directoryEntries: DIRECTORY,
    });
    expect(english.concernKind).toBe("emergency");
    expect(english.safety.emergencyNoticeRequired).toBe(true);
  });

  it("retains existing safety findings without auto-publish or truth decisions", () => {
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
});
