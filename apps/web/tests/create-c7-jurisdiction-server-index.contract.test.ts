import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  buildOfficialRegionsFromDirectory: vi.fn(),
}));

vi.mock("@features/region", () => ({
  buildOfficialRegionsFromDirectory: (...args: unknown[]) =>
    mocks.buildOfficialRegionsFromDirectory(...args),
}));

describe("C7 server-authoritative jurisdiction index", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.buildOfficialRegionsFromDirectory.mockReset();
    mocks.buildOfficialRegionsFromDirectory.mockReturnValue([
      {
        id: "region-official-05124000",
        name: "Wuppertal",
        federalState: "Nordrhein-Westfalen",
        country: "DE",
        administrativeUnitType: "kreisfreie_stadt",
        officialBody: { label: "Stadt Wuppertal" },
        officialDirectoryEntry: {
          municipalityName: "Wuppertal, Stadt",
          ags: "05124000",
          ars: "05124000",
          administrativeUnitType: "kreisfreie_stadt",
          rawAdministrativeUnitLabel: "Kreisfreie Stadt",
          administrativeSeat: "Wuppertal",
        },
      },
      {
        id: "region-official-01051",
        name: "Dithmarschen",
        federalState: "Schleswig-Holstein",
        country: "DE",
        administrativeUnitType: "kreis",
        officialBody: { label: "Heide" },
        officialDirectoryEntry: {
          municipalityName: "Dithmarschen",
          ags: null,
          ars: "01051",
          administrativeUnitType: "kreis",
          rawAdministrativeUnitLabel: "Kreis",
          administrativeSeat: "Heide",
        },
      },
    ]);
  });

  it("builds the official source once and reuses the cached index across requests", async () => {
    const {
      resolveCreateCitizenIntakeContextFromOfficialDirectory,
    } = await import(
      "@/features/create/createCitizenIntakeContextServer"
    );

    const wuppertal =
      resolveCreateCitizenIntakeContextFromOfficialDirectory({
        text: "In Wuppertal sollte der Schulweg sicherer werden.",
      });
    const dithmarschen =
      resolveCreateCitizenIntakeContextFromOfficialDirectory({
        text: "In Dithmarschen muss der Busverkehr besser werden.",
      });

    expect(mocks.buildOfficialRegionsFromDirectory).toHaveBeenCalledTimes(1);
    expect(wuppertal.jurisdictionCandidates[0]).toMatchObject({
      level: "municipality",
      administrativeUnitType: "kreisfreie_stadt",
      authorityName: "Stadt Wuppertal",
    });
    expect(dithmarschen.jurisdictionCandidates[0]).toMatchObject({
      level: "district",
      administrativeUnitType: "kreis",
      authorityName: "Heide",
    });
  });

  it("keeps a manipulated level/key fail-closed against the same cached source", async () => {
    const {
      resolveCreateCitizenIntakeContextFromOfficialDirectory,
      validateCreateJurisdictionConfirmation,
    } = await import(
      "@/features/create/createCitizenIntakeContextServer"
    );
    const {
      buildCreateJurisdictionCandidateKey,
    } = await import("@/features/create/createCitizenIntakeContext");

    const sourceText =
      "In Dithmarschen muss der Busverkehr besser werden.";
    const context =
      resolveCreateCitizenIntakeContextFromOfficialDirectory({
        text: sourceText,
      });
    const validKey = buildCreateJurisdictionCandidateKey(
      context.jurisdictionCandidates[0]!,
    );

    expect(
      validateCreateJurisdictionConfirmation({
        sourceText,
        candidateKey: validKey,
      })?.jurisdictionConfirmation.status,
    ).toBe("confirmed");
    expect(
      validateCreateJurisdictionConfirmation({
        sourceText,
        candidateKey: validKey.replace(/^district:/, "municipality:"),
      }),
    ).toBeNull();
    expect(mocks.buildOfficialRegionsFromDirectory).toHaveBeenCalledTimes(1);
  });
});
