import { describe, expect, it } from "vitest";

import {
  buildCreateJurisdictionCandidateKey,
  buildCreateMunicipalJurisdictionCandidate,
} from "@/features/create/createCitizenIntakeContext";
import { validateCreateJurisdictionConfirmation } from "@/features/create/createCitizenIntakeContextServer";

describe("create jurisdiction confirmation performance", () => {
  it("validates an official candidate without a directory-wide regex rescan", () => {
    const sourceText =
      "In Wuppertal sollte vor der Grundschule Tempo 30 gelten.";
    const candidateKey = buildCreateJurisdictionCandidateKey(
      buildCreateMunicipalJurisdictionCandidate({
        selectedRegion: {
          id: "client-candidate",
          city: "Wuppertal",
          municipality: "Wuppertal",
          state: null,
          country: "DE",
          registryId: null,
          matchType: "exact",
          confidence: 0.96,
          reason: "Testkandidat",
        },
        traffic: true,
      }),
    );

    const coldStartedAt = performance.now();
    const cold = validateCreateJurisdictionConfirmation({
      sourceText,
      candidateKey,
    });
    const coldMs = performance.now() - coldStartedAt;

    const warmStartedAt = performance.now();
    const warm = validateCreateJurisdictionConfirmation({
      sourceText,
      candidateKey,
    });
    const warmMs = performance.now() - warmStartedAt;

    expect(cold).toMatchObject({
      selectedRegionLabel: "Wuppertal",
      placeResolution: {
        selectedCandidate: { id: "region-official-05124000" },
      },
      jurisdictionConfirmation: { status: "confirmed", candidateKey },
    });
    expect(warm).toEqual(cold);
    expect(coldMs).toBeLessThan(5_000);
    expect(warmMs).toBeLessThan(750);
  });
});
