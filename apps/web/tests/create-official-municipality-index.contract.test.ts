import { describe, expect, it } from "vitest";

import {
  buildOfficialRegionsFromDirectory,
  OFFICIAL_DIRECTORY_SOURCE_AS_OF,
  OFFICIAL_DIRECTORY_SOURCE_FILE,
} from "@features/region/directory";
import officialMunicipalityIndex from "@/features/create/generatedOfficialMunicipalityIndex.json";
import officialAdministrativeUnitIndex from "@/features/create/generatedOfficialAdministrativeUnitIndex.json";

describe("create official municipality index", () => {
  it("stays synchronized with the canonical official directory source", () => {
    const regions = buildOfficialRegionsFromDirectory();
    const expectedEntries = regions
      .filter((region) => Boolean(region.officialDirectoryEntry))
      .map((region) => ({
        id: region.id,
        municipalityName: region.name,
        state: region.federalState,
        country: region.country,
        registryId:
          region.officialDirectoryEntry?.ags ??
          region.officialDirectoryEntry?.ars ??
          null,
        authorityName: region.officialBody?.label ?? null,
      }));

    expect(officialMunicipalityIndex.sourceFile).toBe(
      OFFICIAL_DIRECTORY_SOURCE_FILE,
    );
    expect(officialMunicipalityIndex.sourceAsOf).toBe(
      OFFICIAL_DIRECTORY_SOURCE_AS_OF,
    );
    expect(officialMunicipalityIndex.entries).toEqual(expectedEntries);
    expect(officialAdministrativeUnitIndex.sourceFile).toBe(
      OFFICIAL_DIRECTORY_SOURCE_FILE,
    );
    expect(officialAdministrativeUnitIndex.sourceAsOf).toBe(
      OFFICIAL_DIRECTORY_SOURCE_AS_OF,
    );
    expect(officialAdministrativeUnitIndex.administrativeUnitById).toEqual(
      Object.fromEntries(
        regions
          .filter(
            (region) =>
              Boolean(region.officialDirectoryEntry) &&
              ![
                "kreisfreie_stadt",
                "stadtkreis",
                "stadtstaat",
                "kreisangehoerige_gemeinde",
                "stadt",
                "markt",
                "grosse_kreisstadt",
                "grosse_kreisangehoerige_stadt",
                "gemeindefreies_gebiet_bewohnt",
                "gemeindefreies_gebiet_unbewohnt",
              ].includes(
                region.officialDirectoryEntry?.administrativeUnitType ?? "",
              ),
          )
          .map((region) => [
            region.id,
            {
              administrativeUnitType:
                region.officialDirectoryEntry?.administrativeUnitType ?? null,
              rawAdministrativeUnitLabel:
                region.officialDirectoryEntry?.rawAdministrativeUnitLabel ?? null,
              administrativeSeat:
                region.officialDirectoryEntry?.administrativeSeat ?? null,
            },
          ]),
      ),
    );
  });
});
